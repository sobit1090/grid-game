import { useState, useRef, useEffect } from 'react';

export default function JoinModal({ onJoin }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);

  const handleJoin = () => {
    const trimmed = name.trim() || 'Anonymous';
    onJoin(trimmed);
  };

  return (
    <div className="join-overlay">
      <div className="modal-box">
        <span className="modal-icon">🚀</span>
        <h1 className="modal-title">ANTIGRAVITY GRID</h1>
        <p className="modal-subtitle">
          Real-time territory war. Click blocks to claim them.<br />Fight for every cell.
        </p>
        <div className="modal-features">
          <div className="feat-item"><span>⚡</span> Live WebSocket</div>
          <div className="feat-item"><span>🗺️</span> 32×32 Grid</div>
          <div className="feat-item"><span>🏆</span> Leaderboard</div>
          <div className="feat-item"><span>💥</span> Powerups</div>
          <div className="feat-item"><span>👥</span> Team Mode</div>
          <div className="feat-item"><span>🎯</span> Zone Control</div>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="callsign-input">Your Callsign</label>
          <input
            id="callsign-input"
            ref={inputRef}
            className="input-field"
            type="text"
            maxLength={20}
            placeholder="Enter your name..."
            autoComplete="off"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        </div>
        <button className="join-btn" id="join-btn" onClick={handleJoin}>
          ⚡ ENTER THE GRID
        </button>
      </div>
    </div>
  );
}
