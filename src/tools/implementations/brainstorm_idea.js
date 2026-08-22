/**
 * Knowledge-Graph-Driven Brainstorming Tool for ChatGemma
 * Implements:
 * 1. Predicate Swapping (Edge Mutation)
 * 2. Isomorphic Mapping (Cross-Domain Analogy)
 * 3. Semantic similarity and Graph Density Guardrails ("not_enough_knowledge")
 */

import { knowledgeGraphInstance } from "../../services/knowledgeGraph.js";
import { getMutatedPredicate, arePredicatesIsomorphic, computeSemanticSimilarity } from "../../utils/similarity.js";

export const brainstormIdeaTool = {
  name: "brainstorm_idea",
  displayName: "KG Idea Brainstormer",
  iconName: "Sparkles",
  description:
    "Brainstorms novel, non-obvious ideas and breakthrough hypotheses using Knowledge Graph structural reasoning: (1) Predicate Swapping (mutating edge relationships to form counter-factual hypotheses) and (2) Isomorphic Mapping (discovering structural analogies across distant domains).",
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

    // 1. Anchor Extraction: Look up entities in Knowledge Graph matching keywords in prompt
    const searchResult = kgService.search(rawPrompt, { depth: 2, limit: 15 });
    const matchedEntities = searchResult.matchedEntities || [];
    const connectedTriples = searchResult.directTriples || [];

    // 2. Knowledge Density Guardrail: Check if graph has enough context
    if (matchedEntities.length === 0 || connectedTriples.length === 0) {
      return {
        status: "not_enough_knowledge",
        topic: rawPrompt,
        matchedEntitiesCount: matchedEntities.length,
        connectedTriplesCount: connectedTriples.length,
        message: `Not enough knowledge graph nodes or connections found for "${rawPrompt}". Please provide more facts, entities, or context in the Knowledge Graph to enable structural brainstorming.`,
      };
    }

    // Determine strategy to use
    let chosenTechnique = technique;
    if (chosenTechnique === "auto") {
      // If we have at least 2 connected triples and multiple entity types, try isomorphic mapping; otherwise predicate swap
      const distinctTypes = new Set(matchedEntities.flatMap((e) => e.types || []));
      chosenTechnique = connectedTriples.length >= 2 && distinctTypes.size >= 2 ? "isomorphic_mapping" : "predicate_swap";
    }

    // 3. Execution: Predicate Swapping (Edge Mutation)
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

      const ideationChallenge = `What if ${subjectName} ${mutatedPredicate.toLowerCase().replace(/_/g, " ")} ${objectName}? Explore how a physical, technological, or organizational mechanism could make this counter-factual relationship viable and advantageous.`;

      return {
        status: "success",
        technique: "predicate_swap",
        topic: rawPrompt,
        anchorEntity: subjectName,
        baseTriple: {
          subject: subjectName,
          predicate: selectedTriple.predicate,
          object: objectName,
          representation: baseTripleStr,
        },
        mutation: {
          mutatedPredicate,
          mutationType,
          representation: mutatedTripleStr,
          explanation,
        },
        ideationChallenge,
        suggestedDirections: [
          `Reverse-engineering: What underlying physics, logic, or protocol enables [${subjectName}] to [${mutatedPredicate}] [${objectName}]?`,
          `Value Proposition: In what edge cases or breakthrough scenarios is this inverted behavior superior to standard behavior?`,
          `Hybrid Model: Can the system dynamically switch between [${selectedTriple.predicate}] and [${mutatedPredicate}] based on environmental triggers?`,
        ],
        summary: `Mutated base relation from "${baseTripleStr}" to "${mutatedTripleStr}".`,
      };
    }

    // 4. Execution: Isomorphic Mapping (Cross-Domain Analogy)
    if (chosenTechnique === "isomorphic_mapping") {
      // Form source domain subgraph path (A -> B -> C or A -> B)
      const primaryTriple = connectedTriples[0];
      const sourceDomainType = matchedEntities[0]?.types?.[0] || "Concept";

      // Search all relations in KG for a topologically matching subgraph in a different entity type or domain
      const allRelations = kgService.relations.filter((r) => r.isActive !== false);
      let candidateAnalogy = null;

      for (const rel of allRelations) {
        // Must belong to a different entity or domain
        const relSource = kgService.entities.get(rel.sourceId);
        const relTarget = kgService.entities.get(rel.targetId);

        const isDistantDomain =
          rel.sourceId !== primaryTriple.sourceId &&
          rel.targetId !== primaryTriple.targetId &&
          relSource?.name !== primaryTriple.sourceName;

        if (isDistantDomain) {
          const sim = arePredicatesIsomorphic(primaryTriple.predicate, rel.predicate);
          if (sim > 0.4 || targetDomain) {
            candidateAnalogy = {
              sourceName: rel.sourceName || relSource?.name || rel.sourceId,
              predicate: rel.predicate,
              targetName: rel.targetName || relTarget?.name || rel.targetId,
              domain: relSource?.types?.[0] || "Domain 2",
              similarityScore: sim,
            };
            break;
          }
        }
      }

      // If no distant isomorphic match exists, fall back cleanly to Predicate Swap
      if (!candidateAnalogy) {
        const { mutatedPredicate, mutationType, explanation } = getMutatedPredicate(primaryTriple.predicate);
        return {
          status: "success",
          technique: "predicate_swap",
          fallbackNotice: "No distant isomorphic cross-domain subgraph found in graph; fell back to edge mutation.",
          topic: rawPrompt,
          baseTriple: {
            subject: primaryTriple.sourceName,
            predicate: primaryTriple.predicate,
            object: primaryTriple.targetName,
          },
          mutation: {
            mutatedPredicate,
            mutationType,
            explanation,
          },
          ideationChallenge: `What if [${primaryTriple.sourceName}] ${mutatedPredicate.toLowerCase().replace(/_/g, " ")} [${primaryTriple.targetName}]?`,
          summary: `Generated edge mutation hypothesis for [${primaryTriple.sourceName}].`,
        };
      }

      const domain1Mapping = `[${primaryTriple.sourceName}] ----[${primaryTriple.predicate}]---> [${primaryTriple.targetName}] (${sourceDomainType})`;
      const domain2Mapping = `[${candidateAnalogy.sourceName}] ----[${candidateAnalogy.predicate}]---> [${candidateAnalogy.targetName}] (${candidateAnalogy.domain})`;

      return {
        status: "success",
        technique: "isomorphic_mapping",
        topic: rawPrompt,
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
        structuralMappingMatrix: {
          [`${primaryTriple.sourceName} (${sourceDomainType})`]: `${candidateAnalogy.sourceName} (${candidateAnalogy.domain})`,
          [`${primaryTriple.predicate}`]: `${candidateAnalogy.predicate}`,
          [`${primaryTriple.targetName}`]: `${candidateAnalogy.targetName}`,
        },
        ideationChallenge: `Map principles and mechanisms from [${candidateAnalogy.sourceName}] in ${candidateAnalogy.domain} onto [${primaryTriple.sourceName}] in ${sourceDomainType}. What secondary properties (e.g. self-healing, distributed consensus, or adaptation) can be imported?`,
        suggestedDirections: [
          `Mechanism Import: What unmapped mechanisms exist in ${candidateAnalogy.domain} that can be translated into ${sourceDomainType}?`,
          `Failure Mode Translation: How does ${candidateAnalogy.sourceName} handle extreme stress or edge cases in its domain?`,
          `Novel Synthesis: Formulate a hybrid architecture that combines properties of both domains.`,
        ],
        summary: `Mapped structural analogy from ${sourceDomainType} to ${candidateAnalogy.domain}.`,
      };
    }

    return {
      status: "not_enough_knowledge",
      message: `Could not generate brainstorming hypothesis for "${rawPrompt}".`,
    };
  },
};
