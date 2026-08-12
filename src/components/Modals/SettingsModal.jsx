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
  Sliders,
  Terminal,
  FileText,
  Trash2,
  Check
} from "../Icons/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChat } from "../../context/ChatContext.jsx";
import { runPythonCode, isPyodideLoaded } from "../../services/pyodideRunner.js";

export default function SettingsModal({ isOpen, onClose }) {
  const { user, displayName, customDisplayName, updateDisplayName, loginWithGoogle, logout } =
    useAuth();
  const {
    settings,
    updateSettings,
    exportSynapseFile,
    importSynapseFile,
    kHistory,
    updateKHistory,
    scratchPad,
    updateScratchPad,
    globalKG,
    userKG,
    kgVersion,
    downloadGraphJson,
    clearKnowledgeGraph,
    showToast,
  } = useChat();

  const [activeTab, setActiveTab] = useState("profile");
  const [nameInput, setNameInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || "");
  const [cloudSync, setCloudSync] = useState(Boolean(settings.cloudSyncEnabled));
  const [kHistoryInput, setKHistoryInput] = useState(kHistory || 100);
  const [scratchPadInput, setScratchPadInput] = useState(scratchPad || "");
  const [pyodideStatus, setPyodideStatus] = useState("idle");
  const [pyodideTestOutput, setPyodideTestOutput] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setNameInput(customDisplayName || user?.displayName || "");
      setApiKeyInput(settings.apiKey || "");
      setCloudSync(Boolean(settings.cloudSyncEnabled));
      setKHistoryInput(kHistory !== undefined ? kHistory : 100);
      setScratchPadInput(scratchPad || "");
    }
  }, [isOpen, customDisplayName, user?.displayName, settings, kHistory, scratchPad]);

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
    updateSettings({
      apiKey: apiKeyInput.trim(),
    });
    showToast("API settings saved!", "success");
  };

  const handleSaveAdvanced = () => {
    updateKHistory(kHistoryInput);
    updateScratchPad(scratchPadInput);
    showToast("Advanced settings updated!", "success");
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

  const handleTestPyodide = async () => {
    setPyodideStatus("running");
    setPyodideTestOutput("Initializing Pyodide WebAssembly runtime...");
    try {
      const res = await runPythonCode(`import sys\nprint("Hello from Pyodide Python " + sys.version.split()[0] + " in browser!")\nprint(f"2**64 = {2**64}")`);
      setPyodideStatus("success");
      setPyodideTestOutput(res.output || res.error);
    } catch (err) {
      setPyodideStatus("error");
      setPyodideTestOutput(`Error: ${err.message}`);
    }
  };

  const globalStats = globalKG ? globalKG.getStats() : { nodeCount: 0, semanticEdgesCount: 0, causalEdgesCount: 0, chronicEdgesCount: 0 };
  const userStats = userKG ? userKG.getStats() : { nodeCount: 0, semanticEdgesCount: 0, causalEdgesCount: 0, chronicEdgesCount: 0 };

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
            <button
              className={`settings-tab-btn ${activeTab === "advanced" ? "active" : ""}`}
              onClick={() => setActiveTab("advanced")}
            >
              <Sliders size={16} />
              <span>Advanced</span>
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
                      <div className="toggle-sub">Automatically backup chat state and knowledge graphs to cloud.</div>
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

            {/* ADVANCED TAB */}
            {activeTab === "advanced" && (
              <div className="tab-pane advanced-tab-pane">
                <h3>Advanced Engine & Knowledge Graphs</h3>
                <p className="tab-desc">Configure context window truncation, knowledge graphs, scratch pad, and Pyodide.</p>

                {/* K_history Truncation */}
                <div className="advanced-section-card">
                  <h4>Context Truncation (K_history)</h4>
                  <p className="field-sub">Maximum latest messages sent in generation context payload (default: 100).</p>
                  <div className="k-history-row">
                    <input
                      type="number"
                      min="5"
                      max="1000"
                      className="modal-text-input k-input"
                      value={kHistoryInput}
                      onChange={(e) => setKHistoryInput(parseInt(e.target.value, 10) || 100)}
                    />
                    <button className="btn-modal-action" onClick={handleSaveAdvanced}>
                      Save K_history
                    </button>
                  </div>
                </div>

                {/* Global Knowledge Graph */}
                <div className="advanced-section-card">
                  <div className="kg-header-row">
                    <h4>Global Knowledge Graph</h4>
                    <span className="kg-stats-pill">
                      {globalStats.nodeCount} Nodes · {globalStats.semanticEdgesCount} Semantic · {globalStats.causalEdgesCount} Causal · {globalStats.chronicEdgesCount} Chronic
                    </span>
                  </div>
                  <p className="field-sub">Download multi-view JSON graphs for general facts stored by the model.</p>
                  <div className="kg-download-grid">
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("global", "all")}>
                      <Download size={13} /> Full Graph JSON
                    </button>
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("global", "semantic")}>
                      <Download size={13} /> Semantic View
                    </button>
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("global", "causal")}>
                      <Download size={13} /> Causal View
                    </button>
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("global", "chronic")}>
                      <Download size={13} /> Chronic View
                    </button>
                  </div>
                  <button className="btn-kg-clear" onClick={() => clearKnowledgeGraph("global")}>
                    <Trash2 size={13} /> Clear Global Graph
                  </button>
                </div>

                {/* User Knowledge Graph */}
                <div className="advanced-section-card">
                  <div className="kg-header-row">
                    <h4>User Knowledge Graph</h4>
                    <span className="kg-stats-pill">
                      {userStats.nodeCount} Nodes · {userStats.semanticEdgesCount} Semantic · {userStats.causalEdgesCount} Causal · {userStats.chronicEdgesCount} Chronic
                    </span>
                  </div>
                  <p className="field-sub">Download multi-view JSON graphs storing personal user persona and preferences.</p>
                  <div className="kg-download-grid">
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("user", "all")}>
                      <Download size={13} /> Full Graph JSON
                    </button>
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("user", "semantic")}>
                      <Download size={13} /> Semantic View
                    </button>
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("user", "causal")}>
                      <Download size={13} /> Causal View
                    </button>
                    <button className="btn-kg-download" onClick={() => downloadGraphJson("user", "chronic")}>
                      <Download size={13} /> Chronic View
                    </button>
                  </div>
                  <button className="btn-kg-clear" onClick={() => clearKnowledgeGraph("user")}>
                    <Trash2 size={13} /> Clear User Graph
                  </button>
                </div>

                {/* Scratch Pad */}
                <div className="advanced-section-card">
                  <div className="kg-header-row">
                    <h4>Persistent Scratch Pad</h4>
                    <span className="kg-stats-pill">{scratchPadInput.length} chars</span>
                  </div>
                  <p className="field-sub">Forwarded into the system context on subsequent user prompts.</p>
                  <textarea
                    className="scratchpad-textarea"
                    value={scratchPadInput}
                    onChange={(e) => setScratchPadInput(e.target.value)}
                    rows={4}
                    placeholder="Scratch pad is currently empty..."
                  />
                  <div className="btn-row">
                    <button className="btn-modal-action" onClick={handleSaveAdvanced}>
                      Update Scratch Pad
                    </button>
                    <button
                      className="btn-modal-outline"
                      onClick={() => {
                        setScratchPadInput("");
                        updateScratchPad("");
                        showToast("Scratch pad cleared.", "info");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Pyodide Code Sandbox */}
                <div className="advanced-section-card">
                  <div className="kg-header-row">
                    <h4>Pyodide WebAssembly Python Runtime</h4>
                    <span className={`pyodide-status-badge ${isPyodideLoaded() ? "ready" : ""}`}>
                      {isPyodideLoaded() ? "Loaded" : "On-Demand"}
                    </span>
                  </div>
                  <p className="field-sub">Runs client-side Python for the <code>run_code</code> tool.</p>
                  <button
                    className="btn-modal-outline"
                    onClick={handleTestPyodide}
                    disabled={pyodideStatus === "running"}
                  >
                    <Terminal size={14} /> {pyodideStatus === "running" ? "Running Test..." : "Test Python Runtime"}
                  </button>
                  {pyodideTestOutput && (
                    <pre className="pyodide-test-console">
                      <code>{pyodideTestOutput}</code>
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
