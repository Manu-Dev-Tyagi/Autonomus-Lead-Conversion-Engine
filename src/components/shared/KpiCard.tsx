import { ReactNode } from "react";

export function KpiCard(props: { label: string; value: ReactNode; hint?: string }) {
  return (
    <article className="ale-card" style={{ minWidth: 180, flex: 1 }}>
      <p className="ale-muted" style={{ marginTop: 0 }}>
        {props.label}
      </p>
      <p style={{ fontSize: 24, margin: "4px 0 0 0", fontWeight: 700 }}>{props.value}</p>
      {props.hint ? (
        <p className="ale-muted" style={{ marginBottom: 0, marginTop: 8 }}>
          {props.hint}
        </p>
      ) : null}
    </article>
  );
}
