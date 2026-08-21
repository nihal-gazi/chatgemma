import React, { useState, useRef, useEffect } from "react";
import { Plus, ArrowUp, Square, Mic } from "../Icons/index.jsx";
import ModelSelector from "./ModelSelector.jsx";
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

export default function PromptInputBar() {
  const { sendMessage, isGenerating, stopGeneration } = useChat();
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  // Multi-line mode triggered when line breaks exist or text is long
  const isMultiLine = input.includes("\n") || input.length > 55;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        260
      )}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const text = input;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage(text);
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

  return (
    <div className="prompt-input-wrapper">
      <form
        className={`gemini-pill-input-form ${isMultiLine ? "multiline-mode" : ""}`}
        onSubmit={handleSubmit}
      >
        {/* Top Textarea Section */}
        <div className="input-textarea-row">
          {!isMultiLine && (
            <button
              type="button"
              className="input-tool-btn plus-btn tooltip-bottom"
              data-tooltip="Add tools & files"
              aria-label="Add tools & files"
            >
              <Plus size={20} />
            </button>
          )}

          <textarea
            ref={textareaRef}
            className="gemini-textarea"
            rows={1}
            placeholder="Ask Gemma"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
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
                  className={`input-submit-btn send-btn tooltip-bottom ${input.trim() ? "active" : ""}`}
                  disabled={!input.trim()}
                  data-tooltip="Submit"
                  aria-label="Send prompt"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Toolbar for Multi-line / Large Message mode (Image 2 style) */}
        {isMultiLine && (
          <div className="input-bottom-toolbar">
            <div className="toolbar-left">
              <button
                type="button"
                className="input-tool-btn plus-btn tooltip-bottom"
                data-tooltip="Add tools & files"
                aria-label="Add tools & files"
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
                  className={`input-submit-btn send-btn tooltip-bottom ${input.trim() ? "active" : ""}`}
                  disabled={!input.trim()}
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
