import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';

const GRID_SIZE = 32;

export default function useGameSocket() {
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [myUser, setMyUser] = useState(null);
  const [grid, setGrid] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [teamStats, setTeamStats] = useState({ red: { score: 0, blocks: 0 }, blue: { score: 0, blocks: 0 } });
  const [playerCount, setPlayerCount] = useState(0);
  const [activePowerups, setActivePowerups] = useState([]);
  const [gridPowerups, setGridPowerups] = useState([]);
  const [gameMode, setGameMode] = useState('ffa');
  const [zones, setZones] = useState({});
  const [myStats, setMyStats] = useState({ blocks: 0, score: 0, streak: 0, claims: 0 });
  const [toasts, setToasts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [animatedCells, setAnimatedCells] = useState(new Set());
  const [floatScores, setFloatScores] = useState([]);
  const [streak, setStreak] = useState(0);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const addFloatScore = useCallback((points, color, x, y) => {
    const id = Date.now() + Math.random();
    setFloatScores(prev => [...prev, { id, points, color, x, y }]);
    setTimeout(() => setFloatScores(prev => prev.filter(f => f.id !== id)), 900);
  }, []);

  const animateCell = useCallback((cellId) => {
    setAnimatedCells(prev => new Set([...prev, cellId]));
    setTimeout(() => setAnimatedCells(prev => {
      const next = new Set(prev);
      next.delete(cellId);
      return next;
    }), 400);
  }, []);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => { setConnected(false); setJoined(false); });

    socket.on('joined', ({ userId, user, gridState, leaderboard: lb, teamStats: ts, playerCount: pc }) => {
      setMyUser({ ...user, userId });
      setGrid(gridState.grid || {});
      setGridPowerups(gridState.activePowerups || []);
      setZones(gridState.zones || {});
      setGameMode(gridState.gameMode || 'ffa');
      setLeaderboard(lb || []);
      setTeamStats(ts || { red: { score: 0, blocks: 0 }, blue: { score: 0, blocks: 0 } });
      setPlayerCount(pc || 0);
      setMyStats({ blocks: user.blocks, score: user.score, streak: user.streak, claims: user.totalClaims || 0 });
      setJoined(true);
      setChatMessages(prev => [...prev, { system: true, text: `Welcome to the grid, ${user.name}! 🚀` }]);
    });

    socket.on('cells_claimed', ({ cells }) => {
      setGrid(prev => {
        const next = { ...prev };
        cells.forEach(c => {
          next[c.cellId] = { userId: c.userId, color: c.color, name: c.name, team: c.team };
        });
        return next;
      });
      cells.forEach(c => animateCell(c.cellId));
    });

    socket.on('my_stats', ({ blocks, score, streak: s, activePowerups: ap }) => {
      setMyStats(prev => ({ ...prev, blocks, score, streak: s, claims: (prev.claims || 0) + 1 }));
      setStreak(s);
      setActivePowerups(ap || []);
    });

    socket.on('stats_update', ({ leaderboard: lb, teamStats: ts, playerCount: pc }) => {
      setLeaderboard(lb || []);
      setTeamStats(ts || { red: { score: 0, blocks: 0 }, blue: { score: 0, blocks: 0 } });
      setPlayerCount(pc || 0);
    });

    socket.on('powerup_spawned', ({ powerup }) => {
      setGridPowerups(prev => [...prev, powerup]);
    });

    socket.on('powerup_collected', ({ powerup }) => {
      setGridPowerups(prev => prev.filter(p => p.id !== powerup.id));
      addToast({ type: 'powerup', icon: powerup.type.icon, title: powerup.type.name, body: powerup.type.desc });
    });

    socket.on('powerup_activated', ({ powerup }) => {
      setActivePowerups(prev => prev.map(p => p.id === powerup.id ? { ...p, activatedAt: Date.now() } : p));
    });

    socket.on('achievements_unlocked', ({ achievements }) => {
      achievements.forEach(ach => {
        addToast({ type: 'achievement', icon: ach.icon, title: ach.name, body: ach.desc });
      });
    });

    socket.on('claim_blocked', () => {
      addToast({ type: 'blocked', icon: '🛡️', title: 'Blocked!', body: 'That block is shielded.' });
    });

    socket.on('player_joined', ({ name, playerCount: pc }) => {
      setPlayerCount(pc);
      setChatMessages(prev => [...prev, { system: true, text: `${name} joined the grid` }]);
    });

    socket.on('player_left', ({ playerCount: pc, leaderboard: lb }) => {
      setPlayerCount(pc);
      setLeaderboard(lb || []);
    });

    socket.on('chat_message', (msg) => {
      setChatMessages(prev => [...prev.slice(-99), msg]);
    });

    socket.on('game_mode_changed', ({ mode }) => {
      setGameMode(mode);
      addToast({ type: 'system', icon: '🎮', title: 'Mode Changed', body: `Now playing: ${mode.toUpperCase()}` });
    });

    socket.on('grid_reset', ({ gridState, leaderboard: lb }) => {
      setGrid(gridState.grid || {});
      setGridPowerups(gridState.activePowerups || []);
      setLeaderboard(lb || []);
      setMyStats({ blocks: 0, score: 0, streak: 0, claims: 0 });
      addToast({ type: 'system', icon: '↺', title: 'Grid Reset', body: 'The board has been cleared!' });
    });

    return () => socket.removeAllListeners();
  }, [addToast, animateCell]);

  const join = useCallback((name) => {
    socket.emit('join', { name });
  }, []);

  const claimCell = useCallback((cellId, x, y) => {
    if (!myUser) return;
    socket.emit('claim_cell', { cellId, userId: myUser.userId });
    const points = 1; // optimistic
    addFloatScore(`+${points}`, myUser.color, x, y);
  }, [myUser, addFloatScore]);

  const sendChat = useCallback((message) => {
    socket.emit('chat_message', { message });
  }, []);

  const setMode = useCallback((mode) => {
    socket.emit('set_game_mode', { mode });
  }, []);

  const resetGrid = useCallback(() => {
    socket.emit('reset_grid');
  }, []);

  const activatePowerup = useCallback((powerupId) => {
    socket.emit('activate_powerup', { powerupId });
  }, []);

  return {
    connected, joined, myUser, grid, leaderboard, teamStats, playerCount,
    activePowerups, gridPowerups, gameMode, zones, myStats, toasts,
    chatMessages, animatedCells, floatScores, streak,
    join, claimCell, sendChat, setMode, resetGrid, activatePowerup,
  };
}
