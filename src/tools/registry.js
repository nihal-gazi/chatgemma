/**
 * Central Tool Registry for ChatGemma
 * Handles dynamic registration, declaration generation, and tool execution.
 */

import { buildFunctionDeclaration } from "./types.js";

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a new tool definition.
   * @param {Object} tool - Tool definition object
   */
  register(tool) {
    if (!tool || !tool.name) {
      throw new Error("Tool must have a unique 'name' property.");
    }
    if (typeof tool.execute !== "function") {
      throw new Error(`Tool '${tool.name}' must implement an 'execute' function.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool by name.
   * @param {string} name
   */
  unregister(name) {
    this.tools.delete(name);
  }

  /**
   * Retrieve a tool by name.
   * @param {string} name
   * @returns {Object|undefined}
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools as an array.
   * @returns {Array<Object>}
   */
  getAll() {
    return Array.from(this.tools.values());
  }

  /**
   * Generate Google GenAI Function Declarations array.
   * @returns {Array<Object>}
   */
  getFunctionDeclarations() {
    return this.getAll().map((tool) => buildFunctionDeclaration(tool));
  }

  /**
   * Execute a tool by name with arguments and context.
   * @param {string} name - Tool name
   * @param {Object} args - Input parameters
   * @param {Object} context - Execution context (e.g. activeSession, sessions, onShowThought)
   * @returns {Promise<Object>} Execution result object
   */
  async execute(name, args = {}, context = {}) {
    const tool = this.get(name);
    if (!tool) {
      return {
        error: `Tool '${name}' not found in registry.`,
      };
    }

    try {
      const result = await tool.execute(args, context);
      return result;
    } catch (err) {
      console.error(`[ToolRegistry] Error executing tool '${name}':`, err);
      return {
        error: `Execution failed: ${err.message || String(err)}`,
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
