'use client';

import React from 'react';
import { LeaderboardEntry } from '../shared';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  myUsername: string;
}

export default function Leaderboard({ entries, myUsername }: LeaderboardProps) {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex flex-col h-full space-y-3">
      <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">Lobby Standings</h3>
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[260px] pr-1">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">No players connected</div>
        ) : (
          entries.map((entry, idx) => {
            const isMe = entry.username === myUsername;
            return (
              <div 
                key={entry.username}
                className={`flex items-center justify-between p-2 rounded-lg transition-all border ${
                  isMe 
                    ? 'bg-slate-900 border-indigo-500/30' 
                    : 'bg-slate-950/40 border-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                    {entry.username} {isMe && <span className="text-[9px] text-indigo-400 font-semibold">(You)</span>}
                  </span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-xs font-black text-slate-100">{entry.cellsCount}</span>
                  <span className="text-[8px] font-semibold text-slate-500">{entry.percentage}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
