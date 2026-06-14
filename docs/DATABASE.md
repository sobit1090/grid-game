# CosmoGrid Database Schema

This document details the PostgreSQL database layout, table fields, relations, and index mappings used in CosmoGrid.

---

## 1. Relational Entity Relationship Diagram

```text
  ┌──────────┐            ┌──────────┐
  │  Player  │◄───────────┤   Cell   │
  └────┬─────┘            └────┬─────┘
       │                       │
       │ 1                     │ N
       │                       │
       │ N                     │ 1
  ┌────┴─────┐            ┌────┴─────┐
  │   Move   ├───────────►│   Game   │
  └──────────┘            └────┬─────┘
                               │ 1
                               │
                               │ 1
                          ┌────┴─────┐
                          │  Lobby   │
                          └──────────┘
```

---

## 2. Table Schemas

### Player
Stores player profile data and cumulative database records.
- **Fields**:
  - `id` (String/UUID, Primary Key)
  - `username` (String, Unique Index)
  - `color` (String)
  - `totalGames` (Integer, default 0)
  - `wins` (Integer, default 0)
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)

### Lobby
Manages active sessions and links to games.
- **Fields**:
  - `id` (String/UUID, Primary Key)
  - `code` (String, Unique Index)
  - `status` (String, default "LOBBY")
  - `gameId` (String/UUID, Nullable, Unique Foreign Key to Game)
  - `createdAt` (DateTime)

### Game
Stores records of completed matches.
- **Fields**:
  - `id` (String/UUID, Primary Key)
  - `winnerId` (String/UUID, Nullable, Foreign Key to Player)
  - `duration` (Integer, default 0) - total time elapsed in seconds.
  - `totalPlayers` (Integer, default 0)
  - `createdAt` (DateTime)

### Cell
Represents coordinates on the 30x30 board.
- **Fields**:
  - `id` (String/UUID, Primary Key)
  - `x` (Integer) - Coordinate position (0..29)
  - `y` (Integer) - Coordinate position (0..29)
  - `ownerId` (String/UUID, Nullable, Foreign Key to Player)
  - `gameId` (String/UUID, Foreign Key to Game)

### Move
Audits sequential capture coordinates.
- **Fields**:
  - `id` (String/UUID, Primary Key)
  - `playerId` (String/UUID, Foreign Key to Player)
  - `cellIndex` (Integer) - Index on the grid (0..899)
  - `gameId` (String/UUID, Foreign Key to Game)
  - `timestamp` (DateTime)

---

## 3. Relationships

* **Lobby $\leftrightarrow$ Game**: One-to-One. A lobby maps to one active Game session. The relation is linked via `Lobby.gameId` mapping to `Game.id`.
* **Game $\leftrightarrow$ Cell**: One-to-Many. When a game launches, 900 Cell records are generated.
* **Game $\leftrightarrow$ Move**: One-to-Many. Captures in a match log moves mapped under a single Game.
* **Player $\leftrightarrow$ Cell**: One-to-Many. A player can capture multiple cells in a game.
* **Player $\leftrightarrow$ Move**: One-to-Many. Captures audit history.

---

## 4. Index Mappings

To support low latency queries at scale, the database defines these database indexes:

1. **`Player(username)` [B-Tree Unique Index]**
   - Built automatically by Postgres to accelerate profile loads.
2. **`Lobby(code)` [B-Tree Unique Index]**
   - Built to make lobby joining lookup times $O(1)$.
3. **`Cell(gameId, x, y)` [Composite Unique B-Tree Index]**
   - Prisma maps:
     ```prisma
     @@unique([gameId, x, y])
     ```
   - Speeds up coordinates checking and resource claiming operations during match updates.
4. **`Move(gameId, timestamp)` [Composite Index]**
   - Speeds up match replay parsing.
