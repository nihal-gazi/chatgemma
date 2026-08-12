/**
 * Tool Registry & Function Calling Execution Engine
 * 
 * Declares the 9 tool schemas for Gemma / Gemini API and dispatches executions.
 */

import { runPythonCode } from "./pyodideRunner.js";

export const GEMMA_FUNCTION_DECLARATIONS = [
  {
    name: "get_chat_message",
    description: "Retrieves top-K latest chat messages from the current conversation history or past sessions.",
    parameters: {
      type: "OBJECT",
      properties: {
        k: {
          type: "INTEGER",
          description: "Number of most recent messages to retrieve (e.g. 5, 10).",
        },
        session_id: {
          type: "STRING",
          description: "Optional session ID. If omitted, uses current chat.",
        },
      },
      required: ["k"],
    },
  },
  {
    name: "add_global_knowledge",
    description: "Adds a string of general factual knowledge into 3 global Knowledge Graphs: Semantic (Top-K similarity), Causal (session flow), and Chronic (timeline).",
    parameters: {
      type: "OBJECT",
      properties: {
        content: {
          type: "STRING",
          description: "The factual knowledge string or concept to store.",
        },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Optional category tags or keywords.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "web_search",
    description: "Searches the web for up-to-date information, documentation, news, or articles.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The search query string.",
        },
        num_results: {
          type: "INTEGER",
          description: "Number of search results to return (default: 5).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "show_thought",
    description: "Displays a string of reasoning data to the user inside the dedicated agent thought process box. Only thoughts sent via this tool will be rendered in the UI thinking block.",
    parameters: {
      type: "OBJECT",
      properties: {
        thought: {
          type: "STRING",
          description: "The curated thought or reasoning step to show to the user.",
        },
      },
      required: ["thought"],
    },
  },
  {
    name: "scratch_pad",
    description: "Manages a persistent scratch pad of notes/context that gets forwarded into the system context on subsequent user prompts.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          enum: ["append", "overwrite", "clear", "read"],
          description: "Action to perform on the scratch pad.",
        },
        content: {
          type: "STRING",
          description: "Content to append or overwrite (required for append/overwrite).",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "run_code",
    description: "Executes Python code in a sandboxed WebAssembly environment (Pyodide) for computation, data analysis, or scripting.",
    parameters: {
      type: "OBJECT",
      properties: {
        code: {
          type: "STRING",
          description: "The complete Python code snippet to run.",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "grep",
    description: "Searches across uploaded user files or across chat session history using regex, pattern matching, or line extraction.",
    parameters: {
      type: "OBJECT",
      properties: {
        pattern: {
          type: "STRING",
          description: "The regex pattern or substring to search for.",
        },
        target: {
          type: "STRING",
          enum: ["uploaded_files", "current_chat", "all_chats"],
          description: "Target location to search.",
        },
        is_regex: {
          type: "BOOLEAN",
          description: "Whether the pattern is a regular expression (default: false).",
        },
        case_sensitive: {
          type: "BOOLEAN",
          description: "Whether search is case-sensitive (default: false).",
        },
      },
      required: ["pattern", "target"],
    },
  },
  {
    name: "knowledge_search",
    description: "Traverses and searches a knowledge graph (global or user). Can search semantically for a node and switch across Semantic, Causal, and Chronic graphs during traversal.",
    parameters: {
      type: "OBJECT",
      properties: {
        graph: {
          type: "STRING",
          enum: ["global", "user"],
          description: "Which knowledge graph to search: global knowledge or user knowledge.",
        },
        query: {
          type: "STRING",
          description: "Semantic search query to find the starting node.",
        },
        start_node_id: {
          type: "STRING",
          description: "Optional node ID to start traversal directly from.",
        },
        mode: {
          type: "STRING",
          enum: ["semantic", "causal", "chronic", "all"],
          description: "Graph view to follow during traversal: 'semantic' (concept similarity), 'causal' (chat turn predecessors/successors), 'chronic' (chronological timeline), or 'all'.",
        },
        depth: {
          type: "INTEGER",
          description: "Traversal depth/steps from the root node (default: 2, max: 4).",
        },
      },
      required: ["graph"],
    },
  },
  {
    name: "add_user_knowledge",
    description: "Stores personalized facts, preferences, constraints, or background info about the user in the User Knowledge Graph (Semantic, Causal, and Chronic forms).",
    parameters: {
      type: "OBJECT",
      properties: {
        content: {
          type: "STRING",
          description: "The personal user fact or preference to store.",
        },
        category: {
          type: "STRING",
          description: "Optional category (e.g., 'preference', 'project', 'skill', 'identity').",
        },
      },
      required: ["content"],
    },
  },
];

/**
 * Real-time Web Search helper using DuckDuckGo Instant Answers & HTML search proxy
 */
async function performWebSearch(query, numResults = 5) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json();

    const results = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || "https://duckduckgo.com/?q=" + encoded,
        source: data.AbstractSource || "DuckDuckGo",
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= numResults) break;
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.slice(0, 60) + "...",
            snippet: topic.Text,
            url: topic.FirstURL,
          });
        }
      }
    }

    if (results.length === 0) {
      return {
        query,
        count: 0,
        message: `No instant answer found for "${query}". The web search API completed with 0 matches.`,
        results: [],
      };
    }

    return {
      query,
      count: results.length,
      results,
    };
  } catch (err) {
    return {
      query,
      count: 0,
      error: `Web search request failed: ${err.message || String(err)}`,
      results: [],
    };
  }
}

