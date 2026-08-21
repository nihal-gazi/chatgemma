import React, { useState, useRef, useEffect } from "react";
import { Pencil, Copy, Check, ChevronDown, ChevronUp } from "../Icons/index.jsx";
import ThinkingBlock from "./ThinkingBlock.jsx";
import ToolCallPill from "./ToolCallPill.jsx";
import MarkdownRenderer from "./MarkdownRenderer.jsx";
import MessageActions from "./MessageActions.jsx";
import { useChat } from "../../context/ChatContext.jsx";

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );
  const isNarrow = window.innerWidth <= 768;
  return (hasTouch && isNarrow) || isMobileUA;
};

export default function MessageItem({ message, index, isLastUserMessage, isGenerating }) {
  const isUser = message.role === "user";
  const { editMessageAndRegenerate } = useChat();

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const editAreaRef = useRef(null);

  const isLong = message.content && (message.content.length > 140 || message.content.split("\n").length > 3);

  useEffect(() => {
    setEditText(message.content);
  }, [message.content]);

  useEffect(() => {
    if (isEditing && editAreaRef.current) {
      editAreaRef.current.style.height = "auto";
      editAreaRef.current.style.height = `${Math.max(editAreaRef.current.scrollHeight, 44)}px`;
      editAreaRef.current.focus();
    }
  }, [isEditing, editText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy user message:", err);
    }
  };

  const handleUpdate = () => {
    if (!editText.trim() || isGenerating) return;
    setIsEditing(false);
    editMessageAndRegenerate(index, editText.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (!isMobileDevice()) {
        e.preventDefault();
        handleUpdate();
      }
      // On mobile, Enter creates newline
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(message.content);
    }
  };

  if (isUser) {
    if (isEditing) {
      return (
        <div className="user-message-row">
          <div className="user-message-wrapper inline-edit-wrapper">
            <div className="user-bubble-container inline-edit-container">
              <textarea
                ref={editAreaRef}
                className="inline-edit-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>
            <div className="inline-edit-actions">
              <button
                type="button"
                className="btn-inline-cancel"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(message.content);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-inline-update"
                onClick={handleUpdate}
                disabled={!editText.trim() || isGenerating}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="user-message-row">
        <div className="user-message-wrapper">
          <div className={`user-bubble-container ${isLong && !isExpanded ? "collapsed-prompt" : ""}`}>
            <div className="user-bubble-content">{message.content}</div>

            {/* Expand / Collapse toggle for long prompt bubbles (Image 3 & 4 style) */}
            {isLong && (
              <button
                type="button"
                className="user-bubble-expand-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse prompt" : "Expand prompt"}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
          <div className="user-bubble-actions">
            <button
              className="user-bubble-action-btn"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy message"}
            >
              {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
            </button>

            {/* ONLY the last sent user message gets the inline Edit option */}
            {isLastUserMessage && !isGenerating && (
              <button
                className="user-bubble-action-btn"
                onClick={() => {
                  setEditText(message.content);
                  setIsEditing(true);
                }}
                title="Edit message"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hasReasoningBlocks = message.reasoningBlocks && message.reasoningBlocks.length > 0;

  return (
    <div className="assistant-message-row">
      <div className="assistant-response-container">
        {/* 1. Chronological Reasoning Blocks (Native Thoughts & Tool Calls in Sequence) */}
        {hasReasoningBlocks ? (
          <div className="message-reasoning-blocks-flow">
            {message.reasoningBlocks.map((block, bIdx) => {
              if (block.type === "thought") {
                return (
                  <ThinkingBlock
                    key={block.id || bIdx}
                    thought={block.content}
                    isLive={false}
                  />
                );
              }
              if (block.type === "tool_call") {
                return (
                  <ToolCallPill key={block.id || bIdx} toolCall={block} />
                );
              }
              return null;
            })}
          </div>
        ) : (
          <>
            {/* Legacy Fallback: Tool Call Pills */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="message-tool-calls-group">
                {message.toolCalls.map((tc, tcIdx) => (
                  <ToolCallPill key={tc.id || tcIdx} toolCall={tc} />
                ))}
              </div>
            )}

            {/* Legacy Fallback: Collapsible Thinking Process */}
            {message.thought && (
              <ThinkingBlock thought={message.thought} isLive={false} />
            )}
          </>
        )}

        {/* Main Response Markdown */}
        {message.content && <MarkdownRenderer content={message.content} />}

        {/* Action Toolbar */}
        <MessageActions content={message.content} messageIndex={index} />
      </div>
    </div>
  );
}
