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
}) {
  // Find the index of the last user message to restrict editing to ONLY the last sent message
  let lastUserMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserMessageIndex = i;
      break;
    }
  }

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
            {/* Live Tool Calls (Executing / Completed in current turn) */}
            {streamingToolCalls && streamingToolCalls.length > 0 && (
              <div className="message-tool-calls-group">
                {streamingToolCalls.map((tc, tcIdx) => (
                  <ToolCallPill key={tc.id || tcIdx} toolCall={tc} />
                ))}
              </div>
            )}

            {/* Live Thinking Block */}
            {streamingThought ? (
              <ThinkingBlock thought={streamingThought} isLive={!streamingAnswer} />
            ) : !streamingAnswer && (!streamingToolCalls || streamingToolCalls.length === 0) ? (
              <div className="live-thinking-shimmer">
                <ThinkingAnimation />
                <span>Thinking...</span>
              </div>
            ) : null}

            {/* Live Answer Markdown */}
            {streamingAnswer && <MarkdownRenderer content={streamingAnswer} />}
          </div>
        </div>
      )}
    </div>
  );
}
