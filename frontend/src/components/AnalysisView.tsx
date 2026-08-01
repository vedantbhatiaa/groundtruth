import { Site, intensityColor } from "../data/sampleSites";
import SparkBars from "./SparkBars";

interface Props {
  sites: Site[];
  onBack: () => void;
}

interface CompanyAgg {
  company: string;
  totalCo2: number;
  siteCount: number;
  countries: string[];
  avgTrend: number;
  sectors: Record<string, number>;
  worstIntensity: "high" | "medium" | "low";
}

// Card-grid company analysis, modeled on the Climate Change Tracker
// reference: aggregates computed live from whatever sites are currently
// filtered — so the filters, search, and this view all stay consistent.
export default function AnalysisView({ sites, onBack }: Props) {
  const byCompany = new Map<string, Site[]>();
  for (const s of sites) {
    if (!byCompany.has(s.company)) byCompany.set(s.company, []);
    byCompany.get(s.company)!.push(s);
  }

  const aggs: CompanyAgg[] = [...byCompany.entries()]
    .map(([company, companySites]) => {
      const sectors: Record<string, number> = {};
      let trendSum = 0;
      let trendCount = 0;
      let worst: "high" | "medium" | "low" = "low";
      for (const s of companySites) {
        sectors[s.sector] = (sectors[s.sector] ?? 0) + s.co2;
        const parsed = parseFloat(s.trend);
        if (!isNaN(parsed)) {
          trendSum += parsed;
          trendCount++;
        }
        if (s.intensity === "high" || (s.intensity === "medium" && worst === "low")) worst = s.intensity;
      }
      return {
        company,
        totalCo2: companySites.reduce((sum, s) => sum + s.co2, 0),
        siteCount: companySites.length,
        countries: [...new Set(companySites.map((s) => s.country))],
        avgTrend: trendCount ? trendSum / trendCount : 0,
        sectors,
        worstIntensity: worst,
      };
    })
    .sort((a, b) => b.totalCo2 - a.totalCo2);

  const maxSectorTotal = Math.max(...aggs.flatMap((a) => Object.values(a.sectors)), 1);

  return (
    <div className="analysis-view">
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to map
        </button>
        <h2 className="display">Company analysis</h2>
        <span className="analysis-sub">
          {aggs.length} companies · {sites.length} sites · computed from current filters
        </span>
      </div>

      <div className="analysis-grid">
        {aggs.map((a) => (
          <div key={a.company} className="company-card">
            <div className="company-card-head">
              <span className="company-name display">{a.company}</span>
              <span
                className="intensity-pill"
                style={{ background: `${intensityColor[a.worstIntensity]}22`, color: intensityColor[a.worstIntensity] }}
              >
                {a.worstIntensity}
              </span>
            </div>
            <div className="company-big display">
              {a.totalCo2.toFixed(1)}
              <small>M t CO2e</small>
            </div>
            <div className="company-meta">
              {a.siteCount} sites · {a.countries.length} {a.countries.length === 1 ? "country" : "countries"} ·{" "}
              <span style={{ color: a.avgTrend >= 0 ? "var(--red)" : "var(--teal)" }}>
                {a.avgTrend >= 0 ? "+" : ""}
                {a.avgTrend.toFixed(1)}% avg trend
              </span>
            </div>
            <SparkBars trendDirection={a.avgTrend > 1 ? "up" : a.avgTrend < -1 ? "down" : ""} />
            <div className="sector-bars">
              {Object.entries(a.sectors)
                .sort(([, x], [, y]) => y - x)
                .map(([sector, co2]) => (
                  <div key={sector} className="sector-bar-row">
                    <span className="sector-bar-label">{sector}</span>
                    <div className="sector-bar-track">
                      <i style={{ width: `${(co2 / maxSectorTotal) * 100}%` }} />
                    </div>
                    <span className="sector-bar-value mono">{co2.toFixed(1)}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
