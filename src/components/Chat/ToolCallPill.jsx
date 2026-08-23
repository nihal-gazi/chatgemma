import React, { useState } from "react";
import {
  Globe,
  Terminal,
  Code,
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
} from "../Icons/index.jsx";

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
  } else if (name === "user_knowledge_graph_search") {
    headerSummary = `User: "${args.query || ""}"${args.depth > 1 ? ` (depth: ${args.depth})` : ""}`;
  } else if (name === "knowledge_graph_write") {
    const eCount = args.entities?.length || 0;
    const rCount = args.relationships?.length || 0;
    headerSummary = `+${eCount} ent, +${rCount} rel`;
  } else if (name === "user_knowledge_graph_write") {
    const eCount = args.entities?.length || 0;
    const rCount = args.relationships?.length || 0;
    headerSummary = `User: +${eCount} ent, +${rCount} rel`;
  } else if (name === "knowledge_graph_delete") {
    const eCount = args.entityNames?.length || 0;
    const rCount = args.relationships?.length || 0;
    headerSummary = `-${eCount} ent, -${rCount} rel`;
  } else if (name === "user_knowledge_graph_delete") {
    const eCount = args.entityNames?.length || 0;
    const rCount = args.relationships?.length || 0;
    headerSummary = `User: -${eCount} ent, -${rCount} rel`;
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
  if (name === "knowledge_graph_write") return "Knowledge Graph Write";
  if (name === "knowledge_graph_delete") return "Knowledge Graph Delete";
  if (name === "user_knowledge_graph_search") return "User KG Search";
  if (name === "user_knowledge_graph_write") return "User KG Write";
  if (name === "user_knowledge_graph_delete") return "User KG Delete";
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

  // Specialized Renderer for Knowledge Graph Write / User KG Write
  if (name === "knowledge_graph_write" || name === "user_knowledge_graph_write") {
    const hasEntities = Array.isArray(response.entitiesWritten) && response.entitiesWritten.length > 0;
    const hasRelations = Array.isArray(response.relationsWritten) && response.relationsWritten.length > 0;

    return (
      <div className="kg-results-container">
        <div className="kg-success-banner">{response.message || "Knowledge written successfully."}</div>

        {hasEntities && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Entities Created / Updated ({response.entitiesWritten.length}):</div>
            <div className="kg-entities-grid">
              {response.entitiesWritten.map((ent, idx) => (
                <div key={idx} className="kg-entity-chip write">
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

        {hasRelations && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Relations Created / Updated ({response.relationsWritten.length}):</div>
            <div className="kg-triples-list">
              {response.relationsWritten.map((rel, idx) => (
                <div key={idx} className="kg-triple-card write">
                  <div className="kg-triple-visual">
                    <span className="kg-node subject">{rel.source}</span>
                    <span className="kg-edge-arrow">&rarr; {rel.predicate} &rarr;</span>
                    <span className="kg-node object">{rel.target}</span>
                  </div>
                  {rel.description && <div className="kg-triple-desc">{rel.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Specialized Renderer for Knowledge Graph Delete (Soft Delete) / User KG Delete
  if (name === "knowledge_graph_delete" || name === "user_knowledge_graph_delete") {
    const hasEntities = Array.isArray(response.entitiesSoftDeleted) && response.entitiesSoftDeleted.length > 0;
    const hasRelations = Array.isArray(response.relationsSoftDeleted) && response.relationsSoftDeleted.length > 0;

    return (
      <div className="kg-results-container">
        <div className="kg-delete-banner">{response.message || "Items soft-deleted (isActive = false)."}</div>

        {hasEntities && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Entities Soft-Deleted ({response.entitiesSoftDeleted.length}):</div>
            <div className="kg-type-tags">
              {response.entitiesSoftDeleted.map((ent, idx) => (
                <span key={idx} className="kg-type-tag inactive">
                  {ent.name || ent.id} (isActive: false)
                </span>
              ))}
            </div>
          </div>
        )}

        {hasRelations && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Relations Soft-Deleted ({response.relationsSoftDeleted.length}):</div>
            <div className="kg-triples-list">
              {response.relationsSoftDeleted.map((rel, idx) => (
                <div key={idx} className="kg-triple-card inactive">
                  <div className="kg-triple-visual">
                    <span className="kg-node subject">{rel.source}</span>
                    <span className="kg-edge-arrow">&rarr; {rel.predicate} &rarr;</span>
                    <span className="kg-node object">{rel.target}</span>
                    <span className="kg-inactive-badge">(deactivated)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Specialized Renderer for Knowledge Graph Search / User KG Search
  if (name === "knowledge_search" || name === "user_knowledge_graph_search") {
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

  // Specialized Renderer for Brainstorm Idea (Predicate Swapping & Graph Walk)
  if (name === "brainstorm_idea") {
    return <BrainstormIdeaRenderer response={response} />;
  }

  // Specialized Renderer for KG Node Search
  if (name === "knowledge_graph_node_search") {
    return <KnowledgeGraphNodeSearchRenderer response={response} />;
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

function BrainstormIdeaRenderer({ response }) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (!response) return null;

  if (response.status === "insufficient_knowledge") {
    return (
      <div className="kg-results-container">
        <div className="kg-warning-banner">
          <strong>Insufficient Knowledge in Graph:</strong> {response.summary || response.instruction}
        </div>
        {response.suggestedSearchQueries && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Suggested Search Queries</div>
            <div className="kg-type-tags">
              {response.suggestedSearchQueries.map((q, idx) => (
                <span key={idx} className="kg-type-tag search-hint">
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const {
    startAnchorNode,
    foundKeywords = [],
    unfoundKeywords = [],
    mutatedGraph,
    originalNonMutatedGraph,
    actualTraversedHops = mutatedGraph?.pathLength || 0,
    mutatedHopsCount = mutatedGraph?.mutatedHopsCount || 0,
    preservedHopsCount = mutatedGraph?.preservedHopsCount || 0,
    seedUsed,
    mutations = mutatedGraph?.mutations || [],
    verificationGuidance,
  } = response;

  return (
    <div className="kg-results-container brainstorm-gui-container">
      {/* 1. Header Badges Row */}
      <div className="brainstorm-meta-bar">
        {startAnchorNode && (
          <span className="brainstorm-badge anchor">
            Anchor: <strong>{startAnchorNode}</strong>
          </span>
        )}
        <span className="brainstorm-badge hops">
          Path: <strong>{actualTraversedHops} Hops</strong>
        </span>
        <span className="brainstorm-badge mutations">
          <strong>{mutatedHopsCount} Mutated</strong> / {preservedHopsCount} Preserved
        </span>
        {seedUsed !== undefined && (
          <span className="brainstorm-badge seed">
            Seed: <strong>{seedUsed}</strong>
          </span>
        )}
      </div>

      {/* 2. Found / Unfound Keywords Resolution */}
      {foundKeywords.length > 0 && (
        <div className="kg-section">
          <div className="kg-section-subtitle">Mapped Keywords Resolution</div>
          <div className="brainstorm-keywords-flow">
            {foundKeywords.map((item, idx) => (
              <div key={idx} className="brainstorm-kw-chip matched">
                <span className="kw-label">"{item.keyword}"</span>
                <span className="kw-arrow">&rarr;</span>
                <span className="kw-node">{item.matchedNode}</span>
                {item.domain && <span className="kw-domain-badge">{item.domain}</span>}
              </div>
            ))}
            {unfoundKeywords.map((kw, idx) => (
              <div key={idx} className="brainstorm-kw-chip unmatched">
                <span className="kw-label">"{kw}"</span>
                <span className="kw-unmatched-tag">(unmatched)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Mutated Counterfactual Graph Traversal */}
      <div className="kg-section">
        <div className="kg-section-subtitle">
          <span>Mutated Counterfactual Path ({mutations.length} Hops)</span>
        </div>
        <div className="brainstorm-traversal-list">
          {mutations.map((m, idx) => (
            <div
              key={idx}
              className={`brainstorm-hop-card ${m.isMutated ? "mutated-hop" : "preserved-hop"}`}
            >
              <div className="hop-index-badge">Hop {m.step || idx + 1}</div>
              <div className="hop-visual-flow">
                <span className="kg-node subject">{m.source}</span>
                <div className="hop-edge-connector">
                  {m.isMutated ? (
                    <span className="kg-edge-arrow mutated">
                      {m.mutatedPredicate}
                    </span>
                  ) : (
                    <span className="kg-edge-arrow">&rarr; {m.originalPredicate} &rarr;</span>
                  )}
                  {m.isMutated && (
                    <span className="hop-mutation-tag">
                      Swapped from <code>{m.originalPredicate}</code>
                    </span>
                  )}
                </div>
                <span className="kg-node object">{m.target}</span>
              </div>
              {m.isMutated && m.explanation && (
                <div className="hop-mutation-reason">{m.explanation}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Original Non-Mutated Path (Toggle Accordion) */}
      {originalNonMutatedGraph?.connectionsList && (
        <div className="brainstorm-original-toggle-area">
          <button
            type="button"
            className="brainstorm-toggle-btn"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            {showOriginal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>View Original Unmutated Path ({originalNonMutatedGraph.connectionsList.length} Hops)</span>
          </button>
          {showOriginal && (
            <div className="brainstorm-original-list">
              {originalNonMutatedGraph.connectionsList.map((conn, idx) => (
                <div key={idx} className="brainstorm-original-row">
                  <span className="original-hop-text">{conn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Verification Guidance Callout */}
      {verificationGuidance && (
        <div className="brainstorm-verify-banner">
          <span>{verificationGuidance}</span>
        </div>
      )}
    </div>
  );
}

function KnowledgeGraphNodeSearchRenderer({ response }) {
  if (!response) return null;

  const { graph_target = "general", matchedNodesByKeyword = {}, nodes = [] } = response;
  const keywordEntries = Object.entries(matchedNodesByKeyword);

  return (
    <div className="kg-results-container node-search-gui-container">
      {/* 1. Header Target Badge */}
      <div className="brainstorm-meta-bar">
        <span className="brainstorm-badge anchor">
          Graph: <strong>{graph_target.toUpperCase()} KG</strong>
        </span>
        <span className="brainstorm-badge hops">
          Found: <strong>{nodes.length} Nodes</strong>
        </span>
      </div>

      {/* 2. Keyword Groupings */}
      {keywordEntries.length > 0 && (
        <div className="kg-section">
          <div className="kg-section-subtitle">Discovered Nodes by Keyword</div>
          <div className="node-search-groups">
            {keywordEntries.map(([kw, nodeNames], idx) => (
              <div key={idx} className="node-search-group-card">
                <div className="node-search-kw-title">
                  <span className="kw-name">"{kw}"</span>
                  <span className="kw-count-badge">({nodeNames.length} {nodeNames.length === 1 ? "match" : "matches"})</span>
                </div>
                <div className="node-search-chips-grid">
                  {nodeNames.map((nodeName, nIdx) => (
                    <span key={nIdx} className="node-name-pill">
                      {nodeName}
                    </span>
                  ))}
                  {nodeNames.length === 0 && (
                    <span className="node-empty-hint">No close matching nodes found</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Flat Nodes Array */}
      {nodes.length > 0 && (
        <div className="kg-section">
          <div className="kg-section-subtitle">Ready-to-Brainstorm Nodes ({nodes.length})</div>
          <div className="node-search-chips-grid">
            {nodes.map((nodeName, idx) => (
              <span key={idx} className="node-name-pill ready">
                {nodeName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

