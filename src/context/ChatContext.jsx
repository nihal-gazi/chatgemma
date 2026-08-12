import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { CONFIG } from "../config/config.js";
import { GemmaApiService } from "../services/api.js";
import { SynapseStorageService } from "../services/storage.js";
import { CloudSyncService } from "../services/firestore.js";
import { KnowledgeGraphStore } from "../services/knowledgeGraph.js";
import { useAuth } from "./AuthContext.jsx";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, displayName } = useAuth();

  // Initialize Knowledge Graphs
  const globalKGRef = useRef(new KnowledgeGraphStore("global_knowledge_graph"));
  const userKGRef = useRef(new KnowledgeGraphStore("user_knowledge_graph"));
  const [kgVersion, setKgVersion] = useState(0); // Trigger re-renders when graph updates

  // Load Initial State from LocalStorage backup
  const [sessions, setSessions] = useState(() => {
    const backup = SynapseStorageService.loadLocalBackup();
    if (backup?.sessions && backup.sessions.length > 0) {
      return backup.sessions;
    }
    const defaultId = Math.random().toString(36).substring(2, 10);
    return [
      {
        id: defaultId,
        title: "New Chat",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    const backup = SynapseStorageService.loadLocalBackup();
    return backup?.activeSessionId || sessions[0]?.id || null;
  });

  const [scratchPad, setScratchPad] = useState(() => {
    const backup = SynapseStorageService.loadLocalBackup();
    return backup?.scratchPad || "";
  });

  const [kHistory, setKHistory] = useState(() => {
    const backup = SynapseStorageService.loadLocalBackup();
    return backup?.kHistory !== undefined ? backup.kHistory : 100;
  });

  const [settings, setSettings] = useState(() => {
    const backup = SynapseStorageService.loadLocalBackup();
    return {
      apiKey: backup?.settings?.apiKey || CONFIG.defaultApiKey,
      modelId: backup?.settings?.modelId || CONFIG.defaultModelId,
      systemPrompt: backup?.settings?.systemPrompt || CONFIG.defaultSystemPrompt,
      cloudSyncEnabled: Boolean(backup?.settings?.cloudSyncEnabled),
    };
  });

  // Restore Knowledge Graphs from local storage on mount
  useEffect(() => {
    try {
      const backup = SynapseStorageService.loadLocalBackup();
      if (backup?.globalKnowledgeGraph) {
        globalKGRef.current.importJson(backup.globalKnowledgeGraph);
      }
      if (backup?.userKnowledgeGraph) {
        userKGRef.current.importJson(backup.userKnowledgeGraph);
      }
      setKgVersion((v) => v + 1);
    } catch (e) {
      console.warn("Failed to restore knowledge graphs from backup:", e);
    }
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStreamingThought, setCurrentStreamingThought] = useState("");
  const [currentStreamingAnswer, setCurrentStreamingAnswer] = useState("");
  const [currentStreamingToolExecutions, setCurrentStreamingToolExecutions] = useState([]);
  const [toast, setToast] = useState(null);

  const apiServiceRef = useRef(
    new GemmaApiService(settings.apiKey, settings.modelId, settings.systemPrompt, { kHistory })
  );

  // Update API service when settings or kHistory change
  useEffect(() => {
    apiServiceRef.current.updateConfig({
      apiKey: settings.apiKey,
      modelId: settings.modelId,
      systemPrompt: settings.systemPrompt,
      kHistory: kHistory,
    });
  }, [settings, kHistory]);

  // Show temporary toast
  const showToast = (message, type = "info") => {
    if (type === "error") {
      console.error("[ChatGemma Error]:", message);
    }
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Local storage auto-backup & Cloud Sync on changes
  useEffect(() => {
    const state = {
      ...SynapseStorageService.packageState(
        sessions,
        activeSessionId,
        settings,
        { displayName, email: user?.email }
      ),
      scratchPad,
      kHistory,
      globalKnowledgeGraph: globalKGRef.current.exportJson("all"),
      userKnowledgeGraph: userKGRef.current.exportJson("all"),
    };

    SynapseStorageService.saveLocalBackup(state);

    if (settings.cloudSyncEnabled && user?.uid) {
      CloudSyncService.saveUserData(user.uid, state);
    }
  }, [sessions, activeSessionId, settings, user, displayName, scratchPad, kHistory, kgVersion]);

  // Load from Cloud if user logs in and cloud sync is enabled
  useEffect(() => {
    if (user?.uid && settings.cloudSyncEnabled) {
      CloudSyncService.loadUserData(user.uid).then((cloudData) => {
        if (cloudData && cloudData.sessions && cloudData.sessions.length > 0) {
          setSessions(cloudData.sessions);
          if (cloudData.activeSessionId) {
            setActiveSessionId(cloudData.activeSessionId);
          }
          if (cloudData.settings) {
            setSettings((prev) => ({ ...prev, ...cloudData.settings }));
          }
          if (cloudData.scratchPad !== undefined) {
            setScratchPad(cloudData.scratchPad);
          }
          if (cloudData.kHistory !== undefined) {
            setKHistory(cloudData.kHistory);
          }
          if (cloudData.globalKnowledgeGraph) {
            globalKGRef.current.importJson(cloudData.globalKnowledgeGraph);
          }
          if (cloudData.userKnowledgeGraph) {
            userKGRef.current.importJson(cloudData.userKnowledgeGraph);
          }
          setKgVersion((v) => v + 1);
          showToast("Cloud chat history & Knowledge Graphs synchronized", "success");
        }
      });
    }
  }, [user?.uid]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;

  const createNewSession = (title = "New Chat") => {
    const newId = Math.random().toString(36).substring(2, 10);
    const newSession = {
      id: newId,
      title: title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    return newSession;
  };

  const switchSession = (id) => {
    if (sessions.some((s) => s.id === id)) {
      setActiveSessionId(id);
    }
  };

  const deleteSession = (id) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const newDefault = {
          id: Math.random().toString(36).substring(2, 10),
          title: "New Chat",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: [],
        };
        setActiveSessionId(newDefault.id);
        return [newDefault];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const renameSession = (id, newTitle) => {
    if (!newTitle.trim()) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim(), updated_at: new Date().toISOString() } : s))
    );
  };

  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateScratchPad = (newContent) => {
    setScratchPad(newContent);
  };

  const updateKHistory = (newK) => {
    const val = Math.max(1, parseInt(newK, 10) || 100);
    setKHistory(val);
  };

  const stopGeneration = () => {
    apiServiceRef.current.cancelRequest();
    setIsGenerating(false);
    showToast("Generation stopped.", "warning");
  };

  /**
   * Helper to trigger download of Knowledge Graph JSON files.
   */
  const downloadGraphJson = (graphType = "global", view = "all") => {
    const kg = graphType === "user" ? userKGRef.current : globalKGRef.current;
    const data = kg.exportJson(view);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${graphType}_${view}_graph.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${graphType}_${view}_graph.json`, "success");
  };

  const clearKnowledgeGraph = (graphType = "global") => {
    if (graphType === "user") {
      userKGRef.current.clear();
    } else {
      globalKGRef.current.clear();
    }
    setKgVersion((v) => v + 1);
    showToast(`Cleared ${graphType} knowledge graph.`, "info");
  };

  /**
   * Send a prompt in active session and stream response with tool executions.
   */
  const sendMessage = async (promptText) => {
    if (!promptText || !promptText.trim() || isGenerating) return;

    let targetSession = activeSession;
    if (!targetSession) {
      targetSession = createNewSession();
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = {
      id: Math.random().toString(36).substring(2, 10),
      role: "user",
      content: promptText.trim(),
      timestamp,
    };

    // Auto-update title from first user message
    const updatedTitle =
      targetSession.messages.length === 0 || targetSession.title === "New Chat"
        ? promptText.trim().replace(/\n+/g, " ").slice(0, 30)
        : targetSession.title;

    const newMessages = [...targetSession.messages, userMsg];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSession.id
          ? {
              ...s,
              title: updatedTitle,
              updated_at: new Date().toISOString(),
              messages: newMessages,
            }
          : s
      )
    );

    await _executeStream(targetSession.id, newMessages);
  };

  /**
   * Edit a previous message, truncate subsequent messages, and regenerate.
   */
  const editMessageAndRegenerate = async (messageIndex, newContent) => {
    if (!activeSession || messageIndex < 0 || messageIndex >= activeSession.messages.length) return;

    const targetSession = activeSession;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const truncated = targetSession.messages.slice(0, messageIndex + 1);
    truncated[messageIndex] = {
      ...truncated[messageIndex],
      content: newContent.trim(),
      timestamp,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSession.id
          ? {
              ...s,
              updated_at: new Date().toISOString(),
              messages: truncated,
            }
          : s
      )
    );

    await _executeStream(targetSession.id, truncated);
  };

  const _executeStream = async (sessionId, messageHistory) => {
    setIsGenerating(true);
    setCurrentStreamingThought("");
    setCurrentStreamingAnswer("");
    setCurrentStreamingToolExecutions([]);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const toolContext = {
      globalKG: globalKGRef.current,
      userKG: userKGRef.current,
      scratchPad,
      currentSessionId: sessionId,
      currentSession: activeSession,
      allSessions: sessions,
      onKnowledgeGraphUpdate: () => setKgVersion((v) => v + 1),
      onScratchPadUpdate: (newPad) => setScratchPad(newPad),
    };

    try {
      await apiServiceRef.current.streamChat(
        messageHistory,
        {
          onThought: (chunk, accumulated) => {
            setCurrentStreamingThought(accumulated);
          },
          onAnswer: (chunk, accumulated) => {
            setCurrentStreamingAnswer(accumulated);
          },
          onToolExecution: (executionRecord) => {
            setCurrentStreamingToolExecutions((prev) => [...prev, executionRecord]);
          },
          onComplete: ({ thought, answer, toolExecutions }) => {
            const assistantMsg = {
              id: Math.random().toString(36).substring(2, 10),
              role: "assistant",
              content: answer,
              thought: thought || "",
              toolExecutions: toolExecutions || [],
              timestamp,
            };

            setSessions((prev) =>
              prev.map((s) =>
                s.id === sessionId
                  ? {
                      ...s,
                      updated_at: new Date().toISOString(),
                      messages: [...messageHistory, assistantMsg],
                    }
                  : s
              )
            );
            setCurrentStreamingThought("");
            setCurrentStreamingAnswer("");
            setCurrentStreamingToolExecutions([]);
            setIsGenerating(false);
          },
          onError: (err) => {
            showToast(`Error: ${err.message}`, "error");
            setIsGenerating(false);
          },
        },
        toolContext
      );
    } catch (err) {
      showToast(`Generation failed: ${err.message}`, "error");
      setIsGenerating(false);
    }
  };

  const exportSynapseFile = async () => {
    const packaged = {
      ...SynapseStorageService.packageState(
        sessions,
        activeSessionId,
        settings,
        { displayName, email: user?.email }
      ),
      scratchPad,
      kHistory,
      globalKnowledgeGraph: globalKGRef.current.exportJson("all"),
      userKnowledgeGraph: userKGRef.current.exportJson("all"),
    };
    const res = await SynapseStorageService.exportToFile(packaged);
    if (res.success) {
      showToast(res.message, "success");
    }
  };

  const importSynapseFile = async (file) => {
    try {
      const imported = await SynapseStorageService.importFromFile(file);
      if (imported.sessions && imported.sessions.length > 0) {
        setSessions(imported.sessions);
        setActiveSessionId(imported.activeSessionId || imported.sessions[0].id);
      }
      if (imported.settings) {
        setSettings((prev) => ({ ...prev, ...imported.settings }));
      }
      if (imported.scratchPad !== undefined) {
        setScratchPad(imported.scratchPad);
      }
      if (imported.kHistory !== undefined) {
        setKHistory(imported.kHistory);
      }
      if (imported.globalKnowledgeGraph) {
        globalKGRef.current.importJson(imported.globalKnowledgeGraph);
      }
      if (imported.userKnowledgeGraph) {
        userKGRef.current.importJson(imported.userKnowledgeGraph);
      }
      setKgVersion((v) => v + 1);
      showToast("userdat.synapse loaded successfully!", "success");
    } catch (err) {
      showToast(`Import Error: ${err.message}`, "error");
    }
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        activeSession,
        settings,
        updateSettings,
        scratchPad,
        updateScratchPad,
        kHistory,
        updateKHistory,
        globalKG: globalKGRef.current,
        userKG: userKGRef.current,
        kgVersion,
        downloadGraphJson,
        clearKnowledgeGraph,
        createNewSession,
        switchSession,
        deleteSession,
        renameSession,
        sendMessage,
        editMessageAndRegenerate,
        isGenerating,
        currentStreamingThought,
        currentStreamingAnswer,
        currentStreamingToolExecutions,
        stopGeneration,
        exportSynapseFile,
        importSynapseFile,
        toast,
        showToast,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