/**
 * Grep implementation across uploaded files or chat sessions
 */
function performGrep({ pattern, target, isRegex = false, caseSensitive = false }, context) {
  const flags = (caseSensitive ? "" : "i") + "g";
  let regex;

  try {
    regex = isRegex ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
  } catch (err) {
    return { error: `Invalid regular expression: ${err.message}` };
  }

  const matches = [];

  if (target === "uploaded_files") {
    const files = context.uploadedFiles || [];
    for (const file of files) {
      const lines = (file.content || "").split("\n");
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          matches.push({
            source: file.name || "uploaded_file",
            lineNumber: idx + 1,
            lineText: line.trim(),
          });
        }
      });
    }
  } else if (target === "current_chat" || target === "all_chats") {
    const sessions = target === "all_chats" ? (context.allSessions || []) : [context.currentSession].filter(Boolean);

    for (const session of sessions) {
      for (const msg of session.messages || []) {
        const lines = (msg.content || "").split("\n");
        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            matches.push({
              source: `chat_${session.id || "session"} (${msg.role})`,
              lineNumber: idx + 1,
              lineText: line.trim(),
            });
          }
        });
      }
    }
  }

  return {
    pattern,
    target,
    totalMatches: matches.length,
    matches: matches.slice(0, 30), // Cap output size
  };
}

/**
 * Dispatches and executes a tool call requested by Gemma/Gemini.
 */
export async function executeTool(toolName, args = {}, context = {}) {
  const startTime = performance.now();

  try {
    switch (toolName) {
      case "get_chat_message": {
        const k = parseInt(args.k, 10) || 5;
        const sessionId = args.session_id || context.currentSessionId;
        const session = context.allSessions?.find((s) => s.id === sessionId) || context.currentSession;
        const messages = session?.messages || [];
        const topK = messages.slice(-k).map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        return {
          sessionId,
          requestedK: k,
          returnedCount: topK.length,
          messages: topK,
        };
      }

      case "add_global_knowledge": {
        const { content, tags = [] } = args;
        if (!context.globalKG) throw new Error("Global Knowledge Graph not initialized in context");
        const node = context.globalKG.addNode(content, { tags }, context.currentSessionId || "global");
        if (context.onKnowledgeGraphUpdate) context.onKnowledgeGraphUpdate("global");
        return {
          status: "success",
          message: "Knowledge node successfully added to Global Semantic, Causal, and Chronic graphs.",
          node,
        };
      }

      case "add_user_knowledge": {
        const { content, category = "general" } = args;
        if (!context.userKG) throw new Error("User Knowledge Graph not initialized in context");
        const node = context.userKG.addNode(content, { category }, context.currentSessionId || "user_global");
        if (context.onKnowledgeGraphUpdate) context.onKnowledgeGraphUpdate("user");
        return {
          status: "success",
          message: "User knowledge node successfully added to User Semantic, Causal, and Chronic graphs.",
          node,
        };
      }

      case "knowledge_search": {
        const { graph, query, start_node_id, mode = "semantic", depth = 2 } = args;
        const kg = graph === "user" ? context.userKG : context.globalKG;
        if (!kg) throw new Error(`${graph} knowledge graph is not available`);

        const result = kg.traverse({
          startNodeId: start_node_id,
          query,
          mode,
          depth: Math.min(depth, 4),
          maxNodes: 12,
        });

        return {
          graph,
          ...result,
        };
      }

      case "web_search": {
        const query = args.query || "";
        const numResults = parseInt(args.num_results, 10) || 5;
        return await performWebSearch(query, numResults);
      }

      case "show_thought": {
        const thought = args.thought || "";
        if (context.onShowThought) {
          context.onShowThought(thought);
        }
        return {
          status: "displayed",
          message: "Thought process displayed in user interface.",
        };
      }

      case "scratch_pad": {
        const { action = "read", content = "" } = args;
        let currentScratchPad = context.scratchPad || "";
        let newContent = currentScratchPad;

        if (action === "append") {
          newContent = currentScratchPad ? `${currentScratchPad}\n${content}` : content;
        } else if (action === "overwrite") {
          newContent = content;
        } else if (action === "clear") {
          newContent = "";
        }

        if (context.onScratchPadUpdate) {
          context.onScratchPadUpdate(newContent);
        }

        return {
          action,
          scratchPadContent: newContent,
          characterCount: newContent.length,
        };
      }

      case "run_code": {
        const code = args.code || "";
        const execResult = await runPythonCode(code);
        return {
          code,
          ...execResult,
        };
      }

      case "grep": {
        return performGrep(args, context);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (err) {
    return {
      error: err.message || String(err),
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}
