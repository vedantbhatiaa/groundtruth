import { DATA_SOURCES, DATA_MIN_YEAR, DATA_MAX_YEAR, sourceRangeLabel } from "../constants";
import { Site } from "../data/sampleSites";

interface Props {
  page: string;
  /** Sites currently loaded — lets these pages state what's really there. */
  sites: Site[];
  /** Every sector present in the graph, from /api/sites/sectors. */
  loadedSectors: string[];
  onBack: () => void;
}

const INDUSTRY_LABELS: Record<string, string> = {
  power: "Power & energy",
  oil: "Oil & gas",
  manufacturing: "Manufacturing",
};

/**
 * These pages describe the platform, so anything factual about coverage is
 * derived from the live data rather than written into prose — otherwise the
 * claims silently go stale every time a loader changes.
 */
export default function InfoPage({ page, sites, loadedSectors, onBack }: Props) {
  const sourcesWithData = DATA_SOURCES.filter((s) => s.value !== "all");

  function renderBody() {
    switch (page) {
      case "methodology":
        return (
          <>
            <p>
              Groundtruth traces emissions to individual physical sites, then links
              those sites to the companies that own them and the countries they sit
              in — a knowledge graph rather than a table, so a question can travel
              from a company to its assets to national context in one query.
            </p>
            <p>
              Emissions come from independent sources that are deliberately kept
              separate rather than merged, because they measure differently:
            </p>
            <ul>
              {sourcesWithData.map((s) => (
                <li key={s.value}>
                  <b>{s.label}</b> — {s.detail}
                  {sourceRangeLabel(s.value) && ` (${sourceRangeLabel(s.value)})`}
                </li>
              ))}
              <li>
                <b>Our World in Data</b> — national emissions, fuel split and
                per-capita intensity back to 1950, used as country context
              </li>
            </ul>
            <p>
              Live context — news via GDELT and regulatory filings via SEC EDGAR —
              is fetched on demand rather than stored, since it expires. The
              assistant reasons over the graph and that live context together.
            </p>
          </>
        );

      case "sectors": {
        const byIndustry = sites.reduce<Record<string, Set<string>>>((acc, s) => {
          const key = (s as any).industry ?? "other";
          (acc[key] ??= new Set()).add(s.sector);
          return acc;
        }, {});
        return (
          <>
            <p>
              {sites.length.toLocaleString()} sites are currently in view across{" "}
              {loadedSectors.length} sectors. Emission records span{" "}
              {DATA_MIN_YEAR}–{DATA_MAX_YEAR}, though coverage varies by source.
            </p>
            {Object.entries(byIndustry).map(([industry, secs]) => (
              <p key={industry}>
                <b>{INDUSTRY_LABELS[industry] ?? industry}</b> —{" "}
                {[...secs].sort().join(", ")}
              </p>
            ))}
            {loadedSectors.length > 0 && (
              <p style={{ opacity: 0.75 }}>
                All sectors present in the database: {[...loadedSectors].sort().join(", ")}.
              </p>
            )}
          </>
        );
      }

      case "news":
        return (
          <>
            <p>
              Site-level news is fetched live from the GDELT Project, which indexes
              global news media in near real time. Select any site on the map and
              its operating company's recent coverage appears in the site card,
              alongside SEC filings where the company reports to the SEC.
            </p>
            <p>
              News is fetched rather than stored: it expires, so caching it would
              create a staleness problem for no analytical gain. Results depend on
              the operator being a real named company — assets recorded under
              generic operators legitimately return nothing.
            </p>
          </>
        );

      case "support":
        return (
          <>
            <p>
              This is a research and portfolio project. Setup is documented in
              <code> docs/setup.md</code> — Neo4j, the ingestion scripts,
              environment variables, and running both servers.
            </p>
            <p>
              If the header shows <b>Offline</b>, the API isn't reachable: start the
              backend with <code>uvicorn app.main:app --reload --port 8000</code>{" "}
              from the <code>backend</code> directory with the virtualenv active.
            </p>
          </>
        );

      case "contact":
        return (
          <p>
            Groundtruth is built and maintained by Vedant Bhatia. Questions,
            suggestions and collaboration are welcome via the project repository at{" "}
            <a href="https://github.com/vedantbhatiaa/groundtruth" target="_blank" rel="noreferrer">
              github.com/vedantbhatiaa/groundtruth
            </a>
            .
          </p>
        );

      case "about":
        return (
          <>
            <p>
              <b>Groundtruth — emissions, traced to source.</b> A GIS and
              knowledge-graph platform for tracing corporate emissions to specific
              physical sites, combining structured emissions data with live news
              and filings, and an assistant that reasons over both.
            </p>
            <p>
              Built with React, FastAPI, Neo4j, ChromaDB and Groq. Every figure
              shown is computed from loaded records — where data is missing, the
              interface says so rather than estimating.
            </p>
          </>
        );

      default:
        return <p>Content coming soon.</p>;
    }
  }

  const TITLES: Record<string, string> = {
    methodology: "Approach and methodology",
    sectors: "Sectors covered",
    news: "News and insights",
    support: "Support",
    contact: "Contact",
    about: "About this project",
  };

  return (
    <div className="info-page">
      <button className="back-btn" onClick={onBack}>
        ← Back to map
      </button>
      <h2 className="display">{TITLES[page] ?? page}</h2>
      {renderBody()}
    </div>
  );
}
