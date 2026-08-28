import React, { useState } from "react";
import {
  Code,
  Globe,
  Terminal,
  FileSearch,
  Share2,
  Trash2,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Check,
  AlertCircle,
  Copy,
} from "../Icons/index.jsx";
import {
  BrainstormRenderer,
  NodeSearchRenderer,
  SampleCodeQueryRenderer,
  GetCodeSampleRenderer,
  DefaultToolRenderer,
} from "./ToolRenderers/index.js";

const TOOL_ICON_MAP = {
  web_search: Globe,
  google_search: Globe,
  run_code: Terminal,
  code_execution: Terminal,
  grep: FileSearch,
  knowledge_search: Share2,
  knowledge_graph_write: Share2,
  knowledge_graph_delete: Trash2,
  user_knowledge_graph_search: FileText,
  user_knowledge_graph_write: FileText,
  user_knowledge_graph_delete: Trash2,
  show_thought: Sparkles,
  sample_code_query: Code,
  get_code_sample: Code,
  brainstorm_idea: Sparkles,
  knowledge_graph_node_search: FileSearch,
};

const TOOL_NAME_MAP = {
  knowledge_search: "Knowledge Search",
  knowledge_graph_write: "Knowledge Graph Write",
  knowledge_graph_delete: "Knowledge Graph Delete",
  user_knowledge_graph_search: "User KG Search",
  user_knowledge_graph_write: "User KG Write",
  user_knowledge_graph_delete: "User KG Delete",
  sample_code_query: "Sample Code Query",
  get_code_sample: "Get Code Sample",
  brainstorm_idea: "Brainstorm Idea",
  knowledge_graph_node_search: "KG Node Search",
};

function formatToolName(name) {
  if (!name) return "Tool";
  if (TOOL_NAME_MAP[name]) return TOOL_NAME_MAP[name];
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getHeaderSummary(name, args = {}) {
  if (name === "web_search" || name === "google_search") return `"${args.query || ""}"`;
  if (name === "run_code" || name === "code_execution") {
    const lines = (args.code || "").trim().split("\n");
    return `Python (${lines.length} ${lines.length === 1 ? "line" : "lines"})`;
  }
  if (name === "grep") return `/${args.pattern || ""}/`;
  if (name === "knowledge_search") return `"${args.query || ""}"`;
  if (name === "user_knowledge_graph_search") return `User: "${args.query || ""}"`;
  if (name === "knowledge_graph_write") return `+${args.entities?.length || 0} ent, +${args.relationships?.length || 0} rel`;
  if (name === "user_knowledge_graph_write") return `User: +${args.entities?.length || 0} ent, +${args.relationships?.length || 0} rel`;
  if (name === "knowledge_graph_delete") return `-${args.entityNames?.length || 0} ent, -${args.relationships?.length || 0} rel`;
  if (name === "user_knowledge_graph_delete") return `User: -${args.entityNames?.length || 0} ent, -${args.relationships?.length || 0} rel`;
  if (name === "sample_code_query") return `"${args.query || ""}"${args.library ? ` [${args.library}]` : ""}`;
  if (name === "get_code_sample") return `\`${args.snippet_id || ""}\``;
  if (name === "brainstorm_idea") return `${args.mode === "random_pair" ? "Random Pairs" : "Path Mutations"}`;
  if (name === "knowledge_graph_node_search") return `Keywords: [${(args.keywords || []).join(", ")}]`;
  if (name === "show_thought") return "Reasoning exposed";
  return Object.keys(args).length > 0 ? JSON.stringify(args).slice(0, 30) : "";
}

function renderToolResponse(name, response) {
  if (name === "brainstorm_idea") return <BrainstormRenderer response={response} />;
  if (name === "knowledge_graph_node_search") return <NodeSearchRenderer response={response} />;
  if (name === "sample_code_query") return <SampleCodeQueryRenderer response={response} />;
  if (name === "get_code_sample") return <GetCodeSampleRenderer response={response} />;
  return <DefaultToolRenderer name={name} response={response} />;
}

export default function ToolCallPill({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCall) return null;

  const { name, args = {}, response, status = "completed" } = toolCall;
  const IconComponent = TOOL_ICON_MAP[name] || Code;
  const headerSummary = getHeaderSummary(name, args);
  const isRunning = status === "running";
  const isError = status === "error" || Boolean(response?.error);

  return (
    <div className={`tool-pill-wrapper ${expanded ? "expanded" : ""} ${status}`}>
      <button
        type="button"
        className={`tool-pill-header ${isRunning ? "running" : ""} ${isError ? "error" : ""}`}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="tool-pill-left">
          <div className="tool-pill-icon-box">
            <IconComponent size={14} className="tool-icon" />
          </div>
          <span className="tool-pill-title">{formatToolName(name)}</span>
          {headerSummary && (
            <span className="tool-pill-summary" title={headerSummary}>
              {headerSummary}
            </span>
          )}
        </div>

        <div className="tool-pill-right">
          {isRunning && (
            <div className="tool-running-indicator">
              <span className="tool-spinner-dot" />
              <span>Executing</span>
            </div>
          )}
          {isError && (
            <div className="tool-error-badge">
              <AlertCircle size={13} />
              <span>Error</span>
            </div>
          )}
          {!isRunning && !isError && (
            <div className="tool-status-badge">
              <Check size={13} />
            </div>
          )}
          <div className="tool-expand-arrow">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="tool-pill-content-body">
          {Object.keys(args).length > 0 && (
            <div className="tool-args-preview">
              <div className="tool-section-label">Input Arguments</div>
              <pre className="tool-json-pre">
                <code>{JSON.stringify(args, null, 2)}</code>
              </pre>
            </div>
          )}

          <div className="tool-response-preview">
            <div className="tool-section-label">Execution Result</div>
            {renderToolResponse(name, response)}
          </div>
        </div>
      )}
    </div>
  );
}
