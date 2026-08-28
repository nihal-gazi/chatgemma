import React, { useState } from "react";
import { ChevronRight, ChevronDown, Sparkles } from "../../Icons/index.jsx";

export default function BrainstormRenderer({ response }) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (!response) return null;

  if (response.status === "insufficient_knowledge") {
    return (
      <div className="kg-results-container">
        <div className="kg-warning-banner">
          <strong>Insufficient Knowledge in Graph</strong>: {response.summary || response.instruction}
        </div>
        {response.suggestedSearchQueries && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Suggested Search Queries:</div>
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

  const mode = response.mode || (Array.isArray(response.pairs) ? "random_pair" : "predicate_swap");

  // Mode 1: Random Disconnected Node Pairs
  if (mode === "random_pair") {
    const {
      pairCount = response.pairs?.length || 0,
      seedUsed,
      foundKeywords = [],
      unfoundKeywords = [],
      pairs = [],
      verificationGuidance,
    } = response;

    return (
      <div className="kg-results-container brainstorm-gui-container">
        <div className="brainstorm-meta-bar">
          <span className="brainstorm-badge anchor">
            Mode: <strong>Random Disconnected Pairs</strong>
          </span>
          <span className="brainstorm-badge hops">
            Pairs: <strong>{pairCount} Generated</strong>
          </span>
          {seedUsed !== undefined && (
            <span className="brainstorm-badge seed">
              Seed: <strong>{seedUsed}</strong>
            </span>
          )}
        </div>

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

        <div className="kg-section">
          <div className="kg-section-subtitle">
            <span>Random Disconnected Node Pairings ({pairs.length})</span>
          </div>
          <div className="brainstorm-traversal-list">
            {pairs.map((p, idx) => (
              <div key={idx} className="brainstorm-hop-card mutated-hop">
                <div className="hop-index-badge">Pair {p.pairIndex || idx + 1}</div>
                <div className="hop-visual-flow">
                  <div className="kg-node-group">
                    <span className="kg-node subject">{p.source}</span>
                    {p.sourceDomain && (
                      <span className="kw-domain-badge">{p.sourceDomain}</span>
                    )}
                  </div>
                  <div className="hop-edge-connector">
                    <span className="kg-edge-arrow mutated">
                      {p.predicate}
                    </span>
                    <span className="hop-mutation-tag">
                      0 prior connections in KG
                    </span>
                  </div>
                  <div className="kg-node-group">
                    <span className="kg-node object">{p.target}</span>
                    {p.targetDomain && (
                      <span className="kw-domain-badge">{p.targetDomain}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {verificationGuidance && (
          <div className="brainstorm-verify-banner">
            <Sparkles size={14} className="verify-icon" />
            <span>{verificationGuidance}</span>
          </div>
        )}
      </div>
    );
  }

  // Mode 2: Continuous Path with Predicate Swaps
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

      {verificationGuidance && (
        <div className="brainstorm-verify-banner">
          <Sparkles size={14} className="verify-icon" />
          <span>{verificationGuidance}</span>
        </div>
      )}
    </div>
  );
}
