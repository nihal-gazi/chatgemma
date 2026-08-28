# ChatGemma Web Interface (React + Vite)

A modern, production-grade **React + Vite** web application for **ChatGemma** powered by Google's Gemma 4 models (`gemma-4-31b-it`, `gemma-4-26b-a4b-it`). It features Gemini-inspired ambient dark mode, real-time thought stream separation, dual GraphRAG Knowledge Graphs, automatic LLM personalization (`user.md`), modular tool execution, Synapser boilerplate retrieval, intelligent rate limiting, and **IndexedDB** state persistence.

---

## 🚀 Key Features

### 1. Gemini Dark Theme Interface
- **Ambient Glow Empty State:** Welcoming hero state with quick prompt suggestions and subtle animated glows.
- **Thought Process Accordion (`ThinkingBlock.jsx`):** Collapsible panel displaying model reasoning tokens and internal thought steps in real-time, isolated from final answers.
- **Modular Tool Call Visualizers (`src/components/Chat/ToolRenderers/`):** Dedicated GUI cards with syntax-highlighted code viewers, copy buttons, and graph mutation flows for:
  - `BrainstormRenderer.jsx`: Multi-hop path counterfactual mutations & disconnected random pair synthesis.
  - `NodeSearchRenderer.jsx`: MiniLM-style keyword discovery and semantic node grouping.
  - `SynapserRenderer.jsx`: Two-stage semantic code snippet candidate search & boilerplate code viewer.
  - `DefaultToolRenderer.jsx`: Knowledge Graph ingestion/deletion cards, Grep match lists, and formatted JSON output.
- **Floating Pill Prompt Bar (`PromptInputBar.jsx`):** Compact input bar with model selector, thinking preset switcher (`HIGH` vs `LOW`), attachment support, and voice trigger.

### 2. Dual Knowledge Graph Architecture (GraphRAG)
- **General Knowledge Graph (`knowledgeGraphInstance`):** Persistent graph storing 5,600+ domain facts, entities, and directed semantic relationships with BFS multi-hop path traversal.
- **User Knowledge Graph (`userKnowledgeGraphInstance`):** Dedicated graph storing **ONLY** user-specific preferences, identity facts, workflows, and projects.
- **Soft-Delete Invariant:** Nodes/triples are never permanently destroyed; `isActive` is set to `false`, preserving historical data without polluting active retrieval.

### 3. Continuous LLM Personalization (`user.md`)
- Maintains an internal user profile (`user.md`) injected into every model prompt.
- **Auto-Sync:** Modifying the User Knowledge Graph immediately triggers Gemma to distill active user facts into `user.md`.
- **Recursive Token Compaction:** Automatically compacts `user.md` using Gemma when the profile exceeds the configurable token limit (default: 5,000 tokens).

### 4. Modular Function Calling Tools
- **`sample_code_query` & `get_code_sample`**: Two-stage retrieval engine for verified PyTorch & Gradio boilerplate code snippets.
- **`brainstorm_idea`**: Counterfactual GraphRAG brainstorming with randomized predicate mutations and disconnected pair synthesis.
- **`knowledge_graph_node_search`**: Fast top-K keyword node discovery across Knowledge Graphs.
- **`knowledge_search` / `user_knowledge_graph_search`**: Multi-hop GraphRAG search over General and User graphs.
- **`knowledge_graph_write` / `user_knowledge_graph_write`**: Factual entity and relation ingestion.
- **`knowledge_graph_delete` / `user_knowledge_graph_delete`**: Soft-deletes entities/relations (`isActive = false`).
- **`grep`**: Regex pattern search over conversation history.
- **Native Grounding & Code Execution**: Google Search and Python code execution directly via Gemma.

### 5. Persistent IndexedDB Storage Layer (`ChatGemmaDB`)
- **Unlimited Non-Blocking Storage**: Upgraded storage architecture using browser IndexedDB (`synapse_store`), lifting the 5 MB `localStorage` quota ceiling and ensuring complete persistence of multi-turn reasoning traces, tool outputs, and file attachments across page reloads.
- **Hydration Guard & Safe Sync**: Prevents premature mount overwrites and smartly merges incoming cloud sessions based on timestamps.
- **`userdat.synapse` Export & Import**: Single-file export/import of complete state.

---

## 🛠️ Project Structure

```
chatgemma_web/
├── index.html                      # HTML entry point with Google Sans fonts
├── package.json                    # Node dependencies
├── vite.config.js                  # Vite configuration
└── src/
    ├── main.jsx                    # Root React mounting
    ├── App.jsx                     # Top-level layout and modal coordinator
    ├── config/
    │   ├── config.js               # Model options, endpoints, and resolveModelName helper
    │   └── firebase.js             # Firebase initialization & Firestore provider
    ├── context/
    │   ├── AuthContext.jsx         # Authentication & user profile state
    │   └── ChatContext.jsx         # Multi-session state, streaming orchestrator, and storage
    ├── services/
    │   ├── api.js                  # GemmaApiService, ApiRateLimiter, fetchWithRateLimit
    │   ├── storage.js              # SynapseStorageService (IndexedDB + userdat.synapse import/export)
    │   ├── synapser.js             # Semantic search & BM25 snippet retrieval
    │   ├── knowledgeGraph.js       # KnowledgeGraphService (general and user KG singletons)
    │   ├── personalization.js      # PersonalizationService (user.md & recursive compaction)
    │   └── firestore.js            # Firestore cloud sync service
    ├── data/
    │   ├── predicates.js           # Candidate predicate libraries and inversions
    │   ├── synapserSnippets.json   # Verified PyTorch & Gradio boilerplate snippets
    │   └── knowledge/              # Preloaded domain Knowledge Graph datasets
    ├── tools/
    │   ├── registry.js             # ToolRegistry class
    │   ├── index.js                # Aggregator and tool registration
    │   └── implementations/        # Modular tool implementations
    │       ├── brainstorm_idea.js
    │       ├── knowledge_graph_node_search.js
    │       ├── kg_helpers.js       # Shared KG write/delete/search executor
    │       ├── knowledge_graph_write.js
    │       ├── knowledge_graph_delete.js
    │       ├── knowledge_search.js
    │       ├── user_knowledge_graph_write.js
    │       ├── user_knowledge_graph_delete.js
    │       ├── user_knowledge_graph_search.js
    │       ├── sample_code_query.js
    │       ├── get_code_sample.js
    │       └── grep.js
    ├── components/
    │   ├── Chat/
    │   │   ├── ChatArea.jsx
    │   │   ├── MessageList.jsx
    │   │   ├── MessageItem.jsx
    │   │   ├── ThinkingBlock.jsx
    │   │   ├── ToolCallPill.jsx    # Streamlined tool container
    │   │   └── ToolRenderers/      # Modular specialized GUI renderers
    │   │       ├── BrainstormRenderer.jsx
    │   │       ├── NodeSearchRenderer.jsx
    │   │       ├── SynapserRenderer.jsx
    │   │       └── DefaultToolRenderer.jsx
    │   ├── Sidebar/
    │   ├── Input/
    │   └── Modals/
    └── utils/
        ├── prng.js                 # Seeded LCG random generator
        ├── similarity.js           # Character n-gram cosine similarity
        ├── tokens.js               # Token estimation and context budgeting
        └── files.js                # Multimodal file and document parsing
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```
