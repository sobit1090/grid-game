export default function StreakBanner({ streak }) {
  const visible = streak >= 3;
  return (
    <div className={`streak-banner${visible ? ' visible' : ''}`} id="streak-banner">
      🔥 <span id="streak-count">{streak}</span> CLAIM STREAK!
    </div>
  );
}
