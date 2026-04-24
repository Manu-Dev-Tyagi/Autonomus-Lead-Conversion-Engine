export function LeadScoreIndicator({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="ale-muted">-</span>;
  }
  const normalized = Math.max(0, Math.min(100, score));
  const color = normalized >= 75 ? "#00875a" : normalized >= 50 ? "#ff8b00" : "#de350b";
  return (
    <span>
      <strong style={{ color }}>{normalized.toFixed(0)}</strong>
      <span className="ale-muted"> / 100</span>
    </span>
  );
}
