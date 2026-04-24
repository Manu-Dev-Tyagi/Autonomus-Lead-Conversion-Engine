import { LeadState } from "@/lib/types/api";

const STATE_COLOR: Record<LeadState, string> = {
  new: "#0c66e4",
  enriching: "#6554c0",
  enriched: "#5e4db2",
  scoring: "#36b37e",
  qualified: "#00875a",
  disqualified: "#de350b",
  outreach: "#ff8b00",
  replied: "#0065ff",
  booked: "#00875a",
  converted: "#1d7a4f",
  lost: "#ae2a19",
};

export function LeadStateBadge({ state }: { state: LeadState }) {
  return (
    <span className="ale-pill" style={{ backgroundColor: STATE_COLOR[state] }}>
      {state}
    </span>
  );
}
