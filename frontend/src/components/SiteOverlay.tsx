import { useState } from "react";
import { Site } from "../data/sampleSites";
import SparkBars from "./SparkBars";

interface Props {
  site: Site | null;
  onClose: () => void;
}

export default function SiteOverlay({ site, onClose }: Props) {
  const [newsOpen, setNewsOpen] = useState(false);

  if (!site) return null;

  const direction = site.trend.startsWith("+") ? "up" : site.trend.startsWith("-") ? "down" : "";

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
      <div className={`site-delta ${direction}`}>{site.trend} over 5 years</div>
      <SparkBars trendDirection={direction as "up" | "down" | ""} />
      <button className="more-toggle" onClick={() => setNewsOpen((o) => !o)}>
        Recent news <span>{newsOpen ? "⌄" : "›"}</span>
      </button>
      <div className={`summary-detail ${newsOpen ? "open" : ""}`}>
        {site.news.map((n, i) => (
          <div key={i} className="news-item">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
