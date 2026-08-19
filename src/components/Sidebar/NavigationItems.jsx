import React from "react";
import { SquarePen, Search } from "../Icons/index.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function NavigationItems({ collapsed, onOpenSearch }) {
  const { createNewSession } = useChat();

  return (
    <div className="nav-items-section">
      <button
        className="nav-btn new-chat-btn"
        onClick={() => createNewSession()}
        title="New chat"
      >
        <SquarePen size={18} className="nav-icon" />
        {!collapsed && <span>New chat</span>}
      </button>

      <button
        className="nav-btn search-chat-btn"
        onClick={onOpenSearch}
        title="Search chats"
      >
        <Search size={18} className="nav-icon" />
        {!collapsed && <span>Search chats</span>}
      </button>
    </div>
  );
}
