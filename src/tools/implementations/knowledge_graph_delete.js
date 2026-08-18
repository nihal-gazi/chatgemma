/**
 * Knowledge Graph Delete Tool for ChatGemma (Soft Deletion)
 * Enables Gemma to soft-delete entities and relations from active retrieval
 * without permanently destroying historical data (isActive is set to false).
 */

import { knowledgeGraphInstance } from "../../services/knowledgeGraph.js";

export const knowledgeGraphDeleteTool = {
  name: "knowledge_graph_delete",
  displayName: "Knowledge Graph Delete (Soft)",
  iconName: "Trash2",
  description:
    "Soft-deletes entity nodes or relationships from the active Knowledge Graph (marks isActive = false, preserving data while excluding from search).",
  parameters: {
    type: "OBJECT",
    properties: {
      entityNames: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "List of entity names or IDs to soft-delete from the active Knowledge Graph.",
      },
      relationships: {
        type: "ARRAY",
        description: "List of specific relationships to soft-delete.",
        items: {
          type: "OBJECT",
          properties: {
            source: {
              type: "STRING",
              description: "Source entity name.",
            },
            predicate: {
              type: "STRING",
              description: "Predicate relation to deactivate (optional).",
            },
            target: {
              type: "STRING",
              description: "Target entity name.",
            },
          },
          required: ["source", "target"],
        },
      },
    },
  },
  renderSummary: (args) => {
    const eCount = args.entityNames?.length || 0;
    const rCount = args.relationships?.length || 0;
    return `KG Delete: -${eCount} ${eCount === 1 ? "entity" : "entities"}, -${rCount} ${rCount === 1 ? "relation" : "relations"}`;
  },

  async execute(args, context = {}) {
    // Check permission from settings
    if (context?.settings?.allowKnowledgeGraphReadWrite === false) {
      return {
        success: false,
        error: "Permission denied: LLM Knowledge Graph read/write access is disabled in Settings. Please ask the user to enable it in Settings to allow the model to modify the graph.",
      };
    }

    const kgService = context.knowledgeGraph || knowledgeGraphInstance;

    const entitiesSoftDeleted = [];
    if (Array.isArray(args.entityNames)) {
      for (const name of args.entityNames) {
        if (name && typeof name === "string") {
          const res = kgService.softDeleteEntity(name);
          if (res.success) {
            entitiesSoftDeleted.push(res.entity);
          }
        }
      }
    }

    const relationsSoftDeleted = [];
    if (Array.isArray(args.relationships)) {
      for (const rel of args.relationships) {
        if (rel && rel.source && rel.target) {
          const res = kgService.softDeleteRelation(rel.source, rel.predicate, rel.target);
          if (res.success) {
            relationsSoftDeleted.push({
              source: rel.source,
              predicate: rel.predicate || "*",
              target: rel.target,
            });
          }
        }
      }
    }

    return {
      success: true,
      message: `Soft-deleted ${entitiesSoftDeleted.length} entities and ${relationsSoftDeleted.length} relations (isActive set to false).`,
      entitiesSoftDeleted,
      relationsSoftDeleted,
      currentStats: kgService.getStats(),
    };
  },
};
