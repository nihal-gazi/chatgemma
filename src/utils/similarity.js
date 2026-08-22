/**
 * Semantic Similarity & Predicate Inversion Utility for ChatGemma Brainstorming
 * Provides semantic antonym/inverse dictionaries, cosine/embedding similarity approximations,
 * and edge mutation mechanics for Knowledge Graph reasoning.
 */

// Comprehensive Semantic Inversion / Antonym Mappings for KG Predicates
export const PREDICATE_INVERSIONS = {
  ABSORBS: "EMITS",
  EMITS: "ABSORBS",
  PRODUCES: "CONSUMES",
  CONSUMES: "PRODUCES",
  CREATES: "DESTROYS",
  DESTROYS: "CREATES",
  BLOCKS: "TRANSMITS",
  TRANSMITS: "BLOCKS",
  STORES: "RELEASES",
  RELEASES: "STORES",
  PROTECTS: "EXPOSES",
  EXPOSES: "PROTECTS",
  CENTRALIZES: "DISTRIBUTES",
  DISTRIBUTES: "CENTRALIZES",
  ENCRYPTS: "DECRYPTS",
  DECRYPTS: "ENCRYPTS",
  ACCELERATES: "DECELERATES",
  DECELERATES: "ACCELERATES",
  COMPRESSES: "EXPANDS",
  EXPANDS: "COMPRESSES",
  USES: "PROVIDES",
  PROVIDES: "USES",
  DEPENDS_ON: "EMPOWERS",
  EMPOWERS: "DEPENDS_ON",
  ATTRACTS: "REPELS",
  REPELS: "ATTRACTS",
  LOCKS: "UNLOCKS",
  UNLOCKS: "LOCKS",
  ISOLATES: "CONNECTS",
  CONNECTS: "ISOLATES",
  AGGREGATES: "DISPERSES",
  DISPERSES: "AGGREGATES",
  TEACHES: "LEARNS_FROM",
  LEARNS_FROM: "TEACHES",
  ATTACKS: "HEALS",
  HEALS: "ATTACKS",
  INHIBITS: "CATALYZES",
  CATALYZES: "INHIBITS",
};

// Functional Roles / Categories for Topological Isomorphism Discovery
export const PREDICATE_FUNCTIONAL_CATEGORIES = {
  ADVERSARIAL_DEFENSIVE: [
    "BLOCKS",
    "ATTACKS",
    "DEFENDS",
    "INHIBITS",
    "DESTROYS",
    "PROTECTS",
    "NEUTRALIZES",
    "FILTERS",
    "RESISTS",
    "PREVENTS",
    "COMBATS",
    "ELIMINATES",
  ],
  GENERATIVE_PRODUCTIVE: [
    "CREATES",
    "PRODUCES",
    "GENERATES",
    "BUILDS",
    "SYNTHESIZES",
    "EMITS",
    "MANUFACTURES",
    "ORIGINATES",
  ],
  RECEPTIVE_STORAGE: [
    "ABSORBS",
    "STORES",
    "RECEIVES",
    "RETAINS",
    "CONTAINS",
    "CAPTURES",
    "HARVESTS",
    "HOLDS",
  ],
  FLOW_TRANSMISSION: [
    "TRANSMITS",
    "ROUTES",
    "SENDS",
    "DISTRIBUTES",
    "CIRCULATES",
    "TRANSFERS",
    "DELIVERS",
    "BROADCASTS",
  ],
  RELATIONAL_DEPENDENCY: [
    "USES",
    "DEPENDS_ON",
    "CONNECTS",
    "ASSOCIATED_WITH",
    "PART_OF",
    "ENABLES",
    "REQUIRES",
    "IMPLEMENTS",
  ],
  REGULATORY_FEEDBACK: [
    "CONTROLS",
    "REGULATES",
    "GOVERNS",
    "MODULATES",
    "BALANCES",
    "MONITORS",
    "STABILIZES",
  ],
};

