import { useState, useEffect } from 'react';

export default function RoundTimer({ endTime, remaining: initialRemaining }) {
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    setRemaining(initialRemaining);
  }, [initialRemaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 30;
  const pct = endTime ? Math.max(0, (remaining / Math.ceil((endTime - Date.now() + remaining * 1000) / 1000)) * 100) : 100;

  return (
    <div className="round-timer" id="round-timer" style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 14px',
      borderRadius: 20,
      background: isUrgent ? 'rgba(255,77,109,0.15)' : 'rgba(0,212,255,0.08)',
      border: `1px solid ${isUrgent ? 'var(--red)' : 'var(--border)'}`,
      transition: 'all 0.3s',
      animation: isUrgent ? 'pulse-urgent 1s ease-in-out infinite' : 'none',
    }}>
      <span style={{ fontSize: 14 }}>{isUrgent ? '⏰' : '⏱️'}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 15, fontWeight: 700,
        color: isUrgent ? 'var(--red)' : 'var(--cyan)',
      }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
}
