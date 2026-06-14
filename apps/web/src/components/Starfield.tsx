'use client';

import React, { useMemo } from 'react';

export default function Starfield() {
  const stars = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${Math.random() * 2 + 1}px`,
      height: `${Math.random() * 2 + 1}px`,
      dur: `${Math.random() * 4 + 2}s`,
      delay: `${Math.random() * 4}s`,
      op: Math.random() * 0.6 + 0.2,
    }));
  }, []);

  return (
    <div className="starfield">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            width: s.width,
            height: s.height,
            opacity: s.op,
            // Pass values as custom styles matching globals.css definitions
            animationDuration: s.dur,
            animationDelay: s.delay,
          }}
        />
      ))}
      {/* Nebula ambient glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] rounded-full bg-purple-600/8 blur-[120px] pointer-events-none" />
    </div>
  );
}
