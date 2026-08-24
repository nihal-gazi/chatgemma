/**
 * ChatGemma Tool System Main Entry Point
 * Registers custom function calling tools and exports tool registry instance.
 * (Note: Web Search and Code Execution are handled via Gemma's native Google Search and Code Execution engines;
 *  Thoughts are handled via Gemma's native thinking engine).
 */

import { toolRegistry } from "./registry.js";
import { grepTool } from "./implementations/grep.js";
import { fileSearchTool } from "./implementations/file_search.js";
import { brainstormIdeaTool } from "./implementations/brainstorm_idea.js";
import { knowledgeGraphNodeSearchTool } from "./implementations/knowledge_graph_node_search.js";
import { knowledgeSearchTool } from "./implementations/knowledge_search.js";
import { knowledgeGraphWriteTool } from "./implementations/knowledge_graph_write.js";
import { knowledgeGraphDeleteTool } from "./implementations/knowledge_graph_delete.js";
import { userKnowledgeGraphSearchTool } from "./implementations/user_knowledge_graph_search.js";
import { userKnowledgeGraphWriteTool } from "./implementations/user_knowledge_graph_write.js";
import { userKnowledgeGraphDeleteTool } from "./implementations/user_knowledge_graph_delete.js";

import { sampleCodeQueryTool } from "./implementations/sample_code_query.js";
import { getCodeSampleTool } from "./implementations/get_code_sample.js";

// Register Custom Function Calling Tools
toolRegistry.register(grepTool);
toolRegistry.register(fileSearchTool);
toolRegistry.register(brainstormIdeaTool);
toolRegistry.register(knowledgeGraphNodeSearchTool);
toolRegistry.register(knowledgeSearchTool);
toolRegistry.register(knowledgeGraphWriteTool);
toolRegistry.register(knowledgeGraphDeleteTool);
toolRegistry.register(userKnowledgeGraphSearchTool);
toolRegistry.register(userKnowledgeGraphWriteTool);
toolRegistry.register(userKnowledgeGraphDeleteTool);
toolRegistry.register(sampleCodeQueryTool);
toolRegistry.register(getCodeSampleTool);

export { toolRegistry };
export {
  grepTool,
  fileSearchTool,
  brainstormIdeaTool,
  knowledgeGraphNodeSearchTool,
  knowledgeSearchTool,
  knowledgeGraphWriteTool,
  knowledgeGraphDeleteTool,
  userKnowledgeGraphSearchTool,
  userKnowledgeGraphWriteTool,
  userKnowledgeGraphDeleteTool,
  sampleCodeQueryTool,
  getCodeSampleTool,
};


