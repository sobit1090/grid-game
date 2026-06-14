import { useState } from 'react';

const DURATIONS = [
  { label: '2 min', value: 120, desc: 'Quick battle' },
  { label: '5 min', value: 300, desc: 'Standard round' },
  { label: '10 min', value: 600, desc: 'Epic war' },
];

export default function LobbyScreen({ playerCount, onStart }) {
  const [selected, setSelected] = useState(300);

  return (
    <div className="lobby-overlay" id="lobby-overlay">
      <div className="lobby-box">
        <span className="modal-icon">🎮</span>
        <h2 className="modal-title">READY TO BATTLE?</h2>
        <p className="modal-subtitle">
          {playerCount} player{playerCount !== 1 ? 's' : ''} in lobby.<br />
          Choose a round duration and start when ready!
        </p>

        <div className="lobby-duration-title">Round Duration</div>
        <div className="lobby-durations">
          {DURATIONS.map(d => (
            <div
              key={d.value}
              className={`duration-card${selected === d.value ? ' selected' : ''}`}
              onClick={() => setSelected(d.value)}
            >
              <div className="duration-label">{d.label}</div>
              <div className="duration-desc">{d.desc}</div>
            </div>
          ))}
        </div>

        <button className="join-btn" id="start-round-btn" onClick={() => onStart(selected)}>
          ⚡ START ROUND
        </button>

        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
          All players will start simultaneously
        </p>
      </div>
    </div>
  );
}
