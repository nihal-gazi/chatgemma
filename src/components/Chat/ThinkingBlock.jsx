import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "../Icons/index.jsx";
import MarkdownRenderer from "./MarkdownRenderer.jsx";

export default function ThinkingBlock({ thought, isLive = false }) {
  const [expanded, setExpanded] = useState(isLive);

  useEffect(() => {
    if (isLive) {
      setExpanded(true);
    }
  }, [isLive]);

  if (!thought && !isLive) return null;

  return (
    <div className={`thinking-block-wrapper ${expanded ? "expanded" : ""}`}>
      <button
        className="thinking-toggle-btn"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="thinking-status">
          <Sparkles size={14} className={`thinking-sparkle ${isLive ? "pulsing" : ""}`} />
          <span>{isLive ? "Thinking..." : "Thought process"}</span>
        </div>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded && (
        <div className="thinking-content-area">
          {thought ? (
            <MarkdownRenderer content={thought} className="thinking-markdown-body" />
          ) : (
            <div className="thinking-live-hint">Generating reasoning steps...</div>
          )}
        </div>
      )}
    </div>
  );
}
