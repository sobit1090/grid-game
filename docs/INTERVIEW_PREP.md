# CosmoGrid Interview Preparation Guide

This guide contains 30 interview questions and highly technical answers explaining the architectural decisions, concurrency handling, database optimizations, and front-end performance choices built into the CosmoGrid project.

---

## Part 1: Architecture & Real-Time Protocols

### 1. Why did you choose Socket.IO over raw WebSockets?
**Answer:** Socket.IO is a feature-rich abstraction layer built over WebSockets. While raw WebSockets are more lightweight, Socket.IO provides crucial production features out-of-the-box:
- **Automatic reconnection** with exponential backoff.
- **Heartbeats & Ping/Pong checks** to detect broken connections.
- **Rooms and namespaces** management for isolating multiplayer lobbies.
- **HTTP Long-Polling fallback** for networks or firewalls that block raw WebSocket frames.

### 2. How does real-time communication work in CosmoGrid?
**Answer:** The client opens a persistent socket handshake connection on page load. When the user claims a coordinate, the client emits a `capture_cell` payload containing `(lobbyCode, username, cellIndex)`. The server validates the payload, locks the row in the database, updates memory cache, and broadcasts `cell_updated` and `leaderboard_updated` frames to all players joined in that lobby's room.

### 3. What is the transport handshake sequence of Socket.IO?
**Answer:** Socket.IO typically begins with an HTTP GET request to establish a polling connection (`/socket.io/?EIO=4&transport=polling`). The server replies with a JSON payload containing the `sid` (session ID), ping interval, and timeout values. Next, it sends a websocket upgrade frame (`transport=websocket`), upgrading the protocol from HTTP to WS.

### 4. How are players kept in sync when a new client connects or reconnects?
**Answer:** Upon connection, the socket client emits `join_game`. The server queries the in-memory `Lobby` state cache (containing the full board snapshot, ready checklist status, and connected user records). The server sends this combined snapshot directly to the connecting client via a unicast `lobby_updated` socket frame, synchronizing their board state immediately.

### 5. How does the reconnection flow restore active sessions after a page refresh?
**Answer:** Before loading, the Next.js page reads cached items `grid_username`, `grid_color`, and `grid_lobby_code` from `localStorage`. If found, it bypasses the welcome form and automatically emits `join_game` with those cached parameters. The server checks the in-memory lobby map for that username, binds the new socket ID, and resumes the session without losing score states.

### 6. What happens if a player disconnects unexpectedly? How do you prevent ghost players?
**Answer:** When a socket disconnects, the Socket.IO `disconnect` event triggers. The server retrieves the active session mapping and emits a `player_left` message to the room to update online presence counters. To handle temporary cellular dropouts, the player remains inside the in-memory game structure for the remainder of the match, allowing them to rejoin seamlessly.

### 7. How did you design the shared type definitions package?
**Answer:** We set up a PNPM workspace where `/packages/shared` exports raw TypeScript files directly. By using `"shared": "workspace:*"` inside `/apps/web/package.json` and `/apps/server/package.json`, both applications share the exact same socket event enums and interface signatures, preventing compiler errors and integration bugs.

---

## Part 2: Concurrency & Database Design

### 8. How did you prevent race conditions when two players click the same cell simultaneously?
**Answer:** We implemented **Optimistic Concurrency Control (OCC)** at the database level. Instead of running a read-then-write check in Node.js (which is prone to race conditions), we execute a single atomic SQL update query:
```sql
UPDATE "Cell" SET "ownerId" = $1 WHERE "gameId" = $2 AND "x" = $3 AND "y" = $4 AND "ownerId" IS NULL;
```
Because PostgreSQL handles concurrent transactions sequentially, the first update locks the row, claims it, and changes `ownerId` from `NULL` to the player's ID. The second concurrent query finds `ownerId IS NULL` to be false, updates 0 rows, and fails. The server detects the `0` rows affected return and rejects the second player's click.

### 9. What is the difference between Optimistic Concurrency Control (OCC) and Pessimistic Locking (Row-Level Locking)?
**Answer:** 
- **OCC** (which we use) allows updates to run without locking read access. It verifies that the row hasn't changed since it was read. OCC has zero overhead for unclaimed cells and performs exceptionally under low conflict rates.
- **Pessimistic Locking** uses `SELECT ... FOR UPDATE`, locking the row immediately. This blocks other threads from reading or writing the cell until the transaction ends. This can degrade query throughput under high concurrency.

