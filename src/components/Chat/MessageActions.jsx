import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, RotateCcw, MoreHorizontal, Check } from "../Icons/index.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function MessageActions({ content, messageIndex }) {
  const { editMessageAndRegenerate, activeSession } = useChat();
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    // Find the closest preceding user message
    if (!activeSession || messageIndex <= 0) return;
    const userMsgIndex = messageIndex - 1;
    const userMsg = activeSession.messages[userMsgIndex];
    if (userMsg && userMsg.role === "user") {
      editMessageAndRegenerate(userMsgIndex, userMsg.content);
    }
  };

  return (
    <div className="message-actions-bar">
      <button
        className={`action-btn ${liked === "up" ? "active" : ""}`}
        onClick={() => setLiked(liked === "up" ? null : "up")}
        title="Good response"
      >
        <ThumbsUp size={15} />
      </button>

      <button
        className={`action-btn ${liked === "down" ? "active" : ""}`}
        onClick={() => setLiked(liked === "down" ? null : "down")}
        title="Bad response"
      >
        <ThumbsDown size={15} />
      </button>

      <button className="action-btn" onClick={handleCopy} title="Copy response">
        {copied ? <Check size={15} className="copied-icon" /> : <Copy size={15} />}
      </button>

      <button className="action-btn" onClick={handleRetry} title="Regenerate response">
        <RotateCcw size={15} />
      </button>

      <button className="action-btn" title="More options">
        <MoreHorizontal size={15} />
      </button>
    </div>
  );
}
