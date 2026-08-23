/**
 * Modular Brainstorm Synthesizer for ChatGemma
 * Calls Gemma to synthesize a polished, structured breakthrough idea directly from
 * Knowledge Graph edge mutations (Predicate Swapping) and cross-domain analogies (Isomorphic Mapping).
 */

import { CONFIG } from "../config/config.js";
import { fetchWithRateLimit } from "./api.js";

/**
 * Invokes Gemma directly to transform graph connections and mutations into a polished idea.
 *
 * @param {Object} params
 * @param {string} params.prompt - Original user challenge/topic
 * @param {string} params.technique - "predicate_swap" | "isomorphic_mapping"
 * @param {Object} [params.baseTriple] - Base triple from graph
 * @param {Object} [params.mutation] - Inverted or mutated predicate
 * @param {Object} [params.sourceDomain] - Source domain info
 * @param {Object} [params.analogousDomain] - Analogous domain info
 * @param {Object} [params.structuralMappingMatrix] - Graph node/edge mapping dictionary
 * @param {Object} [options]
 * @param {string} [options.apiKey] - Google GenAI API Key
 * @param {string} [options.modelId] - Model ID
 * @param {AbortSignal} [options.signal] - Abort controller signal
 * @returns {Promise<{ title: string, synthesis: string, model: string, connectionSummary: string }>}
 */
export async function synthesizeBrainstormWithGemma(
  {
    keywords = [],
    prompt,
    baseSubgraph = [],
    mutatedSubgraph = [],
    mutations = [],
    baseTriple,
    mutation,
    targetDomain,
  },
  { apiKey, modelId, signal, seed } = {}
) {
  const cleanKey = (apiKey || CONFIG.defaultApiKey || "").trim();
  const rawModel = CONFIG.resolveModelName(modelId || CONFIG.defaultModelId);

  const kwList = Array.isArray(keywords) && keywords.length > 0 ? keywords.join(", ") : (prompt || "General Concept");

  // Format base and mutated continuous path traversal chains
  let baseStr = "";
  let mutatedStr = "";

  if (baseSubgraph && baseSubgraph.length > 0) {
    baseStr = baseSubgraph
      .map(
        (t, idx) =>
          `[Hop ${idx + 1}] [${t.sourceName}] ----[${t.predicate}]---> [${t.targetName}]`
      )
      .join("\n   ↳ ");
  } else if (baseTriple) {
    baseStr = `[${baseTriple.subject}] ----[${baseTriple.predicate}]---> [${baseTriple.object}]`;
  }

  if (mutations && mutations.length > 0) {
    mutatedStr = mutations
      .map((m, idx) => {
        if (m.isMutated) {
          return `[Hop ${m.step || idx + 1}] [${m.source}] ----[${m.mutatedPredicate}]---> [${m.target}] *(MUTATED from ${m.originalPredicate}: ${m.explanation || "Inversion"})*`;
        }
        return `[Hop ${m.step || idx + 1}] [${m.source}] ----[${m.originalPredicate}]---> [${m.target}] *(Preserved Path Context)*`;
      })
      .join("\n   ↳ ");
  } else if (mutation) {
    mutatedStr = `[${mutation.subject}] ----[${mutation.mutatedPredicate}]---> [${mutation.object}]`;
  }

  if (!cleanKey) {
    return {
      title: "Generated Hypothesis",
      synthesis: `Concept based on mutating Knowledge Graph path for [${kwList}] (Add an API key in Settings to enable automated in-tool deep synthesis).\n\nMutated Path Traversal:\n${mutatedStr}`,
      model: "offline-fallback",
      connectionSummary: `Connection: Multi-hop path for ${kwList} with predicate swaps:\n${mutatedStr}`,
    };
  }

  const connectionSummary = `Knowledge Graph Traversed Path & Mutations:\nBase Continuous Path:\n   ↳ ${baseStr}\n\nMutated Counterfactual Path:\n   ↳ ${mutatedStr}`;

  const systemPrompt = `You are an elite inventive engineer and futurist AI for ChatGemma.
Your task is to take a continuous multi-hop causal/relational chain traversed across the Knowledge Graph, where K predicates along the path have been counter-factually mutated, and invent a high-impact, technologically or conceptually viable breakthrough idea.`;

  const userPrompt = `Target Keywords / Focus Areas: ${kwList}${targetDomain ? ` (Target Domain: ${targetDomain})` : ""}

${connectionSummary}

Develop a comprehensive and polished brainstorming proposal that makes this mutated relationship real, useful, and commercially or scientifically advantageous.

Format your response cleanly in GitHub Markdown using these exact sections:
### 💡 Breakthrough Concept: <Creative Title>
**Core Inversion & Mutated Hypotheses**: Explain what predicates were swapped and why this creates a paradigm shift.

#### 1. Engineered Mechanism
Explain how this works in practice (physical, algorithmic, biological, or architectural mechanism).

#### 2. Strategic Advantages & Use Cases
Where and why this completely outperforms conventional approaches.

#### 3. Feasibility, Constraints & Immediate Next Step
Practical considerations, edge cases, and what prototype or experiment should be conducted first.`;

  const endpoint = `${CONFIG.apiBaseUrl}/${rawModel}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1800,
      ...(seed !== undefined && !isNaN(Number(seed)) ? { seed: Number(seed) } : {}),
      thinkingConfig: {
        thinkingLevel: "MINIMAL",
      },
    },
  };

  try {
    const res = await fetchWithRateLimit(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      },
      { model: rawModel, maxRetries: 3 }
    );

    if (!res.ok) {
      console.warn(`[BrainstormSynthesizer] Synthesis call returned ${res.status}`);
      return {
        title: "Brainstormed Concept",
        synthesis: `Unable to complete live synthesis (HTTP ${res.status}). Mutated relationship: ${connectionSummary}`,
        model: rawModel,
        connectionSummary,
      };
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts = parts
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text)
      .join("\n")
      .trim();

    const rawText = textParts || parts.map((p) => p.text || "").join("\n").trim();

    // Extract title if present
    const titleMatch =
      rawText.match(/###\s*💡\s*Breakthrough Concept:\s*(.+)/i) ||
      rawText.match(/###\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : "Breakthrough Innovation Proposal";

    return {
      title,
      synthesis: rawText,
      model: rawModel,
      connectionSummary,
    };
  } catch (err) {
    if (err.name === "AbortError") throw err;
    console.error("[BrainstormSynthesizer] Synthesis error:", err);
    return {
      title: "Brainstormed Concept",
      synthesis: `Graph connection identified: ${connectionSummary}`,
      model: rawModel,
      connectionSummary,
    };
  }
}
