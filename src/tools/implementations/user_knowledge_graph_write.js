import { executeKgWrite } from "./kg_helpers.js";

export const userKnowledgeGraphWriteTool = {
  name: "user_knowledge_graph_write",
  displayName: "User KG Ingestion",
  iconName: "FileText",
  description:
    "Ingest factual entities, projects, preferences, hardware/OS setup, and direct triples strictly into the User Knowledge Graph. Auto-syncs to user.md.",
  parameters: {
    type: "OBJECT",
    properties: {
      entities: {
        type: "ARRAY",
        description: "List of new or updated user-specific entity nodes.",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Canonical name of the entity." },
            types: { type: "ARRAY", items: { type: "STRING" }, description: "Types e.g. Person, Preference, Project, Technology, Tool, Location." },
            description: { type: "STRING", description: "Factual summary of user's relationship with this entity." },
            aliases: { type: "ARRAY", items: { type: "STRING" }, description: "Alternative names or shortcuts." },
          },
          required: ["name"],
        },
      },
      relationships: {
        type: "ARRAY",
        description: "List of directed semantic triples connecting user entities.",
        items: {
          type: "OBJECT",
          properties: {
            source: { type: "STRING", description: "Source entity name." },
            predicate: { type: "STRING", description: "Semantic relation (e.g., PREFERS, WORKS_ON, USES, CREATED, LOCATED_IN)." },
            target: { type: "STRING", description: "Target entity name." },
            description: { type: "STRING", description: "Factual explanation." },
          },
          required: ["source", "predicate", "target"],
        },
      },
    },
  },
  renderSummary: (args) =>
    `User KG: +${args.entities?.length || 0} entities, +${args.relationships?.length || 0} triples`,
  async execute(args, context = {}) {
    return executeKgWrite(args, context, true);
  },
};
