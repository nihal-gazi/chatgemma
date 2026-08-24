/**
 * Synapser Sample Code Query Tool for ChatGemma (Stage 1)
 * Searches verified code boilerplate candidates using semantic vector matching
 * and keyword boosting to eliminate LLM hallucinations.
 */

import { synapserServiceInstance } from "../../services/synapser.js";

export const sampleCodeQueryTool = {
  name: "sample_code_query",
  displayName: "Sample Code Query (Synapser)",
  iconName: "Code",
  description:
    "Searches the verified Synapser code snippet database for boilerplate code candidates using semantic vector matching over descriptions. Returns lightweight candidate summaries with snippet IDs, libraries, and very_short_desc (low token overhead). Always call this tool BEFORE writing third-party framework code (PyTorch, Gradio, Transformers, FastAPI, etc.) to prevent API hallucinations.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description:
          "Description of what you want to build or the API functionality needed (e.g. 'gradio multimodal chat with image upload', 'pytorch mixed precision amp training loop', 'atomic checkpoint save resume').",
      },
      library: {
        type: "STRING",
        description:
          "Optional target library or framework filter (e.g. 'gradio', 'pytorch', 'fastapi', 'transformers').",
      },
      category: {
        type: "STRING",
        description:
          "Optional category filter (e.g. 'ui', 'training', 'data', 'distributed', 'vision').",
      },
      language: {
        type: "STRING",
        description: "Programming language (default: 'python').",
      },
      top_k: {
        type: "INTEGER",
        description: "Maximum number of candidate summaries to return (default: 5, min: 1, max: 20).",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) => {
    return `Synapser Query: "${args.query || ""}"${
      args.library ? ` [lib: ${args.library}]` : ""
    }`;
  },

  async execute(args, context = {}) {
    const query = String(args.query || "").trim();
    if (!query) {
      return {
        status: "error",
        error: "Missing required 'query' argument.",
      };
    }

    const library = args.library ? String(args.library).trim() : undefined;
    const category = args.category ? String(args.category).trim() : undefined;
    const language = args.language ? String(args.language).trim() : undefined;
    const topK = Math.max(1, Math.min(Number(args.top_k) || 5, 20));

    const synapser = context.synapser || synapserServiceInstance;
    const candidates = synapser.searchSnippets(query, {
      library,
      category,
      language,
      top_k: topK,
    });

    if (candidates.length === 0) {
      return {
        status: "not_found",
        query,
        library: library || "any",
        totalCandidates: 0,
        candidates: [],
        message: `No verified code snippets found matching query '${query}' (library: ${
          library || "any"
        }). Proceed with standard coding while adhering to modern API best practices.`,
      };
    }

    return {
      status: "success",
      query,
      library: library || "any",
      totalCandidates: candidates.length,
      candidates,
      nextStepDirective:
        "Select the best matching snippet and call 'get_code_sample' with its 'snippet_id' to retrieve verified boilerplate code, dependencies, and architectural documentation.",
    };
  },
};
