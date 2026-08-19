import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Graph } from "@cosmograph/cosmos";
import {
  knowledgeGraphInstance,
  userKnowledgeGraphInstance,
  ENTITY_TYPES,
} from "../../services/knowledgeGraph.js";
import {
  X,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Layers,
  Box,
  RefreshCw,
  Eye,
  Tag,
  Network,
  Share2,
  Sparkles,
  User,
  Globe,
  ChevronRight,
  ExternalLink,
} from "../Icons/index.jsx";

// Color palette mapping based on Entity Type
const TYPE_COLOR_MAP = {
  Person: { hex: "#60a5fa", rgba: [0.376, 0.647, 0.98, 1.0], label: "Person" },
  Organization: { hex: "#fbbf24", rgba: [0.984, 0.749, 0.141, 1.0], label: "Organization" },
  Project: { hex: "#a78bfa", rgba: [0.655, 0.545, 0.98, 1.0], label: "Project" },
  Technology: { hex: "#34d399", rgba: [0.204, 0.827, 0.6, 1.0], label: "Technology" },
  Concept: { hex: "#38bdf8", rgba: [0.22, 0.741, 0.973, 1.0], label: "Concept" },
  Preference: { hex: "#f472b6", rgba: [0.957, 0.447, 0.714, 1.0], label: "Preference" },
  Location: { hex: "#fb923c", rgba: [0.984, 0.573, 0.235, 1.0], label: "Location" },
  Tool: { hex: "#e879f9", rgba: [0.91, 0.475, 0.976, 1.0], label: "Tool" },
  Event: { hex: "#facc15", rgba: [0.98, 0.8, 0.082, 1.0], label: "Event" },
  Default: { hex: "#94a3b8", rgba: [0.58, 0.64, 0.72, 1.0], label: "General" },
};

function getNodeColor(types = []) {
  if (Array.isArray(types) && types.length > 0) {
    for (const t of types) {
      if (TYPE_COLOR_MAP[t]) return TYPE_COLOR_MAP[t];
    }
  }
  return TYPE_COLOR_MAP.Default;
}

