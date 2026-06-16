// Shared Interface Definitions for Grid Capture Game

export interface SharedPlayer {
  id: string;
  username: string;
  color: string;
  totalGames: number;
  wins: number;
}

export interface SharedLobby {
  id: string;
  code: string;
  status: 'LOBBY' | 'ACTIVE' | 'GAMEOVER';
  createdAt: Date | string;
  gameId: string;
  players: SharedPlayer[];
  readyCount: number;
  gameDuration?: number;
  endTime?: number | null;
}

export interface SharedGame {
  id: string;
  winnerId: string | null;
  duration: number; // in seconds
  totalPlayers: number;
  createdAt: Date | string;
}

export interface SharedCell {
  x: number;
  y: number;
  ownerId: string | null; // username or ID of player who owns it
  color: string | null;   // color of the player who owns it
}

export interface SharedMove {
  playerId: string;
  username: string;
  color: string;
  cellIndex: number;
  x: number;
  y: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  username: string;
  color: string;
  cellsCount: number;
  percentage: number;
}

// Socket IO Event Constants
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_GAME: 'join_game',
  CREATE_LOBBY: 'create_lobby',
  CAPTURE_CELL: 'capture_cell',
  PLAYER_READY: 'player_ready',
  SET_DURATION: 'set_duration',

  // Server -> Client
  LOBBY_CREATED: 'lobby_created',
  CELL_UPDATED: 'cell_updated',
  LEADERBOARD_UPDATED: 'leaderboard_updated',
  GAME_OVER: 'game_over',
  GAME_RESTART: 'game_restart',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  LOBBY_UPDATED: 'lobby_updated',
  ERROR: 'socket_error'
} as const;

export type SocketEventsType = typeof SOCKET_EVENTS;
