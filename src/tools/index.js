/**
 * ChatGemma Tool System Main Entry Point
 * Registers custom function calling tools and exports tool registry instance.
 * (Note: Web Search and Code Execution are handled via Gemma's native Google Search and Code Execution engines;
 *  Thoughts are handled via Gemma's native thinking engine).
 */

import { toolRegistry } from "./registry.js";
import { grepTool } from "./implementations/grep.js";
import { knowledgeSearchTool } from "./implementations/knowledge_search.js";
import { knowledgeGraphWriteTool } from "./implementations/knowledge_graph_write.js";
import { knowledgeGraphDeleteTool } from "./implementations/knowledge_graph_delete.js";

// Register Custom Function Calling Tools
toolRegistry.register(grepTool);
toolRegistry.register(knowledgeSearchTool);
toolRegistry.register(knowledgeGraphWriteTool);
toolRegistry.register(knowledgeGraphDeleteTool);

export { toolRegistry };
export { grepTool, knowledgeSearchTool, knowledgeGraphWriteTool, knowledgeGraphDeleteTool };

