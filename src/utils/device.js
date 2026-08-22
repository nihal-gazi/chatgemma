/**
 * Device & Environment Detection Utilities for ChatGemma
 */

/**
 * Detects whether the current device is a mobile device or touch-screen environment.
 * Checks for touch points, mobile screen widths (<= 768px), and mobile User Agents.
 * @returns {boolean} True if running on mobile device or touch viewport
 */
export function isMobileDevice() {
  if (typeof window === "undefined") return false;

  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );
  const isNarrow = window.innerWidth <= 768;

  return (hasTouch && isNarrow) || isMobileUA;
}
