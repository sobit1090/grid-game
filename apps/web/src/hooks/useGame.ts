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

  // Session details
  const [username, setUsername] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

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
      const activeCode = lobbyCodeFromUrl || localStorage.getItem('grid_lobby_code');

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
    });

    socket.on(SOCKET_EVENTS.ERROR, (err) => {
      setSocketError(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [lobbyCodeFromUrl]);

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

  // Set match duration limit
  const setGameDuration = useCallback((seconds: number) => {
    console.log('[CLIENT] setGameDuration called:', seconds, 'lobbyCode:', lobbyCode, 'connected:', connected);
    if (!socketRef.current || !lobbyCode || !connected) {
      console.warn('[CLIENT] setGameDuration ignored. socket:', !!socketRef.current, 'lobbyCode:', lobbyCode, 'connected:', connected);
      return;
    }

    socketRef.current.emit(SOCKET_EVENTS.SET_DURATION, {
      code: lobbyCode,
      duration: seconds
    });
  }, [lobbyCode, connected]);

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
    socketError,
    gameDuration,
    endTime,
    joinGame,
    claimCell,
    triggerPlayAgain,
    startMatch,
    setGameDuration
  };
}
export default useGame;
