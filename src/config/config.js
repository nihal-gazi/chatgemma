/**
 * Global Configuration for ChatGemma Web
 */

export const CONFIG = {
  // Default API Key (Set via Settings modal or .env VITE_GEMINI_API_KEY)
  defaultApiKey: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) || "",

  // Default Model
  defaultModelId: "gemma-4-31b-it-high",

  // Model Options with Thinking Configuration
  models: [
    {
      id: "gemma-4-31b-it-high",
      name: "gemma-4-31b-it (HIGH)",
      model: "gemma-4-31b-it",
      thinkingLevel: "HIGH",
      description: "Deep reasoning with extensive thinking tokens",
    },
    {
      id: "gemma-4-31b-it-low",
      name: "gemma-4-31b-it (LOW)",
      model: "gemma-4-31b-it",
      thinkingLevel: "MINIMAL",
      description: "Fast responses with minimal thinking overhead",
    },
    {
      id: "gemma-4-26b-a4b-it-high",
      name: "gemma-4-26b-a4b-it (HIGH)",
      model: "gemma-4-26b-a4b-it",
      thinkingLevel: "HIGH",
      description: "26B MoE model with high thinking level",
    },
    {
      id: "gemma-4-26b-a4b-it-low",
      name: "gemma-4-26b-a4b-it (LOW)",
      model: "gemma-4-26b-a4b-it",
      thinkingLevel: "MINIMAL",
      description: "26B MoE model with minimal thinking level",
    },
  ],

  // Default System Instruction
  defaultSystemPrompt:
    "You are ChatGemma, an advanced AI assistant powered by Google's Gemma 4. " +
    "",

  // API Base Endpoint
  apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models",

  // Local Storage Key
  localStorageKey: "chatgemma_browser_state",

  // File export default name
  defaultSynapseFileName: "userdat.synapse",

  // Helper to resolve UI model setting ID (e.g. 'gemma-4-31b-it-high') to raw API model identifier ('gemma-4-31b-it')
  resolveModelName(modelId) {
    if (!modelId || typeof modelId !== "string") return "gemma-4-31b-it";
    const found = this.models?.find((m) => m.id === modelId);
    if (found && found.model) return found.model;
    return modelId.replace(/-(?:high|low)$/i, "");
  },
};

