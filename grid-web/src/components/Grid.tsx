'use client';

import React, { useRef, useEffect, useState } from 'react';
import { SharedCell } from '../shared';

interface CellProps {
  index: number;
  ownerId: string | null;
  color: string | null;
  onClick: (index: number, event: React.MouseEvent) => void;
}

// Memoized individual cell to prevent full-grid rerenders
const Cell = React.memo(({ index, ownerId, color, onClick }: CellProps) => {
  const [isNew, setIsNew] = useState(false);
  const prevOwner = useRef<string | null>(ownerId);

  useEffect(() => {
    if (ownerId && ownerId !== prevOwner.current) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 300);
      prevOwner.current = ownerId;
      return () => clearTimeout(timer);
    }
    prevOwner.current = ownerId;
  }, [ownerId]);

  const x = Math.floor(index / 30);
  const y = index % 30;

  return (
    <button
      onClick={(e) => onClick(index, e)}
      style={{
        backgroundColor: color || 'rgba(255, 255, 255, 0.05)',
        boxShadow: color ? `0 0 10px ${color}80` : 'none',
        // Define pulse CSS variable if captured
        ['--pulse-color' as any]: color || 'transparent'
      }}
      className={`
        aspect-square w-full rounded-[2px] transition-all duration-300 ease-out border-[0.5px] border-slate-900/30
        focus:outline-none focus:ring-1 focus:ring-slate-500
        ${ownerId ? 'opacity-100 hover:brightness-110 cursor-default' : 'hover:bg-slate-700/40 hover:shadow-[0_0_8px_rgba(255,255,255,0.15)] cursor-crosshair'}
        ${isNew ? 'cell-capture-anim' : ''}
      `}
      title={ownerId ? `Owned by ${ownerId} (${x}, ${y})` : `Unclaimed (${x}, ${y})`}
    />
  );
});

Cell.displayName = 'Cell';

interface GridProps {
  cells: { [key: number]: string }; // Index -> Owner username
  players: { username: string; color: string }[];
  onClaim: (index: number, event: React.MouseEvent) => void;
  status: string;
}

export default function Grid({ cells, players, onClaim, status }: GridProps) {
  // Resolve colors for index owners
  const playerColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    players.forEach(p => map.set(p.username, p.color));
    return map;
  }, [players]);

  const handleCellClick = (index: number, e: React.MouseEvent) => {
    if (status !== 'ACTIVE') return;
    
    // Check if cell is already claimed
    if (cells[index]) return;

    // Send click to parent with mouse position for floating score effect
    onClaim(index, e);
  };

  const cellsList = React.useMemo(() => {
    const elements = [];
    for (let i = 0; i < 900; i++) {
      const ownerId = cells[i] || null;
      const color = ownerId ? playerColorMap.get(ownerId) || '#3b82f6' : null;
      
      elements.push(
        <Cell
          key={i}
          index={i}
          ownerId={ownerId}
          color={color}
          onClick={handleCellClick}
        />
      );
    }
    return elements;
  }, [cells, playerColorMap, status]);

  return (
    <div className="w-full max-w-[min(82vh,82vw)] aspect-square mx-auto p-2 glass-panel rounded-xl flex items-center justify-center relative overflow-hidden">
      {status !== 'ACTIVE' && (
        <div className="absolute inset-0 bg-slate-950/70 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
          {status === 'LOBBY' ? (
            <div className="animate-pulse space-y-2">
              <p className="text-xl font-bold text-slate-300">Lobby Phase</p>
              <p className="text-sm text-slate-400">Waiting for host to launch match...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xl font-bold text-red-500">Game Locked</p>
              <p className="text-sm text-slate-400">Round has ended. Check the results dashboard!</p>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px] w-full h-full">
        {cellsList}
      </div>
    </div>
  );
}
