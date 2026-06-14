import { memo, useCallback } from 'react';

const Cell = memo(function Cell({
  cellId, cellData, myUserId, hasPowerup,
  zoneClass, isAnimated, onClaim, onMouseEnter, onMouseLeave,
}) {
  const isMine = cellData?.userId === myUserId;

  const handleClick = useCallback((e) => {
    onClaim(cellId, e.clientX, e.clientY);
  }, [cellId, onClaim]);

  const handleMouseEnter = useCallback((e) => {
    onMouseEnter(cellId, cellData, hasPowerup, e.clientX, e.clientY);
  }, [cellId, cellData, hasPowerup, onMouseEnter]);

  let className = 'cell';
  if (cellData) className += ' claimed';
  if (zoneClass) className += ` ${zoneClass}`;
  if (hasPowerup) className += ' has-powerup';
  if (isAnimated) className += ' just-claimed';
  if (isMine) className += ' my-claim';

  return (
    <div
      className={className}
      data-cell-id={cellId}
      style={cellData ? {
        background: cellData.color,
        '--owner-color': cellData.color,
      } : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {!cellData && <span className="cell-number">{cellId}</span>}
    </div>
  );
});

export default Cell;
