/**
 * Personalization Service for ChatGemma (user.md Maintenance & Token Compaction)
 * Maintains a persistent user.md markdown profile in browser storage,
 * continuously learns from user prompts, and performs recursive LLM compaction
 * when the profile exceeds the configurable token limit.
 */

import { CONFIG } from "../config/config.js";

const STORAGE_KEY = "chatgemma_user_md_v1";

const DEFAULT_USER_MD = `# User Profile (user.md)

## Identity & Background
- User of ChatGemma.

## Preferences & Style
- None recorded yet.

## Ongoing Projects & Tools
- None recorded yet.
`;

export class PersonalizationService {
  constructor() {
    this.profileMarkdown = DEFAULT_USER_MD;
    this.loadFromStorage();
  }

  /**
   * Approximate token estimation (~3.8 characters per token for English text & Markdown)
   */
  estimateTokens(text) {
    if (!text || typeof text !== "string") return 0;
    return Math.ceil(text.trim().length / 3.8);
  }

  /**
   * Get the current user.md profile markdown
   */
  getProfile() {
    return this.profileMarkdown || DEFAULT_USER_MD;
  }

  /**
   * Update and save user.md profile markdown
   */
  setProfile(text) {
    this.profileMarkdown = (text || "").trim() || DEFAULT_USER_MD;
    this.saveToStorage();
    return this.profileMarkdown;
  }

  /**
   * Reset user.md profile to default template
   */
  resetProfile() {
    this.profileMarkdown = DEFAULT_USER_MD;
    this.saveToStorage();
    return this.profileMarkdown;
  }

  /**
   * Evaluates a user prompt to detect personal disclosures and updates user.md asynchronously.
   */
  async updateFromPrompt({ userMessage, apiKey, modelId = "gemma-4-31b-it", maxTokens = 5000, signal = null }) {
    if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length < 4) {
      return this.profileMarkdown;
    }

    const cleanKey = (apiKey || CONFIG.defaultApiKey || "").trim().replace(/^["']|["']$/g, "");
    if (!cleanKey) return this.profileMarkdown;

    // Fast heuristic filter: check for self-referential or preference markers
    const selfReferentialRegex = /\b(?:i am|i'm|my|me|i prefer|i like|i love|i hate|i work|i live|i build|i use|call me|remember that|my name|my project|my role)\b/i;
    if (!selfReferentialRegex.test(userMessage)) {
      return this.profileMarkdown;
    }

    const prompt = `You are the Personalization Engine for ChatGemma.
Analyze the user's latest prompt alongside their current user.md profile.
If the user disclosed facts about themselves (identity, location, profession, skills, projects, preferences, habits, instructions), update and return the updated user.md markdown.
Keep the structure organized with clean markdown headings.
If nothing new or noteworthy about the user was shared, return the current user.md unchanged.

Current user.md:
"""
${this.profileMarkdown}
"""

User's Latest Message:
"""
${userMessage.trim()}
"""

Return ONLY the updated user.md markdown text:`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: "MINIMAL" },
      },
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        console.warn(`[Personalization] API returned ${res.status}`);
        return this.profileMarkdown;
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      let rawText = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("\n") || parts.map((p) => p.text || "").join("\n");

      // Strip markdown code block wrappers if model enclosed output in ```markdown
      const mdMatch = rawText.match(/```(?:markdown|md)?\s*([\s\S]*?)\s*```/i);
      if (mdMatch && mdMatch[1]) {
        rawText = mdMatch[1].trim();
      }

      if (rawText && rawText.length > 20) {
        this.profileMarkdown = rawText.trim();
        this.saveToStorage();

        // Check if token limit exceeded, trigger recursive compaction
        if (this.estimateTokens(this.profileMarkdown) > maxTokens) {
          await this.compactProfile({ maxTokens, apiKey: cleanKey, modelId, signal });
        }
      }

      return this.profileMarkdown;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[Personalization] updateFromPrompt error:", err);
      }
      return this.profileMarkdown;
    }
  }

  /**
   * Recursively compacts user.md using Gemma until token count is <= maxTokens
   */
  async compactProfile({ maxTokens = 5000, apiKey, modelId = "gemma-4-31b-it", signal = null }) {
    const cleanKey = (apiKey || CONFIG.defaultApiKey || "").trim().replace(/^["']|["']$/g, "");
    if (!cleanKey) return this.profileMarkdown;

    let currentTokens = this.estimateTokens(this.profileMarkdown);
    if (currentTokens <= maxTokens) return this.profileMarkdown;

    const maxIterations = 3;
    let iteration = 0;

    while (currentTokens > maxTokens && iteration < maxIterations) {
      iteration++;
      console.log(`[Personalization] Compaction Iteration ${iteration}: ${currentTokens} tokens -> target ${maxTokens}`);

      const prompt = `You are the Profile Compactor for ChatGemma.
The user.md profile has grown too large (${currentTokens} estimated tokens, maximum allowed: ${maxTokens} tokens).
Distill, merge, and concisely compact this user.md markdown profile so that it fits strictly within ${maxTokens} tokens while preserving ALL core user facts, preferences, background, technologies, and instructions.

user.md to Compact:
"""
${this.profileMarkdown}
"""

Return ONLY the compacted user.md markdown text:`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(cleanKey)}`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
        },
      };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal,
        });

        if (!res.ok) break;

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        let rawText = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("\n") || parts.map((p) => p.text || "").join("\n");

        const mdMatch = rawText.match(/```(?:markdown|md)?\s*([\s\S]*?)\s*```/i);
        if (mdMatch && mdMatch[1]) {
          rawText = mdMatch[1].trim();
        }

        if (rawText && rawText.length > 20) {
          this.profileMarkdown = rawText.trim();
          this.saveToStorage();
          currentTokens = this.estimateTokens(this.profileMarkdown);
        } else {
          break;
        }
      } catch (e) {
        console.warn("[Personalization] Compaction error:", e);
        break;
      }
    }

    return this.profileMarkdown;
  }

  saveToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, this.profileMarkdown);
      }
    } catch (e) {
      console.warn("[Personalization] LocalStorage write error:", e);
    }
  }

  loadFromStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw && raw.trim().length > 0) {
          this.profileMarkdown = raw.trim();
          return;
        }
      }
    } catch (e) {
      console.warn("[Personalization] LocalStorage read error:", e);
    }
    this.profileMarkdown = DEFAULT_USER_MD;
  }
}

export const personalizationInstance = new PersonalizationService();
