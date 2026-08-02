import { useEffect, useState } from "react";
import { fetchCountryTimeseries, CountryStat } from "../api/client";
import { fmtMt } from "../utils/format";
import { YAxis, HoverLayer } from "./ChartFrame";

interface Props {
  country: string;
  onClose: () => void;
}

type Metric = "co2" | "co2_per_capita" | "energy_per_capita" | "share_global_co2";

const METRICS: { value: Metric; label: string; unit: string }[] = [
  { value: "co2", label: "Total CO2", unit: "Mt" },
  { value: "co2_per_capita", label: "CO2 per capita", unit: "t/person" },
  { value: "energy_per_capita", label: "Energy per capita", unit: "kWh/person" },
  { value: "share_global_co2", label: "Share of global CO2", unit: "%" },
];

const RANGES = [
  { label: "30Y", from: 1994 },
  { label: "50Y", from: 1974 },
  { label: "Max", from: 1950 },
];

/** National context alongside site data: decades of history, fuel splits
    that line up with the platform's industries, and per-capita
    denominators site emissions alone can't provide. */
export default function CountryPanel({ country, onClose }: Props) {
  const [stats, setStats] = useState<CountryStat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>("co2");
  const [fromYear, setFromYear] = useState(1994);

  useEffect(() => {
    setLoading(true);
    fetchCountryTimeseries(country, fromYear, 2024).then((r) => {
      setStats(r);
      setLoading(false);
    });
  }, [country, fromYear]);

  const rows = (stats ?? []).filter((r) => r[metric] !== null && r[metric] !== undefined);
  const latest = rows[rows.length - 1];
  const first = rows[0];
  const meta = METRICS.find((m) => m.value === metric)!;
  const maxV = Math.max(...rows.map((r) => Number(r[metric])), 0.001);

  const w = 430;
  const h = 150;
  const pad = 18;
  const x = (i: number) => pad + 34 + (i / Math.max(1, rows.length - 1)) * (w - pad * 2 - 40);
  const y = (v: number) => h - pad - (v / maxV) * (h - pad * 2);

  // Fuel split for the latest year — maps onto the platform's industries
  const split = latest
    ? [
        { label: "Coal", value: latest.coal_co2, color: "var(--red)" },
        { label: "Oil", value: latest.oil_co2, color: "var(--amber)" },
        { label: "Gas", value: latest.gas_co2, color: "var(--teal)" },
        { label: "Cement", value: latest.cement_co2, color: "var(--violet)" },
      ].filter((s) => s.value)
    : [];
  const splitTotal = split.reduce((sum, s) => sum + Number(s.value), 0);

  return (
    <div className="country-panel">
      <button className="site-overlay-close" onClick={onClose}>✕</button>
      <div className="site-name display">{country}</div>
      <div className="site-sub">National context · Our World in Data</div>

      <div className="panel-controls">
        <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
          {METRICS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <div className="segmented small">
          {RANGES.map((r) => (
            <button key={r.label}
              className={fromYear === r.from ? "active" : ""}
              onClick={() => setFromYear(r.from)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="analysis-sub">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="analysis-sub">
          No country data. Run <code>python ingestion/load_owid_country.py</code> to load it.
        </div>
      ) : (
        <>
          <div className="site-big display">
            {metric === "co2" ? fmtMt(Number(latest[metric])) : Number(latest[metric]).toFixed(2)}
            <small>{metric === "co2" ? "CO2" : meta.unit}</small>
          </div>
          <div className="site-sub" style={{ marginTop: -4 }}>
            {first.year}–{latest.year} · {rows.length} years of records
          </div>

          <HoverLayer>
            {(setHover) => (
              <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", marginTop: 8 }}>
                <YAxis max={maxV} width={w} height={h} pad={pad} />
                <path
                  d={rows.map((r, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(Number(r[metric]))}`).join(" ")}
                  fill="none" stroke="var(--teal)" strokeWidth={2.2}
                />
                {rows.map((r, i) => (
                  <circle key={r.year} cx={x(i)} cy={y(Number(r[metric]))} r={rows.length > 40 ? 2 : 3.2}
                    fill="var(--teal)" opacity={0.7}
                    onMouseEnter={() => setHover({
                      x: (x(i) / w) * 100,
                      y: (y(Number(r[metric])) / h) * 100,
                      text: `${r.year}: ${Number(r[metric]).toFixed(2)} ${meta.unit}`,
                    })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }} />
                ))}
              </svg>
            )}
          </HoverLayer>

          {split.length > 0 && (
            <>
              <div className="rail-label" style={{ marginTop: 10, marginBottom: 7 }}>
                Fuel split · {latest.year}
              </div>
              <div className="fuel-bar">
                {split.map((s) => (
                  <i key={s.label}
                    style={{ width: `${(Number(s.value) / splitTotal) * 100}%`, background: s.color }}
                    title={`${s.label}: ${fmtMt(Number(s.value))}`} />
                ))}
              </div>
              <div className="fuel-legend">
                {split.map((s) => (
                  <span key={s.label}>
                    <i style={{ background: s.color }} />
                    {s.label} {((Number(s.value) / splitTotal) * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
