import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { CONFIG } from "../config/config.js";
import { GemmaApiService } from "../services/api.js";
import { SynapseStorageService } from "../services/storage.js";
import { CloudSyncService } from "../services/firestore.js";
import { useAuth } from "./AuthContext.jsx";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, displayName } = useAuth();

  // Load Initial State from LocalStorage backup
  const [initialLoaded, setInitialLoaded] = useState(false);
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

  const [settings, setSettings] = useState(() => {
    const backup = SynapseStorageService.loadLocalBackup();
    return {
      apiKey: backup?.settings?.apiKey || CONFIG.defaultApiKey,
      modelId: backup?.settings?.modelId || CONFIG.defaultModelId,
      systemPrompt: backup?.settings?.systemPrompt || CONFIG.defaultSystemPrompt,
      cloudSyncEnabled: Boolean(backup?.settings?.cloudSyncEnabled),
    };
  });

  const [generatingSessionId, setGeneratingSessionId] = useState(null);
  const isGenerating = Boolean(generatingSessionId);
  const [currentStreamingThought, setCurrentStreamingThought] = useState("");
  const [currentStreamingAnswer, setCurrentStreamingAnswer] = useState("");
  const [currentStreamingToolCalls, setCurrentStreamingToolCalls] = useState([]);
  const [toast, setToast] = useState(null);

  const apiServiceRef = useRef(
    new GemmaApiService(settings.apiKey, settings.modelId, settings.systemPrompt)
  );

  // Update API service when settings change
  useEffect(() => {
    apiServiceRef.current.updateConfig({
      apiKey: settings.apiKey,
      modelId: settings.modelId,
      systemPrompt: settings.systemPrompt,
    });
  }, [settings]);

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
    const state = SynapseStorageService.packageState(
      sessions,
      activeSessionId,
      settings,
      { displayName, email: user?.email }
    );
    SynapseStorageService.saveLocalBackup(state);

    // If cloud sync is enabled and user is logged in
    if (settings.cloudSyncEnabled && user?.uid) {
      CloudSyncService.saveUserData(user.uid, state);
    }
  }, [sessions, activeSessionId, settings, user, displayName]);

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
          showToast("Cloud chat history synchronized", "success");
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

  const stopGeneration = () => {
    apiServiceRef.current.cancelRequest();
    setGeneratingSessionId(null);
    setCurrentStreamingThought("");
    setCurrentStreamingAnswer("");
    setCurrentStreamingToolCalls([]);
    showToast("Generation stopped.", "warning");
  };

  /**
   * Send a prompt in active session and stream response with thought separation.
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
    setGeneratingSessionId(sessionId);
    setCurrentStreamingThought("");
    setCurrentStreamingAnswer("");
    setCurrentStreamingToolCalls([]);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    try {
      const executionContext = {
        activeSession,
        sessions,
      };

      await apiServiceRef.current.streamChat(
        messageHistory,
        {
          onThought: (chunk, accumulated) => {
            setCurrentStreamingThought(accumulated);
          },
          onAnswer: (chunk, accumulated) => {
            setCurrentStreamingAnswer(accumulated);
          },
          onToolCallStart: (call) => {
            setCurrentStreamingToolCalls((prev) => {
              const idx = prev.findIndex((c) => c.id === call.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...call, status: "running" };
                return updated;
              }
              return [...prev, { ...call, status: "running" }];
            });
          },
          onToolCallResult: (completedCall) => {
            setCurrentStreamingToolCalls((prev) => {
              const idx = prev.findIndex((c) => c.id === completedCall.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...completedCall };
                return updated;
              }
              return [...prev, completedCall];
            });
          },
          onComplete: ({ thought, answer, toolCalls }) => {
            const assistantMsg = {
              id: Math.random().toString(36).substring(2, 10),
              role: "assistant",
              content: answer,
              thought: thought || "",
              toolCalls: toolCalls || [],
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
            setCurrentStreamingToolCalls([]);
            setGeneratingSessionId(null);
          },
          onError: (err) => {
            showToast(`Error: ${err.message}`, "error");
            setCurrentStreamingToolCalls([]);
            setCurrentStreamingThought("");
            setCurrentStreamingAnswer("");
            setGeneratingSessionId(null);
          },
        },
        executionContext
      );
    } catch (err) {
      showToast(`Generation failed: ${err.message}`, "error");
      setCurrentStreamingToolCalls([]);
      setCurrentStreamingThought("");
      setCurrentStreamingAnswer("");
      setGeneratingSessionId(null);
    }
  };

  const exportSynapseFile = async () => {
    const packaged = SynapseStorageService.packageState(
      sessions,
      activeSessionId,
      settings,
      { displayName, email: user?.email }
    );
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
        createNewSession,
        switchSession,
        deleteSession,
        renameSession,
        sendMessage,
        editMessageAndRegenerate,
        isGenerating,
        generatingSessionId,
        currentStreamingThought,
        currentStreamingAnswer,
        currentStreamingToolCalls,
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
