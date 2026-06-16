import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { GameManager } from './game';
import { SOCKET_EVENTS } from './shared';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000, // Ping every 10 seconds to keep connection alive on Render/proxies
  pingTimeout: 5000    // Wait 5 seconds for response before declaring disconnect
});

const prisma = new PrismaClient();
const gameManager = new GameManager(prisma);

// Notify players when the server game timer runs out
gameManager.onGameEnded = (lobbyCode) => {
  const lobby = gameManager.getLobby(lobbyCode);
  if (lobby) {
    const roomName = `lobby_${lobby.code}`;
    io.to(roomName).emit(SOCKET_EVENTS.GAME_OVER, {
      winnerUsername: lobby.winnerUsername,
      leaderboard: gameManager.getLeaderboard(lobby)
    });
  }
};

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ── REST API ROUTES ────────────────────────────────────────────────────────

// Create a new lobby
app.post('/api/lobby/create', async (req, res) => {
  try {
    const lobby = await gameManager.createLobby();
    res.status(201).json(gameManager.serializeLobby(lobby));
  } catch (error) {
    console.error('Create lobby error:', error);
    res.status(500).json({ error: 'Failed to create lobby' });
  }
});

// Join a lobby details check
app.post('/api/lobby/join', async (req, res) => {
  const { code, username, color } = req.body;
  if (!code || !username || !color) {
    return res.status(400).json({ error: 'Missing code, username, or color' });
  }

  try {
    const lobby = gameManager.getLobby(code);
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found' });
    }
    res.status(200).json(gameManager.serializeLobby(lobby));
  } catch (error) {
    console.error('Join lobby error:', error);
    res.status(500).json({ error: 'Failed to find lobby' });
  }
});

// Global leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const topPlayers = await gameManager.getGlobalLeaderboard();
    res.status(200).json(topPlayers);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Player profile stats
