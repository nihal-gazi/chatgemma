import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Database,
  Key,
  Cloud,
  Download,
  Upload,
  LogOut,
  LogIn,
  Share2,
  RotateCcw,
  FileText,
  Sparkles,
  Eye,
} from "../Icons/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function SettingsModal({ isOpen, onClose, onOpenGraphVisualizer }) {
  const { user, displayName, customDisplayName, updateDisplayName, loginWithGoogle, logout } =
    useAuth();
  const {
    settings,
    updateSettings,
    exportSynapseFile,
    importSynapseFile,
    knowledgeGraphStats,
    userKnowledgeGraphStats,
    isExtractingKnowledge,
    reindexKnowledgeGraph,
    userProfileMarkdown,
    isCompactingProfile,
    updateUserProfileMarkdown,
    compactUserProfile,
    resetUserProfile,
    showToast,
  } = useChat();

  const [activeTab, setActiveTab] = useState("profile");
  const [nameInput, setNameInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || "");
  const [cloudSync, setCloudSync] = useState(Boolean(settings.cloudSyncEnabled));
  const [allowKgReadWrite, setAllowKgReadWrite] = useState(settings.allowKnowledgeGraphReadWrite !== false);
  const [enablePersonalization, setEnablePersonalization] = useState(settings.enablePersonalization !== false);
  const [maxTokensInput, setMaxTokensInput] = useState(settings.personalizationMaxTokens || 5000);
  const [userMdText, setUserMdText] = useState(userProfileMarkdown || "");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setNameInput(customDisplayName || user?.displayName || "");
      setApiKeyInput(settings.apiKey || "");
      setCloudSync(Boolean(settings.cloudSyncEnabled));
      setAllowKgReadWrite(settings.allowKnowledgeGraphReadWrite !== false);
      setEnablePersonalization(settings.enablePersonalization !== false);
      setMaxTokensInput(settings.personalizationMaxTokens || 5000);
      setUserMdText(userProfileMarkdown || "");
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

  const handleToggleKgReadWrite = (checked) => {
    setAllowKgReadWrite(checked);
    updateSettings({ allowKnowledgeGraphReadWrite: checked });
    showToast(checked ? "LLM Knowledge Graph Read/Write enabled" : "LLM Knowledge Graph Read/Write disabled", "info");
  };

  const handleTogglePersonalization = (checked) => {
    setEnablePersonalization(checked);
    updateSettings({ enablePersonalization: checked });
    showToast(checked ? "Personalization enabled" : "Personalization disabled", "info");
  };

  const handleSaveMaxTokens = (val) => {
    const num = Math.max(500, Math.min(Number(val) || 5000, 50000));
    setMaxTokensInput(num);
    updateSettings({ personalizationMaxTokens: num });
  };

  const handleSaveUserMd = () => {
    updateUserProfileMarkdown(userMdText);
  };

  const handleResetUserMd = () => {
    const reset = resetUserProfile();
    setUserMdText(reset);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importSynapseFile(file);
      handleClose();
    }
  };

  const estimatedUserMdTokens = Math.ceil((userMdText || "").trim().length / 3.8);

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
              <FileText size={16} />
              <span>Personalization</span>
            </button>
            <button
              className={`settings-tab-btn ${activeTab === "kg" ? "active" : ""}`}
              onClick={() => setActiveTab("kg")}
            >
              <Share2 size={16} />
              <span>Knowledge Graph</span>
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

            {/* PERSONALIZATION (user.md) TAB */}
            {activeTab === "personalization" && (
              <div className="tab-pane">
                <div className="tab-header-row">
                  <div>
                    <h3>Personalization (`user.md`)</h3>
                    <p className="tab-desc">
                      Continuous user persona, preferences, and context profile injected into every model prompt.
                    </p>
                  </div>
                </div>

                <div className="cloud-sync-toggle-card">
                  <div className="toggle-left">
                    <Sparkles size={20} className="cloud-icon" />
                    <div>
                      <div className="toggle-title">Enable LLM Personalization</div>
                      <div className="toggle-sub">Automatically learns about you from your prompts and grounds responses in your profile.</div>
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

                <div className="form-field" style={{ marginTop: "12px" }}>
                  <div className="label-with-badge">
                    <label>Max Token Threshold (Compaction Limit)</label>
                    <span className="token-badge">{maxTokensInput} tokens</span>
                  </div>
                  <input
                    type="number"
                    min="500"
                    max="50000"
                    step="500"
                    className="modal-text-input"
                    value={maxTokensInput}
                    onChange={(e) => handleSaveMaxTokens(e.target.value)}
                  />
                  <p className="field-hint">When <code>user.md</code> exceeds this limit, recursive compaction distillates the profile.</p>
                </div>

                <div className="kg-stats-card" style={{ padding: "10px 14px", margin: "12px 0 6px 0" }}>
                  <div className="kg-stat-item">
                    <span className="kg-stat-number" style={{ fontSize: "1.2rem" }}>
                      {userKnowledgeGraphStats?.totalEntities || 0}
                    </span>
                    <span className="kg-stat-label">User Entities</span>
                  </div>
                  <div className="kg-stat-divider" style={{ height: "24px" }} />
                  <div className="kg-stat-item">
                    <span className="kg-stat-number" style={{ fontSize: "1.2rem" }}>
                      {userKnowledgeGraphStats?.totalRelations || 0}
                    </span>
                    <span className="kg-stat-label">User Relations</span>
                  </div>
                  {Boolean(userKnowledgeGraphStats?.inactiveEntities) && (
                    <>
                      <div className="kg-stat-divider" style={{ height: "24px" }} />
                      <div className="kg-stat-item">
                        <span className="kg-stat-number muted" style={{ fontSize: "1.2rem" }}>
                          {userKnowledgeGraphStats.inactiveEntities}
                        </span>
                        <span className="kg-stat-label">Soft-Deleted</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="form-field" style={{ marginTop: "14px" }}>
                  <div className="label-with-badge">
                    <label>Internal Profile (`user.md`)</label>
                    <span className={`token-badge ${estimatedUserMdTokens > maxTokensInput ? "warning" : ""}`}>
                      ~{estimatedUserMdTokens} / {maxTokensInput} tokens
                    </span>
                  </div>
                  <textarea
                    className="modal-textarea-input font-mono"
                    rows={9}
                    value={userMdText}
                    onChange={(e) => setUserMdText(e.target.value)}
                    placeholder="# User Profile (user.md)"
                  />
                </div>

                <div className="personalization-actions-row">
                  <button className="btn-modal-action" onClick={handleSaveUserMd}>
                    Save user.md
                  </button>
                  <button
                    className="btn-modal-outline"
                    onClick={compactUserProfile}
                    disabled={isCompactingProfile}
                  >
                    <RotateCcw size={14} className={isCompactingProfile ? "spin" : ""} />
                    {isCompactingProfile ? "Compacting Profile..." : "Compact Now"}
                  </button>
                  <button className="btn-modal-danger-outline" onClick={handleResetUserMd}>
                    Reset
                  </button>
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

                {/* RW Permissions Toggle Card */}
                <div className="cloud-sync-toggle-card" style={{ marginBottom: "14px" }}>
                  <div className="toggle-left">
                    <Share2 size={20} className="cloud-icon" />
                    <div>
                      <div className="toggle-title">Allow LLM to Read / Write Knowledge Graph</div>
                      <div className="toggle-sub">Enables Gemma tools (<code>knowledge_search</code>, <code>knowledge_graph_write</code>, <code>knowledge_graph_delete</code>).</div>
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={allowKgReadWrite}
                      onChange={(e) => handleToggleKgReadWrite(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="kg-stats-card">
                  <div className="kg-stat-item">
                    <span className="kg-stat-number">{knowledgeGraphStats?.totalEntities || 0}</span>
                    <span className="kg-stat-label">Active Entities</span>
                  </div>
                  <div className="kg-stat-divider" />
                  <div className="kg-stat-item">
                    <span className="kg-stat-number">{knowledgeGraphStats?.totalRelations || 0}</span>
                    <span className="kg-stat-label">Active Relations</span>
                  </div>
                  {Boolean(knowledgeGraphStats?.inactiveEntities) && (
                    <>
                      <div className="kg-stat-divider" />
                      <div className="kg-stat-item">
                        <span className="kg-stat-number muted">{knowledgeGraphStats.inactiveEntities}</span>
                        <span className="kg-stat-label">Soft-Deleted</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="kg-action-box">
                  <button
                    className="btn-modal-action"
                    style={{
                      background: "linear-gradient(135deg, #4285f4 0%, #9b72cb 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "10px 16px",
                      fontWeight: "600",
                      marginBottom: "6px",
                    }}
                    onClick={() => {
                      handleClose();
                      if (onOpenGraphVisualizer) onOpenGraphVisualizer();
                    }}
                  >
                    <Eye size={16} />
                    Visualize Graph
                  </button>
                  <button
                    className="btn-modal-outline"
                    onClick={reindexKnowledgeGraph}
                    disabled={isExtractingKnowledge || !allowKgReadWrite}
                  >
                    <RotateCcw size={15} className={isExtractingKnowledge ? "spin" : ""} />
                    {isExtractingKnowledge ? "Extracting with Gemma 31B & Google Search..." : "Re-index Graph with Gemma 31B"}
                  </button>
                  <p className="kg-help-note">
                    {allowKgReadWrite
                      ? "Gemma autonomously calls knowledge_graph_write and knowledge_graph_delete (soft-delete with isActive: false) to maintain the graph."
                      : "Knowledge Graph tools are disabled in settings. Enable the switch above to allow model read/write access."}
                  </p>
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
