import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Graph } from "@cosmograph/cosmos";
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  X,
  Share2,
  Sparkles,
  ChevronRight,
} from "../Icons/index.jsx";
import {
  knowledgeGraphInstance,
  userKnowledgeGraphInstance,
} from "../../services/knowledgeGraph.js";

// Domain Chromatic Colors matching Gemini aesthetic
export const DOMAIN_COLORS = {
  "Common Sense": [0.35, 0.75, 0.55, 1.0], // Sage Green (#59bf8c)
  "Artificial Intelligence": [0.15, 0.85, 0.65, 1.0], // Emerald Green (#26d9a6)
  "General Knowledge": [0.25, 0.65, 0.95, 1.0], // Sky Azure (#40a6f2)
  "Electronics": [0.18, 0.82, 0.95, 1.0], // Electric Cyan (#2ed1f2)
  "Arts & Aesthetics": [0.95, 0.45, 0.65, 1.0], // Rose Pink (#f273a6)
  "Life Lessons & Mental Models": [0.98, 0.72, 0.25, 1.0], // Gold Amber (#fab840)
  "Literature & Rhetoric": [0.65, 0.50, 0.95, 1.0], // Lavender Violet (#a680f2)
  "Philosophy": [0.95, 0.55, 0.35, 1.0], // Warm Ochre (#f28c59)
  "Culture & Mythology": [0.85, 0.40, 0.85, 1.0], // Royal Magenta (#d966d9)
  "Ecosystem": [0.40, 0.60, 0.95, 1.0], // Gemini Blue (#6699f2)
  "User KG": [0.608, 0.447, 0.796, 1.0], // Gemini Sparkle Purple (#9b72cb)
};

// Palette matching Gemini UI theme
const TYPE_COLORS = {
  USER_KG: [0.608, 0.447, 0.796, 1.0], // #9b72cb (Gemini Sparkle Purple)
  Person: [0.22, 0.741, 0.973, 1.0], // #38bdf8 (Sky Blue)
  Organization: [0.22, 0.741, 0.973, 1.0],
  Project: [0.204, 0.827, 0.6, 1.0], // #34d399 (Emerald Green)
  Tool: [0.204, 0.827, 0.6, 1.0],
  Technology: [0.259, 0.522, 0.957, 1.0], // #4285f4 (Gemini Blue)
  Concept: [0.506, 0.549, 0.973, 1.0], // #818cf8 (Indigo)
  Preference: [0.949, 0.659, 0.231, 1.0], // #f2a83b (Amber)
  Event: [0.851, 0.396, 0.439, 1.0], // #d96570 (Pink/Coral)
  File: [0.28, 0.72, 0.88, 1.0], // #47b8e0 (Cyan)
  Document: [0.38, 0.65, 0.98, 1.0], // #60a5fa (Ice Blue)
  Image: [0.85, 0.45, 0.78, 1.0], // #d973c7 (Magenta/Violet)
  Default: [0.89, 0.89, 0.89, 1.0], // #e3e3e3 (Primary text)
  Inactive: [0.373, 0.388, 0.408, 0.4], // #5f6368 (Muted)
};

const DOMAIN_FILTER_OPTIONS = [
  { id: "all", label: "All Knowledge" },
  { id: "user", label: "User KG" },
  { id: "ai", label: "AI", domainName: "Artificial Intelligence" },
  { id: "philosophy", label: "Philosophy", domainName: "Philosophy" },
  { id: "commonsense", label: "Common Sense", domainName: "Common Sense" },
  { id: "general", label: "General", domainName: "General Knowledge" },
  { id: "electronics", label: "Electronics", domainName: "Electronics" },
  { id: "arts", label: "Arts", domainName: "Arts & Aesthetics" },
  { id: "lifelessons", label: "Life Lessons", domainName: "Life Lessons & Mental Models" },
  { id: "literature", label: "Literature", domainName: "Literature & Rhetoric" },
  { id: "culture", label: "Culture", domainName: "Culture & Mythology" },
];

