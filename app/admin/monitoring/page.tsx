"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/src/components/shared/AppShell";
import { createClient } from "@/utils/supabase/client";

interface AgentActivity {
  id: string;
  action: string;
  confidence: number;
  reasoning: string;
  createdAt: string;
  metadata: any;
}

export default function AgentMonitoringPage() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("agent_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (data) setActivities(data as any);
      setLoading(false);
    };

    void fetchActivities();

    // Real-time subscription
    const channel = supabase
      .channel("agent_activities")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_decisions" },
        (payload) => {
          setActivities((prev) => [payload.new as AgentActivity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppShell
      title="Agent Monitoring"
      subtitle="Real-time observability into autonomous decision-making loops."
      showAdminLinks
    >
      <div className="monitoring-container ale-card" style={{ background: "#0a0a0c", color: "#00ff41", fontFamily: "monospace", padding: 20 }}>
        <div className="terminal-header" style={{ borderBottom: "1px solid #1a1a1c", marginBottom: 16, paddingBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>ALE_AGENT_STREAM [v2.0.4]</span>
          <span className="live-indicator">● LIVE</span>
        </div>

        {loading ? (
          <div className="ale-muted">Initializing neural links...</div>
        ) : (
          <div className="activity-list">
            {activities.map((act) => (
              <div key={act.id} className="activity-item" style={{ marginBottom: 16, borderLeft: "2px solid #333", paddingLeft: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.7 }}>
                  <span>[{new Date(act.createdAt).toLocaleTimeString()}] {act.action}</span>
                  <span style={{ color: act.confidence > 0.8 ? "#00ff41" : "#ff9900" }}>
                    CONFIDENCE: {(act.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ marginTop: 4, color: "#fff", fontSize: 14 }}>
                  {act.reasoning}
                </div>
                {act.metadata && (
                  <details style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
                    <summary style={{ cursor: "pointer" }}>View Metadata</summary>
                    <pre style={{ background: "#151518", padding: 8, borderRadius: 4, marginTop: 4, overflowX: "auto" }}>
                      {JSON.stringify(act.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            {activities.length === 0 && <div className="ale-muted">Waiting for lead activity...</div>}
          </div>
        )}
      </div>

      <style jsx>{`
        .live-indicator {
          animation: blink 1.5s infinite;
          color: #ff3e3e;
          font-weight: bold;
        }
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        .activity-item:hover {
          background: rgba(255, 255, 255, 0.03);
          border-left-color: #00ff41 !important;
        }
      `}</style>
    </AppShell>
  );
}
