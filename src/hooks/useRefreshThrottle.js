import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_SECONDS = 30;

/**
 * Tracks a per-component refresh lock without blocking the rest of the page.
 * The ref guard prevents two clicks in the same render tick from starting
 * duplicate refetches before React has painted the disabled state.
 */
export function useRefreshThrottle({ seconds = DEFAULT_SECONDS } = {}) {
  const [remaining, setRemaining] = useState(0);
  const remainingRef = useRef(0);
  const intervalRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const start = useCallback(() => {
    if (remainingRef.current > 0) return false;

    clearTimer();
    remainingRef.current = seconds;
    setRemaining(seconds);

    intervalRef.current = setInterval(() => {
      const next = Math.max(0, remainingRef.current - 1);
      remainingRef.current = next;
      setRemaining(next);

      if (next === 0) {
        clearTimer();
      }
    }, 1000);

    return true;
  }, [clearTimer, seconds]);

  const reset = useCallback(() => {
    clearTimer();
    remainingRef.current = 0;
    setRemaining(0);
  }, [clearTimer]);

  return {
    remaining,
    isLocked: remaining > 0,
    start,
    reset,
  };
}
