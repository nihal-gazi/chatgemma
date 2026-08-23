/**
 * Knowledge-Graph-Driven Brainstorming Tool for ChatGemma
 * Implements:
 * 1. Predicate Swapping (Edge Mutation)
 * 2. Isomorphic Mapping (Cross-Domain Analogy)
 * 3. Semantic similarity and Graph Density Guardrails ("not_enough_knowledge")
 */

import { knowledgeGraphInstance, userKnowledgeGraphInstance } from "../../services/knowledgeGraph.js";
import {
  getMutatedPredicate,
  computeSemanticSimilarity,
  extractSalientKeywords,
  PREDICATE_INVERSIONS,
  PREDICATE_FUNCTIONAL_CATEGORIES,
  ORTHOGONAL_PREDICATES,
} from "../../utils/similarity.js";

const ALL_CANDIDATE_PREDICATES = Array.from(
  new Set([
    ...Object.keys(PREDICATE_INVERSIONS),
    ...Object.values(PREDICATE_INVERSIONS),
    ...Object.values(PREDICATE_FUNCTIONAL_CATEGORIES).flat(),
    ...ORTHOGONAL_PREDICATES,
    "CATALYZES",
    "INHIBITS",
    "TRANSMUTES",
    "NEUTRALIZES",
    "QUANTIZES",
    "AMPLIFIES",
    "DISRUPTS",
    "HARMONIZES",
    "DECOUPLES",
    "STABILIZES",
    "ACCELERATES",
    "DECELERATES",
    "COMPRESSES",
    "EXPANDS",
    "ENCRYPTS",
    "DECRYPTS",
    "TEACHES",
    "EMPOWERS",
    "MODULATES",
    "CONVERGES_WITH",
  ])
);

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
          "Array of target concepts, keywords, or domain terms to anchor the brainstorm around (e.g. ['attention mechanism', 'loss landscape'], ['quantum tunneling', 'flash memory']). Optional in 'random_pair' mode.",
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

    const kgService = context.knowledgeGraph || knowledgeGraphInstance;
    const userKG = context.userKnowledgeGraph || userKnowledgeGraphInstance;

    // --------------------------------------------------------------------------
    // MODE 2: RANDOM DISCONNECTED PAIRS (random_pair)
    // --------------------------------------------------------------------------
    if (mode === "random_pair") {
      const kPairs = Math.max(
        1,
        Math.min(
          Number(args.k_pairs || args.max_graph_length || args.count) || 5,
          20
        )
      );

      // Collect all active entities from General and User KG
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

      // Optional keyword extraction if provided
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
          let bestScore = 0;

          for (const entity of allActiveEntities) {
            const nameLower = (entity.name || "").toLowerCase();
            let score = 0;
            if (nameLower === kwLower) score = 1.0;
            else if (entity.aliases?.some((a) => a.toLowerCase() === kwLower)) score = 0.95;
            else score = computeSemanticSimilarity(kwLower, nameLower);

            if (score > bestScore) {
              bestScore = score;
              bestMatch = entity;
            }
          }

          if (bestMatch && bestScore >= 0.5) {
            foundKeywords.push({
              keyword: kw,
              matchedNode: bestMatch.name,
              score: Number(bestScore.toFixed(3)),
              domain: bestMatch.domain || bestMatch.attributes?.domain || "General",
            });
            biasedEntities.push(bestMatch);
          } else {
            unfoundKeywords.push(kw);
          }
        }
      }

      // Seeded Pseudorandom Number Generator
      let currentSeed = Math.abs(seed) + 7;
      const seededRandom = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        return currentSeed / 233280;
      };

      const selectedPairs = [];
      const selectedPairKeys = new Set();
      let attempts = 0;
      const maxAttempts = 600;

      while (selectedPairs.length < kPairs && attempts < maxAttempts) {
        attempts++;

        // Pick Node A: preferentially pick from biased entities if available, else random
        let entityA;
        if (
          biasedEntities.length > 0 &&
          selectedPairs.length < biasedEntities.length
        ) {
          entityA = biasedEntities[selectedPairs.length];
        } else {
          const idxA = Math.floor(seededRandom() * allActiveEntities.length);
          entityA = allActiveEntities[idxA];
        }

        // Pick Node B from all active entities
        const idxB = Math.floor(seededRandom() * allActiveEntities.length);
        const entityB = allActiveEntities[idxB];

        if (!entityA || !entityB) continue;
        if (entityA.id === entityB.id) continue;
        if (entityA.name.toLowerCase() === entityB.name.toLowerCase()) continue;

        const pairKey1 = `${entityA.name.toLowerCase()}|||${entityB.name.toLowerCase()}`;
        const pairKey2 = `${entityB.name.toLowerCase()}|||${entityA.name.toLowerCase()}`;
        if (selectedPairKeys.has(pairKey1) || selectedPairKeys.has(pairKey2)) {
          continue;
        }

        // VERIFY NO EXISTING CONNECTION IN THE GRAPH
        const isConnected =
          connectedPairs.has(`${entityA.id}->${entityB.id}`) ||
          connectedPairs.has(`${entityB.id}->${entityA.id}`) ||
          connectedPairs.has(
            `${entityA.name.toLowerCase()}->${entityB.name.toLowerCase()}`
          ) ||
          connectedPairs.has(
            `${entityB.name.toLowerCase()}->${entityA.name.toLowerCase()}`
          );

        if (isConnected) {
          continue;
        }

        // Select a random predicate
        const predIdx = Math.floor(
          seededRandom() * ALL_CANDIDATE_PREDICATES.length
        );
        const predicate = ALL_CANDIDATE_PREDICATES[predIdx];

        selectedPairKeys.add(pairKey1);
        selectedPairs.push({
          pairIndex: selectedPairs.length + 1,
          source: entityA.name,
          sourceDomain:
            entityA.domain || entityA.attributes?.domain || "General",
          predicate,
          target: entityB.name,
          targetDomain:
            entityB.domain || entityB.attributes?.domain || "General",
          connection: `[Pair ${
            selectedPairs.length + 1
          }] [${entityA.name}] ----[${predicate}]---> [${
            entityB.name
          }] *(Disconnected Domains: ${
            entityA.domain || "General"
          } ↔ ${entityB.domain || "General"})*`,
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

    if (rawKeywords.length === 0) {
      return {
        status: "error",
        message:
          "No keywords provided. Please specify one or more keywords to anchor the brainstorm.",
      };
    }

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
          nameLower.length >= 4 &&
          (nameLower.startsWith(kwLower) || kwLower.startsWith(nameLower))
        ) {
          simScore = 0.88;
        } else if (nameLower.length >= 4 && kwLower.includes(nameLower)) {
          const wordRegex = new RegExp(
            `\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i"
          );
          if (wordRegex.test(kwLower)) {
            simScore = 0.82;
          } else {
            simScore = computeSemanticSimilarity(kwLower, nameLower);
          }
        } else if (kwLower.length >= 4 && nameLower.includes(kwLower)) {
          simScore = 0.82;
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

    const mutatedConnectionsList = mutations.map((m) =>
      m.isMutated
        ? `[Hop ${m.step}] [${m.source}] ----[${m.mutatedPredicate}]---> [${m.target}] *(MUTATED from ${m.originalPredicate}: ${m.explanation || "Inversion"})*`
        : `[Hop ${m.step}] [${m.source}] ----[${m.originalPredicate}]---> [${m.target}] *(Preserved Path Context)*`
    );

    // Track which input keywords were actually found vs unfound
    const foundKeywords = [];
    const unfoundKeywords = [];

    for (const kw of rawKeywords) {
      const kwMatches = scoredEntities.filter((s) => s.matchedKeyword === kw);
      if (kwMatches.length > 0) {
        foundKeywords.push({
          keyword: kw,
          matchedNode: kwMatches[0].entity.name,
          score: Number(kwMatches[0].score.toFixed(3)),
          domain:
            kwMatches[0].entity.domain ||
            kwMatches[0].entity.attributes?.domain ||
            "General",
        });
      } else {
        unfoundKeywords.push(kw);
      }
    }

    const originalNonMutatedConnectionsList = baseSubgraph.map(
      (t, idx) =>
        `[Hop ${idx + 1}] [${t.sourceName}] ----[${t.predicate}]---> [${t.targetName}]`
    );

    const originalNonMutatedGraph = {
      startAnchorNode: startEntity.name,
      pathLength: pathTriples.length,
      basePathChain: baseChainStr,
      connectionsList: originalNonMutatedConnectionsList,
    };

    const mutatedGraph = {
      startAnchorNode: startEntity.name,
      pathLength: pathTriples.length,
      mutatedHopsCount: mutationCount,
      preservedHopsCount: pathTriples.length - mutationCount,
      mutatedPathChain: mutatedChainStr,
      mutatedConnectionsList,
      mutations,
    };

    return {
      status: "success",
      technique: "predicate_swap",
      foundKeywords,
      unfoundKeywords,
      originalNonMutatedGraph,
      mutatedGraph,
      keywords: rawKeywords,
      startAnchorNode: startEntity.name,
      seedUsed: seed,
      requestedPathLength: maxGraphLength,
      actualTraversedHops: pathTriples.length,
      mutatedHopsCount: mutationCount,
      preservedHopsCount: pathTriples.length - mutationCount,
      basePathChain: baseChainStr,
      mutatedPathChain: mutatedChainStr,
      mutations,
      mutatedConnectionsList,
      verificationGuidance:
        "Verify whether a valid idea can be made or not. Otherwise, re-run the brainstorm tool.",
      instruction:
        "Analyze the found keywords, original non-mutated graph, and mutated connections list above. Verify whether a valid, breakthrough idea can be made from these counterfactual relationships. If a valid idea can be synthesized, generate the complete, deep proposal for the user. Otherwise, re-run 'brainstorm_idea' with a different seed, adjusted keywords, or changed max_graph_length.",
      summary: `Extracted ${pathTriples.length}-hop path from [${startEntity.name}] with ${mutationCount} mutated predicates (${mutatedTriplesSummary}) [Seed: ${seed}]. Found keywords: [${foundKeywords.map((f) => f.keyword).join(", ")}]. Verify whether a valid idea can be made or not. Otherwise, re-run the brainstorm tool.`,
    };
  },
};
