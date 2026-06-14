import { useCallback, useMemo } from 'react';
import Cell from './Cell';

const GRID_SIZE = 32;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

// Pre-compute zone lookup for all cells
function buildZoneLookup(zones) {
  const lookup = {};
  if (!zones) return lookup;
  if (zones.center?.cells) zones.center.cells.forEach(id => { lookup[id] = 'zone-center'; });
  if (zones.edges?.cells) zones.edges.cells.forEach(id => { if (!lookup[id]) lookup[id] = 'zone-edges'; });
  return lookup;
}

export default function GridCanvas({
  grid, myUserId, zones, gridPowerups, animatedCells, zoom,
  onClaim, onCellHover, onCellLeave,
}) {
  const zoneLookup = useMemo(() => buildZoneLookup(zones), [zones]);
  const powerupCells = useMemo(() => new Set(gridPowerups.map(p => p.cellId)), [gridPowerups]);

  const cells = useMemo(() => {
    const arr = new Array(TOTAL_CELLS);
    for (let i = 0; i < TOTAL_CELLS; i++) arr[i] = i;
    return arr;
  }, []);

  return (
    <div
      className="grid-container"
      id="grid-container"
      style={{ transform: `scale(${zoom})` }}
    >
      {cells.map(cellId => (
        <Cell
          key={cellId}
          cellId={cellId}
          cellData={grid[cellId] || null}
          myUserId={myUserId}
          hasPowerup={powerupCells.has(cellId)}
          zoneClass={zoneLookup[cellId] || ''}
          isAnimated={animatedCells.has(cellId)}
          onClaim={onClaim}
          onMouseEnter={onCellHover}
          onMouseLeave={onCellLeave}
        />
      ))}
    </div>
  );
}
