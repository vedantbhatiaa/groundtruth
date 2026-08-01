interface Props {
  active: boolean;
}

export default function LegendCard({ active }: Props) {
  return (
    <div className={`legend ${active ? "active" : ""}`}>
      <div className="legend-row">
        <div className="legend-dot" style={{ background: "var(--red)" }} />
        High intensity
      </div>
      <div className="legend-row">
        <div className="legend-dot" style={{ background: "var(--amber)" }} />
        Medium intensity
      </div>
      <div className="legend-row">
        <div className="legend-dot" style={{ background: "var(--teal)" }} />
        Low intensity
      </div>
    </div>
  );
}
