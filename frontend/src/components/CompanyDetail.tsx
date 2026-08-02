import { useEffect, useState } from "react";
import { Site, intensityColor } from "../data/sampleSites";
import { fetchCompanyTimeseries, CompanyTimeseries } from "../api/client";

interface Props {
  company: string;
  sites: Site[];
  onBack: () => void;
  onSelectSite: (site: Site) => void;
}

/** Deep-dive per-company analysis: yearly emissions chart (real records
    from the graph), sector split, and the full site list. */
export default function CompanyDetail({ company, sites, onBack, onSelectSite }: Props) {
  const [series, setSeries] = useState<CompanyTimeseries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCompanyTimeseries(company).then((r) => {
      setSeries(r);
      setLoading(false);
    });
  }, [company]);

  const companySites = sites.filter((s) => s.company === company);
  const years = series?.years ?? [];
  const maxTotal = Math.max(...years.map((y) => y.total), 0.001);
  const sectors = series?.sectors ?? [];
  const maxSector = Math.max(...sectors.map((s) => s.total), 0.001);

  const chartW = 460;
  const chartH = 180;
  const barW = years.length ? (chartW - 40) / years.length - 12 : 0;

  return (
    <div className="analysis-view">
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>
          ← All companies
        </button>
        <h2 className="display">{company}</h2>
        <span className="analysis-sub">
          {companySites.length} sites currently in view
        </span>
      </div>

      <div className="detail-grid">
        <div className="company-card">
          <div className="rail-label" style={{ marginBottom: 10 }}>Emissions by year, M t CO2e</div>
          {loading ? (
            <div className="analysis-sub">Loading…</div>
          ) : years.length === 0 ? (
            <div className="analysis-sub">No yearly records for this company (backend offline or data not loaded).</div>
          ) : (
            <svg viewBox={`0 0 ${chartW} ${chartH + 26}`} style={{ width: "100%" }}>
              {years.map((y, i) => {
                const h = (y.total / maxTotal) * chartH;
                const x = 20 + i * ((chartW - 40) / years.length);
                return (
                  <g key={y.year}>
                    <rect
                      x={x} y={chartH - h} width={barW} height={h} rx={3}
                      fill="var(--teal)" opacity={i === years.length - 1 ? 1 : 0.55}
                    />
                    <text x={x + barW / 2} y={chartH - h - 6} textAnchor="middle"
                      style={{ fill: "var(--text-dim)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                      {y.total}
                    </text>
                    <text x={x + barW / 2} y={chartH + 16} textAnchor="middle"
                      style={{ fill: "var(--text-faint)", fontSize: 10.5 }}>
                      {y.year}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
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
                <span className="sector-bar-value mono">{s.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="company-card" style={{ gridColumn: "1 / -1" }}>
          <div className="rail-label" style={{ marginBottom: 10 }}>Sites</div>
          {companySites.map((s) => (
            <div key={s.id} className="emitter-row" onClick={() => onSelectSite(s)}>
              <span>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: intensityColor[s.intensity], marginRight: 8 }} />
                {s.name} <span style={{ color: "var(--text-faint)" }}>· {s.country} · {s.sector}</span>
              </span>
              <span className="mono">{s.co2}M t</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
