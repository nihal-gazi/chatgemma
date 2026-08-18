/**
 * Knowledge Graph Service for ChatGemma (GraphRAG & Google Knowledge Graph Principles)
 * Manages schema.org-compliant entity nodes, directed semantic triples (edges),
 * multi-hop graph traversals, and automated entity-relation extraction.
 */

const STORAGE_KEY = "chatgemma_knowledge_graph_v1";

// Standard Schema.org & Knowledge Graph Entity Types
export const ENTITY_TYPES = {
  PERSON: "Person",
  ORGANIZATION: "Organization",
  PROJECT: "Project",
  TECHNOLOGY: "Technology",
  CONCEPT: "Concept",
  LOCATION: "Location",
  PREFERENCE: "Preference",
  EVENT: "Event",
  TOOL: "Tool",
};

// Standard Semantic Predicates / Relations
export const PREDICATE_TYPES = {
  CREATED: "CREATED",
  WORKS_ON: "WORKS_ON",
  USES: "USES",
  PREFERS: "PREFERS",
  LOCATED_IN: "LOCATED_IN",
  PART_OF: "PART_OF",
  ASSOCIATED_WITH: "ASSOCIATED_WITH",
  RESEARCHES: "RESEARCHES",
  INTERESTED_IN: "INTERESTED_IN",
  EXPERT_IN: "EXPERT_IN",
  DEPENDS_ON: "DEPENDS_ON",
  IMPLEMENTS: "IMPLEMENTS",
};

export class KnowledgeGraphService {
  constructor() {
    this.entities = new Map(); // id -> EntityNode
    this.relations = []; // Array of SemanticTriple
    this.loadFromStorage();
  }

  /**
   * Generates a canonical entity ID from name and type.
   * e.g., "Nihal Gazi" (Person) -> "entity:person:nihal_gazi"
   */
  static generateEntityId(name, type = "Concept") {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return `entity:${type.toLowerCase()}:${slug}`;
  }

  /**
   * Adds or updates an entity node in the Knowledge Graph with deduplication & attribute merging.
   */
  addEntity({ name, types = ["Concept"], description = "", aliases = [], attributes = {}, sourceSession = "" }) {
    if (!name || !name.trim()) return null;

    const trimmedName = name.trim();
    const primaryType = Array.isArray(types) && types.length > 0 ? types[0] : "Concept";
    const entityId = KnowledgeGraphService.generateEntityId(trimmedName, primaryType);

    const now = new Date().toISOString();

    if (this.entities.has(entityId)) {
      const existing = this.entities.get(entityId);
      const mergedTypes = Array.from(new Set([...(existing.types || []), ...(Array.isArray(types) ? types : [types])]));
      const mergedAliases = Array.from(new Set([...(existing.aliases || []), ...(Array.isArray(aliases) ? aliases : [aliases])]));
      const mergedAttributes = { ...(existing.attributes || {}), ...(attributes || {}) };
      const sourceSessions = Array.from(new Set([...(existing.sourceSessions || []), ...(sourceSession ? [sourceSession] : [])]));

      const updated = {
        ...existing,
        name: existing.name || trimmedName,
        types: mergedTypes,
        description: description && description.length > (existing.description?.length || 0) ? description : existing.description,
        aliases: mergedAliases,
        attributes: mergedAttributes,
        sourceSessions,
        lastUpdated: now,
      };

      this.entities.set(entityId, updated);
      return updated;
    }

    const newEntity = {
      id: entityId,
      name: trimmedName,
      types: Array.isArray(types) ? types : [types],
      description: description || `Entity of type ${primaryType}`,
      aliases: Array.from(new Set([trimmedName.toLowerCase(), ...(Array.isArray(aliases) ? aliases : [])])),
      attributes: attributes || {},
      sourceSessions: sourceSession ? [sourceSession] : [],
      createdAt: now,
      lastUpdated: now,
    };

    this.entities.set(entityId, newEntity);
    return newEntity;
  }

