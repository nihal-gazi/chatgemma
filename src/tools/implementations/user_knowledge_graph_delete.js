import { executeKgDelete } from "./kg_helpers.js";

export const userKnowledgeGraphDeleteTool = {
  name: "user_knowledge_graph_delete",
  displayName: "User KG Deletion",
  iconName: "Trash2",
  description:
    "Soft-deletes user preferences, identity facts, or obsolete project triples strictly from the User Knowledge Graph. Auto-reconciles user.md.",
  parameters: {
    type: "OBJECT",
    properties: {
      entityNames: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Names or IDs of user-specific entities to deactivate.",
      },
      relationships: {
        type: "ARRAY",
        description: "User relationships to deactivate.",
        items: {
          type: "OBJECT",
          properties: {
            source: { type: "STRING", description: "Source entity name." },
            predicate: { type: "STRING", description: "Semantic relation (or '*' for all)." },
            target: { type: "STRING", description: "Target entity name." },
          },
          required: ["source", "target"],
        },
      },
    },
  },
  renderSummary: (args) =>
    `User KG: -${args.entityNames?.length || 0} entities, -${args.relationships?.length || 0} triples`,
  async execute(args, context = {}) {
    return executeKgDelete(args, context, true);
  },
};
