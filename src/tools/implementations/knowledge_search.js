import { executeKgSearch } from "./kg_helpers.js";

export const knowledgeSearchTool = {
  name: "knowledge_search",
  displayName: "General Knowledge Search",
  iconName: "Share2",
  description:
    "Searches the General Knowledge Graph for concepts, technologies, architectures, world facts, and directed relationships. Supports multi-hop GraphRAG traversal.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "Keywords, concept name, technology, or topic to search.",
      },
      entityTypes: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Optional types filter e.g. ['Technology', 'Concept', 'Organization'].",
      },
      maxDepth: {
        type: "INTEGER",
        description: "Graph traversal depth (default: 2, max: 4).",
      },
      limit: {
        type: "INTEGER",
        description: "Maximum entities to return (default: 10).",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) => `Search: "${args.query || ""}"`,
  async execute(args, context = {}) {
    return executeKgSearch(args, context, false);
  },
};
