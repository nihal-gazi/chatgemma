import { useState, useEffect } from "react";
import { apiRateLimiter } from "../services/api.js";

/**
 * Custom React hook that returns the active API cooldown seconds remaining.
 * Automatically counts down to 0 and updates on rate limiter events.
 *
 * @returns {number} Seconds remaining on rate limit cooldown (0 if not in cooldown)
 */
export function useCooldown() {
  const [cooldownSeconds, setCooldownSeconds] = useState(() => {
    return Math.max(0, Math.ceil((apiRateLimiter.cooldownUntil - Date.now()) / 1000));
  });

  useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = Math.max(0, apiRateLimiter.cooldownUntil - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setCooldownSeconds(remainingSec);
    };

    updateCountdown();

    // Subscribe to rate limiter cooldown triggers
    const unsubscribe = apiRateLimiter.subscribe(() => {
      updateCountdown();
    });

    // Check every 500ms while active
    const timer = setInterval(updateCountdown, 500);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  return cooldownSeconds;
}
