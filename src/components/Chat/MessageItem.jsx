import React, { useState, useRef, useEffect } from "react";
import { Pencil, Copy, Check, ChevronDown, ChevronUp } from "../Icons/index.jsx";
import ThinkingBlock from "./ThinkingBlock.jsx";
import ToolExecutionBlock from "./ToolExecutionBlock.jsx";
import MarkdownRenderer from "./MarkdownRenderer.jsx";
import MessageActions from "./MessageActions.jsx";
import { useChat } from "../../context/ChatContext.jsx";

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
      e.preventDefault();
      handleUpdate();
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

            {/* Expand / Collapse toggle for long prompt bubbles */}
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

  return (
    <div className="assistant-message-row">
      <div className="assistant-response-container">
        {/* Curated Thinking Block (shown only if show_thought was invoked) */}
        {message.thought && (
          <ThinkingBlock thought={message.thought} isLive={false} />
        )}

        {/* Expandable Tool Execution Pills */}
        {Array.isArray(message.toolExecutions) && message.toolExecutions.length > 0 && (
          <div className="message-tool-executions-list">
            {message.toolExecutions.map((exec, i) => (
              <ToolExecutionBlock key={i} execution={exec} />
            ))}
          </div>
        )}

        {/* Main Response Markdown */}
        {message.content && <MarkdownRenderer content={message.content} />}

        {/* Action Toolbar */}
        <MessageActions content={message.content} messageIndex={index} />
      </div>
    </div>
  );
}
