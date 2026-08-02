import { useEffect, useState } from "react";
import { Site, intensityColor } from "../data/sampleSites";
import { fetchCompanyTimeseries, CompanyTimeseries } from "../api/client";
import { YAxis, HoverLayer } from "./ChartFrame";
import { fmtMt, fmtPct } from "../utils/format";

interface Props {
  company: string;
  sites: Site[];
  /** Year currently selected in the filter bar — highlighted in the charts. */
  selectedYear: number;
  /** 5 or 10 — how far back the charts reach. */
  trendWindow: number;
  onBack: () => void;
  onSelectSite: (site: Site) => void;
}

/** Deep-dive per-company analysis: KPI row, yearly emissions chart from
    real graph records, sector split, and the full site list with shares. */
export default function CompanyDetail({ company, sites, selectedYear, trendWindow, onBack, onSelectSite }: Props) {
  const [series, setSeries] = useState<CompanyTimeseries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCompanyTimeseries(company, selectedYear - trendWindow, selectedYear).then((r) => {
      setSeries(r);
      setLoading(false);
    });
  }, [company, selectedYear, trendWindow]);

  const companySites = sites.filter((s) => s.company === company);
  const viewTotal = sites.reduce((sum, s) => sum + (s.co2 ?? 0), 0);
  const companyTotal = companySites.reduce((sum, s) => sum + (s.co2 ?? 0), 0);
  const countries = [...new Set(companySites.map((s) => s.country))];
  const highShare = companySites.length
    ? (companySites.filter((s) => s.intensity === "high").length / companySites.length) * 100
    : 0;

  const years = series?.years ?? [];
  const latest = years[years.length - 1];
  const prev = years[years.length - 2];
  const first = years[0];
  const yoy = latest && prev && prev.total ? ((latest.total - prev.total) / prev.total) * 100 : null;
  const sinceFirst =
    latest && first && first.total && first.year !== latest.year
      ? ((latest.total - first.total) / first.total) * 100
      : null;

  const maxTotal = Math.max(...years.map((y) => y.total), 0.001);
  const sectors = series?.sectors ?? [];
  const maxSector = Math.max(...sectors.map((s) => s.total), 0.001);

  const chartW = 460;
  const chartH = 130;
  const barW = years.length ? (chartW - 40) / years.length - 12 : 0;

  const kpis = [
    { label: "Total in view", value: fmtMt(companyTotal) },
    { label: "Share of current view", value: viewTotal ? `${((companyTotal / viewTotal) * 100).toFixed(1)}%` : "—" },
    { label: "YoY change", value: fmtPct(yoy), color: yoy !== null ? (yoy >= 0 ? "var(--red)" : "var(--teal)") : undefined },
    { label: first && latest ? `Since ${first.year}` : "Since first year", value: fmtPct(sinceFirst), color: sinceFirst !== null ? (sinceFirst >= 0 ? "var(--red)" : "var(--teal)") : undefined },
    { label: "Sites", value: String(companySites.length) },
    { label: "Countries", value: String(countries.length) },
    { label: "High-intensity sites", value: `${highShare.toFixed(0)}%` },
    { label: "Avg per site", value: companySites.length ? fmtMt(companyTotal / companySites.length) : "—" },
  ];

  return (
    <div className="analysis-view">
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>
          ← All companies
        </button>
        <h2 className="display">{company}</h2>
        <span className="analysis-sub">{companySites.length} sites currently in view</span>
      </div>

      <div className="kpi-row">
        {kpis.map((k) => (
          <div key={k.label} className="kpi-box">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value display" style={k.color ? { color: k.color } : undefined}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="company-card">
          <div className="rail-label" style={{ marginBottom: 10 }}>Emissions by year</div>
          {loading ? (
            <div className="analysis-sub">Loading…</div>
          ) : years.length === 0 ? (
            <div className="analysis-sub">No yearly records (backend offline or data not loaded).</div>
          ) : (
            <HoverLayer>
              {(setHover) => (
                <svg viewBox={`0 0 ${chartW} ${chartH + 26}`} style={{ width: "100%" }}>
                  <YAxis max={maxTotal} width={chartW} height={chartH} pad={14} />
                  {years.map((y, i) => {
                    const h = (y.total / maxTotal) * (chartH - 28);
                    const slot = (chartW - 60) / years.length;
                    const x = 54 + i * slot;
                    const bw = Math.min(barW, slot - 10);
                    const isSelected = y.year === selectedYear;
                    return (
                      <g key={y.year}
                        onMouseEnter={() => setHover({
                          x: ((x + bw / 2) / chartW) * 100,
                          y: ((chartH - 14 - h) / (chartH + 26)) * 100,
                          text: `${y.year}: ${fmtMt(y.total)} CO2e`,
                        })}
                        onMouseLeave={() => setHover(null)}
                        style={{ cursor: "pointer" }}>
                        <rect x={x} y={chartH - 14 - h} width={bw} height={h} rx={3}
                          fill={isSelected ? "var(--teal)" : "var(--teal)"}
                          opacity={isSelected ? 1 : 0.45} />
                        <text x={x + bw / 2} y={chartH + 12} textAnchor="middle"
                          style={{ fill: isSelected ? "var(--text)" : "var(--text-faint)",
                                   fontSize: 10.5, fontWeight: isSelected ? 600 : 400 }}>
                          {y.year}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </HoverLayer>
          )}
        </div>

        <div className="company-card">
          <div className="rail-label" style={{ marginBottom: 10 }}>Historic trend and projection</div>
          {years.length >= 2 ? (
            (() => {
              const w = 460, h = 130, pad = 22;
              const lastIdx = years.length - 1;
              const slope = years[lastIdx].total - years[lastIdx - 1].total;
              const projected = [1, 2].map((k) => ({
                year: years[lastIdx].year + k,
                total: Math.max(0, years[lastIdx].total + slope * k),
              }));
              const all = [...years, ...projected];
              const maxV = Math.max(...all.map((p) => p.total), 0.001);
              const x = (i: number) => pad + (i / (all.length - 1)) * (w - pad * 2);
              const y = (v: number) => h - pad - (v / maxV) * (h - pad * 2);
              const solid = years.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.total)}`).join(" ");
              const dashed = [years[lastIdx], ...projected]
                .map((p, i) => `${i === 0 ? "M" : "L"}${x(lastIdx + i)},${y(p.total)}`)
                .join(" ");
              return (
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%" }}>
                  <path d={solid} fill="none" stroke="var(--amber)" strokeWidth={2.5} />
                  <path d={dashed} fill="none" stroke="var(--amber)" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} />
                  {years.map((p, i) => (
                    <circle key={p.year} cx={x(i)} cy={y(p.total)} r={3.2} fill="var(--amber)" />
                  ))}
                  {all.map((p, i) => (
                    <text key={p.year} x={x(i)} y={h - 6} textAnchor="middle"
                      style={{ fill: i > lastIdx ? "var(--text-faint)" : "var(--text-dim)", fontSize: 10 }}>
                      {String(p.year).slice(2)}
                    </text>
                  ))}
                  <text x={x(all.length - 1)} y={y(projected[1].total) - 8} textAnchor="end"
                    style={{ fill: "var(--text-dim)", fontSize: 10.5, fontFamily: "JetBrains Mono, monospace" }}>
                    proj. {fmtMt(projected[1].total)}
                  </text>
                </svg>
              );
            })()
          ) : (
            <div className="analysis-sub">Need at least two years of records for a trend.</div>
          )}
        </div>

        <div className="company-card">
          <div className="rail-label" style={{ marginBottom: 10 }}>Emissions by sector over time</div>
          {(() => {
            const sby = series?.sectors_by_year ?? [];
            if (sby.length === 0) return <div className="analysis-sub">{loading ? "Loading…" : "No per-sector series."}</div>;
            const sectorNames = [...new Set(sby.map((r) => r.sector))];
            const yearNums = [...new Set(sby.map((r) => r.year))].sort((a, b) => a - b);
            if (yearNums.length < 2) return <div className="analysis-sub">Only one year of records.</div>;
            const palette = ["var(--teal)", "var(--violet)", "var(--amber)", "var(--red)", "#7fb4ff", "#c9f27f"];
            const w = 460, h = 130, pad = 22;
            const maxV = Math.max(...sby.map((r) => r.total), 0.001);
            const x = (yr: number) => pad + ((yr - yearNums[0]) / (yearNums[yearNums.length - 1] - yearNums[0])) * (w - pad * 2);
            const y = (v: number) => h - pad - (v / maxV) * (h - pad * 2);
            return (
              <>
                <HoverLayer>
                  {(setHover) => (
                    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%" }}>
                      <YAxis max={maxV} width={w} height={h} pad={pad} />
                      {sectorNames.map((sec, si) => {
                        const pts = yearNums.map((yr) => {
                          const row = sby.find((r) => r.year === yr && r.sector === sec);
                          return { yr, v: row ? row.total : 0 };
                        });
                        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.yr)},${y(p.v)}`).join(" ");
                        return (
                          <g key={sec}>
                            <path d={path} fill="none" stroke={palette[si % palette.length]} strokeWidth={2.2} />
                            {pts.map((p) => (
                              <circle key={p.yr} cx={x(p.yr)} cy={y(p.v)} r={4}
                                fill={palette[si % palette.length]}
                                opacity={p.yr === selectedYear ? 1 : 0.35}
                                onMouseEnter={() => setHover({
                                  x: (x(p.yr) / w) * 100,
                                  y: (y(p.v) / h) * 100,
                                  text: `${sec} ${p.yr}: ${fmtMt(p.v)}`,
                                })}
                                onMouseLeave={() => setHover(null)}
                                style={{ cursor: "pointer" }} />
                            ))}
                          </g>
                        );
                      })}
                      {yearNums.map((yr) => (
                        <text key={yr} x={x(yr)} y={h - 6} textAnchor="middle"
                          style={{ fill: yr === selectedYear ? "var(--text)" : "var(--text-faint)", fontSize: 10 }}>
                          {String(yr).slice(2)}
                        </text>
                      ))}
                    </svg>
                  )}
                </HoverLayer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
                  {sectorNames.map((sec, si) => (
                    <span key={sec} style={{ fontSize: 11, color: "var(--text-dim)" }}>
                      <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2,
                        background: palette[si % palette.length], marginRight: 5 }} />
                      {sec}
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        <div className="company-card">
          <div className="rail-label" style={{ marginBottom: 10 }}>Latest-year split by sector</div>
          <div className="sector-bars">
            {sectors.length === 0 && !loading && <div className="analysis-sub">No sector data.</div>}
            {sectors.map((s) => (
              <div key={s.sector} className="sector-bar-row">
                <span className="sector-bar-label">{s.sector}</span>
                <div className="sector-bar-track">
                  <i style={{ width: `${(s.total / maxSector) * 100}%` }} />
                </div>
                <span className="sector-bar-value mono">{fmtMt(s.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="company-card sites-scroll" style={{ gridColumn: "1 / -1" }}>
          <div className="rail-label" style={{ marginBottom: 10 }}>Sites, with share of company total</div>
          {[...companySites].sort((a, b) => b.co2 - a.co2).map((s) => (
            <div key={s.id} className="emitter-row" onClick={() => onSelectSite(s)}>
              <span>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: intensityColor[s.intensity], marginRight: 8 }} />
                {s.name} <span style={{ color: "var(--text-faint)" }}>· {s.country} · {s.sector}</span>
              </span>
              <span className="mono">
                {fmtMt(s.co2)}
                <span style={{ color: "var(--text-faint)", marginLeft: 8 }}>
                  {companyTotal ? ((s.co2 / companyTotal) * 100).toFixed(1) : "0"}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
