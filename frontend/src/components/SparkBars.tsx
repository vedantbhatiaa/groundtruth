import { useMemo } from "react";

interface Props {
  trendDirection?: "up" | "down" | "";
  /** Real data points. When provided, bars show these values scaled to the
      tallest — no random decoration. */
  values?: number[];
}

export default function SparkBars({ trendDirection = "", values }: Props) {
  const bars = useMemo(() => {
    if (values && values.length > 0) {
      const max = Math.max(...values, 0.001);
      return values.map((v) => Math.max(8, (v / max) * 100));
    }
    const generated = Array.from({ length: 12 }, (_, i) => {
      const base = 30 + Math.sin(i / 2) * 15 + Math.random() * 10;
      const slope = trendDirection === "up" ? i * 2 : trendDirection === "down" ? -i * 1.5 : 0;
      return base + slope;
    });
    const max = Math.max(...generated);
    return generated.map((v) => Math.max(15, (v / max) * 100));
  }, [trendDirection, values ? values.join(",") : ""]);

  return (
    <div className="spark">
      {bars.map((h, i) => (
        <i key={i} style={{ height: `${h.toFixed(0)}%` }} />
      ))}
    </div>
  );
}
