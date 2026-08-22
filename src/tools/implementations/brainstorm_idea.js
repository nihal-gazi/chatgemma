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
  arePredicatesIsomorphic,
  extractSalientKeywords,
} from "../../utils/similarity.js";
import { synthesizeBrainstormWithGemma } from "../../services/brainstormSynthesizer.js";

export const brainstormIdeaTool = {
  name: "brainstorm_idea",
  displayName: "KG Idea Brainstormer",
  iconName: "Sparkles",
  description:
    "Brainstorms novel, non-obvious ideas and breakthrough hypotheses using Knowledge Graph structural reasoning: (1) Predicate Swapping (mutating edge relationships to form counter-factual hypotheses) and (2) Isomorphic Mapping (discovering structural analogies across distant domains). Directly calls Gemma to synthesize a polished, deep proposal with full graph connection provenance. If the graph lacks data, returns an agentic SEARCH_AND_INDEX directive with suggested queries.",
  parameters: {
    type: "OBJECT",
    properties: {
      prompt: {
        type: "STRING",
        description: "The core challenge, problem, concept, or domain to brainstorm around (e.g. 'renewable energy storage', 'cybersecurity defense', 'distributed consensus').",
      },
      technique: {
        type: "STRING",
        enum: ["auto", "predicate_swap", "isomorphic_mapping"],
        description: "Brainstorming strategy: 'predicate_swap' (edge mutation), 'isomorphic_mapping' (cross-domain topological analogy), or 'auto' (selects the best fit).",
      },
      targetDomain: {
        type: "STRING",
        description: "Optional specific domain to draw cross-field analogies from (e.g. 'Biology', 'Quantum Physics', 'Urban Architecture', 'Economics').",
      },
    },
    required: ["prompt"],
  },
  renderSummary: (args) =>
    `Brainstorm: "${args.prompt || ""}" (${args.technique || "auto"})`,

  async execute(args, context = {}) {
    const rawPrompt = (args.prompt || "").trim();
    const technique = args.technique || "auto";
    const targetDomain = (args.targetDomain || "").trim();

    if (!rawPrompt) {
      return {
        status: "error",
        message: "Prompt was empty. Please provide a problem statement or topic to brainstorm.",
      };
    }

    const kgService = context.knowledgeGraph || knowledgeGraphInstance;
    const apiKey = context.apiKey || context.settings?.apiKey;
    const modelId = context.modelId || context.settings?.modelId;
    const signal = context.signal;

    // 1. Extract Salient Keywords & Named Phrases from Prompt (filtering stop words)
    const { phrases, keywords } = extractSalientKeywords(rawPrompt);

    // 2. Targeted Anchor Extraction in Knowledge Graph
    let matchedEntities = [];
    let connectedTriples = [];

    // Search for quoted or capitalized named phrases first
    for (const phrase of phrases) {
      const res = kgService.search(phrase, { depth: 2, limit: 10 });
      if (res.matchedEntities.length > 0) {
        matchedEntities.push(...res.matchedEntities);
        connectedTriples.push(...res.directTriples);
      }
    }

    // Search for individual salient keywords if phrases had no match
    if (matchedEntities.length === 0) {
      for (const kw of keywords) {
        const res = kgService.search(kw, { depth: 2, limit: 5 });
        if (res.matchedEntities.length > 0) {
          matchedEntities.push(...res.matchedEntities);
          connectedTriples.push(...res.directTriples);
        }
      }
    }

    // Deduplicate matched entities and triples
    const entityMap = new Map();
    for (const e of matchedEntities) entityMap.set(e.id, e);
    matchedEntities = Array.from(entityMap.values());

    const tripleMap = new Map();
    for (const t of connectedTriples) {
      const key = `${t.sourceName}:${t.predicate}:${t.targetName}`;
      tripleMap.set(key, t);
    }
    connectedTriples = Array.from(tripleMap.values());

    // 3. Knowledge Density Guardrail: Check if graph actually has domain concepts
    if (matchedEntities.length === 0 || connectedTriples.length === 0) {
      const missingTopics =
        phrases.length > 0 ? phrases : keywords.slice(0, 4);

      const suggestedSearchQueries = missingTopics.map(
        (topic) => `${topic} core thesis principles mechanisms`
      );

      return {
        status: "insufficient_knowledge",
        actionRequired: "SEARCH_AND_INDEX_THEN_RETRY",
        topic: rawPrompt,
        missingTopics,
        instruction: `The Knowledge Graph currently lacks entities and factual connections for: ${missingTopics
          .map((t) => `"${t}"`)
          .join(", ")}.\n\nTo construct a high-impact, grounded brainstorm:\n1. Use Google Search to look up these topics: ${suggestedSearchQueries
          .map((q) => `"${q}"`)
          .join(", ")}.\n2. Call 'knowledge_graph_write' to index the key entities, principles, and mechanisms into the Knowledge Graph.\n3. Re-run 'brainstorm_idea' with the prompt to generate the structurally grounded synthesis.`,
        suggestedSearchQueries,
        summary: `Knowledge Graph needs facts on ${missingTopics.join(", ")}. Prompting agent to search web, index into KG, and retry.`,
      };
    }

    // Determine strategy to use
    let chosenTechnique = technique;
    if (chosenTechnique === "auto") {
      // If we have at least 2 connected triples and multiple entity types, try isomorphic mapping; otherwise predicate swap
      const distinctTypes = new Set(matchedEntities.flatMap((e) => e.types || []));
      chosenTechnique = connectedTriples.length >= 2 && distinctTypes.size >= 2 ? "isomorphic_mapping" : "predicate_swap";
    }

    // 4. Execution: Predicate Swapping (Edge Mutation)
    if (chosenTechnique === "predicate_swap") {
      // Pick the primary triple with an invertible predicate
      let selectedTriple = connectedTriples[0];
      for (const triple of connectedTriples) {
        if (triple.predicate && triple.predicate !== "ATTACHED_TO" && triple.predicate !== "ASSOCIATED_WITH") {
          selectedTriple = triple;
          break;
        }
      }

      const { mutatedPredicate, mutationType, explanation } = getMutatedPredicate(selectedTriple.predicate);
      const subjectName = selectedTriple.sourceName;
      const objectName = selectedTriple.targetName;

      const baseTripleStr = `[${subjectName}] ----[${selectedTriple.predicate}]---> [${objectName}]`;
      const mutatedTripleStr = `[${subjectName}] ----[${mutatedPredicate}]---> [${objectName}]`;

      const graphConnection = {
        technique: "predicate_swap",
        baseFact: baseTripleStr,
        mutatedRelation: mutatedTripleStr,
        subject: subjectName,
        originalPredicate: selectedTriple.predicate,
        mutatedPredicate,
        object: objectName,
        rationale: explanation,
        summary: `Mutated Knowledge Graph edge from "${baseTripleStr}" to "${mutatedTripleStr}".`,
      };

      // Call Gemma to synthesize the polished idea from the mutated relationship
      const polishedIdea = await synthesizeBrainstormWithGemma(
        {
          prompt: rawPrompt,
          technique: "predicate_swap",
          baseTriple: {
            subject: subjectName,
            predicate: selectedTriple.predicate,
            object: objectName,
            representation: baseTripleStr,
          },
          mutation: {
            subject: subjectName,
            mutatedPredicate,
            mutationType,
            object: objectName,
            representation: mutatedTripleStr,
            explanation,
          },
        },
        { apiKey, modelId, signal }
      );

      return {
        status: "success",
        technique: "predicate_swap",
        topic: rawPrompt,
        graphConnection,
        polishedIdea,
        summary: `Brainstormed: "${polishedIdea.title}" via Predicate Swapping (${baseTripleStr} -> ${mutatedTripleStr}).`,
      };
    }

    // 5. Execution: Isomorphic Mapping (Cross-Domain Analogy)
    if (chosenTechnique === "isomorphic_mapping") {
      // Form source domain subgraph path (A -> B)
      const primaryTriple = connectedTriples[0];
      const sourceDomainType = matchedEntities[0]?.types?.[0] || "Concept";

      // Search all relations in KG for a topologically matching subgraph in a strictly different entity type or domain
      const allRelations = kgService.relations.filter((r) => r.isActive !== false);
      let candidateAnalogy = null;

      for (const rel of allRelations) {
        const relSource = kgService.entities.get(rel.sourceId);
        const relTarget = kgService.entities.get(rel.targetId);
        const candidateDomain = relSource?.types?.[0] || "Domain 2";

        const isDistantDomain =
          rel.sourceId !== primaryTriple.sourceId &&
          rel.targetId !== primaryTriple.targetId &&
          relSource?.name !== primaryTriple.sourceName &&
          candidateDomain !== sourceDomainType; // Must belong to a DIFFERENT domain

        if (isDistantDomain) {
          const sim = arePredicatesIsomorphic(primaryTriple.predicate, rel.predicate);
          if (sim >= 0.45 || (targetDomain && candidateDomain.toLowerCase().includes(targetDomain.toLowerCase()) && sim >= 0.3)) {
            candidateAnalogy = {
              sourceName: rel.sourceName || relSource?.name || rel.sourceId,
              predicate: rel.predicate,
              targetName: rel.targetName || relTarget?.name || rel.targetId,
              domain: candidateDomain,
              similarityScore: sim,
            };
            break;
          }
        }
      }

      // If no distant isomorphic match exists, fall back cleanly to Predicate Swap
      if (!candidateAnalogy) {
        const { mutatedPredicate, mutationType, explanation } = getMutatedPredicate(primaryTriple.predicate);
        const baseTripleStr = `[${primaryTriple.sourceName}] ----[${primaryTriple.predicate}]---> [${primaryTriple.targetName}]`;
        const mutatedTripleStr = `[${primaryTriple.sourceName}] ----[${mutatedPredicate}]---> [${primaryTriple.targetName}]`;

        const graphConnection = {
          technique: "predicate_swap",
          fallbackNotice: "No distant cross-domain isomorphic subgraph found in graph; fell back to edge mutation.",
          baseFact: baseTripleStr,
          mutatedRelation: mutatedTripleStr,
          subject: primaryTriple.sourceName,
          originalPredicate: primaryTriple.predicate,
          mutatedPredicate,
          object: primaryTriple.targetName,
          rationale: explanation,
          summary: `Mutated Knowledge Graph edge from "${baseTripleStr}" to "${mutatedTripleStr}".`,
        };

        const polishedIdea = await synthesizeBrainstormWithGemma(
          {
            prompt: rawPrompt,
            technique: "predicate_swap",
            baseTriple: {
              subject: primaryTriple.sourceName,
              predicate: primaryTriple.predicate,
              object: primaryTriple.targetName,
              representation: baseTripleStr,
            },
            mutation: {
              subject: primaryTriple.sourceName,
              mutatedPredicate,
              mutationType,
              object: primaryTriple.targetName,
              representation: mutatedTripleStr,
              explanation,
            },
          },
          { apiKey, modelId, signal }
        );

        return {
          status: "success",
          technique: "predicate_swap",
          fallbackNotice: "No distant cross-domain isomorphic subgraph found in graph; fell back to edge mutation.",
          topic: rawPrompt,
          graphConnection,
          polishedIdea,
          summary: `Brainstormed: "${polishedIdea.title}" via fallback Predicate Swapping.`,
        };
      }

      const domain1Mapping = `[${primaryTriple.sourceName}] ----[${primaryTriple.predicate}]---> [${primaryTriple.targetName}] (${sourceDomainType})`;
      const domain2Mapping = `[${candidateAnalogy.sourceName}] ----[${candidateAnalogy.predicate}]---> [${candidateAnalogy.targetName}] (${candidateAnalogy.domain})`;

      const structuralMappingMatrix = {
        [`${primaryTriple.sourceName} (${sourceDomainType})`]: `${candidateAnalogy.sourceName} (${candidateAnalogy.domain})`,
        [`${primaryTriple.predicate}`]: `${candidateAnalogy.predicate}`,
        [`${primaryTriple.targetName}`]: `${candidateAnalogy.targetName}`,
      };

      const graphConnection = {
        technique: "isomorphic_mapping",
        sourceDomain: sourceDomainType,
        sourceSubgraph: domain1Mapping,
        analogousDomain: candidateAnalogy.domain,
        analogousSubgraph: domain2Mapping,
        mappingMatrix: structuralMappingMatrix,
        similarityScore: candidateAnalogy.similarityScore,
        summary: `Mapped structural analogy from [${primaryTriple.sourceName}] in ${sourceDomainType} to [${candidateAnalogy.sourceName}] in ${candidateAnalogy.domain}.`,
      };

      // Call Gemma to synthesize the cross-domain principle transfer into a polished idea
      const polishedIdea = await synthesizeBrainstormWithGemma(
        {
          prompt: rawPrompt,
          technique: "isomorphic_mapping",
          sourceDomain: {
            name: sourceDomainType,
            subgraph: domain1Mapping,
            coreConcept: primaryTriple.sourceName,
          },
          analogousDomain: {
            name: candidateAnalogy.domain,
            subgraph: domain2Mapping,
            analogousConcept: candidateAnalogy.sourceName,
            similarityScore: candidateAnalogy.similarityScore,
          },
          structuralMappingMatrix,
        },
        { apiKey, modelId, signal }
      );

      return {
        status: "success",
        technique: "isomorphic_mapping",
        topic: rawPrompt,
        graphConnection,
        polishedIdea,
        summary: `Brainstormed: "${polishedIdea.title}" via Isomorphic Mapping (${sourceDomainType} <-> ${candidateAnalogy.domain}).`,
      };
    }

    return {
      status: "insufficient_knowledge",
      message: `Could not generate brainstorming hypothesis for "${rawPrompt}".`,
    };
  },
};