export default function GraphVisualizer({ isOpen, onClose }) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [is3D, setIs3D] = useState(false);
  const [filterSource, setFilterSource] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Ingest and merge nodes & relations from General KG + User KG
  const graphData = useMemo(() => {
    const generalEntities = Array.from(knowledgeGraphInstance.entities.values()).map((e) => ({
      ...e,
      graphSource: "general",
    }));
    const generalRelations = (knowledgeGraphInstance.relations || []).map((r) => ({
      ...r,
      graphSource: "general",
    }));

    const userEntities = Array.from(userKnowledgeGraphInstance.entities.values()).map((e) => ({
      ...e,
      graphSource: "user",
    }));
    const userRelations = (userKnowledgeGraphInstance.relations || []).map((r) => ({
      ...r,
      graphSource: "user",
    }));

    // Deduplicate entities by ID
    const entityMap = new Map();
    for (const e of [...generalEntities, ...userEntities]) {
      if (!entityMap.has(e.id)) {
        entityMap.set(e.id, e);
      }
    }

    // Deduplicate relations by ID or composite key
    const relationMap = new Map();
    for (const rel of [...generalRelations, ...userRelations]) {
      const compositeKey = rel.id || `rel_${rel.sourceId}_${rel.predicate}_${rel.targetId}`;
      if (!relationMap.has(compositeKey)) {
        relationMap.set(compositeKey, { ...rel, id: compositeKey });
      } else {
        // Keep active version if duplicate exists
        const existing = relationMap.get(compositeKey);
        if (rel.isActive && !existing.isActive) {
          relationMap.set(compositeKey, { ...rel, id: compositeKey });
        }
      }
    }

    let entities = Array.from(entityMap.values());
    let relations = Array.from(relationMap.values());

    // Filter by source / domain
    if (filterSource === "user") {
      entities = entities.filter((e) => e.graphSource === "user");
      relations = relations.filter((r) => r.graphSource === "user");
    } else if (filterSource !== "all") {
      const option = DOMAIN_FILTER_OPTIONS.find((opt) => opt.id === filterSource);
      if (option && option.domainName) {
        entities = entities.filter(
          (e) => (e.domain || e.attributes?.domain) === option.domainName
        );
        const validEntityIds = new Set(entities.map((e) => e.id));
        relations = relations.filter(
          (r) => validEntityIds.has(r.sourceId) && validEntityIds.has(r.targetId)
        );
      }
    }

    // Calculate node degree (number of connected edges)
    const degreeMap = new Map();
    for (const r of relations) {
      if (r.isActive !== false) {
        degreeMap.set(r.sourceId, (degreeMap.get(r.sourceId) || 0) + 1);
        degreeMap.set(r.targetId, (degreeMap.get(r.targetId) || 0) + 1);
      }
    }

    const indexedEntities = entities.map((e, index) => ({
      ...e,
      index,
      degree: degreeMap.get(e.id) || 0,
    }));

    const idToIndex = new Map(indexedEntities.map((e) => [e.id, e.index]));

    // Valid links where both source & target exist in indexedEntities
    const validLinks = [];
    for (const rel of relations) {
      const sIdx = idToIndex.get(rel.sourceId);
      const tIdx = idToIndex.get(rel.targetId);
      if (sIdx !== undefined && tIdx !== undefined) {
        validLinks.push({
          ...rel,
          sourceIndex: sIdx,
          targetIndex: tIdx,
        });
      }
    }

    return {
      entities: indexedEntities,
      relations: validLinks,
      idToIndex,
    };
  }, [filterSource, isOpen]);

  // 2. Initialize and configure CosmosGL Graph
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Clean up previous instance
    if (graphRef.current) {
      try {
        graphRef.current.destroy?.();
      } catch (e) {
        console.warn("[CosmosGL] Cleanup error:", e);
      }
      graphRef.current = null;
    }

    const { entities, relations } = graphData;
    const numPoints = entities.length;

    if (numPoints === 0) return;

    // Build Typed Arrays for Cosmos
    const pointPositions = new Float32Array(numPoints * 2);
    const pointColors = new Float32Array(numPoints * 4);
    const pointSizes = new Float32Array(numPoints);

    // Initial deterministic sunflower spiral layout (Fermat spiral with golden angle)
    // Prevents node collisions and explosive initial forces
    const centerX = 2048;
    const centerY = 2048;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees

    entities.forEach((entity, i) => {
      const theta = i * goldenAngle;
      const r = 28 * Math.sqrt(i + 1);
      pointPositions[i * 2] = centerX + Math.cos(theta) * r;
      pointPositions[i * 2 + 1] = centerY + Math.sin(theta) * r;

      // Color mapping
      let color = TYPE_COLORS.Default;
      if (entity.isActive === false) {
        color = TYPE_COLORS.Inactive;
      } else if (entity.graphSource === "user") {
        color = TYPE_COLORS.USER_KG;
      } else {
        const dom = entity.domain || entity.attributes?.domain;
        if (dom && DOMAIN_COLORS[dom]) {
          color = DOMAIN_COLORS[dom];
        } else {
          const mainType = entity.types?.[0] || "Default";
          color = TYPE_COLORS[mainType] || TYPE_COLORS.Default;
        }
      }

      pointColors[i * 4] = color[0];
      pointColors[i * 4 + 1] = color[1];
      pointColors[i * 4 + 2] = color[2];
      pointColors[i * 4 + 3] = color[3];

      // Point size based on degree
      pointSizes[i] = Math.max(12, Math.min(30, 12 + entity.degree * 2));
    });

    // Links Typed Arrays
    const numLinks = relations.length;
    const links = new Float32Array(numLinks * 2);
    const linkColors = new Float32Array(numLinks * 4);
    const linkArrows = [];

    relations.forEach((rel, i) => {
      links[i * 2] = rel.sourceIndex;
      links[i * 2 + 1] = rel.targetIndex;

      // Semi-transparent link matching chat secondary text
      const isInactive = rel.isActive === false;
      const alpha = isInactive ? 0.12 : 0.45;
      linkColors[i * 4] = 0.6;
      linkColors[i * 4 + 1] = 0.63;
      linkColors[i * 4 + 2] = 0.65;
      linkColors[i * 4 + 3] = alpha;

      linkArrows.push(true);
    });

    try {
      const cosmosGraph = new Graph(containerRef.current, {
        backgroundColor: "#131314", // Consistent chat dark background
        spaceSize: 4096,
        spaceDimensions: is3D ? 3 : 2,

        // Stabilized force-directed physics parameters:
        // 1. simulationFriction: lower value (0.22) = high damping, prevents perpetual oscillation & drifting
        simulationFriction: 0.22,
        // 2. simulationGravity: reduced (0.04) to avoid rubber-band tug-of-war with repulsion
        simulationGravity: 0.04,
        // 3. simulationRepulsion: balanced (0.55) to prevent explosive shaking
        simulationRepulsion: 0.55,
        // 4. simulationCenter: smooth center-of-mass anchor
        simulationCenter: 0.08,
        // 5. simulationDecay: cools down faster so nodes quickly settle into static equilibrium
        simulationDecay: 1200,
        // 6. simulationCollision: prevents overlapping nodes from bouncing
        simulationCollision: 0.6,
        simulationCollisionPadding: 6,
        simulationCollisionIterations: 2,
        // 7. simulationLinkSpring & distance: smooth elastic links
        simulationLinkSpring: 0.8,
        simulationLinkDistance: 45,

        curvedLinks: true,
        renderHoveredPointRing: true,
        hoveredPointRingColor: "#4285f4",
        pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
        showFPSMonitor: false,
        onPointClick: (pointIndex) => {
          if (pointIndex !== undefined && entities[pointIndex]) {
            const node = entities[pointIndex];
            setSelectedNode(node);
            cosmosGraph.zoomToPointByIndex(pointIndex, 400, 2.5);
          }
        },
        onBackgroundClick: () => {
          setSelectedNode(null);
        },
      });

      cosmosGraph.setPointPositions(pointPositions);
      cosmosGraph.setPointColors(pointColors);
      cosmosGraph.setPointSizes(pointSizes);
      cosmosGraph.setLinks(links);
      cosmosGraph.setLinkColors(linkColors);
      cosmosGraph.setLinkArrows(linkArrows);

      // Render with moderate initial alpha so it settles smoothly without shockwaves
      cosmosGraph.render(0.6);
      cosmosGraph.fitView(400, 0.15);

      graphRef.current = cosmosGraph;
    } catch (err) {
      console.error("[CosmosGL] Failed to initialize Graph:", err);
    }

    return () => {
      if (graphRef.current) {
        try {
          graphRef.current.destroy?.();
        } catch (e) {
          console.warn("[CosmosGL] Destroy error:", e);
        }
        graphRef.current = null;
      }
    };
  }, [graphData, isOpen, is3D]);

  // Controls
  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      const current = graphRef.current.getZoomLevel() || 1;
      graphRef.current.zoom(current * 1.35, 200);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      const current = graphRef.current.getZoomLevel() || 1;
      graphRef.current.zoom(current * 0.75, 200);
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.fitView(300, 0.15);
    }
  }, []);

  const handleToggle3D = useCallback(() => {
    setIs3D((prev) => !prev);
  }, []);

  const handleSelectNeighbor = useCallback(
    (neighborId) => {
      const targetIndex = graphData.idToIndex.get(neighborId);
      if (targetIndex !== undefined && graphData.entities[targetIndex]) {
        const node = graphData.entities[targetIndex];
        setSelectedNode(node);
        if (graphRef.current) {
          graphRef.current.zoomToPointByIndex(targetIndex, 400, 2.5);
        }
      }
    },
    [graphData]
  );

  // Search node filter & jump
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const term = searchTerm.toLowerCase().trim();
    const found = graphData.entities.find(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        (e.description && e.description.toLowerCase().includes(term))
    );
    if (found) {
      setSelectedNode(found);
      if (graphRef.current) {
        graphRef.current.zoomToPointByIndex(found.index, 400, 2.5);
      }
    }
  };

  // Connected relations for selected node
  const selectedNodeRelations = useMemo(() => {
    if (!selectedNode) return { outgoing: [], incoming: [] };
    const outgoing = graphData.relations.filter((r) => r.sourceId === selectedNode.id);
    const incoming = graphData.relations.filter((r) => r.targetId === selectedNode.id);
    return { outgoing, incoming };
  }, [selectedNode, graphData.relations]);

  if (!isOpen) return null;

  return (
    <div className="graph-visualizer-fullscreen">
      {/* Top Header Bar */}
      <div className="graph-topbar">
        <div className="graph-topbar-left">
          <button className="btn-graph-back" onClick={onClose} title="Back to Chat">
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="graph-title-block">
            <span className="graph-title-heading">GraphRAG Knowledge Graph</span>
            <span className="graph-stats-pill">
              {graphData.entities.length} Entities • {graphData.relations.length} Relations
            </span>
          </div>
        </div>

        {/* Source & Domain Filter Switcher */}
        <div className="graph-filter-pills-scrollable">
          {DOMAIN_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`graph-filter-pill ${filterSource === opt.id ? "active" : ""}`}
              onClick={() => setFilterSource(opt.id)}
            >
              {opt.id === "user" && <Sparkles size={12} />}
              {opt.id === "all" && <Share2 size={12} />}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Top Right Controls & Search */}
        <div className="graph-topbar-right">
          <form onSubmit={handleSearchSubmit} className="graph-search-form">
            <input
              type="text"
              placeholder="Search node..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="graph-search-input"
            />
          </form>

          <button
            className={`graph-action-icon-btn ${is3D ? "active" : ""}`}
            onClick={handleToggle3D}
            title={is3D ? "Switch to 2D Mode" : "Switch to 3D Orbit Mode"}
          >
            <span style={{ fontSize: "11px", fontWeight: "bold" }}>{is3D ? "3D" : "2D"}</span>
          </button>

          <button
            className="graph-action-icon-btn"
            onClick={handleFitView}
            title="Fit Graph to View"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Graph Canvas Container */}
      <div className="graph-canvas-container" ref={containerRef}>
        {graphData.entities.length === 0 && (
          <div className="graph-empty-message">
            <Share2 size={40} className="graph-empty-icon" />
            <h3>No Graph Data Available</h3>
            <p>
              As you chat with Gemma, factual entities and semantic relationships will
              automatically populate here.
            </p>
          </div>
        )}
      </div>

      {/* Floating Zoom Controls (Bottom Right) */}
      <div className="graph-floating-controls">
        <button
          className="graph-zoom-btn"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="graph-zoom-btn"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="graph-zoom-btn"
          onClick={handleFitView}
          title="Reset / Center View"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Node Inspection Card / Drawer */}
      {selectedNode && (
        <div className="graph-node-card">
          <div className="graph-node-card-header">
            <div className="graph-node-title-group">
              <div className="graph-badge-row" style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span
                  className={`graph-source-badge ${
                    selectedNode.graphSource === "user" ? "user-kg" : "general-kg"
                  }`}
                >
                  {selectedNode.graphSource === "user" ? "User Knowledge" : "General Knowledge"}
                </span>
                {(selectedNode.domain || selectedNode.attributes?.domain) && (
                  <span
                    className="graph-source-badge"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#e2e8f0",
                    }}
                  >
                    {selectedNode.domain || selectedNode.attributes?.domain}
                  </span>
                )}
              </div>
              <h3 className="graph-node-name">{selectedNode.name}</h3>
            </div>
            <button
              className="graph-card-close-btn"
              onClick={() => setSelectedNode(null)}
              title="Close inspection"
            >
              <X size={16} />
            </button>
          </div>

          <div className="graph-node-card-body">
            {/* Category / Types */}
            <div className="graph-node-meta-row">
              <span className="graph-meta-label">Category:</span>
              <div className="graph-type-chips">
                {(selectedNode.types || ["Concept"]).map((t) => (
                  <span key={t} className="graph-type-chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            {selectedNode.description && (
              <p className="graph-node-desc">{selectedNode.description}</p>
            )}

            {/* Inactive Notice */}
            {selectedNode.isActive === false && (
              <div className="graph-soft-deleted-notice">
                Soft-deleted (<code>isActive: false</code>)
              </div>
            )}

            {/* Connected Outgoing Relations */}
            {selectedNodeRelations.outgoing.length > 0 && (
              <div className="graph-relations-section">
                <div className="graph-relations-title">Outgoing Relations</div>
                <div className="graph-relations-list">
                  {selectedNodeRelations.outgoing.map((rel, idx) => (
                    <div
                      key={`out_${rel.id || rel.predicate}_${rel.targetId}_${idx}`}
                      className="graph-relation-item"
                      onClick={() => handleSelectNeighbor(rel.targetId)}
                      title={`Jump to ${rel.targetName}`}
                    >
                      <span className="graph-pred-badge">{rel.predicate}</span>
                      <span className="graph-target-name">{rel.targetName}</span>
                      <ChevronRight size={14} className="graph-arrow-icon" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Incoming Relations */}
            {selectedNodeRelations.incoming.length > 0 && (
              <div className="graph-relations-section">
                <div className="graph-relations-title">Incoming Relations</div>
                <div className="graph-relations-list">
                  {selectedNodeRelations.incoming.map((rel, idx) => (
                    <div
                      key={`in_${rel.id || rel.predicate}_${rel.sourceId}_${idx}`}
                      className="graph-relation-item"
                      onClick={() => handleSelectNeighbor(rel.sourceId)}
                      title={`Jump to ${rel.sourceName}`}
                    >
                      <span className="graph-source-name">{rel.sourceName}</span>
                      <span className="graph-pred-badge incoming">{rel.predicate}</span>
                      <ChevronRight size={14} className="graph-arrow-icon" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
