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
    generatingSessionId,
    currentStreamingThought,
    currentStreamingAnswer,
    currentStreamingToolCalls,
    currentStreamingReasoningBlocks,
  } = useChat();

  const { user, displayName } = useAuth();

  const scrollRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const prevMessagesCountRef = useRef(activeSession?.messages?.length || 0);
  const prevSessionIdRef = useRef(activeSession?.id);

  const isCurrentSessionGenerating = Boolean(
    activeSession && generatingSessionId === activeSession.id
  );
  const isGeneratingRef = useRef(isCurrentSessionGenerating);

  const hasMessages = Boolean(activeSession && activeSession.messages.length > 0);

  // Track if user intentionally scrolled up
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 90;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // 1. Detect if the user switched to a different session
    const isSessionSwitched = prevSessionIdRef.current !== activeSession?.id;
    prevSessionIdRef.current = activeSession?.id;

    if (isSessionSwitched) {
      userScrolledUpRef.current = false;
      prevMessagesCountRef.current = activeSession?.messages?.length || 0;
      isGeneratingRef.current = isCurrentSessionGenerating;
      el.scrollTop = el.scrollHeight;
      return;
    }

    const currentMsgCount = activeSession?.messages?.length || 0;
    const prevMsgCount = prevMessagesCountRef.current;
    prevMessagesCountRef.current = currentMsgCount;

    const wasGenerating = isGeneratingRef.current;
    isGeneratingRef.current = isCurrentSessionGenerating;

    // 2. If generation just finished, DO NOT scroll down - keep user position!
    if (wasGenerating && !isCurrentSessionGenerating) {
      return;
    }

    // 3. If user sent a new prompt, scroll to bottom
    const lastMsg = activeSession?.messages?.[activeSession.messages.length - 1];
    const isNewUserPrompt = currentMsgCount > prevMsgCount && lastMsg?.role === "user";

    if (isNewUserPrompt) {
      userScrolledUpRef.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }

    // 4. During live streaming generation, only follow along if user has not scrolled up
    if (isCurrentSessionGenerating && !userScrolledUpRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [
    activeSession?.id,
    activeSession?.messages,
    currentStreamingThought,
    currentStreamingAnswer,
    currentStreamingToolCalls,
    isCurrentSessionGenerating,
  ]);

  return (
    <main
      className={`gemini-chat-area ${
        hasMessages || isCurrentSessionGenerating ? "chat-started" : ""
      }`}
    >
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

          {/* On mobile: If chat exists, show 3-dots menu button. Otherwise in new chat, show user avatar */}
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
      {!hasMessages && !isCurrentSessionGenerating ? (
        <EmptyState />
      ) : (
        <>
          <div className="chat-scroll-container" ref={scrollRef} onScroll={handleScroll}>
            <div className="chat-content-constrained">
              <MessageList
                messages={activeSession.messages}
                isGenerating={isCurrentSessionGenerating}
                streamingThought={isCurrentSessionGenerating ? currentStreamingThought : ""}
                streamingAnswer={isCurrentSessionGenerating ? currentStreamingAnswer : ""}
                streamingToolCalls={isCurrentSessionGenerating ? currentStreamingToolCalls : []}
                streamingReasoningBlocks={isCurrentSessionGenerating ? currentStreamingReasoningBlocks : []}
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
