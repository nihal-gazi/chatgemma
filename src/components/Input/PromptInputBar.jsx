import React, { useState, useRef, useEffect } from "react";
import { Plus, ArrowUp, Square, Mic, X, FileText, ImageIcon, FileCode } from "../Icons/index.jsx";
import ModelSelector from "./ModelSelector.jsx";
import { useChat } from "../../context/ChatContext.jsx";
import { isMobileDevice, processUploadedFile } from "../../utils/index.js";

export default function PromptInputBar() {
  const { sendMessage, isGenerating, stopGeneration, showToast } = useChat();
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Multi-line mode triggered when line breaks exist, text is long, or files are attached
  const isMultiLine = input.includes("\n") || input.length > 55 || attachedFiles.length > 0;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        260
      )}px`;
    }
  }, [input, attachedFiles]);

  const handleProcessFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessingFiles(true);
    const newFiles = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const processed = await processUploadedFile(file);
        newFiles.push(processed);
      } catch (err) {
        console.error("File upload error:", err);
        showToast(`Failed to upload ${file.name}: ${err.message}`, "error");
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      showToast(`Attached ${newFiles.length} file(s)`, "info");
    }
    setIsProcessingFiles(false);
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    await handleProcessFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = async (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData || !clipboardData.files || clipboardData.files.length === 0) return;

    const files = Array.from(clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      await handleProcessFiles(files);
    }
  };

  const removeAttachment = (id) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const hasText = input.trim().length > 0;
    const hasFiles = attachedFiles.length > 0;

    if ((!hasText && !hasFiles) || isGenerating || isProcessingFiles) return;

    const text = input;
    const filesToSend = [...attachedFiles];

    setInput("");
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage(text, filesToSend);
  };

  const handleKeyDown = (e) => {
    // Only send on Enter on desktop. On mobile devices, Enter permanently inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      if (!isMobileDevice()) {
        e.preventDefault();
        handleSubmit();
      }
      // On mobile, default behavior (newline insertion) is preserved
    }
  };

  const isSendActive = (input.trim().length > 0 || attachedFiles.length > 0) && !isProcessingFiles;

  return (
    <div className="prompt-input-wrapper">
      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        style={{ display: "none" }}
      />

      <form
        className={`gemini-pill-input-form ${isMultiLine ? "multiline-mode" : ""} ${
          isDraggingOver ? "dragging-over" : ""
        }`}
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attached Files Preview Tray */}
        {attachedFiles.length > 0 && (
          <div className="input-attachments-tray">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className={`attachment-pill ${file.isImage ? "image-pill" : "doc-pill"}`}
              >
                {file.isImage ? (
                  <img src={file.dataUrl} alt={file.name} className="attachment-pill-thumb" />
                ) : (
                  <div className="attachment-pill-icon">
                    {file.language !== "text" ? <FileCode size={16} /> : <FileText size={16} />}
                  </div>
                )}
                <div className="attachment-pill-info">
                  <span className="attachment-pill-name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="attachment-pill-size">{file.formattedSize}</span>
                </div>
                <button
                  type="button"
                  className="attachment-pill-remove"
                  onClick={() => removeAttachment(file.id)}
                  title="Remove attachment"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea Section */}
        <div className="input-textarea-row">
          {!isMultiLine && (
            <button
              type="button"
              className="input-tool-btn plus-btn tooltip-bottom"
              data-tooltip="Add tools & files"
              aria-label="Add tools & files"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <Plus size={20} />
            </button>
          )}

          <textarea
            ref={textareaRef}
            className="gemini-textarea"
            rows={1}
            placeholder={attachedFiles.length > 0 ? "Ask a question about attached files..." : "Ask Gemma"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />

          {!isMultiLine && (
            <div className="input-right-actions">
              <ModelSelector />

              <button
                type="button"
                className="input-tool-btn mic-btn tooltip-bottom"
                data-tooltip="Voice input"
                aria-label="Voice input"
              >
                <Mic size={18} />
              </button>

              {isGenerating ? (
                <button
                  type="button"
                  className="input-submit-btn stop-btn tooltip-bottom"
                  onClick={stopGeneration}
                  data-tooltip="Stop"
                  aria-label="Stop generation"
                >
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  className={`input-submit-btn send-btn tooltip-bottom ${isSendActive ? "active" : ""}`}
                  disabled={!isSendActive}
                  data-tooltip="Submit"
                  aria-label="Send prompt"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Toolbar for Multi-line / Attachments Mode */}
        {isMultiLine && (
          <div className="input-bottom-toolbar">
            <div className="toolbar-left">
              <button
                type="button"
                className="input-tool-btn plus-btn tooltip-bottom"
                data-tooltip="Add tools & files"
                aria-label="Add tools & files"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="toolbar-right">
              <ModelSelector />

              <button
                type="button"
                className="input-tool-btn mic-btn tooltip-bottom"
                data-tooltip="Voice input"
                aria-label="Voice input"
              >
                <Mic size={18} />
              </button>

              {isGenerating ? (
                <button
                  type="button"
                  className="input-submit-btn stop-btn tooltip-bottom"
                  onClick={stopGeneration}
                  data-tooltip="Stop"
                  aria-label="Stop generation"
                >
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  className={`input-submit-btn send-btn tooltip-bottom ${isSendActive ? "active" : ""}`}
                  disabled={!isSendActive}
                  data-tooltip="Submit"
                  aria-label="Send prompt"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </form>

      <div className="input-disclaimer-footer">
        Gemma is AI and can make mistakes.
      </div>
    </div>
  );
}
