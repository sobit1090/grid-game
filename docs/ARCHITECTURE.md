# CosmoGrid System Architecture

This document provides a deep technical analysis of the design patterns, data flows, and system components of CosmoGrid.

---

## 1. High-Level Overview

The application is structured as a decoupled monorepo leveraging a unified workspace:

```text
       ┌────────────────────────┐
       │   Browser Frontend     │
       │ (Next.js 15 App Router)│
       └───────────┬────────────┘
                   │
    WebSocket      │  REST HTTP
    (Socket.IO)    │  (JSON API)
                   ▼
       ┌────────────────────────┐
       │  Real-Time Backend     │
       │ (Express + Socket.IO)  │
       └───────────┬────────────┘
                   │
                   │ ORM Query
                   │ (Prisma Client)
                   ▼
       ┌────────────────────────┐
       │  Relational Database   │
       │     (PostgreSQL)       │
       └────────────────────────┘
```

### Components
1. **Frontend**: A Next.js 15 client built in TypeScript, using Tailwind CSS v4 and Framer Motion. Handles the active layout rendering, local storage credentials cache, and real-time canvas grid updates.
2. **Real-Time Layer**: Socket.IO framework running over WebSocket, establishing persistent dual-channel communication paths.
3. **Backend Server**: Node/Express server in TypeScript. Validates capture actions, coordinates player presence state, and processes REST API queries.
4. **Database**: PostgreSQL storing transactional audit logs, finished matches history, and persistent rankings metadata.

---

## 2. Technical Stack Rationalization

| Technology | Rationale |
| :--- | :--- |
| **Next.js 15** | Offers highly-optimized layout structure, Server-Side Rendering (SSR) capabilities for dashboards/leaderboards, and native build optimizations. |
| **TypeScript** | Absolute type safety across client and server. Shared types package prevents payload misalignment between WebSocket emitters. |
| **Prisma ORM** | Type-safe query building, auto-generated migrations, and high developer velocity. |
| **PostgreSQL** | Relational structures fit match history logs and player profiles perfectly. Supports atomic transactions and raw queries for locking resources. |
| **Socket.IO** | Out-of-the-box polling fallbacks, reconnection buffers, and socket namespaces/rooms management. |
| **PNPM Workspaces** | Extreme performance package caching, zero dependency duplications, and easy script orchestration in monorepos. |

---

## 3. Data Flow: Cell Claim Lifecycle

When a player claims a cell, the event triggers the following synchronous path:

```text
Player clicks cell
  │
  ▼
[Next.js Client] Emits "capture_cell" via Socket.IO
  │
  ▼
[Express Server] Receives payload. Runs validations:
  │  1. Check if game state === ACTIVE
  │  2. Verify player exists in the lobby
  │  3. Verify cellIndex is within bounds (0..899)
  │
  ▼
[PostgreSQL Database] Executes atomic SQL Transaction:
  │  Query: UPDATE "Cell" SET "ownerId" = $1 
  │         WHERE "gameId" = $2 AND "x" = $3 AND "y" = $4 AND "ownerId" IS NULL;
  │
  ├───[Failed: Cell already owned]
  │     Returns 0 rows. Server rejects claim. Sends error frame to user.
  │
  └───[Success: Claim secured]
        Returns 1 row. Server cache commits claim.
          │
          ▼
        [Prisma] Asynchronously creates a Move record (replay audit log).
          │
          ▼
        [Express Server] Broadcasts "cell_updated" and "leaderboard_updated" to the room.
          │
          ▼
        [All Joined Clients] React hook updates state. Rerenders ONLY the claimed Cell.
```

---

## 4. Scalability Discussion

### Horizontal Scaling & Multi-Server WebSocket Support
In a multi-server setup, WebSocket connections are sticky (managed by load balancers). However, if Player A is connected to Server 1 and Player B is connected to Server 2 in the same game room:
- We attach the **Socket.IO Redis Adapter** (`@socket.io/redis-adapter`).
- When Server 1 broadcasts a grid change, the message publishes to a Redis Pub/Sub channel.
- Server 2 receives the Redis broadcast and pushes the frame to Player B's active WebSocket connection.

### Database Indexing
To support quick queries at peak concurrent load:
- Index on `Cell(gameId, x, y)`: A composite unique index is created by Prisma to accelerate coordinates checks during claiming.
- Index on `Move(gameId, timestamp)`: Speeds up sequential coordinate replays.
- Index on `Player(username)`: Accelerates login checks and stats lookups.
