/**
 * Knowledge-Graph-Driven Brainstorming Tool for ChatGemma
 * Implements:
 * 1. Predicate Swapping (Continuous Path Walk with Edge Mutation)
 * 2. Random Disconnected Pair Synthesis (Novel conceptual bridges)
 */

import { knowledgeGraphInstance, userKnowledgeGraphInstance } from "../../services/knowledgeGraph.js";
import { ALL_CANDIDATE_PREDICATES } from "../../data/predicates.js";
import { createLCG } from "../../utils/prng.js";
import {
  getMutatedPredicate,
  computeSemanticSimilarity,
  extractSalientKeywords,
} from "../../utils/similarity.js";

export const brainstormIdeaTool = {
  name: "brainstorm_idea",
  displayName: "KG Idea Brainstormer",
  iconName: "Sparkles",
  description:
    "Brainstorms novel ideas using the Knowledge Graph via two distinct modes: 1. 'predicate_swap' (default): traverses a continuous multi-hop path of length L from keyword-matched anchors and applies K randomized predicate mutations along the path. 2. 'random_pair': chooses K pairs of random nodes between which there is NO connection in the graph and assigns a random predicate to bridge unrelated concepts. Returns connections list. The AI model must verify whether a valid idea can be made; otherwise, re-run with different seeds, modes, or keywords.",
  parameters: {
    type: "OBJECT",
    properties: {
      mode: {
        type: "STRING",
        enum: ["predicate_swap", "random_pair"],
        description:
          "Brainstorming technique: 'predicate_swap' (default: continuous graph walk of length L with randomized predicate mutations) or 'random_pair' (generates K random disconnected node pairs with a random predicate to bridge unrelated concepts).",
      },
      keywords: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Array of target concepts, keywords, or domain terms to anchor the brainstorm around (e.g. ['attention mechanism', 'loss landscape']). Optional in 'random_pair' mode.",
      },
      k_pairs: {
        type: "INTEGER",
        description:
          "Count of random disconnected pairs to generate when mode is 'random_pair' (default: 5, min: 1, max: 20).",
      },
      max_graph_length: {
        type: "INTEGER",
        description:
          "Maximum length / count of relational triples in the continuous path walk for 'predicate_swap' mode (default: 6, min: 1, max: 30).",
      },
      seed: {
        type: "INTEGER",
        description:
          "Optional random seed number (e.g. 1, 42, 101, 2026) to explore diverse idea variations and randomize pair/predicate selections.",
      },
      targetDomain: {
        type: "STRING",
        description: "Optional domain context to guide the application of the brainstormed idea.",
      },
    },
  },
  renderSummary: (args) => {
    const mode = args.mode || "predicate_swap";
    const kws = Array.isArray(args.keywords)
      ? args.keywords.join(", ")
      : args.keywords || args.prompt || "";
    if (mode === "random_pair") {
      return `Brainstorm (Random Pairs): ${args.k_pairs || args.max_graph_length || 5} pairs${
        args.seed !== undefined ? `, seed: ${args.seed}` : ""
      }`;
    }
    return `Brainstorm (Predicate Swap): [${kws}] (max_len: ${args.max_graph_length || 6}${
      args.seed !== undefined ? `, seed: ${args.seed}` : ""
    })`;
  },

  async execute(args, context = {}) {
    const mode = (args.mode || "predicate_swap").toLowerCase();
    const seed =
      args.seed !== undefined
        ? Number(args.seed) || 0
        : Math.floor(Math.random() * 100000);
    const rng = createLCG(seed);

    const kgService = context.knowledgeGraph || knowledgeGraphInstance;
    const userKG = context.userKnowledgeGraph || userKnowledgeGraphInstance;

    // --------------------------------------------------------------------------
    // MODE 2: RANDOM DISCONNECTED PAIRS (random_pair)
    // --------------------------------------------------------------------------
    if (mode === "random_pair") {
      const kPairs = Math.max(
        1,
        Math.min(Number(args.k_pairs || args.max_graph_length || args.count) || 5, 20)
      );

      const allActiveEntities = [
        ...Array.from(kgService.entities.values()),
        ...Array.from(userKG?.entities?.values() || []),
      ].filter((e) => e.isActive !== false);

      if (allActiveEntities.length < 2) {
        return {
          status: "insufficient_knowledge",
          mode: "random_pair",
          summary: "Knowledge graph has fewer than 2 active nodes to form pairs.",
          instruction: "Please ingest more knowledge into the graph before brainstorming random pairs.",
        };
      }

      // Build Adjacency Set of all active existing relations (undirected check)
      const connectedPairs = new Set();
      const allRelations = [
        ...Array.from(kgService.relations.values()),
        ...Array.from(userKG?.relations?.values() || []),
      ].filter((r) => r.isActive !== false);

      for (const rel of allRelations) {
        if (rel.sourceId && rel.targetId) {
          connectedPairs.add(`${rel.sourceId}->${rel.targetId}`);
          connectedPairs.add(`${rel.targetId}->${rel.sourceId}`);
        }
        if (rel.source && rel.target) {
          const sLower = rel.source.toLowerCase();
          const tLower = rel.target.toLowerCase();
          connectedPairs.add(`${sLower}->${tLower}`);
          connectedPairs.add(`${tLower}->${sLower}`);
        }
      }

      let rawKeywords = [];
      if (Array.isArray(args.keywords)) {
        rawKeywords = args.keywords.map((k) => String(k).trim()).filter(Boolean);
      } else if (typeof args.keywords === "string" && args.keywords.trim()) {
        rawKeywords = args.keywords
          .split(/[,;\n]+/)
          .map((k) => k.trim())
          .filter(Boolean);
      }

      const foundKeywords = [];
      const unfoundKeywords = [];
      let biasedEntities = [];

      if (rawKeywords.length > 0) {
        for (const kw of rawKeywords) {
          const kwLower = kw.toLowerCase();
          let bestMatch = null;
          let bestSim = 0;

          for (const ent of allActiveEntities) {
            const nameLower = (ent.name || "").toLowerCase();
            if (nameLower === kwLower) {
              bestMatch = ent;
              bestSim = 1.0;
              break;
            }
            const sim = computeSemanticSimilarity(kwLower, nameLower);
            if (sim > bestSim && sim >= 0.5) {
              bestSim = sim;
              bestMatch = ent;
            }
          }

          if (bestMatch) {
            foundKeywords.push({
              keyword: kw,
              matchedNode: bestMatch.name,
              nodeId: bestMatch.id,
              domain: bestMatch.domain || bestMatch.attributes?.domain || "General",
            });
            biasedEntities.push(bestMatch);
          } else {
            unfoundKeywords.push(kw);
          }
        }
      }

      const selectedPairs = [];
      const selectedPairKeys = new Set();
      const entityPool =
        biasedEntities.length >= 2 && biasedEntities.length >= kPairs
          ? biasedEntities
          : allActiveEntities;

      let attempts = 0;
      const maxAttempts = 300;

      while (selectedPairs.length < kPairs && attempts < maxAttempts) {
        attempts++;

        const idxA = Math.floor(rng() * entityPool.length);
        let idxB = Math.floor(rng() * allActiveEntities.length);

        const entityA = entityPool[idxA];
        let entityB = allActiveEntities[idxB];

        if (entityA.id === entityB.id || entityA.name.toLowerCase() === entityB.name.toLowerCase()) {
          continue;
        }

        const pairKey1 = `${entityA.id}::${entityB.id}`;
        const pairKey2 = `${entityB.id}::${entityA.id}`;
        if (selectedPairKeys.has(pairKey1) || selectedPairKeys.has(pairKey2)) {
          continue;
        }

        // Verify NO existing connection in the graph
        const isConnected =
          connectedPairs.has(`${entityA.id}->${entityB.id}`) ||
          connectedPairs.has(`${entityB.id}->${entityA.id}`) ||
          connectedPairs.has(`${entityA.name.toLowerCase()}->${entityB.name.toLowerCase()}`) ||
          connectedPairs.has(`${entityB.name.toLowerCase()}->${entityA.name.toLowerCase()}`);

        if (isConnected) continue;

        const predIdx = Math.floor(rng() * ALL_CANDIDATE_PREDICATES.length);
        const predicate = ALL_CANDIDATE_PREDICATES[predIdx];

        selectedPairKeys.add(pairKey1);
        selectedPairs.push({
          pairIndex: selectedPairs.length + 1,
          source: entityA.name,
          sourceDomain: entityA.domain || entityA.attributes?.domain || "General",
          predicate,
          target: entityB.name,
          targetDomain: entityB.domain || entityB.attributes?.domain || "General",
          connection: `[Pair ${selectedPairs.length + 1}] [${entityA.name}] ----[${predicate}]---> [${
            entityB.name
          }] *(Disconnected Domains: ${entityA.domain || "General"} ↔ ${entityB.domain || "General"})*`,
          isDisconnected: true,
          priorConnectionsCount: 0,
        });
      }

      const pairsList = selectedPairs.map((p) => p.connection);

      return {
        status: "success",
        mode: "random_pair",
        pairCount: selectedPairs.length,
        seedUsed: seed,
        foundKeywords,
        unfoundKeywords,
        pairs: selectedPairs,
        pairsList,
        mutatedConnectionsList: pairsList,
        verificationGuidance:
          "Verify whether a valid idea can be made or not. Otherwise, re-run the brainstorm tool.",
        instruction:
          "Analyze the K random disconnected pairs above. Each pair connects two previously unconnected concepts in the Knowledge Graph with a novel predicate. Verify whether a valid, breakthrough idea can be synthesized from one or more of these pairings. If a valid idea can be formulated, synthesize the complete proposal for the user. Otherwise, re-run 'brainstorm_idea' in 'random_pair' mode with a different seed.",
        summary: `Generated ${selectedPairs.length} novel disconnected node pairs across Knowledge Graph domains [Seed: ${seed}]. Verify whether a valid idea can be made or not. Otherwise, re-run the brainstorm tool.`,
      };
    }

    // --------------------------------------------------------------------------
    // MODE 1: PREDICATE SWAPPING (predicate_swap)
    // --------------------------------------------------------------------------
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

    const maxGraphLength = Math.max(1, Math.min(Number(args.max_graph_length) || 6, 30));

    if (rawKeywords.length === 0) {
      return {
        status: "error",
        message: "No keywords provided. Please specify one or more keywords to anchor the brainstorm.",
      };
    }

    // Retrieve anchor entities using Cosine Similarity
    const allEntities = Array.from(kgService.entities.values()).filter((e) => e.isActive !== false);
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
          nameLower.length >= 4 &&
          (nameLower.startsWith(kwLower) || kwLower.startsWith(nameLower))
        ) {
          simScore = 0.88;
        } else {
          const simName = computeSemanticSimilarity(kwLower, nameLower);
          const simDesc = descLower ? computeSemanticSimilarity(kwLower, descLower.slice(0, 120)) * 0.7 : 0;
          simScore = Math.max(simName, simDesc);
        }

        if (simScore >= 0.52) {
          scoredEntities.push({ entity, score: simScore, matchedKeyword: kw });
        }
      }
    }

    scoredEntities.sort((a, b) => b.score - a.score);

    if (scoredEntities.length === 0) {
      const suggestedQueries = rawKeywords.map((k) => `${k} core thesis principles mechanisms`);
      return {
        status: "insufficient_knowledge",
        actionRequired: "SEARCH_AND_INDEX_THEN_RETRY",
        keywords: rawKeywords,
        missingTopics: rawKeywords,
        instruction: `The Knowledge Graph lacks sufficient connections for keywords: ${rawKeywords.map((k) => `"${k}"`).join(", ")}. Use Google Search and 'knowledge_graph_write' to index key concepts.`,
        suggestedSearchQueries: suggestedQueries,
        summary: `Knowledge Graph lacks relational facts for ${rawKeywords.join(", ")}.`,
      };
    }

    // Contiguous Path Walk
    const activeRelations = (kgService.relations || []).filter((r) => r.isActive !== false);
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

    const topCandidates = scoredEntities.slice(0, 10);
    const connectedCandidates = topCandidates.filter((c) => {
      const byId = (adjMap.get(c.entity.id.toLowerCase()) || []).length > 0;
      const byName = (adjMap.get(c.entity.name.toLowerCase()) || []).length > 0;
      return byId || byName;
    });

    const candidatesToPick = connectedCandidates.length > 0 ? connectedCandidates : topCandidates;
    const startEntity = candidatesToPick[Math.abs(seed) % candidatesToPick.length].entity;

    const pathTriples = [];
    const visitedEntities = new Set([startEntity.id.toLowerCase(), startEntity.name.toLowerCase()]);
    const visitedEdges = new Set();
    let currentEntityId = startEntity.id;
    let currentEntityName = startEntity.name.toLowerCase();

    for (let step = 0; step < maxGraphLength; step++) {
      const incidentEdgesById = adjMap.get(currentEntityId.toLowerCase()) || [];
      const incidentEdgesByName = adjMap.get(currentEntityName) || [];

      const edgeCandidateMap = new Map();
      for (const r of [...incidentEdgesById, ...incidentEdgesByName]) {
        const edgeKey = r.id || `${r.sourceName}:${r.predicate}:${r.targetName}`;
        if (!visitedEdges.has(edgeKey)) {
          edgeCandidateMap.set(edgeKey, r);
        }
      }
      const incidentEdges = Array.from(edgeCandidateMap.values());

      const unvisitedEdges = incidentEdges.filter((r) => {
        const isSourceCurrent =
          r.sourceId?.toLowerCase() === currentEntityId.toLowerCase() ||
          (r.sourceName && r.sourceName.toLowerCase() === currentEntityName);
        const otherId = (isSourceCurrent ? r.targetId : r.sourceId)?.toLowerCase();
        const otherName = (isSourceCurrent ? r.targetName : r.sourceName)?.toLowerCase();
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
        for (const vKey of visitedEntities) {
          const vEdges = (adjMap.get(vKey) || []).filter((r) => {
            const edgeKey = r.id || `${r.sourceName}:${r.predicate}:${r.targetName}`;
            return !visitedEdges.has(edgeKey);
          });
          if (vEdges.length > 0) {
            chosenEdge = vEdges[(Math.abs(seed) + step) % vEdges.length];
            currentEntityId = vKey;
            currentEntityName = vKey;
            break;
          }
        }
        if (!chosenEdge) break;
      }

      const edgeKey =
        chosenEdge.id || `${chosenEdge.sourceName}:${chosenEdge.predicate}:${chosenEdge.targetName}`;
      visitedEdges.add(edgeKey);

      const isForward =
        chosenEdge.sourceId?.toLowerCase() === currentEntityId.toLowerCase() ||
        (chosenEdge.sourceName &&
          chosenEdge.sourceName.toLowerCase() === currentEntityName);

      const srcName = isForward
        ? chosenEdge.sourceName || chosenEdge.source
        : chosenEdge.targetName || chosenEdge.target;
      const tgtName = isForward
        ? chosenEdge.targetName || chosenEdge.target
        : chosenEdge.sourceName || chosenEdge.source;
      const nextId = isForward ? chosenEdge.targetId : chosenEdge.sourceId;

      pathTriples.push({
        source: srcName,
        predicate: chosenEdge.predicate,
        target: tgtName,
        originalPredicate: chosenEdge.predicate,
        step: step + 1,
      });

      if (nextId) visitedEntities.add(nextId.toLowerCase());
      if (tgtName) visitedEntities.add(tgtName.toLowerCase());
      currentEntityId = nextId || tgtName;
      currentEntityName = (tgtName || "").toLowerCase();
    }

    if (pathTriples.length === 0) {
      return {
        status: "insufficient_knowledge",
        summary: `Could not traverse a continuous path from anchor "${startEntity.name}".`,
        instruction: "Please ingest more connecting relations into the graph.",
      };
    }

    // Apply Predicate Swapping Mutations
    const originalConnectionsList = pathTriples.map(
      (t) => `[Hop ${t.step}] [${t.source}] ----(${t.predicate})---> [${t.target}]`
    );

    const mutations = [];
    const mutatedConnectionsList = [];
    const numMutationsTarget = Math.max(1, Math.min(Math.ceil(pathTriples.length * 0.6), 5));
    const mutationIndices = new Set();

    while (mutationIndices.size < numMutationsTarget && mutationIndices.size < pathTriples.length) {
      const idx = Math.floor(rng() * pathTriples.length);
      mutationIndices.add(idx);
    }

    pathTriples.forEach((triple, idx) => {
      const isMutated = mutationIndices.has(idx);
      if (isMutated) {
        const mutatedPredicate = getMutatedPredicate(triple.originalPredicate, rng);
        mutations.push({
          step: idx + 1,
          source: triple.source,
          originalPredicate: triple.originalPredicate,
          mutatedPredicate,
          target: triple.target,
          isMutated: true,
          explanation: `Swapped predicate '${triple.originalPredicate}' with orthogonal relation '${mutatedPredicate}'.`,
        });
        mutatedConnectionsList.push(
          `[Hop ${idx + 1}] [${triple.source}] ----{${mutatedPredicate}}---> [${triple.target}] *(MUTATED from: ${triple.originalPredicate})*`
        );
      } else {
        mutations.push({
          step: idx + 1,
          source: triple.source,
          originalPredicate: triple.originalPredicate,
          mutatedPredicate: triple.originalPredicate,
          target: triple.target,
          isMutated: false,
        });
        mutatedConnectionsList.push(
          `[Hop ${idx + 1}] [${triple.source}] ----(${triple.originalPredicate})---> [${triple.target}]`
        );
      }
    });

    const foundKeywords = [];
    const unfoundKeywords = [];
    for (const kw of rawKeywords) {
      const m = scoredEntities.find((se) => se.matchedKeyword.toLowerCase() === kw.toLowerCase());
      if (m) {
        foundKeywords.push({
          keyword: kw,
          matchedNode: m.entity.name,
          nodeId: m.entity.id,
          domain: m.entity.domain || m.entity.attributes?.domain || "General",
        });
      } else {
        unfoundKeywords.push(kw);
      }
    }

    return {
      status: "success",
      mode: "predicate_swap",
      seedUsed: seed,
      startAnchorNode: startEntity.name,
      foundKeywords,
      unfoundKeywords,
      mutatedGraph: {
        pathLength: pathTriples.length,
        mutatedHopsCount: mutationIndices.size,
        preservedHopsCount: pathTriples.length - mutationIndices.size,
        mutations,
        mutatedConnectionsList,
      },
      originalNonMutatedGraph: {
        pathLength: pathTriples.length,
        connectionsList: originalConnectionsList,
      },
      mutatedConnectionsList,
      verificationGuidance:
        "Verify whether a valid idea can be made or not. Otherwise, re-run the brainstorm tool.",
      instruction:
        "The response above provides a counterfactual Knowledge Graph path with randomized predicate swaps. Verify whether a valid idea can be made. If valid, synthesize the concept for the user; otherwise, re-run with another seed.",
      summary: `Traversed ${pathTriples.length}-hop path anchored at "${startEntity.name}" and applied ${mutationIndices.size} predicate mutations [Seed: ${seed}].`,
    };
  },
};
