import { LeadDetailResponse } from "@/lib/types/api";

function prettyPayload(payload: Record<string, unknown>): string {
  const html = payload.html;
  if (typeof html === "string" && html.trim()) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const text = payload.text;
  if (typeof text === "string" && text.trim()) {
    return text;
  }
  const message = payload.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  return JSON.stringify(payload);
}

export function LeadTimeline({
  interactions,
}: {
  interactions: LeadDetailResponse["interactions"];
}) {
  if (interactions.length === 0) {
    return <p>No interactions recorded.</p>;
  }

  return (
    <ul>
      {interactions.map((item) => (
        <li key={item.id} style={{ marginBottom: 14 }}>
          <strong>{item.type}</strong> ({item.outcome ?? "n/a"}) at{" "}
          {new Date(item.createdAt).toLocaleString()}
          <div className="ale-muted" style={{ marginTop: 4 }}>
            {prettyPayload(item.payload)}
          </div>
        </li>
      ))}
    </ul>
  );
}
