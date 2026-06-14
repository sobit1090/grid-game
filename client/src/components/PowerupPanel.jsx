import { useState, useEffect } from 'react';

function PowerupTimer({ activatedAt, duration }) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    if (!activatedAt) return;
    const interval = setInterval(() => {
      const left = Math.max(0, duration - (Date.now() - activatedAt));
      setRemaining(left);
      if (left === 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [activatedAt, duration]);

  if (!activatedAt) return <span className="powerup-timer">Ready</span>;
  if (remaining === 0) return <span className="powerup-timer" style={{ color: 'var(--text-dim)' }}>Expired</span>;
  return <span className="powerup-timer">{(remaining / 1000).toFixed(1)}s</span>;
}

export default function PowerupPanel({ powerups, onActivate }) {
  if (!powerups || powerups.length === 0) {
    return (
      <div style={{ padding: '0 4px', color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center' }}>
        No powerups yet.<br />Claim glowing cells!
      </div>
    );
  }

  return (
    <div>
      {powerups.map(pu => (
        <div
          key={pu.id}
          className="powerup-slot"
          id={`pu-${pu.id}`}
          onClick={() => pu.type.duration > 0 && onActivate(pu.id)}
          title={pu.type.duration > 0 ? 'Click to activate' : 'Auto-activates on next claim'}
        >
          <span className="powerup-icon">{pu.type.icon}</span>
          <div className="powerup-info">
            <div className="powerup-name">{pu.type.name}</div>
            <div className="powerup-desc">{pu.type.desc}</div>
          </div>
          {pu.type.duration > 0 && (
            <PowerupTimer activatedAt={pu.activatedAt} duration={pu.type.duration} />
          )}
          {pu.type.duration === 0 && (
            <span className="powerup-timer" style={{ color: 'var(--orange)' }}>Next</span>
          )}
        </div>
      ))}
    </div>
  );
}
