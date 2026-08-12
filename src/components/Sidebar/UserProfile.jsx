import React from "react";
import { Settings, LogIn, Download } from "../Icons/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChat } from "../../context/ChatContext.jsx";

export default function UserProfile({ collapsed, onOpenSettings }) {
  const { user, displayName, loginWithGoogle } = useAuth();
  const { exportSynapseFile } = useChat();

  if (collapsed) {
    return (
      <div className="user-profile-container collapsed">
        {/* Settings button above */}
        <button
          className="settings-gear-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        {/* User logo in CIRCLE at absolute bottom (clicking does nothing) */}
        <div className="collapsed-bottom-avatar" title={user ? displayName : "Guest"}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt={displayName} className="user-avatar-img" />
          ) : (
            <div className="user-avatar-fallback">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      {user ? (
        <div className="user-info-row">
          <div className="avatar-wrapper">
            {user.photoURL ? (
              <img src={user.photoURL} alt={displayName} className="user-avatar-img" />
            ) : (
              <div className="user-avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="user-details">
            <div className="user-name">{displayName}</div>
            <div className="user-badge">Pro</div>
          </div>

          <div className="user-profile-actions">
            <button
              className="settings-gear-btn"
              onClick={exportSynapseFile}
              title="Save userdat.synapse"
            >
              <Download size={18} />
            </button>
            <button
              className="settings-gear-btn"
              onClick={onOpenSettings}
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="signin-row">
          <button
            className="btn-google-signin"
            onClick={loginWithGoogle}
            title="Sign in with Google"
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <div className="user-profile-actions">
            <button
              className="settings-gear-btn"
              onClick={exportSynapseFile}
              title="Save userdat.synapse"
            >
              <Download size={18} />
            </button>
            <button
              className="settings-gear-btn"
              onClick={onOpenSettings}
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
