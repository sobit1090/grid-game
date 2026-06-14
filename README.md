# Antigravity Grid - Real-Time Territory War

## Deployed App Link  
* **Link**: [https://grid-game-ruby.vercel.app/](https://grid-game-ruby.vercel.app/)

## GitHub Repository Link (Make sure the repo is public and includes a README)   
* **Repository**: [https://github.com/sobit1090/grid-game](https://github.com/sobit1090/grid-game)

## Tech Stack Used   
* **Frontend**: React (v19), Vite, Vanilla CSS3, Socket.io-client
* **Backend**: Node.js, Express, Socket.io
* **Deployment**: Vercel (Frontend), Node.js / Localhost (Backend)

## How did you handle real-time updates?  
* **Socket.io WebSockets**: Real-time state synchronization is managed via WebSockets to enable fast, bi-directional communication.
* **Server Authority**: The backend server acts as the single source of truth, validating all claims (checking cell ranges, cooldowns, active shields) and maintaining the state in-memory.
* **State Broadcasts**: Validated events (such as claims, stats, leaderboard rankings, chat messages, and round events) are immediately broadcast to all players.
* **Custom hook sync**: The client uses `useGameSocket` (a custom React hook) to maintain WebSocket state, listen for socket events, update client state, and cleanly unsubscribe on unmount.

## What trade-offs did you make?   
* **In-Memory State**: Storing game state in-memory on the Node server results in extremely fast, sub-millisecond response times, but does not persist grid state across server restarts. (For a full production game, a fast store like Redis would be integrated).
* **Decoupled Hosting Architecture**: Because Vercel serverless environments do not support persistent WebSockets, we serve the static client page from Vercel while pointing to a separate, dedicated Node.js server for the WebSocket server.
* **WebSocket-only connection**: Disabled Socket.io's HTTP long-polling fallback (`transports: ['websocket']`) to prevent endless polling request overhead and execution timeouts on serverless environments.
* **Rendering Optimizations**: Rendering a 1,024-cell grid in React can cause lag. We wrapped `Cell` and `GridCanvas` in `React.memo` to ensure only the changed cells re-render on grid updates, maintaining a constant 60 FPS.

## Any bonus features you added?  
* **Round System**: Lobby screen allowing players to select round duration (2m, 5m, 10m), matching countdown timers, and an overlay screen showing the winner and final leaderboard scores.
* **Powerup System**: Randomly spawning powerups (Speed Boost for zero cooldown claims, Mega Claim to capture 3x3 blocks, Shield to prevent block theft, and Vision to see future spawns).
* **Achievements System**: Dynamic custom achievements/badges (like "Pioneer", "Settler", "Unstoppable") that trigger client-side notifications (toasts).
* **Zone Multipliers**: High-value grid zones (Center 2.0x multiplier, Edges 1.5x multiplier, Corners 1.2x multiplier) to guide player conflict.
* **Visual Effects**: Custom color-styled floating score points popping up at mouse click coordinates, a dynamic flame claim-streak banner, and a parallax scrolling starfield.
* **Audio Feedback**: Built-in sound effects (using WebAudio API) for claiming, getting blocked, picking up/activating powerups, and unlocking achievements.
