import { io } from 'socket.io-client';

// Use env var in production, or localhost for local dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? undefined : 'http://localhost:3001');

const socket = io(BACKEND_URL, {
  transports: ['websocket'] // Force websockets to prevent slow polling loops on bad hostings
});

export default socket;
