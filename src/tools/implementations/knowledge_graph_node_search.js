/**
 * Knowledge Graph Node Search Tool for ChatGemma
 * Performs semantic similarity search across entities in General KG or User KG
 * using character n-gram cosine similarity (all-MiniLM-L6 approximation).
 * Used to discover exact node names prior to running brainstorm_idea.
 */

import {
  knowledgeGraphInstance,
  userKnowledgeGraphInstance,
} from "../../services/knowledgeGraph.js";
import { computeSemanticSimilarity } from "../../utils/similarity.js";

export const knowledgeGraphNodeSearchTool = {
  name: "knowledge_graph_node_search",
  displayName: "KG Node Semantic Search",
  iconName: "Share2",
  description:
    "Searches the General Knowledge Graph or User Knowledge Graph for nodes/entities matching a list of keywords using semantic cosine similarity (all-MiniLM-L6 style). Returns top-K matching node names ONLY per keyword. Recommended before brainstorm_idea to discover exact node names.",
  parameters: {
    type: "OBJECT",
    properties: {
      keywords: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "List of keywords or concept terms to search for in the Knowledge Graph (e.g. ['attention mechanism', 'loss landscape', 'quantum tunneling']).",
      },
      graph_target: {
        type: "STRING",
        enum: ["general", "user", "all"],
        description:
          "Which Knowledge Graph to search: 'general' (default: general world knowledge & preloaded domains), 'user' (user persona & personal memories), or 'all' (both graphs).",
      },
      top_k: {
        type: "INTEGER",
        description:
          "Maximum number of top-matching nodes to return per keyword (default: 5, min: 1, max: 20).",
      },
    },
    required: ["keywords"],
  },
  renderSummary: (args) => {
    const kws = Array.isArray(args.keywords)
      ? args.keywords.join(", ")
      : args.keywords || "";
    return `Node Search: [${kws}] (${args.graph_target || "general"}, top ${
      args.top_k || 5
    })`;
  },

  async execute(args, context = {}) {
    let rawKeywords = [];
    if (Array.isArray(args.keywords)) {
      rawKeywords = args.keywords
        .map((k) => String(k || "").trim())
        .filter(Boolean);
    } else if (typeof args.keywords === "string") {
      rawKeywords = args.keywords
        .split(/[,;\n]+/)
        .map((k) => k.trim())
        .filter(Boolean);
    }

    if (rawKeywords.length === 0) {
      return {
        status: "error",
        error: "Missing required 'keywords' array.",
      };
    }

    const graphTarget = (args.graph_target || "general").toLowerCase();
    const topK = Math.max(1, Math.min(Number(args.top_k) || 5, 20));

    const generalKG = context.knowledgeGraph || knowledgeGraphInstance;
    const userKG = context.userKnowledgeGraph || userKnowledgeGraphInstance;

    // Determine target entity pool
    let entityPool = [];
    if (graphTarget === "user") {
      entityPool = Array.from(userKG.entities.values()).map((e) => ({
        ...e,
        sourceGraph: "user",
      }));
    } else if (graphTarget === "all") {
      entityPool = [
        ...Array.from(generalKG.entities.values()).map((e) => ({
          ...e,
          sourceGraph: "general",
        })),
        ...Array.from(userKG.entities.values()).map((e) => ({
          ...e,
          sourceGraph: "user",
        })),
      ];
    } else {
      // Default: general
      entityPool = Array.from(generalKG.entities.values()).map((e) => ({
        ...e,
        sourceGraph: "general",
      }));
    }

    // Filter active entities
    entityPool = entityPool.filter((e) => e.isActive !== false);

    const resultsByKeyword = {};
    const allMatchedNodesMap = new Map();

    for (const kw of rawKeywords) {
      const kwLower = kw.toLowerCase();
      const scored = [];

      for (const entity of entityPool) {
        const nameLower = (entity.name || "").toLowerCase();
        const descLower = (entity.description || "").toLowerCase();
        let score = 0;

        if (nameLower === kwLower) {
          score = 1.0;
        } else if (entity.aliases?.some((a) => a.toLowerCase() === kwLower)) {
          score = 0.95;
        } else if (
          nameLower.length >= 4 &&
          (nameLower.startsWith(kwLower) || kwLower.startsWith(nameLower))
        ) {
          score = 0.88;
        } else if (nameLower.length >= 4 && kwLower.includes(nameLower)) {
          const wordRegex = new RegExp(
            `\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i"
          );
          if (wordRegex.test(kwLower)) {
            score = 0.82;
          } else {
            score = computeSemanticSimilarity(kwLower, nameLower);
          }
        } else if (kwLower.length >= 4 && nameLower.includes(kwLower)) {
          score = 0.82;
        } else {
          const simName = computeSemanticSimilarity(kwLower, nameLower);
          const simDesc = descLower
            ? computeSemanticSimilarity(kwLower, descLower.slice(0, 150)) * 0.7
            : 0;
          score = Math.max(simName, simDesc);
        }

        if (score >= 0.35) {
          scored.push({
            name: entity.name,
            score,
          });
        }
      }

      // Sort by score descending and take topK node names
      scored.sort((a, b) => b.score - a.score);
      const topMatches = scored.slice(0, topK);
      const nodeNames = Array.from(new Set(topMatches.map((m) => m.name)));
      resultsByKeyword[kw] = nodeNames;

      for (const name of nodeNames) {
        allMatchedNodesMap.set(name.toLowerCase(), name);
      }
    }

    const nodes = Array.from(allMatchedNodesMap.values());

    return {
      status: "success",
      graph_target: graphTarget,
      matchedNodesByKeyword: resultsByKeyword,
      nodes,
      summary: `Found ${nodes.length} matching node names across ${rawKeywords.length} keywords in ${graphTarget.toUpperCase()} KG.`,
    };
  },
};
