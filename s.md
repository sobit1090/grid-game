# Alternative Prompts for Antigravity IDE

## Variation 1: Concise Executive Brief

```
Build a real-time multiplayer grid game where users claim blocks.
- 32×32 grid, players click to claim
- WebSocket for instant sync across all players
- Dark space theme with cyan accents
- Features: leaderboard, powerups, achievements, team mode, zone control
- Tech: Frontend (HTML/CSS/JS + Socket.io CDN), Backend (Node + Socket.io)
- Fully functional, production-ready code
```

---

## Variation 2: Technical Specification

```
PROJECT: Antigravity Grid - Real-Time Multiplayer Claiming Game

REQUIREMENTS:

Frontend:
- Language: HTML5 + CSS3 + Vanilla JavaScript
- Real-time: Socket.io client (loaded from CDN)
- Grid: CSS Grid layout, 32×32 = 1,024 cells
- Styling: Dark space theme (blue gradients, cyan accents), glassmorphism
- Animations: Smooth transitions, pulse effects, glow on hover, particle effects
- Responsive: Works on desktop and mobile
- State: Tracks user, grid, stats, powerups, achievements
- UI Components: Player card, leaderboard, grid, powerup display, achievement tracker

Backend:
- Runtime: Node.js
- Framework: Express.js
- Real-time: Socket.io with WebSocket
- Architecture: Stateless, in-memory game state
- Port: 3001 (configurable)
- Endpoints: HTTP status check, WebSocket server
- Validation: Server-side only, source of truth
- Scaling: Designed for 100+ concurrent players

Game Logic:
- Grid: 1,024 cells, each has optional owner
- Claiming: Click block → send event → server validates → broadcast to all
- Cooldown: 300ms per cell (prevent spam)
- Scoring: Base 1 point, zone multiplier (center 2x, edge 1.5x)
- Conflicts: Server prevents multiple claims on same block
- Sessions: Track users, auto-cleanup on disconnect

Features:
- Leaderboard: Top 10 players, sorted by score
- Stats: Blocks owned, current score, claim streak
- Powerups: Speed Boost, Shield, Mega Claim, Vision
- Modes: Free For All, Team (red/blue), Zone Wars
- Achievements: 10+ badges for milestones
- Sound: Optional audio feedback (WebAudio API)
- Keyboard: Space = powerup, S = sound toggle

DELIVERABLES:
1. index.html (complete frontend, self-contained)
2. server.js (Node backend with full game logic)
3. package.json (dependencies)

CODE QUALITY:
- Production-ready
- Clean, readable, commented
- Error handling
- No external dependencies beyond Socket.io/Express
- Security considered (input validation)
```

---

## Variation 3: Feature-Focused Prompt

```
I need a multiplayer game where:

PRIMARY FEATURES:
✓ Real-time grid-based territory claiming
✓ Multi-player instant synchronization via WebSocket
✓ Live leaderboard with top 10 players
✓ Score-based ranking system

GAME MECHANICS:
✓ 32×32 grid of claimable blocks
✓ Click to claim a block
✓ Blocks show owner's color
✓ Cooldown prevents spam (300ms per cell)
✓ Higher point value in center zones (2x multiplier)
✓ Visible claim streak counter
✓ Real-time stat updates

VISUAL DESIGN:
✓ Dark space theme (dark blue background, cyan highlights)
✓ Starfield background animation
✓ Glassmorphism UI (frosted glass effect)
✓ Smooth animations (glow on hover, pulse on claim)
✓ Mobile responsive grid
✓ Clear connection status indicator

EXTRA FEATURES:
✓ Powerup system (random awards, activatable bonuses)
✓ Team mode for competitive play
✓ Zone control gameplay variant
✓ Achievement badges
✓ Optional sound effects
✓ Keyboard shortcuts

TECHNICAL:
✓ Frontend: No build step, vanilla HTML/CSS/JS
✓ Backend: Node.js + Socket.io
✓ Real-time: WebSocket with fallback
✓ Scaling: 100+ concurrent players supported
```

---

## Variation 4: Detailed Architecture Specification

