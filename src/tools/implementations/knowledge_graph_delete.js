import { executeKgDelete } from "./kg_helpers.js";

export const knowledgeGraphDeleteTool = {
  name: "knowledge_graph_delete",
  displayName: "Knowledge Graph Deletion",
  iconName: "Trash2",
  description:
    "Soft-deletes factual entities or semantic relationships from the General Knowledge Graph. Nodes are marked inactive (isActive = false) preserving history.",
  parameters: {
    type: "OBJECT",
    properties: {
      entityNames: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Names or IDs of entities to soft-delete from the General Knowledge Graph.",
      },
      relationships: {
        type: "ARRAY",
        description: "Relationships to soft-delete.",
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
    `-${args.entityNames?.length || 0} entities, -${args.relationships?.length || 0} triples`,
  async execute(args, context = {}) {
    return executeKgDelete(args, context, false);
  },
};
