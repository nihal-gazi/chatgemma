/**
 * API Service for Gemma / Gemini models with Native Google Search, Server-Side Code Execution,
 * Custom Function Calling Tools, Intelligent Rate Limiting with Auto-Pause/Resume, and Comprehensive Browser Console Logging.
 */

import { CONFIG } from "../config/config.js";
import { toolRegistry } from "../tools/index.js";
import {
  estimateTokens,
  extractChatByTokenLimit,
  pruneTurnsToTokenLimit,
  sleep,
} from "../utils/index.js";

const MAX_INPUT_TOKEN_LIMIT = 16000;
const SAFETY_BUFFER_TOKENS = 400;

// Re-export estimateTokens for backward compatibility
export { estimateTokens };

/**
 * Modular API Rate Limiter & Call History Recorder
 * Tracks calls per minute, maintains rolling call history, and automatically handles
 * 429 / 503 quota exhaustion with intelligent pause / resume extracted from the error message.
 */
export class ApiRateLimiter {
  constructor() {
    this.callHistory = []; // Rolling log of { timestamp, endpoint, model }
    this.cooldownUntil = 0; // Epoch timestamp in ms
    this.minCallSpacingMs = 800; // Minimum pause between consecutive requests to prevent micro-bursts
    this.lastCallTime = 0;
  }

  /**
   * Records an API call in the history window.
   */
  recordCall(endpoint = "", model = "") {
    const now = Date.now();
    this.lastCallTime = now;
    this.callHistory.push({ timestamp: now, endpoint, model });

    // Prune entries older than 5 minutes
    const fiveMinAgo = now - 5 * 60 * 1000;
    this.callHistory = this.callHistory.filter((c) => c.timestamp >= fiveMinAgo);
  }

  /**
   * Returns current rate limit statistics and call counts.
   */
  getStats() {
    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const callsLastMinute = this.callHistory.filter((c) => c.timestamp >= oneMinAgo).length;
    const cooldownRemaining = Math.max(0, this.cooldownUntil - now);

    return {
      totalCallsLogged: this.callHistory.length,
      callsLastMinute,
      cooldownRemainingMs: cooldownRemaining,
      isCoolingDown: cooldownRemaining > 0,
      lastCallTime: this.lastCallTime,
    };
  }

  /**
   * Sets a global cooldown period until a future timestamp.
   */
  setCooldown(waitMs) {
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + waitMs);
  }

  /**
   * Extracts wait duration in milliseconds from 429 error messages or response headers.
   * Matches "Please retry in 17.343236122s", "retry after 15s", "in 12 seconds", etc.
   */
  parseRetryAfterMs(errorMessage = "", responseHeaders = null) {
    if (responseHeaders?.get) {
      const headerVal = responseHeaders.get("retry-after");
      if (headerVal) {
        const parsedSec = parseFloat(headerVal);
        if (!isNaN(parsedSec) && parsedSec > 0) {
          return Math.ceil(parsedSec * 1000) + 600;
        }
      }
    }

    if (typeof errorMessage === "string") {
      const match =
        errorMessage.match(/retry\s+(?:in|after)\s+([0-9.]+)\s*s/i) ||
        errorMessage.match(/in\s+([0-9.]+)\s*(?:s|seconds)/i) ||
        errorMessage.match(/wait\s+([0-9.]+)\s*(?:s|seconds)/i);

      if (match && match[1]) {
        const sec = parseFloat(match[1]);
        if (!isNaN(sec) && sec > 0) {
          return Math.ceil(sec * 1000) + 600; // 600ms safety buffer
        }
      }
    }

    // Default fallback wait time for 429 (10s)
    return 10000;
  }

  /**
   * Ensures respectful pacing before initiating a new request.
   * If a cooldown is active or calls are bursting, waits asynchronously.
   */
  async waitBeforeRequest(signal = null) {
    const now = Date.now();

    // 1. Check active rate-limit cooldown
    if (this.cooldownUntil > now) {
      const waitMs = this.cooldownUntil - now;
      console.log(
        `%c[ChatGemma][RateLimit] Active cooldown active. Pausing ${(waitMs / 1000).toFixed(1)}s before next call...`,
        "color: #f59e0b; font-weight: bold;"
      );
      await sleep(waitMs, signal);
    }

    // 2. Enforce minimum call spacing to avoid micro-burst 429s
    const timeSinceLast = Date.now() - this.lastCallTime;
    if (timeSinceLast < this.minCallSpacingMs) {
      const spacingWait = this.minCallSpacingMs - timeSinceLast;
      await sleep(spacingWait, signal);
    }
  }
}

