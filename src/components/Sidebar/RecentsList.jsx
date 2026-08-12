import React, { useState } from "react";
import { Trash2, Pencil, Check } from "../Icons/index.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function RecentsList({ collapsed }) {
  const { sessions, activeSessionId, switchSession, deleteSession, renameSession } = useChat();
  const [hoveredId, setHoveredId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  if (collapsed) return null;

  const startRename = (session, e) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title || "Untitled Chat");
  };

  const handleSaveRename = (sessionId, e) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      renameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (sessionId, e) => {
    if (e.key === "Enter") {
      handleSaveRename(sessionId, e);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div className="recents-container">
      <div className="recents-heading">Recents</div>
      <div className="recents-list">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const isHovered = hoveredId === session.id;
          const isEditing = editingId === session.id;

          return (
            <div
              key={session.id}
              className={`recent-item ${isActive ? "active" : ""}`}
              onClick={() => !isEditing && switchSession(session.id)}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {isEditing ? (
                <div className="recent-rename-box" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    className="recent-rename-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(session.id, e)}
                    autoFocus
                  />
                  <button
                    className="item-action-btn check-btn"
                    onClick={(e) => handleSaveRename(session.id, e)}
                    title="Save title"
                  >
                    <Check size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="recent-title"
                    title={session.title}
                    onDoubleClick={(e) => startRename(session, e)}
                  >
                    {session.title || "Untitled Chat"}
                  </span>

                  <div className="recent-actions">
                    {isHovered && (
                      <>
                        <button
                          className="item-action-btn edit-title-btn"
                          onClick={(e) => startRename(session, e)}
                          title="Rename Chat"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="item-action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this chat?")) {
                              deleteSession(session.id);
                            }
                          }}
                          title="Delete Chat"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
