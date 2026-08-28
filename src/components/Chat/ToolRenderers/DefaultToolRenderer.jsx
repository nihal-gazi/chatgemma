import React from "react";

export default function DefaultToolRenderer({ name, response }) {
  if (!response) {
    return <div className="tool-empty-output">No output returned.</div>;
  }

  if (response.error) {
    return <div className="tool-error-output">{response.error}</div>;
  }

  // Knowledge Graph Write (General or User KG)
  if (name === "knowledge_graph_write" || name === "user_knowledge_graph_write") {
    const isUser = name === "user_knowledge_graph_write";
    return (
      <div className="kg-results-container">
        <div className="kg-success-banner">
          {response.message || `Successfully wrote facts to ${isUser ? "User" : "General"} Knowledge Graph.`}
        </div>
        {response.entities?.length > 0 && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Created / Updated Entities ({response.entities.length}):</div>
            <div className="kg-entity-chips">
              {response.entities.map((e, idx) => (
                <div key={idx} className="kg-entity-chip">
                  <span className="kg-chip-name">{e.name}</span>
                  <span className="kg-chip-type">[{Array.isArray(e.types) ? e.types.join(", ") : e.types || "Concept"}]</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {response.relationships?.length > 0 && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Created Semantic Triples ({response.relationships.length}):</div>
            <div className="kg-triple-list">
              {response.relationships.map((r, idx) => (
                <div key={idx} className="kg-triple-item">
                  <span className="kg-node subject">{r.source}</span>
                  <span className="kg-edge">&rarr; {r.predicate} &rarr;</span>
                  <span className="kg-node object">{r.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Knowledge Graph Delete (General or User KG)
  if (name === "knowledge_graph_delete" || name === "user_knowledge_graph_delete") {
    const isUser = name === "user_knowledge_graph_delete";
    return (
      <div className="kg-results-container">
        <div className="kg-warning-banner">
          {response.message || `Deleted entities/relations from ${isUser ? "User" : "General"} Knowledge Graph.`}
        </div>
        {response.deletedEntities?.length > 0 && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Deactivated Entities ({response.deletedEntities.length}):</div>
            <div className="kg-type-tags">
              {response.deletedEntities.map((name, idx) => (
                <span key={idx} className="kg-type-tag search-hint">{name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Knowledge Graph Search (General or User KG)
  if (name === "knowledge_search" || name === "user_knowledge_graph_search") {
    const { entities = [], relationships = [], query = "" } = response;
    const isUser = name === "user_knowledge_graph_search";

    if (entities.length === 0 && relationships.length === 0) {
      return (
        <div className="kg-results-container">
          <div className="kg-warning-banner">
            No matching entities found in {isUser ? "User" : "General"} Knowledge Graph for "{query}".
          </div>
        </div>
      );
    }

    return (
      <div className="kg-results-container">
        <div className="brainstorm-meta-bar">
          <span className="brainstorm-badge anchor">
            Graph: <strong>{isUser ? "USER KG" : "GENERAL KG"}</strong>
          </span>
          <span className="brainstorm-badge hops">
            Found: <strong>{entities.length} Entities, {relationships.length} Triples</strong>
          </span>
        </div>
        {entities.length > 0 && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Entities ({entities.length}):</div>
            <div className="kg-entity-chips">
              {entities.map((e, idx) => (
                <div key={idx} className="kg-entity-chip">
                  <span className="kg-chip-name">{e.name}</span>
                  <span className="kg-chip-type">[{Array.isArray(e.types) ? e.types.join(", ") : e.types || "Concept"}]</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {relationships.length > 0 && (
          <div className="kg-section">
            <div className="kg-section-subtitle">Relationships ({relationships.length}):</div>
            <div className="kg-triple-list">
              {relationships.map((r, idx) => (
                <div key={idx} className="kg-triple-item">
                  <span className="kg-node subject">{r.source}</span>
                  <span className="kg-edge">&rarr; {r.predicate} &rarr;</span>
                  <span className="kg-node object">{r.target}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Grep Pattern Search
  if (name === "grep") {
    const { pattern = "", matches = [], totalMatches = 0 } = response;
    if (matches.length === 0) {
      return <div className="grep-empty-results">No matches found for /{pattern}/</div>;
    }
    return (
      <div className="grep-results-container">
        <div className="grep-results-header">
          Found <strong>{totalMatches}</strong> match{totalMatches === 1 ? "" : "es"} in chat history:
        </div>
        <div className="grep-matches-list">
          {matches.map((m, idx) => (
            <div key={idx} className="grep-match-item">
              <span className="grep-role-tag">{m.role}</span>
              <span className="grep-turn-index">Turn #{m.turnIndex + 1}</span>
              <div className="grep-line-text">{m.lineContent}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback JSON View
  return (
    <div className="tool-json-output">
      <pre>
        <code>{JSON.stringify(response, null, 2)}</code>
      </pre>
    </div>
  );
}
