/**
 * Knowledge Search Tool for ChatGemma (Google Knowledge Graph & GraphRAG Principles)
 * Enables Gemma to search its interconnected Knowledge Graph for entities, facts,
 * semantic relationships, and multi-hop reasoning paths.
 */

import { knowledgeGraphInstance } from "../../services/knowledgeGraph.js";

export const knowledgeSearchTool = {
  name: "knowledge_search",
  displayName: "Knowledge Graph Search",
  iconName: "Share2",
  description:
    "Searches the interconnected Knowledge Graph for entities, facts, relationships, and multi-hop reasoning paths across learned concepts, people, projects, technologies, and memories.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The entity, concept, project, or relationship query to look up in the Knowledge Graph.",
      },
      types: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Optional filter by Schema.org entity types (e.g. ['Person', 'Organization', 'Project', 'Technology', 'Concept', 'Location', 'Preference']).",
      },
      relations: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Optional filter by predicate relations (e.g. ['CREATED', 'WORKS_ON', 'USES', 'PREFERS', 'LOCATED_IN', 'PART_OF', 'ASSOCIATED_WITH']).",
      },
      depth: {
        type: "INTEGER",
        description: "Graph traversal depth for multi-hop connected facts (1 to 3, default: 1).",
      },
      limit: {
        type: "INTEGER",
        description: "Maximum number of entities/triples to return (default: 10).",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) => `KG: "${args.query || ""}"${args.depth > 1 ? ` (depth: ${args.depth})` : ""}`,

  async execute(args, context = {}) {
    // Permission Check
    const isAllowed = context.settings?.allowKnowledgeGraphReadWrite !== false;
    if (!isAllowed) {
      return {
        error:
          "Permission denied: LLM Knowledge Graph read/write access is disabled in Settings. Please enable it in Settings to allow searching the graph.",
        status: "permission_denied",
      };
    }

    const query = (args.query || "").trim();
    const types = args.types || [];
    const relations = args.relations || [];
    const depth = args.depth || 1;
    const limit = args.limit || 10;

    const kgService = context.knowledgeGraph || knowledgeGraphInstance;

    const searchResults = kgService.search(query, {
      types,
      relations,
      depth,
      limit,
    });

    return {
      query,
      found: searchResults.totalEntitiesFound > 0 || searchResults.totalTriplesFound > 0,
      totalEntities: searchResults.totalEntitiesFound,
      totalTriples: searchResults.totalTriplesFound,
      matchedEntities: searchResults.matchedEntities.map((e) => ({
        name: e.name,
        types: e.types,
        description: e.description,
        attributes: e.attributes,
      })),
      facts: searchResults.directTriples.map((t) => ({
        subject: t.sourceName,
        predicate: t.predicate,
        object: t.targetName,
        description: t.description,
        confidence: t.confidence,
      })),
      paths: searchResults.connectedPaths,
      summary: searchResults.subgraphSummary,
    };
  },
};
