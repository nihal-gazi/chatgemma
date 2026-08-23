/**
 * Knowledge-Graph-Driven Brainstorming Tool for ChatGemma
 * Implements:
 * 1. Predicate Swapping (Edge Mutation)
 * 2. Isomorphic Mapping (Cross-Domain Analogy)
 * 3. Semantic similarity and Graph Density Guardrails ("not_enough_knowledge")
 */

import { knowledgeGraphInstance } from "../../services/knowledgeGraph.js";
import {
  getMutatedPredicate,
  computeSemanticSimilarity,
  extractSalientKeywords,
} from "../../utils/similarity.js";
import { synthesizeBrainstormWithGemma } from "../../services/brainstormSynthesizer.js";

export const brainstormIdeaTool = {
  name: "brainstorm_idea",
  displayName: "KG Idea Brainstormer",
  iconName: "Sparkles",
  description:
    "Brainstorms novel, non-obvious ideas and breakthrough hypotheses using Knowledge Graph structural reasoning and Predicate Swapping (randomized edge mutations). Accepts a set of target keywords to retrieve anchor subgraphs using cosine similarity, applies randomized partial or full predicate inversions, and calls Gemma to synthesize a polished, deep proposal. If the graph lacks data, returns an agentic SEARCH_AND_INDEX directive.",
  parameters: {
    type: "OBJECT",
    properties: {
      keywords: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Array of target concepts, keywords, or domain terms to anchor the brainstorm around (e.g. ['attention mechanism', 'loss landscape'], ['quantum tunneling', 'flash memory'], ['Al-Ghazali', 'rationalism']).",
      },
      max_graph_length: {
        type: "INTEGER",
        description:
          "Maximum length / count of relational triples in the extracted subgraph to anchor and mutate (e.g. 3, 5, 8, default: 6).",
      },
      seed: {
        type: "INTEGER",
        description:
          "Optional random seed number (e.g. 1, 42, 101, 2026) to explore diverse idea variations and randomize which predicates get swapped.",
      },
      targetDomain: {
        type: "STRING",
        description: "Optional domain context to guide the application of the brainstormed idea.",
      },
    },
    required: ["keywords"],
  },
  renderSummary: (args) => {
    const kws = Array.isArray(args.keywords)
      ? args.keywords.join(", ")
      : args.keywords || args.prompt || "";
    return `Brainstorm: [${kws}] (max_len: ${args.max_graph_length || 6}${
      args.seed !== undefined ? `, seed: ${args.seed}` : ""
    })`;
  },

  async execute(args, context = {}) {
    // 1. Normalize keywords and parameters
    let rawKeywords = [];
    if (Array.isArray(args.keywords)) {
      rawKeywords = args.keywords.map((k) => String(k).trim()).filter(Boolean);
    } else if (typeof args.keywords === "string" && args.keywords.trim()) {
      rawKeywords = args.keywords
        .split(/[,;\n]+/)
        .map((k) => k.trim())
        .filter(Boolean);
    } else if (args.prompt && typeof args.prompt === "string") {
      const extracted = extractSalientKeywords(args.prompt);
      rawKeywords =
        extracted.rawTerms.length > 0 ? extracted.rawTerms : [args.prompt.trim()];
    }

    const maxGraphLength = Math.max(
      1,
      Math.min(Number(args.max_graph_length) || 6, 30)
    );
    const targetDomain = (args.targetDomain || "").trim();
    const seed =
      args.seed !== undefined
        ? Number(args.seed) || 0
        : Math.floor(Math.random() * 100000);

    if (rawKeywords.length === 0) {
      return {
        status: "error",
        message:
          "No keywords provided. Please specify one or more keywords to anchor the brainstorm.",
      };
    }

    const kgService = context.knowledgeGraph || knowledgeGraphInstance;
    const apiKey = context.apiKey || context.settings?.apiKey;
    const modelId = context.modelId || context.settings?.modelId;
    const signal = context.signal;

    // 2. Retrieve anchor entities using Cosine Similarity (MiniLM-style character n-gram cosine sim)
    const allEntities = Array.from(kgService.entities.values()).filter(
      (e) => e.isActive !== false
    );
    const scoredEntities = [];

    for (const kw of rawKeywords) {
      const kwLower = kw.toLowerCase();
      for (const entity of allEntities) {
        let simScore = 0;
        const nameLower = (entity.name || "").toLowerCase();
        const descLower = (entity.description || "").toLowerCase();

        if (nameLower === kwLower) {
          simScore = 1.0;
        } else if (entity.aliases?.some((a) => a.toLowerCase() === kwLower)) {
          simScore = 0.95;
        } else if (
          nameLower.includes(kwLower) ||
          (kwLower.length > 3 && kwLower.includes(nameLower))
        ) {
          simScore = 0.85;
        } else {
          const simName = computeSemanticSimilarity(kwLower, nameLower);
          const simDesc = descLower
            ? computeSemanticSimilarity(kwLower, descLower.slice(0, 120)) * 0.7
            : 0;
          simScore = Math.max(simName, simDesc);
        }

        if (simScore >= 0.52) {
          scoredEntities.push({ entity, score: simScore, matchedKeyword: kw });
        }
      }
    }

    // Sort by cosine similarity score descending and deduplicate
    scoredEntities.sort((a, b) => b.score - a.score);
    const anchorMap = new Map();
    for (const item of scoredEntities) {
      if (!anchorMap.has(item.entity.id)) {
        anchorMap.set(item.entity.id, item.entity);
      }
      if (anchorMap.size >= maxGraphLength * 2) break;
    }
    const anchorEntities = Array.from(anchorMap.values());

    // 3. Extract connected relational triples starting from anchor entities
    const candidateTriples = [];
    const activeRelations = (kgService.relations || []).filter(
      (r) => r.isActive !== false
    );
    const anchorIdSet = new Set(anchorEntities.map((e) => e.id));

    if (anchorIdSet.size > 0) {
      for (const rel of activeRelations) {
        if (anchorIdSet.has(rel.sourceId) || anchorIdSet.has(rel.targetId)) {
          const sourceEntity = kgService.entities.get(rel.sourceId);
          const targetEntity = kgService.entities.get(rel.targetId);
          if (sourceEntity && targetEntity) {
            candidateTriples.push({
              sourceId: rel.sourceId,
              sourceName: rel.sourceName || sourceEntity.name,
              predicate: rel.predicate,
              targetId: rel.targetId,
              targetName: rel.targetName || targetEntity.name,
              description: rel.description,
            });
          }
        }
        if (candidateTriples.length >= maxGraphLength * 3) break;
      }
    }

    // Deduplicate candidate triples
    const tripleMap = new Map();
    for (const t of candidateTriples) {
      const key = `${t.sourceName}:${t.predicate}:${t.targetName}`;
      if (!tripleMap.has(key)) {
        tripleMap.set(key, t);
      }
    }
    let connectedTriples = Array.from(tripleMap.values());

    // 4. Knowledge Density Guardrail: Check if graph has enough data
    if (connectedTriples.length === 0) {
      const suggestedQueries = rawKeywords.map(
        (k) => `${k} core thesis principles mechanisms`
      );
      return {
        status: "insufficient_knowledge",
        actionRequired: "SEARCH_AND_INDEX_THEN_RETRY",
        keywords: rawKeywords,
        missingTopics: rawKeywords,
        instruction: `The Knowledge Graph lacks sufficient entity-relation connections for keywords: ${rawKeywords
          .map((k) => `"${k}"`)
          .join(
            ", "
          )}.\n\nTo construct a structurally grounded brainstorm:\n1. Use Google Search to look up: ${suggestedQueries
          .map((q) => `"${q}"`)
          .join(
            ", "
          )}.\n2. Call 'knowledge_graph_write' to index the key entities, mechanisms, and relationships into the Knowledge Graph.\n3. Re-run 'brainstorm_idea' with the keywords to generate the grounded synthesis.`,
        suggestedSearchQueries: suggestedQueries,
        summary: `Knowledge Graph lacks relational facts for ${rawKeywords.join(
          ", "
        )}. Prompting agent to search web, index into KG, and retry.`,
      };
    }

    // Slice to maxGraphLength
    connectedTriples = connectedTriples.slice(0, maxGraphLength);

    // 5. Randomized Predicate Swapping: Randomly swap a subset, all, or single predicates
    const mutations = [];
    const baseSubgraph = [];
    const mutatedSubgraph = [];

    // Deterministic pseudo-random generator from seed
    const pseudoRandom = (offset) => {
      const x = Math.sin(seed + offset * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };

    let mutationCount = 0;
    const mutateDecisions = connectedTriples.map((_, i) => {
      // If only 1 triple, mutate it. If multiple, mutate with probability ~0.55
      const shouldMutate =
        connectedTriples.length === 1 || pseudoRandom(i) > 0.45;
      if (shouldMutate) mutationCount++;
      return shouldMutate;
    });

    // Guarantee at least 1 mutation if all rolled false
    if (mutationCount === 0 && connectedTriples.length > 0) {
      const forcedIdx = Math.abs(seed) % connectedTriples.length;
      mutateDecisions[forcedIdx] = true;
      mutationCount = 1;
    }

    connectedTriples.forEach((triple, i) => {
      baseSubgraph.push(triple);
      const isMutated = mutateDecisions[i];

      if (isMutated) {
        const { mutatedPredicate, mutationType, explanation } =
          getMutatedPredicate(triple.predicate, seed + i);
        mutations.push({
          source: triple.sourceName,
          originalPredicate: triple.predicate,
          mutatedPredicate,
          target: triple.targetName,
          isMutated: true,
          mutationType,
          explanation,
        });
        mutatedSubgraph.push({
          ...triple,
          predicate: mutatedPredicate,
          isMutated: true,
        });
      } else {
        mutations.push({
          source: triple.sourceName,
          originalPredicate: triple.predicate,
          mutatedPredicate: triple.predicate,
          target: triple.targetName,
          isMutated: false,
          explanation: "Preserved original relational context.",
        });
        mutatedSubgraph.push({
          ...triple,
          isMutated: false,
        });
      }
    });

    const mutatedTriplesSummary = mutations
      .filter((m) => m.isMutated)
      .map(
        (m) =>
          `[${m.source}] -[${m.originalPredicate}]-> [${m.target}] => -[${m.mutatedPredicate}]-`
      )
      .join("; ");

    const graphConnection = {
      technique: "predicate_swap",
      keywords: rawKeywords,
      maxGraphLength,
      totalSubgraphTriples: connectedTriples.length,
      mutatedTriplesCount: mutationCount,
      preservedTriplesCount: connectedTriples.length - mutationCount,
      baseSubgraph: baseSubgraph.map(
        (t) => `[${t.sourceName}] ----[${t.predicate}]---> [${t.targetName}]`
      ),
      mutatedSubgraph: mutatedSubgraph.map(
        (t) =>
          `[${t.sourceName}] ----[${t.predicate}]---> [${t.targetName}]${
            t.isMutated ? " (MUTATED)" : " (PRESERVED)"
          }`
      ),
      mutations,
      summary: `Randomly swapped ${mutationCount}/${connectedTriples.length} predicates in subgraph (${mutatedTriplesSummary}) [Seed: ${seed}].`,
    };

    // 6. Deep Synthesis with Gemma
    const polishedIdea = await synthesizeBrainstormWithGemma(
      {
        keywords: rawKeywords,
        baseSubgraph,
        mutatedSubgraph,
        mutations,
        targetDomain,
      },
      { apiKey, modelId, signal, seed }
    );

    return {
      status: "success",
      technique: "predicate_swap",
      keywords: rawKeywords,
      seedUsed: seed,
      maxGraphLength,
      graphConnection,
      polishedIdea,
      summary: `Brainstormed: "${polishedIdea.title}" via Randomized Predicate Swapping on [${rawKeywords.join(
        ", "
      )}] (${mutationCount}/${connectedTriples.length} edges swapped) [Seed: ${seed}].`,
    };
  },
};
