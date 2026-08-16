/**
 * ChatGemma Tool System Main Entry Point
 * Registers custom function calling tools and exports tool registry instance.
 * (Note: Web Search and Code Execution are handled via Gemma's native Google Search and Code Execution engines).
 */

import { toolRegistry } from "./registry.js";
import { showThoughtTool } from "./implementations/show_thought.js";
import { grepTool } from "./implementations/grep.js";

// Register Custom Function Calling Tools
toolRegistry.register(showThoughtTool);
toolRegistry.register(grepTool);

export { toolRegistry };
export { showThoughtTool, grepTool };
