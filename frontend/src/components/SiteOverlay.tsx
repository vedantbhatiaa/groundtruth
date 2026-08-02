import { useEffect, useState } from "react";
import { Site } from "../data/sampleSites";
import { fetchCompanyNews, fetchCompanyFilings, fetchSiteTimeseries, NewsItem, Filing } from "../api/client";
import SparkBars from "./SparkBars";

interface Props {
  site: Site | null;
  onClose: () => void;
}

export default function SiteOverlay({ site, onClose }: Props) {
  const [newsOpen, setNewsOpen] = useState(false);
  const [filingsOpen, setFilingsOpen] = useState(false);
  const [liveNews, setLiveNews] = useState<NewsItem[] | null>(null);
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [siteYears, setSiteYears] = useState<number[] | undefined>(undefined);

  // Live lookups fire the moment a site is selected — GDELT for news,
  // SEC EDGAR for filings — instead of static sample text.
  useEffect(() => {
    if (!site) return;
    setLiveNews(null);
    setFilings(null);
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

  // Real yearly emissions for THIS site drive the sparkline
  useEffect(() => {
    if (!site) return;
    setSiteYears(undefined);
    fetchSiteTimeseries(site.id).then((rows) => {
      if (rows && rows.length > 0) setSiteYears(rows.map((r) => r.tons));
    });
  }, [site?.id]);

  if (!site) return null;

  const direction = site.trend.startsWith("+") ? "up" : site.trend.startsWith("-") ? "down" : "";
  const showingLive = liveNews !== null && liveNews.length > 0;
  const newsToShow: { title: string; url: string }[] = showingLive
    ? liveNews!.map((n) => ({ title: n.title, url: n.url }))
    : site.news.map((n) => ({ title: n, url: "" }));

  return (
    <div className="site-overlay open">
      <button className="site-overlay-close" onClick={onClose}>
        ✕
      </button>
      <div className="site-name display">{site.name}</div>
      <div className="site-sub">
        {site.company} · {site.sector} · {site.country}
      </div>
      <div className="site-big display">
        {site.co2}
        <small>M t CO2e</small>
      </div>
      <div className={`site-delta ${direction}`}>
        {site.trend === "n/a" ? "no baseline data for this window" : `${site.trend} over selected window`}
      </div>
      <SparkBars trendDirection={direction as "up" | "down" | ""} values={siteYears} />

      <button className="more-toggle" onClick={() => setNewsOpen((o) => !o)}>
        {newsLoading ? "Loading news…" : showingLive ? "Recent news (live)" : "Recent news"}{" "}
        <span>{newsOpen ? "⌄" : "›"}</span>
      </button>
      <div className={`summary-detail ${newsOpen ? "open" : ""}`}>
        {newsToShow.map((n, i) =>
          n.url ? (
            <a
              key={i}
              className="news-item"
              href={n.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              {n.title}
            </a>
          ) : (
            <div key={i} className="news-item">
              {n.title}
            </div>
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