app.get('/api/profile/:id', async (req, res) => {
  const { id } = req.params; // username or UUID
  try {
    const player = await prisma.player.findFirst({
      where: {
        OR: [
          { id },
          { username: id }
        ]
      },
      include: {
        _count: {
          select: {
            moves: true
          }
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.status(200).json({
      username: player.username,
      color: player.color,
      totalGames: player.totalGames,
      wins: player.wins,
      totalCaptures: player._count.moves,
      createdAt: player.createdAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── WEBSOCKET EVENT ROUTING ──────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // 0. Create Lobby via socket (avoids REST call dependency)
  socket.on(SOCKET_EVENTS.CREATE_LOBBY, async ({ username, color }, callback) => {
    try {
      const lobby = await gameManager.createLobby();
      if (typeof callback === 'function') {
        callback({ code: lobby.code });
      }
    } catch (error) {
      console.error('Socket create_lobby error:', error);
      if (typeof callback === 'function') {
        callback({ error: 'Failed to create lobby' });
      }
    }
  });

  // 1. Join Game / Lobby
  socket.on(SOCKET_EVENTS.JOIN_GAME, async ({ code, username, color }) => {
    if (!code || !username || !color) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid payload' });
      return;
    }

    try {
      const lobby = await gameManager.joinLobby(code, username, color, socket.id);
      if (!lobby) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Lobby not found' });
        return;
      }

      const roomName = `lobby_${lobby.code}`;
      socket.join(roomName);

      // Broadcast full lobby update to everyone in the room (ensures all players' lists and hosts sync immediately)
      io.to(roomName).emit(SOCKET_EVENTS.LOBBY_UPDATED, gameManager.serializeLobby(lobby));

      // If lobby status is LOBBY and we have 1 player, check if we need to auto-start.
      // Wait, let's keep start command manual or triggered when first player says ready or when host clicks start.
      // Let's implement an auto-start if player joins, or if they click "Start Match" button (using player_ready)
      console.log(`[JOIN] ${username} joined lobby ${lobby.code}`);
    } catch (error) {
      console.error('Socket join_game error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Error joining game' });
    }
  });

  // 2. Click / Capture Cell
  socket.on(SOCKET_EVENTS.CAPTURE_CELL, async ({ code, username, cellIndex }) => {
    if (!code || !username || typeof cellIndex !== 'number') {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid claim request' });
      return;
    }

    try {
      const result = await gameManager.claimCell(code, username, cellIndex);
      if (!result) return;

      const roomName = `lobby_${result.lobby.code}`;

      if (result.success) {
        // Broadcast the cell update
        io.to(roomName).emit(SOCKET_EVENTS.CELL_UPDATED, {
          cellIndex,
          x: result.x,
          y: result.y,
          ownerId: username,
          color: result.color
        });

        // Broadcast current live leaderboard
        io.to(roomName).emit(
          SOCKET_EVENTS.LEADERBOARD_UPDATED,
          gameManager.getLeaderboard(result.lobby)
        );

        // Check if game has ended
        if (result.lobby.status === 'GAMEOVER') {
          io.to(roomName).emit(SOCKET_EVENTS.GAME_OVER, {
            winnerUsername: result.lobby.winnerUsername,
            leaderboard: gameManager.getLeaderboard(result.lobby)
          });
        }
      } else {
        // Let the client know the claim was rejected (concurrency conflict loss)
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Cell already claimed by another player.'
        });
      }
    } catch (error) {
      console.error('Socket capture_cell error:', error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to capture cell' });
    }
  });

  // 3. Player Ready (for manual match start from Lobby, or for Play Again vote in GameOver)
  socket.on(SOCKET_EVENTS.PLAYER_READY, async ({ code, username }) => {
    if (!code || !username) return;

    try {
      const lobby = gameManager.getLobby(code);
      if (!lobby) return;

      const roomName = `lobby_${lobby.code}`;

      if (lobby.status === 'LOBBY') {
        // Start game immediately if host/anyone triggers it
        const startedLobby = await gameManager.startGame(code);
        if (startedLobby) {
          io.to(roomName).emit(SOCKET_EVENTS.GAME_RESTART, gameManager.serializeLobby(startedLobby));
        }
      } else if (lobby.status === 'GAMEOVER') {
        const updatedLobby = await gameManager.setPlayerReady(code, username);
        if (updatedLobby) {
          if (updatedLobby.status === 'ACTIVE' || updatedLobby.status === 'LOBBY') {
            // All players are ready — broadcast restart (goes to LOBBY for duration select)
            io.to(roomName).emit(SOCKET_EVENTS.GAME_RESTART, gameManager.serializeLobby(updatedLobby));
          } else {
            // Still waiting for other players — broadcast ready list updates
            io.to(roomName).emit(SOCKET_EVENTS.LOBBY_UPDATED, gameManager.serializeLobby(updatedLobby));
          }
        }
      }
    } catch (error) {
      console.error('Socket player_ready error:', error);
    }
  });

  // Set Duration during LOBBY phase — only the host (winner or first player) can change
  socket.on(SOCKET_EVENTS.SET_DURATION, async ({ code, username, duration }) => {
    console.log(`[SERVER] SET_DURATION received for lobby: ${code}, by: ${username}, duration: ${duration}`);
    if (!code || !username || typeof duration !== 'number') {
      console.warn(`[SERVER] Invalid SET_DURATION payload`);
      return;
    }
    try {
      const updatedLobby = gameManager.setDuration(code, username, duration);
      if (updatedLobby) {
        const roomName = `lobby_${updatedLobby.code}`;
        console.log(`[SERVER] Lobby ${updatedLobby.code} duration updated to ${updatedLobby.gameDuration}s by host ${username}.`);
        io.to(roomName).emit(SOCKET_EVENTS.LOBBY_UPDATED, gameManager.serializeLobby(updatedLobby));
      } else {
        console.warn(`[SERVER] setDuration rejected for lobby ${code} — not host or invalid state.`);
      }
    } catch (error) {
      console.error('Socket set_duration error:', error);
    }
  });

  // 4. Client Disconnect
  socket.on('disconnect', () => {
    try {
      const result = gameManager.handleDisconnect(socket.id);
      if (result) {
        const roomName = `lobby_${result.lobbyCode}`;
        // Broadcast full lobby update to sync players list, online count, and host changes
        io.to(roomName).emit(SOCKET_EVENTS.LOBBY_UPDATED, gameManager.serializeLobby(result.lobby));
        console.log(`[LEAVE] ${result.username} disconnected from lobby ${result.lobbyCode}`);
      }
    } catch (error) {
      console.error('Socket disconnect handler error:', error);
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Run server
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
});