// Fallback Orthogonal Predicates for generic mutations
export const ORTHOGONAL_PREDICATES = [
  "INVERTS",
  "REPLICATES",
  "NEUTRALIZES",
  "QUANTIZES",
  "TRANSMUTES",
  "SYNCHRONIZES",
  "OSCILLATES_WITH",
  "DECOUPLES",
];

/**
 * Checks if two predicates share structural / functional isomorphism across domains.
 * @param {string} predA
 * @param {string} predB
 * @returns {number} Functional isomorphism similarity score (0.0 to 1.0)
 */
export function arePredicatesIsomorphic(predA = "", predB = "") {
  const a = predA.toUpperCase().replace(/\s+/g, "_");
  const b = predB.toUpperCase().replace(/\s+/g, "_");
  if (a === b) return 1.0;

  // Check shared functional category
  for (const [, list] of Object.entries(PREDICATE_FUNCTIONAL_CATEGORIES)) {
    if (list.includes(a) && list.includes(b)) {
      return 0.85;
    }
  }

  // Check lexical / semantic n-gram similarity
  return computeSemanticSimilarity(a, b);
}

/**
 * Calculates character n-gram cosine similarity between two strings (MiniLM-style text similarity approximation).
 * @param {string} strA
 * @param {string} strB
 * @returns {number} Similarity score between 0.0 and 1.0
 */
export function computeSemanticSimilarity(strA = "", strB = "") {
  if (!strA || !strB) return 0;
  const a = strA.toLowerCase().trim();
  const b = strB.toLowerCase().trim();
  if (a === b) return 1.0;

  // Exact substring match
  if (a.includes(b) || b.includes(a)) {
    return 0.85;
  }

  // Generate 2-gram and 3-gram feature sets
  const getGrams = (str) => {
    const map = new Map();
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= str.length - n; i++) {
        const gram = str.slice(i, i + n);
        map.set(gram, (map.get(gram) || 0) + 1);
      }
    }
    return map;
  };

  const gramsA = getGrams(a);
  const gramsB = getGrams(b);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [gram, countA] of gramsA) {
    normA += countA * countA;
    const countB = gramsB.get(gram) || 0;
    dotProduct += countA * countB;
  }

  for (const [, countB] of gramsB) {
    normB += countB * countB;
  }

  if (normA === 0 || normB === 0) return 0;
  return parseFloat((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(3));
}

/**
 * Finds the semantic opposite or mutated predicate for a given relationship.
 * @param {string} predicate - The base predicate (e.g. "ABSORBS", "BLOCKS", "USES")
 * @returns {{ mutatedPredicate: string, mutationType: "antonym" | "orthogonal", explanation: string }}
 */
export function getMutatedPredicate(predicate = "") {
  const norm = predicate.toUpperCase().replace(/\s+/g, "_");

  // 1. Direct dictionary antonym
  if (PREDICATE_INVERSIONS[norm]) {
    const inv = PREDICATE_INVERSIONS[norm];
    return {
      mutatedPredicate: inv,
      mutationType: "antonym",
      explanation: `Semantic direct inverse of "${predicate}" is "${inv}".`,
    };
  }

  // 2. Fuzzy match with known predicates
  for (const [key, value] of Object.entries(PREDICATE_INVERSIONS)) {
    if (computeSemanticSimilarity(norm, key) > 0.65) {
      return {
        mutatedPredicate: value,
        mutationType: "antonym",
        explanation: `Fuzzy matched "${predicate}" to "${key}", yielding inverse "${value}".`,
      };
    }
  }

  // 3. Fallback: select an orthogonal transformative predicate
  const hash = Math.abs(norm.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const fallback = ORTHOGONAL_PREDICATES[hash % ORTHOGONAL_PREDICATES.length];

  return {
    mutatedPredicate: fallback,
    mutationType: "orthogonal",
    explanation: `No direct antonym found for "${predicate}". Selected orthogonal transformation "${fallback}".`,
  };
}
