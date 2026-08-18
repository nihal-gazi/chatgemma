import React, { useState } from "react";
import {
  Globe,
  Terminal,
  Code,
  FileSearch,
  Share2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Check,
  AlertCircle,
} from "../Icons/index.jsx";

const TOOL_ICON_MAP = {
  web_search: Globe,
  google_search: Globe,
  run_code: Terminal,
  code_execution: Terminal,
  grep: FileSearch,
  knowledge_search: Share2,
  show_thought: Sparkles,
};

export default function ToolCallPill({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCall) return null;

  const { name, args = {}, response, status = "completed" } = toolCall;
  const IconComponent = TOOL_ICON_MAP[name] || Code;

  // Format header summary
  let headerSummary = "";
  if (name === "web_search" || name === "google_search") {
    headerSummary = `"${args.query || ""}"`;
  } else if (name === "run_code" || name === "code_execution") {
    const lines = (args.code || "").trim().split("\n");
    headerSummary = `Python (${lines.length} ${lines.length === 1 ? "line" : "lines"})`;
  } else if (name === "grep") {
    headerSummary = `/${args.pattern || ""}/`;
  } else if (name === "knowledge_search") {
    headerSummary = `"${args.query || ""}"${args.depth > 1 ? ` (depth: ${args.depth})` : ""}`;
  } else if (name === "show_thought") {
    headerSummary = "Reasoning exposed";
  } else {
    headerSummary = Object.keys(args).length > 0 ? JSON.stringify(args).slice(0, 30) : "";
  }

  const isRunning = status === "running";
  const isError = status === "error" || Boolean(response?.error);

  return (
    <div className={`tool-pill-wrapper ${expanded ? "expanded" : ""} ${status}`}>
      <button
        className="tool-pill-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
        aria-label={`Toggle tool ${name}`}
      >
        <div className="tool-pill-left">
          <div className="tool-pill-icon-badge">
            <IconComponent size={14} className="tool-icon-svg" />
          </div>
          <span className="tool-pill-name">{formatToolName(name)}</span>
          {headerSummary && <span className="tool-pill-summary">{headerSummary}</span>}
        </div>

        <div className="tool-pill-right">
          {isRunning && (
            <div className="tool-status-badge running">
              <span className="tool-pulse-dot" />
              <span>Running...</span>
            </div>
          )}

          {!isRunning && !isError && (
            <div className="tool-status-badge completed">
              <Check size={12} />
              <span>Done</span>
            </div>
          )}

          {isError && (
            <div className="tool-status-badge error">
              <AlertCircle size={12} />
              <span>Error</span>
            </div>
          )}

          <div className="tool-chevron-icon">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="tool-pill-content">
          {/* 1. Query / Input Section */}
          <div className="tool-section tool-query-section">
            <div className="tool-section-title">Input / Arguments</div>
            <div className="tool-query-body">
              {name === "run_code" ? (
                <div className="tool-code-preview">
                  <pre>
                    <code>{args.code || ""}</code>
                  </pre>
                </div>
              ) : (
                <div className="tool-args-json">
                  <pre>
                    <code>{JSON.stringify(args, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* 2. Response / Output Section */}
          <div className="tool-section tool-response-section">
            <div className="tool-section-title">
              <span>Response / Result</span>
              {response?.executionTimeMs !== undefined && (
                <span className="tool-meta-badge">{response.executionTimeMs}ms</span>
              )}
            </div>

            <div className="tool-response-body">
              {isRunning ? (
                <div className="tool-loading-placeholder">
                  <span className="tool-pulse-dot" /> Executing {formatToolName(name)}...
                </div>
              ) : (
                renderToolResponse(name, response)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatToolName(name) {
  if (!name) return "Tool";
  if (name === "knowledge_search") return "Knowledge Search";
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function renderToolResponse(name, response) {
  if (!response) {
    return <div className="tool-empty-output">No output returned.</div>;
  }

  if (response.error) {
    return <div className="tool-error-output">{response.error}</div>;
  }

  // Specialized Renderer for Knowledge Graph Search (GraphRAG)
  if (name === "knowledge_search") {
    const hasEntities = Array.isArray(response.matchedEntities) && response.matchedEntities.length > 0;
    const hasFacts = Array.isArray(response.facts) && response.facts.length > 0;
    const hasPaths = Array.isArray(response.paths) && response.paths.length > 0;

    if (!hasEntities && !hasFacts) {
      return (
        <div className="tool-empty-output">
          No entities or relationships found in Knowledge Graph for <code>{response.query}</code>.
        </div>
      );
    }

    return (
      <div className="kg-results-container">
        {hasEntities && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Grounded Entities ({response.matchedEntities.length})</div>
            <div className="kg-entities-grid">
              {response.matchedEntities.map((ent, idx) => (
                <div key={idx} className="kg-entity-chip">
                  <div className="kg-entity-header">
                    <span className="kg-entity-name">{ent.name}</span>
                    {ent.types && ent.types.length > 0 && (
                      <span className="kg-entity-type-badge">{ent.types.join(", ")}</span>
                    )}
                  </div>
                  {ent.description && <div className="kg-entity-desc">{ent.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasFacts && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Semantic Triples &amp; Relations ({response.facts.length})</div>
            <div className="kg-triples-list">
              {response.facts.map((fact, idx) => (
                <div key={idx} className="kg-triple-card">
                  <div className="kg-triple-visual">
                    <span className="kg-node subject">{fact.subject}</span>
                    <span className="kg-edge-arrow">&rarr; {fact.predicate} &rarr;</span>
                    <span className="kg-node object">{fact.object}</span>
                  </div>
                  {fact.description && <div className="kg-triple-desc">{fact.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPaths && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Multi-Hop Reasoning Paths</div>
            <div className="kg-paths-list">
              {response.paths.map((p, idx) => (
                <div key={idx} className="kg-path-item">{p}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Specialized Renderer for Web Search & Google Search Grounding
  if ((name === "web_search" || name === "google_search") && Array.isArray(response.results)) {
    if (response.results.length === 0) {
      return <div className="tool-empty-output">No web results found for query.</div>;
    }
    return (
      <div className="web-search-results-list">
        {response.results.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="search-result-card"
          >
            <div className="search-result-header">
              <span className="search-result-title">{item.title}</span>
              <ExternalLink size={12} className="search-result-link-icon" />
            </div>
            {item.snippet && <p className="search-result-snippet">{item.snippet}</p>}
            {item.source && <span className="search-result-source">{item.source}</span>}
          </a>
        ))}
      </div>
    );
  }

  // Specialized Renderer for Python Code Runner (Server-side & Pyodide)
  if (name === "run_code" || name === "code_execution") {
    return (
      <div className="python-run-output">
        {response.stdout && (
          <div className="python-output-block stdout">
            <div className="output-sublabel">stdout:</div>
            <pre>
              <code>{response.stdout}</code>
            </pre>
          </div>
        )}
        {response.stderr && (
          <div className="python-output-block stderr">
            <div className="output-sublabel">stderr:</div>
            <pre>
              <code>{response.stderr}</code>
            </pre>
          </div>
        )}
        {response.result && response.result !== "None" && (
          <div className="python-output-block result">
            <div className="output-sublabel">Return Value:</div>
            <div className="python-result-val">{response.result}</div>
          </div>
        )}
        {!response.stdout && !response.stderr && (!response.result || response.result === "None") && (
          <div className="tool-empty-output">Code executed successfully with no output.</div>
        )}
      </div>
    );
  }

  // Specialized Renderer for Grep Search
  if (name === "grep" && Array.isArray(response.matches)) {
    if (response.matches.length === 0) {
      return (
        <div className="tool-empty-output">
          No matches found for pattern <code>{response.pattern}</code>.
        </div>
      );
    }
    return (
      <div className="grep-results-container">
        <div className="grep-count-header">
          Found {response.totalMatches} {response.totalMatches === 1 ? "match" : "matches"}:
        </div>
        <div className="grep-matches-list">
          {response.matches.map((m, idx) => (
            <div key={idx} className="grep-match-row">
              <div className="grep-match-meta">
                <span className="grep-session-name">{m.sessionTitle}</span>
                <span className="grep-line-badge">Line {m.lineNumber}</span>
              </div>
              <div className="grep-line-text">{m.lineContent}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default JSON preview for any other tool
  return (
    <div className="tool-json-output">
      <pre>
        <code>{JSON.stringify(response, null, 2)}</code>
      </pre>
    </div>
  );
}

