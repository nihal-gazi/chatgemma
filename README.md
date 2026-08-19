# ChatGemma Web Interface (React + Vite)

A modern, production-grade **React + Vite** web application for **ChatGemma** powered by Google's Gemma 4 models (`gemma-4-31b-it`, `gemma-4-26b-a4b-it`). It features Gemini ambient dark mode, real-time thought stream separation, dual GraphRAG Knowledge Graphs, automatic LLM personalization (`user.md`), modular tool execution, intelligent rate limiting, and `userdat.synapse` state portability.

---

## 🚀 Key Features

### 1. Gemini Dark Theme Interface
- **Ambient Glow Empty State:** Welcoming hero state with quick prompt suggestions and subtle animated glows.
- **Thought Process Accordion (`ThinkingBlock.jsx`):** Collapsible panel displaying model reasoning tokens and internal thought steps in real-time, isolated from final answers.
- **Dynamic Tool Call Pills (`ToolCallPill.jsx`):** Collapsible pill badges showing tool inputs, execution status, and structured outputs for Google Search grounding, Python code execution, GraphRAG queries, and user memory operations.
- **Floating Pill Prompt Bar (`PromptInputBar.jsx`):** Compact input bar with model selector, thinking preset switcher (`HIGH` vs `LOW`), attachment support, and voice trigger.

### 2. Dual Knowledge Graph Architecture & CosmosGL Visualizer (GraphRAG)
- **General Knowledge Graph (`knowledgeGraphInstance`):** Persistent graph storing domain facts, entities, and directed semantic relationships with BFS multi-hop path traversal.
- **User Knowledge Graph (`userKnowledgeGraphInstance`):** Dedicated graph storing **ONLY** user-specific preferences, identity facts, workflows, and projects.
- **Interactive CosmosGL Visualizer (`GraphVisualizerModal.jsx`):** High-performance GPU-accelerated WebGL graph interface with 2D/3D space dimensions, real-time node search, category filtering, interactive zoom/fit, and a responsive node inspector drawer (optimized for desktop and mobile).
- **Soft-Delete Invariant:** Nodes/triples are never permanently destroyed; `isActive` is set to `false`, preserving historical data without polluting active retrieval.

### 3. Continuous LLM Personalization (`user.md`)
- Maintains an internal user profile (`user.md`) injected into every model prompt.
- **Auto-Sync:** Modifying the User Knowledge Graph immediately triggers Gemma 31B to distill active user facts into `user.md`.
- **Recursive Token Compaction:** Automatically compacts `user.md` using Gemma when the profile exceeds the configurable token limit (default: 5,000 tokens).

### 4. Modular Function Calling Tools
- **`user_knowledge_graph_search`**: Search user preferences, background, and workflows.
- **`user_knowledge_graph_write`**: Record user entities and relationships (auto-syncs `user.md`).
- **`user_knowledge_graph_delete`**: Soft-delete user entities and relationships (auto-syncs `user.md`).
- **`knowledge_search`**: Multi-hop GraphRAG search across general knowledge.
- **`knowledge_graph_write` / `knowledge_graph_delete`**: Write or soft-delete general knowledge items.
- **`grep`**: Regex pattern search over conversation history.
- **Native Grounding & Code Execution**: Google Search and Python code execution.

### 5. Intelligent API Rate Limiter (`ApiRateLimiter`)
- **Call History Logging:** Rolling call history tracking requests per minute.
- **Automatic 429 Pause & Resume:** Automatically extracts exact retry durations from API error messages (e.g., `Please retry in 17.34s`), enters an abortable cooldown pause, and automatically resumes generation.
- **Micro-Burst Spacing:** Enforces minimum spacing ($800\text{ms}$) between consecutive calls.

### 6. State Persistence & Cloud Sync
- **`userdat.synapse` Export & Import:** Exports complete application state (all chat sessions, settings, general knowledge graph, user knowledge graph, and `user.md`) into a single file.
- **Google Firebase Auth & Firestore:** Optional cloud synchronization across devices.
- **LocalStorage Backup:** Caches state locally in browser storage for instant reload.

---

## 🛠️ Project Structure

```
chatgemma_web/
├── index.html                      # HTML entry point with Google Sans fonts
├── package.json                    # Node dependencies
├── vite.config.js                  # Vite configuration
├── public/
│   └── favicon.svg                 # Gemini sparkle logo
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
    │   ├── knowledgeGraph.js       # KnowledgeGraphService (general and user KG singletons)
    │   ├── personalization.js      # PersonalizationService (user.md & recursive compaction)
    │   ├── storage.js              # SynapseStorageService (userdat.synapse export/import)
    │   └── firestore.js            # Firestore cloud sync service
    ├── tools/
    │   ├── README.md               # Tool system architecture and creation guide
    │   ├── index.js                # Tool registry entry point
    │   ├── registry.js             # ToolRegistry class
    │   └── implementations/        # Tool implementations
    │       ├── grep.js
    │       ├── knowledge_search.js
    │       ├── knowledge_graph_write.js
    │       ├── knowledge_graph_delete.js
    │       ├── user_knowledge_graph_search.js
    │       ├── user_knowledge_graph_write.js
    │       └── user_knowledge_graph_delete.js
    ├── components/
    │   ├── Sidebar/                # BrandHeader, RecentsList, UserProfile, NavigationItems
    │   ├── Chat/                   # ChatArea, EmptyState, MessageList, ThinkingBlock, ToolCallPill
    │   ├── Input/                  # PromptInputBar, ModelSelector
    │   ├── Modals/                 # SettingsModal, SearchModal, EditMessageModal
    │   └── Icons/                  # Lucide icon wrappers
    └── styles/
        ├── index.css               # Design tokens, themes, and CSS variables
        └── App.css                 # Component styles, animations, and modal layouts
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
You can optionally create a `.env` file in `chatgemma_web/`:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
*(Alternatively, enter your API key directly in the web UI under **Settings $\rightarrow$ API & Model**).*

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```
The compiled production bundle will be generated in `dist/`.

---

## 📄 License

MIT License. See the main repository LICENSE file for details.
