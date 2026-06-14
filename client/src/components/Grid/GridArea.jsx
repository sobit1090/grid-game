import { useState, useCallback, useRef } from 'react';
import GridToolbar from './GridToolbar';
import GridCanvas from './GridCanvas';
import CellTooltip from '../CellTooltip';

const GRID_SIZE = 32;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;

export default function GridArea({
  grid, myUserId, zones, gridPowerups, animatedCells, gameMode,
  onClaim, onSetMode,
}) {
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState(null);
  const viewportRef = useRef(null);

  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(1)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(1)));
  const resetZoom = () => setZoom(1);

  const handleCellHover = useCallback((cellId, cellData, hasPowerup, x, y) => {
    const row = Math.floor(cellId / GRID_SIZE);
    const col = cellId % GRID_SIZE;
    setTooltip({ cellId, cellData, hasPowerup, x, y, row, col });
  }, []);

  const handleCellLeave = useCallback(() => setTooltip(null), []);

  return (
    <div className="grid-area" id="grid-area">
      <GridToolbar
        gameMode={gameMode}
        zoom={zoom}
        onSetMode={onSetMode}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
      />

      <div className="grid-viewport" id="grid-viewport" ref={viewportRef}>
        <GridCanvas
          grid={grid}
          myUserId={myUserId}
          zones={zones}
          gridPowerups={gridPowerups}
          animatedCells={animatedCells}
          zoom={zoom}
          onClaim={onClaim}
          onCellHover={handleCellHover}
          onCellLeave={handleCellLeave}
        />
      </div>

      {tooltip && (
        <CellTooltip
          cellId={tooltip.cellId}
          cellData={tooltip.cellData}
          hasPowerup={tooltip.hasPowerup}
          x={tooltip.x}
          y={tooltip.y}
          row={tooltip.row}
          col={tooltip.col}
        />
      )}
    </div>
  );
}
