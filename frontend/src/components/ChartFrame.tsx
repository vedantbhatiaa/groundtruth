import { ReactNode, useState } from "react";
import { fmtMt } from "../utils/format";

export interface Point {
  label: string | number;
  value: number;
}

/** Shared y-axis gridlines + labels, so every chart reads against a real
    scale instead of floating bars (the reference dashboards all do this). */
export function YAxis({ max, width, height, pad }: { max: number; width: number; height: number; pad: number }) {
  const ticks = 4;
  return (
    <>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const frac = i / ticks;
        const y = height - pad - frac * (height - pad * 2);
        return (
          <g key={i}>
            <line x1={pad + 30} y1={y} x2={width - 6} y2={y}
              stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            <text x={pad + 26} y={y + 3.5} textAnchor="end"
              style={{ fill: "var(--text-faint)", fontSize: 9.5, fontFamily: "JetBrains Mono, monospace" }}>
              {fmtMt(max * frac).replace(" ", "")}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** Wraps a chart with a hover tooltip that follows the cursor. */
export function HoverLayer({
  children,
  tooltip,
}: {
  children: (setHover: (t: { x: number; y: number; text: string } | null) => void) => ReactNode;
  tooltip?: never;
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  return (
    <div style={{ position: "relative" }}>
      {children(setHover)}
      {hover && (
        <div
          style={{
            position: "absolute", left: `${hover.x}%`, top: `${hover.y}%`,
            transform: "translate(-50%, -125%)", pointerEvents: "none",
            background: "var(--bg-0)", border: "1px solid var(--border-strong)",
            borderRadius: 6, padding: "5px 9px", fontSize: 11.5,
            color: "var(--text)", whiteSpace: "nowrap", zIndex: 5,
            fontFamily: "JetBrains Mono, monospace",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
          }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}
