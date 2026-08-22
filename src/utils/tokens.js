/**
 * Token Estimation & Dynamic Context History Extraction Utilities for ChatGemma
 */

/**
 * Fast, conservative token estimator for Gemma / Gemini payload objects (~3.5 chars/token).
 * @param {string|object|Array} input - Text, object, or payload array to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokens(input) {
  if (!input) return 0;
  if (typeof input === "string") {
    return Math.ceil(input.length / 3.5);
  }
  try {
    const str = typeof input === "object" ? JSON.stringify(input) : String(input);
    return Math.ceil(str.length / 3.5);
  } catch {
    return 0;
  }
}

/**
 * Formats a single chat message into Google GenAI content turn objects.
 * Handles assistant turns with code execution, function calling, and regular text.
 * @param {object} msg - Raw message object
 * @returns {Array<object>} Formatted GenAI turn array
 */
export function formatSingleMessageToGenAI(msg) {
  if (!msg) return [];

  if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
    const functionCallParts = [];

    for (const tc of msg.toolCalls) {
      if (tc.name === "run_code" || tc.name === "code_execution") {
        functionCallParts.push({
          executableCode: {
            language: tc.args?.language || "PYTHON",
            code: tc.args?.code || "",
          },
        });
        functionCallParts.push({
          codeExecutionResult: {
            outcome: tc.status === "error" ? "OUTCOME_FAILED" : "OUTCOME_OK",
            output: tc.response?.stdout || tc.response?.output || "",
          },
        });
      } else if (tc.name !== "web_search" && tc.name !== "google_search") {
        functionCallParts.push({
          functionCall: {
            name: tc.name,
            args: tc.args || {},
          },
        });
      }
    }

    if (msg.content && msg.content.trim()) {
      functionCallParts.push({ text: msg.content });
    }

    const turns = [];
    turns.push({
      role: "model",
      parts: functionCallParts.length > 0 ? functionCallParts : [{ text: msg.content || "" }],
    });

    // Function response turns for custom tools
    for (const tc of msg.toolCalls) {
      if (
        tc.name !== "run_code" &&
        tc.name !== "code_execution" &&
        tc.name !== "web_search" &&
        tc.name !== "google_search"
      ) {
        turns.push({
          role: "function",
          parts: [
            {
              functionResponse: {
                name: tc.name,
                response: tc.response || { result: "ok" },
              },
            },
          ],
        });
      }
    }
    return turns;
  }

  return [
    {
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content || "" }],
    },
  ];
}

/**
 * Extracts and fits chat history up to a specific token limit.
 * Iterates backwards from newest message to oldest so recent context is prioritized.
 *
 * @param {Array<object>} messages - Full message history array
 * @param {number} tokenLimit - Maximum token budget (e.g. 16000)
 * @param {object} [options]
 * @param {Function} [options.formatMessageFn] - Custom formatting function (defaults to formatSingleMessageToGenAI)
 * @param {boolean} [options.rawMessages=false] - If true, returns raw message objects instead of formatted GenAI turns
 * @param {boolean} [options.preserveLatest=true] - Always include the latest turn even if large
 * @returns {Array<object>} Extracted chat history fitting within the token budget
 */
export function extractChatByTokenLimit(
  messages,
  tokenLimit = 16000,
  {
    formatMessageFn = formatSingleMessageToGenAI,
    rawMessages = false,
    preserveLatest = true,
  } = {}
) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const selectedItems = [];
  let currentTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const turns = rawMessages ? [msg] : formatMessageFn(msg);
    const itemTokens = estimateTokens(turns);

    // Always preserve at least the latest user prompt
    if (i === messages.length - 1 && preserveLatest) {
      selectedItems.unshift(...turns);
      currentTokens += itemTokens;
      continue;
    }

    // Stop adding older messages if token limit would be exceeded
    if (currentTokens + itemTokens > tokenLimit) {
      break;
    }

    selectedItems.unshift(...turns);
    currentTokens += itemTokens;
  }

  return selectedItems;
}

/**
 * Safely prunes the oldest turns from a contents array if multi-turn tool loops expand beyond budget.
 * @param {Array<object>} contents - Google GenAI contents array
 * @param {number} tokenLimit - Maximum allowed token budget
 * @returns {Array<object>} Pruned contents array
 */
export function pruneTurnsToTokenLimit(contents, tokenLimit = 16000) {
  if (!Array.isArray(contents)) return [];
  while (contents.length > 2 && estimateTokens(contents) > tokenLimit) {
    contents.shift();
  }
  return contents;
}
