/**
 * API Service for Gemma / Gemini models with Native Google Search, Server-Side Code Execution,
 * Custom Function Calling Tools, and Comprehensive Browser Console Logging.
 */

import { CONFIG } from "../config/config.js";
import { toolRegistry } from "../tools/index.js";

const K_HISTORY_LIMIT = 100;

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
   * Formats messages into Google GenAI content payload format.
   * Caps to top K_history = 100 messages.
   */
  _formatContents(messages) {
    const windowedMessages = messages.slice(-K_HISTORY_LIMIT);
    const formatted = [];

    for (const msg of windowedMessages) {
      if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        // Model turn that invoked function calls
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

        formatted.push({
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
            formatted.push({
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
      } else {
        formatted.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content || "" }],
        });
      }
    }
    return formatted;
  }

  /**
   * Stream generate content with native Code Execution, Google Search Grounding,
   * custom Function Calling, and full console logging.
   *
   * @param {Array} messages - Chat message history
   * @param {Object} callbacks - { onThought, onAnswer, onToolCallStart, onToolCallResult, onReasoningBlocksUpdate, onComplete, onError }
   * @param {Object} executionContext - Context passed to custom tools (e.g. sessions, activeSession)
   */
  async streamChat(
    messages,
    { onThought, onAnswer, onToolCallStart, onToolCallResult, onReasoningBlocksUpdate, onComplete, onError },
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
1. Use available tools (knowledge_search, knowledge_graph_write, knowledge_graph_delete, Google Search, Code Execution, Grep) when querying learned knowledge, saving facts, soft-deleting outdated items, web search grounding, computation, or history is needed.
2. Use knowledge_search to explore interconnected entities, facts, projects, concepts, and relationships in the Knowledge Graph.
3. Use knowledge_graph_write to record new entities or semantic triples into the graph when new knowledge, user projects, or facts are established.
4. Use knowledge_graph_delete to soft-delete outdated or invalid entities/relationships (marks isActive = false).
5. Respect user preferences, workflows, and constraints outlined in the User Personalization Profile.
6. Synthesize all reasoning and tool results into a clear, helpful final response.`;

    // Prepare contents
    let currentContents = this._formatContents(messages);

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
    console.log("%c[System Instruction]", "color: #94a3b8; font-weight: bold;", fullSystemInstruction);
    console.log("%c[Available Tools]", "color: #94a3b8; font-weight: bold;", tools);
    console.log("%c[Input Messages History (Last 100)]", "color: #94a3b8; font-weight: bold;", currentContents);
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
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": cleanKey,
            },
            body: JSON.stringify(payload),
            signal: this.abortController.signal,
          });
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

                  // 4. Custom Function / Tool Calls (e.g. grep)
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
