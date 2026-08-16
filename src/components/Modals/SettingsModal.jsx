import React, { useState, useEffect } from "react";
import { X, User, Database, Key, Cloud, Download, Upload, LogOut, LogIn } from "../Icons/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function SettingsModal({ isOpen, onClose }) {
  const { user, displayName, customDisplayName, updateDisplayName, loginWithGoogle, logout } =
    useAuth();
  const { settings, updateSettings, exportSynapseFile, importSynapseFile, showToast } =
    useChat();

  const [activeTab, setActiveTab] = useState("profile");
  const [nameInput, setNameInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || "");
  const [cloudSync, setCloudSync] = useState(Boolean(settings.cloudSyncEnabled));
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setNameInput(customDisplayName || user?.displayName || "");
      setApiKeyInput(settings.apiKey || "");
      setCloudSync(Boolean(settings.cloudSyncEnabled));
    }
  }, [isOpen, customDisplayName, user?.displayName, settings]);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // 200ms exit animation
  };

  const handleSaveProfile = () => {
    updateDisplayName(nameInput.trim());
    showToast("Profile name updated!", "success");
  };

  const handleSaveApi = () => {
    const clean = apiKeyInput.trim().replace(/^["']|["']$/g, "");
    updateSettings({
      apiKey: clean,
    });
    setApiKeyInput(clean);
    showToast("API settings saved!", "success");
  };

  const handleToggleCloudSync = (checked) => {
    setCloudSync(checked);
    updateSettings({ cloudSyncEnabled: checked });
    if (checked && !user) {
      showToast("Sign in with Google to enable cloud synchronization", "warning");
    } else {
      showToast(checked ? "Cloud sync enabled" : "Cloud sync disabled", "info");
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importSynapseFile(file);
      handleClose();
    }
  };

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`} onClick={handleClose}>
      <div
        className={`modal-card settings-modal-card ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close-icon-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-modal-body">
          {/* Settings Tabs */}
          <div className="settings-tabs-sidebar">
            <button
              className={`settings-tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <User size={16} />
              <span>Profile</span>
            </button>
            <button
              className={`settings-tab-btn ${activeTab === "data" ? "active" : ""}`}
              onClick={() => setActiveTab("data")}
            >
              <Database size={16} />
              <span>Data & Cloud</span>
            </button>
            <button
              className={`settings-tab-btn ${activeTab === "api" ? "active" : ""}`}
              onClick={() => setActiveTab("api")}
            >
              <Key size={16} />
              <span>API & Model</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="settings-tab-content">
            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="tab-pane">
                <h3>User Profile</h3>
                <p className="tab-desc">Manage your account and customized display name.</p>

                <div className="form-field">
                  <label>Display Name</label>
                  <input
                    type="text"
                    className="modal-text-input"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                  />
                  <button className="btn-modal-action" onClick={handleSaveProfile}>
                    Update Name
                  </button>
                </div>

                <div className="auth-status-card">
                  {user ? (
                    <div className="logged-in-box">
                      <div className="user-email-label">Logged in as: <strong>{user.email}</strong></div>
                      <button className="btn-modal-danger" onClick={logout}>
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="logged-out-box">
                      <div className="user-email-label">Sign in to sync your chats across devices.</div>
                      <button className="btn-modal-action" onClick={loginWithGoogle}>
                        <LogIn size={15} /> Sign in with Google
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DATA TAB */}
            {activeTab === "data" && (
              <div className="tab-pane">
                <h3>Data & Synapse Storage</h3>
                <p className="tab-desc">Control cloud backup and save/load your <code>userdat.synapse</code> files.</p>

                <div className="cloud-sync-toggle-card">
                  <div className="toggle-left">
                    <Cloud size={20} className="cloud-icon" />
                    <div>
                      <div className="toggle-title">Save data to cloud</div>
                      <div className="toggle-sub">Automatically backup chat state to cloud for your profile.</div>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={cloudSync}
                      onChange={(e) => handleToggleCloudSync(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="synapse-file-actions-box">
                  <h4>Local Synapse File (`userdat.synapse`)</h4>
                  <div className="btn-row">
                    <button
                      className="btn-modal-outline"
                      onClick={() => {
                        exportSynapseFile();
                      }}
                    >
                      <Download size={16} /> Save userdat.synapse
                    </button>
                    <label className="btn-modal-outline upload-label">
                      <Upload size={16} /> Load userdat.synapse
                      <input
                        type="file"
                        accept=".synapse,.json"
                        style={{ display: "none" }}
                        onChange={handleFileInput}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* API TAB */}
            {activeTab === "api" && (
              <div className="tab-pane">
                <h3>API & Model Settings</h3>
                <p className="tab-desc">Configure your Google GenAI Gemini API key.</p>

                <div className="form-field">
                  <label>Gemini API Key</label>
                  <input
                    type="text"
                    className="modal-text-input"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Gemini API key"
                  />
                </div>

                <button className="btn-modal-action" onClick={handleSaveApi}>
                  Save API Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
