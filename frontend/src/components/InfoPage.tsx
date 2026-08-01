interface Props {
  page: string;
  onBack: () => void;
}

const CONTENT: Record<string, { title: string; body: string }> = {
  methodology: {
    title: "Approach and methodology",
    body: "Groundtruth combines asset-level emissions data (modeled on Climate TRACE's approach of tracing emissions to specific facilities via satellite and ground observation) with a knowledge graph linking companies, sites, countries, and emission records. Live context — news via GDELT and regulatory filings via SEC EDGAR — is fetched on demand and linked to the same entities, so structured and unstructured evidence stay connected.",
  },
  sectors: {
    title: "Sectors covered",
    body: "Currently loaded: power and energy (coal, gas, solar generation), oil and gas (upstream extraction, gas processing), and manufacturing (steel, cement, aluminum). Each site carries per-year emission records from 2020 through 2024, enabling trend analysis over 5 and 10 year windows where baseline data exists.",
  },
  news: {
    title: "News and insights",
    body: "Site-level news is fetched live from the GDELT project, which indexes global news media in real time. Select any site on the map to see recent coverage of its operating company. Sentiment and theme extraction from this feed into the assistant's answers.",
  },
  support: {
    title: "Support",
    body: "This is a personal research and portfolio project. For setup help, see docs/setup.md in the repository — it covers Neo4j, the data loader, environment variables, and both servers, plus common issues and their fixes.",
  },
  contact: {
    title: "Contact",
    body: "Groundtruth is built and maintained by Vedant Bhatia. Reach out via the GitHub repository (github.com/vedantbhatiaa) for questions, suggestions, or collaboration.",
  },
  about: {
    title: "About this project",
    body: "Groundtruth — emissions, traced to source. A GIS and knowledge-graph platform for tracing corporate emissions to specific physical sites, combining structured emissions data with live news and filings, and an AI assistant that reasons over both. Built with React, FastAPI, Neo4j, ChromaDB, and Groq.",
  },
};

export default function InfoPage({ page, onBack }: Props) {
  const content = CONTENT[page] ?? { title: page, body: "Content coming soon." };
  return (
    <div className="info-page">
      <button className="back-btn" onClick={onBack}>
        ← Back to map
      </button>
      <h2 className="display">{content.title}</h2>
      <p>{content.body}</p>
    </div>
  );
}