### 10. Why did you choose PostgreSQL over MongoDB for this project?
**Answer:** PostgreSQL provides strict ACID compliance, relational foreign key references, and robust transaction locking controls. Our data model is highly structured (Players, Games, Lobbies, Cells, and Moves). PostgreSQL's relational nature makes index optimizations on compound keys (like `gameId_x_y` unique indexes) highly performant.

### 11. Can you explain the Prisma database schema layout?
**Answer:** The database schema has five core models:
1. `Player`: User profile record storing wins, total matches, and custom color selections.
2. `Lobby`: Lobbies connecting invite codes to active game IDs.
3. `Game`: Matches records tracking durations, participants, and winner IDs.
4. `Cell`: Board coordinate tiles maps linked by game reference keys.
5. `Move`: Sequential claim event logs for audits and replay tracking.

### 12. Why do you use `prisma.cell.createMany` rather than multiple `create` queries?
**Answer:** A 30x30 grid has 900 cells. Inserting 900 records using individual `prisma.cell.create` queries executes 900 separate SQL queries, generating massive network and database round-trip overhead. `createMany` bundles all 900 records into a single multi-row insert query:
```sql
INSERT INTO "Cell" (...) VALUES (...), (...), ...;
```
This reduces game setup times from several seconds to under 50 milliseconds.

### 13. How would you handle a database migration to add an achievement table?
**Answer:** We would write a new model `Achievement` in `schema.prisma` mapping a one-to-many relationship with `Player`. Next, we'd run:
```bash
npx prisma migrate dev --name add_achievements
```
This generates a SQL migration script, applies it to the database, and regenerates the Prisma Client types.

### 14. What database indexes did you optimize for the capture operations?
**Answer:** The primary performance bottleneck is looking up coordinate cells during clicks. We optimized this by defining a compound unique index on the `Cell` table:
```prisma
@@unique([gameId, x, y])
```
This generates a composite B-Tree index in PostgreSQL, making cell lookup times close to $O(\log N)$ even with millions of rows in the table.

### 15. How does the `Move` table assist in debugging and audit logging?
**Answer:** The `Move` table stores every successful capture event sequentially: `(playerId, cellIndex, gameId, timestamp)`. In the event of disputes or anti-cheat flags, this log allows us to reconstruct the exact order of claims.

---

## Part 3: Front-End Performance & React Optimizations

### 16. How did you optimize the 30x30 React grid to run smoothly at 60 FPS?
**Answer:** In a basic React implementation, clicking a single cell modifies state, causing the parent component to rerender and redraw all 900 cells. To prevent this, we:
- Wrapped the individual `Cell` component in `React.memo()`.
- Optimized the parent grid using `useMemo` to keep cell components cached.
- Passed `useCallback` references down to grid callbacks.
Only the cell that actually changes ownership rerenders; the other 899 cells skip execution entirely.

### 17. How does the individual Cell detect capture updates without parent rerendering?
**Answer:** Each `Cell` component tracks its current `ownerId` prop. We store the previous owner ID using a React `useRef` reference. Inside a `useEffect` hooked to the `ownerId` prop, we check if `ownerId` has changed from the ref value. If it has, we toggle a local state `isNew = true` for 300ms, triggering the CSS pulse transition animation on that cell only.

### 18. Why is Next.js 15 App Router preferred over standard Client-Side React (Vite)?
**Answer:** Next.js 15 App Router offers:
- **Server Components (RSC)**: Renders non-interactive wrappers on the server, sending less JavaScript to the browser.
- **Route Optimization**: Pre-fetches profile and ranking routes automatically.
- **Unified Backend/API routing**: Express handles sockets, but profile queries and leaderboards can run through Next.js API paths.

### 19. How did you build the "+1" floating capture effect at cursor click locations?
**Answer:** When the client claims a cell, we extract the mouse click coordinates (`clientX`, `clientY`) from the click event. We append a temporary coordinate object `{ id, x, y }` to a `floats` array state. The DOM renders a absolute-positioned "+1" element at those coordinates. The element executes a CSS translation keyframe animation moving it upwards while fading out. We remove it from state after 900ms.

