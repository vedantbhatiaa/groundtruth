import { useMemo } from "react";

interface Props {
  trendDirection?: "up" | "down" | "";
}

export default function SparkBars({ trendDirection = "" }: Props) {
  const bars = useMemo(() => {
    const values = Array.from({ length: 12 }, (_, i) => {
      const base = 30 + Math.sin(i / 2) * 15 + Math.random() * 10;
      const slope = trendDirection === "up" ? i * 2 : trendDirection === "down" ? -i * 1.5 : 0;
      return base + slope;
    });
    const max = Math.max(...values);
    return values.map((v) => Math.max(15, (v / max) * 100));
  }, [trendDirection]);

  return (
    <div className="spark">
      {bars.map((h, i) => (
        <i key={i} style={{ height: `${h.toFixed(0)}%` }} />
      ))}
    </div>
  );
}
