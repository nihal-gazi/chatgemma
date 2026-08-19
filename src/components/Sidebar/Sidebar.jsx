import React, { useState } from "react";
import BrandHeader from "./BrandHeader.jsx";
import NavigationItems from "./NavigationItems.jsx";
import RecentsList from "./RecentsList.jsx";
import UserProfile from "./UserProfile.jsx";

export default function Sidebar({
  isOpenMobile,
  onCloseMobile,
  onOpenSettings,
  onOpenSearch,
  onOpenGraphVisualizer,
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {isOpenMobile && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside
        className={`gemini-sidebar ${collapsed ? "collapsed" : ""} ${
          isOpenMobile ? "mobile-open" : ""
        }`}
      >
        <BrandHeader
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          onCloseMobile={onCloseMobile}
        />

        <NavigationItems
          collapsed={collapsed}
          onOpenSearch={() => {
            if (isOpenMobile && onCloseMobile) onCloseMobile();
            onOpenSearch();
          }}
          onOpenGraphVisualizer={(mode) => {
            if (isOpenMobile && onCloseMobile) onCloseMobile();
            if (onOpenGraphVisualizer) onOpenGraphVisualizer(mode);
          }}
        />

        <RecentsList collapsed={collapsed} />

        <UserProfile
          collapsed={collapsed}
          onOpenSettings={() => {
            if (isOpenMobile && onCloseMobile) onCloseMobile();
            onOpenSettings();
          }}
        />
      </aside>
    </>
  );
}
