import React, { useState } from "react";
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  Terminal,
  Globe,
  Search,
  Database,
  User,
  FileText,
  Check,
  Copy,
  AlertCircle
} from "../Icons/index.jsx";

function getToolIcon(toolName) {
  switch (toolName) {
    case "run_code":
      return <Terminal size={14} className="tool-type-icon tool-code-icon" />;
    case "web_search":
      return <Globe size={14} className="tool-type-icon tool-web-icon" />;
    case "grep":
      return <Search size={14} className="tool-type-icon tool-grep-icon" />;
    case "knowledge_search":
    case "add_global_knowledge":
      return <Database size={14} className="tool-type-icon tool-kg-icon" />;
    case "add_user_knowledge":
      return <User size={14} className="tool-type-icon tool-user-icon" />;
    case "scratch_pad":
      return <FileText size={14} className="tool-type-icon tool-pad-icon" />;
    default:
      return <Wrench size={14} className="tool-type-icon" />;
  }
}

function formatArgsSummary(args = {}) {
  if (!args || Object.keys(args).length === 0) return "";
  if (args.code) {
    const firstLine = args.code.trim().split("\n")[0] || "";
    return firstLine.slice(0, 35) + (firstLine.length > 35 ? "..." : "");
  }
  if (args.query) return `"${args.query}"`;
  if (args.content) return `"${args.content.slice(0, 30)}${args.content.length > 30 ? "..." : ""}"`;
  if (args.pattern) return `/${args.pattern}/`;
  if (args.k) return `k: ${args.k}`;
  if (args.action) return `action: ${args.action}`;
  return Object.keys(args).map((k) => `${k}: ${JSON.stringify(args[k])}`).join(", ").slice(0, 35);
}

export default function ToolExecutionBlock({ execution }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!execution) return null;

  const { toolName, args = {}, result, status = "success", durationMs } = execution;
  const isError = status === "error" || (result && result.error);

  const handleCopy = (e) => {
    e.stopPropagation();
    const textToCopy = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`tool-execution-pill-wrapper ${expanded ? "expanded" : ""} ${isError ? "error" : ""}`}>
      <button
        type="button"
        className="tool-execution-header-btn"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="tool-header-left">
          {getToolIcon(toolName)}
          <span className="tool-name-badge">{toolName}</span>
          <span className="tool-args-preview">{formatArgsSummary(args)}</span>
        </div>

        <div className="tool-header-right">
          {durationMs !== undefined && (
            <span className="tool-duration-badge">{durationMs}ms</span>
          )}
          {isError ? (
            <AlertCircle size={13} className="tool-status-icon error" />
          ) : (
            <span className="tool-status-dot success" />
          )}
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="tool-execution-body">
          {/* Input Arguments */}
          <div className="tool-section">
            <div className="tool-section-title">Arguments</div>
            <pre className="tool-json-viewer">
              <code>{JSON.stringify(args, null, 2)}</code>
            </pre>
          </div>

          {/* Execution Output */}
          <div className="tool-section">
            <div className="tool-section-header-row">
              <span className="tool-section-title">Result / Output</span>
              <button
                type="button"
                className="tool-copy-output-btn"
                onClick={handleCopy}
                title="Copy result"
              >
                {copied ? <Check size={12} className="copied-icon" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {toolName === "run_code" && result?.output ? (
              <pre className="tool-console-output">
                <code>{result.output}</code>
              </pre>
            ) : (
              <pre className="tool-json-viewer">
                <code>{typeof result === "string" ? result : JSON.stringify(result, null, 2)}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
