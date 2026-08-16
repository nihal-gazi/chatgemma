import React from "react";
import MessageItem from "./MessageItem.jsx";
import ThinkingBlock from "./ThinkingBlock.jsx";
import ThinkingAnimation from "./ThinkingAnimation.jsx";
import ToolCallPill from "./ToolCallPill.jsx";
import MarkdownRenderer from "./MarkdownRenderer.jsx";

export default function MessageList({
  messages,
  isGenerating,
  streamingThought,
  streamingAnswer,
  streamingToolCalls = [],
  streamingReasoningBlocks = [],
}) {
  // Find the index of the last user message to restrict editing to ONLY the last sent message
  let lastUserMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserMessageIndex = i;
      break;
    }
  }

  const hasReasoningBlocks = streamingReasoningBlocks && streamingReasoningBlocks.length > 0;

  return (
    <div className="messages-stream-list">
      {messages.map((msg, index) => (
        <MessageItem
          key={msg.id || index}
          message={msg}
          index={index}
          isLastUserMessage={index === lastUserMessageIndex}
          isGenerating={isGenerating}
        />
      ))}

      {/* Live streaming generation response */}
      {isGenerating && (
        <div className="assistant-message-row streaming-row">
          <div className="assistant-response-container">
            {/* 1. Chronological Reasoning Blocks (Native Thoughts & Tool Calls in Sequence) */}
            {hasReasoningBlocks ? (
              <div className="message-reasoning-blocks-flow">
                {streamingReasoningBlocks.map((block, bIdx) => {
                  if (block.type === "thought") {
                    return (
                      <ThinkingBlock
                        key={block.id || bIdx}
                        thought={block.content}
                        isLive={block.isLive !== false}
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
            ) : !streamingAnswer ? (
              <div className="live-thinking-shimmer">
                <ThinkingAnimation />
                <span>Thinking...</span>
              </div>
            ) : null}

            {/* 2. Live Answer Markdown */}
            {streamingAnswer && <MarkdownRenderer content={streamingAnswer} />}
          </div>
        </div>
      )}
    </div>
  );
}
