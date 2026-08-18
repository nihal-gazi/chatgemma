/**
 * Custom Tool: knowledge_graph_write
 * Allows Gemma to explicitly add, update, and interconnect entity nodes and directed semantic triples.
 */

export const knowledgeGraphWriteTool = {
  declaration: {
    name: "knowledge_graph_write",
    description:
      "Explicitly writes, adds, or updates entity nodes and directed semantic relationships (triples) in the GraphRAG Knowledge Graph. Use this tool whenever you learn new verified facts, user preferences, projects, or connections.",
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
                description: "Canonical name of the entity (e.g. 'Nihal Gazi', 'ChatGemma', 'Rust', 'Tokyo').",
              },
              types: {
                type: "ARRAY",
                items: { type: "STRING" },
                description:
                  "Schema.org entity types: Person, Organization, Project, Technology, Concept, Location, Preference, Tool.",
              },
              description: {
                type: "STRING",
                description: "Accurate factual summary describing this entity.",
              },
              aliases: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Alternative names, nicknames, or acronyms.",
              },
              attributes: {
                type: "OBJECT",
                description: "Key-value attributes (e.g. { role: 'Software Engineer', location: 'Tokyo' }).",
              },
            },
            required: ["name"],
          },
        },
        relationships: {
          type: "ARRAY",
          description: "List of directed semantic triples (Subject --[PREDICATE]--> Object) to link entities.",
          items: {
            type: "OBJECT",
            properties: {
              source: {
                type: "STRING",
                description: "Name or ID of the source entity (Subject).",
              },
              predicate: {
                type: "STRING",
                description:
                  "Typed semantic relationship: CREATED, WORKS_ON, USES, PREFERS, LOCATED_IN, PART_OF, ASSOCIATED_WITH, RESEARCHES, EXPERT_IN, IMPLEMENTS.",
              },
              target: {
                type: "STRING",
                description: "Name or ID of the target entity (Object).",
              },
              description: {
                type: "STRING",
                description: "Clear sentence explaining the factual nature of this relationship.",
              },
              confidence: {
                type: "NUMBER",
                description: "Confidence rating between 0.0 and 1.0 (default: 0.95).",
              },
            },
            required: ["source", "predicate", "target"],
          },
        },
      },
    },
  },

  async execute(args, context = {}) {
    const startTime = Date.now();
    const { entities = [], relationships = [] } = args || {};

    // 1. Permission Check
    const isAllowed = context.settings?.allowKnowledgeGraphReadWrite !== false;
    if (!isAllowed) {
      return {
        error:
          "Permission denied: LLM Knowledge Graph read/write access is disabled in Settings. Please enable it in Settings to allow modifying the graph.",
        status: "permission_denied",
        executionTimeMs: Date.now() - startTime,
      };
    }

    const kg = context.knowledgeGraph;
    if (!kg) {
      return {
        error: "Knowledge Graph service unavailable in execution context.",
        status: "unavailable",
        executionTimeMs: Date.now() - startTime,
      };
    }

    const writtenEntities = [];
    const writtenRelations = [];

    // 2. Write Entities
    if (Array.isArray(entities)) {
      for (const ent of entities) {
        if (ent && ent.name) {
          const written = kg.writeEntity({
            name: ent.name,
            types: ent.types || ["Concept"],
            description: ent.description || "",
            aliases: ent.aliases || [],
            attributes: ent.attributes || {},
            sourceSession: context.activeSession?.id || "",
          });
          if (written) writtenEntities.push(written);
        }
      }
    }

    // 3. Write Relationships
    if (Array.isArray(relationships)) {
      for (const rel of relationships) {
        if (rel && rel.source && rel.predicate && rel.target) {
          const written = kg.writeRelation({
            source: rel.source,
            predicate: rel.predicate,
            target: rel.target,
            description: rel.description || "",
            confidence: rel.confidence || 0.95,
            sourceSession: context.activeSession?.id || "",
          });
          if (written) writtenRelations.push(written);
        }
      }
    }

    return {
      success: true,
      writtenEntitiesCount: writtenEntities.length,
      writtenRelationsCount: writtenRelations.length,
      writtenEntities: writtenEntities.map((e) => ({
        name: e.name,
        types: e.types,
        description: e.description,
      })),
      writtenRelations: writtenRelations.map((r) => ({
        source: r.sourceName,
        predicate: r.predicate,
        target: r.targetName,
        description: r.description,
      })),
      stats: kg.getStats(),
      executionTimeMs: Date.now() - startTime,
    };
  },
};
