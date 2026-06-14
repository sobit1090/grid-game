# CosmoGrid — Project Q&A

---

## 🛠 Tech Stack Used

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) | Server-side rendering, file-based routing, production-ready React framework |
| **Styling** | Tailwind CSS v4 + Custom CSS | Utility-first styling with glassmorphism and custom animations |
| **Real-time Client** | Socket.IO Client | Bidirectional WebSocket communication with auto-reconnect |
| **Backend** | Node.js + Express | Lightweight HTTP server for REST API routes |
| **Real-time Server** | Socket.IO Server | Manages WebSocket rooms (lobbies), broadcasts events to all players |
| **Database** | PostgreSQL (via Docker) | Reliable relational storage for players, games, cells, and move history |
| **ORM** | Prisma | Type-safe database queries, schema migrations, easy relation management |
| **Monorepo** | pnpm Workspaces | Shared TypeScript types between `apps/web`, `apps/server`, and `packages/shared` |
| **Language** | TypeScript (full-stack) | End-to-end type safety across client, server, and shared package |
| **Deployment** | Vercel (frontend) | CI/CD on every push, global CDN, preview URLs |

---

## ⚡ How Did You Handle Real-Time Updates?

The entire game loop runs over **WebSockets using Socket.IO**, with each lobby isolated in a Socket.IO **room** (`lobby_<CODE>`).

### Connection & Rooms
When a player joins a lobby, the server calls `socket.join('lobby_<CODE>')`. Every event (cell claim, leaderboard update, game over) is then broadcast to `io.to(roomName).emit(...)` — meaning **only players in that lobby receive the event**.

### Cell Capture Flow
```
Player clicks cell
    → Client emits CAPTURE_CELL event via WebSocket
    → Server validates claim in-memory (Map lookup, 0ms)
    → If available: sets owner in memory immediately
    → Broadcasts CELL_UPDATED + LEADERBOARD_UPDATED to all players in the room
    → Persists the DB update asynchronously in the background (non-blocking)
```

### State Synchronization
- On **join**: server sends a full `LOBBY_UPDATED` snapshot to the joining client
- On **reconnect**: the client reads `localStorage` (username, color, lobby code) and automatically re-emits `JOIN_GAME` to restore session
- On **cell update**: only the changed cell index is sent — not the full grid — keeping payloads minimal
- On **game over**: server broadcasts `GAME_OVER` with the winner and final leaderboard

### Authoritative In-Memory State
The server holds the entire grid in a `Map<number, string>` (cell index → owner username). This is the **single source of truth**. Checks happen purely in memory — the database write is a background fire-and-forget operation. This drops claim latency from ~100ms (DB roundtrip) to under 1ms.

---

## ⚖️ Trade-offs Made

### 1. In-Memory vs. Database-First Claims
**Decision**: Cell ownership is validated in memory, DB writes happen asynchronously.  
**Trade-off**: Under a server crash scenario, the last few cell claims (not yet written to DB) could be lost. Accepted this trade-off for dramatically lower latency and better gameplay feel. In a production system, a write-ahead log or Redis would bridge this gap.

### 2. No Redis / Horizontal Scaling
**Decision**: Lobby state lives in a single Node.js `Map`, not an external store.  
**Trade-off**: The server cannot be horizontally scaled (multiple instances would not share lobby state). For this single-server multiplayer game this is acceptable. Adding Redis + Socket.IO Redis Adapter would fix this.

### 3. Monorepo with pnpm Workspaces
**Decision**: Single repository with `apps/web`, `apps/server`, and `packages/shared`.  
**Trade-off**: Slightly more complex build configuration and Vercel deployment setup (requires setting Root Directory), but the benefit of shared TypeScript types between client and server eliminates an entire class of bugs — both ends always agree on event names and payload shapes.

### 4. Socket.IO over Raw WebSockets
**Decision**: Used Socket.IO instead of native `ws`.  
**Trade-off**: Adds ~30KB to the client bundle. The payoff is: automatic reconnection, room management, fallback to HTTP long-polling, and a much simpler API.

### 5. PostgreSQL over MongoDB
**Decision**: Relational database with Prisma.  
**Trade-off**: Schema migrations are more rigid than MongoDB's flexible documents. But for structured game data (players, lobbies, games, cells, moves) with clear relations, Postgres gives better query power, foreign key integrity, and the ability to do atomic SQL updates for concurrency control.

---

## 🎁 Bonus Features Added

### ✅ Customizable Game Timers
Players can select match duration before launch: **2 minutes**, **5 minutes**, or **10 minutes**. The timer is server-authoritative — the server sets `endTime = startTime + duration` and runs a `setTimeout` that triggers `endGame()` automatically. The client shows a live ticking countdown.

### ✅ Lobby Invite Link System
When a lobby is created, the lobby code is appended to the URL (`/?lobby=XXXXX`). Sharing the URL auto-fills the lobby code in the join form, making inviting friends a one-click share.

### ✅ Auto-Reconnect on Page Refresh
Player credentials (username, color, lobby code) are persisted in `localStorage`. If a player refreshes the page mid-game, the socket reconnects and automatically re-joins the lobby — the game continues seamlessly.

### ✅ Duration Selector Resets After Every Match
When both players click "Play Again", the game **returns to the Lobby Setup phase** instead of immediately restarting. This lets players choose a new duration before each match, rather than being locked into the previous setting.

### ✅ Leave Lobby (Logo Click)
Clicking the CosmoGrid logo in the game header acts as a **Leave Lobby** button. It clears all local state and takes the player back to the welcome screen, where they can create or join a different lobby.

### ✅ Live Leaderboard During Play
The leaderboard updates after every single cell capture — not just at the end of the game. Players can see exactly who is winning and by what percentage in real-time.

### ✅ Floating "+1" Score Animations
When a player successfully claims a cell, a `+1` floats up from the click position in the player's color. This micro-animation provides instant visual feedback that the capture was registered.

### ✅ Concurrency-Safe Cell Claiming
Original implementation: used an atomic SQL `UPDATE ... WHERE ownerId IS NULL` to prevent two players from claiming the same cell simultaneously. After the performance refactor, this is handled by an in-memory `Map.has()` check on the server — since Node.js is single-threaded, concurrent socket events are processed one at a time, making this inherently race-condition safe.

### ✅ Glassmorphism Space UI
Full cosmic space theme with a procedurally animated starfield background, glassmorphism panels, neon glow colors, and cell capture pulse animations — all built with vanilla CSS animations and Tailwind.
