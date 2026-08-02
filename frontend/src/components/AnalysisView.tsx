import { useState } from "react";
import { Site, intensityColor } from "../data/sampleSites";
import { fmtMt } from "../utils/format";

interface Props {
  sites: Site[];
  onBack: () => void;
  onSelectCompany: (company: string) => void;
}

interface CountryAgg {
  country: string;
  totalCo2: number;
  siteCount: number;
  companies: string[];
  sectors: Record<string, number>;
  highShare: number;
}

interface CompanyAgg {
  company: string;
  totalCo2: number;
  siteCount: number;
  countries: string[];
  sectors: Record<string, number>;
  worstIntensity: "high" | "medium" | "low";
  topSiteShare: number;
  capacity: number | null;
}

/** Country-first navigation: countries -> companies in that country ->
    company deep dive. Aggregates are computed from whatever sites are
    currently filtered, so this view always agrees with the map. */
export default function AnalysisView({ sites, onBack, onSelectCompany }: Props) {
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  const byCountry = new Map<string, Site[]>();
  for (const s of sites) {
    if (!byCountry.has(s.country)) byCountry.set(s.country, []);
    byCountry.get(s.country)!.push(s);
  }

  const countries: CountryAgg[] = [...byCountry.entries()]
    .map(([country, list]) => {
      const sectors: Record<string, number> = {};
      for (const s of list) sectors[s.sector] = (sectors[s.sector] ?? 0) + (s.co2 ?? 0);
      return {
        country,
        totalCo2: list.reduce((sum, s) => sum + (s.co2 ?? 0), 0),
        siteCount: list.length,
        companies: [...new Set(list.map((s) => s.company))],
        sectors,
        highShare: (list.filter((s) => s.intensity === "high").length / list.length) * 100,
      };
    })
    .sort((a, b) => b.totalCo2 - a.totalCo2);

  const grandTotal = countries.reduce((sum, c) => sum + c.totalCo2, 0);

  const companiesInCountry: CompanyAgg[] = activeCountry
    ? (() => {
        const list = byCountry.get(activeCountry) ?? [];
        const byCompany = new Map<string, Site[]>();
        for (const s of list) {
          if (!byCompany.has(s.company)) byCompany.set(s.company, []);
          byCompany.get(s.company)!.push(s);
        }
        return [...byCompany.entries()]
          .map(([company, cs]) => {
            const sectors: Record<string, number> = {};
            let worst: "high" | "medium" | "low" = "low";
            let capacity: number | null = null;
            for (const s of cs) {
              sectors[s.sector] = (sectors[s.sector] ?? 0) + (s.co2 ?? 0);
              if (s.intensity === "high" || (s.intensity === "medium" && worst === "low")) worst = s.intensity;
              if (s.capacity != null) capacity = (capacity ?? 0) + Number(s.capacity);
            }
            const total = cs.reduce((sum, s) => sum + (s.co2 ?? 0), 0);
            const top = [...cs].sort((a, b) => (b.co2 ?? 0) - (a.co2 ?? 0))[0];
            return {
              company,
              totalCo2: total,
              siteCount: cs.length,
              countries: [activeCountry],
              sectors,
              worstIntensity: worst,
              topSiteShare: total ? ((top.co2 ?? 0) / total) * 100 : 0,
              capacity,
            };
          })
          .sort((a, b) => b.totalCo2 - a.totalCo2);
      })()
    : [];

  const countryTotal = companiesInCountry.reduce((sum, c) => sum + c.totalCo2, 0);

  if (activeCountry) {
    return (
      <div className="analysis-view an-listing">
        <div className="analysis-header">
          <button className="back-btn" onClick={() => setActiveCountry(null)}>← All countries</button>
          <h2 className="display">{activeCountry}</h2>
          <span className="analysis-sub">
            {companiesInCountry.length} companies · {fmtMt(countryTotal)} CO2e
          </span>
        </div>

        <div className="company-grid">
          {companiesInCountry.map((c) => {
            const share = countryTotal ? (c.totalCo2 / countryTotal) * 100 : 0;
            const topSector = Object.entries(c.sectors).sort(([, a], [, b]) => b - a)[0];
            return (
              <button key={c.company} className="entity-card" onClick={() => onSelectCompany(c.company)}>
                <div className="entity-head">
                  <span className="entity-name">{c.company}</span>
                  <span className="dot-badge" style={{ background: intensityColor[c.worstIntensity] }} />
                </div>
                <div className="entity-value display">{fmtMt(c.totalCo2)}</div>
                <div className="entity-share-track">
                  <i style={{ width: `${share}%` }} />
                </div>
                <div className="entity-meta">
                  <span>{share.toFixed(1)}% of country</span>
                  <span>{c.siteCount} {c.siteCount === 1 ? "site" : "sites"}</span>
                </div>
                <dl className="entity-stats">
                  <div><dt>Main sector</dt><dd>{topSector ? topSector[0] : "—"}</dd></div>
                  <div><dt>Largest site</dt><dd>{c.topSiteShare.toFixed(0)}%</dd></div>
                  {c.capacity != null && (
                    <div><dt>Capacity</dt><dd>{Math.round(c.capacity).toLocaleString()} MW</dd></div>
                  )}
                </dl>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-view an-listing">
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>← Back to map</button>
        <h2 className="display">Analysis by country</h2>
        <span className="analysis-sub">
          {countries.length} countries · {sites.length} sites · {fmtMt(grandTotal)} CO2e in view
        </span>
      </div>

      <div className="country-grid">
        {countries.map((c, rank) => {
          const share = grandTotal ? (c.totalCo2 / grandTotal) * 100 : 0;
          const sectorList = Object.entries(c.sectors).sort(([, a], [, b]) => b - a);
          const sectorMax = sectorList[0]?.[1] ?? 1;
          return (
            <button key={c.country} className="entity-card country" onClick={() => setActiveCountry(c.country)}>
              <div className="entity-head">
                <span className="entity-rank mono">{String(rank + 1).padStart(2, "0")}</span>
                <span className="entity-name">{c.country}</span>
              </div>
              <div className="entity-value display">{fmtMt(c.totalCo2)}</div>
              <div className="entity-share-track">
                <i style={{ width: `${share}%` }} />
              </div>
              <div className="entity-meta">
                <span>{share.toFixed(1)}% of view</span>
                <span>{c.companies.length} {c.companies.length === 1 ? "company" : "companies"}</span>
              </div>
              <div className="mini-sectors">
                {sectorList.slice(0, 4).map(([sector, co2]) => (
                  <div key={sector} className="mini-sector-row">
                    <span>{sector}</span>
                    <div className="mini-sector-track">
                      <i style={{ width: `${(co2 / sectorMax) * 100}%` }} />
                    </div>
                    <span className="mono">{fmtMt(co2)}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
