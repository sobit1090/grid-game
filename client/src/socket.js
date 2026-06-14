import { io } from 'socket.io-client';

// Connect to the same host (Vite proxy forwards /socket.io → localhost:3001)
const socket = io(window.location.origin, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});

export default socket;
