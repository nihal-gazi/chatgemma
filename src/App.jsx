import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar/Sidebar.jsx";
import ChatArea from "./components/Chat/ChatArea.jsx";
import SettingsModal from "./components/Modals/SettingsModal.jsx";
import SearchModal from "./components/Modals/SearchModal.jsx";
import GraphVisualizerModal from "./components/Modals/GraphVisualizerModal.jsx";
import { useChat } from "./context/ChatContext.jsx";
import "./styles/App.css";

export default function App() {
  const { toast, importSynapseFile } = useChat();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [graphVisualizerOpen, setGraphVisualizerOpen] = useState(false);
  const [graphVisualizerMode, setGraphVisualizerMode] = useState("all");

  const handleOpenGraphVisualizer = (mode = "all") => {
    setGraphVisualizerMode(mode);
    setGraphVisualizerOpen(true);
  };

  // Global Drag & Drop for userdat.synapse file
  useEffect(() => {
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith(".synapse") || file.name.endsWith(".json"))) {
        importSynapseFile(file);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <div className="gemini-app-root">
      {/* Sidebar */}
      <Sidebar
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenGraphVisualizer={handleOpenGraphVisualizer}
      />

      {/* Main Chat Interface */}
      <ChatArea
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenGraphVisualizer={handleOpenGraphVisualizer}
      />

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <GraphVisualizerModal
        isOpen={graphVisualizerOpen}
        onClose={() => setGraphVisualizerOpen(false)}
        initialMode={graphVisualizerMode}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`gemini-toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
