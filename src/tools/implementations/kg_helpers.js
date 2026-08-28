/**
 * Shared Knowledge Graph Tool Helper Functions
 * Unifies execution and schema factories for General and User Knowledge Graph tools.
 */

import { knowledgeGraphInstance, userKnowledgeGraphInstance } from "../../services/knowledgeGraph.js";

/**
 * Executes a Knowledge Graph write operation.
 */
export async function executeKgWrite(args, context, isUserGraph = false) {
  const targetGraph = isUserGraph
    ? context.userKnowledgeGraph || userKnowledgeGraphInstance
    : context.knowledgeGraph || knowledgeGraphInstance;

  const rawEntities = Array.isArray(args.entities) ? args.entities : [];
  const rawRelations = Array.isArray(args.relationships) ? args.relationships : [];

  const savedEntities = [];
  for (const ent of rawEntities) {
    if (ent && ent.name) {
      const saved = targetGraph.addEntity({
        name: ent.name,
        types: ent.types || ["Concept"],
        description: ent.description || "",
        aliases: ent.aliases || [],
        attributes: ent.attributes || {},
        sourceSession: context.activeSession?.id || "",
        isActive: true,
      });
      if (saved) savedEntities.push(saved);
    }
  }

  const savedRelations = [];
  for (const rel of rawRelations) {
    if (rel && rel.source && rel.predicate && rel.target) {
      const saved = targetGraph.addRelation({
        source: rel.source,
        predicate: rel.predicate,
        target: rel.target,
        description: rel.description || "",
        confidence: rel.confidence || 0.9,
        sourceSession: context.activeSession?.id || "",
        isActive: true,
      });
      if (saved) savedRelations.push(saved);
    }
  }

  // Auto-sync User Profile if writing to User KG
  if (isUserGraph && context.personalization) {
    try {
      context.personalization.syncFromUserKG({
        userKG: targetGraph,
        apiKey: context.settings?.apiKey,
        modelId: context.settings?.modelId,
      }).catch(() => {});
    } catch (e) {}
  }

  const graphLabel = isUserGraph ? "User Knowledge Graph" : "General Knowledge Graph";
  return {
    success: true,
    graph: isUserGraph ? "user" : "general",
    entities: savedEntities,
    relationships: savedRelations,
    message: `Successfully ingested ${savedEntities.length} entities and ${savedRelations.length} relations into ${graphLabel}.`,
  };
}

/**
 * Executes a Knowledge Graph soft delete operation.
 */
export async function executeKgDelete(args, context, isUserGraph = false) {
  const targetGraph = isUserGraph
    ? context.userKnowledgeGraph || userKnowledgeGraphInstance
    : context.knowledgeGraph || knowledgeGraphInstance;

  const entityNames = Array.isArray(args.entityNames) ? args.entityNames : [];
  const relationships = Array.isArray(args.relationships) ? args.relationships : [];

  const deletedEntities = [];
  for (const name of entityNames) {
    if (typeof name === "string" && name.trim()) {
      const res = targetGraph.softDeleteEntity(name.trim());
      if (res && res.success) {
        deletedEntities.push(name.trim());
      }
    }
  }

  const deletedRelations = [];
  for (const rel of relationships) {
    if (rel && rel.source && rel.target) {
      const res = targetGraph.softDeleteRelation(rel.source, rel.predicate, rel.target);
      if (res && res.success) {
        deletedRelations.push(`${rel.source} -[${rel.predicate || "*"}]-> ${rel.target}`);
      }
    }
  }

  if (isUserGraph && context.personalization) {
    try {
      context.personalization.syncFromUserKG({
        userKG: targetGraph,
        apiKey: context.settings?.apiKey,
        modelId: context.settings?.modelId,
      }).catch(() => {});
    } catch (e) {}
  }

  const graphLabel = isUserGraph ? "User Knowledge Graph" : "General Knowledge Graph";
  return {
    success: true,
    graph: isUserGraph ? "user" : "general",
    deletedEntities,
    deletedRelations,
    message: `Soft-deleted ${deletedEntities.length} entities and ${deletedRelations.length} relations from ${graphLabel} (isActive = false).`,
  };
}

/**
 * Executes a Knowledge Graph search operation.
 */
export async function executeKgSearch(args, context, isUserGraph = false) {
  const targetGraph = isUserGraph
    ? context.userKnowledgeGraph || userKnowledgeGraphInstance
    : context.knowledgeGraph || knowledgeGraphInstance;

  const query = (args.query || "").trim();
  const maxDepth = Number(args.maxDepth) || 2;
  const limit = Number(args.limit) || 10;
  const entityTypes = Array.isArray(args.entityTypes) ? args.entityTypes : [];

  if (!query) {
    return {
      query: "",
      graph: isUserGraph ? "user" : "general",
      entities: [],
      relationships: [],
      error: "Search query cannot be empty.",
    };
  }

  const searchResults = targetGraph.search({
    query,
    types: entityTypes,
    maxDepth,
    limit,
  });

  return {
    query,
    graph: isUserGraph ? "user" : "general",
    entities: searchResults.entities || [],
    relationships: searchResults.relations || [],
    totalEntitiesFound: searchResults.entities?.length || 0,
    totalRelationshipsFound: searchResults.relations?.length || 0,
  };
}
