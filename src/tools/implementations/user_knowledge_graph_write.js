/**
 * User Knowledge Graph Write Tool for ChatGemma
 * Enables Gemma to record user-specific facts, preferences, workflows, personal tools,
 * and user projects in the dedicated User Knowledge Graph.
 * Automatically synchronizes and updates user.md with Gemma 31B.
 */

import { userKnowledgeGraphInstance } from "../../services/knowledgeGraph.js";
import { personalizationInstance } from "../../services/personalization.js";

export const userKnowledgeGraphWriteTool = {
  name: "user_knowledge_graph_write",
  displayName: "User Knowledge Graph Write",
  iconName: "FileText",
  description:
    "Writes, updates, or reinforces personal user facts, preferences, workflows, personal tools, and user projects into the dedicated User Knowledge Graph. (Automatically syncs user.md).",
  parameters: {
    type: "OBJECT",
    properties: {
      entities: {
        type: "ARRAY",
        description: "List of user-specific entities to create or update.",
        items: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: "Name of user entity (e.g., user name, favorite framework, user project, custom workflow rule).",
            },
            types: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Entity types (e.g. ['Person', 'Preference', 'Project', 'Technology', 'Concept', 'Location']).",
            },
            description: {
              type: "STRING",
              description: "Clear explanation of this user fact or preference.",
            },
            aliases: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Alternative names or shortcuts.",
            },
          },
          required: ["name"],
        },
      },
      relationships: {
        type: "ARRAY",
        description: "List of user-specific directed semantic triples to create or update.",
        items: {
          type: "OBJECT",
          properties: {
            source: {
              type: "STRING",
              description: "Source entity name (e.g., 'User', 'Nihal Gazi').",
            },
            predicate: {
              type: "STRING",
              description: "Predicate relation (e.g., PREFERS, USES, WORKS_ON, CREATED, LOCATED_IN, EXPERT_IN, INTERESTED_IN, DISLIKES, REQUIRES).",
            },
            target: {
              type: "STRING",
              description: "Target entity name (e.g., 'PyTorch', 'Dark Mode', 'Linux', 'ChatGemma').",
            },
            description: {
              type: "STRING",
              description: "Sentence explaining the user relationship.",
            },
            confidence: {
              type: "NUMBER",
              description: "Confidence rating between 0.1 and 1.0 (default: 0.95).",
            },
          },
          required: ["source", "predicate", "target"],
        },
      },
    },
  },
  renderSummary: (args) => {
    const eCount = args.entities?.length || 0;
    const rCount = args.relationships?.length || 0;
    return `User KG Write: +${eCount} ent, +${rCount} rel`;
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
    const sessionId = context.activeSession?.id || "";

    const entitiesWritten = [];
    if (Array.isArray(args.entities)) {
      for (const ent of args.entities) {
        if (ent && ent.name) {
          const written = userKgService.writeEntity({
            name: ent.name,
            types: ent.types || ["Preference"],
            description: ent.description || "",
            aliases: ent.aliases || [],
            attributes: ent.attributes || {},
            sourceSession: sessionId,
          });
          if (written) {
            entitiesWritten.push({
              id: written.id,
              name: written.name,
              types: written.types,
              description: written.description,
            });
          }
        }
      }
    }

    const relationsWritten = [];
    if (Array.isArray(args.relationships)) {
      for (const rel of args.relationships) {
        if (rel && rel.source && rel.predicate && rel.target) {
          const written = userKgService.writeRelation({
            source: rel.source,
            predicate: rel.predicate,
            target: rel.target,
            description: rel.description || "",
            confidence: rel.confidence || 0.95,
            sourceSession: sessionId,
          });
          if (written) {
            relationsWritten.push({
              source: written.sourceName,
              predicate: written.predicate,
              target: written.targetName,
              description: written.description,
            });
          }
        }
      }
    }

    // CRITICAL: Synchronize user.md whenever User Knowledge Graph is modified
    if (entitiesWritten.length > 0 || relationsWritten.length > 0) {
      const summaryText = `Added/updated ${entitiesWritten.length} user entities and ${relationsWritten.length} user relations`;
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
      message: `Successfully wrote ${entitiesWritten.length} user entities and ${relationsWritten.length} user relations to the User Knowledge Graph. Synchronized user.md.`,
      entitiesWritten,
      relationsWritten,
      currentStats: userKgService.getStats(),
    };
  },
};
