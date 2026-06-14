import { PrismaClient } from '@prisma/client';
import { SharedPlayer, SharedCell, SOCKET_EVENTS } from 'shared';

const prisma = new PrismaClient();

export interface GamePlayer {
  id: string;
  socketId: string;
  username: string;
  color: string;
  isReady: boolean;
}

export interface InMemoryLobby {
  id: string;
  code: string;
  status: 'LOBBY' | 'ACTIVE' | 'GAMEOVER';
  gameId: string | null;
  players: Map<string, GamePlayer>; // username -> GamePlayer
  cells: Map<number, string>; // cellIndex (0..899) -> ownerUsername
  startTime: number | null;
  endTime: number | null;
  winnerUsername: string | null;
}

export class GameManager {
  private lobbies: Map<string, InMemoryLobby> = new Map();
  // Maps socketId -> { lobbyCode, username }
  private socketToPlayer: Map<string, { lobbyCode: string; username: string }> = new Map();

  // Generate 5-character uppercase invite code
  private generateLobbyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.lobbies.has(code));
    return code;
  }

  // Create new lobby and database record
  public async createLobby(): Promise<InMemoryLobby> {
    const code = this.generateLobbyCode();
    
    // Create in Prisma
    const dbLobby = await prisma.lobby.create({
      data: {
        code,
        status: 'LOBBY'
      }
    });

    const lobby: InMemoryLobby = {
      id: dbLobby.id,
      code,
      status: 'LOBBY',
      gameId: null,
      players: new Map(),
      cells: new Map(),
      startTime: null,
      endTime: null,
      winnerUsername: null
    };

    this.lobbies.set(code, lobby);
    return lobby;
  }

  // Get lobby state by code
  public getLobby(code: string): InMemoryLobby | undefined {
    return this.lobbies.get(code.toUpperCase());
  }

  // Check if player is registered in database, if not create them
  public async getOrCreatePlayer(username: string, color: string) {
    let player = await prisma.player.findUnique({
      where: { username }
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          username,
          color
        }
      });
    } else {
      // Keep color updated or use existing
      player = await prisma.player.update({
        where: { username },
        data: { color }
      });
    }
    return player;
  }

  // Join player to a lobby
  public async joinLobby(
    code: string,
    username: string,
    color: string,
    socketId: string
  ): Promise<InMemoryLobby | null> {
    const lobby = this.getLobby(code);
    if (!lobby) return null;

    // Check if player is already in this lobby (reconnect handling)
    let player = lobby.players.get(username);
    if (player) {
      // Update socket ID
      this.socketToPlayer.delete(player.socketId);
      player.socketId = socketId;
      player.color = color; // sync color
    } else {
      // Ensure player exists in DB
      await this.getOrCreatePlayer(username, color);

      player = {
        id: username, // using username as unique identifier
        socketId,
        username,
        color,
        isReady: false
      };
      lobby.players.set(username, player);
    }

    this.socketToPlayer.set(socketId, { lobbyCode: lobby.code, username });
    return lobby;
  }

  // Remove player by socket ID
  public handleDisconnect(socketId: string): { lobbyCode: string; username: string; lobby: InMemoryLobby } | null {
    const session = this.socketToPlayer.get(socketId);
    if (!session) return null;

    const { lobbyCode, username } = session;
    this.socketToPlayer.delete(socketId);

    const lobby = this.getLobby(lobbyCode);
    if (lobby) {
      // In a production server, we might wait 10 seconds to allow reconnection.
      // For this implementation, we keep them in lobby so they can rejoin/reconnect.
      // We only update status if needed.
      const p = lobby.players.get(username);
      if (p && p.socketId === socketId) {
        // Mark as disconnected or similar if needed. For now, we just keep their presence.
      }
      return { lobbyCode, username, lobby };
    }

    return null;
  }

  // Start game in lobby
  public async startGame(code: string): Promise<InMemoryLobby | null> {
    const lobby = this.getLobby(code);
    if (!lobby || lobby.status !== 'LOBBY' || lobby.players.size === 0) return null;

    // Create Game in DB
    const game = await prisma.game.create({
      data: {
        totalPlayers: lobby.players.size,
        duration: 0
      }
    });

    // Update Lobby in DB
    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: 'ACTIVE',
        gameId: game.id
      }
    });

    // Prepare 900 cells in DB using createMany for extreme speed
    const cellsData = [];
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) {
        cellsData.push({
          gameId: game.id,
          x,
          y,
          ownerId: null
        });
      }
    }

    await prisma.cell.createMany({
      data: cellsData
    });

    // Reset lobby cells and state
    lobby.cells.clear();
    lobby.status = 'ACTIVE';
    lobby.gameId = game.id;
    lobby.startTime = Date.now();
    lobby.endTime = null;
    lobby.winnerUsername = null;

    // Reset ready states
    for (const player of lobby.players.values()) {
      player.isReady = false;
    }

    return lobby;
  }

  // Claim a cell with Concurrency Conflict Handling using optimistic database checking
  public async claimCell(
    code: string,
    username: string,
    cellIndex: number
  ): Promise<{ success: boolean; x: number; y: number; color: string; lobby: InMemoryLobby } | null> {
    const lobby = this.getLobby(code);
    if (!lobby || lobby.status !== 'ACTIVE' || !lobby.gameId) return null;

    const player = lobby.players.get(username);
    if (!player) return null;

    const x = Math.floor(cellIndex / 30);
    const y = cellIndex % 30;

    if (x < 0 || x >= 30 || y < 0 || y >= 30) return null;

    // Concurrency Lock: Query DB to check if ownerId is currently null, and update if it is.
    // This is executed as a single atomic operation in Postgres.
    try {
      const dbPlayer = await prisma.player.findUnique({
        where: { username }
      });
      if (!dbPlayer) return null;

      // Optimistic update: search for the cell belonging to this game, at x/y, where ownerId is null
      const updatedCells = await prisma.$executeRaw`
        UPDATE "Cell"
        SET "ownerId" = ${dbPlayer.id}
        WHERE "gameId" = ${lobby.gameId}
          AND "x" = ${x}
          AND "y" = ${y}
          AND "ownerId" IS NULL
      `;

      // If updatedCells === 0, it means someone else already claimed it! The query updated 0 rows.
      if (updatedCells === 0) {
        return { success: false, x, y, color: '', lobby };
      }

      // Claim succeeded!
      lobby.cells.set(cellIndex, username);

      // Record move in DB asynchronously (for replay logs)
      prisma.move.create({
        data: {
          gameId: lobby.gameId,
          playerId: dbPlayer.id,
          cellIndex
        }
      }).catch(err => console.error('Error saving move:', err));

      // Check if board is full (900 cells claimed)
      if (lobby.cells.size === 900) {
        await this.endGame(lobby);
      }

      return { success: true, x, y, color: player.color, lobby };
    } catch (error) {
      console.error('Database claim error:', error);
      return null;
    }
  }

  // End the game
  private async endGame(lobby: InMemoryLobby) {
    if (!lobby.gameId) return;

    lobby.status = 'GAMEOVER';
    lobby.endTime = Date.now();
    const duration = Math.floor((lobby.endTime - (lobby.startTime || Date.now())) / 1000);

    // Calculate score counts
    const scores: { [username: string]: number } = {};
    for (const player of lobby.players.keys()) {
      scores[player] = 0;
    }
    for (const owner of lobby.cells.values()) {
      if (owner in scores) {
        scores[owner]++;
      } else {
        scores[owner] = 1;
      }
    }

    // Find winner
    let maxCells = -1;
    let winner: string | null = null;
    let isTie = false;

    for (const [user, count] of Object.entries(scores)) {
      if (count > maxCells) {
        maxCells = count;
        winner = user;
        isTie = false;
      } else if (count === maxCells) {
        isTie = true;
      }
    }

    const winnerUser = !isTie ? winner : null;
    lobby.winnerUsername = winnerUser;

    let winnerDbId: string | null = null;
    if (winnerUser) {
      const winnerPlayer = await prisma.player.findUnique({
        where: { username: winnerUser }
      });
      if (winnerPlayer) {
        winnerDbId = winnerPlayer.id;
      }
    }

    // Update DB Game record
    await prisma.game.update({
      where: { id: lobby.gameId },
      data: {
        winnerId: winnerDbId,
        duration
      }
    });

    // Update DB Lobby status
    await prisma.lobby.update({
      where: { id: lobby.id },
      data: { status: 'GAMEOVER' }
    });

    // Update player game/wins stats
    for (const username of lobby.players.keys()) {
      const isPlayerWinner = username === winnerUser;
      await prisma.player.update({
        where: { username },
        data: {
          totalGames: { increment: 1 },
          wins: isPlayerWinner ? { increment: 1 } : undefined
        }
      }).catch(err => console.error(`Failed to update stats for ${username}`, err));
    }
  }

  // Set player ready state for play again
  public async setPlayerReady(code: string, username: string): Promise<InMemoryLobby | null> {
    const lobby = this.getLobby(code);
    if (!lobby || lobby.status !== 'GAMEOVER') return null;

    const player = lobby.players.get(username);
    if (player) {
      player.isReady = true;
    }

    // Check if all players in the lobby are ready
    const allReady = Array.from(lobby.players.values()).every(p => p.isReady);
    if (allReady && lobby.players.size > 0) {
      // Auto-restart game
      await this.startGame(lobby.code);
    }

    return lobby;
  }

  // Get real-time leaderboard statistics
  public getLeaderboard(lobby: InMemoryLobby): SharedPlayerLeaderboard[] {
    const totalCells = 900;
    const scores: { [username: string]: number } = {};
    
    // Initialize scores
    for (const player of lobby.players.values()) {
      scores[player.username] = 0;
    }

    // Accumulate
    for (const owner of lobby.cells.values()) {
      if (owner in scores) {
        scores[owner]++;
      }
    }

    return Array.from(lobby.players.values()).map(p => {
      const count = scores[p.username] || 0;
      return {
        username: p.username,
        color: p.color,
        cellsCount: count,
        percentage: Number(((count / totalCells) * 100).toFixed(1))
      };
    }).sort((a, b) => b.cellsCount - a.cellsCount);
  }

  // Build client-safe representation of lobby
  public serializeLobby(lobby: InMemoryLobby) {
    const leaderboard = this.getLeaderboard(lobby);
    const playersArr = Array.from(lobby.players.values()).map(p => ({
      id: p.username,
      username: p.username,
      color: p.color,
      isReady: p.isReady
    }));

    // Convert cells map to list of cell updates or full snapshot
    const cellsSnapshot: { [key: number]: string } = {};
    lobby.cells.forEach((owner, idx) => {
      cellsSnapshot[idx] = owner;
    });

    return {
      id: lobby.id,
      code: lobby.code,
      status: lobby.status,
      gameId: lobby.gameId,
      players: playersArr,
      cells: cellsSnapshot,
      winnerUsername: lobby.winnerUsername,
      leaderboard,
      onlineCount: lobby.players.size
    };
  }

  // Get global top players leaderboard from DB
  public async getGlobalLeaderboard() {
    return prisma.player.findMany({
      orderBy: { wins: 'desc' },
      take: 10,
      select: {
        username: true,
        color: true,
        totalGames: true,
        wins: true
      }
    });
  }
}

export interface SharedPlayerLeaderboard {
  username: string;
  color: string;
  cellsCount: number;
  percentage: number;
}
