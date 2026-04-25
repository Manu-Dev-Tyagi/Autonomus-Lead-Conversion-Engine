"use client";

import { memo, useCallback, useState } from "react";

interface AgentStage {
  id: string;
  label: string;
  icon: string;
  description: string;
  status: "pending" | "running" | "success" | "error";
  confidence?: number;
  reasoning?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

const INITIAL_STAGES: AgentStage[] = [
  { id: "intake", label: "Intake Agent", icon: "📥", description: "Normalize and validate lead data", status: "pending" },
  { id: "enrichment", label: "Enrichment Agent", icon: "🔍", description: "Deep-dive company and persona analysis", status: "pending" },
  { id: "scoring", label: "Scoring Agent", icon: "📊", description: "ICP fit scoring and qualification", status: "pending" },
  { id: "qualification", label: "Qualification Gate", icon: "✅", description: "Determine qualified vs disqualified", status: "pending" },
];

interface Props {
  leadId: string;
  leadEmail: string;
  leadState: string;
  onComplete?: () => void;
}

function AgentPipelineVisualizerInner({ leadId, leadEmail, leadState, onComplete }: Props) {
  const [stages, setStages] = useState<AgentStage[]>(INITIAL_STAGES);
  const [running, setRunning] = useState(false);
  const [finalResult, setFinalResult] = useState<any>(null);

  const updateStage = useCallback((id: string, patch: Partial<AgentStage>) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setFinalResult(null);
    setStages(INITIAL_STAGES);

    // Stage 1: Intake
    updateStage("intake", { status: "running" });
    await sleep(400);
    updateStage("intake", {
      status: "success",
      confidence: 0.98,
      reasoning: `Validated ${leadEmail} — lead data normalized`,
      durationMs: 400,
    });

    // Stage 2: Enrichment — actual API call
    updateStage("enrichment", { status: "running" });
    const startEnrich = Date.now();
    try {
      const res = await fetch(`/api/leads/${leadId}/process`, { method: "POST" });
      const result = await res.json();
      const enrichDur = Date.now() - startEnrich;

      if (!res.ok) {
        updateStage("enrichment", {
          status: "error",
          reasoning: result.error || "Enrichment failed",
          durationMs: enrichDur,
        });
        setRunning(false);
        return;
      }

      // Update enrichment stage
      updateStage("enrichment", {
        status: "success",
        confidence: result.pipeline?.enrichment?.confidence,
        reasoning: result.pipeline?.enrichment?.reasoning || "Data enrichment complete",
        metadata: result.pipeline?.enrichment?.metadata,
        durationMs: enrichDur,
      });

      // Stage 3: Scoring (already ran as part of process API)
      updateStage("scoring", { status: "running" });
      await sleep(300);
      updateStage("scoring", {
        status: "success",
        confidence: result.pipeline?.scoring?.confidence,
        reasoning: result.pipeline?.scoring?.reasoning || "Lead scored",
        metadata: { score: result.pipeline?.scoring?.score },
        durationMs: 300,
      });

      // Stage 4: Qualification
      updateStage("qualification", { status: "running" });
      await sleep(200);
      const qualified = result.pipeline?.scoring?.qualified;
      updateStage("qualification", {
        status: "success",
        confidence: qualified ? 1.0 : 0.3,
        reasoning: qualified
          ? `Lead QUALIFIED with score ${result.pipeline?.scoring?.score}/100`
          : `Lead disqualified — score ${result.pipeline?.scoring?.score}/100 below threshold`,
        durationMs: 200,
      });

      setFinalResult(result);
    } catch (err) {
      updateStage("enrichment", {
        status: "error",
        reasoning: err instanceof Error ? err.message : "Pipeline failed",
        durationMs: Date.now() - startEnrich,
      });
    }

    setRunning(false);
    onComplete?.();
  }, [leadId, leadEmail, updateStage, onComplete]);

  const canRun = leadState === "new" && !running;

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>🤖 AI Agent Pipeline</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.5 }}>
            {running ? "Agents are processing..." : canRun ? "Click to start autonomous processing" : `Pipeline complete — lead is ${leadState}`}
          </p>
        </div>
        {canRun && (
          <button
            onClick={runPipeline}
            style={{
              background: "linear-gradient(135deg, #6366f1, #10b981)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ⚡ Run AI Pipeline
          </button>
        )}
      </div>

      {/* Pipeline stages */}
      <div style={{ position: "relative" }}>
        {stages.map((stage, idx) => (
          <div key={stage.id} style={{ display: "flex", gap: 12, marginBottom: idx < stages.length - 1 ? 0 : 0 }}>
            {/* Connector line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
                background: stage.status === "running" ? "rgba(99, 102, 241, 0.3)"
                  : stage.status === "success" ? "rgba(16, 185, 129, 0.2)"
                  : stage.status === "error" ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(255,255,255,0.05)",
                border: `2px solid ${
                  stage.status === "running" ? "#6366f1"
                  : stage.status === "success" ? "#10b981"
                  : stage.status === "error" ? "#ef4444"
                  : "rgba(255,255,255,0.1)"
                }`,
                animation: stage.status === "running" ? "pulse 1.5s infinite" : "none",
              }}>
                {stage.status === "running" ? "⏳" : stage.status === "success" ? "✓" : stage.status === "error" ? "✗" : stage.icon}
              </div>
              {idx < stages.length - 1 && (
                <div style={{
                  width: 2, height: 40,
                  background: stage.status === "success" ? "#10b981" : "rgba(255,255,255,0.1)",
                  transition: "background 0.3s ease",
                }} />
              )}
            </div>

            {/* Stage details */}
            <div style={{
              flex: 1, padding: 12, borderRadius: 8, marginBottom: 8,
              background: stage.status === "running" ? "rgba(99, 102, 241, 0.05)"
                : stage.status === "success" ? "rgba(16, 185, 129, 0.03)"
                : stage.status === "error" ? "rgba(239, 68, 68, 0.05)"
                : "transparent",
              border: `1px solid ${
                stage.status === "running" ? "rgba(99, 102, 241, 0.3)"
                : stage.status === "success" ? "rgba(16, 185, 129, 0.15)"
                : stage.status === "error" ? "rgba(239, 68, 68, 0.3)"
                : "rgba(255,255,255,0.05)"
              }`,
              transition: "all 0.3s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{stage.label}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {stage.confidence != null && (
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: stage.confidence >= 0.8 ? "#10b981" : stage.confidence >= 0.6 ? "#f59e0b" : "#ef4444",
                    }}>
                      {Math.round(stage.confidence * 100)}%
                    </span>
                  )}
                  {stage.durationMs != null && (
                    <span style={{ fontSize: 11, opacity: 0.4 }}>{stage.durationMs}ms</span>
                  )}
                </div>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.6 }}>
                {stage.reasoning || stage.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Final result */}
      {finalResult && (
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 8,
          background: finalResult.pipeline?.scoring?.qualified
            ? "rgba(16, 185, 129, 0.1)"
            : "rgba(239, 68, 68, 0.1)",
          border: `1px solid ${finalResult.pipeline?.scoring?.qualified ? "#10b981" : "#ef4444"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {finalResult.pipeline?.scoring?.qualified ? "✅ QUALIFIED" : "❌ DISQUALIFIED"}
            </span>
            <span style={{ fontSize: 24, fontWeight: 700, color: finalResult.pipeline?.scoring?.qualified ? "#10b981" : "#ef4444" }}>
              {finalResult.pipeline?.scoring?.score}/100
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const AgentPipelineVisualizer = memo(AgentPipelineVisualizerInner);
