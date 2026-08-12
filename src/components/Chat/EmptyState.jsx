import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import PromptInputBar from "../Input/PromptInputBar.jsx";

export default function EmptyState() {
  const { displayName } = useAuth();

  const greeting = displayName && displayName !== "User"
    ? `Let's jump in, ${displayName}`
    : `Let's jump in`;

  return (
    <div className="empty-state-viewport">
      <div className="ambient-radial-glow" />

      <div className="empty-state-center-box">
        <h1 className="empty-state-greeting">{greeting}</h1>
        <PromptInputBar />
      </div>
    </div>
  );
}
