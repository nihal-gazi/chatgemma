import { CONFIG } from "../config/config.js";
import { fetchWithRateLimit } from "./api.js";
import { extractJsonFromText, extractFileKnowledgeEntities } from "../utils/index.js";

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
  FILE: "File",
  DOCUMENT: "Document",
  IMAGE: "Image",
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
  ATTACHED_TO: "ATTACHED_TO",
  DEFINES: "DEFINES",
  CONTAINS: "CONTAINS",
};

export class KnowledgeGraphService {
  constructor(storageKey = STORAGE_KEY, autoSeed = true) {
    this.storageKey = storageKey;
    this.autoSeed = autoSeed;
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
  addEntity({ name, types = ["Concept"], description = "", aliases = [], attributes = {}, sourceSession = "", isActive = true }) {
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
        isActive: isActive !== undefined ? isActive : existing.isActive !== false,
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
      isActive: isActive !== false,
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
    isActive = true,
  }) {
    if (!source || !target || !predicate) return null;

    // Resolve entities or create them on the fly
    let sourceEntity = typeof source === "object" ? source : this.findEntityByNameOrId(source, true);
    if (!sourceEntity && typeof source === "string") {
      sourceEntity = this.addEntity({ name: source, types: ["Concept"], sourceSession });
    }

    let targetEntity = typeof target === "object" ? target : this.findEntityByNameOrId(target, true);
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
      isActive: isActive !== false,
      timestamp: now,
    };

    if (existingIdx >= 0) {
      this.relations[existingIdx] = {
        ...this.relations[existingIdx],
        ...relationObj,
        isActive: isActive !== false,
        weight: Math.min((this.relations[existingIdx].weight || 1.0) + 0.2, 5.0),
      };
      return this.relations[existingIdx];
    }

