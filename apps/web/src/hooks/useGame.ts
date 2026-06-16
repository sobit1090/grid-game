'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, LeaderboardEntry } from 'shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export function useGame(lobbyCodeFromUrl: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Game state
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'LOBBY' | 'ACTIVE' | 'GAMEOVER'>('LOBBY');
  const [players, setPlayers] = useState<{ username: string; color: string; isReady: boolean }[]>([]);
  const [cells, setCells] = useState<{ [key: number]: string }>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [winnerUsername, setWinnerUsername] = useState<string | null>(null);
  const [gameDuration, setGameDurationState] = useState<number>(300);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [hostUsername, setHostUsername] = useState<string | null>(null);

  // Session details
  const [username, setUsername] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Keep a ref to lobbyCodeFromUrl to avoid stale closures in socket events without reconnecting
  const lobbyCodeFromUrlRef = useRef<string | null>(lobbyCodeFromUrl);
  useEffect(() => {
    lobbyCodeFromUrlRef.current = lobbyCodeFromUrl;
  }, [lobbyCodeFromUrl]);

  // Initialize socket connection
  useEffect(() => {
    const socket = io(WS_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setSocketError(null);
      
      // Auto-reconnect session if details exist in memory/localStorage
      const cachedUser = localStorage.getItem('grid_username');
      const cachedColor = localStorage.getItem('grid_color');
      const activeCode = lobbyCodeFromUrlRef.current || localStorage.getItem('grid_lobby_code');

      if (cachedUser && cachedColor && activeCode) {
        setUsername(cachedUser);
        setColor(cachedColor);
        setLobbyCode(activeCode);
        
        socket.emit(SOCKET_EVENTS.JOIN_GAME, {
          code: activeCode,
          username: cachedUser,
          color: cachedColor
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      // Only surface connection errors when user is already in a lobby
      setConnectionError('Connection lost. Reconnecting...');
    });

    socket.on(SOCKET_EVENTS.LOBBY_UPDATED, (lobbyData) => {
      setLobbyCode(lobbyData.code);
      setStatus(lobbyData.status);
      setPlayers(lobbyData.players);
      setCells(lobbyData.cells);
      setLeaderboard(lobbyData.leaderboard);
      setOnlineCount(lobbyData.onlineCount);
      setWinnerUsername(lobbyData.winnerUsername);
      if (typeof lobbyData.gameDuration === 'number') {
        setGameDurationState(lobbyData.gameDuration);
      }
      if (typeof lobbyData.endTime === 'number' || lobbyData.endTime === null) {
        setEndTime(lobbyData.endTime);
      }
      if (lobbyData.hostUsername !== undefined) {
        setHostUsername(lobbyData.hostUsername);
      }
    });

    socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data) => {
      setOnlineCount(data.onlineCount);
    });

    socket.on(SOCKET_EVENTS.PLAYER_LEFT, (data) => {
      setOnlineCount(data.onlineCount);
    });

    socket.on(SOCKET_EVENTS.CELL_UPDATED, (data) => {
      setCells(prev => ({
        ...prev,
        [data.cellIndex]: data.ownerId
      }));
    });

    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATED, (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    socket.on(SOCKET_EVENTS.GAME_OVER, (data) => {
      setStatus('GAMEOVER');
      setWinnerUsername(data.winnerUsername);
      setLeaderboard(data.leaderboard);
    });

    socket.on(SOCKET_EVENTS.GAME_RESTART, (lobbyData) => {
      setLobbyCode(lobbyData.code);
      setStatus(lobbyData.status);
      setPlayers(lobbyData.players);
      setCells(lobbyData.cells);
      setLeaderboard(lobbyData.leaderboard);
      setWinnerUsername(null);
      if (typeof lobbyData.gameDuration === 'number') {
        setGameDurationState(lobbyData.gameDuration);
      }
      if (typeof lobbyData.endTime === 'number' || lobbyData.endTime === null) {
        setEndTime(lobbyData.endTime);
      }
      if (lobbyData.hostUsername !== undefined) {
        setHostUsername(lobbyData.hostUsername);
      }
    });

    socket.on(SOCKET_EVENTS.ERROR, (err) => {
      setSocketError(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Create Lobby via socket (no REST call needed)
  const createLobby = useCallback((user: string, clr: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !connected) {
        reject(new Error('Not connected to server'));
        return;
      }
      socketRef.current.emit(SOCKET_EVENTS.CREATE_LOBBY, { username: user, color: clr }, (res: { code?: string; error?: string }) => {
        if (res?.error) {
          reject(new Error(res.error));
        } else if (res?.code) {
          resolve(res.code);
        } else {
          reject(new Error('Failed to create lobby'));
        }
      });
    });
  }, [connected]);

  // Join Game
  const joinGame = useCallback((code: string, user: string, clr: string) => {
    if (!socketRef.current || !connected) return;

    localStorage.setItem('grid_username', user);
    localStorage.setItem('grid_color', clr);
    localStorage.setItem('grid_lobby_code', code);
    
    setUsername(user);
    setColor(clr);
    setLobbyCode(code);

    socketRef.current.emit(SOCKET_EVENTS.JOIN_GAME, {
      code,
      username: user,
      color: clr
    });
  }, [connected]);

  // Claim Cell
  const claimCell = useCallback((cellIndex: number) => {
    if (!socketRef.current || !lobbyCode || !username) return;

    socketRef.current.emit(SOCKET_EVENTS.CAPTURE_CELL, {
      code: lobbyCode,
      username,
      cellIndex
    });
  }, [lobbyCode, username]);

  // Vote: Play Again
  const triggerPlayAgain = useCallback(() => {
    if (!socketRef.current || !lobbyCode || !username) return;

    socketRef.current.emit(SOCKET_EVENTS.PLAYER_READY, {
      code: lobbyCode,
      username
    });
  }, [lobbyCode, username]);

  // Force restart from Lobby setup
  const startMatch = useCallback(() => {
    if (!socketRef.current || !lobbyCode || !username) return;

    socketRef.current.emit(SOCKET_EVENTS.PLAYER_READY, {
      code: lobbyCode,
      username
    });
  }, [lobbyCode, username]);

  // Set match duration limit — only host can change it
  const setGameDuration = useCallback((seconds: number) => {
    // Update local state immediately for instant visual feedback
    setGameDurationState(seconds);

    if (!socketRef.current || !lobbyCode || !connected || !username) return;

    socketRef.current.emit(SOCKET_EVENTS.SET_DURATION, {
      code: lobbyCode,
      username,
      duration: seconds
    });
  }, [lobbyCode, connected, username]);

  // Leave lobby and go back to welcome screen
  const leaveLobby = useCallback(() => {
    // Remove lobby code from localStorage to prevent auto-rejoin
    localStorage.removeItem('grid_lobby_code');

    // Reset all game state — socket stays connected but we clear lobby state
    setLobbyCode(null);
    setStatus('LOBBY');
    setPlayers([]);
    setCells({});
    setLeaderboard([]);
    setOnlineCount(0);
    setWinnerUsername(null);
    setGameDurationState(300);
    setEndTime(null);
    setHostUsername(null);
    setSocketError(null);
  }, []);

  return {
    connected,
    lobbyCode,
    status,
    players,
    cells,
    leaderboard,
    onlineCount,
    winnerUsername,
    username,
    color,
    // socketError is only for server-sent game errors (e.g. duplicate username)
    // connectionError is for socket transport failures, only shown inside a lobby
    socketError,
    connectionError,
    gameDuration,
    endTime,
    hostUsername,
    createLobby,
    joinGame,
    claimCell,
    triggerPlayAgain,
    startMatch,
    setGameDuration,
    leaveLobby
  };
}
export default useGame;
