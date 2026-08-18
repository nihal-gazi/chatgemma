/**
 * Knowledge Graph Write Tool for ChatGemma
 * Enables Gemma to autonomously create, update, or reinforce entity nodes
 * and semantic relationships in the Knowledge Graph.
 */

import { knowledgeGraphInstance } from "../../services/knowledgeGraph.js";

export const knowledgeGraphWriteTool = {
  name: "knowledge_graph_write",
  displayName: "Knowledge Graph Write",
  iconName: "Share2",
  description:
    "Writes, updates, or reinforces factual entities and directed semantic relationships (triples) into the persistent Knowledge Graph.",
  parameters: {
    type: "OBJECT",
    properties: {
      entities: {
        type: "ARRAY",
        description: "List of entities to create or update in the Knowledge Graph.",
        items: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: "Canonical name of the entity.",
            },
            types: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Schema.org entity types (e.g., ['Person', 'Organization', 'Project', 'Technology', 'Concept', 'Location', 'Preference']).",
            },
            description: {
              type: "STRING",
              description: "Concise factual summary of the entity.",
            },
            aliases: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Alternative names, abbreviations, or acronyms.",
            },
          },
          required: ["name"],
        },
      },
      relationships: {
        type: "ARRAY",
        description: "List of directed semantic triples to create or update.",
        items: {
          type: "OBJECT",
          properties: {
            source: {
              type: "STRING",
              description: "Source entity name.",
            },
            predicate: {
              type: "STRING",
              description: "Predicate relation (e.g. CREATED, WORKS_ON, USES, PREFERS, LOCATED_IN, PART_OF, ASSOCIATED_WITH, RESEARCHES, IMPLEMENTS).",
            },
            target: {
              type: "STRING",
              description: "Target entity name.",
            },
            description: {
              type: "STRING",
              description: "Clear sentence explaining the connection between source and target.",
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
    return `KG Write: +${eCount} ${eCount === 1 ? "entity" : "entities"}, +${rCount} ${rCount === 1 ? "relation" : "relations"}`;
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
    const sessionId = context.activeSession?.id || "";

    const entitiesWritten = [];
    if (Array.isArray(args.entities)) {
      for (const ent of args.entities) {
        if (ent && ent.name) {
          const written = kgService.writeEntity({
            name: ent.name,
            types: ent.types || ["Concept"],
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
          const written = kgService.writeRelation({
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

    return {
      success: true,
      message: `Successfully wrote ${entitiesWritten.length} entities and ${relationsWritten.length} relations to the Knowledge Graph.`,
      entitiesWritten,
      relationsWritten,
      currentStats: kgService.getStats(),
    };
  },
};
