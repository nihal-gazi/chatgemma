/**
 * Token Estimation & Dynamic Context History Extraction Utilities for ChatGemma
 */

/**
 * Fast, conservative token estimator for Gemma / Gemini payload objects (~3.5 chars/token).
 * @param {string|object|Array} input - Text, object, or payload array to estimate
 * @returns {number} Estimated token count
 */
/**
 * Fast, conservative token estimator for Gemma / Gemini payload objects (~3.5 chars/token).
 * Accounts for inline images (~258 tokens per image) and text content.
 * @param {string|object|Array} input - Text, object, or payload array to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokens(input) {
  if (!input) return 0;
  if (typeof input === "string") {
    return Math.ceil(input.length / 3.5);
  }

  // If payload contains inline image parts, don't count raw base64 string length
  if (Array.isArray(input)) {
    return input.reduce((acc, item) => acc + estimateTokens(item), 0);
  }

  if (typeof input === "object") {
    if (input.inlineData) {
      return 258; // Standard image token footprint
    }
    if (input.parts && Array.isArray(input.parts)) {
      return input.parts.reduce((acc, part) => {
        if (part.inlineData) return acc + 258;
        return acc + estimateTokens(part);
      }, 0);
    }
    try {
      const str = JSON.stringify(input);
      return Math.ceil(str.length / 3.5);
    } catch {
      return 0;
    }
  }

  return 0;
}

/**
 * Formats a single chat message into Google GenAI content turn objects.
 * Handles multimodal image parts, code/document file attachments,
 * assistant code execution, function calling, and regular text.
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

  // User Turn: Include attached images as inlineData and text/code files as structured text blocks
  const userParts = [];

  if (Array.isArray(msg.files) && msg.files.length > 0) {
    for (const file of msg.files) {
      if (file.isImage && file.base64Data) {
        userParts.push({
          inlineData: {
            mimeType: file.type || "image/jpeg",
            data: file.base64Data,
          },
        });
      } else if (!file.isImage && file.textContent) {
        const estTokens = file.estimatedTokens || estimateTokens(file.textContent);
        const isLarge = file.isLargeFile || estTokens > 3500;

        if (isLarge) {
          const previewExcerpt = file.textContent.slice(0, 600).trim();
          const pageInfo = file.pageCount ? `, ${file.pageCount} pages` : "";
          const linesInfo = file.linesCount ? `, ${file.linesCount} lines` : "";

          userParts.push({
            text: `[Attached Large File: ${file.name} (Size: ${file.formattedSize || ""}${pageInfo}${linesInfo}, Estimated Tokens: ~${estTokens})]
File Summary / Table of Contents Preview:
\`\`\`${file.language || "text"}
${previewExcerpt}
... [Content truncated for immediate prompt context]
\`\`\`
[System Note: This file content was truncated in the prompt to preserve the 16,000-token context budget. You can query specific sections, terms, or functions using the \`grep\` tool (specifying fileName="${file.name}") or \`file_search\` tool (for semantic queries or full page retrieval).]`,
          });
        } else {
          userParts.push({
            text: `[Attached File: ${file.name} (${file.formattedSize || ""})]\n\`\`\`${file.language || ""}\n${file.textContent}\n\`\`\``,
          });
        }
      }
    }
  }

  if (msg.content && msg.content.trim()) {
    userParts.push({ text: msg.content.trim() });
  } else if (userParts.length === 0) {
    userParts.push({ text: "" });
  }

  return [
    {
      role: msg.role === "assistant" ? "model" : "user",
      parts: userParts,
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
