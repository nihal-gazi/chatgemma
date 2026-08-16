# ChatGemma Modular Tool System

Welcome to the ChatGemma Tool System. This architecture makes adding, customizing, or removing AI tools simple, fully modular, and open-source friendly.

---

## Adding a New Tool in 3 Steps

### Step 1: Create your tool in `src/tools/implementations/my_tool.js`

```javascript
export const myTool = {
  name: "my_tool",                        // Unique name called by Gemini
  displayName: "My Custom Tool",          // Display title for UI pill
  iconName: "Sparkles",                   // Icon: Globe, Terminal, Code, FileSearch, Sparkles
  description: "Describe what your tool does so the AI knows when to use it.",
  parameters: {
    type: "OBJECT",
    properties: {
      inputParam: {
        type: "STRING",
        description: "Description of the input parameter.",
      },
    },
    required: ["inputParam"],
  },
  renderSummary: (args) => `MyTool: ${args.inputParam || ""}`,

  async execute(args, context) {
    // Perform your logic (fetch APIs, browser actions, data math)
    const result = `Processed: ${args.inputParam}`;
    
    return {
      success: true,
      output: result,
    };
  },
};
```

### Step 2: Register it in `src/tools/index.js`

```javascript
import { myTool } from "./implementations/my_tool.js";

toolRegistry.register(myTool);
```

### Step 3: Registration Complete
The tool will automatically be:
- Declared in Google GenAI API function calls schema (`tools: [{ functionDeclarations }]`).
- Executed when Gemini calls it during a chat session.
- Rendered in a collapsible Thoughtbox-style pill in the UI showing the query and response.

---

## Core Custom Tools

1. **`grep`**: Regex and pattern search across conversation history.
