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
    prompt,
    technique,
    baseTriple,
    mutation,
    sourceDomain,
    analogousDomain,
    structuralMappingMatrix,
  },
  { apiKey, modelId, signal } = {}
) {
  const cleanKey = (apiKey || CONFIG.defaultApiKey || "").trim();
  const rawModel = CONFIG.resolveModelName(modelId || CONFIG.defaultModelId);

  if (!cleanKey) {
    return {
      title: "Generated Hypothesis",
      synthesis:
        technique === "predicate_swap"
          ? `Concept based on mutating [${baseTriple?.subject}] ----[${mutation?.mutatedPredicate}]---> [${baseTriple?.object}]. (Add an API key in Settings to enable automated in-tool deep synthesis).`
          : `Concept based on mapping [${sourceDomain?.coreConcept}] to [${analogousDomain?.analogousConcept}]. (Add an API key in Settings to enable automated in-tool deep synthesis).`,
      model: "offline-fallback",
      connectionSummary:
        technique === "predicate_swap"
          ? `Connection: [${baseTriple?.subject}] -[${baseTriple?.predicate}]-> [${baseTriple?.object}] mutated to -[${mutation?.mutatedPredicate}]->`
          : `Connection: ${sourceDomain?.subgraph} mapped to ${analogousDomain?.subgraph}`,
    };
  }

  let systemPrompt = "";
  let userPrompt = "";
  let connectionSummary = "";

  if (technique === "predicate_swap") {
    connectionSummary = `Knowledge Graph Connection: [${baseTriple?.subject}] ----[${baseTriple?.predicate}]---> [${baseTriple?.object}] was mutated to [${baseTriple?.subject}] ----[${mutation?.mutatedPredicate}]---> [${baseTriple?.object}].`;

    systemPrompt = `You are an elite inventive engineer and futurist AI for ChatGemma.
Your task is to take a counter-factual relationship generated from a Knowledge Graph edge mutation and invent a high-impact, technologically or conceptually viable breakthrough idea.`;

    userPrompt = `User Prompt / Goal: "${prompt}"

${connectionSummary}
Mutation Rationale: ${mutation?.explanation || "Semantic relationship inversion"}

Develop a comprehensive and polished brainstorming proposal that makes this mutated relationship real, useful, and commercially or scientifically advantageous.

Format your response cleanly in GitHub Markdown using these exact sections:
### 💡 Breakthrough Concept: <Creative Title>
**Core Inversion**: Explain what was inverted and why it creates a paradigm shift.

#### 1. Engineered Mechanism
Explain how this works in practice (physical, algorithmic, biological, or architectural mechanism).

#### 2. Strategic Advantages & Use Cases
Where and why this completely outperforms conventional approaches.

#### 3. Feasibility, Constraints & Immediate Next Step
Practical considerations, edge cases, and what prototype or experiment should be conducted first.`;
  } else {
    // Isomorphic Mapping
    connectionSummary = `Knowledge Graph Connection: Mapped [${sourceDomain?.coreConcept}] in ${sourceDomain?.name} to [${analogousDomain?.analogousConcept}] in ${analogousDomain?.name} (Similarity: ${(analogousDomain?.similarityScore * 100).toFixed(0)}%).`;

    systemPrompt = `You are an elite cross-domain innovation architect and biomimetic engineer for ChatGemma.
Your task is to take an isomorphic structural analogy between two completely different domains and project mechanisms from the distant domain into the target domain to generate a breakthrough innovation.`;

    userPrompt = `User Prompt / Goal: "${prompt}"

${connectionSummary}

Source Domain Subgraph:
${sourceDomain?.subgraph}

Analogous Distant Domain Subgraph:
${analogousDomain?.subgraph}

Structural Mapping Matrix:
${JSON.stringify(structuralMappingMatrix, null, 2)}

Your task:
Transfer deep principles, secondary defenses, adaptation, or self-organizing mechanisms from [${analogousDomain?.analogousConcept}] (${analogousDomain?.name}) into [${sourceDomain?.coreConcept}] (${sourceDomain?.name}).

Format your response cleanly in GitHub Markdown using these exact sections:
### 💡 Breakthrough Concept: <Creative Title>
**Cross-Domain Foundation**: State the analogy clearly and the core mechanism being imported.

#### 1. Cross-Domain Principle Transfer
What specific dynamics, feedback loops, or behaviors from ${analogousDomain?.name} are being translated.

#### 2. System Architecture & Technical Implementation
Concrete blueprints of how this will be engineered in ${sourceDomain?.name}.

#### 3. Strategic Breakthrough & Unfair Advantages
Why existing approaches in ${sourceDomain?.name} fail to solve this, and how the imported principles overcome that barrier.

#### 4. Practical Implementation Path
Immediate pilot project, experiment, or simulation to validate the concept.`;
  }

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
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract title if present
    const titleMatch = rawText.match(/###\s*💡\s*Breakthrough Concept:\s*(.+)/i) || rawText.match(/###\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : "Breakthrough Innovation Proposal";

    return {
      title,
      synthesis: rawText.trim(),
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
