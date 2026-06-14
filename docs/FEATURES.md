# CosmoGrid Features List

This document outlines the core, advanced, and future bonus features integrated inside the CosmoGrid application codebase.

---

## 1. Core Features

### Real-Time Multiplayer Grid
- A 30x30 board containing 900 individual cells.
- Fully visible on desktop screens without scrolling, automatically fitting and scaling to mobile or tablet viewport sizes.
- *Screenshot Placeholder: [30x30 Game Board Overview]*

### Cell Ownership
- Unclaimed cells display in a subtle dark glassmorphic gray.
- Once captured, cells smoothly transition to the player's chosen neon indicator color.
- Displays tooltips indicating the coordinates `(x, y)` and ownership.

### Live Updates
- State replication updates all clients concurrently.
- Updates arrive in under 50ms utilizing low-overhead WebSocket event frames.

### Winner Detection
- Triggers instantly when the 900th cell is claimed (`remainingCells === 0`).
- Locked board state to block further input while results process.
- Launches the celebration screen overlay showing the winner's win ratio.

### Play Again System
- A non-intrusive restart mechanism.
- Players vote "Play Again" post-game; when all active players join the vote, the grid and database session reset seamlessly.

### Lobby System
- Generates 5-character alphanumeric lobby code (e.g. `A7K9P`).
- Restricts players from joining active games without coordinate resets.

---

## 2. Advanced Features

### Reconnection Handling & Session Persistence
- Auto-registers disconnect events without terminating active player scores.
- Re-establishes connections by checking cached details (username, claim color, active lobby code) inside browser `localStorage`.

### Presence Tracking
- Tracks total connections dynamically:
  ```text
  ● 14 Players Online
  ```
- Broadcasts join/leave presence logs.

### Live Leaderboard
- Sorts active matches by total captured cells and percentage.
- Highlight animations when rank standings change.

### Rate Limiting
- Core anti-spam defenses to limit capture commands per client thread (e.g. enforcing server-side cooldown limits).

### Sleek Cosmic Dark Mode
- Customized space background with twinkling keyframes, purple/indigo nebulae gradients, and neon presets.

---

## 3. Bonus Features & Future Additions

### Territory Control
- Orthogonal adjacency checks to detect connected clusters. Future releases will reward players forming shapes or larger grid blocks.

### Capture Streaks
- Combos and multipliers for players executing quick captures within consecutive 3-second intervals.

### Achievement System
- Tracks accomplishments like "First Claim", "Grid Domination (100+ cells)", and unlocks badges.

### Spectator Mode
- Connects visitors as read-only streams. Spectators receive cells updates and leaderboards without occupying slots in active player counts.

### Heatmap Mode
- Toggle option highlighting active tiles or contested borders using thermal red/blue opacity gradients.

### Replay System
- Uses recorded client capture timestamps from the `Move` database table to reconstruct matches step-by-step.