export default function GraphVisualizerModal({
  isOpen,
  onClose,
  initialMode = "all", // "all" | "general" | "user"
}) {
  const containerRef = useRef(null);
  const cosmosRef = useRef(null);

  const [graphMode, setGraphMode] = useState(initialMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [is3D, setIs3D] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);
  const [graphStats, setGraphStats] = useState({ nodesCount: 0, linksCount: 0 });

  // 1. Gather active entities & relations based on selected mode
  const { nodes, links, nodeIndexMap } = useMemo(() => {
    if (!isOpen) return { nodes: [], links: [], nodeIndexMap: new Map() };

    let rawEntities = [];
    let rawRelations = [];

    if (graphMode === "all" || graphMode === "general") {
      const genEntities = Array.from(knowledgeGraphInstance.entities.values())
        .filter((e) => e.isActive !== false)
        .map((e) => ({ ...e, sourceGraph: "general" }));
      const genRelations = knowledgeGraphInstance.relations
        .filter((r) => r.isActive !== false)
        .map((r) => ({ ...r, sourceGraph: "general" }));
      rawEntities.push(...genEntities);
      rawRelations.push(...genRelations);
    }

    if (graphMode === "all" || graphMode === "user") {
      const userEntities = Array.from(userKnowledgeGraphInstance.entities.values())
        .filter((e) => e.isActive !== false)
        .map((e) => ({ ...e, sourceGraph: "user" }));
      const userRelations = userKnowledgeGraphInstance.relations
        .filter((r) => r.isActive !== false)
        .map((r) => ({ ...r, sourceGraph: "user" }));

      // Deduplicate by ID if in "all" mode
      for (const ue of userEntities) {
        if (!rawEntities.some((e) => e.id === ue.id)) {
          rawEntities.push(ue);
        }
      }
      for (const ur of userRelations) {
        if (!rawRelations.some((r) => r.id === ur.id)) {
          rawRelations.push(ur);
        }
      }
    }

    // Apply Type Filter if set
    let filteredEntities = rawEntities;
    if (selectedTypeFilter !== "ALL") {
      filteredEntities = rawEntities.filter((e) =>
        e.types?.some((t) => t.toLowerCase() === selectedTypeFilter.toLowerCase())
      );
    }

    const indexMap = new Map();
    filteredEntities.forEach((node, idx) => {
      indexMap.set(node.id, idx);
      // Also map names for fuzzy link resolution
      indexMap.set(node.name.toLowerCase(), idx);
    });

    // Resolve Links (edges) between indexed nodes
    const validLinks = [];
    for (const rel of rawRelations) {
      const srcIdx =
        indexMap.get(rel.source) ??
        indexMap.get(rel.sourceId) ??
        indexMap.get((rel.sourceName || "").toLowerCase());
      const tgtIdx =
        indexMap.get(rel.target) ??
        indexMap.get(rel.targetId) ??
        indexMap.get((rel.targetName || "").toLowerCase());

      if (srcIdx !== undefined && tgtIdx !== undefined && srcIdx !== tgtIdx) {
        validLinks.push({
          ...rel,
          sourceIndex: srcIdx,
          targetIndex: tgtIdx,
        });
      }
    }

    return {
      nodes: filteredEntities,
      links: validLinks,
      nodeIndexMap: indexMap,
    };
  }, [isOpen, graphMode, selectedTypeFilter]);

  // Compute node connection degrees
  const nodeDegrees = useMemo(() => {
    const degrees = new Array(nodes.length).fill(0);
    for (const link of links) {
      if (degrees[link.sourceIndex] !== undefined) degrees[link.sourceIndex]++;
      if (degrees[link.targetIndex] !== undefined) degrees[link.targetIndex]++;
    }
    return degrees;
  }, [nodes, links]);

  // Sync Stats
  useEffect(() => {
    setGraphStats({
      nodesCount: nodes.length,
      linksCount: links.length,
    });
  }, [nodes, links]);

  // 2. Initialize and Update CosmosGL Graph
  const initCosmosGraph = useCallback(() => {
    if (!containerRef.current || !isOpen) return;

    // Clean up previous instance if exists
    if (cosmosRef.current) {
      try {
        cosmosRef.current.destroy();
      } catch (e) {
        console.warn("[CosmosGL] Cleanup warning:", e);
      }
      cosmosRef.current = null;
    }

    // Clear any residual children in container
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    if (nodes.length === 0) return;

    try {
      const graphConfig = {
        backgroundColor: "#0b0f17",
        spaceSize: 4096,
        spaceDimensions: is3D ? 3 : 2,
        enableSimulation: isSimulating,
        renderLinks: true,
        linkDefaultColor: "#334155",
        linkOpacity: 0.65,
        linkGreyoutOpacity: 0.06,
        focusedLinkWidthIncrease: 3,
        pointDefaultColor: "#94a3b8",
        pointGreyoutOpacity: 0.12,
        renderHoveredPointRing: true,
        hoveredPointRingColor: "#ffffff",
        focusedPointRingColor: "#818cf8",
        hoveredPointCursor: "pointer",

        onPointClick: (index, pointPos, event) => {
          if (index !== undefined && nodes[index]) {
            const clickedNode = nodes[index];
            setSelectedNode(clickedNode);
            setSelectedLink(null);

            // Highlight node & its 1-hop connected neighbors
            if (cosmosRef.current) {
              const neighborIndices = cosmosRef.current.getNeighboringPointIndices(index);
              const connectedLinkIndices = cosmosRef.current.getConnectedLinkIndices([
                index,
                ...neighborIndices,
              ]);

              cosmosRef.current.setConfigPartial({
                focusedPointIndex: index,
                highlightedPointIndices: [index, ...neighborIndices],
                highlightedLinkIndices: connectedLinkIndices,
              });

              cosmosRef.current.zoomToPointByIndex(index, 600, 2.2);
            }
          }
        },

        onLinkClick: (linkIndex, event) => {
          if (linkIndex !== undefined && links[linkIndex]) {
            const clickedLink = links[linkIndex];
            setSelectedLink(clickedLink);
            setSelectedNode(null);

            if (cosmosRef.current) {
              cosmosRef.current.setConfigPartial({
                focusedLinkIndex: linkIndex,
                highlightedPointIndices: [clickedLink.sourceIndex, clickedLink.targetIndex],
                highlightedLinkIndices: [linkIndex],
              });
            }
          }
        },

        onBackgroundClick: () => {
          setSelectedNode(null);
          setSelectedLink(null);
          if (cosmosRef.current) {
            cosmosRef.current.setConfigPartial({
              focusedPointIndex: undefined,
              focusedLinkIndex: undefined,
              highlightedPointIndices: undefined,
              highlightedLinkIndices: undefined,
            });
          }
        },

        onPointMouseOver: (index, pointPos, event) => {
          if (index !== undefined && nodes[index]) {
            setHoveredNode(nodes[index]);
            if (event && event.clientX) {
              setTooltipPos({ x: event.clientX, y: event.clientY });
            }
          }
        },

        onPointMouseOut: () => {
          setHoveredNode(null);
        },
      };

      const cosmos = new Graph(containerRef.current, graphConfig);
      cosmosRef.current = cosmos;

      // 1. Prepare Point Colors (Float32Array [r, g, b, a, ...])
      const pointColors = new Float32Array(nodes.length * 4);
      const pointSizes = new Float32Array(nodes.length);

      nodes.forEach((node, idx) => {
        const colorObj = getNodeColor(node.types);
        pointColors[idx * 4 + 0] = colorObj.rgba[0];
        pointColors[idx * 4 + 1] = colorObj.rgba[1];
        pointColors[idx * 4 + 2] = colorObj.rgba[2];
        pointColors[idx * 4 + 3] = colorObj.rgba[3];

        // Dynamic point size scaled by connections (8px to 26px)
        const degree = nodeDegrees[idx] || 0;
        pointSizes[idx] = Math.max(8, Math.min(26, 9 + degree * 2.2));
      });

      cosmos.setPointColors(pointColors);
      cosmos.setPointSizes(pointSizes);

      // 2. Prepare Links (Float32Array [src0, tgt0, src1, tgt1, ...])
      if (links.length > 0) {
        const linkIndices = new Float32Array(links.length * 2);
        const linkColors = new Float32Array(links.length * 4);
        const linkArrows = new Array(links.length).fill(true);
        const linkWidths = new Float32Array(links.length).fill(1.6);

        links.forEach((link, idx) => {
          linkIndices[idx * 2 + 0] = link.sourceIndex;
          linkIndices[idx * 2 + 1] = link.targetIndex;

          // Subtle neon link color
          linkColors[idx * 4 + 0] = 0.38; // r
          linkColors[idx * 4 + 1] = 0.45; // g
          linkColors[idx * 4 + 2] = 0.58; // b
          linkColors[idx * 4 + 3] = 0.65; // a
        });

        cosmos.setLinks(linkIndices);
        cosmos.setLinkColors(linkColors);
        cosmos.setLinkArrows(linkArrows);
        cosmos.setLinkWidths(linkWidths);
      }

      // Initial Render & Fit
      cosmos.render();
      setTimeout(() => {
        if (cosmosRef.current) {
          cosmosRef.current.fitView(400, 0.15);
        }
      }, 150);
    } catch (err) {
      console.error("[CosmosGL] Failed to initialize WebGL graph:", err);
    }
  }, [isOpen, nodes, links, nodeDegrees, is3D, isSimulating]);

  useEffect(() => {
    initCosmosGraph();

    return () => {
      if (cosmosRef.current) {
        try {
          cosmosRef.current.destroy();
        } catch (e) {
          console.warn("[CosmosGL] Teardown warning:", e);
        }
        cosmosRef.current = null;
      }
    };
  }, [initCosmosGraph]);

  // Handle Live Search Filtering & Zoom
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (!cosmosRef.current || nodes.length === 0) return;

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      cosmosRef.current.setConfigPartial({
        highlightedPointIndices: undefined,
        highlightedLinkIndices: undefined,
        focusedPointIndex: undefined,
      });
      return;
    }

    const matchedIndices = [];
    nodes.forEach((node, idx) => {
      if (
        node.name.toLowerCase().includes(trimmed) ||
        node.types?.some((t) => t.toLowerCase().includes(trimmed)) ||
        node.aliases?.some((a) => a.toLowerCase().includes(trimmed))
      ) {
        matchedIndices.push(idx);
      }
    });

    if (matchedIndices.length > 0) {
      cosmosRef.current.setConfigPartial({
        highlightedPointIndices: matchedIndices,
        focusedPointIndex: matchedIndices[0],
      });
      cosmosRef.current.zoomToPointByIndex(matchedIndices[0], 500, 2.2);
      setSelectedNode(nodes[matchedIndices[0]]);
    } else {
      cosmosRef.current.setConfigPartial({
        highlightedPointIndices: [],
      });
    }
  };

  // View Control Actions
  const handleZoomIn = () => {
    if (cosmosRef.current) {
      const currentZoom = cosmosRef.current.getZoomLevel() || 1;
      cosmosRef.current.zoom(currentZoom * 1.35, 250);
    }
  };

  const handleZoomOut = () => {
    if (cosmosRef.current) {
      const currentZoom = cosmosRef.current.getZoomLevel() || 1;
      cosmosRef.current.zoom(currentZoom * 0.7, 250);
    }
  };

  const handleFitView = () => {
    if (cosmosRef.current) {
      cosmosRef.current.fitView(350, 0.15);
    }
  };

  const handleToggle3D = () => {
    const next3D = !is3D;
    setIs3D(next3D);
    if (cosmosRef.current) {
      cosmosRef.current.setConfigPartial({ spaceDimensions: next3D ? 3 : 2 });
      setTimeout(() => cosmosRef.current?.fitView(300, 0.15), 100);
    }
  };

  const handleToggleSimulation = () => {
    const nextSim = !isSimulating;
    setIsSimulating(nextSim);
    if (cosmosRef.current) {
      cosmosRef.current.setConfigPartial({ enableSimulation: nextSim });
    }
  };

  const handleSelectNeighbor = (neighborId) => {
    const targetIdx = nodeIndexMap.get(neighborId) ?? nodeIndexMap.get(neighborId.toLowerCase());
    if (targetIdx !== undefined && nodes[targetIdx] && cosmosRef.current) {
      const targetNode = nodes[targetIdx];
      setSelectedNode(targetNode);
      const neighborIndices = cosmosRef.current.getNeighboringPointIndices(targetIdx);
      const connectedLinkIndices = cosmosRef.current.getConnectedLinkIndices([
        targetIdx,
        ...neighborIndices,
      ]);

      cosmosRef.current.setConfigPartial({
        focusedPointIndex: targetIdx,
        highlightedPointIndices: [targetIdx, ...neighborIndices],
        highlightedLinkIndices: connectedLinkIndices,
      });

      cosmosRef.current.zoomToPointByIndex(targetIdx, 600, 2.2);
    }
  };

  if (!isOpen) return null;

  // Compute active node's outgoing & incoming connections
  let nodeOutgoingRelations = [];
  let nodeIncomingRelations = [];
  if (selectedNode) {
    const selectedIdx = nodeIndexMap.get(selectedNode.id);
    if (selectedIdx !== undefined) {
      nodeOutgoingRelations = links.filter((l) => l.sourceIndex === selectedIdx);
      nodeIncomingRelations = links.filter((l) => l.targetIndex === selectedIdx);
    }
  }

  const categoryTypes = ["ALL", "Person", "Organization", "Project", "Technology", "Concept", "Preference", "Tool"];

  return (
    <div className="graph-modal-backdrop" onClick={onClose}>
      <div className="graph-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Top Floating Glass Header */}
        <header className="graph-header-bar">
          <div className="graph-header-left">
            <div className="graph-title-badge">
              <Sparkles size={16} className="sparkle-icon" />
              <span>CosmosGL Graph Visualizer</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="graph-mode-pills">
              <button
                className={`graph-mode-pill ${graphMode === "all" ? "active" : ""}`}
                onClick={() => setGraphMode("all")}
                title="View combined General & User Knowledge Graphs"
              >
                <Layers size={13} />
                <span>All Knowledge</span>
              </button>
              <button
                className={`graph-mode-pill ${graphMode === "general" ? "active" : ""}`}
                onClick={() => setGraphMode("general")}
                title="View General Knowledge Graph"
              >
                <Globe size={13} />
                <span>General KG</span>
              </button>
              <button
                className={`graph-mode-pill ${graphMode === "user" ? "active" : ""}`}
                onClick={() => setGraphMode("user")}
                title="View User Personalization Knowledge Graph"
              >
                <User size={13} />
                <span>User Memory</span>
              </button>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="graph-search-container">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search or highlight nodes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="graph-search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => handleSearchChange("")}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Controls & Close */}
          <div className="graph-header-actions">
            <div className="graph-stats-chip">
              <strong>{graphStats.nodesCount}</strong> nodes • <strong>{graphStats.linksCount}</strong> edges
            </div>

            <button
              className={`graph-action-btn ${is3D ? "active" : ""}`}
              onClick={handleToggle3D}
              title={is3D ? "Switch to 2D Mode" : "Switch to 3D Orbit Mode"}
            >
              <Box size={16} />
              <span className="btn-label">{is3D ? "3D" : "2D"}</span>
            </button>

            <button
              className={`graph-action-btn ${isSimulating ? "active" : ""}`}
              onClick={handleToggleSimulation}
              title={isSimulating ? "Pause Physics Simulation" : "Resume Physics Simulation"}
            >
              {isSimulating ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <button className="graph-action-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={16} />
            </button>

            <button className="graph-action-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={16} />
            </button>

            <button className="graph-action-btn" onClick={handleFitView} title="Fit Entire Graph to View">
              <Maximize2 size={15} />
            </button>

            <button className="graph-close-btn" onClick={onClose} title="Close Visualizer">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Category Filter Chips Bar */}
        <div className="graph-category-filter-bar">
          <span className="filter-label">Filter:</span>
          {categoryTypes.map((type) => {
            const colorObj = TYPE_COLOR_MAP[type] || TYPE_COLOR_MAP.Default;
            return (
              <button
                key={type}
                className={`graph-type-filter-chip ${selectedTypeFilter === type ? "active" : ""}`}
                onClick={() => setSelectedTypeFilter(type)}
                style={{
                  "--type-color": colorObj.hex,
                }}
              >
                {type !== "ALL" && (
                  <span
                    className="type-dot"
                    style={{ backgroundColor: colorObj.hex }}
                  />
                )}
                <span>{type}</span>
              </button>
            );
          })}
        </div>

        {/* CosmosGL WebGL Canvas Viewport */}
        <div className="graph-viewport-wrapper">
          <div ref={containerRef} className="cosmos-canvas-container" />

          {/* Empty State if No Nodes */}
          {nodes.length === 0 && (
            <div className="graph-empty-state">
              <Network size={44} className="empty-icon" />
              <h3>No Knowledge Graph Nodes Found</h3>
              <p>
                Start chatting with Gemma 31B, or enable Knowledge Graph tools in Settings to generate semantic entities and relationships.
              </p>
            </div>
          )}

          {/* Hover Floating Tooltip */}
          {hoveredNode && !selectedNode && (
            <div
              className="graph-hover-tooltip"
              style={{
                left: `${Math.min(window.innerWidth - 220, tooltipPos.x + 15)}px`,
                top: `${Math.min(window.innerHeight - 100, tooltipPos.y + 15)}px`,
              }}
            >
              <div className="tooltip-title">{hoveredNode.name}</div>
              <div className="tooltip-types">
                {(hoveredNode.types || ["Concept"]).map((t) => (
                  <span
                    key={t}
                    className="tooltip-type-badge"
                    style={{ backgroundColor: `${getNodeColor([t]).hex}25`, color: getNodeColor([t]).hex }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {hoveredNode.description && (
                <div className="tooltip-desc">{hoveredNode.description.slice(0, 100)}...</div>
              )}
            </div>
          )}

          {/* Selected Node Inspector Drawer (Desktop & Mobile Friendly) */}
          {selectedNode && (
            <aside className="graph-inspector-drawer">
              <div className="inspector-header">
                <div className="inspector-badge-row">
                  <span
                    className="inspector-type-tag"
                    style={{
                      backgroundColor: `${getNodeColor(selectedNode.types).hex}25`,
                      color: getNodeColor(selectedNode.types).hex,
                      borderColor: `${getNodeColor(selectedNode.types).hex}50`,
                    }}
                  >
                    {selectedNode.types?.[0] || "Concept"}
                  </span>
                  <span className="inspector-source-tag">
                    {selectedNode.sourceGraph === "user" ? "User Memory" : "General KG"}
                  </span>
                </div>
                <button
                  className="inspector-close-btn"
                  onClick={() => {
                    setSelectedNode(null);
                    if (cosmosRef.current) {
                      cosmosRef.current.setConfigPartial({
                        focusedPointIndex: undefined,
                        highlightedPointIndices: undefined,
                        highlightedLinkIndices: undefined,
                      });
                    }
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <h2 className="inspector-node-title">{selectedNode.name}</h2>

              {selectedNode.description && (
                <p className="inspector-description">{selectedNode.description}</p>
              )}

              {/* Aliases */}
              {selectedNode.aliases && selectedNode.aliases.length > 0 && (
                <div className="inspector-section">
                  <div className="section-label">Aliases</div>
                  <div className="alias-tags">
                    {selectedNode.aliases.map((alias) => (
                      <span key={alias} className="alias-tag">
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing Relations */}
              {nodeOutgoingRelations.length > 0 && (
                <div className="inspector-section">
                  <div className="section-label">
                    Outgoing Relationships ({nodeOutgoingRelations.length})
                  </div>
                  <div className="relations-list">
                    {nodeOutgoingRelations.map((rel, i) => {
                      const targetEntity = nodes[rel.targetIndex];
                      return (
                        <div
                          key={rel.id || i}
                          className="relation-item"
                          onClick={() => targetEntity && handleSelectNeighbor(targetEntity.id)}
                        >
                          <span className="relation-predicate">--[{rel.predicate}]--&gt;</span>
                          <span className="relation-target">{targetEntity?.name || rel.targetName || "Node"}</span>
                          <ChevronRight size={13} className="relation-arrow" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Incoming Relations */}
              {nodeIncomingRelations.length > 0 && (
                <div className="inspector-section">
                  <div className="section-label">
                    Incoming Relationships ({nodeIncomingRelations.length})
                  </div>
                  <div className="relations-list">
                    {nodeIncomingRelations.map((rel, i) => {
                      const sourceEntity = nodes[rel.sourceIndex];
                      return (
                        <div
                          key={rel.id || i}
                          className="relation-item"
                          onClick={() => sourceEntity && handleSelectNeighbor(sourceEntity.id)}
                        >
                          <span className="relation-target">{sourceEntity?.name || rel.sourceName || "Node"}</span>
                          <span className="relation-predicate">--[{rel.predicate}]--&gt;</span>
                          <ChevronRight size={13} className="relation-arrow" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attributes Metadata */}
              {selectedNode.attributes && Object.keys(selectedNode.attributes).length > 0 && (
                <div className="inspector-section">
                  <div className="section-label">Attributes</div>
                  <div className="attributes-grid">
                    {Object.entries(selectedNode.attributes).map(([key, val]) => (
                      <div key={key} className="attribute-row">
                        <span className="attr-key">{key}:</span>
                        <span className="attr-val">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* Selected Link Detail Card */}
          {selectedLink && (
            <aside className="graph-inspector-drawer link-mode">
              <div className="inspector-header">
                <span className="inspector-type-tag relation">Semantic Triple</span>
                <button className="inspector-close-btn" onClick={() => setSelectedLink(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="triple-display-box">
                <span className="triple-node source">{nodes[selectedLink.sourceIndex]?.name || selectedLink.sourceName}</span>
                <span className="triple-arrow">--[{selectedLink.predicate}]--&gt;</span>
                <span className="triple-node target">{nodes[selectedLink.targetIndex]?.name || selectedLink.targetName}</span>
              </div>

              {selectedLink.description && (
                <p className="inspector-description">{selectedLink.description}</p>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
