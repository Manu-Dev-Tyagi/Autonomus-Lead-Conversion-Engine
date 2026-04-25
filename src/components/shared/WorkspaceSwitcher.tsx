"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/src/core/presentation/context/WorkspaceContext";

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, loading, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  if (loading && !currentWorkspace) {
    return <div className="workspace-switcher-loading">Loading...</div>;
  }

  return (
    <div className="workspace-switcher">
      <button 
        className="workspace-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="workspace-avatar">
          {currentWorkspace?.name.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="workspace-name">
          {currentWorkspace?.name || "Select Workspace"}
        </div>
        <div className={`switcher-chevron ${isOpen ? "open" : ""}`}>
          ▼
        </div>
      </button>

      {isOpen && (
        <div className="workspace-switcher-dropdown">
          <div className="dropdown-header">Your Workspaces</div>
          <div className="workspace-list">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className={`workspace-item ${ws.id === currentWorkspace?.id ? "active" : ""}`}
                onClick={() => {
                  void switchWorkspace(ws);
                  setIsOpen(false);
                }}
              >
                <div className="workspace-item-avatar">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="workspace-item-info">
                  <div className="ws-name">{ws.name}</div>
                  <div className="ws-slug">{ws.slug}</div>
                </div>
                {ws.id === currentWorkspace?.id && <div className="active-check">✓</div>}
              </button>
            ))}
          </div>
          <div className="dropdown-footer">
            <button className="add-workspace-btn">
              + Create New Workspace
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .workspace-switcher {
          position: relative;
          font-family: inherit;
        }

        .workspace-switcher-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 200px;
          text-align: left;
        }

        .workspace-switcher-trigger:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .workspace-avatar {
          width: 24px;
          height: 24px;
          background: #0052cc;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
        }

        .workspace-name {
          flex: 1;
          font-weight: 500;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .switcher-chevron {
          font-size: 10px;
          opacity: 0.5;
          transition: transform 0.2s ease;
        }

        .switcher-chevron.open {
          transform: rotate(180deg);
        }

        .workspace-switcher-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 260px;
          background: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          z-index: 1000;
          overflow: hidden;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dropdown-header {
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .workspace-list {
          max-height: 300px;
          overflow-y: auto;
          padding: 4px;
        }

        .workspace-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s ease;
        }

        .workspace-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .workspace-item.active {
          background: rgba(0, 82, 204, 0.1);
        }

        .workspace-item-avatar {
          width: 32px;
          height: 32px;
          background: #333;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .workspace-item.active .workspace-item-avatar {
          background: #0052cc;
        }

        .ws-name {
          font-weight: 500;
          font-size: 14px;
        }

        .ws-slug {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .active-check {
          margin-left: auto;
          color: #0052cc;
          font-weight: bold;
        }

        .dropdown-footer {
          padding: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .add-workspace-btn {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-workspace-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border-color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
