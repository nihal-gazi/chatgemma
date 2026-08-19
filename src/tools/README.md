# ChatGemma Modular Tool System

Welcome to the **ChatGemma Tool System**. This architecture makes creating, registering, executing, and visualizing custom AI tools completely modular, declarative, and developer-friendly.

---

## 🛠️ Core Built-In Tools

| Tool Name | Display Name | Purpose |
| :--- | :--- | :--- |
| **`user_knowledge_graph_search`** | User KG Search | Searches dedicated User Knowledge Graph for personal facts, preferences, background, and workflows. |
| **`user_knowledge_graph_write`** | User KG Write | Ingests user-specific entities and directed semantic triples; automatically syncs `user.md` via background LLM. |
| **`user_knowledge_graph_delete`** | User KG Delete | Soft-deletes user facts (`isActive = false`) and automatically syncs `user.md` via background LLM. |
| **`knowledge_search`** | Knowledge Search | Performs multi-hop GraphRAG search over the general knowledge graph with Schema.org type and predicate filtering. |
| **`knowledge_graph_write`** | Knowledge Graph Write | Writes or updates general factual entities and directed semantic relationships. |
| **`knowledge_graph_delete`** | Knowledge Graph Delete | Soft-deletes general factual entities and relationships (`isActive = false`). |
| **`grep`** | History Grep | Executes regex and pattern matching across conversation message history. |

---

## 🚀 Adding a Custom Tool in 3 Steps

### Step 1: Create your tool in `src/tools/implementations/my_tool.js`

```javascript
export const myTool = {
  name: "my_custom_tool",               // Unique name invoked by the model
  displayName: "My Custom Tool",         // Label rendered on the UI pill badge
  iconName: "Sparkles",                  // Icon: Globe, Terminal, Code, FileSearch, Share2, FileText, Sparkles
  description: "Detailed description guiding the AI on when and how to invoke this tool.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The search query or input argument.",
      },
      count: {
        type: "INTEGER",
        description: "Optional number of results to return (default: 5).",
      },
    },
    required: ["query"],
  },
  renderSummary: (args) => `MyTool: "${args.query || ""}"`,

  async execute(args, context = {}) {
    // Access application context (activeSession, sessions, knowledgeGraph, userKnowledgeGraph, settings)
    const query = args.query || "";
    const count = args.count || 5;

    // Check permission if applicable
    if (context?.settings?.allowKnowledgeGraphReadWrite === false) {
      return { success: false, error: "Permission denied in Settings." };
    }

    // Perform tool logic
    const results = [`Result 1 for ${query}`, `Result 2 for ${query}`].slice(0, count);

    return {
      success: true,
      query,
      results,
      count: results.length,
    };
  },
};
```

### Step 2: Register it in `src/tools/index.js`

```javascript
import { toolRegistry } from "./registry.js";
import { myTool } from "./implementations/my_tool.js";

// Register tool
toolRegistry.register(myTool);

export { myTool };
```

### Step 3: Done!
The tool is now automatically:
1. Converted to Google GenAI OpenAPI Function Declaration schema (`tools: [{ functionDeclarations }]`).
2. Passed to Gemma during chat sessions.
3. Automatically executed when the model generates a function call.
4. Rendered in real-time as a collapsible thoughtbox pill badge with structured results in the UI.

---

## 🧩 Execution Context

Every tool `execute(args, context)` receives the current runtime context:

```javascript
{
  activeSession,               // Currently active chat session object
  sessions,                    // Array of all user chat sessions
  knowledgeGraph,              // General KnowledgeGraphService singleton
  userKnowledgeGraph,          // User KnowledgeGraphService singleton
  personalization,             // PersonalizationService singleton (user.md)
  userProfileMarkdown,         // Active user.md text
  settings,                    // App settings (apiKey, modelId, allowKnowledgeGraphReadWrite, etc.)
}
```

---

## 📄 License

MIT License. See the main repository LICENSE file for details.
