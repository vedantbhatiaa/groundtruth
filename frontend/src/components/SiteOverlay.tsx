import { useEffect, useState } from "react";
import { Site } from "../data/sampleSites";
import { fetchCompanyNews, fetchCompanyFilings, fetchSiteTimeseries, NewsItem, Filing } from "../api/client";
import { fmtMt, fmtPct } from "../utils/format";
import SparkBars from "./SparkBars";

interface Props {
  site: Site | null;
  /** All currently visible sites — used to compute this site's rank and shares. */
  sites: Site[];
  onClose: () => void;
}

export default function SiteOverlay({ site, sites, onClose }: Props) {
  const [newsOpen, setNewsOpen] = useState(false);
  const [filingsOpen, setFilingsOpen] = useState(false);
  const [liveNews, setLiveNews] = useState<NewsItem[] | null>(null);
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [siteYears, setSiteYears] = useState<{ year: number; tons: number }[] | null>(null);

  const genericOwner = /independent operator|unknown|various|national$/i.test(site?.company ?? "");

  useEffect(() => {
    if (!site) return;
    setLiveNews(null);
    setFilings(null);
    if (genericOwner) {
      // "Independent operator" etc. would just query GDELT/EDGAR with noise
      setNewsLoading(false);
      setFilingsLoading(false);
      return;
    }
    setNewsLoading(true);
    setFilingsLoading(true);
    fetchCompanyNews(site.company).then((r) => {
      setLiveNews(r);
      setNewsLoading(false);
    });
    fetchCompanyFilings(site.company).then((r) => {
      setFilings(r);
      setFilingsLoading(false);
    });
  }, [site?.company]);

  useEffect(() => {
    if (!site) return;
    setSiteYears(null);
    fetchSiteTimeseries(site.id).then((rows) => {
      if (rows && rows.length > 0) setSiteYears(rows);
    });
  }, [site?.id]);

  if (!site) return null;

  // Derived analytics against the current view
  const ranked = [...sites].sort((a, b) => (b.co2 ?? 0) - (a.co2 ?? 0));
  const rank = ranked.findIndex((s) => s.id === site.id) + 1;
  const viewTotal = sites.reduce((sum, s) => sum + (s.co2 ?? 0), 0);
  const companySites = sites.filter((s) => s.company === site.company);
  const companyTotal = companySites.reduce((sum, s) => sum + (s.co2 ?? 0), 0);

  const latest = siteYears?.[siteYears.length - 1];
  const prev = siteYears?.[siteYears.length - 2];
  const yoy = latest && prev && prev.tons ? ((latest.tons - prev.tons) / prev.tons) * 100 : null;
  const peak = siteYears?.reduce((best, r) => (r.tons > best.tons ? r : best), siteYears[0]);

  const direction = site.trend.startsWith("+") ? "up" : site.trend.startsWith("-") ? "down" : "";
  const showingLive = liveNews !== null && liveNews.length > 0;
  const newsToShow: { title: string; url: string }[] = showingLive
    ? liveNews!.map((n) => ({ title: n.title, url: n.url }))
    : site.news.map((n) => ({ title: n, url: "" }));

  return (
    <div className="site-overlay open">
      <button className="site-overlay-close" onClick={onClose}>✕</button>
      <div className="site-name display">{site.name}</div>
      <div className="site-sub">{site.company} · {site.sector} · {site.country}</div>
      <div className="site-big display">{fmtMt(site.co2)}<small>CO2e</small></div>
      <div className={`site-delta ${direction}`}>
        {site.trend === "n/a" ? "no baseline data for this window" : `${site.trend} over selected window`}
      </div>
      <SparkBars trendDirection={direction as "up" | "down" | ""} values={siteYears?.map((r) => r.tons)} />

      <div className="mini-kpis">
        {site.asset_type ? (
          <div><span className="mini-kpi-label">Asset type</span><b>{site.asset_type}</b></div>
        ) : null}
        {site.capacity ? (
          <div><span className="mini-kpi-label">Reported capacity</span><b>{site.capacity.toLocaleString()}</b></div>
        ) : null}
        <div><span className="mini-kpi-label">Rank in view</span><b>#{rank} of {sites.length}</b></div>
        <div><span className="mini-kpi-label">Share of view</span><b>{viewTotal ? ((site.co2 / viewTotal) * 100).toFixed(1) : "0"}%</b></div>
        <div><span className="mini-kpi-label">Share of {site.company.split(" ")[0]}</span><b>{companyTotal ? ((site.co2 / companyTotal) * 100).toFixed(1) : "0"}%</b></div>
        <div><span className="mini-kpi-label">YoY change</span><b style={{ color: yoy === null ? undefined : yoy >= 0 ? "var(--red)" : "var(--teal)" }}>{fmtPct(yoy)}</b></div>
        {peak && <div><span className="mini-kpi-label">Peak year</span><b>{peak.year} · {fmtMt(peak.tons)}</b></div>}
      </div>

      <button className="more-toggle" onClick={() => setNewsOpen((o) => !o)}>
        {newsLoading ? "Loading news…" : showingLive ? "Recent news (live)" : "Recent news"}{" "}
        <span>{newsOpen ? "⌄" : "›"}</span>
      </button>
      <div className={`summary-detail ${newsOpen ? "open" : ""}`}>
        {newsToShow.map((n, i) =>
          n.url ? (
            <a key={i} className="news-item" href={n.url} target="_blank" rel="noreferrer"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              {n.title}
            </a>
          ) : (
            <div key={i} className="news-item">{n.title}</div>
          )
        )}
      </div>

      <button className="more-toggle" onClick={() => setFilingsOpen((o) => !o)}>
        {filingsLoading ? "Loading filings…" : "SEC filings"} <span>{filingsOpen ? "⌄" : "›"}</span>
      </button>
      <div className={`summary-detail ${filingsOpen ? "open" : ""}`}>
        {filings && filings.length > 0 ? (
          filings.slice(0, 5).map((f, i) => (
            <div key={i} className="news-item">
              {Array.isArray(f.form_type) ? f.form_type.join(", ") : f.form_type} · filed {f.filed}
            </div>
          ))
        ) : (
          <div className="news-item">
            {filingsLoading ? "…" : "No SEC filings found (non-US companies rarely file with the SEC)."}
          </div>
        )}
      </div>
    </div>
  );
}
