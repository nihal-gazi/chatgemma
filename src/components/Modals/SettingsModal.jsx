import React, { useState, useEffect } from "react";
import { X, User, Database, Key, Cloud, Download, Upload, LogOut, LogIn, Share2, RotateCcw, Sparkles } from "../Icons/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function SettingsModal({ isOpen, onClose }) {
  const { user, displayName, customDisplayName, updateDisplayName, loginWithGoogle, logout } =
    useAuth();
  const {
    settings,
    updateSettings,
    exportSynapseFile,
    importSynapseFile,
    knowledgeGraphStats,
    isExtractingKnowledge,
    reindexKnowledgeGraph,
    userProfileMarkdown,
    personalizationStats,
    isCompactingProfile,
    updateUserProfileMarkdown,
    compactUserProfile,
    resetUserProfileMarkdown,
    showToast,
  } = useChat();

  const [activeTab, setActiveTab] = useState("profile");
  const [nameInput, setNameInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || "");
  const [cloudSync, setCloudSync] = useState(Boolean(settings.cloudSyncEnabled));
  const [allowKgRw, setAllowKgRw] = useState(settings.allowKnowledgeGraphReadWrite !== false);
  const [enablePersonalization, setEnablePersonalization] = useState(settings.enablePersonalization !== false);
  const [maxTokensInput, setMaxTokensInput] = useState(settings.personalizationMaxTokens || 5000);
  const [profileTextInput, setProfileTextInput] = useState(userProfileMarkdown || "");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setNameInput(customDisplayName || user?.displayName || "");
      setApiKeyInput(settings.apiKey || "");
      setCloudSync(Boolean(settings.cloudSyncEnabled));
      setAllowKgRw(settings.allowKnowledgeGraphReadWrite !== false);
      setEnablePersonalization(settings.enablePersonalization !== false);
      setMaxTokensInput(settings.personalizationMaxTokens || 5000);
      setProfileTextInput(userProfileMarkdown || "");
    }
  }, [isOpen, customDisplayName, user?.displayName, settings, userProfileMarkdown]);

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

  const handleToggleKgRw = (checked) => {
    setAllowKgRw(checked);
    updateSettings({ allowKnowledgeGraphReadWrite: checked });
    showToast(checked ? "LLM Knowledge Graph Read/Write enabled" : "LLM Knowledge Graph Read/Write disabled", "info");
  };

  const handleTogglePersonalization = (checked) => {
    setEnablePersonalization(checked);
    updateSettings({ enablePersonalization: checked });
    showToast(checked ? "Personalization (user.md) enabled" : "Personalization disabled", "info");
  };

  const handleSavePersonalizationSettings = () => {
    const parsedTokens = Math.max(500, Math.min(parseInt(maxTokensInput, 10) || 5000, 32000));
    updateSettings({
      enablePersonalization,
      personalizationMaxTokens: parsedTokens,
    });
    updateUserProfileMarkdown(profileTextInput);
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
              className={`settings-tab-btn ${activeTab === "personalization" ? "active" : ""}`}
              onClick={() => setActiveTab("personalization")}
            >
              <Sparkles size={16} />
              <span>Personalization</span>
            </button>
            <button
              className={`settings-tab-btn ${activeTab === "data" ? "active" : ""}`}
              onClick={() => setActiveTab("data")}
            >
              <Database size={16} />
              <span>Data & Cloud</span>
            </button>
            <button
              className={`settings-tab-btn ${activeTab === "kg" ? "active" : ""}`}
              onClick={() => setActiveTab("kg")}
            >
              <Share2 size={16} />
              <span>Knowledge Graph</span>
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

            {/* PERSONALIZATION TAB */}
            {activeTab === "personalization" && (
              <div className="tab-pane">
                <h3>LLM Personalization (`user.md`)</h3>
                <p className="tab-desc">
                  Gemma learns your identity, preferences, and workflows to personalize every conversation.
                </p>

                <div className="cloud-sync-toggle-card">
                  <div className="toggle-left">
                    <Sparkles size={20} className="cloud-icon" />
                    <div>
                      <div className="toggle-title">Enable Personalization</div>
                      <div className="toggle-sub">Attach your <code>user.md</code> profile to every prompt and continuously update it.</div>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={enablePersonalization}
                      onChange={(e) => handleTogglePersonalization(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="form-field" style={{ marginTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label>Max Token Limit for user.md</label>
                    <span className="token-counter-badge">
                      {personalizationStats?.tokens || 0} / {maxTokensInput} tokens
                    </span>
                  </div>
                  <input
                    type="number"
                    className="modal-text-input"
                    value={maxTokensInput}
                    min={500}
                    max={32000}
                    step={500}
                    onChange={(e) => setMaxTokensInput(e.target.value)}
                    placeholder="Default: 5000"
                  />
                  <p className="kg-help-note" style={{ marginTop: "4px" }}>
                    If <code>user.md</code> exceeds this limit, Gemma automatically runs recursive compaction in the background to distill the notes.
                  </p>
                </div>

                <div className="form-field" style={{ marginTop: "14px" }}>
                  <label>Internal Profile (user.md)</label>
                  <textarea
                    className="modal-textarea-input"
                    rows={9}
                    value={profileTextInput}
                    onChange={(e) => setProfileTextInput(e.target.value)}
                    placeholder="# User Profile..."
                  />
                </div>

                <div className="btn-row" style={{ marginTop: "12px" }}>
                  <button className="btn-modal-action" onClick={handleSavePersonalizationSettings}>
                    Save user.md
                  </button>
                  <button
                    className="btn-modal-outline"
                    onClick={() => compactUserProfile(parseInt(maxTokensInput, 10) || 5000)}
                    disabled={isCompactingProfile}
                  >
                    <RotateCcw size={15} className={isCompactingProfile ? "spin" : ""} />
                    {isCompactingProfile ? "Compacting..." : "Compact Now"}
                  </button>
                  <button className="btn-modal-danger" onClick={resetUserProfileMarkdown}>
                    Reset
                  </button>
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

            {/* KNOWLEDGE GRAPH TAB */}
            {activeTab === "kg" && (
              <div className="tab-pane">
                <h3>GraphRAG Knowledge Graph</h3>
                <p className="tab-desc">
                  Powered by <strong>Gemma 31B</strong> with <strong>Google Search Grounding</strong> for automated factual entity-relation extraction.
                </p>

                <div className="cloud-sync-toggle-card" style={{ marginBottom: "14px" }}>
                  <div className="toggle-left">
                    <Share2 size={20} className="cloud-icon" />
                    <div>
                      <div className="toggle-title">Allow LLM to Read / Write Knowledge Graph</div>
                      <div className="toggle-sub">When disabled, tools return permission denied when the model attempts to read, write, or delete graph nodes.</div>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={allowKgRw}
                      onChange={(e) => handleToggleKgRw(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="kg-stats-card">
                  <div className="kg-stat-item">
                    <span className="kg-stat-number">
                      {knowledgeGraphStats?.activeEntities !== undefined ? knowledgeGraphStats.activeEntities : knowledgeGraphStats?.totalEntities || 0}
                    </span>
                    <span className="kg-stat-label">Active Entities ({knowledgeGraphStats?.totalEntities || 0} Total)</span>
                  </div>
                  <div className="kg-stat-divider" />
                  <div className="kg-stat-item">
                    <span className="kg-stat-number">
                      {knowledgeGraphStats?.activeRelations !== undefined ? knowledgeGraphStats.activeRelations : knowledgeGraphStats?.totalRelations || 0}
                    </span>
                    <span className="kg-stat-label">Active Triples ({knowledgeGraphStats?.totalRelations || 0} Total)</span>
                  </div>
                </div>

                {knowledgeGraphStats?.typeDistribution && Object.keys(knowledgeGraphStats.typeDistribution).length > 0 && (
                  <div className="kg-distribution-box">
                    <div className="kg-dist-title">Entity Categories:</div>
                    <div className="kg-type-tags">
                      {Object.entries(knowledgeGraphStats.typeDistribution).map(([type, count]) => (
                        <span key={type} className="kg-type-tag">
                          {type}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="kg-action-box">
                  <button
                    className="btn-modal-action"
                    onClick={reindexKnowledgeGraph}
                    disabled={isExtractingKnowledge}
                  >
                    <RotateCcw size={15} className={isExtractingKnowledge ? "spin" : ""} />
                    {isExtractingKnowledge ? "Extracting with Gemma 31B & Google Search..." : "Re-index Graph with Gemma 31B"}
                  </button>
                  <p className="kg-help-note">
                    The agent automatically invokes the <code>knowledge_search</code>, <code>knowledge_graph_write</code>, and <code>knowledge_graph_delete</code> tools to manage connections, relationships, and concepts across your sessions.
                  </p>
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