export const apiRateLimiter = new ApiRateLimiter();

/**
 * Robust fetch wrapper that tracks API calls, enforces pacing, and automatically
 * handles 429 / 503 rate limit errors by waiting the requested time and retrying.
 */
export async function fetchWithRateLimit(
  url,
  options = {},
  { maxRetries = 4, onRateLimitWait = null, model = "" } = {}
) {
  let attempt = 0;
  const signal = options.signal;

  while (true) {
    attempt++;

    // 1. Wait for any active cooldown or spacing
    await apiRateLimiter.waitBeforeRequest(signal);

    // 2. Record this call
    apiRateLimiter.recordCall(url, model);

    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      if (err.name === "AbortError") {
        throw err;
      }
      if (attempt <= maxRetries) {
        const backoffMs = Math.min(attempt * 2000, 10000);
        console.warn(
          `%c[ChatGemma][Network] Fetch failed (${err.message}). Retrying in ${backoffMs}ms (Attempt ${attempt}/${maxRetries})...`,
          "color: #f59e0b;"
        );
        await sleep(backoffMs, signal);
        continue;
      }
      throw err;
    }

    // 3. Handle 429 / 503 Quota & Rate Limit errors
    if (response.status === 429 || response.status === 503) {
      let errorDetail = "";
      try {
        const cloned = response.clone();
        const errorJson = await cloned.json();
        errorDetail = errorJson.error?.message || response.statusText;
      } catch {
        try {
          const cloned = response.clone();
          errorDetail = await cloned.text();
        } catch {
          errorDetail = response.statusText;
        }
      }

      if (attempt <= maxRetries) {
        const waitMs = apiRateLimiter.parseRetryAfterMs(errorDetail, response.headers);
        const waitSec = (waitMs / 1000).toFixed(1);

        apiRateLimiter.setCooldown(waitMs);

        console.warn(
          `%c[ChatGemma][RateLimit ${response.status}] Quota limit hit: "${errorDetail}". Pausing for ${waitSec}s before retrying (Attempt ${attempt}/${maxRetries})...`,
          "color: #f59e0b; font-weight: bold;"
        );

        if (typeof onRateLimitWait === "function") {
          onRateLimitWait({
            status: response.status,
            errorDetail,
            waitMs,
            waitSeconds: Math.ceil(waitMs / 1000),
            attempt,
            maxRetries,
          });
        }

        await sleep(waitMs, signal);
        continue;
      }
    }

    return response;
  }
}

export class GemmaApiService {
  constructor(apiKey, modelId, systemPrompt) {
    this.apiKey = apiKey || CONFIG.defaultApiKey;
    this.modelConfig = this._resolveModelConfig(modelId || CONFIG.defaultModelId);
    this.systemPrompt = systemPrompt || CONFIG.defaultSystemPrompt;
    this.abortController = null;
  }

  _resolveModelConfig(modelId) {
    const found = CONFIG.models.find((m) => m.id === modelId);
    return found || CONFIG.models[0];
  }

