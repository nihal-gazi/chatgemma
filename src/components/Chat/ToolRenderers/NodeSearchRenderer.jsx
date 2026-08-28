import React from "react";

export default function NodeSearchRenderer({ response }) {
  if (!response) return null;

  const { graph_target = "general", matchedNodesByKeyword = {}, nodes = [] } = response;
  const keywordEntries = Object.entries(matchedNodesByKeyword);

  return (
    <div className="kg-results-container node-search-gui-container">
      <div className="brainstorm-meta-bar">
        <span className="brainstorm-badge anchor">
          Graph: <strong>{graph_target.toUpperCase()} KG</strong>
        </span>
        <span className="brainstorm-badge hops">
          Found: <strong>{nodes.length} Nodes</strong>
        </span>
      </div>

      {keywordEntries.length > 0 && (
        <div className="kg-section">
          <div className="kg-section-subtitle">Discovered Nodes by Keyword</div>
          <div className="node-search-groups">
            {keywordEntries.map(([kw, nodeNames], idx) => (
              <div key={idx} className="node-search-group-card">
                <div className="node-search-kw-title">
                  <span className="kw-name">"{kw}"</span>
                  <span className="kw-count-badge">
                    ({nodeNames.length} {nodeNames.length === 1 ? "match" : "matches"})
                  </span>
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
