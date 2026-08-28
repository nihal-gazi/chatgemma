import React, { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, Sparkles } from "../../Icons/index.jsx";

export function SampleCodeQueryRenderer({ response }) {
  if (!response) return null;

  if (response.status === "not_found") {
    return (
      <div className="kg-results-container">
        <div className="kg-warning-banner">
          {response.message || `No verified code snippets found matching query "${response.query}".`}
        </div>
      </div>
    );
  }

  const { query = "", library = "any", candidates = [], nextStepDirective } = response;

  return (
    <div className="kg-results-container synapser-gui-container">
      <div className="brainstorm-meta-bar">
        <span className="brainstorm-badge anchor">
          Query: <strong>"{query}"</strong>
        </span>
        <span className="brainstorm-badge hops">
          Library: <strong>{library}</strong>
        </span>
        <span className="brainstorm-badge mutations">
          Found: <strong>{candidates.length} Candidates</strong>
        </span>
      </div>

      <div className="synapser-candidates-list">
        {candidates.map((c, idx) => (
          <div key={c.id || idx} className="synapser-candidate-card">
            <div className="synapser-card-header">
              <div className="synapser-title-group">
                <span className="synapser-cand-title">{c.title}</span>
                <div className="synapser-meta-tags">
                  <span className="synapser-lib-tag">{c.library}</span>
                  {c.category && <span className="synapser-cat-tag">{c.category}</span>}
                  {c.score !== undefined && (
                    <span className="synapser-score-tag">Score: {c.score}</span>
                  )}
                </div>
              </div>
              <code className="synapser-id-badge">{c.id}</code>
            </div>

            <div className="synapser-cand-desc">{c.very_short_desc}</div>

            {c.tags && c.tags.length > 0 && (
              <div className="synapser-tags-row">
                {c.tags.slice(0, 6).map((t, tIdx) => (
                  <span key={tIdx} className="synapser-tag-pill">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {nextStepDirective && (
        <div className="brainstorm-verify-banner">
          <Sparkles size={14} className="verify-icon" />
          <span>{nextStepDirective}</span>
        </div>
      )}
    </div>
  );
}

export function GetCodeSampleRenderer({ response }) {
  const [copied, setCopied] = useState(false);
  const [showArch, setShowArch] = useState(false);

  if (!response) return null;

  if (response.status === "not_found" || response.error) {
    return (
      <div className="kg-results-container">
        <div className="kg-warning-banner">
          {response.error || `Snippet "${response.snippet_id}" not found.`}
        </div>
      </div>
    );
  }

  const {
    snippet_id,
    title,
    library,
    language = "python",
    min_version,
    dependencies = [],
    very_short_desc,
    long_desc,
    code = "",
    documentation,
  } = response;

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="kg-results-container synapser-gui-container">
      <div className="brainstorm-meta-bar">
        <span className="brainstorm-badge anchor">
          Snippet: <strong>{snippet_id}</strong>
        </span>
        <span className="brainstorm-badge hops">
          Library: <strong>{library}</strong>
          {min_version ? ` (>=${min_version})` : ""}
        </span>
        <span className="brainstorm-badge seed">
          Lang: <strong>{language}</strong>
        </span>
      </div>

      <div className="synapser-snippet-header-box">
        <h4 className="synapser-snippet-title">{title}</h4>
        {very_short_desc && <p className="synapser-snippet-summary">{very_short_desc}</p>}

        {dependencies.length > 0 && (
          <div className="synapser-deps-row">
            <span className="synapser-deps-label">Dependencies:</span>
            {dependencies.map((dep, dIdx) => (
              <span key={dIdx} className="synapser-dep-pill">
                {dep}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="synapser-code-viewer">
        <div className="synapser-code-header">
          <span className="synapser-code-lang">{language} (verified ground-truth)</span>
          <button
            type="button"
            className="synapser-copy-btn"
            onClick={handleCopy}
            aria-label="Copy Code"
          >
            {copied ? (
              <>
                <Check size={13} className="synapser-copied-icon" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Boilerplate</span>
              </>
            )}
          </button>
        </div>
        <pre className="synapser-code-pre">
          <code>{code}</code>
        </pre>
      </div>

      {long_desc && (
        <div className="brainstorm-original-toggle-area">
          <button
            type="button"
            className="brainstorm-toggle-btn"
            onClick={() => setShowArch(!showArch)}
          >
            {showArch ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Architectural Notes & Implementation Details</span>
          </button>
          {showArch && (
            <div className="synapser-arch-box">
              <div className="synapser-arch-text">{long_desc}</div>
              {documentation && (
                <div className="synapser-doc-text">
                  <strong>API Notes:</strong>
                  <pre>{documentation}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