    this.relations.push(relationObj);
    return relationObj;
  }

  /**
   * Explicit LLM Write: Ingest or update entity and persist to storage
   */
  writeEntity(data) {
    const entity = this.addEntity({ ...data, isActive: true });
    this.saveToStorage();
    return entity;
  }

  /**
   * Explicit LLM Write: Ingest or update relation and persist to storage
   */
  writeRelation(data) {
    const relation = this.addRelation({ ...data, isActive: true });
    this.saveToStorage();
    return relation;
  }

  /**
   * Automatically indexes an uploaded file or image into the Knowledge Graph.
   * Creates file/document entity and semantic relationships (ATTACHED_TO, USES, etc.).
   * @param {object} fileData - Processed file object
   * @param {string} [sessionId=""] - Associated chat session ID
   * @returns {object} Extracted { entity, relations }
   */
  indexUploadedFile(fileData, sessionId = "") {
    if (!fileData || !fileData.name) return null;

    const extracted = extractFileKnowledgeEntities(fileData, sessionId);
    if (!extracted) return null;

    // 1. Add File/Document Entity
    const savedEntity = this.addEntity({
      ...extracted.entity,
      isActive: true,
    });

    // 2. Add Relations
    const savedRelations = [];
    if (Array.isArray(extracted.relations)) {
      for (const rel of extracted.relations) {
        const savedRel = this.addRelation({
          ...rel,
          isActive: true,
        });
        savedRelations.push(savedRel);
      }
    }

    this.saveToStorage();
    return { entity: savedEntity, relations: savedRelations };
  }

  /**
   * Soft Delete an Entity (no node is ever destroyed; isActive set to false)
   */
  softDeleteEntity(entityIdOrName) {
    const entity = this.findEntityByNameOrId(entityIdOrName, true);
    if (!entity) {
      return { success: false, message: `Entity "${entityIdOrName}" not found in Knowledge Graph.` };
    }

    entity.isActive = false;
    entity.lastUpdated = new Date().toISOString();
    this.entities.set(entity.id, entity);

    // Also deactivate connected relations
    let deactivatedRelationsCount = 0;
    for (const rel of this.relations) {
      if (rel.sourceId === entity.id || rel.targetId === entity.id) {
        rel.isActive = false;
        deactivatedRelationsCount++;
      }
    }

    this.saveToStorage();
    return {
      success: true,
      message: `Entity "${entity.name}" soft-deleted successfully (isActive = false). Deactivated ${deactivatedRelationsCount} connected relations.`,
      entity: { id: entity.id, name: entity.name, isActive: false },
    };
  }

  /**
   * Soft Delete a Relation (isActive set to false)
   */
  softDeleteRelation(source, predicate, target) {
    const sourceEnt = this.findEntityByNameOrId(source, true);
    const targetEnt = this.findEntityByNameOrId(target, true);

    if (!sourceEnt || !targetEnt) {
      return { success: false, message: `Could not resolve entities for relation "${source}" -> "${target}".` };
    }

    const predicateUpper = (predicate || "").toUpperCase().replace(/\s+/g, "_");
    const relationId = `rel_${sourceEnt.id}_${predicateUpper}_${targetEnt.id}`;

    const rel = this.relations.find((r) => r.id === relationId || (r.sourceId === sourceEnt.id && r.targetId === targetEnt.id && (!predicate || r.predicate === predicateUpper)));

    if (!rel) {
      return { success: false, message: `Relation "${source} --[${predicate}]--> ${target}" not found.` };
    }

    rel.isActive = false;
    this.saveToStorage();
    return {
      success: true,
      message: `Relation "${rel.sourceName} --[${rel.predicate}]--> ${rel.targetName}" soft-deleted successfully (isActive = false).`,
      relation: { id: rel.id, isActive: false },
    };
  }

  /**
   * Looks up an entity by canonical ID, name, or alias.
   * @param {string} query
   * @param {boolean} includeInactive
   */
  findEntityByNameOrId(query, includeInactive = false) {
    if (!query || typeof query !== "string") return null;
    const cleanQuery = query.trim().toLowerCase();

    // 1. Direct ID match
    if (this.entities.has(query)) {
      const ent = this.entities.get(query);
      if (includeInactive || ent.isActive !== false) return ent;
    }

    // 2. Exact Name or Alias Match
    for (const entity of this.entities.values()) {
      if (!includeInactive && entity.isActive === false) continue;
      if (entity.name.toLowerCase() === cleanQuery) return entity;
      if (entity.aliases && entity.aliases.some((a) => a.toLowerCase() === cleanQuery)) {
        return entity;
      }
    }

    // 3. Substring match
    for (const entity of this.entities.values()) {
      if (!includeInactive && entity.isActive === false) continue;
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

    // 1. Entity Resolution (find seed nodes matching the query - only active nodes)
    const seedEntities = [];
    for (const entity of this.entities.values()) {
      if (entity.isActive === false) continue;

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
        if (rel.isActive === false) continue;

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
          if (neighborEntity && neighborEntity.isActive !== false) {
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
      .filter((e) => Boolean(e) && e.isActive !== false);

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
   * Background LLM Knowledge Extraction
   * Uses Gemma 31B (gemma-4-31b-it) with Google Search Grounding to extract
   * verified, structured entities and semantic relationships from chat context.
   */
  async extractWithLLM({ messages, apiKey, modelId = "gemma-4-31b-it", sessionId = "", signal = null }) {
    if (!Array.isArray(messages) || messages.length === 0) return null;

    const cleanKey = (apiKey || CONFIG.defaultApiKey || "").trim().replace(/^["']|["']$/g, "");
    if (!cleanKey) return null;

    // Window last 10 messages for focused context
    const recentMessages = messages.slice(-10);
    const transcript = recentMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content || ""}`)
      .filter((t) => t.length > 5)
      .join("\n\n");

    if (transcript.length < 10) return null;

    const prompt = `You are the Knowledge Graph extraction engine for ChatGemma.
Analyze this chat transcript and extract all factual entities (people, companies, projects, concepts, tools, technologies) and their directed relationships.
Use Google Search Grounding to verify real-world accuracy, definitions, and company/project details if needed.

Chat Transcript:
"""
${transcript}
"""

Return ONLY a JSON object with this exact structure:
{
  "entities": [
    {
      "name": "Canonical Entity Name",
      "types": ["Person" | "Organization" | "Project" | "Technology" | "Concept" | "Location" | "Preference"],
      "description": "Concise factual summary",
      "aliases": ["Acronym or alternative name"]
    }
  ],
  "relationships": [
    {
      "source": "Source Entity Name",
      "predicate": "RELATION_TYPE",
      "target": "Target Entity Name",
      "description": "Clear factual sentence describing the relationship",
      "confidence": 0.95
    }
  ]
}`;

    const rawModel = CONFIG.resolveModelName(modelId);
    const endpoint = `${CONFIG.apiBaseUrl}/${rawModel}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingLevel: "MINIMAL",
        },
      },
    };

    try {
      const res = await fetchWithRateLimit(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal,
        },
        { model: rawModel, maxRetries: 4 }
      );

      if (!res.ok) {
        console.warn(`[KnowledgeGraph] Background LLM extraction returned ${res.status}`);
        return null;
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const rawText =
        parts
          .filter((p) => !p.thought && typeof p.text === "string")
          .map((p) => p.text)
          .join("\n") || parts.map((p) => p.text || "").join("\n");

      const parsed = extractJsonFromText(rawText);
      if (!parsed || typeof parsed !== "object") return null;

      // Ingest entities
      if (Array.isArray(parsed.entities)) {
        for (const ent of parsed.entities) {
          if (ent.name) {
            this.addEntity({
              name: ent.name,
              types: ent.types || ["Concept"],
              description: ent.description || "",
              aliases: ent.aliases || [],
              sourceSession: sessionId,
            });
          }
        }
      }

      // Ingest relationships
      if (Array.isArray(parsed.relationships)) {
        for (const rel of parsed.relationships) {
          if (rel.source && rel.target && rel.predicate) {
            this.addRelation({
              source: rel.source,
              predicate: rel.predicate,
              target: rel.target,
              description: rel.description || "",
              confidence: rel.confidence || 0.9,
              sourceSession: sessionId,
            });
          }
        }
      }

      this.saveToStorage();
      return this.getStats();
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[KnowledgeGraph] Background LLM extraction error:", err);
      }
      return null;
    }
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
   * Re-indexes the entire knowledge graph from all existing chat sessions using Background LLM.
   */
  async reindexAllSessions(sessions, apiKey, modelId = "gemma-4-31b-it") {
    if (!Array.isArray(sessions)) return this.getStats();

    for (const session of sessions) {
      if (session.messages && session.messages.length > 0) {
        await this.extractWithLLM({
          messages: session.messages,
          apiKey,
          modelId,
          sessionId: session.id,
        });
      }
    }

    this.saveToStorage();
    return this.getStats();
  }

  /**
   * Returns current statistics of the Knowledge Graph.
   */
  getStats() {
    let activeEntitiesCount = 0;
    let inactiveEntitiesCount = 0;
    const typeDistribution = {};

    for (const entity of this.entities.values()) {
      if (entity.isActive !== false) {
        activeEntitiesCount++;
        for (const t of entity.types || ["Concept"]) {
          typeDistribution[t] = (typeDistribution[t] || 0) + 1;
        }
      } else {
        inactiveEntitiesCount++;
      }
    }

    let activeRelationsCount = 0;
    let inactiveRelationsCount = 0;
    const predicateDistribution = {};

    for (const rel of this.relations) {
      if (rel.isActive !== false) {
        activeRelationsCount++;
        predicateDistribution[rel.predicate] = (predicateDistribution[rel.predicate] || 0) + 1;
      } else {
        inactiveRelationsCount++;
      }
    }

    return {
      totalEntities: activeEntitiesCount,
      totalRelations: activeRelationsCount,
      allEntitiesCount: this.entities.size,
      allRelationsCount: this.relations.length,
      inactiveEntities: inactiveEntitiesCount,
      inactiveRelations: inactiveRelationsCount,
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
   * Clears all entities and relations from the graph.
   */
  clearGraph() {
    this.entities.clear();
    this.relations = [];
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
        window.localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    } catch (e) {
      console.warn(`[KnowledgeGraph] LocalStorage write error (${this.storageKey}):`, e);
    }
  }

  /**
   * Persistence: Load from LocalStorage
   */
  loadFromStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKey);
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
      console.warn(`[KnowledgeGraph] LocalStorage read error (${this.storageKey}):`, e);
    }

    if (this.entities.size === 0 && this.autoSeed) {
      this.bootstrapDefaults();
    }
  }
}

// Global Singleton Instances
export const knowledgeGraphInstance = new KnowledgeGraphService("chatgemma_knowledge_graph_v1", true);
export const userKnowledgeGraphInstance = new KnowledgeGraphService("chatgemma_user_knowledge_graph_v1", false);

