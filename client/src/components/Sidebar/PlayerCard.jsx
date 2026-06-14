export default function PlayerCard({ myUser, myStats }) {
  if (!myUser) return null;

  const initial = (myUser.name || '?')[0].toUpperCase();
  const teamClass = myUser.team === 'blue' ? 'blue' : '';

  return (
    <div className="player-card">
      <div
        className="player-avatar"
        id="player-avatar"
        style={{
          background: myUser.color,
          boxShadow: `0 0 20px ${myUser.color}`,
          '--player-color': myUser.color,
        }}
      >
        {initial}
      </div>

      <div className="player-name-row">
        <span className="player-name" id="player-name">{myUser.name}</span>
        {myUser.team && (
          <span className={`team-badge ${teamClass}`} id="team-badge">
            {myUser.team.toUpperCase()}
          </span>
        )}
      </div>

      <div className="player-stats-grid">
        <div className="pstat">
          <span className="pstat-val" id="my-score">{myStats.score}</span>
          <div className="pstat-lbl">Score</div>
        </div>
        <div className="pstat">
          <span className="pstat-val" id="my-blocks">{myStats.blocks}</span>
          <div className="pstat-lbl">Blocks</div>
        </div>
        <div className="pstat">
          <span className="pstat-val" id="my-streak">{myStats.streak}</span>
          <div className="pstat-lbl">Streak</div>
        </div>
        <div className="pstat">
          <span className="pstat-val" id="my-claims">{myStats.claims}</span>
          <div className="pstat-lbl">Claims</div>
        </div>
      </div>
    </div>
  );
}
