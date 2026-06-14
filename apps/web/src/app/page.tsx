'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Starfield from '../components/Starfield';
import Grid from '../components/Grid';
import WinnerModal from '../components/WinnerModal';
import PlayerCard from '../components/PlayerCard';
import Leaderboard from '../components/Leaderboard';
import { useGame } from '../hooks/useGame';
import { Sparkles, Globe, Wifi, WifiOff, Plus, UserPlus, Play, LogOut } from 'lucide-react';

const PRESET_COLORS = [
  '#00f0ff', // Neon Cyan
  '#ff007f', // Neon Pink
  '#ffaa00', // Amber Orange
  '#00ff66', // Emerald Green
  '#a855f7', // Purple Electric
  '#f43f5e', // Rose Red
];

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lobbyCodeFromUrl = searchParams.get('lobby');

  const {
    connected,
    lobbyCode,
    status,
    players,
    cells,
    leaderboard,
    onlineCount,
    winnerUsername,
    username,
    color,
    socketError,
    gameDuration,
    endTime,
    joinGame,
    claimCell,
    triggerPlayAgain,
    startMatch,
    setGameDuration,
    leaveLobby,
    hostUsername
  } = useGame(lobbyCodeFromUrl);

  // Welcome Screen Form States
  const [formUsername, setFormUsername] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formCode, setFormCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Floating text captures list
  const [floats, setFloats] = useState<{ id: number; x: number; y: number }[]>([]);

  // Time remaining countdown state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'ACTIVE' || !endTime) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [status, endTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto fill details if stored in localStorage
  useEffect(() => {
    const cachedUser = localStorage.getItem('grid_username');
    const cachedColor = localStorage.getItem('grid_color');
    if (cachedUser) setFormUsername(cachedUser);
    if (cachedColor) setFormColor(cachedColor);
    if (lobbyCodeFromUrl) setFormCode(lobbyCodeFromUrl.toUpperCase());
  }, [lobbyCodeFromUrl]);

  // Reset isLaunching when status changes away from LOBBY
  useEffect(() => {
    if (status !== 'LOBBY') {
      setIsLaunching(false);
    }
  }, [status]);

  // Sync lobby code to URL when joined
  useEffect(() => {
    if (lobbyCode) {
      router.replace(`/?lobby=${lobbyCode}`);
    }
  }, [lobbyCode, router]);

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      setFormError('Please enter a username');
      return;
    }

    setIsCreating(true);
    setFormError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/lobby/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.error) {
        setFormError(data.error);
        setIsCreating(false);
        return;
      }
      joinGame(data.code, formUsername.trim(), formColor);
    } catch (err) {
      setFormError('Server unreachable. Is the backend running?');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      setFormError('Please enter a username');
      return;
    }
    if (!formCode.trim()) {
      setFormError('Please enter a lobby code');
      return;
    }

    setFormError(null);
    joinGame(formCode.trim().toUpperCase(), formUsername.trim(), formColor);
  };

  // Click handler on cells wrapper to track mouse coordinates for "+1"
  const handleGridClaim = (index: number, e: React.MouseEvent) => {
    if (status !== 'ACTIVE' || cells[index]) return;

    // Trigger "+1" float effect at click coordinates
    const id = Date.now() + Math.random();
    const newFloat = { id, x: e.clientX, y: e.clientY };
    setFloats(prev => [...prev, newFloat]);
    
    // Self-destruct float after 900ms
    setTimeout(() => {
      setFloats(prev => prev.filter(f => f.id !== id));
    }, 900);

    claimCell(index);
  };

  return (
    <>
      <Starfield />

      {/* Floating Indicators Container */}
      {floats.map(f => (
        <div
          key={f.id}
          className="float-score"
          style={{ left: f.x, top: f.y, color: color || '#00f0ff' }}
        >
          +1
        </div>
      ))}

      {/* Step 1: Welcome Join Screen */}
      {!lobbyCode && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel-heavy p-8 rounded-2xl border border-slate-700/50 flex flex-col space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center space-x-1 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Multiplayer Grid Game</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">CosmoGrid</h1>
              <p className="text-slate-400 text-xs">Enter coordinates, claim cells, dominate the cosmos.</p>
            </div>

            {(formError || socketError) && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center">
                {formError || socketError}
              </div>
            )}

            <div className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Username</label>
                <input
                  type="text"
                  placeholder="e.g. AstroCoder"
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Color picker */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Claim Color</label>
                <div className="flex gap-3 justify-between">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{ backgroundColor: c, boxShadow: formColor === c ? `0 0 12px ${c}` : 'none' }}
                      className={`
                        w-9 h-9 rounded-full transition-all border-2 cursor-pointer
                        ${formColor === c ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}
                      `}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
              {/* Create Lobby Tab */}
              <form onSubmit={handleCreateLobby} className="w-full">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Lobby</span>
                </button>
              </form>

              {/* Join Lobby Form */}
              <form onSubmit={handleJoinLobby} className="w-full flex flex-col space-y-2">
                <input
                  type="text"
                  placeholder="Code e.g. A7K9P"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-center text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Join Lobby</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Main Game View */}
      {lobbyCode && (
        <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Header */}
          <header className="flex justify-between items-center w-full glass-panel px-6 py-4 rounded-2xl border border-slate-800/80">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => { leaveLobby(); }}
              title="Leave lobby and go back"
            >
              <Globe className="w-6 h-6 text-indigo-400" />
              <span className="text-lg font-black text-white tracking-tight">CosmoGrid</span>
              <LogOut className="w-4 h-4 text-slate-500 ml-1" />
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-1.5 bg-slate-900/60 border border-slate-800 px-3.5 py-1.5 rounded-full">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lobby:</span>
                <span className="text-xs font-black text-indigo-400 tracking-widest">{lobbyCode}</span>
              </div>

              {/* Connected Presence */}
              <div className="flex items-center space-x-1.5 bg-slate-900/60 border border-slate-800 px-3.5 py-1.5 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-300">{onlineCount} connected</span>
              </div>

              {/* Status Socket Connection indicator */}
              <div 
                className={`flex items-center px-3 py-1.5 rounded-full text-[10px] uppercase font-bold border ${
                  connected 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {connected ? <Wifi className="w-3.5 h-3.5 mr-1" /> : <WifiOff className="w-3.5 h-3.5 mr-1" />}
                <span>{connected ? 'Healthy' : 'Offline'}</span>
              </div>
            </div>
          </header>

          {/* Body content */}
          <main className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Sidebar Left */}
            <aside className="lg:col-span-1 space-y-6 flex flex-col">
              {username && color && (
                <PlayerCard username={username} color={color} />
              )}
              <Leaderboard entries={leaderboard} myUsername={username || ''} />
            </aside>

            {/* Grid Area Center */}
            <div className="lg:col-span-3 flex flex-col space-y-4">
              {status === 'LOBBY' && (
                <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 text-center space-y-4 flex flex-col items-center">
                  <h3 className="text-lg font-bold text-white">Lobby Setup Phase</h3>
                  <p className="text-xs text-slate-400 max-w-sm">Ready to begin? Choose game duration and start the match to compete for cells.</p>
                  
                  {/* Duration Selector — only host can change it */}
                  <div className="flex flex-col items-center space-y-2 py-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Match Duration
                      {hostUsername && username !== hostUsername && (
                        <span className="ml-2 text-amber-500/80">👑 {hostUsername} is choosing</span>
                      )}
                    </span>
                    <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {[
                        { label: '2 Min', value: 120 },
                        { label: '5 Min', value: 300 },
                        { label: '10 Min', value: 600 }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => username === hostUsername && setGameDuration(opt.value)}
                          disabled={username !== hostUsername}
                          title={username !== hostUsername ? `Only ${hostUsername} (winner) can change this` : ''}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            gameDuration === opt.value
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-slate-200'
                          } ${
                            username !== hostUsername
                              ? 'opacity-40 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {hostUsername && username === hostUsername && (
                      <span className="text-[10px] text-indigo-400/70">👑 You are the host — choose the duration</span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (isLaunching) return;
                      setIsLaunching(true);
                      startMatch();
                    }}
                    disabled={isLaunching}
                    className="py-3 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-600/20 scale-100 hover:scale-[1.03] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isLaunching ? 'Launching...' : 'Launch Game'}</span>
                  </button>
                </div>
              )}

              {/* Live coordinates tracker above grid */}
              {status === 'ACTIVE' && (
                <div className="flex justify-between items-center px-4 py-2 bg-slate-900/40 rounded-lg border border-slate-800/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>🚀 Objective: Claim as many tiles as possible</span>
                  {timeLeft !== null && (
                    <span className="text-indigo-400 text-xs font-black animate-pulse flex items-center gap-1">
                      ⏳ Remaining: {formatTime(timeLeft)}
                    </span>
                  )}
                  <span>Board: 30x30 (900 Cells)</span>
                </div>
              )}

              <div 
                onMouseDown={(e) => {
                  // Catch mouse clicks relative to coordinate captures
                }}
                className="w-full flex justify-center"
              >
                <Grid
                  cells={cells}
                  players={players}
                  onClaim={(index, e) => handleGridClaim(index, e)}
                  // Trigger direct capture coordinates since mouse event is attached on target
                  status={status}
                />
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Winner Overlay Modal */}
      {status === 'GAMEOVER' && lobbyCode && username && (
        <WinnerModal
          winnerUsername={winnerUsername}
          players={players}
          leaderboard={leaderboard}
          onPlayAgain={triggerPlayAgain}
          myUsername={username}
        />
      )}
    </>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-xs">
        Loading cosmic grid game...
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
