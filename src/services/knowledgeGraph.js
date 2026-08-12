/**
 * Multi-View Knowledge Graph Engine (Semantic, Causal, Chronic)
 * 
 * Supports 3 synchronized graph representations:
 * 1. Semantic Graph: Nodes connected by Top-K closest semantic similarity (TF-IDF cosine).
 * 2. Causal Graph: Nodes connected in sequential conversation/chat turn order.
 * 3. Chronic Graph: Nodes connected in global chronological creation order.
 */

// Tokenizer & stop words for lightweight TF-IDF n-gram vectorization
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "did", "do", "does", "doing", "don't", "down", "during", "each", "few", "for",
  "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers",
  "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it",
  "its", "itself", "let's", "me", "more", "most", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
  "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
  "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
  "these", "they", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "we", "were", "what", "when", "where", "which", "while", "who",
  "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function computeTermFrequency(tokens) {
  const tf = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  const total = tokens.length || 1;
  const normalized = new Map();
  for (const [term, count] of tf.entries()) {
    normalized.set(term, count / total);
  }
  return normalized;
}

function cosineSimilarity(tf1, tf2) {
  if (!tf1 || !tf2) return 0;
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const [term, val1] of tf1.entries()) {
    mag1 += val1 * val1;
    if (tf2.has(term)) {
      dotProduct += val1 * tf2.get(term);
    }
  }

  for (const [, val2] of tf2.entries()) {
    mag2 += val2 * val2;
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

export class KnowledgeGraphStore {
  constructor(name = "knowledge_graph", options = {}) {
    this.name = name;
    this.topKSemantic = options.topKSemantic || 3;
    this.semanticThreshold = options.semanticThreshold || 0.15;
    this.nodes = new Map(); // id -> Node
    this.lastNodeIdBySession = new Map(); // sessionId -> lastNodeId
    this.lastChronicNodeId = null; // Global timeline tail
  }

  /**
   * Adds a new knowledge node to the 3 graph representations.
   */
  addNode(content, metadata = {}, sessionId = "global") {
    if (!content || typeof content !== "string" || !content.trim()) {
      throw new Error("Node content must be a non-empty string");
    }

    const id = `kg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    const tokens = tokenize(content);
    const tf = computeTermFrequency(tokens);

    const node = {
      id,
      content: content.trim(),
      metadata,
      sessionId,
      timestamp,
      tokens,
      tf,
      edges: {
        semantic: [], // [{ targetId, weight }]
        causal: {
          predecessors: [], // Node IDs that preceded this in the conversation
          successors: [],   // Node IDs that followed this
        },
        chronic: {
          prev: null,       // Immediate prior node in global chronological timeline
          next: null,       // Immediate following node
        },
      },
    };

    // 1. Semantic Graph: Calculate Top-K similarity edges with existing nodes
    const similarities = [];
    for (const [existingId, existingNode] of this.nodes.entries()) {
      const sim = cosineSimilarity(tf, existingNode.tf);
      if (sim >= this.semanticThreshold) {
        similarities.push({ targetId: existingId, weight: parseFloat(sim.toFixed(4)) });
      }
    }

    similarities.sort((a, b) => b.weight - a.weight);
    const topSemantic = similarities.slice(0, this.topKSemantic);

    node.edges.semantic = topSemantic;

    // Create bidirectional links for semantic neighbors
    for (const edge of topSemantic) {
      const targetNode = this.nodes.get(edge.targetId);
      if (targetNode) {
        if (!targetNode.edges.semantic.some((e) => e.targetId === id)) {
          targetNode.edges.semantic.push({ targetId: id, weight: edge.weight });
          targetNode.edges.semantic.sort((a, b) => b.weight - a.weight);
        }
      }
    }

    // 2. Causal Graph: Connect to previous turn node in the same session
    const prevCausalId = this.lastNodeIdBySession.get(sessionId);
    if (prevCausalId && this.nodes.has(prevCausalId)) {
      node.edges.causal.predecessors.push(prevCausalId);
      const prevNode = this.nodes.get(prevCausalId);
      prevNode.edges.causal.successors.push(id);
    }
    this.lastNodeIdBySession.set(sessionId, id);

    // 3. Chronic Graph: Connect in global chronological timeline
    if (this.lastChronicNodeId && this.nodes.has(this.lastChronicNodeId)) {
      node.edges.chronic.prev = this.lastChronicNodeId;
      const lastChronicNode = this.nodes.get(this.lastChronicNodeId);
      lastChronicNode.edges.chronic.next = id;
    }
    this.lastChronicNodeId = id;

    // Store node
    this.nodes.set(id, node);

    return {
      id,
      content: node.content,
      timestamp,
      semanticEdgesCount: node.edges.semantic.length,
      causalPredecessorsCount: node.edges.causal.predecessors.length,
      chronicPrev: node.edges.chronic.prev,
    };
  }

  /**
   * Search nodes by semantic cosine similarity against a query.
   */
  searchSemantic(query, limit = 5) {
    if (!query) return [];
    const queryLower = query.toLowerCase().trim();
    const queryTokens = tokenize(query);
    const queryTf = computeTermFrequency(queryTokens);

    const results = [];
    for (const node of this.nodes.values()) {
      let sim = cosineSimilarity(queryTf, node.tf);
      
      // Fallback substring & partial match bonus
      const nodeTextLower = node.content.toLowerCase();
      if (nodeTextLower.includes(queryLower)) {
        sim = Math.max(sim, 0.65);
      } else {
        for (const qToken of queryTokens) {
          if (nodeTextLower.includes(qToken) || node.tokens.some((nt) => nt.includes(qToken) || qToken.includes(nt))) {
            sim = Math.max(sim, 0.35);
          }
        }
      }

      if (sim > 0.05) {
        results.push({
          id: node.id,
          content: node.content,
          metadata: node.metadata,
          timestamp: node.timestamp,
          similarity: parseFloat(sim.toFixed(4)),
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Traverses graph dynamically across semantic, causal, or chronic links.
   */
  traverse({ startNodeId, query, mode = "semantic", depth = 2, maxNodes = 10 }) {
    let rootId = startNodeId;

    if (!rootId && query) {
      const searchResults = this.searchSemantic(query, 1);
      if (searchResults.length > 0) {
        rootId = searchResults[0].id;
      }
    }

    if (!rootId || !this.nodes.has(rootId)) {
      return {
        error: "Starting node not found. Provide a valid startNodeId or search query.",
        visited: [],
      };
    }

    const visited = new Set();
    const queue = [{ id: rootId, currentDepth: 0, path: [rootId], linkType: "root" }];
    const traversalResults = [];

    while (queue.length > 0 && traversalResults.length < maxNodes) {
      const { id, currentDepth, path, linkType } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) continue;

      traversalResults.push({
        id: node.id,
        content: node.content,
        metadata: node.metadata,
        timestamp: node.timestamp,
        sessionId: node.sessionId,
        depth: currentDepth,
        reachedVia: linkType,
        path,
        availableLinks: {
          semanticNeighbors: node.edges.semantic.map((e) => e.targetId),
          causalPredecessors: node.edges.causal.predecessors,
          causalSuccessors: node.edges.causal.successors,
          chronicPrev: node.edges.chronic.prev,
          chronicNext: node.edges.chronic.next,
        },
      });

      if (currentDepth < depth) {
        // Expand based on requested mode
        if (mode === "semantic" || mode === "all") {
          for (const edge of node.edges.semantic) {
            if (!visited.has(edge.targetId)) {
              queue.push({
                id: edge.targetId,
                currentDepth: currentDepth + 1,
                path: [...path, edge.targetId],
                linkType: `semantic (score: ${edge.weight})`,
              });
            }
          }
        }

        if (mode === "causal" || mode === "all") {
          for (const prevId of node.edges.causal.predecessors) {
            if (!visited.has(prevId)) {
              queue.push({
                id: prevId,
                currentDepth: currentDepth + 1,
                path: [...path, prevId],
                linkType: "causal_predecessor",
              });
            }
          }
          for (const nextId of node.edges.causal.successors) {
            if (!visited.has(nextId)) {
              queue.push({
                id: nextId,
                currentDepth: currentDepth + 1,
                path: [...path, nextId],
                linkType: "causal_successor",
              });
            }
          }
        }

        if (mode === "chronic" || mode === "all") {
          if (node.edges.chronic.prev && !visited.has(node.edges.chronic.prev)) {
            queue.push({
              id: node.edges.chronic.prev,
              currentDepth: currentDepth + 1,
              path: [...path, node.edges.chronic.prev],
              linkType: "chronic_prev",
            });
          }
          if (node.edges.chronic.next && !visited.has(node.edges.chronic.next)) {
            queue.push({
              id: node.edges.chronic.next,
              currentDepth: currentDepth + 1,
              path: [...path, node.edges.chronic.next],
              linkType: "chronic_next",
            });
          }
        }
      }
    }

    return {
      startNodeId: rootId,
      traversalMode: mode,
      totalNodesVisited: traversalResults.length,
      nodes: traversalResults,
    };
  }

  /**
   * Get graph statistics.
   */
  getStats() {
    let semanticEdgesCount = 0;
    let causalEdgesCount = 0;
    let chronicEdgesCount = 0;

    for (const node of this.nodes.values()) {
      semanticEdgesCount += node.edges.semantic.length;
      causalEdgesCount += node.edges.causal.successors.length;
      if (node.edges.chronic.next) chronicEdgesCount++;
    }

    return {
      nodeCount: this.nodes.size,
      semanticEdgesCount,
      causalEdgesCount,
      chronicEdgesCount,
      totalEdges: semanticEdgesCount + causalEdgesCount + chronicEdgesCount,
    };
  }

  /**
   * Export JSON view of the graph.
   * @param {string} view - "all" | "semantic" | "causal" | "chronic"
   */
  exportJson(view = "all") {
    const rawNodes = Array.from(this.nodes.values()).map((n) => {
      const base = {
        id: n.id,
        content: n.content,
        metadata: n.metadata,
        sessionId: n.sessionId,
        timestamp: n.timestamp,
        date: new Date(n.timestamp).toISOString(),
      };

      if (view === "all") {
        base.edges = n.edges;
      } else if (view === "semantic") {
        base.edges = { semantic: n.edges.semantic };
      } else if (view === "causal") {
        base.edges = { causal: n.edges.causal };
      } else if (view === "chronic") {
        base.edges = { chronic: n.edges.chronic };
      }

      return base;
    });

    return {
      graphName: this.name,
      view,
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      nodes: rawNodes,
    };
  }

  /**
   * Restore graph from serialized JSON state.
   */
  importJson(data) {
    if (!data || !Array.isArray(data.nodes)) return;

    this.nodes.clear();
    this.lastNodeIdBySession.clear();
    this.lastChronicNodeId = null;

    for (const raw of data.nodes) {
      const tokens = tokenize(raw.content);
      const tf = computeTermFrequency(tokens);
      const node = {
        id: raw.id,
        content: raw.content,
        metadata: raw.metadata || {},
        sessionId: raw.sessionId || "global",
        timestamp: raw.timestamp || Date.now(),
        tokens,
        tf,
        edges: raw.edges || {
          semantic: [],
          causal: { predecessors: [], successors: [] },
          chronic: { prev: null, next: null },
        },
      };

      this.nodes.set(node.id, node);
      this.lastNodeIdBySession.set(node.sessionId, node.id);
      if (!node.edges.chronic.next) {
        this.lastChronicNodeId = node.id;
      }
    }
  }

  clear() {
    this.nodes.clear();
    this.lastNodeIdBySession.clear();
    this.lastChronicNodeId = null;
  }
}
