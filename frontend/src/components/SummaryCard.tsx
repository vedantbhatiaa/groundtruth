import { useState } from "react";
import { Site } from "../data/sampleSites";
import SparkBars from "./SparkBars";
import { fmtMt } from "../utils/format";

interface Props {
  sites: Site[];
  label: string;
  sparkValues?: number[];
}

export default function SummaryCard({ sites, label, sparkValues }: Props) {
  const [expanded, setExpanded] = useState(false);

  const totalCo2 = sites.reduce((sum, s) => sum + s.co2, 0);
  const countries = new Set(sites.map((s) => s.country)).size;
  const largest = [...sites].sort((a, b) => b.co2 - a.co2)[0];
  const fastestRising = [...sites].sort(
    (a, b) => parseFloat(b.trend) - parseFloat(a.trend)
  )[0];

  return (
    <div className="summary-card">
      <div className="label">{label}</div>
      <div className="big display">
        {fmtMt(totalCo2)}
        <small>CO2e</small>
      </div>
      <div className="meta">
        <b>{sites.length}</b> sites across <b>{countries}</b> countries
      </div>
      <SparkBars values={sparkValues} />
      <button className="more-toggle" onClick={() => setExpanded((e) => !e)}>
        More detail <span>{expanded ? "⌄" : "›"}</span>
      </button>
      <div className={`summary-detail ${expanded ? "open" : ""}`}>
        <div className="row">
          Largest source<b>{largest?.company}</b>
        </div>
        <div className="row">
          Fastest-rising site<b>{fastestRising?.name}</b>
        </div>
        <div className="row">
          Coverage confidence<b>high</b>
        </div>
      </div>
    </div>
  );
}
