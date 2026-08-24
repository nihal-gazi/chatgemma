/**
 * Synapser Code Snippet Retrieval Engine for ChatGemma
 * Powers hallucination-free boilerplate code search and retrieval for LLMs.
 * Implements hybrid character n-gram cosine similarity (all-MiniLM-L6 style)
 * + BM25 keyword boosting across libraries, tags, and descriptions.
 */

import synapserSnippetsData from "../data/synapserSnippets.json" with { type: "json" };
import { computeSemanticSimilarity } from "../utils/similarity.js";

export class SynapserService {
  constructor(initialSnippets = synapserSnippetsData) {
    this.snippets = new Map();
    if (Array.isArray(initialSnippets)) {
      initialSnippets.forEach((snippet) => {
        if (snippet && snippet.id) {
          this.snippets.set(snippet.id, snippet);
        }
      });
    }
  }

  /**
   * Returns all loaded snippets.
   * @returns {Array<Object>}
   */
  getAllSnippets() {
    return Array.from(this.snippets.values());
  }

  /**
   * Retrieves a single snippet by its unique ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getSnippet(id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    if (this.snippets.has(cleanId)) {
      return this.snippets.get(cleanId);
    }
    // Case-insensitive fallback
    const lower = cleanId.toLowerCase();
    for (const [sId, snippet] of this.snippets.entries()) {
      if (sId.toLowerCase() === lower) {
        return snippet;
      }
    }
    return null;
  }

  /**
   * Search code snippet candidates using hybrid semantic similarity and keyword matching.
   * Stage 1 of the two-stage retrieval protocol.
   *
   * @param {string} query - Natural language description of required code functionality
   * @param {Object} options
   * @param {string} [options.library] - Optional library filter (e.g. 'gradio', 'pytorch', 'fastapi')
   * @param {string} [options.category] - Optional category filter (e.g. 'ui', 'training', 'data')
   * @param {string} [options.language='python'] - Programming language
   * @param {number} [options.top_k=5] - Number of candidate summaries to return
   * @returns {Array<Object>}
   */
  searchSnippets(query = "", options = {}) {
    const rawQuery = String(query || "").trim();
    const queryLower = rawQuery.toLowerCase();
    const libraryFilter = options.library ? String(options.library).trim().toLowerCase() : null;
    const categoryFilter = options.category ? String(options.category).trim().toLowerCase() : null;
    const languageFilter = options.language ? String(options.language).trim().toLowerCase() : null;
    const topK = Math.max(1, Math.min(Number(options.top_k) || 5, 20));

    const queryTokens = queryLower
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scoredCandidates = [];

    for (const snippet of this.snippets.values()) {
      // 1. Language Filter
      if (languageFilter && snippet.language && snippet.language.toLowerCase() !== languageFilter) {
        continue;
      }

      // 2. Library Filter
      if (libraryFilter && snippet.library) {
        const snipLib = snippet.library.toLowerCase();
        if (snipLib !== libraryFilter && !snipLib.includes(libraryFilter) && !libraryFilter.includes(snipLib)) {
          continue;
        }
      }

      // 3. Category Filter
      if (categoryFilter && snippet.category) {
        const snipCat = snippet.category.toLowerCase();
        if (snipCat !== categoryFilter && !snipCat.includes(categoryFilter)) {
          continue;
        }
      }

      // 4. Hybrid Scoring
      const titleLower = (snippet.title || "").toLowerCase();
      const shortDescLower = (snippet.short_desc || "").toLowerCase();
      const veryShortDescLower = (snippet.very_short_desc || "").toLowerCase();
      const libLower = (snippet.library || "").toLowerCase();
      const tags = (snippet.tags || []).map((t) => String(t).toLowerCase());

      // Semantic Cosine Similarity (MiniLM-style)
      const simShort = computeSemanticSimilarity(queryLower, shortDescLower);
      const simTitle = computeSemanticSimilarity(queryLower, titleLower);
      const simVeryShort = computeSemanticSimilarity(queryLower, veryShortDescLower);
      let score = Math.max(simShort, simTitle * 0.9, simVeryShort * 0.85);

      // Exact substring boost
      if (shortDescLower.includes(queryLower) || titleLower.includes(queryLower)) {
        score = Math.max(score, 0.88);
      }

      // Keyword / Token Overlap Boost
      let tokenMatchCount = 0;
      for (const token of queryTokens) {
        if (
          titleLower.includes(token) ||
          shortDescLower.includes(token) ||
          libLower.includes(token) ||
          tags.some((t) => t.includes(token))
        ) {
          tokenMatchCount++;
        }
      }

      if (queryTokens.length > 0) {
        const tokenRatio = tokenMatchCount / queryTokens.length;
        score = score * 0.6 + tokenRatio * 0.4;
      }

      // Library keyword boost if user mentioned library in query
      if (queryLower.includes(libLower) || (snippet.id && queryLower.includes(snippet.id.toLowerCase()))) {
        score = Math.min(1.0, score + 0.15);
      }

      // Tag matching boost
      for (const tag of tags) {
        if (queryLower.includes(tag)) {
          score = Math.min(1.0, score + 0.08);
        }
      }

      scoredCandidates.push({
        id: snippet.id,
        title: snippet.title,
        library: snippet.library,
        category: snippet.category,
        language: snippet.language || "python",
        min_version: snippet.min_version || "",
        tags: snippet.tags || [],
        very_short_desc: snippet.very_short_desc || snippet.short_desc || "",
        dependencies: snippet.dependencies || [],
        score: Number(Math.min(1.0, score).toFixed(3)),
      });
    }

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates.slice(0, topK);
  }

  /**
   * Adds or updates a snippet in the registry.
   * @param {Object} snippet
   */
  addSnippet(snippet) {
    if (snippet && snippet.id) {
      this.snippets.set(snippet.id, snippet);
    }
  }

  /**
   * Returns summary metrics.
   * @returns {{ totalSnippets: number, libraries: string[], categories: string[] }}
   */
  getStats() {
    const all = Array.from(this.snippets.values());
    const libraries = Array.from(new Set(all.map((s) => s.library).filter(Boolean)));
    const categories = Array.from(new Set(all.map((s) => s.category).filter(Boolean)));
    return {
      totalSnippets: all.length,
      libraries,
      categories,
    };
  }
}

export const synapserServiceInstance = new SynapserService();
