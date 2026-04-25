"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  tenantId: string;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  switchWorkspace: (workspace: Workspace) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = async () => {
    setLoading(true);
    try {
      // Fetch user's workspaces
      const res = await fetch("/api/workspace/memberships");
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
      
      // Select the first one or the one from storage/claim
      if (data.workspaces?.length > 0) {
        const savedSlug = localStorage.getItem("current_workspace_slug");
        const found = data.workspaces.find((w: Workspace) => w.slug === savedSlug) || data.workspaces[0];
        setCurrentWorkspace(found);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces", error);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (workspace: Workspace) => {
    setLoading(true);
    try {
      // Call switch API to update JWT claims/session
      await fetch("/api/workspace/switch", {
        method: "POST",
        body: JSON.stringify({ tenantId: workspace.tenantId }),
      });
      
      setCurrentWorkspace(workspace);
      localStorage.setItem("current_workspace_slug", workspace.slug);
      
      // Force reload or router refresh to pick up new claims
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch workspace", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshWorkspaces();
  }, []);

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, workspaces, loading, switchWorkspace, refreshWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
