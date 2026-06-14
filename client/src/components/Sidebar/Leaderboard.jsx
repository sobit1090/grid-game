export default function Leaderboard({ entries, myUserId }) {
  const getRankClass = (rank) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  };

  return (
    <div className="leaderboard-list" id="leaderboard-list">
      {entries.length === 0 && (
        <div style={{ padding: '16px', color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center' }}>
          No players yet...
        </div>
      )}
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={`lb-entry${entry.userId === myUserId ? ' is-me' : ''}`}
        >
          <span className={`lb-rank ${getRankClass(entry.rank)}`}>
            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
          </span>
          <div className="lb-dot" style={{ background: entry.color }} />
          <span className="lb-name">{entry.name}</span>
          <span className="lb-score">{entry.score}</span>
          <span className="lb-blocks">{entry.blocks}b</span>
        </div>
      ))}
    </div>
  );
}
