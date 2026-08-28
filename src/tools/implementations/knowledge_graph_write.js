import { executeKgWrite } from "./kg_helpers.js";

export const knowledgeGraphWriteTool = {
  name: "knowledge_graph_write",
  displayName: "Knowledge Graph Ingestion",
  iconName: "Share2",
  description:
    "Ingest new factual entities, concepts, technical systems, or directed semantic relationships into the General Knowledge Graph. Duplicates are merged automatically.",
  parameters: {
    type: "OBJECT",
    properties: {
      entities: {
        type: "ARRAY",
        description: "List of new or updated entity nodes.",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Canonical name of the entity." },
            types: { type: "ARRAY", items: { type: "STRING" }, description: "Types e.g. Person, Organization, Technology, Concept, Tool, Project." },
            description: { type: "STRING", description: "Factual summary of the entity." },
            aliases: { type: "ARRAY", items: { type: "STRING" }, description: "Alternative names or acronyms." },
          },
          required: ["name"],
        },
      },
      relationships: {
        type: "ARRAY",
        description: "List of directed semantic triples connecting entities.",
        items: {
          type: "OBJECT",
          properties: {
            source: { type: "STRING", description: "Source entity name." },
            predicate: { type: "STRING", description: "Semantic relation (e.g., CREATED, USES, PART_OF, DEPENDS_ON)." },
            target: { type: "STRING", description: "Target entity name." },
            description: { type: "STRING", description: "Factual explanation of the relationship." },
          },
          required: ["source", "predicate", "target"],
        },
      },
    },
  },
  renderSummary: (args) =>
    `+${args.entities?.length || 0} entities, +${args.relationships?.length || 0} triples`,
  async execute(args, context = {}) {
    return executeKgWrite(args, context, false);
  },
};
