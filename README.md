# ChatGemma Web Interface (React + Vite)

A modern, modular **React + Vite** web application for **ChatGemma** featuring Google's Gemini dark theme UI, Google Firebase authentication, thinking level configuration (`HIGH` vs `LOW`), and persistent `userdat.synapse` state storage.

---

## Key Features

1. **Gemini Dark Theme UI Layout:**
   - Left Sidebar with Sparkle logo, "+ New chat", "Search chats", "Recents" session list, and Google user profile card.
   - Ambient glow empty state (`Let's jump in, {name}`).
   - Rounded user chat bubbles and clean full-width assistant response stream.
   - Collapsible **Thought Process** panel separating model reasoning tokens from the final answer in real-time.
   - Floating pill input bar with model selector, mic icon, attachment trigger, and send button.

2. **Reasoning & Thinking Modes:**
   - `gemma-4-31b-it (HIGH)`: Configured with `thinkingLevel: "HIGH"` for deep multi-step reasoning.
   - `gemma-4-31b-it (LOW)`: Configured with `thinkingLevel: "MINIMAL"` for fast, low-overhead generation.
   - Support for 26B MoE models (`gemma-4-26b-a4b-it`).

3. **Google Authentication & Cloud Sync:**
   - One-click Google sign-in powered by Firebase Auth.
   - Profile settings to customize display names.
   - Cloud backup toggle ("Save data to cloud") syncing chat history across devices via Firestore.

4. **Persistent `userdat.synapse` Storage:**
   - **Save:** Export complete chat sessions, history, and settings to any folder as `userdat.synapse`.
   - **Load:** Restore previous sessions via file picker or drag-and-drop.
   - **Browser Memory:** Automatically caches state in local storage so chats persist across page refreshes.

5. **Message Editing & Regeneration:**
   - Inline message editing on user prompts with immediate response re-generation.

---

## Modular Directory Structure

```
chatgemma_web/
├── index.html                  # HTML entry point with Google Sans fonts
├── package.json                # React, Vite, Firebase, Lucide, Marked
├── vite.config.js              # Vite configuration
├── public/
│   └── favicon.svg             # Gemini sparkle logo
└── src/
    ├── main.jsx                # Application root mounting
    ├── App.jsx                 # Main layout & modal controller
    ├── config/
    │   ├── config.js           # Default API key, model options, thinking levels
    │   └── firebase.js         # Firebase Auth, Google provider, Firestore
    ├── context/
    │   ├── AuthContext.jsx     # Google auth & profile state
    │   └── ChatContext.jsx     # Multi-session state, streaming, message CRUD
    ├── services/
    │   ├── api.js              # Google GenAI REST API connector with thought stream separation
    │   ├── storage.js          # 'userdat.synapse' export/import & localStorage caching
    │   └── firestore.js        # Firestore cloud sync
    ├── components/
    │   ├── Sidebar/
    │   │   ├── Sidebar.jsx
    │   │   ├── BrandHeader.jsx
    │   │   ├── ModeSwitcher.jsx  # "Chat" and "Spark (BETA)"
    │   │   ├── NavigationItems.jsx # "New chat", "Search chats"
    │   │   ├── RecentsList.jsx
    │   │   └── UserProfile.jsx   # User profile, Google avatar, Settings trigger
    │   ├── Chat/
    │   │   ├── ChatArea.jsx
    │   │   ├── EmptyState.jsx    # "Let's jump in, {name}" & ambient glow
    │   │   ├── MessageList.jsx
    │   │   ├── MessageItem.jsx
    │   │   ├── ThinkingBlock.jsx # Collapsible reasoning accordion
    │   │   ├── ThinkingAnimation.jsx # Custom geometric thinking animation
    │   │   ├── MarkdownRenderer.jsx # Code highlighting with copy button
    │   │   └── MessageActions.jsx # Thumbs up/down, Copy, Retry
    │   ├── Input/
    │   │   ├── PromptInputBar.jsx # Floating pill input
    │   │   └── ModelSelector.jsx # Model & reasoning dropdown
    │   └── Modals/
    │       ├── SettingsModal.jsx  # Profile name, Cloud sync, API key
    │       ├── SearchModal.jsx    # Filter chats & messages
    │       └── EditMessageModal.jsx # Prompt revision & regeneration
    └── styles/
        ├── index.css           # Gemini design tokens & reset
        └── App.css             # Component styling, responsive layout, modals
```

---

## Running the App

```bash
cd chatgemma_web

# 1. Install dependencies (if not already installed)
npm install

# 2. Start Vite development server
npm run dev

# 3. Build production bundle
npm run build
```