  /**
   * Adds a directed semantic triple (edge) between two entities.
   * e.g., (Subject: Nihal Gazi) --[CREATED]--> (Object: ChatGemma)
   */
  addRelation({
    source,
    predicate,
    target,
    description = "",
    weight = 1.0,
    confidence = 0.9,
    contextSnippet = "",
    sourceSession = "",
  }) {
    if (!source || !target || !predicate) return null;

    // Resolve entities or create them on the fly
    let sourceEntity = typeof source === "object" ? source : this.findEntityByNameOrId(source);
    if (!sourceEntity && typeof source === "string") {
      sourceEntity = this.addEntity({ name: source, types: ["Concept"], sourceSession });
    }

    let targetEntity = typeof target === "object" ? target : this.findEntityByNameOrId(target);
    if (!targetEntity && typeof target === "string") {
      targetEntity = this.addEntity({ name: target, types: ["Concept"], sourceSession });
    }

    if (!sourceEntity || !targetEntity) return null;

    const predicateUpper = (predicate || "ASSOCIATED_WITH").toUpperCase().replace(/\s+/g, "_");
    const relationId = `rel_${sourceEntity.id}_${predicateUpper}_${targetEntity.id}`;

    // Check if duplicate relation already exists
    const existingIdx = this.relations.findIndex((r) => r.id === relationId);
    const now = new Date().toISOString();

    const relationObj = {
      id: relationId,
      sourceId: sourceEntity.id,
      sourceName: sourceEntity.name,
      sourceType: sourceEntity.types?.[0] || "Concept",
      predicate: predicateUpper,
      targetId: targetEntity.id,
      targetName: targetEntity.name,
      targetType: targetEntity.types?.[0] || "Concept",
      description: description || `${sourceEntity.name} ${predicateUpper.toLowerCase().replace(/_/g, " ")} ${targetEntity.name}`,
      weight: weight || 1.0,
      confidence: confidence || 0.9,
      contextSnippet: contextSnippet || "",
      sourceSession: sourceSession || "",
      timestamp: now,
    };

    if (existingIdx >= 0) {
      this.relations[existingIdx] = {
        ...this.relations[existingIdx],
        ...relationObj,
        weight: Math.min((this.relations[existingIdx].weight || 1.0) + 0.2, 5.0),
      };
      return this.relations[existingIdx];
    }

    this.relations.push(relationObj);
    return relationObj;
  }

  /**
   * Looks up an entity by canonical ID, name, or alias.
   */
  findEntityByNameOrId(query) {
    if (!query || typeof query !== "string") return null;
    const cleanQuery = query.trim().toLowerCase();

    // 1. Direct ID match
    if (this.entities.has(query)) {
      return this.entities.get(query);
    }

    // 2. Exact Name or Alias Match
    for (const entity of this.entities.values()) {
      if (entity.name.toLowerCase() === cleanQuery) return entity;
      if (entity.aliases && entity.aliases.some((a) => a.toLowerCase() === cleanQuery)) {
        return entity;
      }
    }

    // 3. Substring match
    for (const entity of this.entities.values()) {
      if (entity.name.toLowerCase().includes(cleanQuery)) return entity;
    }

    return null;
  }

