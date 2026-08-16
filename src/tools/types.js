/**
 * Tool definitions & Schema helper types for ChatGemma tool calling.
 */

/**
 * Standard Tool Definition Interface:
 * @typedef {Object} ToolDefinition
 * @property {string} name - Unique identifier of the tool
 * @property {string} displayName - Human-readable label
 * @property {string} description - Description shown to the model
 * @property {string} iconName - Icon identifier (Globe, Code, FileSearch, Sparkles)
 * @property {Object} parameters - JSON Schema parameters object
 * @property {Function} execute - Async execution function: (args, context) => Promise<Object>
 * @property {Function} [renderSummary] - (args) => string summary for pill header
 */

/**
 * Helper to build Google GenAI Function Declaration from a tool definition.
 */
export function buildFunctionDeclaration(tool) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters || {
      type: "OBJECT",
      properties: {},
    },
  };
}
