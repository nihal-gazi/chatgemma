/**
 * User Knowledge Graph Search Tool for ChatGemma
 * Searches the user-specific Knowledge Graph for personal identity facts,
 * user preferences, hardware/system setup, workflows, personal tools, and user projects.
 */

import { userKnowledgeGraphInstance } from "../../services/knowledgeGraph.js";

export const userKnowledgeGraphSearchTool = {
  name: "user_knowledge_graph_search",
  displayName: "User Knowledge Graph Search",
  iconName: "FileText",
  description:
    "Searches the dedicated User Knowledge Graph for personal user facts, preferences, workflows, background, personal projects, and custom instructions.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The user-specific preference, project, identity detail, or habit to query in the User Knowledge Graph.",
      },
      types: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Optional filter by entity types (e.g. ['Person', 'Project', 'Technology', 'Concept', 'Preference', 'Location']).",
      },
      relations: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Optional filter by predicate relations (e.g. ['PREFERS', 'USES', 'WORKS_ON', 'CREATED', 'LOCATED_IN', 'EXPERT_IN', 'INTERESTED_IN']).",
      },
      depth: {
        type: "INTEGER",
        description: "Graph traversal depth (1 to 3, default: 1).",
      },
      limit: {
        type: "INTEGER",
        description: "Maximum number of items to return (default: 10).",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) => `User KG: "${args.query || ""}"${args.depth > 1 ? ` (depth: ${args.depth})` : ""}`,

  async execute(args, context = {}) {
    // Check permission from settings
    if (context?.settings?.allowKnowledgeGraphReadWrite === false) {
      return {
        query: args.query || "",
        found: false,
        error: "Permission denied: LLM Knowledge Graph read/write access is disabled in Settings. Please ask the user to enable it in Settings to allow the model to interact with the graph.",
      };
    }

    const query = (args.query || "").trim();
    const types = args.types || [];
    const relations = args.relations || [];
    const depth = args.depth || 1;
    const limit = args.limit || 10;

    const userKgService = context.userKnowledgeGraph || userKnowledgeGraphInstance;

    const searchResults = userKgService.search(query, {
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