```
ARCHITECTURE SPECIFICATION: Antigravity Grid Game

SYSTEM DESIGN:

Frontend Architecture:
┌─────────────────────────────┐
│   Browser Client (HTML/JS)  │
├─────────────────────────────┤
│ Socket.io Client (CDN)      │
│   ↑ Real-time events ↓      │
├─────────────────────────────┤
│ Game State Management       │
│ - Grid (cell → owner)       │
│ - Stats (leaderboard)       │
│ - UI Updates                │
├─────────────────────────────┤
│ Rendering Engine            │
│ - Grid: CSS Grid layout     │
│ - Cards: Glassmorphism      │
│ - Animations: CSS/JS        │
└─────────────────────────────┘

Backend Architecture:
┌─────────────────────────────┐
│   Node.js Server            │
│   (Express + Socket.io)     │
├─────────────────────────────┤
│ Game State (in-memory)      │
│ - Grid: cellId → owner      │
│ - Users: userId → stats     │
│ - Zones: definition         │
├─────────────────────────────┤
│ Business Logic              │
│ - Claim validation          │
│ - Cooldown tracking         │
│ - Score calculation         │
│ - Leaderboard updates       │
├─────────────────────────────┤
│ Socket.io Server            │
│ - WebSocket listener        │
│ - Broadcast events          │
│ - Session management        │
└─────────────────────────────┘

Communication Flow:
Client Click
    ↓
JavaScript Event Handler
    ↓
Emit 'claim_cell' via Socket.io
    ↓
Server Receives Event
    ↓
Validate (cooldown, ownership, permissions)
    ↓
Update In-Memory State
    ↓
Broadcast 'cell_claimed' to ALL clients
    ↓
Broadcast 'stats_update' to ALL clients
    ↓
All Clients Update UI Simultaneously (~50ms)

Game State (Server):
grid: {
  0: { userId, color, name, timestamp },
  1: { userId, color, name, timestamp },
  // ... up to 1023
}

users: {
  "user123": { name, color, blocks, score, team, socketId },
  // ... all connected players
}

claims: {
  0: 1718491234567,  // timestamp of last claim
  // ... one per cell
}

zones: {
  "center": { name: "Center", value: 2, owner: "user123" },
  "edges": { name: "Edges", value: 1, owner: "user456" }
}

Database: NONE (in-memory for demo, can add later)

Event Flow:
1. Client connects → Server sends grid_state + stats_update
2. Client clicks cell → Emits claim_cell
3. Server validates:
   - cellId range check
   - cooldown check (300ms)
   - userId verification
4. Server updates state:
   - Decrement previous owner
   - Increment new owner
   - Record claim timestamp
5. Server broadcasts:
   - cell_claimed event
   - stats_update event
6. All clients receive:
   - Update grid UI
   - Update leaderboard
   - Update player stats

Error Handling:
- Invalid cellId: Silently ignore
- Claim too fast: Silently ignore (cooldown)
- userId mismatch: Log warning, reject
- Socket disconnect: Cleanup user, remove claims
- Invalid powerup: Silently ignore

PERFORMANCE TARGETS:
- Claim latency: < 100ms
- UI update: < 50ms
- Concurrent players: 100+ supported
- Memory per player: ~5KB
- Memory per claimed block: ~50 bytes
- Base server memory: ~50MB
```

---

## Variation 5: Minimal Prompt (Ultra-Concise)

```
Build a real-time multiplayer grid game:
- 32×32 grid, click blocks to claim
- All players see updates instantly (WebSocket)
- Dark space theme, cyan accents, smooth animations
- Player leaderboard, stats, powerups, achievements
- Backend: Node + Socket.io, Frontend: HTML/CSS/JS
- Production-ready code, no frameworks
```

---

## Variation 6: User Story Format

```
As a developer, I want to build a real-time multiplayer game so that:

USER STORIES:

"As a player, I want to click blocks to claim them so that I can compete 
with other players for territory."

"As a player, I want to see other players' moves instantly so that the 
game feels live and responsive."

"As a player, I want to see a leaderboard so that I know how I'm ranking."

"As a player, I want to earn powerups so that I have special abilities."

"As a player, I want to play in team mode so that I can cooperate with 
teammates."

"As a player, I want the UI to be visually stunning so that the game is 
enjoyable to look at."

"As a developer, I want clean, well-documented code so that I can 
understand and extend it easily."

"As an operator, I want the server to handle 100+ concurrent players so 
that it scales."

ACCEPTANCE CRITERIA:
- Grid loads and renders correctly
- Clicking a block claims it (own color)
- Updates appear in other connected browsers instantly (< 100ms)
- Leaderboard updates in real-time
- Powerups award and function correctly
- Team mode divides players into teams
- No console errors
- Responsive on mobile
- Code is commented and organized
```

---

## Variation 7: Rubric-Based Prompt

```
Build a game scoring on these rubrics:

CODE QUALITY (25%):
- Clean, readable code
- Well-commented logic
- Error handling
- No security issues
- Follows conventions

FUNCTIONALITY (35%):
- Grid rendering works
- Real-time sync works (< 100ms)
- Leaderboard accurate
- Powerups functional
- All modes work

DESIGN/UX (25%):
- Visual theme compelling
- Animations smooth
- Responsive design
- Intuitive controls
- Status indicators clear

ARCHITECTURE (15%):
- Scalable design
- Server handles 100+ players
- State management clean
- Event-based communication
- Extensible for features

DELIVERABLES:
- Working frontend (HTML)
- Working backend (Node.js)
- Configuration file (package.json)
- Production-ready (works immediately)
```

---

## How to Use These Prompts in Antigravity IDE

1. **Select the prompt variation** that best matches your needs:
   - Variation 1: If you want it quick and simple
   - Variation 2: If you want detailed technical specs
   - Variation 3: If you want feature-focused
   - Variation 4: If you want deep architecture details
   - Variation 5: If you want ultra-concise
   - Variation 6: If you like user stories
   - Variation 7: If you want rubric-based evaluation

2. **Copy the prompt text**

3. **Paste into Antigravity IDE input**

4. **Run generation**

5. **Review output** - should produce:
   - `index.html` (frontend)
   - `server.js` (backend)
   - `package.json` (dependencies)

6. **Run locally:**
   ```bash
   npm install
   npm start
   # Open index.html
   ```

---

**Pro Tip:** Variations 1-3 are best for complete code generation. Variations 4-7 are better if you want explanations or detailed specifications before generation.