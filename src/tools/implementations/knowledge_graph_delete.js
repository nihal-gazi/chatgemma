/**
 * Custom Tool: knowledge_graph_delete
 * Allows Gemma to soft-delete entity nodes and semantic relationships in the Knowledge Graph.
 * Note: Nodes are NEVER physically deleted; their isActive property is set to false.
 */

export const knowledgeGraphDeleteTool = {
  declaration: {
    name: "knowledge_graph_delete",
    description:
      "Soft-deletes entities or relationships in the Knowledge Graph by setting their 'isActive' property to false. Nodes and edges are never permanently destroyed, preserving history and data integrity.",
    parameters: {
      type: "OBJECT",
      properties: {
        entityNames: {
          type: "ARRAY",
          items: { type: "STRING" },
          description:
            "List of entity names or IDs to soft-delete (e.g. ['OldProject', 'ObsoleteConcept']).",
        },
        relationships: {
          type: "ARRAY",
          description: "List of relationships to soft-delete.",
          items: {
            type: "OBJECT",
            properties: {
              source: {
                type: "STRING",
                description: "Name or ID of source entity (Subject).",
              },
              predicate: {
                type: "STRING",
                description: "Relationship predicate (e.g. 'USES', 'WORKS_ON').",
              },
              target: {
                type: "STRING",
                description: "Name or ID of target entity (Object).",
              },
            },
            required: ["source", "predicate", "target"],
          },
        },
      },
    },
  },

  async execute(args, context = {}) {
    const startTime = Date.now();
    const { entityNames = [], relationships = [] } = args || {};

    // 1. Permission Check
    const isAllowed = context.settings?.allowKnowledgeGraphReadWrite !== false;
    if (!isAllowed) {
      return {
        error:
          "Permission denied: LLM Knowledge Graph read/write access is disabled in Settings. Please enable it in Settings to allow modifying the graph.",
        status: "permission_denied",
        executionTimeMs: Date.now() - startTime,
      };
    }

    const kg = context.knowledgeGraph;
    if (!kg) {
      return {
        error: "Knowledge Graph service unavailable in execution context.",
        status: "unavailable",
        executionTimeMs: Date.now() - startTime,
      };
    }

    const deletedEntities = [];
    const deletedRelations = [];

    // 2. Soft-delete Entities
    if (Array.isArray(entityNames)) {
      for (const name of entityNames) {
        if (name && typeof name === "string") {
          const res = kg.softDeleteEntity(name);
          deletedEntities.push(res);
        }
      }
    }

    // 3. Soft-delete Relationships
    if (Array.isArray(relationships)) {
      for (const rel of relationships) {
        if (rel && rel.source && rel.predicate && rel.target) {
          const res = kg.softDeleteRelation(rel);
          deletedRelations.push(res);
        }
      }
    }

    return {
      success: true,
      softDeletedEntitiesCount: deletedEntities.filter((r) => r.success).length,
      softDeletedRelationsCount: deletedRelations.filter((r) => r.success).length,
      entityResults: deletedEntities,
      relationResults: deletedRelations,
      stats: kg.getStats(),
      executionTimeMs: Date.now() - startTime,
    };
  },
};
