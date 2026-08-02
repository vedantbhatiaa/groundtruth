import { useEffect, useState } from "react";
import { Site } from "../data/sampleSites";
import {
  fetchCompanyTimeseries,
  fetchCountryTimeseries,
  CompanyTimeseries,
  CountryStat,
} from "../api/client";
import { fmtMt, fmtPct } from "../utils/format";

interface Props {
  company: string;
  sites: Site[];
  selectedYear: number;
  trendWindow: number;
  onBack: () => void;
  onSelectSite: (site: Site) => void;
}

/** Reads the analysis palette from CSS so charts follow the active theme
    (Deep Gradient in dark, Daylight in light) without duplicating colours. */
function useAnalysisPalette() {
  const [palette, setPalette] = useState<string[]>(["#7af5d0", "#9d8bff", "#ffc46b", "#ff8fc7"]);
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const vals = ["--an-c1", "--an-c2", "--an-c3", "--an-c4"].map((v) => s.getPropertyValue(v).trim());
      if (vals.every(Boolean)) setPalette(vals);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => observer.disconnect();
  }, []);
  return palette;
}

export default function CompanyDetail({
  company,
  sites,
  selectedYear,
  trendWindow,
  onBack,
  onSelectSite,
}: Props) {
  const [series, setSeries] = useState<CompanyTimeseries | null>(null);
  const [countryStats, setCountryStats] = useState<CountryStat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const palette = useAnalysisPalette();

  const companySites = sites.filter((s) => s.company === company);

  useEffect(() => {
    setLoading(true);
    fetchCompanyTimeseries(company, selectedYear - trendWindow, selectedYear).then((r) => {
      setSeries(r);
      setLoading(false);
    });
  }, [company, selectedYear, trendWindow]);

  const primaryCountry = (() => {
    const counts: Record<string, number> = {};
    for (const s of companySites) counts[s.country] = (counts[s.country] ?? 0) + (s.co2 ?? 0);
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  })();
  // Only this company's sites IN that country may be compared against the
  // country's national total — using the global company total produced
  // impossible shares like 230%.
  const inCountryTotal = companySites
    .filter((s) => s.country === primaryCountry)
    .reduce((sum, s) => sum + (s.co2 ?? 0), 0);

  useEffect(() => {
    if (!primaryCountry) return;
    fetchCountryTimeseries(primaryCountry, selectedYear - 40, selectedYear).then(setCountryStats);
  }, [primaryCountry, selectedYear]);

  // ---- derived figures -----------------------------------------------
  const years = series?.years ?? [];
  const maxYear = Math.max(...years.map((y) => y.total), 0.001);
  const latest = years[years.length - 1];
  const prev = years[years.length - 2];
  const first = years[0];
  const yoy = latest && prev && prev.total ? ((latest.total - prev.total) / prev.total) * 100 : null;
  const sinceFirst =
    latest && first && first.total && first.year !== latest.year
      ? ((latest.total - first.total) / first.total) * 100
      : null;

  const viewTotal = sites.reduce((sum, s) => sum + (s.co2 ?? 0), 0);
  const companyTotal = companySites.reduce((sum, s) => sum + (s.co2 ?? 0), 0);
  const countries = [...new Set(companySites.map((s) => s.country))];
  const rankedSites = [...companySites].sort((a, b) => (b.co2 ?? 0) - (a.co2 ?? 0));
  const topSite = rankedSites[0];
  const concentration = topSite && companyTotal ? ((topSite.co2 ?? 0) / companyTotal) * 100 : null;

  const withCapacity = companySites.filter((s) => s.capacity != null);
  const withGeneration = companySites.filter((s) => s.generation_gwh != null);
  const totalCapacity = withCapacity.reduce((sum, s) => sum + Number(s.capacity), 0);
  const totalGeneration = withGeneration.reduce((sum, s) => sum + Number(s.generation_gwh), 0);
  // Intensity is only meaningful when generation data covers a real share
  // of the fleet; one matched site out of 76 produced absurd figures.
  const genCoverage = companySites.length ? withGeneration.length / companySites.length : 0;
  const fleetIntensity =
    totalGeneration > 0 && genCoverage >= 0.25
      ? (withGeneration.reduce((sum, s) => sum + (s.co2 ?? 0), 0) * 1_000_000) / (totalGeneration * 1000)
      : null;
  const oldestYear = companySites
    .map((s) => s.commissioning_year)
    .filter((y): y is number => y != null)
    .sort((a, b) => a - b)[0];

  const sectors = series?.sectors ?? [];
  const sectorTotal = sectors.reduce((sum, s) => sum + s.total, 0);
  const sby = series?.sectors_by_year ?? [];
  const nationalLatest = countryStats?.filter((r) => r.co2 != null).slice(-1)[0];

  // ---- chart geometry -------------------------------------------------
  const W = 560;
  const H = 150;
  const PAD_L = 46;
  const PAD_R = 14;

  const projection = (() => {
    if (years.length < 2) return null;
    const slope = years[years.length - 1].total - years[years.length - 2].total;
    return [1, 2].map((k) => ({
      year: years[years.length - 1].year + k,
      total: Math.max(0, years[years.length - 1].total + slope * k),
    }));
  })();
  const trendAll = projection ? [...years, ...projection] : years;
  const trendMax = Math.max(...trendAll.map((p) => p.total), 0.001);
  const tx = (i: number) => PAD_L + (i / Math.max(1, trendAll.length - 1)) * (W - PAD_L - PAD_R);
  const ty = (v: number) => H - 30 - (v / trendMax) * (H - 52);

  const sectorNames = [...new Set(sby.map((r) => r.sector))];
  const sectorYears = [...new Set(sby.map((r) => r.year))].sort((a, b) => a - b);
  const sbyMax = Math.max(...sby.map((r) => r.total), 0.001);
  const sx = (yr: number) =>
    PAD_L +
    ((yr - sectorYears[0]) / Math.max(1, sectorYears[sectorYears.length - 1] - sectorYears[0])) *
      (W - PAD_L - PAD_R);
  const sy = (v: number) => H - 30 - (v / sbyMax) * (H - 52);

  // Donut geometry
  const R = 46;
  const C = 2 * Math.PI * R;
  let donutOffset = 0;

  return (
    <div className="analysis-view">
      <div className="an-header">
        <button className="an-back" onClick={onBack}>← All companies</button>
        <h2>{company}</h2>
        <span className="an-sub">
          {companySites.length} {companySites.length === 1 ? "site" : "sites"} ·{" "}
          {countries.length} {countries.length === 1 ? "country" : "countries"} · {selectedYear}
        </span>
      </div>

      <div className="an-shell">
        {/* ---------- left rail: identity + composition ---------- */}
        <div className="an-left">
          <div className="an-card an-hero">
            <div className="an-eyebrow">
              {countries.length > 1 ? `${countries.length} countries` : primaryCountry ?? "Global"}
            </div>
            <div className="an-huge">{fmtMt(companyTotal).replace(/ (Gt|Mt)$/, "")}</div>
            <div className="an-unit">
              {fmtMt(companyTotal).split(" ")[1] ?? "Mt"} CO2e · {selectedYear}
            </div>
            {sinceFirst !== null && first && (
              <div className={`an-delta ${sinceFirst >= 0 ? "up" : "down"}`}>
                {sinceFirst >= 0 ? "\u2191" : "\u2193"} {fmtPct(sinceFirst)} since {first.year}
              </div>
            )}
            <div className="an-facts">
              <div className="an-fact"><span>Sites</span><b>{companySites.length}</b></div>
              <div className="an-fact"><span>Countries</span><b>{countries.length}</b></div>
              <div className="an-fact">
                <span>Share of view</span>
                <b>{viewTotal ? ((companyTotal / viewTotal) * 100).toFixed(1) : "0"}%</b>
              </div>
              <div className="an-fact">
                <span>Capacity{withCapacity.length ? ` (${withCapacity.length}/${companySites.length})` : ""}</span>
                <b>{totalCapacity ? `${Math.round(totalCapacity).toLocaleString()} MW` : "\u2014"}</b>
              </div>
              <div className="an-fact">
                <span>Fleet intensity</span>
                <b>{fleetIntensity ? `${fleetIntensity.toFixed(2)} t/MWh` : "insufficient data"}</b>
              </div>
              <div className="an-fact" style={{ borderBottom: "none" }}>
                <span>Oldest asset</span><b>{oldestYear ?? "\u2014"}</b>
              </div>
            </div>
          </div>

          <div className="an-card an-donut-card">
            <div className="an-ct">Sector split · {selectedYear}</div>
            {sectors.length === 0 ? (
              <div className="an-empty">No sector data.</div>
            ) : (
              <div className="an-donut">
                <svg viewBox="0 0 120 120" className="an-donut-svg">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="var(--an-sunk)" strokeWidth="17" />
                  {sectors.map((s, i) => {
                    const frac = sectorTotal ? s.total / sectorTotal : 0;
                    const dash = frac * C;
                    const el = (
                      <circle key={s.sector} cx="60" cy="60" r={R} fill="none"
                        stroke={palette[i % palette.length]} strokeWidth="17"
                        strokeDasharray={`${dash} ${C}`} strokeDashoffset={-donutOffset}
                        transform="rotate(-90 60 60)" />
                    );
                    donutOffset += dash;
                    return el;
                  })}
                  <text x="60" y="57" textAnchor="middle" fontSize="14"
                    style={{ fill: "var(--an-text)", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700 }}>
                    {fmtMt(sectorTotal).split(" ")[0]}
                  </text>
                  <text x="60" y="70" textAnchor="middle" fontSize="8" style={{ fill: "var(--an-faint)" }}>
                    {fmtMt(sectorTotal).split(" ")[1]} CO2e
                  </text>
                </svg>
                <div className="an-dleg">
                  {sectors.map((s, i) => (
                    <div className="an-dleg-row" key={s.sector}>
                      <em style={{ background: palette[i % palette.length] }} />
                      <span style={{ textTransform: "capitalize" }}>{s.sector}</span>
                      <b>{sectorTotal ? ((s.total / sectorTotal) * 100).toFixed(0) : 0}%</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="an-card an-scroll">
            <div className="an-ct">National context {primaryCountry ? `· ${primaryCountry}` : ""}</div>
            {!nationalLatest ? (
              <div className="an-empty">
                No country data loaded. Run <code>python ingestion/load_owid_country.py</code>.
              </div>
            ) : (
              <>
                <div className="an-fact">
                  <span>{primaryCountry} total ({nationalLatest.year})</span>
                  <b>{fmtMt(Number(nationalLatest.co2))}</b>
                </div>
                <div className="an-fact">
                  <span>Share from its {primaryCountry} sites</span>
                  <b>
                    {nationalLatest.co2
                      ? (inCountryTotal / Number(nationalLatest.co2)) * 100 < 0.01
                        ? "<0.01%"
                        : `${((inCountryTotal / Number(nationalLatest.co2)) * 100).toFixed(2)}%`
                      : "\u2014"}
                  </b>
                </div>
                {nationalLatest.co2_per_capita != null && (
                  <div className="an-fact">
                    <span>National per capita</span>
                    <b>{Number(nationalLatest.co2_per_capita).toFixed(2)} t</b>
                  </div>
                )}
                {nationalLatest.share_global_co2 != null && (
                  <div className="an-fact" style={{ borderBottom: "none" }}>
                    <span>Country share of global</span>
                    <b>{Number(nationalLatest.share_global_co2).toFixed(2)}%</b>
                  </div>
                )}
                {countryStats && countryStats.length > 3 && (
                  <svg viewBox="0 0 400 74" className="an-mini-chart">
                    {(() => {
                      const rows = countryStats.filter((r) => r.co2 != null);
                      const mx = Math.max(...rows.map((r) => Number(r.co2)), 0.001);
                      const px = (i: number) => 8 + (i / Math.max(1, rows.length - 1)) * 384;
                      const py = (v: number) => 60 - (v / mx) * 48;
                      return (
                        <>
                          <path
                            d={`${rows.map((r, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(Number(r.co2))}`).join(" ")} L${px(rows.length - 1)},60 L${px(0)},60 Z`}
                            fill="url(#anFill)" />
                          <path d={rows.map((r, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(Number(r.co2))}`).join(" ")}
                            fill="none" stroke="url(#anTrend)" strokeWidth={2} />
                          <text x="8" y="72" style={{ fill: "var(--an-faint)", fontSize: 9 }}>{rows[0].year}</text>
                          <text x="392" y="72" textAnchor="end" style={{ fill: "var(--an-dim)", fontSize: 9 }}>
                            {rows[rows.length - 1].year}
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                )}
              </>
            )}
          </div>
        </div>

        {/* ---------- right: metrics and trends ---------- */}
        <div className="an-right">
          <div className="an-kpis">
            <div>
              <div className="k">YoY change</div>
              <div className={`v ${yoy === null ? "" : yoy >= 0 ? "up" : "down"}`}>{fmtPct(yoy)}</div>
            </div>
            <div>
              <div className="k">{first ? `Since ${first.year}` : "Since start"}</div>
              <div className={`v ${sinceFirst === null ? "" : sinceFirst >= 0 ? "up" : "down"}`}>
                {fmtPct(sinceFirst)}
              </div>
            </div>
            <div>
              <div className="k">Largest site</div>
              <div className="v acc">{concentration ? `${concentration.toFixed(0)}%` : "\u2014"}</div>
            </div>
            <div>
              <div className="k">Avg per site</div>
              <div className="v">{companySites.length ? fmtMt(companyTotal / companySites.length) : "\u2014"}</div>
            </div>
          </div>

          <div className="an-card an-years">
            <div className="an-ct">Emissions by year</div>
            {loading ? (
              <div className="an-empty">Loading\u2026</div>
            ) : years.length === 0 ? (
              <div className="an-empty">No yearly records for this company.</div>
            ) : (
              years.map((y) => (
                <div className="an-hrow" key={y.year}>
                  <span className="an-hyr">{y.year}</span>
                  <div className="an-htrack">
                    <div className={`an-hfill ${y.year === selectedYear ? "on" : ""}`}
                      style={{ width: `${(y.total / maxYear) * 100}%` }} />
                  </div>
                  <span className="an-hval">{fmtMt(y.total)}</span>
                </div>
              ))
            )}
          </div>

          <div className="an-card an-chart-card">
            <div className="an-ct" title="Straight-line extrapolation of the last two years — indicative only">
              Historic trend · linear projection
            </div>
            {years.length < 2 ? (
              <div className="an-empty">Need at least two years of records for a trend.</div>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="an-chart" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="anTrend" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={palette[0]} />
                    <stop offset="60%" stopColor={palette[1]} />
                    <stop offset="100%" stopColor={palette[3]} />
                  </linearGradient>
                  <linearGradient id="anFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette[1]} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={palette[1]} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 0.5, 1].map((f) => (
                  <g key={f}>
                    <line x1={PAD_L} y1={ty(trendMax * f)} x2={W - PAD_R} y2={ty(trendMax * f)}
                      stroke="var(--an-border)" strokeWidth={1} />
                    <text x={PAD_L - 6} y={ty(trendMax * f) + 3} textAnchor="end"
                      style={{ fill: "var(--an-faint)", fontSize: 9 }}>
                      {fmtMt(trendMax * f).replace(" ", "")}
                    </text>
                  </g>
                ))}
                <path d={`${years.map((p, i) => `${i === 0 ? "M" : "L"}${tx(i)},${ty(p.total)}`).join(" ")} L${tx(years.length - 1)},${H - 30} L${tx(0)},${H - 30} Z`}
                  fill="url(#anFill)" />
                <path d={years.map((p, i) => `${i === 0 ? "M" : "L"}${tx(i)},${ty(p.total)}`).join(" ")}
                  fill="none" stroke="url(#anTrend)" strokeWidth={2.5} />
                {projection && (
                  <path d={[years[years.length - 1], ...projection]
                      .map((p, i) => `${i === 0 ? "M" : "L"}${tx(years.length - 1 + i)},${ty(p.total)}`).join(" ")}
                    fill="none" stroke={palette[3]} strokeWidth={2} strokeDasharray="6 5" opacity={0.75} />
                )}
                {years.map((p, i) => (
                  <circle key={p.year} cx={tx(i)} cy={ty(p.total)}
                    r={p.year === selectedYear ? 4.6 : 3.4} fill={palette[0]} />
                ))}
                {trendAll.map((p, i) => (
                  <text key={p.year} x={tx(i)} y={H - 10} textAnchor="middle"
                    style={{ fill: i >= years.length ? "var(--an-faint)" : "var(--an-dim)", fontSize: 10 }}>
                    {p.year}{i >= years.length ? "p" : ""}
                  </text>
                ))}
                {projection && (
                  <text x={W - PAD_R} y={13} textAnchor="end" style={{ fill: palette[3], fontSize: 10 }}>
                    proj. {fmtMt(projection[1].total)}
                  </text>
                )}
              </svg>
            )}
          </div>

          <div className="an-card an-chart-card">
            <div className="an-ct">Emissions by sector over time</div>
            {sectorYears.length < 2 ? (
              <div className="an-empty">Need at least two years of per-sector records.</div>
            ) : (
              <>
                <svg viewBox={`0 0 ${W} ${H}`} className="an-chart" preserveAspectRatio="none">
                  {[0, 0.5, 1].map((f) => (
                    <g key={f}>
                      <line x1={PAD_L} y1={sy(sbyMax * f)} x2={W - PAD_R} y2={sy(sbyMax * f)}
                        stroke="var(--an-border)" strokeWidth={1} />
                      <text x={PAD_L - 6} y={sy(sbyMax * f) + 3} textAnchor="end"
                        style={{ fill: "var(--an-faint)", fontSize: 9 }}>
                        {fmtMt(sbyMax * f).replace(" ", "")}
                      </text>
                    </g>
                  ))}
                  {sectorNames.map((sec, si) => {
                    const pts = sectorYears.map((yr) => {
                      const row = sby.find((r) => r.year === yr && r.sector === sec);
                      return { yr, v: row ? row.total : 0 };
                    });
                    return (
                      <g key={sec}>
                        <path d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.yr)},${sy(p.v)}`).join(" ")}
                          fill="none" stroke={palette[si % palette.length]} strokeWidth={2.3} />
                        {pts.map((p) => (
                          <circle key={p.yr} cx={sx(p.yr)} cy={sy(p.v)}
                            r={p.yr === selectedYear ? 4 : 2.8} fill={palette[si % palette.length]} />
                        ))}
                      </g>
                    );
                  })}
                  {sectorYears.map((yr) => (
                    <text key={yr} x={sx(yr)} y={H - 10} textAnchor="middle"
                      style={{ fill: yr === selectedYear ? "var(--an-text)" : "var(--an-faint)", fontSize: 10 }}>
                      {yr}
                    </text>
                  ))}
                </svg>
                <div className="an-inline-legend">
                  {sectorNames.map((sec, si) => (
                    <span key={sec}>
                      <em style={{ background: palette[si % palette.length] }} />
                      {sec}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="an-card an-sites">
            <div className="an-ct">Sites, ranked by emissions ({rankedSites.length})</div>
            <div className="an-sites-scroll">
              {rankedSites.length === 0 ? (
                <div className="an-empty">No sites in the current view.</div>
              ) : (
                rankedSites.map((s, i) => (
                  <button key={s.id} className="an-rank" onClick={() => onSelectSite(s)}>
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <span className="nm">{s.name} <small>· {s.sector}</small></span>
                    <div className="bar">
                      <i style={{ width: `${topSite?.co2 ? ((s.co2 ?? 0) / topSite.co2) * 100 : 0}%` }} />
                    </div>
                    <span className="vv">
                      {fmtMt(s.co2)}
                      <span style={{ color: "var(--an-faint)", marginLeft: 6 }}>
                        {companyTotal ? (((s.co2 ?? 0) / companyTotal) * 100).toFixed(0) : 0}%
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