  updateConfig({ apiKey, modelId, systemPrompt }) {
    if (apiKey !== undefined) this.apiKey = apiKey;
    if (modelId !== undefined) this.modelConfig = this._resolveModelConfig(modelId);
    if (systemPrompt !== undefined) this.systemPrompt = systemPrompt;
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log("%c[ChatGemma] Request Aborted by User", "color: #f87171; font-weight: bold;");
    }
  }

  /**
   * Stream generate content with native Code Execution, Google Search Grounding,
   * custom Function Calling, automatic 429 pause/resume rate limiting, and full console logging.
   *
   * @param {Array} messages - Chat message history
   * @param {Object} callbacks - { onThought, onAnswer, onToolCallStart, onToolCallResult, onReasoningBlocksUpdate, onComplete, onError, onRateLimitWait }
   * @param {Object} executionContext - Context passed to custom tools (e.g. sessions, activeSession)
   */
  async streamChat(
    messages,
    {
      onThought,
      onAnswer,
      onToolCallStart,
      onToolCallResult,
      onReasoningBlocksUpdate,
      onComplete,
      onError,
      onRateLimitWait,
    },
    executionContext = {}
  ) {
    this.cancelRequest();
    this.abortController = new AbortController();

    const cleanKey = (this.apiKey || CONFIG.defaultApiKey || "").trim().replace(/^["']|["']$/g, "");

    if (!cleanKey) {
      const err = new Error("Gemini API Key is missing. Please add it in Settings.");
      console.error("%c[ChatGemma][Error] Gemini API Key is missing!", "color: #ef4444; font-weight: bold;");
      if (onError) onError(err);
      throw err;
    }

    const rawModelName = this.modelConfig.model;
    const thinkingLevel = this.modelConfig.thinkingLevel || "HIGH";
    const endpoint = `${CONFIG.apiBaseUrl}/${rawModelName}:streamGenerateContent?key=${encodeURIComponent(
      cleanKey
    )}&alt=sse`;

    // 1. Build Tools: Native codeExecution + Custom functionDeclarations + Native googleSearch
    const functionDeclarations = toolRegistry.getFunctionDeclarations();

    const tools = [
      { codeExecution: {} },
      ...(functionDeclarations && functionDeclarations.length > 0
        ? [{ functionDeclarations }]
        : []),
      { googleSearch: {} },
    ];

    const toolConfig =
      functionDeclarations && functionDeclarations.length > 0
        ? { includeServerSideToolInvocations: true }
        : undefined;

    // 2. Dynamic Temporal Anchor
    const currentDateStr = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 3. User Personalization Profile (user.md)
    let personalizationContext = "";
    const isPersonalizationEnabled = executionContext.settings?.enablePersonalization !== false;
    const userProfileMd =
      executionContext.personalization?.getProfile?.() ||
      executionContext.userProfileMarkdown ||
      "";

    if (isPersonalizationEnabled && userProfileMd.trim().length > 0) {
      personalizationContext = `\n\n[USER PERSONALIZATION PROFILE (user.md)]\n${userProfileMd.trim()}\n`;
    }

    const basePrompt = (this.systemPrompt || CONFIG.defaultSystemPrompt || "").trim();
    const fullSystemInstruction = `${basePrompt}${personalizationContext}

Current Date: ${currentDateStr}.

PROTOCOL:
1. Use available tools (file_search, user_knowledge_graph_search, user_knowledge_graph_write, user_knowledge_graph_delete, knowledge_search, knowledge_graph_write, knowledge_graph_delete, Google Search, Code Execution, Grep) when querying uploaded files/documents, learned knowledge, saving facts, soft-deleting items, web search grounding, computation, or history is needed.
2. Use file_search to inspect, search, or read full contents of uploaded files, documents, images, and attached code.
3. Use user_knowledge_graph_search, user_knowledge_graph_write, and user_knowledge_graph_delete for USER personal preferences, user identity, workflows, personal tools, and user projects. (Writing/deleting here automatically synchronizes user.md).
4. Use knowledge_search, knowledge_graph_write, and knowledge_graph_delete for general world knowledge, domain concepts, external frameworks, and shared project knowledge.
5. Use soft-deletion (isActive = false) via delete tools when data becomes outdated.
6. Ground responses in user preferences, workflows, constraints outlined in the User Personalization Profile (user.md), and attached multimodal files.
7. Synthesize all reasoning and tool results into a clear, helpful final response.`;

    // 4. Calculate Dynamic Context Budget (Target total input <= 16,000 tokens)
    const systemPromptTokens = estimateTokens(fullSystemInstruction);
    const toolsTokens = estimateTokens(tools);
    const availableMessageBudget = Math.max(
      800,
      MAX_INPUT_TOKEN_LIMIT - systemPromptTokens - toolsTokens - SAFETY_BUFFER_TOKENS
    );

    // Prepare contents by dynamically adding messages until availableMessageBudget is filled
    let currentContents = extractChatByTokenLimit(messages, availableMessageBudget);
    const contentsTokens = estimateTokens(currentContents);
    const totalEstimatedInputTokens = systemPromptTokens + toolsTokens + contentsTokens;

    let accumulatedRawThinking = "";
    let accumulatedAnswer = "";
    const reasoningBlocks = [];
    let currentThoughtBlock = null;
    const executedToolCalls = [];
    const activeCodeCalls = new Map();
    const searchQueriesTracked = new Set();

    const maxToolTurns = 6;
    let turnCount = 0;

    console.group(`%c[ChatGemma][Stream Started] Model: ${rawModelName}`, "color: #3b82f6; font-weight: bold;");
    console.log(
      `%c[Context Budget ~${totalEstimatedInputTokens}/${MAX_INPUT_TOKEN_LIMIT} Tokens] System: ~${systemPromptTokens} | Tools: ~${toolsTokens} | Message History: ~${contentsTokens} | Budget Left: ~${availableMessageBudget - contentsTokens}`,
      "color: #06b6d4; font-weight: bold;"
    );
    console.log("%c[System Instruction]", "color: #94a3b8; font-weight: bold;", fullSystemInstruction);
    console.log("%c[Available Tools]", "color: #94a3b8; font-weight: bold;", tools);
    console.log("%c[Input Messages (Dynamic Context Window)]", "color: #94a3b8; font-weight: bold;", currentContents);
    console.groupEnd();

    try {
      while (turnCount < maxToolTurns) {
        turnCount++;

        console.log(`%c[ChatGemma] --- Starting Turn ${turnCount} ---`, "color: #8b5cf6; font-weight: bold;");

        const payload = {
          contents: currentContents,
          tools,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            thinkingConfig: {
              thinkingLevel: thinkingLevel,
            },
          },
        };

        if (toolConfig) {
          payload.toolConfig = toolConfig;
        }

        if (fullSystemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: fullSystemInstruction }],
          };
        }

        console.log(`%c[ChatGemma][Turn ${turnCount} Payload]`, "color: #6366f1;", payload);

        let response;
        try {
          response = await fetchWithRateLimit(
            endpoint,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": cleanKey,
              },
              body: JSON.stringify(payload),
              signal: this.abortController.signal,
            },
            {
              maxRetries: 4,
              model: rawModelName,
              onRateLimitWait,
            }
          );
        } catch (err) {
          if (err.name === "AbortError") {
            console.log("%c[ChatGemma] Generation Aborted.", "color: #f87171;");
            return;
          }
          console.error("%c[ChatGemma][Fetch Error]", "color: #ef4444; font-weight: bold;", err);
          if (onError) onError(err);
          throw err;
        }

        if (!response.ok) {
          let errorDetail = "";
          try {
            const errorJson = await response.json();
            errorDetail = errorJson.error?.message || response.statusText;
          } catch {
            errorDetail = response.statusText;
          }
          const err = new Error(`API Error (${response.status}): ${errorDetail}`);
          console.error(`%c[ChatGemma][API Error ${response.status}]`, "color: #ef4444; font-weight: bold;", errorDetail);
          if (onError) onError(err);
          throw err;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let pendingCustomFunctionCalls = [];
        let turnRawThinking = "";
        let turnAnswerText = "";
        let isThinkingStreaming = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") {
                console.log("%c[ChatGemma][SSE] Stream [DONE]", "color: #64748b;");
                continue;
              }

              try {
                const data = JSON.parse(dataStr);
                const candidate = data.candidates?.[0];
                const parts = candidate?.content?.parts || [];

                // Usage Metadata Log
                if (data.usageMetadata) {
                  console.log("%c[ChatGemma][Usage Metadata]", "color: #64748b;", data.usageMetadata);
                }

                // A. Grounding Metadata (Google Search Grounding Engine)
                if (candidate?.groundingMetadata) {
                  const gm = candidate.groundingMetadata;
                  console.log("%c[ChatGemma][Native Tool: Google Search Grounding Metadata]", "color: #0284c7; font-weight: bold;", gm);

                  const queries = gm.webSearchQueries || [];
                  for (const q of queries) {
                    if (!searchQueriesTracked.has(q)) {
                      searchQueriesTracked.add(q);

                      // If a thought block was open, close it before tool call
                      if (currentThoughtBlock) {
                        currentThoughtBlock.isLive = false;
                        currentThoughtBlock = null;
                      }

                      const searchCall = {
                        type: "tool_call",
                        id: Math.random().toString(36).substring(2, 10),
                        name: "google_search",
                        args: { query: q },
                        response: {
                          query: q,
                          engine: "Google Search (Gemma Native Grounding)",
                          queries: gm.webSearchQueries || [],
                          results: (gm.groundingChunks || []).map((c) => ({
                            title: c.web?.title || "Google Search Result",
                            url: c.web?.uri || "",
                            snippet: `Grounded source for: "${q}"`,
                            source: c.web?.title || "Google Search",
                          })),
                          groundingSupports: gm.groundingSupports || [],
                        },
                        status: "completed",
                      };
                      console.log("%c[ChatGemma][Google Search Grounding Pill]", "color: #0284c7; font-weight: bold;", searchCall);
                      executedToolCalls.push(searchCall);
                      reasoningBlocks.push(searchCall);
                      if (onToolCallResult) onToolCallResult(searchCall);
                      if (onReasoningBlocksUpdate) onReasoningBlocksUpdate([...reasoningBlocks]);
                    }
                  }
                }

                // B. Parts processing
                for (const part of parts) {
                  // 1. Raw Thinking Tokens (from thinkingConfig)
                  if (part.thought || (part.text && part.thought === true)) {
                    const tChunk = part.text || "";
                    turnRawThinking += tChunk;
                    accumulatedRawThinking += tChunk;

                    if (!currentThoughtBlock) {
                      currentThoughtBlock = {
                        type: "thought",
                        id: Math.random().toString(36).substring(2, 10),
                        content: tChunk,
                        isLive: true,
                        turn: turnCount,
                      };
                      reasoningBlocks.push(currentThoughtBlock);
                    } else {
                      currentThoughtBlock.content += tChunk;
                    }

                    if (!isThinkingStreaming) {
                      isThinkingStreaming = true;
                      console.log(
                        "%c[ChatGemma] Original Internal Thinking Stream (from Model Engine / thinkingConfig):",
                        "color: #a855f7; font-weight: bold; background: rgba(168,85,247,0.15); padding: 3px 8px; border-radius: 4px;"
                      );
                    }

                    console.log("%c[Original Thought] %c" + tChunk, "color: #a855f7; font-weight: 600;", "color: #d8b4fe; font-family: monospace;");
                    if (onThought) onThought(tChunk, accumulatedRawThinking);
                    if (onReasoningBlocksUpdate) onReasoningBlocksUpdate([...reasoningBlocks]);
                  } else {
                    if (currentThoughtBlock && currentThoughtBlock.isLive) {
                      currentThoughtBlock.isLive = false;
                      currentThoughtBlock = null;
                      if (onReasoningBlocksUpdate) onReasoningBlocksUpdate([...reasoningBlocks]);
                    }
                    if (isThinkingStreaming) {
                      isThinkingStreaming = false;
                      console.log(
                        "%c[ChatGemma] Original Internal Thinking Stream Complete",
                        "color: #a855f7; font-weight: bold; background: rgba(168,85,247,0.15); padding: 3px 8px; border-radius: 4px;"
                      );
                    }
                  }

                  // 2. Server-Side Executable Code (Native Code Execution)
                  if (part.executableCode) {
                    if (currentThoughtBlock) {
                      currentThoughtBlock.isLive = false;
                      currentThoughtBlock = null;
                    }
                    const codeObj = part.executableCode;
                    const callId = codeObj.id || Math.random().toString(36).substring(2, 10);
                    const call = {
                      type: "tool_call",
                      id: callId,
                      name: "run_code",
                      args: { code: codeObj.code, language: codeObj.language || "PYTHON" },
                      status: "running",
                    };
                    console.log("%c[ChatGemma][Native Tool: Code Execution Generated]", "color: #2563eb; font-weight: bold;", call);
                    activeCodeCalls.set(callId, call);
                    reasoningBlocks.push(call);
                    if (onToolCallStart) onToolCallStart(call);
                    if (onReasoningBlocksUpdate) onReasoningBlocksUpdate([...reasoningBlocks]);
                  }

                  // 3. Server-Side Code Execution Result
                  if (part.codeExecutionResult) {
                    const resObj = part.codeExecutionResult;
                    const callId = resObj.id || Array.from(activeCodeCalls.keys()).pop();
                    const existing = activeCodeCalls.get(callId) || {
                      id: callId,
                      name: "run_code",
                      args: {},
                    };
                    const completedCall = {
                      ...existing,
                      type: "tool_call",
                      response: {
                        stdout: resObj.output || "",
                        outcome: resObj.outcome || "OUTCOME_OK",
                      },
                      status: resObj.outcome === "OUTCOME_OK" ? "completed" : "error",
                    };
                    console.log("%c[ChatGemma][Native Tool: Code Execution Result]", "color: #059669; font-weight: bold;", completedCall);
                    executedToolCalls.push(completedCall);

                    const idx = reasoningBlocks.findIndex((b) => b.id === callId);
                    if (idx >= 0) {
                      reasoningBlocks[idx] = completedCall;
                    } else {
                      reasoningBlocks.push(completedCall);
                    }

                    if (onToolCallResult) onToolCallResult(completedCall);
                    if (onReasoningBlocksUpdate) onReasoningBlocksUpdate([...reasoningBlocks]);
                  }

                  // 4. Custom Function / Tool Calls (e.g. grep, knowledge_search, user_knowledge_graph_*)
                  if (part.functionCall) {
                    if (currentThoughtBlock) {
                      currentThoughtBlock.isLive = false;
                      currentThoughtBlock = null;
                    }
                    const fnCall = part.functionCall;
                    const callObj = {
                      type: "tool_call",
                      id: Math.random().toString(36).substring(2, 10),
                      name: fnCall.name,
                      args: fnCall.args || {},
                      status: "running",
                    };
                    console.log("%c[ChatGemma][Custom Tool Call Requested by Model]", "color: #d97706; font-weight: bold;", callObj);
                    pendingCustomFunctionCalls.push(callObj);
                    reasoningBlocks.push(callObj);
                    if (onToolCallStart) onToolCallStart(callObj);
                    if (onReasoningBlocksUpdate) onReasoningBlocksUpdate([...reasoningBlocks]);
                  }

                  // 5. Regular Text / Answer Tokens
                  if (part.text && !part.thought) {
                    if (currentThoughtBlock) {
                      currentThoughtBlock.isLive = false;
                      currentThoughtBlock = null;
                    }
                    turnAnswerText += part.text;
                    accumulatedAnswer += part.text;
                    console.log("%c[ChatGemma][Answer Token]", "color: #475569;", part.text);
                    if (onAnswer) onAnswer(part.text, accumulatedAnswer);
                  }
                }
              } catch (jsonErr) {
                console.warn("[ChatGemma] Failed to parse SSE line:", jsonErr, dataStr);
              }
            }
          }
        }

        if (currentThoughtBlock) {
          currentThoughtBlock.isLive = false;
          currentThoughtBlock = null;
          if (onReasoningBlocksUpdate) onReasoningBlocksUpdate([...reasoningBlocks]);
        }

        if (isThinkingStreaming) {
          isThinkingStreaming = false;
          console.log(
            "%c[ChatGemma] Original Thinking Stream Complete",
            "color: #a855f7; font-weight: bold; background: rgba(168,85,247,0.12); padding: 2px 6px; border-radius: 4px;"
          );
        }

        // If no custom function calls were requested in this turn, we are finished!
        if (pendingCustomFunctionCalls.length === 0) {
          console.log(`%c[ChatGemma] No further function calls requested. Turn loop finished at Turn ${turnCount}.`, "color: #16a34a; font-weight: bold;");
          break;
        }

        // Execute all custom function calls
        const currentTurnModelParts = [];
        const currentTurnFunctionParts = [];

        for (const call of pendingCustomFunctionCalls) {
          console.log(`%c[ChatGemma][Executing Custom Tool: ${call.name}]`, "color: #d97706; font-weight: bold;", call.args);

          const toolResponse = await toolRegistry.execute(call.name, call.args, executionContext);

          const completedCall = {
            ...call,
            type: "tool_call",
            response: toolResponse,
            status: toolResponse?.error ? "error" : "completed",
          };

          console.log(`%c[ChatGemma][Custom Tool ${call.name} Execution Result]`, "color: #059669; font-weight: bold;", completedCall);

          executedToolCalls.push(completedCall);

          const idx = reasoningBlocks.findIndex((b) => b.id === call.id);
          if (idx >= 0) {
            reasoningBlocks[idx] = completedCall;
          } else {
            reasoningBlocks.push(completedCall);
          }

          if (onToolCallResult) {
            onToolCallResult(completedCall);
          }
          if (onReasoningBlocksUpdate) {
            onReasoningBlocksUpdate([...reasoningBlocks]);
          }

          currentTurnModelParts.push({
            functionCall: {
              name: call.name,
              args: call.args,
            },
          });

          currentTurnFunctionParts.push({
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: toolResponse,
                },
              },
            ],
          });
        }

        // Append custom tool round-trip to contents for the next model turn
        currentContents.push({
          role: "model",
          parts: currentTurnModelParts,
        });

        for (const fnPart of currentTurnFunctionParts) {
          currentContents.push(fnPart);
        }

        // Keep multi-turn context within the allocated token budget
        currentContents = pruneTurnsToTokenLimit(currentContents, availableMessageBudget);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("%c[ChatGemma][Generation Error]", "color: #ef4444; font-weight: bold;", err);
        if (onError) onError(err);
        throw err;
      }
    } finally {
      this.abortController = null;

      if (currentThoughtBlock) {
        currentThoughtBlock.isLive = false;
        currentThoughtBlock = null;
      }

      console.group("%c[ChatGemma][Generation Completed Successfully]", "color: #16a34a; font-weight: bold;");
      if (accumulatedRawThinking) {
        console.log("%c[Original Internal Thinking]", "color: #a855f7; font-weight: bold;", accumulatedRawThinking);
      }
      console.log("%c[Chronological Reasoning Blocks]", "color: #9333ea; font-weight: bold;", reasoningBlocks);
      console.log("%c[All Executed Tool Calls in Sequence]", "color: #3b82f6; font-weight: bold;", executedToolCalls);
      console.log("%c[Final Answer]", "color: #10b981; font-weight: bold;", accumulatedAnswer);
      console.groupEnd();

      if (onComplete) {
        onComplete({
          thought: accumulatedRawThinking,
          answer: accumulatedAnswer,
          toolCalls: executedToolCalls,
          reasoningBlocks: reasoningBlocks,
        });
      }
    }

    return {
      thought: accumulatedRawThinking,
      answer: accumulatedAnswer,
      toolCalls: executedToolCalls,
      reasoningBlocks: reasoningBlocks,
    };
  }
}
