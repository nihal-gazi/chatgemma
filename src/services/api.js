/**
 * API Service for Gemma / Gemini models with Thinking Level Support,
 * Function Calling / Tool Execution, and K_history truncation.
 */

import { CONFIG } from "../config/config.js";
import { GEMMA_FUNCTION_DECLARATIONS, executeTool } from "./toolRegistry.js";

export class GemmaApiService {
  constructor(apiKey, modelId, systemPrompt, options = {}) {
    this.apiKey = apiKey || CONFIG.defaultApiKey;
    this.modelConfig = this._resolveModelConfig(modelId || CONFIG.defaultModelId);
    this.systemPrompt = systemPrompt || CONFIG.defaultSystemPrompt;
    this.kHistory = options.kHistory || 100;
    this.abortController = null;
  }

  _resolveModelConfig(modelId) {
    const found = CONFIG.models.find((m) => m.id === modelId);
    return found || CONFIG.models[0];
  }

  updateConfig({ apiKey, modelId, systemPrompt, kHistory }) {
    if (apiKey !== undefined) this.apiKey = apiKey;
    if (modelId !== undefined) this.modelConfig = this._resolveModelConfig(modelId);
    if (systemPrompt !== undefined) this.systemPrompt = systemPrompt;
    if (kHistory !== undefined) this.kHistory = kHistory;
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Formats messages into Google GenAI content payload format.
   */
  _formatContents(messages) {
    // Truncate to top K_history messages
    const truncated = messages.slice(-this.kHistory);

    return truncated.map((msg) => {
      if (msg.role === "function") {
        return {
          role: "user",
          parts: [{
            functionResponse: {
              name: msg.name,
              response: { result: msg.content },
            },
          }],
        };
      }

      if (msg.functionCall) {
        return {
          role: "model",
          parts: [{
            functionCall: {
              name: msg.functionCall.name,
              args: msg.functionCall.args,
            },
          }],
        };
      }

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content || "" }],
      };
    });
  }

  /**
   * Stream generate content with function calling and curated thought streaming.
   *
   * @param {Array} messages - Chat message history
   * @param {Object} callbacks - { onThought, onAnswer, onToolExecution, onComplete, onError }
   * @param {Object} toolContext - Context for tool execution (knowledge graphs, scratchpad, sessions)
   */
  async streamChat(
    messages,
    { onThought, onAnswer, onToolExecution, onComplete, onError },
    toolContext = {}
  ) {
    this.cancelRequest();
    this.abortController = new AbortController();

    if (!this.apiKey || !this.apiKey.trim()) {
      const err = new Error("Gemini API Key is missing. Please add it in Settings.");
      if (onError) onError(err);
      throw err;
    }

    let conversationContents = this._formatContents(messages);

    // Scratchpad context injection
    let effectiveSystemPrompt = this.systemPrompt || "";
    if (toolContext.scratchPad && toolContext.scratchPad.trim()) {
      const scratchPadHeader = `\n\n[Persistent Scratch Pad Context]:\n${toolContext.scratchPad.trim()}`;
      effectiveSystemPrompt += scratchPadHeader;
    }

    let accumulatedAnswer = "";
    let accumulatedThought = "";
    const executedTools = [];
    const maxToolIterations = 6;
    let iteration = 0;

    try {
      while (iteration < maxToolIterations) {
        iteration++;

        const rawModelName = this.modelConfig.model;
        const thinkingLevel = this.modelConfig.thinkingLevel || "HIGH";
        const endpoint = `${CONFIG.apiBaseUrl}/${rawModelName}:streamGenerateContent?key=${this.apiKey.trim()}&alt=sse`;

        const payload = {
          contents: conversationContents,
          tools: [{ functionDeclarations: GEMMA_FUNCTION_DECLARATIONS }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            thinkingConfig: {
              thinkingLevel: thinkingLevel,
            },
          },
        };

        if (effectiveSystemPrompt && effectiveSystemPrompt.trim()) {
          payload.systemInstruction = {
            parts: [{ text: effectiveSystemPrompt.trim() }],
          };
        }

        let response;
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: this.abortController.signal,
          });
        } catch (err) {
          if (err.name === "AbortError") return;
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
          if (onError) onError(err);
          throw err;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let pendingFunctionCall = null;
        let iterationAnswer = "";

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
              if (dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr);
                const parts = data.candidates?.[0]?.content?.parts || [];

                for (const part of parts) {
                  // 1. Function Call detected
                  if (part.functionCall) {
                    pendingFunctionCall = part.functionCall;
                  }

                  // 2. Text tokens
                  if (part.text) {
                    iterationAnswer += part.text;
                    accumulatedAnswer += part.text;
                    if (onAnswer) onAnswer(part.text, accumulatedAnswer);
                  }
                }
              } catch (jsonErr) {
                console.warn("Failed to parse SSE line:", jsonErr, dataStr);
              }
            }
          }
        }

        // If a function call was made
        if (pendingFunctionCall) {
          const { name, args } = pendingFunctionCall;
          const startTime = performance.now();

          // Handle show_thought specifically
          if (name === "show_thought") {
            const thoughtText = args?.thought || "";
            accumulatedThought += (accumulatedThought ? "\n" : "") + thoughtText;
            if (onThought) onThought(thoughtText, accumulatedThought);

            // Append model call and response to conversation
            conversationContents.push({
              role: "model",
              parts: [{ functionCall: { name, args } }],
            });
            conversationContents.push({
              role: "user",
              parts: [{
                functionResponse: {
                  name,
                  response: { result: { status: "displayed" } },
                },
              }],
            });

            // Continue loop to let model produce answer or next thought
            continue;
          }

          // Execute other tools
          const toolResult = await executeTool(name, args, {
            ...toolContext,
            onShowThought: (thought) => {
              accumulatedThought += (accumulatedThought ? "\n" : "") + thought;
              if (onThought) onThought(thought, accumulatedThought);
            },
          });

          const durationMs = Math.round(performance.now() - startTime);

          const executionRecord = {
            toolName: name,
            args,
            result: toolResult,
            status: toolResult?.error ? "error" : "success",
            durationMs,
            timestamp: Date.now(),
          };

          executedTools.push(executionRecord);
          if (onToolExecution) onToolExecution(executionRecord);

          // Append to conversation
          conversationContents.push({
            role: "model",
            parts: [{ functionCall: { name, args } }],
          });
          conversationContents.push({
            role: "user",
            parts: [{
              functionResponse: {
                name,
                response: { result: toolResult },
              },
            }],
          });

          // Continue generation loop with tool results
          continue;
        }

        // No more function calls, generation finished
        break;
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        if (onError) onError(err);
        throw err;
      }
    } finally {
      this.abortController = null;
      if (onComplete) {
        onComplete({
          thought: accumulatedThought,
          answer: accumulatedAnswer,
          toolExecutions: executedTools,
        });
      }
    }

    return {
      thought: accumulatedThought,
      answer: accumulatedAnswer,
      toolExecutions: executedTools,
    };
  }
}