  /**
   * Search the Knowledge Graph (GraphRAG Multi-Hop Retrieval)
   */
  search(query, { types = [], relations = [], depth = 1, limit = 10 } = {}) {
    if (!query || typeof query !== "string") {
      return {
        query: "",
        matchedEntities: [],
        directTriples: [],
        connectedPaths: [],
        subgraphSummary: "No query provided.",
        stats: this.getStats(),
      };
    }

    const cleanQuery = query.trim().toLowerCase();
    const allowedTypes = Array.isArray(types) && types.length > 0 ? types.map((t) => t.toLowerCase()) : null;
    const allowedPredicates = Array.isArray(relations) && relations.length > 0 ? relations.map((r) => r.toUpperCase()) : null;
    const maxDepth = Math.max(1, Math.min(depth || 1, 3));

    // 1. Entity Resolution (find seed nodes matching the query)
    const seedEntities = [];
    for (const entity of this.entities.values()) {
      let score = 0;
      const entityNameLower = entity.name.toLowerCase();
      const entityDescLower = (entity.description || "").toLowerCase();

      if (entityNameLower === cleanQuery) {
        score = 100;
      } else if (entity.aliases?.some((a) => a.toLowerCase() === cleanQuery)) {
        score = 90;
      } else if (entityNameLower.includes(cleanQuery)) {
        score = 70;
      } else if (cleanQuery.includes(entityNameLower) && entityNameLower.length > 3) {
        score = 60;
      } else if (entityDescLower.includes(cleanQuery)) {
        score = 40;
      }

      // Check type filter if requested
      if (allowedTypes && entity.types) {
        const hasType = entity.types.some((t) => allowedTypes.includes(t.toLowerCase()));
        if (!hasType) score = 0;
      }

      if (score > 0) {
        seedEntities.push({ entity, score });
      }
    }

    // Sort seed entities by match score
    seedEntities.sort((a, b) => b.score - a.score);
    const topSeeds = seedEntities.slice(0, limit).map((s) => s.entity);

    // 2. Multi-hop Graph Traversal from Seed Nodes
    const visitedEntityIds = new Set(topSeeds.map((e) => e.id));
    const matchedTriples = [];
    const connectedPaths = [];

    // Traverse outgoing and incoming edges for each seed
    let currentHopEntities = [...topSeeds];

    for (let currentHop = 1; currentHop <= maxDepth; currentHop++) {
      const nextHopEntities = [];
      const currentHopEntityIds = new Set(currentHopEntities.map((e) => e.id));

      for (const rel of this.relations) {
        const isOutgoing = currentHopEntityIds.has(rel.sourceId);
        const isIncoming = currentHopEntityIds.has(rel.targetId);

        if (!isOutgoing && !isIncoming) continue;

        // Apply predicate filter if provided
        if (allowedPredicates && !allowedPredicates.includes(rel.predicate)) {
          continue;
        }

        // Add triple to matched results if not already present
        if (!matchedTriples.some((t) => t.id === rel.id)) {
          matchedTriples.push(rel);
        }

        const neighborId = isOutgoing ? rel.targetId : rel.sourceId;
        if (!visitedEntityIds.has(neighborId)) {
          visitedEntityIds.add(neighborId);
          const neighborEntity = this.entities.get(neighborId);
          if (neighborEntity) {
            nextHopEntities.push(neighborEntity);
          }
        }

        // Record multi-hop path
        if (currentHop > 1) {
          connectedPaths.push(
            `[${rel.sourceName}] --(${rel.predicate})--> [${rel.targetName}] (Hop ${currentHop})`
          );
        }
      }

      currentHopEntities = nextHopEntities;
      if (currentHopEntities.length === 0) break;
    }

    // Collect all unique entities discovered in the subgraph
    const subgraphEntities = Array.from(visitedEntityIds)
      .map((id) => this.entities.get(id))
      .filter(Boolean);

    // 3. Synthesize High-Density Subgraph Summary for LLM Grounding
    let summaryText = "";
    if (subgraphEntities.length === 0 && matchedTriples.length === 0) {
      summaryText = `Knowledge Graph search for "${query}" found no matching entities or relations.`;
    } else {
      const entityLines = topSeeds.map(
        (e) => `• [${e.name}] (${e.types.join(", ")}): ${e.description}`
      );
      const relationLines = matchedTriples
        .slice(0, 15)
        .map((r) => `• ${r.sourceName} --[${r.predicate}]--> ${r.targetName}: "${r.description}"`);

      summaryText = [
        `Knowledge Graph Results for "${query}":`,
        `Direct Entities (${topSeeds.length}):\n${entityLines.join("\n")}`,
        matchedTriples.length > 0
          ? `\nInterconnected Facts & Relations (${matchedTriples.length}):\n${relationLines.join("\n")}`
          : "",
        connectedPaths.length > 0
          ? `\nMulti-Hop Connection Paths:\n${connectedPaths.slice(0, 5).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return {
      query,
      matchedEntities: topSeeds,
      subgraphEntities,
      directTriples: matchedTriples.slice(0, limit * 2),
      connectedPaths: connectedPaths.slice(0, 5),
      subgraphSummary: summaryText,
      totalEntitiesFound: subgraphEntities.length,
      totalTriplesFound: matchedTriples.length,
    };
  }

  /**
   * Automated Knowledge Extraction from messages / text
   * Extracts entities and semantic relationships using structured heuristics and patterns.
   */
  extractFromMessages(messages, sessionId = "") {
    if (!Array.isArray(messages)) return;

    for (const msg of messages) {
      if (!msg.content || typeof msg.content !== "string") continue;
      const text = msg.content;

      // 1. Identify User Profile & Identity Facts
      // Pattern: "my name is X", "I am X", "I work at X", "I am building X"
      const nameMatch = text.match(/\b(?:my name is|i am|i'm called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (nameMatch && nameMatch[1]) {
        const userName = nameMatch[1].trim();
        const userEntity = this.addEntity({
          name: userName,
          types: ["Person"],
          description: `User identified as ${userName}`,
          sourceSession: sessionId,
        });

        // Preference or role match
        const roleMatch = text.match(/\b(?:i am a|i work as a|my role is)\s+([^,.\n]+)/i);
        if (roleMatch && userEntity) {
          const role = roleMatch[1].trim();
          this.addRelation({
            source: userEntity,
            predicate: "WORKS_ON",
            target: role,
            description: `${userName} works as ${role}`,
            contextSnippet: text.slice(0, 100),
            sourceSession: sessionId,
          });
        }
      }

      // 2. Project / Creator Relations: "X created Y", "X developed Y", "X founded Y"
      const creatorRegex = /([A-Z][a-zA-Z0-9_\s]{2,25}?)\s+(?:created|built|developed|founded|authored|designed)\s+([A-Z][a-zA-Z0-9_\s]{2,30})/g;
      let cMatch;
      while ((cMatch = creatorRegex.exec(text)) !== null) {
        const subject = cMatch[1].trim();
        const object = cMatch[2].trim();
        if (subject.length > 2 && object.length > 2 && subject.toLowerCase() !== "i") {
          this.addRelation({
            source: subject,
            predicate: "CREATED",
            target: object,
            description: `${subject} created ${object}`,
            contextSnippet: text.slice(Math.max(0, cMatch.index - 20), cMatch.index + 80),
            sourceSession: sessionId,
          });
        }
      }

      // 3. Technology / Usage Relations: "X uses Y", "X is built with Y", "X powered by Y"
      const usageRegex = /([A-Z][a-zA-Z0-9_\s]{2,25}?)\s+(?:is powered by|uses|built with|runs on)\s+([A-Z][a-zA-Z0-9_\s]{2,30})/g;
      let uMatch;
      while ((uMatch = usageRegex.exec(text)) !== null) {
        const subject = uMatch[1].trim();
        const object = uMatch[2].trim();
        if (subject.length > 2 && object.length > 2) {
          this.addRelation({
            source: subject,
            predicate: "USES",
            target: object,
            description: `${subject} uses ${object}`,
            contextSnippet: text.slice(Math.max(0, uMatch.index - 20), uMatch.index + 80),
            sourceSession: sessionId,
          });
        }
      }
    }

    this.saveToStorage();
  }

  /**
   * Ingest and bootstrap default core ecosystem knowledge.
   */
  bootstrapDefaults() {
    if (this.entities.size === 0) {
      // 1. Nihal Gazi
      const nihal = this.addEntity({
        name: "Nihal Gazi",
        types: ["Person", "Researcher"],
        description: "AI researcher, developer, and systems architect based in India; founder of KindSynapse and creator of ChatGemma.",
        aliases: ["Nihal", "nihal-gazi", "Creator"],
        attributes: { role: "AI Researcher", location: "India" },
      });

      // 2. KindSynapse
      const kindSynapse = this.addEntity({
        name: "KindSynapse",
        types: ["Organization", "Project"],
        description: "Research organization and AI lab creating empathetic, modular artificial intelligence architectures.",
        aliases: ["Kind Synapse"],
      });

      // 3. ChatGemma
      const chatGemma = this.addEntity({
        name: "ChatGemma",
        types: ["Project", "Technology"],
        description: "An advanced, open-source AI assistant interface powered by Google Gemma 4 with native thinking and tool calling.",
        aliases: ["Chat Gemma"],
      });

      // 4. Gemma 4
      const gemma4 = this.addEntity({
        name: "Gemma 4",
        types: ["Technology", "Concept"],
        description: "Google DeepMind's state-of-the-art open language model featuring native internal thinking tokens and tool execution.",
        aliases: ["Gemma-4", "gemma-4-31b-it"],
      });

      // Relationships
      this.addRelation({
        source: nihal,
        predicate: "CREATED",
        target: kindSynapse,
        description: "Nihal Gazi founded and established KindSynapse.",
      });

      this.addRelation({
        source: nihal,
        predicate: "CREATED",
        target: chatGemma,
        description: "Nihal Gazi designed and developed ChatGemma.",
      });

      this.addRelation({
        source: kindSynapse,
        predicate: "WORKS_ON",
        target: chatGemma,
        description: "KindSynapse maintains and develops ChatGemma as a core research platform.",
      });

      this.addRelation({
        source: chatGemma,
        predicate: "USES",
        target: gemma4,
        description: "ChatGemma is powered by Google Gemma 4 with deep reasoning capabilities.",
      });

      this.saveToStorage();
    }
  }

  /**
   * Re-indexes the entire knowledge graph from all existing chat sessions.
   */
  reindexAllSessions(sessions) {
    if (!Array.isArray(sessions)) return this.getStats();

    for (const session of sessions) {
      if (session.messages && Array.isArray(session.messages)) {
        this.extractFromMessages(session.messages, session.id);
      }
    }

    this.saveToStorage();
    return this.getStats();
  }

  /**
   * Returns current statistics of the Knowledge Graph.
   */
  getStats() {
    const typeDistribution = {};
    for (const entity of this.entities.values()) {
      for (const t of entity.types || ["Concept"]) {
        typeDistribution[t] = (typeDistribution[t] || 0) + 1;
      }
    }

    const predicateDistribution = {};
    for (const rel of this.relations) {
      predicateDistribution[rel.predicate] = (predicateDistribution[rel.predicate] || 0) + 1;
    }

    return {
      totalEntities: this.entities.size,
      totalRelations: this.relations.length,
      typeDistribution,
      predicateDistribution,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Export graph data for Synapse file packaging.
   */
  exportGraph() {
    return {
      version: "1.0.0",
      entities: Array.from(this.entities.values()),
      relations: this.relations,
      stats: this.getStats(),
    };
  }

  /**
   * Import graph data from Synapse file.
   */
  importGraph(graphData) {
    if (!graphData) return;
    if (Array.isArray(graphData.entities)) {
      for (const entity of graphData.entities) {
        if (entity.id && entity.name) {
          this.entities.set(entity.id, entity);
        }
      }
    }
    if (Array.isArray(graphData.relations)) {
      for (const rel of graphData.relations) {
        if (!this.relations.some((r) => r.id === rel.id)) {
          this.relations.push(rel);
        }
      }
    }
    this.saveToStorage();
  }

  /**
   * Persistence: Save to LocalStorage
   */
  saveToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const data = {
          entities: Array.from(this.entities.values()),
          relations: this.relations,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn("[KnowledgeGraph] LocalStorage write error:", e);
    }
  }

  /**
   * Persistence: Load from LocalStorage
   */
  loadFromStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.entities)) {
            for (const entity of data.entities) {
              this.entities.set(entity.id, entity);
            }
          }
          if (Array.isArray(data.relations)) {
            this.relations = data.relations;
          }
        }
      }
    } catch (e) {
      console.warn("[KnowledgeGraph] LocalStorage read error:", e);
    }

    if (this.entities.size === 0) {
      this.bootstrapDefaults();
    }
  }
}

// Global Singleton Instance
export const knowledgeGraphInstance = new KnowledgeGraphService();
