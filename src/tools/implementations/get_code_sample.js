/**
 * Synapser Get Code Sample Tool for ChatGemma (Stage 2)
 * Fetches the full verified, runnable code boilerplate, dependencies,
 * architectural notes, and documentation for a chosen snippet ID.
 */

import { synapserServiceInstance } from "../../services/synapser.js";

export const getCodeSampleTool = {
  name: "get_code_sample",
  displayName: "Get Code Sample (Synapser)",
  iconName: "Code",
  description:
    "Stage 2 of Synapser Code Retrieval: Fetches the complete verified, runnable boilerplate code, dependencies, long architectural description, and implementation documentation for a specific 'snippet_id' selected from sample_code_query.",
  parameters: {
    type: "OBJECT",
    properties: {
      snippet_id: {
        type: "STRING",
        description:
          "Unique snippet ID obtained from sample_code_query (e.g. 'gradio_image_text_chat', 'pytorch_amp_training_loop', 'pytorch_checkpoint_save_resume').",
      },
    },
    required: ["snippet_id"],
  },
  renderSummary: (args) => {
    return `Synapser Code: \`${args.snippet_id || ""}\``;
  },

  async execute(args, context = {}) {
    const snippetId = String(args.snippet_id || "").trim();
    if (!snippetId) {
      return {
        status: "error",
        error: "Missing required 'snippet_id' argument.",
      };
    }

    const synapser = context.synapser || synapserServiceInstance;
    const snippet = synapser.getSnippet(snippetId);

    if (!snippet) {
      return {
        status: "not_found",
        snippet_id: snippetId,
        error: `Snippet with ID '${snippetId}' was not found in the Synapser database. Please run 'sample_code_query' to discover valid snippet IDs.`,
      };
    }

    return {
      status: "success",
      snippet_id: snippet.id,
      title: snippet.title,
      library: snippet.library,
      category: snippet.category,
      language: snippet.language || "python",
      min_version: snippet.min_version || "",
      dependencies: snippet.dependencies || [],
      very_short_desc: snippet.very_short_desc || "",
      long_desc: snippet.long_desc || "",
      code: snippet.code || "",
      documentation: snippet.documentation || "",
      tags: snippet.tags || [],
    };
  },
};
