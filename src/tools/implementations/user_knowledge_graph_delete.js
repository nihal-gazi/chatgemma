/**
 * User Knowledge Graph Delete Tool for ChatGemma (Soft Deletion)
 * Enables Gemma to soft-delete personal user facts and preferences from active retrieval
 * (isActive set to false, data preserved) and automatically syncs user.md.
 */

import { userKnowledgeGraphInstance } from "../../services/knowledgeGraph.js";
import { personalizationInstance } from "../../services/personalization.js";

export const userKnowledgeGraphDeleteTool = {
  name: "user_knowledge_graph_delete",
  displayName: "User Knowledge Graph Delete (Soft)",
  iconName: "Trash2",
  description:
    "Soft-deletes user-specific entities or relationships from active User Knowledge Graph retrieval (marks isActive = false and syncs user.md).",
  parameters: {
    type: "OBJECT",
    properties: {
      entityNames: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "List of user entity names or IDs to soft-delete from active User Knowledge Graph.",
      },
      relationships: {
        type: "ARRAY",
        description: "List of specific user relationships to soft-delete.",
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
    return `User KG Delete: -${eCount} ent, -${rCount} rel`;
  },

  async execute(args, context = {}) {
    // Check permission from settings
    if (context?.settings?.allowKnowledgeGraphReadWrite === false) {
      return {
        success: false,
        error: "Permission denied: LLM Knowledge Graph read/write access is disabled in Settings. Please ask the user to enable it in Settings to allow the model to modify the graph.",
      };
    }

    const userKgService = context.userKnowledgeGraph || userKnowledgeGraphInstance;
    const persService = context.personalization || personalizationInstance;

    const entitiesSoftDeleted = [];
    if (Array.isArray(args.entityNames)) {
      for (const name of args.entityNames) {
        if (name && typeof name === "string") {
          const res = userKgService.softDeleteEntity(name);
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
          const res = userKgService.softDeleteRelation(rel.source, rel.predicate, rel.target);
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

    // CRITICAL: Synchronize user.md whenever User Knowledge Graph is modified
    if (entitiesSoftDeleted.length > 0 || relationsSoftDeleted.length > 0) {
      const summaryText = `Soft-deleted ${entitiesSoftDeleted.length} user entities and ${relationsSoftDeleted.length} user relations`;
      persService
        .syncFromUserKnowledgeGraph({
          userKnowledgeGraph: userKgService,
          modificationSummary: summaryText,
          apiKey: context?.settings?.apiKey,
          modelId: context?.settings?.modelId,
          maxTokens: context?.settings?.personalizationMaxTokens || 5000,
        })
        .catch((err) => console.warn("[UserKG] user.md sync error:", err));
    }

    return {
      success: true,
      message: `Soft-deleted ${entitiesSoftDeleted.length} user entities and ${relationsSoftDeleted.length} user relations from User Knowledge Graph. Synchronized user.md.`,
      entitiesSoftDeleted,
      relationsSoftDeleted,
      currentStats: userKgService.getStats(),
    };
  },
};