### 20. How did you integrate Tailwind CSS v4 in this Next.js 15 application?
**Answer:** Tailwind CSS v4 is a CSS-first compiler. We installed `tailwindcss@4` and `@tailwindcss/postcss`. We added the `@tailwindcss/postcss` plugin to `postcss.config.js` and imported Tailwind in `app/globals.css` with `@import "tailwindcss";`. This eliminates the need for a separate configuration file, compiling classes natively.

### 21. How did you implement the winner confetti celebration?
**Answer:** When the game status transitions to `GAMEOVER`, the client opens the `<WinnerModal>` overlay. Inside its mounting hook, we call the `canvas-confetti` library to launch double particle bursts from the bottom-left and bottom-right corners of the viewport.

### 22. What is the role of React's `<Suspense>` in the homepage layout?
**Answer:** The welcome page reads URL query parameters via Next.js `useSearchParams()`. Next.js requires any client component reading search parameters to be wrapped in a `<Suspense>` boundary to prevent blocking server-side rendering. We wrap the main game component in a Suspense wrapper to ensure clean compilation.

---

## Part 4: Testing & Code Quality

### 23. How would you write unit tests for the claim cell logic?
**Answer:** We write tests mock-spawning a mock game lobby. We evaluate:
- Capturing an unclaimed cell succeeds.
- Capturing a cell that is already owned is rejected.
- Coordinates outside bounds `(x < 0 || x >= 30)` return error statuses.

### 24. How would you test for simultaneous grid clicks (concurrency tests)?
**Answer:** We write an integration test that initializes two concurrent Promise threads trying to claim the same coordinate at the same time:
```typescript
const [res1, res2] = await Promise.all([
  gameManager.claimCell(code, 'Alice', 125),
  gameManager.claimCell(code, 'Bob', 125)
]);
```
We assert that one request resolves with `{ success: true }` and the other returns `{ success: false }` or throws a database error, verifying that no duplicate claims can occur.

### 25. What is the utility of ESLint and Prettier in this monorepo?
**Answer:** ESLint inspects static code to enforce consistent styling and prevent bugs. Prettier formats codebase files on save. They ensure uniform code style across workspace packages.

### 26. Explain the structure of the GitHub Actions CI workflow.
**Answer:** The workflow triggers on pushes and pull requests to `main`. It sets up Node.js, configures a PostgreSQL test service container, runs `pnpm install`, compiles TypeScript modules, runs database seed commands, and runs automated tests.

---

## Part 5: Scalability & Operations

### 27. How would you scale this real-time system to 100,000 concurrent users?
**Answer:** Scaling real-time web applications requires:
1. **WebSocket Layer**: Use a load balancer (like NGINX or AWS ALB) with sticky sessions to route traffic to multiple Express server instances, coordinated via a Redis Pub/Sub adapter.
2. **Database Layer**: Introduce read-replicas for query endpoints (profiles/leaderboards) and use PgBouncer to manage connection pools.
3. **Caching**: Store leaderboard stats in a Redis cache with a 5-second TTL.

### 28. How does sticky session routing assist WebSocket servers?
**Answer:** WebSockets require a continuous TCP connection. When a client performs a handshake, a sticky load balancer maps their session to a specific server instance. Without sticky sessions, client request packets could be routed to different servers, breaking the socket connection.

### 29. Why use PgBouncer for PostgreSQL connection pooling?
**Answer:** PostgreSQL spawns a new operating system process for every client connection, consuming about 10MB of memory per connection. Under high load, thousands of concurrent connections will saturate the database server's memory. PgBouncer acts as a lightweight proxy, multiplexing thousands of client connections into a smaller pool of active Postgres connections.

### 30. How would you monitor the production system for health and latency bottlenecks?
**Answer:** 
- **Application Performance Monitoring (APM)**: Instrument the backend with tools like Prometheus or Datadog to track request latencies, socket counts, and database query durations.
- **Logs**: Stream console logs to centralized logging stacks (like Winston/Elasticsearch).
- **Alerts**: Set up notifications for high memory usage, API error rates, or high latency.
