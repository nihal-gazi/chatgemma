/**
 * Personalization Service for ChatGemma
 * Manages the internal `user.md` file containing user persona, preferences, facts, and constraints.
 * Features automated continuous learning from user prompts and recursive token compaction.
 */

import { CONFIG } from "../config/config.js";

const STORAGE_KEY = "chatgemma_user_md_v1";

const DEFAULT_PROFILE = `# User Profile (user.md)

## Identity & Persona
- Name / Display: User
- Role / Background: Developer / AI Researcher

## Technical Preferences & Stack
- Preferred Tone: Concise, modular, clean, and direct
- Coding Style: Readable, decoupled architecture, well-documented

## Projects & Research Context
- Platforms: ChatGemma, KindSynapse ecosystem

## Specific Constraints & Guidelines
- Keep responses free of unnecessary emojis and vibe-coded filler.
`;

export class PersonalizationService {
  constructor() {
    this.profile = this.loadFromStorage();
  }

  /**
   * Estimates token count for text (~3.8 characters per token average).
   */
  estimateTokens(text) {
    if (!text || typeof text !== "string") return 0;
    return Math.max(1, Math.ceil(text.trim().length / 3.8));
  }

  /**
   * Retrieves the current user.md content.
   */
  getProfile() {
    return this.profile;
  }

  /**
   * Saves updated user.md content to storage.
   */
  setProfile(text) {
    this.profile = typeof text === "string" ? text.trim() : DEFAULT_PROFILE;
    this.saveToStorage();
    return this.getProfileStats();
  }

  /**
   * Resets user.md to the standard clean template.
   */
  resetProfile() {
    this.profile = DEFAULT_PROFILE;
    this.saveToStorage();
    return this.getProfileStats();
  }

  /**
   * Returns current metadata and token statistics for user.md.
   */
  getProfileStats(maxTokens = 5000) {
    const tokens = this.estimateTokens(this.profile);
    return {
      tokens,
      maxTokens,
      characters: this.profile.length,
      lines: this.profile.split("\n").length,
      isOverLimit: tokens > maxTokens,
    };
  }

  /**
   * Asynchronously updates user.md from user prompt self-disclosures.
   */
  async updateFromPrompt({ userMessage, apiKey, modelId = "gemma-4-31b-it", maxTokens = 5000, signal = null }) {
    if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length < 5) {
      return null;
    }

    const cleanKey = (apiKey || CONFIG.defaultApiKey || "").trim().replace(/^["']|["']$/g, "");
    if (!cleanKey) return null;

    const currentProfile = this.getProfile();

    const prompt = `You are the Personalization Profile Manager for ChatGemma.
Your job is to maintain the user's internal "user.md" profile.

Current user.md Profile:
"""
${currentProfile}
"""

User Message:
"""
${userMessage.trim()}
"""

Task:
1. Determine if the user stated any facts about themselves, preferences, dislikes, tools, habits, workflows, name, location, or constraints.
2. If YES, update and merge this new knowledge into the markdown profile under the appropriate heading.
3. If NO personal information was provided in the message, return the exact current user.md unchanged.
4. Output ONLY the raw markdown content for user.md without any commentary, conversational intro, or code fence wrappers.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingLevel: "MINIMAL",
        },
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
        console.warn(`[Personalization] API returned status ${res.status}`);
        return null;
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const rawText = parts
        .filter((p) => !p.thought && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n") || parts.map((p) => p.text || "").join("\n");

      // Strip optional code fence if model included it
      const cleanMarkdown = rawText.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();

      if (cleanMarkdown && cleanMarkdown.length > 20) {
        this.profile = cleanMarkdown;
        this.saveToStorage();

        // Check if compaction is needed
        if (this.estimateTokens(this.profile) > maxTokens) {
          await this.compactProfile({ maxTokens, apiKey: cleanKey, modelId });
        }

        return this.getProfileStats(maxTokens);
      }
      return null;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[Personalization] Update error:", err);
      }
      return null;
    }
  }

  /**
   * Recursively compacts user.md until its token count is within maxTokens.
   */
  async compactProfile({ maxTokens = 5000, apiKey, modelId = "gemma-4-31b-it", signal = null }) {
    const cleanKey = (apiKey || CONFIG.defaultApiKey || "").trim().replace(/^["']|["']$/g, "");
    if (!cleanKey) return this.getProfileStats(maxTokens);

    let currentProfile = this.getProfile();
    let currentTokens = this.estimateTokens(currentProfile);
    let iterations = 0;
    const maxIterations = 4;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    while (currentTokens > maxTokens && iterations < maxIterations) {
      iterations++;
      console.log(`[Personalization] Compaction iteration ${iterations}: ${currentTokens} tokens > limit ${maxTokens}`);

      const prompt = `You are the Profile Compactor for ChatGemma.
The user profile below exceeds the target token limit (${currentTokens} tokens > ${maxTokens} max).
Compress, deduplicate, and tightly distill the markdown profile into high-density notes while preserving ALL critical facts, identities, technical preferences, guidelines, and project details.

Profile to Compress:
"""
${currentProfile}
"""

Target: Under ${maxTokens} tokens.
Output ONLY the compressed raw markdown content without any code blocks or conversational intro.`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: Math.min(maxTokens, 4096),
          thinkingConfig: {
            thinkingLevel: "MINIMAL",
          },
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
        const rawText = parts
          .filter((p) => !p.thought && typeof p.text === "string")
          .map((p) => p.text)
          .join("\n") || parts.map((p) => p.text || "").join("\n");

        const cleanMarkdown = rawText.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();

        if (cleanMarkdown && cleanMarkdown.length < currentProfile.length) {
          currentProfile = cleanMarkdown;
          currentTokens = this.estimateTokens(currentProfile);
        } else {
          break;
        }
      } catch (e) {
        console.warn("[Personalization] Compaction error:", e);
        break;
      }
    }

    this.profile = currentProfile;
    this.saveToStorage();
    return this.getProfileStats(maxTokens);
  }

  /**
   * Persistence: Save to LocalStorage
   */
  saveToStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, this.profile);
      }
    } catch (e) {
      console.warn("[Personalization] LocalStorage write error:", e);
    }
  }

  /**
   * Persistence: Load from LocalStorage
   */
  loadFromStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && stored.trim()) {
          return stored;
        }
      }
    } catch (e) {
      console.warn("[Personalization] LocalStorage read error:", e);
    }
    return DEFAULT_PROFILE;
  }
}

// Global Singleton Instance
export const personalizationInstance = new PersonalizationService();
