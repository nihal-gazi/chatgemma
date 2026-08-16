import React from "react";

/**
 * ThinkingAnimation Component
 * 3-Dot geometric animation:
 * Horizontal line -> Form circle -> Rotate circle -> Move out along tangents -> Rebound back -> Reset to line.
 */
export default function ThinkingAnimation({ size = "default", className = "" }) {
  return (
    <div className={`thinking-animation-container ${size} ${className}`} aria-label="Thinking">
      <div className="thinking-anim-rotator">
        <span className="thinking-dot dot-1" />
        <span className="thinking-dot dot-2" />
        <span className="thinking-dot dot-3" />
      </div>
    </div>
  );
}
