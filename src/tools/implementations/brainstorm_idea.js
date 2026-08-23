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

    // Sort by cosine similarity score descending
    scoredEntities.sort((a, b) => b.score - a.score);

    // If no anchor entities found, return insufficient_knowledge guardrail
    if (scoredEntities.length === 0) {
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

    // 3. Contiguous Path Walk / Traversal of Length maxGraphLength starting from anchor node
    const activeRelations = (kgService.relations || []).filter(
      (r) => r.isActive !== false
    );

    // Fast adjacency map: nodeKey (id or lowercase name) -> list of incident relations
    const adjMap = new Map();
    const addToAdj = (key, rel) => {
      if (!key) return;
      const k = String(key).toLowerCase();
      if (!adjMap.has(k)) adjMap.set(k, []);
      adjMap.get(k).push(rel);
    };

    for (const rel of activeRelations) {
      addToAdj(rel.sourceId, rel);
      addToAdj(rel.targetId, rel);
      if (rel.sourceName) addToAdj(rel.sourceName, rel);
      if (rel.targetName) addToAdj(rel.targetName, rel);
    }

    // Select the best starting anchor node from top scoring matches that has active connections
    const topCandidates = scoredEntities.slice(0, 10);
    const connectedCandidates = topCandidates.filter((c) => {
      const byId = (adjMap.get(c.entity.id.toLowerCase()) || []).length > 0;
      const byName = (adjMap.get(c.entity.name.toLowerCase()) || []).length > 0;
      return byId || byName;
    });

    const candidatesToPick =
      connectedCandidates.length > 0 ? connectedCandidates : topCandidates;
    const startEntity =
      candidatesToPick[Math.abs(seed) % candidatesToPick.length].entity;

    const pathTriples = [];
    const visitedEntities = new Set([
      startEntity.id.toLowerCase(),
      startEntity.name.toLowerCase(),
    ]);
    const visitedEdges = new Set();
    let currentEntityId = startEntity.id;
    let currentEntityName = startEntity.name.toLowerCase();

    for (let step = 0; step < maxGraphLength; step++) {
      const incidentEdgesById =
        adjMap.get(currentEntityId.toLowerCase()) || [];
      const incidentEdgesByName =
        adjMap.get(currentEntityName) || [];

      const edgeCandidateMap = new Map();
      for (const r of [...incidentEdgesById, ...incidentEdgesByName]) {
        const edgeKey =
          r.id || `${r.sourceName}:${r.predicate}:${r.targetName}`;
        if (!visitedEdges.has(edgeKey)) {
          edgeCandidateMap.set(edgeKey, r);
        }
      }
      const incidentEdges = Array.from(edgeCandidateMap.values());

      // Prioritize edges leading to unvisited neighbors to ensure long continuous traversal
      const unvisitedEdges = incidentEdges.filter((r) => {
        const isSourceCurrent =
          r.sourceId?.toLowerCase() === currentEntityId.toLowerCase() ||
          (r.sourceName &&
            r.sourceName.toLowerCase() === currentEntityName);
        const otherId = (isSourceCurrent ? r.targetId : r.sourceId)?.toLowerCase();
        const otherName = (
          isSourceCurrent ? r.targetName : r.sourceName
        )?.toLowerCase();
        return (
          (!otherId || !visitedEntities.has(otherId)) &&
          (!otherName || !visitedEntities.has(otherName))
        );
      });

      let chosenEdge = null;
      if (unvisitedEdges.length > 0) {
        const idx = (Math.abs(seed) + step * 37) % unvisitedEdges.length;
        chosenEdge = unvisitedEdges[idx];
      } else if (incidentEdges.length > 0) {
        const idx = (Math.abs(seed) + step * 37) % incidentEdges.length;
        chosenEdge = incidentEdges[idx];
      } else {
        // If current node is a dead-end, expand from previously visited entities on the path
        for (const vKey of visitedEntities) {
          const vEdges = (adjMap.get(vKey) || []).filter((r) => {
            const edgeKey =
              r.id || `${r.sourceName}:${r.predicate}:${r.targetName}`;
            return !visitedEdges.has(edgeKey);
          });
          if (vEdges.length > 0) {
            chosenEdge = vEdges[(Math.abs(seed) + step) % vEdges.length];
            currentEntityId = vKey;
            currentEntityName = vKey;
            break;
          }
        }

        // If local cluster is fully exhausted, jump to the next matching anchor entity to continue traversal
        if (!chosenEdge) {
          for (const candidate of topCandidates) {
            const cId = candidate.entity.id.toLowerCase();
            const cName = candidate.entity.name.toLowerCase();
            if (!visitedEntities.has(cId) && !visitedEntities.has(cName)) {
              const cEdges = (
                adjMap.get(cId) ||
                adjMap.get(cName) ||
                []
              ).filter((r) => {
                const edgeKey =
                  r.id || `${r.sourceName}:${r.predicate}:${r.targetName}`;
                return !visitedEdges.has(edgeKey);
              });
              if (cEdges.length > 0) {
                chosenEdge = cEdges[(Math.abs(seed) + step) % cEdges.length];
                currentEntityId = cId;
                currentEntityName = cName;
                break;
              }
            }
          }
        }

        if (!chosenEdge) break; // All available graph components exhausted
      }

      const edgeKey =
        chosenEdge.id ||
        `${chosenEdge.sourceName}:${chosenEdge.predicate}:${chosenEdge.targetName}`;
      visitedEdges.add(edgeKey);

      const sourceEntity = kgService.entities.get(chosenEdge.sourceId);
      const targetEntity = kgService.entities.get(chosenEdge.targetId);
      const sName =
        chosenEdge.sourceName || sourceEntity?.name || chosenEdge.sourceId;
      const tName =
        chosenEdge.targetName || targetEntity?.name || chosenEdge.targetId;

      pathTriples.push({
        sourceId: chosenEdge.sourceId,
        sourceName: sName,
        predicate: chosenEdge.predicate,
        targetId: chosenEdge.targetId,
        targetName: tName,
        description: chosenEdge.description,
      });

      const isSourceCurrent =
        chosenEdge.sourceId?.toLowerCase() === currentEntityId.toLowerCase() ||
        (chosenEdge.sourceName &&
          chosenEdge.sourceName.toLowerCase() === currentEntityName);
      const nextId = isSourceCurrent
        ? chosenEdge.targetId
        : chosenEdge.sourceId;
      const nextName = (isSourceCurrent ? tName : sName).toLowerCase();

      if (nextId) visitedEntities.add(nextId.toLowerCase());
      if (nextName) visitedEntities.add(nextName);
      currentEntityId = nextId || nextName;
      currentEntityName = nextName;
    }

    // 4. Guardrail: If no connections could be traversed from the start node
    if (pathTriples.length === 0) {
      const suggestedQueries = rawKeywords.map(
        (k) => `${k} core thesis principles mechanisms`
      );
      return {
        status: "insufficient_knowledge",
        actionRequired: "SEARCH_AND_INDEX_THEN_RETRY",
        keywords: rawKeywords,
        missingTopics: rawKeywords,
        instruction: `The starting Knowledge Graph anchor node [${startEntity.name}] has no active relational connections.\n\nTo construct a structurally grounded brainstorm:\n1. Use Google Search to look up: ${suggestedQueries
          .map((q) => `"${q}"`)
          .join(
            ", "
          )}.\n2. Call 'knowledge_graph_write' to index the key entities, mechanisms, and relationships into the Knowledge Graph.\n3. Re-run 'brainstorm_idea' with the keywords to generate the grounded synthesis.`,
        suggestedSearchQueries: suggestedQueries,
        summary: `Knowledge Graph node [${startEntity.name}] lacks relational connections. Prompting agent to search web, index into KG, and retry.`,
      };
    }

    // 5. Apply K Random Mutations along the traversed path
    const mutations = [];
    const baseSubgraph = [];
    const mutatedSubgraph = [];

    // Deterministic pseudo-random generator from seed
    const pseudoRandom = (offset) => {
      const x = Math.sin(seed + offset * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };

    let mutationCount = 0;
    const mutateDecisions = pathTriples.map((_, i) => {
      // If only 1 hop, mutate it. If multiple, mutate with probability ~0.55
      const shouldMutate =
        pathTriples.length === 1 || pseudoRandom(i) > 0.45;
      if (shouldMutate) mutationCount++;
      return shouldMutate;
    });

    // Guarantee at least 1 mutation if all rolled false
    if (mutationCount === 0 && pathTriples.length > 0) {
      const forcedIdx = Math.abs(seed) % pathTriples.length;
      mutateDecisions[forcedIdx] = true;
      mutationCount = 1;
    }

    pathTriples.forEach((triple, i) => {
      baseSubgraph.push(triple);
      const isMutated = mutateDecisions[i];

      if (isMutated) {
        const { mutatedPredicate, mutationType, explanation } =
          getMutatedPredicate(triple.predicate, seed + i);
        mutations.push({
          step: i + 1,
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
          step: i + 1,
          source: triple.sourceName,
          originalPredicate: triple.predicate,
          mutatedPredicate: triple.predicate,
          target: triple.targetName,
          isMutated: false,
          explanation: "Preserved continuous path connection.",
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
          `[Hop ${m.step}] [${m.source}] -[${m.originalPredicate}]-> [${m.target}] => -[${m.mutatedPredicate}]-`
      )
      .join("; ");

    const baseChainStr = baseSubgraph
      .map(
        (t, idx) =>
          `[Hop ${idx + 1}] [${t.sourceName}] ----[${t.predicate}]---> [${t.targetName}]`
      )
      .join(" ↳ ");

    const mutatedChainStr = mutatedSubgraph
      .map(
        (t, idx) =>
          `[Hop ${idx + 1}] [${t.sourceName}] ----[${t.predicate}]---> [${t.targetName}]${
            t.isMutated ? " *(MUTATED)*" : ""
          }`
      )
      .join(" ↳ ");

    const graphConnection = {
      technique: "predicate_swap",
      keywords: rawKeywords,
      startAnchorNode: startEntity.name,
      requestedPathLength: maxGraphLength,
      actualTraversedHops: pathTriples.length,
      mutatedHopsCount: mutationCount,
      preservedHopsCount: pathTriples.length - mutationCount,
      traversedEntities: Array.from(visitedEntities).map(
        (id) => kgService.entities.get(id)?.name || id
      ),
      basePathChain: baseChainStr,
      mutatedPathChain: mutatedChainStr,
      mutations,
      summary: `Traversed ${pathTriples.length}-hop continuous path starting at [${startEntity.name}], with ${mutationCount}/${pathTriples.length} predicates randomly mutated (${mutatedTriplesSummary}) [Seed: ${seed}].`,
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
      startAnchorNode: startEntity.name,
      seedUsed: seed,
      requestedPathLength: maxGraphLength,
      actualTraversedHops: pathTriples.length,
      graphConnection,
      polishedIdea,
      summary: `Brainstormed: "${polishedIdea.title}" via ${pathTriples.length}-Hop Path Traversal from [${startEntity.name}] with ${mutationCount} edge mutations [Seed: ${seed}].`,
    };
  },
};
