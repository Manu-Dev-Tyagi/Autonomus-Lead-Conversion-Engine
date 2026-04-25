"use client";

import { memo, useCallback, useRef, useState } from "react";

interface CampaignOption {
  id: string;
  name: string;
  status: string;
  targetIndustries: string[];
  targetTitles: string[];
}

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
}

function CampaignSelectorInner({ selected, onChange }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const didMount = useRef(false);

  if (!didMount.current) {
    didMount.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json();
        setCampaigns(
          (data.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            targetIndustries: c.config?.targeting?.industries || [],
            targetTitles: c.config?.targeting?.titles || [],
          }))
        );
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }

  const toggle = useCallback((id: string) => {
    onChange(
      selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]
    );
  }, [selected, onChange]);

  if (loading) return <div style={{ fontSize: 12, opacity: 0.5 }}>Loading campaigns...</div>;
  if (campaigns.length === 0) return <div style={{ fontSize: 12, opacity: 0.5 }}>No campaigns available. Create one first.</div>;

  return (
    <div>
      <span style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>
        Enroll in Campaigns (optional)
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {campaigns.map(c => {
          const isSelected = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: `1px solid ${isSelected ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
                background: isSelected ? "rgba(99, 102, 241, 0.15)" : "rgba(255,255,255,0.03)",
                color: isSelected ? "#a5b4fc" : "inherit",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isSelected ? 600 : 400,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isSelected ? "✓" : "○"} {c.name}
              <span style={{
                fontSize: 10, padding: "1px 5px", borderRadius: 3,
                background: c.status === "active" ? "#10b981" : "#555",
                color: "white",
              }}>
                {c.status}
              </span>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.4 }}>
          {selected.length} campaign{selected.length > 1 ? "s" : ""} selected — lead will receive outreach sequences from each
        </p>
      )}
    </div>
  );
}

export const CampaignSelector = memo(CampaignSelectorInner);
