/**
 * Storage Service for ChatGemma (IndexedDB + userdat.synapse import/export + LocalStorage caching).
 * Provides robust asynchronous IndexedDB persistence with unlimited quota for multi-turn chats,
 * rich reasoning blocks, thoughts, and file attachments without hitting LocalStorage 5MB ceilings.
 */

import { CONFIG } from "../config/config.js";

const DB_NAME = "ChatGemmaDB";
const DB_VERSION = 1;
const STORE_NAME = "chat_state";
const STATE_KEY = "current_app_state";

let dbPromise = null;

function getIndexedDB() {
  if (typeof window === "undefined") return null;
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || null;
}

function openDatabase() {
  if (dbPromise) return dbPromise;

  const idb = getIndexedDB();
  if (!idb) {
    return Promise.resolve(null);
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.warn("[Storage] IndexedDB open error, falling back to LocalStorage:", event.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn("[Storage] IndexedDB exception:", err);
      resolve(null);
    }
  });

  return dbPromise;
}

export class SynapseStorageService {
  /**
   * Packages full state into standard Synapse format.
   */
  static packageState(
    sessions,
    activeSessionId,
    settings,
    userProfile,
    knowledgeGraph = null,
    userProfileMarkdown = null,
    userKnowledgeGraph = null
  ) {
    return {
      version: "1.0.0",
      app: "ChatGemma",
      exported_at: new Date().toISOString(),
      user: {
        displayName: userProfile?.displayName || "User",
        email: userProfile?.email || "",
      },
      settings: {
        apiKey: settings?.apiKey || CONFIG.defaultApiKey,
        modelId: settings?.modelId || CONFIG.defaultModelId,
        systemPrompt: settings?.systemPrompt || CONFIG.defaultSystemPrompt,
        cloudSyncEnabled: Boolean(settings?.cloudSyncEnabled),
        allowKnowledgeGraphReadWrite: settings?.allowKnowledgeGraphReadWrite !== false,
        enablePersonalization: settings?.enablePersonalization !== false,
        personalizationMaxTokens: settings?.personalizationMaxTokens || 5000,
      },
      activeSessionId: activeSessionId,
      sessions: sessions || [],
      knowledgeGraph: knowledgeGraph || null,
      userKnowledgeGraph: userKnowledgeGraph || null,
      userProfileMarkdown: userProfileMarkdown || null,
    };
  }

  /**
   * Save app state asynchronously to IndexedDB (and LocalStorage as backup).
   * @param {Object} appState
   */
  static async saveState(appState) {
    if (!appState) return;

    // 1. Primary: Save to IndexedDB (Unlimited quota, non-blocking)
    try {
      const db = await openDatabase();
      if (db) {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const putReq = store.put(appState, STATE_KEY);

          putReq.onsuccess = () => resolve(true);
          putReq.onerror = (e) => reject(e.target.error);
          transaction.onerror = (e) => reject(e.target.error);
        });
      }
    } catch (idbErr) {
      console.warn("[Storage] IndexedDB save error:", idbErr);
    }

    // 2. Secondary: Fallback to LocalStorage (safely wrapped)
    try {
      this.saveLocalBackup(appState);
    } catch (lsErr) {
      // Ignored if localstorage is full
    }
  }

  /**
   * Load app state asynchronously from IndexedDB (with LocalStorage migration).
   * @returns {Promise<Object|null>}
   */
  static async loadState() {
    // 1. Try IndexedDB first
    try {
      const db = await openDatabase();
      if (db) {
        const idbData = await new Promise((resolve) => {
          const transaction = db.transaction([STORE_NAME], "readonly");
          const store = transaction.objectStore(STORE_NAME);
          const getReq = store.get(STATE_KEY);

          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        });

        if (idbData && Array.isArray(idbData.sessions) && idbData.sessions.length > 0) {
          return idbData;
        }
      }
    } catch (err) {
      console.warn("[Storage] IndexedDB load error, falling back:", err);
    }

    // 2. Fallback to LocalStorage & migrate to IndexedDB if found
    const lsBackup = this.loadLocalBackup();
    if (lsBackup && Array.isArray(lsBackup.sessions) && lsBackup.sessions.length > 0) {
      // Migrate to IndexedDB in background
      this.saveState(lsBackup).catch(() => {});
      return lsBackup;
    }

    return null;
  }

  /**
   * Save app state to a 'userdat.synapse' file on disk.
   */
  static async exportToFile(appState, filename = CONFIG.defaultSynapseFileName) {
    const jsonString = JSON.stringify(appState, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    // File System Access API
    if ("showSaveFilePicker" in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "Synapse User Data (*.synapse)",
              accept: {
                "application/json": [".synapse", ".json"],
              },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, message: `Saved ${filename} to your selected folder.` };
      } catch (err) {
        if (err.name === "AbortError") {
          return { success: false, message: "Save cancelled." };
        }
        console.warn("showSaveFilePicker failed, falling back to download link:", err);
      }
    }

    // Fallback Download Trigger
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: `Downloaded ${filename}` };
  }

  /**
   * Import app state from a 'userdat.synapse' file.
   */
  static async importFromFile(file) {
    if (!file) throw new Error("No file selected.");
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid file: File must be valid JSON or .synapse format.");
    }

    if (!data.sessions || !Array.isArray(data.sessions)) {
      throw new Error("Invalid format: Missing 'sessions' array in synapse data.");
    }

    return {
      settings: data.settings || {},
      user: data.user || null,
      activeSessionId: data.activeSessionId || data.sessions[0]?.id || null,
      sessions: data.sessions,
      knowledgeGraph: data.knowledgeGraph || null,
      userKnowledgeGraph: data.userKnowledgeGraph || null,
      userProfileMarkdown: data.userProfileMarkdown || null,
      exported_at: data.exported_at || null,
    };
  }

  /**
   * Synchronous LocalStorage backup (with safe quota truncation).
   */
  static saveLocalBackup(appState) {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(appState));
    } catch (e) {
      // If quota exceeded in localStorage, try storing a lightweight index
      try {
        if (appState && Array.isArray(appState.sessions)) {
          const lightweightState = {
            ...appState,
            sessions: appState.sessions.map((s) => ({
              ...s,
              messages: (s.messages || []).map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                // Omit heavy file blobs / reasoning blocks from synchronous localStorage
              })),
            })),
          };
          localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(lightweightState));
        }
      } catch (innerErr) {
        // Safe silence: IndexedDB is the primary source of truth
      }
    }
  }

  static loadLocalBackup() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const raw = localStorage.getItem(CONFIG.localStorageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("LocalStorage read error:", e);
    }
    return null;
  }
}
