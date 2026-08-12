import React, { useRef, useEffect } from "react";
import { Menu, SquarePen, MoreVertical } from "../Icons/index.jsx";
import ModelSelector from "../Input/ModelSelector.jsx";
import { useChat } from "../../context/ChatContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import EmptyState from "./EmptyState.jsx";
import MessageList from "./MessageList.jsx";
import PromptInputBar from "../Input/PromptInputBar.jsx";

export default function ChatArea({ onOpenMobileSidebar, onOpenSettings }) {
  const {
    activeSession,
    createNewSession,
    isGenerating,
    currentStreamingThought,
    currentStreamingAnswer,
    currentStreamingToolExecutions,
  } = useChat();

  const { user, displayName } = useAuth();

  const scrollRef = useRef(null);
  const hasMessages = activeSession && activeSession.messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [
    activeSession?.messages,
    currentStreamingThought,
    currentStreamingAnswer,
    currentStreamingToolExecutions,
    isGenerating,
  ]);

  return (
    <main className={`gemini-chat-area ${hasMessages || isGenerating ? "chat-started" : ""}`}>
      {/* Top Header Bar */}
      <header className="chat-top-header">
        <div className="header-left-group">
          <button
            className="mobile-sidebar-toggle"
            onClick={onOpenMobileSidebar}
            title="Open Menu"
          >
            <Menu size={22} />
          </button>

          {/* Model Selector in header for Mobile */}
          <div className="header-model-selector-wrapper">
            <ModelSelector />
          </div>
        </div>

        <div className="header-spacer" />

        <div className="header-right-actions">
          <button
            className="header-action-icon-btn"
            onClick={() => createNewSession()}
            title="New Chat"
          >
            <SquarePen size={20} />
          </button>

          {/* On mobile: If chat exists, show 3-dots menu button. Otherwise show user avatar */}
          {hasMessages ? (
            <button
              className="header-action-icon-btn mobile-more-btn"
              onClick={onOpenSettings}
              title="Options & Settings"
            >
              <MoreVertical size={20} />
            </button>
          ) : (
            <button
              className="mobile-profile-avatar-btn"
              onClick={onOpenSettings}
              title="Account & Settings"
            >
              <div className="mobile-header-avatar">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={displayName} className="user-avatar-img" />
                ) : (
                  <div className="user-avatar-fallback">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      {!hasMessages && !isGenerating ? (
        <EmptyState />
      ) : (
        <>
          <div className="chat-scroll-container" ref={scrollRef}>
            <div className="chat-content-constrained">
              <MessageList
                messages={activeSession.messages}
                isGenerating={isGenerating}
                streamingThought={currentStreamingThought}
                streamingAnswer={currentStreamingAnswer}
                streamingToolExecutions={currentStreamingToolExecutions}
              />
            </div>
          </div>
          <div className="chat-bottom-input-dock">
            <PromptInputBar />
          </div>
        </>
      )}
    </main>
  );
}
