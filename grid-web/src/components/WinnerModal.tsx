'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Users, Star } from 'lucide-react';
import { LeaderboardEntry } from '../shared';

interface WinnerModalProps {
  winnerUsername: string | null;
  players: { username: string; color: string; isReady: boolean }[];
  leaderboard: LeaderboardEntry[];
  onPlayAgain: () => void;
  myUsername: string;
}

export default function WinnerModal({
  winnerUsername,
  players,
  leaderboard,
  onPlayAgain,
  myUsername
}: WinnerModalProps) {
  useEffect(() => {
    // Fire double confetti bursts
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const totalReady = players.filter(p => p.isReady).length;
  const isMeReady = players.find(p => p.username === myUsername)?.isReady || false;

  // Find winner metadata
  const winnerEntry = leaderboard.find(l => l.username === winnerUsername);
  const winnerColor = winnerEntry?.color || '#3b82f6';
  const winnerCells = winnerEntry?.cellsCount || 0;
  const winnerPercentage = winnerEntry?.percentage || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl glass-panel-heavy p-8 rounded-2xl border border-slate-700/50 flex flex-col items-center space-y-6 relative overflow-hidden my-8">
        
        {/* Glow behind trophy */}
        <div 
          className="absolute top-[-50px] w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-40"
          style={{ backgroundColor: winnerColor }}
        />

        <div className="relative p-4 rounded-full bg-slate-900 border border-yellow-500/30">
          <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-white">ROUND OVER</h2>
          <p className="text-slate-400 text-sm">All cells captured. Winner calculated successfully.</p>
        </div>

        {/* Winner Highlight Card */}
        {winnerUsername ? (
          <div 
            className="w-full p-6 rounded-xl text-center space-y-3 border transition-all"
            style={{ 
              borderColor: `${winnerColor}40`,
              background: `radial-gradient(circle at center, ${winnerColor}15 0%, rgba(15,15,35,0.4) 100%)`,
              boxShadow: `0 4px 20px ${winnerColor}15`
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm font-bold tracking-wider text-slate-400 uppercase">🏆 Match Winner</span>
            </div>
            <p 
              className="text-4xl font-extrabold tracking-tight"
              style={{ color: winnerColor }}
            >
              {winnerUsername}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/40 text-center">
              <div>
                <p className="text-2xl font-black text-white">{winnerCells}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cells Owned</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{winnerPercentage}%</p>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Win Ratio</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full p-6 rounded-xl text-center bg-slate-900/60 border border-slate-800">
            <p className="text-2xl font-black text-slate-400">It is a Tie! 🤝</p>
            <p className="text-xs text-slate-500 mt-1">No single player dominated the board.</p>
          </div>
        )}

        {/* Board Leaderboard Rankings */}
        <div className="w-full space-y-3">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center space-x-1">
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            <span>Final Standings</span>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div 
                key={entry.username}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800/50"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-slate-500">#{index + 1}</span>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-bold text-white">{entry.username}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-300">{entry.cellsCount}</span>
                  <span className="text-[10px] text-slate-500 ml-1">({entry.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Play Again Vote Section */}
        <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Play Again Ready State: <strong>{totalReady} / {players.length}</strong> players ready</span>
          </div>

          <button
            onClick={onPlayAgain}
            disabled={isMeReady}
            className={`
              w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all duration-300
              ${isMeReady 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02] cursor-pointer'
              }
            `}
          >
            <RefreshCw className={`w-5 h-5 ${isMeReady ? '' : 'animate-spin-hover'}`} />
            <span>{isMeReady ? 'Waiting for Others...' : 'Vote: Play Again'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
