import { executeKgSearch } from "./kg_helpers.js";

export const userKnowledgeGraphSearchTool = {
  name: "user_knowledge_graph_search",
  displayName: "User Knowledge Search",
  iconName: "FileText",
  description:
    "Queries the User Knowledge Graph strictly for user identity facts, declared preferences, current projects, coding styles, hardware/OS setup, and user relations.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "Keywords or topic regarding the user (e.g. 'preferred python framework', 'operating system').",
      },
      entityTypes: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Optional types filter e.g. ['Preference', 'Project', 'Technology', 'Person'].",
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
  renderSummary: (args) => `User KG: "${args.query || ""}"`,
  async execute(args, context = {}) {
    return executeKgSearch(args, context, true);
  },
};
