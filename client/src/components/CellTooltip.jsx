const GRID_SIZE = 32;

export default function CellTooltip({ cellId, cellData, hasPowerup, x, y, row, col }) {
  const zone = null; // simplified — zone info shown via cell class
  const score = cellData ? 1 : 0; // server-computed, simplified here

  return (
    <div
      className="cell-tooltip"
      id="cell-tooltip"
      style={{
        left: x + 14,
        top: y - 10,
        display: 'block',
      }}
    >
      <div className="tt-owner" style={cellData ? { color: cellData.color } : {}}>
        {cellData ? cellData.name : '⬜ Unclaimed'}
      </div>
      <div className="tt-zone">
        Cell [{row},{col}]{hasPowerup ? ' • ⚡ Powerup!' : ''}
      </div>
      {cellData && (
        <div className="tt-score">Owned by {cellData.team ? `Team ${cellData.team}` : cellData.name}</div>
      )}
    </div>
  );
}
