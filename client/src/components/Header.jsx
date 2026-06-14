export default function Header({ connected, playerCount, claimedCells, gameMode, timerEl, onToggleSound, soundOn }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="brand-icon">⚡</div>
        <div>
          <div className="brand-title">ANTIGRAVITY GRID</div>
          <div className="brand-subtitle">Territory War</div>
        </div>
      </div>

      <div className="header-center">
        <div className="stat-pill">
          <span className="icon">👥</span>
          <span className="val" id="h-players">{playerCount}</span>
          <span className="dim">online</span>
        </div>
        <div className="stat-pill">
          <span className="icon">🗺️</span>
          <span className="val" id="h-claimed">{claimedCells}</span>
          <span className="dim">/ 1024</span>
        </div>
        <div className="stat-pill">
          <span className="icon">🎮</span>
          <span className="val" id="h-mode">{gameMode.toUpperCase()}</span>
        </div>
        {/* Live round timer — shown during active round */}
        {timerEl}
        <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`} id="connection-badge">
          <div className="dot" />
          <span id="conn-text">{connected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-ghost" id="sound-btn" onClick={onToggleSound}>
          {soundOn ? '🔊' : '🔇'} Sound
        </button>
      </div>
    </header>
  );
}
