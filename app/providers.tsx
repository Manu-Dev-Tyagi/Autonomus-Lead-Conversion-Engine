"use client";

import { WorkspaceProvider } from "@/src/core/presentation/context/WorkspaceContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      {children}
    </WorkspaceProvider>
  );
}
