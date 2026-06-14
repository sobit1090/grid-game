# CosmoGrid: Real-Time Multiplayer Grid Capture

A production-grade, real-time multiplayer grid claiming game designed as a high-performance monorepo workspace.

## 🚀 Key Features

* **Real-time synchronized game board**: Multi-client grid state replication in under 50ms using Socket.IO.
* **Optimistic Database Concurrency**: Safe transaction logic preventing race conditions when two players claim the same cell simultaneously.
* **Play Again Voting System**: Seamless lobby reset and vote counts without full page refresh.
* **Persistent Sessions**: Reconnection state tracking utilizing local browser storage and socket session caches.
* **Twinkling Space Visuals**: Premium Tailwind CSS v4 design with glowing assets, scale pulses, and interactive confetti particles.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Socket.IO Client
* **Backend**: Node.js, Express, TypeScript, Socket.IO
* **Database**: PostgreSQL, Prisma ORM
* **Monorepo Manager**: PNPM Workspaces

---

## 📁 Repository Structure

```text
grid-game/
 ├── apps/
 │    ├── web/           # Next.js 15 App Router + Tailwind v4 + Framer Motion (Port 3000)
 │    └── server/        # Express + Socket.IO TypeScript server (Port 3001)
 ├── packages/
 │    └── shared/        # Shared Type definitions (Socket events, payloads)
 ├── prisma/
 │    └── schema.prisma  # Root-level Prisma models (Player, Lobby, Game, Cell, Move)
 ├── docs/               # Advanced architecture, APIs, interview prep documentation
 ├── pnpm-workspace.yaml # Workspace definitions
 ├── vercel.json         # Vercel deployment configurations
 └── package.json        # Monorepo scripts
```

---

## 🔧 Installation & Local Setup

### Prerequisites
* **Node.js**: v20 or later
* **PNPM**: Installed globally (`npm install -g pnpm`)
* **PostgreSQL**: Running instance (e.g. Docker container)

### 1. Install Dependencies
Run the installation command in the root directory:
```bash
pnpm install
```

### 2. Configure Database & Environment
The project expects a `.env` file at the root. We have pre-configured it to point to your local PostgreSQL container mapping to port `5433`:
```env
DATABASE_URL="postgresql://sobit902266:sobit1033@localhost:5433/haqms?schema=public"
PORT=3001
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

### 3. Generate Prisma Database Client
Prepare the database schema structures:
```bash
pnpm --filter server prisma:generate
```

### 4. Run Migrations
Synchronize PostgreSQL with the Prisma schema:
```bash
npx prisma db push
```

### 5. Launch Development Servers
Run both the Next.js frontend and Express/Socket.IO backend in parallel:
```bash
pnpm dev
```
* **Frontend**: Open `http://localhost:3000`
* **Backend**: Runs on `http://localhost:3001`

---

## 📚 Technical Documentation (Docs Folder)

Detailed specifications are available in the `/docs` directory:
1. [FEATURES.md](file:///c:/Users/SOBIT/Desktop/Aplications/grid/docs/FEATURES.md) - Deep dive of client interactions and game elements.
2. [ARCHITECTURE.md](file:///c:/Users/SOBIT/Desktop/Aplications/grid/docs/ARCHITECTURE.md) - System layout diagrams and data flows.
3. [INTERVIEW_PREP.md](file:///c:/Users/SOBIT/Desktop/Aplications/grid/docs/INTERVIEW_PREP.md) - 30+ answers to database locking, WebSockets scaling, and state caching questions.
4. [TRADEOFFS.md](file:///c:/Users/SOBIT/Desktop/Aplications/grid/docs/TRADEOFFS.md) - Pros & cons of choosing PostgreSQL, Next.js, and Socket.IO.
5. [API.md](file:///c:/Users/SOBIT/Desktop/Aplications/grid/docs/API.md) - Rest HTTP routes and real-time Socket event payloads.
6. [DATABASE.md](file:///c:/Users/SOBIT/Desktop/Aplications/grid/docs/DATABASE.md) - Table schema breakdown and relational links.
7. [DEPLOYMENT.md](file:///c:/Users/SOBIT/Desktop/Aplications/grid/docs/DEPLOYMENT.md) - Production guides for Vercel, Railway, and Neon Postgres.
