import React from "react";
import MessageItem from "./MessageItem.jsx";
import ThinkingBlock from "./ThinkingBlock.jsx";
import ToolExecutionBlock from "./ToolExecutionBlock.jsx";
import MarkdownRenderer from "./MarkdownRenderer.jsx";

export default function MessageList({
  messages,
  isGenerating,
  streamingThought,
  streamingAnswer,
  streamingToolExecutions = [],
}) {
  // Find index of last user message for in-place editing
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
            {/* Live Curated Thinking Block */}
            {streamingThought ? (
              <ThinkingBlock thought={streamingThought} isLive={!streamingAnswer} />
            ) : !streamingAnswer && streamingToolExecutions.length === 0 ? (
              <div className="live-thinking-shimmer">
                <div className="gemini-pulse-dot" />
                <span>Thinking...</span>
              </div>
            ) : null}

            {/* Live Tool Execution Pills */}
            {streamingToolExecutions.length > 0 && (
              <div className="message-tool-executions-list">
                {streamingToolExecutions.map((exec, i) => (
                  <ToolExecutionBlock key={i} execution={exec} />
                ))}
              </div>
            )}

            {/* Live Answer Markdown */}
            {streamingAnswer && <MarkdownRenderer content={streamingAnswer} />}
          </div>
        </div>
      )}
    </div>
  );
}
