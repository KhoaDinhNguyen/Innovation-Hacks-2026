import { useCallback, useEffect, useRef, useState } from "react";
import type { SimSpeed } from "./types";

const TICK_INTERVAL_MS = 100;

type ClockState = {
  isRunning: boolean;
  speed: SimSpeed;
  elapsedMs: number;
};

type ClockActions = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: SimSpeed) => void;
  reset: () => void;
};

export function useSimulationClock(onTick: (deltaMs: number, totalMs: number) => void): ClockState & ClockActions {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeedState] = useState<SimSpeed>(1);
  const elapsedRef = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const delta = TICK_INTERVAL_MS * speedRef.current;
      elapsedRef.current += delta;
      setElapsedMs(elapsedRef.current);
      onTickRef.current(delta, elapsedRef.current);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  const play = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const toggle = useCallback(() => setIsRunning((r) => !r), []);
  const setSpeed = useCallback((s: SimSpeed) => setSpeedState(s), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    elapsedRef.current = 0;
    setElapsedMs(0);
  }, []);

  return { isRunning, speed, elapsedMs, play, pause, toggle, setSpeed, reset };
}
