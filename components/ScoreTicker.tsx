"use client";

import React from "react";

type ScoreTickerProps = {
  value: number;
  duration?: number;
};

export function ScoreTicker({ value, duration = 600 }: ScoreTickerProps) {
  const [display, setDisplay] = React.useState(value);
  const previous = React.useRef(value);

  React.useEffect(() => {
    const start = performance.now();
    const from = previous.current;
    const to = value;
    previous.current = value;

    if (from === to) {
      setDisplay(to);
      return;
    }

    let animationFrame = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const nextValue = Math.round(from + (to - from) * progress);
      setDisplay(nextValue);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{display}</span>;
}
