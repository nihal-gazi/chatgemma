import React, { useState } from "react";
import { Search, X, MessageSquare } from "../Icons/index.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function SearchModal({ isOpen, onClose }) {
  const { sessions, switchSession } = useChat();
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    const titleMatch = s.title.toLowerCase().includes(query.toLowerCase());
    const msgMatch = s.messages.some((m) =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );
    return titleMatch || msgMatch;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card search-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-header">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-modal-input"
            placeholder="Search chats and messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="modal-close-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="search-results-list">
          {filteredSessions.length === 0 ? (
            <div className="no-search-results">No chats matching "{query}"</div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="search-result-item"
                onClick={() => {
                  switchSession(session.id);
                  onClose();
                }}
              >
                <MessageSquare size={16} className="item-icon" />
                <div className="item-details">
                  <div className="item-title">{session.title}</div>
                  <div className="item-meta">
                    {session.messages.length} messages • {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
