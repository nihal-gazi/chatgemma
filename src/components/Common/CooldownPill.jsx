import React from "react";
import { useCooldown } from "../../hooks/useCooldown.js";
import { Clock } from "../Icons/index.jsx";

/**
 * Modular Cooldown Timer Pill (Borderless)
 * Renders cleanly beside input bar controls whenever an active rate limit cooldown is in effect.
 */
export default function CooldownPill({ className = "" }) {
  const cooldownSeconds = useCooldown();

  if (cooldownSeconds <= 0) return null;

  return (
    <div
      className={`cooldown-timer-pill ${className}`}
      title={`API Rate Limit Cooldown: ${cooldownSeconds}s remaining`}
      aria-label={`API Cooldown: ${cooldownSeconds}s`}
    >
      <Clock size={13} className="cooldown-icon" />
      <span className="cooldown-text">{cooldownSeconds}s</span>
    </div>
  );
}
