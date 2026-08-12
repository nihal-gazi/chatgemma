/**
 * Storage Service for userdat.synapse import/export and LocalStorage caching.
 */

import { CONFIG } from "../config/config.js";

export class SynapseStorageService {
  /**
   * Packages full state into standard Synapse format.
   */
  static packageState(sessions, activeSessionId, settings, userProfile) {
    return {
      version: "1.0.0",
      app: "ChatGemma",
      exported_at: new Date().toISOString(),
      user: {
        displayName: userProfile?.displayName || "User",
        email: userProfile?.email || "",
      },
      settings: {
        apiKey: settings.apiKey || CONFIG.defaultApiKey,
        modelId: settings.modelId || CONFIG.defaultModelId,
        systemPrompt: settings.systemPrompt || CONFIG.defaultSystemPrompt,
        cloudSyncEnabled: Boolean(settings.cloudSyncEnabled),
      },
      activeSessionId: activeSessionId,
      sessions: sessions || [],
    };
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
      exported_at: data.exported_at || null,
    };
  }

  /**
   * LocalStorage browser persistence so the browser remembers all chats across reloads.
   */
  static saveLocalBackup(appState) {
    try {
      localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(appState));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  }

  static loadLocalBackup() {
    try {
      const raw = localStorage.getItem(CONFIG.localStorageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("LocalStorage read error:", e);
    }
    return null;
  }
}
