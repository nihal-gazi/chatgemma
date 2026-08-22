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
 * @param {number} [seed=0] - Optional seed to vary between antonyms and orthogonal transformations
 * @returns {{ mutatedPredicate: string, mutationType: "antonym" | "orthogonal", explanation: string }}
 */
export function getMutatedPredicate(predicate = "", seed = 0) {
  const norm = predicate.toUpperCase().replace(/\s+/g, "_");

  // 1. Direct dictionary antonym (unless seed specifies an orthogonal variation)
  if (PREDICATE_INVERSIONS[norm] && seed % 3 !== 2) {
    const inv = PREDICATE_INVERSIONS[norm];
    return {
      mutatedPredicate: inv,
      mutationType: "antonym",
      explanation: `Semantic direct inverse of "${predicate}" is "${inv}".`,
    };
  }

  // 2. Fuzzy match with known predicates
  if (seed % 3 !== 2) {
    for (const [key, value] of Object.entries(PREDICATE_INVERSIONS)) {
      if (computeSemanticSimilarity(norm, key) > 0.65) {
        return {
          mutatedPredicate: value,
          mutationType: "antonym",
          explanation: `Fuzzy matched "${predicate}" to "${key}", yielding inverse "${value}".`,
        };
      }
    }
  }

  // 3. Fallback / Orthogonal Transformative variation with seed
  const hash = Math.abs(norm.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const fallback = ORTHOGONAL_PREDICATES[(hash + Math.abs(seed)) % ORTHOGONAL_PREDICATES.length];

  return {
    mutatedPredicate: fallback,
    mutationType: "orthogonal",
    explanation: `Selected orthogonal transformation "${fallback}" (Variation Seed: ${seed}).`,
  };
}

// Common English stop words and conversational filler words
export const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
  "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
  "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
  "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
  "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves", "synthesize", "specifically", "explore", "lead", "leading",
  "field", "idea", "thesis", "premise", "apply", "used", "using", "could", "leads", "lead"
]);

/**
 * Extracts key named entities and salient keywords from a prompt, filtering out conversational fluff & stop words.
 * Also extracts quoted phrases (e.g. 'Tafahut al-Falasifah', 'Brilliant Blunders').
 *
 * @param {string} text
 * @returns {{ phrases: string[], keywords: string[], rawTerms: string[] }}
 */
export function extractSalientKeywords(text = "") {
  if (!text) return { phrases: [], keywords: [], rawTerms: [] };

  // 1. Extract quoted terms (e.g. 'Tafahut al-Falasifah', "Brilliant Blunders")
  const phrases = [];
  const quoteRegex = /(?:^|[\s(])['"‘“]([^'"’”\n]+)['"’”]/g;
  let match;
  while ((match = quoteRegex.exec(text)) !== null) {
    const extracted = match[1].trim();
    if (extracted.length > 2 && extracted.length < 80 && !extracted.includes(")")) {
      phrases.push(extracted);
    }
  }

  // 2. Extract capitalized multi-word phrases (e.g. Al-Ghazali, Machine Learning)
  const capRegex = /\b([A-Z][a-zA-Z0-9_-]+(?:\s+[A-Z][a-zA-Z0-9_-]+)*)\b/g;
  while ((match = capRegex.exec(text)) !== null) {
    const p = match[1].trim();
    if (p.length > 2 && !STOP_WORDS.has(p.toLowerCase()) && !phrases.includes(p)) {
      phrases.push(p);
    }
  }

  // 3. Extract individual salient tokens
  const words = text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  const keywords = Array.from(new Set(words));
  const rawTerms = Array.from(new Set([...phrases, ...keywords]));

  return { phrases, keywords, rawTerms };
}

