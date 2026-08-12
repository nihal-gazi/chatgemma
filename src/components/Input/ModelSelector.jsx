import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "../Icons/index.jsx";
import { CONFIG } from "../../config/config.js";
import { useChat } from "../../context/ChatContext.jsx";

export default function ModelSelector() {
  const { settings, updateSettings } = useChat();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeModel =
    CONFIG.models.find((m) => m.id === settings.modelId) || CONFIG.models[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="model-selector-container" ref={dropdownRef}>
      <button
        type="button"
        className="model-pill-trigger"
        onClick={() => setOpen(!open)}
        title="Select Model & Thinking Level"
      >
        <span className="model-name-label">{activeModel.name}</span>
        <ChevronDown size={14} className="chevron-icon" />
      </button>

      {open && (
        <div className="model-dropdown-menu">
          <div className="dropdown-header">Select Model & Reasoning Mode</div>
          {CONFIG.models.map((m) => {
            const isSelected = m.id === activeModel.id;
            return (
              <div
                key={m.id}
                className={`model-option-row ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  updateSettings({ modelId: m.id });
                  setOpen(false);
                }}
              >
                <div className="model-option-left">
                  <div className="model-option-title">{m.name}</div>
                  <div className="model-option-desc">{m.description}</div>
                </div>
                {isSelected && <Check size={16} className="check-icon" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
