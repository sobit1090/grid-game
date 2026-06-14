/**
 * Antigravity Grid - Real-Time Multiplayer Territory Game
 * Backend: Node.js + Express + Socket.io
 * In-memory game state, designed for 100+ concurrent players
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const GRID_SIZE = 32; // 32x32 = 1,024 cells
const CELL_COOLDOWN_MS = 300;
const POWERUP_SPAWN_INTERVAL = 15000;
const MAX_ACTIVE_POWERUPS = 5;

// Zone definitions (which cells are "high value")
const ZONES = {
  center: {
    name: 'Center',
    description: 'High-value center zone',
    multiplier: 2,
    color: '#ff6b35',
    cells: getCenterCells(),
  },
  edges: {
    name: 'Edges',
    description: 'Edge zone',
    multiplier: 1.5,
    color: '#7b2fff',
    cells: getEdgeCells(),
  },
  corners: {
    name: 'Corners',
    description: 'Corner zone',
    multiplier: 1.2,
    color: '#00d4ff',
    cells: getCornerCells(),
  },
};

// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_claim', name: 'Pioneer', desc: 'Claim your first block', icon: '🚀', threshold: 1, stat: 'totalClaims' },
  { id: 'ten_blocks', name: 'Settler', desc: 'Own 10 blocks at once', icon: '🏠', threshold: 10, stat: 'blocks' },
  { id: 'fifty_blocks', name: 'Conqueror', desc: 'Own 50 blocks at once', icon: '⚔️', threshold: 50, stat: 'blocks' },
  { id: 'hundred_blocks', name: 'Emperor', desc: 'Own 100 blocks at once', icon: '👑', threshold: 100, stat: 'blocks' },
  { id: 'streak_5', name: 'On Fire', desc: '5-claim streak', icon: '🔥', threshold: 5, stat: 'streak' },
  { id: 'streak_10', name: 'Unstoppable', desc: '10-claim streak', icon: '⚡', threshold: 10, stat: 'streak' },
  { id: 'streak_20', name: 'Legendary', desc: '20-claim streak', icon: '🌟', threshold: 20, stat: 'streak' },
  { id: 'score_100', name: 'Centurion', desc: 'Reach 100 points', icon: '💯', threshold: 100, stat: 'score' },
  { id: 'score_500', name: 'Master', desc: 'Reach 500 points', icon: '🏆', threshold: 500, stat: 'score' },
  { id: 'powerup_used', name: 'Power Player', desc: 'Use a powerup', icon: '⚡', threshold: 1, stat: 'powerupsUsed' },
];

// Powerup types
const POWERUP_TYPES = [
  { id: 'speed_boost', name: 'Speed Boost', icon: '⚡', desc: 'No cooldown for 5s', duration: 5000, color: '#00ff88' },
  { id: 'mega_claim', name: 'Mega Claim', icon: '💥', desc: 'Claim 3x3 area', duration: 0, color: '#ff6b35' },
  { id: 'shield', name: 'Shield', icon: '🛡️', desc: "Blocks can't be stolen for 8s", duration: 8000, color: '#7b2fff' },
  { id: 'vision', name: 'Vision', icon: '👁️', desc: 'See next powerup locations', duration: 10000, color: '#00d4ff' },
];

// Player colors pool
const PLAYER_COLORS = [
  '#00d4ff', '#ff6b35', '#7b2fff', '#00ff88', '#ffcc00',
  '#ff4d6d', '#4dffb8', '#ff8c42', '#c77dff', '#48cae4',
  '#f72585', '#4cc9f0', '#43aa8b', '#f8961e', '#577590',
];

// Team colors
const TEAMS = {
  red: { name: 'Red Team', color: '#ff4d6d', emoji: '🔴' },
  blue: { name: 'Blue Team', color: '#4daaff', emoji: '🔵' },
};

// ─── GAME STATE ──────────────────────────────────────────────────────────────
let gameState = {
  grid: {},           // cellId → { userId, color, name, team, timestamp }
  users: {},          // userId → user object
  claims: {},         // cellId → timestamp (for cooldown)
  activePowerups: [], // powerups on the grid
  gameMode: 'ffa',   // 'ffa' | 'teams' | 'zones'
  startTime: Date.now(),
  // Round system
  phase: 'lobby',    // 'lobby' | 'active' | 'gameover'
  roundDuration: 0,  // seconds chosen at start
  roundEndTime: 0,   // epoch ms when round ends
  roundTimer: null,  // interval reference
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
function getCenterCells() {
  const cells = [];
  for (let r = 12; r < 20; r++) {
    for (let c = 12; c < 20; c++) {
      cells.push(r * GRID_SIZE + c);
    }
  }
  return cells;
}

function getEdgeCells() {
  const cells = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    // Top row
    cells.push(i);
    // Bottom row
    cells.push((GRID_SIZE - 1) * GRID_SIZE + i);
    // Left col (excluding corners already added)
    if (i > 0 && i < GRID_SIZE - 1) cells.push(i * GRID_SIZE);
    // Right col
    if (i > 0 && i < GRID_SIZE - 1) cells.push(i * GRID_SIZE + (GRID_SIZE - 1));
  }
  return cells;
}

function getCornerCells() {
  return [
    0, 3, 6, GRID_SIZE - 7, GRID_SIZE - 4, GRID_SIZE - 1,
    (GRID_SIZE - 1) * GRID_SIZE, (GRID_SIZE - 1) * GRID_SIZE + 3,
    (GRID_SIZE - 1) * GRID_SIZE + GRID_SIZE - 1,
    6 * GRID_SIZE, (GRID_SIZE - 7) * GRID_SIZE,
  ];
}

function getZoneForCell(cellId) {
  for (const [zoneKey, zone] of Object.entries(ZONES)) {
    if (zone.cells.includes(cellId)) return { key: zoneKey, ...zone };
  }
  return null;
}

function getScoreForCell(cellId) {
  const zone = getZoneForCell(cellId);
  return zone ? zone.multiplier : 1;
}

function getUnusedColor(usersObj) {
  const usedColors = Object.values(usersObj).map((u) => u.color);
  for (const color of PLAYER_COLORS) {
    if (!usedColors.includes(color)) return color;
  }
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

function assignTeam(usersObj) {
  const counts = { red: 0, blue: 0 };
  Object.values(usersObj).forEach((u) => {
    if (u.team) counts[u.team]++;
  });
  return counts.red <= counts.blue ? 'red' : 'blue';
}

function buildLeaderboard() {
  return Object.values(gameState.users)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map((u, i) => ({
      rank: i + 1,
      userId: u.userId,
      name: u.name,
      color: u.color,
      score: u.score,
      blocks: u.blocks,
      team: u.team,
      streak: u.streak,
      achievements: u.achievements.length,
    }));
}

function buildTeamStats() {
  const stats = { red: { score: 0, blocks: 0, players: 0 }, blue: { score: 0, blocks: 0, players: 0 } };
  Object.values(gameState.users).forEach((u) => {
    if (u.team && stats[u.team]) {
      stats[u.team].score += u.score;
      stats[u.team].blocks += u.blocks;
      stats[u.team].players++;
    }
  });
  return stats;
}

function checkAchievements(user) {
  const newAchievements = [];
  for (const ach of ACHIEVEMENTS) {
    if (user.achievements.includes(ach.id)) continue;
    let val = 0;
    if (ach.stat === 'totalClaims') val = user.totalClaims;
    else if (ach.stat === 'blocks') val = user.blocks;
    else if (ach.stat === 'streak') val = user.maxStreak;
    else if (ach.stat === 'score') val = user.score;
    else if (ach.stat === 'powerupsUsed') val = user.powerupsUsed;
    if (val >= ach.threshold) {
      user.achievements.push(ach.id);
      newAchievements.push(ach);
    }
  }
  return newAchievements;
}

function spawnPowerup() {
  if (gameState.activePowerups.length >= MAX_ACTIVE_POWERUPS) return null;
  let cellId;
  let attempts = 0;
  do {
    cellId = Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);
    attempts++;
  } while (gameState.grid[cellId] && attempts < 20);

  if (attempts >= 20) return null;

  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  const powerup = { id: `pu_${Date.now()}`, cellId, type, spawnedAt: Date.now() };
  gameState.activePowerups.push(powerup);
  return powerup;
}

function getFullGridState() {
  return {
    grid: gameState.grid,
    activePowerups: gameState.activePowerups,
    zones: Object.fromEntries(
      Object.entries(ZONES).map(([k, v]) => [k, { name: v.name, multiplier: v.multiplier, color: v.color, cells: v.cells }])
    ),
    gameMode: gameState.gameMode,
    playerCount: Object.keys(gameState.users).length,
  };
}

// ─── SOCKET EVENTS ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  let currentUser = null;

  console.log(`[+] Socket connected: ${socket.id}`);

  // ── JOIN ────────────────────────────────────────────────────────────────
  socket.on('join', ({ name }) => {
    const sanitizedName = String(name || 'Anonymous').trim().slice(0, 20) || 'Anonymous';
    const userId = socket.id;
    const color = getUnusedColor(gameState.users);
    const team = assignTeam(gameState.users);

    currentUser = {
      userId,
      socketId: socket.id,
      name: sanitizedName,
      color,
      team: gameState.gameMode === 'teams' ? team : null,
      blocks: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      totalClaims: 0,
      powerupsUsed: 0,
      achievements: [],
      activePowerups: [],
      joinedAt: Date.now(),
    };

    gameState.users[userId] = currentUser;
    socket.join('game');

    // Send initial state to the new player
    const remaining = gameState.phase === 'active'
      ? Math.max(0, Math.ceil((gameState.roundEndTime - Date.now()) / 1000))
      : 0;
    socket.emit('joined', {
      userId,
      user: currentUser,
      gridState: getFullGridState(),
      leaderboard: buildLeaderboard(),
      teamStats: buildTeamStats(),
      playerCount: Object.keys(gameState.users).length,
      phase: gameState.phase,
      roundRemaining: remaining,
      roundEndTime: gameState.roundEndTime,
    });

    // Notify all others
    socket.to('game').emit('player_joined', {
      userId,
      name: sanitizedName,
      color,
      team: currentUser.team,
      playerCount: Object.keys(gameState.users).length,
    });

    console.log(`[JOIN] ${sanitizedName} (${userId}) | ${Object.keys(gameState.users).length} players`);
  });

  // ── CLAIM CELL ──────────────────────────────────────────────────────────
  socket.on('claim_cell', ({ cellId, userId }) => {
    if (!currentUser || currentUser.userId !== userId) return;
    if (gameState.phase !== 'active') return; // only allow during active round

    // Validate cellId
    const cid = parseInt(cellId);
    if (isNaN(cid) || cid < 0 || cid >= GRID_SIZE * GRID_SIZE) return;

    // Cooldown check (unless speed boost active)
    const hasSpeedBoost = currentUser.activePowerups.some(
      (p) => p.type.id === 'speed_boost' && Date.now() - p.activatedAt < p.type.duration
    );
    if (!hasSpeedBoost) {
      const lastClaim = gameState.claims[cid] || 0;
      if (Date.now() - lastClaim < CELL_COOLDOWN_MS) return;
    }

    const prevOwner = gameState.grid[cid];
    const isMegaClaim = currentUser.activePowerups.some(
      (p) => p.type.id === 'mega_claim' && !p.used
    );

    // Shield check: if prev owner has shield, can't steal
    if (prevOwner && prevOwner.userId !== userId) {
      const prevUser = gameState.users[prevOwner.userId];
      if (prevUser) {
        const hasShield = prevUser.activePowerups.some(
          (p) => p.type.id === 'shield' && Date.now() - p.activatedAt < p.type.duration
        );
        if (hasShield) {
          socket.emit('claim_blocked', { cellId: cid, reason: 'shield' });
          return;
        }
        // Decrease previous owner's score/blocks
        prevUser.blocks = Math.max(0, prevUser.blocks - 1);
        const lostPoints = getScoreForCell(cid);
        prevUser.score = Math.max(0, prevUser.score - lostPoints);
        prevUser.streak = 0;
      }
    }

    // Update grid
    const points = getScoreForCell(cid);
    gameState.grid[cid] = {
      userId,
      color: currentUser.color,
      name: currentUser.name,
      team: currentUser.team,
      timestamp: Date.now(),
    };
    gameState.claims[cid] = Date.now();

    // Update user stats
    if (!prevOwner || prevOwner.userId !== userId) {
      currentUser.blocks++;
      currentUser.score += points;
      currentUser.streak++;
      currentUser.totalClaims++;
      if (currentUser.streak > currentUser.maxStreak) currentUser.maxStreak = currentUser.streak;
    }

    // Check powerup on that cell
    const pwIdx = gameState.activePowerups.findIndex((p) => p.cellId === cid);
    let collectedPowerup = null;
    if (pwIdx !== -1) {
      collectedPowerup = gameState.activePowerups.splice(pwIdx, 1)[0];
      currentUser.activePowerups.push({ ...collectedPowerup, activatedAt: Date.now(), used: false });
      socket.emit('powerup_collected', { powerup: collectedPowerup });
    }

    // Mega claim: claim 3x3 area
    const claimedCells = [{ cellId: cid, points }];
    if (isMegaClaim) {
      const megaPu = currentUser.activePowerups.find((p) => p.type.id === 'mega_claim' && !p.used);
      if (megaPu) megaPu.used = true;
      const row = Math.floor(cid / GRID_SIZE);
      const col = cid % GRID_SIZE;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr, nc = col + dc;
          if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
          const nid = nr * GRID_SIZE + nc;
          const nPrev = gameState.grid[nid];
          if (nPrev && nPrev.userId !== userId) {
            const nPrevUser = gameState.users[nPrev.userId];
            if (nPrevUser) {
              nPrevUser.blocks = Math.max(0, nPrevUser.blocks - 1);
              nPrevUser.score = Math.max(0, nPrevUser.score - getScoreForCell(nid));
            }
          }
          gameState.grid[nid] = { userId, color: currentUser.color, name: currentUser.name, team: currentUser.team, timestamp: Date.now() };
          gameState.claims[nid] = Date.now();
          if (!nPrev || nPrev.userId !== userId) currentUser.blocks++;
          currentUser.score += getScoreForCell(nid);
          claimedCells.push({ cellId: nid, points: getScoreForCell(nid) });
        }
      }
    }

    // Check achievements
    const newAchievements = checkAchievements(currentUser);
    if (newAchievements.length > 0) {
      socket.emit('achievements_unlocked', { achievements: newAchievements });
    }

    // Broadcast to all
    io.to('game').emit('cells_claimed', {
      cells: claimedCells.map((c) => ({
        cellId: c.cellId,
        userId,
        color: currentUser.color,
        name: currentUser.name,
        team: currentUser.team,
        points: c.points,
      })),
    });

    io.to('game').emit('stats_update', {
      leaderboard: buildLeaderboard(),
      teamStats: buildTeamStats(),
      playerCount: Object.keys(gameState.users).length,
    });

    // Send personal stat update
    socket.emit('my_stats', {
      blocks: currentUser.blocks,
      score: currentUser.score,
      streak: currentUser.streak,
      activePowerups: currentUser.activePowerups,
    });
  });

  // ── ACTIVATE POWERUP ────────────────────────────────────────────────────
  socket.on('activate_powerup', ({ powerupId }) => {
    if (!currentUser) return;
    const puIdx = currentUser.activePowerups.findIndex((p) => p.id === powerupId);
    if (puIdx === -1) return;
    const pu = currentUser.activePowerups[puIdx];
    if (pu.type.duration === 0) return; // Instant types (mega_claim) activate on claim
    pu.activatedAt = Date.now();
    currentUser.powerupsUsed++;
    const newAchievements = checkAchievements(currentUser);
    if (newAchievements.length > 0) {
      socket.emit('achievements_unlocked', { achievements: newAchievements });
    }
    socket.emit('powerup_activated', { powerup: pu });
  });

  // ── CHANGE GAME MODE ────────────────────────────────────────────────────
  socket.on('set_game_mode', ({ mode }) => {
    if (!['ffa', 'teams', 'zones'].includes(mode)) return;
    gameState.gameMode = mode;
    if (mode === 'teams') {
      // Assign teams to all users
      let r = 0, b = 0;
      Object.values(gameState.users).forEach((u) => {
        u.team = r <= b ? 'red' : 'blue';
        r = r + (u.team === 'red' ? 1 : 0);
        b = b + (u.team === 'blue' ? 1 : 0);
      });
    }
    io.to('game').emit('game_mode_changed', {
      mode,
      users: Object.fromEntries(Object.entries(gameState.users).map(([k, v]) => [k, { team: v.team, color: v.color }])),
    });
  });

  // ── START ROUND ──────────────────────────────────────────────────────────
  socket.on('start_round', ({ duration }) => {
    // duration in seconds: 120, 300, 600
    const secs = [120, 300, 600].includes(duration) ? duration : 300;
    if (gameState.roundTimer) clearInterval(gameState.roundTimer);

    // Reset all state
    gameState.grid = {};
    gameState.claims = {};
    gameState.activePowerups = [];
    Object.values(gameState.users).forEach((u) => {
      u.blocks = 0; u.score = 0; u.streak = 0; u.maxStreak = 0;
      u.totalClaims = 0; u.powerupsUsed = 0; u.achievements = []; u.activePowerups = [];
    });

    gameState.phase = 'active';
    gameState.roundDuration = secs;
    gameState.roundEndTime = Date.now() + secs * 1000;

    io.to('game').emit('round_started', {
      duration: secs,
      endTime: gameState.roundEndTime,
      gridState: getFullGridState(),
      leaderboard: buildLeaderboard(),
    });

    // Tick every second
    gameState.roundTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameState.roundEndTime - Date.now()) / 1000));
      io.to('game').emit('round_tick', { remaining });

      if (remaining <= 0) {
        clearInterval(gameState.roundTimer);
        gameState.roundTimer = null;
        gameState.phase = 'gameover';
        const finalLeaderboard = buildLeaderboard();
        const winner = finalLeaderboard[0] || null;
        io.to('game').emit('round_over', {
          leaderboard: finalLeaderboard,
          teamStats: buildTeamStats(),
          winner,
        });
      }
    }, 1000);
  });

  // ── CHAT ─────────────────────────────────────────────────────────────────
  socket.on('chat_message', ({ message }) => {
    if (!currentUser) return;
    const text = String(message || '').trim().slice(0, 120);
    if (!text) return;
    io.to('game').emit('chat_message', {
      userId: currentUser.userId,
      name: currentUser.name,
      color: currentUser.color,
      message: text,
      timestamp: Date.now(),
    });
  });

  // ── DISCONNECT ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (!currentUser) return;
    const userId = currentUser.userId;
    console.log(`[-] ${currentUser.name} disconnected | ${Object.keys(gameState.users).length - 1} players left`);
    delete gameState.users[userId];
    io.to('game').emit('player_left', {
      userId,
      playerCount: Object.keys(gameState.users).length,
      leaderboard: buildLeaderboard(),
    });
  });
});

// ─── POWERUP SPAWNER ────────────────────────────────────────────────────────
setInterval(() => {
  const pu = spawnPowerup();
  if (pu) {
    io.to('game').emit('powerup_spawned', { powerup: pu });
  }
}, POWERUP_SPAWN_INTERVAL);

// ─── HTTP ROUTES ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    players: Object.keys(gameState.users).length,
    claimedCells: Object.keys(gameState.grid).length,
    totalCells: GRID_SIZE * GRID_SIZE,
    uptime: Math.floor((Date.now() - gameState.startTime) / 1000),
    gameMode: gameState.gameMode,
    activePowerups: gameState.activePowerups.length,
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ leaderboard: buildLeaderboard(), teamStats: buildTeamStats() });
});

// SPA Fallback for React Router (if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// ─── START ───────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Antigravity Grid Server running on http://localhost:${PORT}`);
  console.log(`   Grid: ${GRID_SIZE}×${GRID_SIZE} = ${GRID_SIZE * GRID_SIZE} cells`);
  console.log(`   Real-time: Socket.io WebSocket`);
  console.log(`   Open index.html in your browser\n`);
});
