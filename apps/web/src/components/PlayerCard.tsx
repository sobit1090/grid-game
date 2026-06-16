'use client';

import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';

interface PlayerCardProps {
  username: string;
  color: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export default function PlayerCard({ username, color }: PlayerCardProps) {
  const [stats, setStats] = useState<{ wins: number; totalGames: number } | null>(null);

  useEffect(() => {
    // Fetch stats from REST API
    fetch(`${WS_URL}/api/profile/${username}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStats({ wins: data.wins, totalGames: data.totalGames });
        }
      })
      .catch((err) => console.error('Error fetching player card stats:', err));
  }, [username]);

  return (
    <div className="p-4 glass-panel rounded-xl border border-slate-800/80 space-y-3">
      <div className="flex items-center space-x-3">
        <div 
          className="p-2.5 rounded-lg flex items-center justify-center border"
          style={{ borderColor: `${color}40`, backgroundColor: `${color}12` }}
        >
          <User className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Session</p>
          <p className="font-bold text-white text-sm truncate max-w-[140px]">{username}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-800/60">
        <div className="text-center p-2 rounded bg-slate-950/40">
          <p className="text-sm font-black text-white">{stats ? stats.totalGames : '-'}</p>
          <p className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Matches</p>
        </div>
        <div className="text-center p-2 rounded bg-slate-950/40">
          <p className="text-sm font-black text-yellow-400">{stats ? stats.wins : '-'}</p>
          <p className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Wins</p>
        </div>
      </div>
    </div>
  );
}
