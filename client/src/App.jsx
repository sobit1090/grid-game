import { useState, useMemo } from 'react';
import useGameSocket from './hooks/useGameSocket';

import JoinModal from './components/JoinModal';
import Header from './components/Header';
import PlayerCard from './components/Sidebar/PlayerCard';
import Leaderboard from './components/Sidebar/Leaderboard';
import Minimap from './components/Sidebar/Minimap';
import GridArea from './components/Grid/GridArea';
import ChatSection from './components/Chat/ChatSection';
import PowerupPanel from './components/PowerupPanel';
import Toast from './components/Toast';
import StreakBanner from './components/StreakBanner';
import LobbyScreen from './components/LobbyScreen';
import WinnerScreen from './components/WinnerScreen';
import RoundTimer from './components/RoundTimer';

// Starfield background
function Starfield() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${Math.random() * 2 + 1}px`,
      height: `${Math.random() * 2 + 1}px`,
      '--dur': `${Math.random() * 4 + 2}s`,
      '--delay': `${Math.random() * 4}s`,
      '--op': `${Math.random() * 0.6 + 0.2}`,
    }));
  }, []);

  return (
    <div className="starfield" id="starfield">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left, top: s.top,
            width: s.width, height: s.height,
            '--dur': s['--dur'], '--delay': s['--delay'], '--op': s['--op'],
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [soundOn, setSoundOn] = useState(true);

  const {
    connected, joined, myUser, grid, leaderboard, teamStats, playerCount,
    activePowerups, gridPowerups, gameMode, zones, myStats, toasts,
    chatMessages, animatedCells, floatScores, streak,
    phase, roundRemaining, roundEndTime, roundWinner, finalLeaderboard,
    join, claimCell, sendChat, setMode, startRound, activatePowerup, resetToLobby,
  } = useGameSocket();

  const claimedCount = useMemo(() => Object.keys(grid).length, [grid]);

  // Float score elements
  const floatScoreEls = floatScores.map(fs => (
    <div
      key={fs.id}
      className="float-score"
      style={{ left: fs.x, top: fs.y, color: fs.color }}
    >
      {fs.points}
    </div>
  ));

  return (
    <>
      <Starfield />

      {/* Step 1: Enter name */}
      {!joined && <JoinModal onJoin={join} connected={connected} />}

      {/* Step 2: Lobby — choose round duration */}
      {joined && phase === 'lobby' && (
        <LobbyScreen playerCount={playerCount} onStart={startRound} />
      )}

      {/* Step 3: Game over — show winner */}
      {joined && phase === 'gameover' && (
        <WinnerScreen
          leaderboard={finalLeaderboard}
          winner={roundWinner}
          onRestart={resetToLobby}
        />
      )}

      <Toast toasts={toasts} />
      <StreakBanner streak={streak} />
      {floatScoreEls}

      <div className="app" id="app">
        <Header
          connected={connected}
          playerCount={playerCount}
          claimedCells={claimedCount}
          gameMode={gameMode}
          // Timer replaces the old Reset button in the header
          timerEl={phase === 'active' ? (
            <RoundTimer remaining={roundRemaining} endTime={roundEndTime} />
          ) : null}
          onToggleSound={() => setSoundOn(s => !s)}
          soundOn={soundOn}
        />

        <div className="main-body" id="main">
          {/* LEFT SIDEBAR */}
          <aside className="sidebar sidebar-left" id="sidebar-left">
            <PlayerCard myUser={myUser} myStats={myStats} />
            <div className="sidebar-section">
              <div className="sidebar-title">🏆 <span>Leaderboard</span></div>
            </div>
            <Leaderboard entries={leaderboard} myUserId={myUser?.userId} />
            <Minimap grid={grid} />
          </aside>

          {/* CENTER: Grid */}
          <GridArea
            grid={grid}
            myUserId={myUser?.userId}
            zones={zones}
            gridPowerups={gridPowerups}
            animatedCells={animatedCells}
            gameMode={gameMode}
            onClaim={claimCell}
            onSetMode={setMode}
          />

          {/* RIGHT SIDEBAR */}
          <aside className="sidebar sidebar-right" id="sidebar-right">
            {gameMode === 'teams' && (
              <div className="sidebar-section">
                <div className="sidebar-title">👥 <span>Teams</span></div>
                <div className="team-bar">
                  <div className="team-card red">
                    <span className="team-emoji">🔴</span>
                    <div className="team-score">{teamStats.red?.score || 0}</div>
                    <div className="team-label">Red Team</div>
                  </div>
                  <div className="team-card blue">
                    <span className="team-emoji">🔵</span>
                    <div className="team-score">{teamStats.blue?.score || 0}</div>
                    <div className="team-label">Blue Team</div>
                  </div>
                </div>
              </div>
            )}

            {gameMode === 'zones' && (
              <div className="sidebar-section">
                <div className="sidebar-title">🎯 <span>Zones</span></div>
                <div className="zone-legend">
                  <div className="zone-item">
                    <div className="zone-dot" style={{ background: '#ff6b35' }} />
                    <span className="zone-name">Center</span>
                    <span className="zone-mult">×2.0</span>
                  </div>
                  <div className="zone-item">
                    <div className="zone-dot" style={{ background: '#7b2fff' }} />
                    <span className="zone-name">Edges</span>
                    <span className="zone-mult">×1.5</span>
                  </div>
                  <div className="zone-item">
                    <div className="zone-dot" style={{ background: '#00d4ff' }} />
                    <span className="zone-name">Corners</span>
                    <span className="zone-mult">×1.2</span>
                  </div>
                </div>
              </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-title">⚡ <span>Powerups</span></div>
              <PowerupPanel powerups={activePowerups} onActivate={activatePowerup} />
            </div>

            <ChatSection messages={chatMessages} onSend={sendChat} />
          </aside>
        </div>
      </div>
    </>
  );
}
