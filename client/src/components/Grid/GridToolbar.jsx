export default function GridToolbar({ gameMode, zoom, onSetMode, onZoomIn, onZoomOut, onResetZoom }) {
  return (
    <div className="grid-toolbar" id="grid-toolbar">
      <div className="toolbar-left">
        {['ffa', 'teams', 'zones'].map(mode => (
          <button
            key={mode}
            id={`mode-${mode}`}
            className={`mode-btn${gameMode === mode ? ' active' : ''}`}
            onClick={() => onSetMode(mode)}
          >
            {mode === 'ffa' ? '⚔️ FFA' : mode === 'teams' ? '👥 Teams' : '🎯 Zones'}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <div className="zoom-controls">
          <button className="zoom-btn" id="zoom-out" onClick={onZoomOut} title="Zoom out">−</button>
          <span className="zoom-level" id="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" id="zoom-in" onClick={onZoomIn} title="Zoom in">+</button>
          <button className="zoom-btn" id="zoom-reset" onClick={onResetZoom} title="Reset zoom" style={{ fontSize: 11 }}>⟳</button>
        </div>
      </div>
    </div>
  );
}
