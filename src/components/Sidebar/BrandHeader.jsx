import React from "react";
import { PanelLeftClose, PanelLeft, X } from "../Icons/index.jsx";

export default function BrandHeader({ collapsed, onToggleCollapse, onCloseMobile }) {
  return (
    <div className={`sidebar-brand-header ${collapsed ? "collapsed" : ""}`}>
      {!collapsed ? (
        <>
          <div className="brand-title-group">
            <svg className="sparkle-logo" viewBox="0 0 24 24" width="22" height="22">
              <defs>
                <linearGradient id="geminiSparkle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="35%" stopColor="#9B72CB" />
                  <stop offset="70%" stopColor="#D96570" />
                  <stop offset="100%" stopColor="#F2A83B" />
                </linearGradient>
              </defs>
              <path
                fill="url(#geminiSparkle)"
                d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
              />
            </svg>
            <span className="brand-text">ChatGemma</span>
          </div>

          <div className="sidebar-brand-actions">
            {/* Desktop collapse button */}
            <button
              className="collapse-btn desktop-only"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>

            {/* Mobile close button (Image 2 style) */}
            {onCloseMobile && (
              <button
                className="collapse-btn mobile-close-btn"
                onClick={onCloseMobile}
                title="Close drawer"
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </>
      ) : (
        <button
          className="collapsed-brand-btn"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <svg className="sparkle-logo normal-logo" viewBox="0 0 24 24" width="22" height="22">
            <defs>
              <linearGradient id="geminiSparkleCollapsed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="35%" stopColor="#9B72CB" />
                <stop offset="70%" stopColor="#D96570" />
                <stop offset="100%" stopColor="#F2A83B" />
              </linearGradient>
            </defs>
            <path
              fill="url(#geminiSparkleCollapsed)"
              d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
            />
          </svg>
          <PanelLeft size={20} className="hover-expand-icon" />
        </button>
      )}
    </div>
  );
}
