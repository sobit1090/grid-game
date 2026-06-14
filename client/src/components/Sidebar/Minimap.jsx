import { useEffect, useRef } from 'react';

const GRID_SIZE = 32;

export default function Minimap({ grid, onNavigate }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width / GRID_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = grid[i];
      if (cell) {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        ctx.fillStyle = cell.color;
        ctx.fillRect(col * size, row * size, size, size);
      }
    }
  }, [grid]);

  return (
    <div className="minimap-section" id="minimap-section">
      <div className="sidebar-title" style={{ marginBottom: 8 }}>🗺️ <span>Minimap</span></div>
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        id="minimap"
        width={268}
        height={268}
        onClick={onNavigate}
      />
    </div>
  );
}
