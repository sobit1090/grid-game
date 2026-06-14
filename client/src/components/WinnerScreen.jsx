export default function WinnerScreen({ leaderboard, winner, onRestart }) {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="winner-overlay" id="winner-overlay">
      <div className="winner-box">
        <span className="modal-icon">🏆</span>
        <h2 className="modal-title">ROUND OVER!</h2>

        {winner && (
          <div className="winner-announcement">
            <div
              className="winner-avatar"
              style={{ background: winner.color, boxShadow: `0 0 30px ${winner.color}` }}
            >
              {winner.name[0].toUpperCase()}
            </div>
            <div className="winner-name" style={{ color: winner.color }}>{winner.name}</div>
            <div className="winner-score">{winner.score} pts • {winner.blocks} blocks</div>
          </div>
        )}

        <div className="winner-leaderboard">
          {leaderboard.slice(0, 5).map((entry, i) => (
            <div key={entry.userId} className={`winner-lb-row${i === 0 ? ' top' : ''}`}>
              <span className="winner-rank">{medals[i] || `#${i + 1}`}</span>
              <div className="winner-lb-dot" style={{ background: entry.color }} />
              <span className="winner-lb-name">{entry.name}</span>
              <span className="winner-lb-score" style={{ color: entry.color }}>{entry.score}</span>
              <span className="winner-lb-blocks">{entry.blocks}b</span>
            </div>
          ))}
        </div>

        <button className="join-btn" id="restart-btn" onClick={onRestart}
          style={{ marginTop: 8 }}>
          🔄 PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
