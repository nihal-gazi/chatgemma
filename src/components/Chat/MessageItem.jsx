import React, { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  FileCode,
  ImageIcon,
  Eye,
  X,
} from "../Icons/index.jsx";
import ThinkingBlock from "./ThinkingBlock.jsx";
import ToolCallPill from "./ToolCallPill.jsx";
import MarkdownRenderer from "./MarkdownRenderer.jsx";
import MessageActions from "./MessageActions.jsx";
import { useChat } from "../../context/ChatContext.jsx";
import { isMobileDevice, copyToClipboard } from "../../utils/index.js";

export default function MessageItem({ message, index, isLastUserMessage, isGenerating }) {
  const isUser = message.role === "user";
  const { editMessageAndRegenerate } = useChat();

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);
  const [expandedFileId, setExpandedFileId] = useState(null);
  const editAreaRef = useRef(null);

  const isLong = message.content && (message.content.length > 140 || message.content.split("\n").length > 3);
  const hasFiles = Array.isArray(message.files) && message.files.length > 0;

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
      await copyToClipboard(message.content);
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
      <>
        {/* Lightbox Modal for Clicked Image */}
        {activeLightboxImg && (
          <div className="image-lightbox-modal" onClick={() => setActiveLightboxImg(null)}>
            <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setActiveLightboxImg(null)}
              >
                <X size={20} />
              </button>
              <img src={activeLightboxImg.dataUrl} alt={activeLightboxImg.name} className="lightbox-img" />
              <div className="lightbox-caption">{activeLightboxImg.name} ({activeLightboxImg.formattedSize})</div>
            </div>
          </div>
        )}

        <div className="user-message-row">
          <div className="user-message-wrapper">
            {/* Attached Multimodal Files & Images */}
            {hasFiles && (
              <div className="user-message-attachments">
                {message.files.map((file) => {
                  if (file.isImage) {
                    return (
                      <div key={file.id} className="message-attachment-image-card">
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="message-image-preview"
                          onClick={() => setActiveLightboxImg(file)}
                          title={`Click to view full image: ${file.name}`}
                        />
                        <span className="attachment-caption">{file.name}</span>
                      </div>
                    );
                  }

                  const isExpandedFile = expandedFileId === file.id;
                  const isPdf = file.extension === "pdf";
                  const isDocx = file.extension === "docx" || file.extension === "doc";
                  const isCode = !isPdf && !isDocx && file.language !== "text";

                  return (
                    <div key={file.id} className="message-attachment-doc-card">
                      <div className="doc-card-header">
                        <div className="doc-card-left">
                          {isCode ? <FileCode size={18} /> : <FileText size={18} />}
                          <div className="doc-card-info">
                            <div className="doc-card-title-row">
                              <span className="doc-card-name" title={file.name}>
                                {file.name}
                              </span>
                              {file.isLargeFile && (
                                <span className="doc-card-large-badge" title="Indexed for LLM grep and semantic search">
                                  Indexed
                                </span>
                              )}
                            </div>
                            <span className="doc-card-meta">
                              {file.formattedSize}
                              {file.pageCount ? ` • ${file.pageCount} page${file.pageCount > 1 ? "s" : ""}` : ""}
                              {file.linesCount && !file.pageCount ? ` • ${file.linesCount} lines` : ""}
                              {isCode && file.language ? ` • ${file.language}` : ""}
                            </span>
                          </div>
                        </div>

                        {file.textContent && (
                          <button
                            type="button"
                            className="doc-preview-toggle-btn"
                            onClick={() => setExpandedFileId(isExpandedFile ? null : file.id)}
                            title={isExpandedFile ? "Collapse preview" : "View preview"}
                          >
                            <Eye size={14} />
                            <span>{isExpandedFile ? "Hide" : "Preview"}</span>
                          </button>
                        )}
                      </div>

                      {isExpandedFile && file.textContent && (
                        <pre className="doc-card-snippet-view">
                          <code>
                            {file.textContent.slice(0, 2000)}
                            {file.textContent.length > 2000 ? "\n\n... (preview truncated, full content indexed for search)" : ""}
                          </code>
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {message.content && (
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
            )}

            <div className="user-bubble-actions">
              {message.content && (
                <button
                  className="user-bubble-action-btn"
                  onClick={handleCopy}
                  title={copied ? "Copied!" : "Copy message"}
                >
                  {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
                </button>
              )}

              {/* ONLY the last sent user message gets the inline Edit option */}
              {isLastUserMessage && !isGenerating && message.content && (
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
      </>
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
