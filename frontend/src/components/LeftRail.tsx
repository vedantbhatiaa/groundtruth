import { Site, intensityColor } from "../data/sampleSites";
import { fmtMt } from "../utils/format";

const SECTORS = [
  { value: "coal", label: "Coal", cls: "on-amber" },
  { value: "gas", label: "Gas", cls: "on-amber" },
  { value: "oil", label: "Oil", cls: "on-amber" },
  { value: "solar", label: "Solar", cls: "on-teal" },
  { value: "wind", label: "Wind", cls: "on-teal" },
  { value: "hydro", label: "Hydro", cls: "on-teal" },
  { value: "nuclear", label: "Nuclear", cls: "on-teal" },
  { value: "biomass", label: "Biomass", cls: "on-teal" },
  { value: "waste", label: "Waste", cls: "on-amber" },
  { value: "power-fossil", label: "Fossil (unsplit)", cls: "on-amber" },
  { value: "geothermal", label: "Geothermal", cls: "on-teal" },
  { value: "power-other", label: "Power (other)", cls: "" },
  { value: "upstream", label: "Upstream", cls: "on-amber" },
  { value: "refining", label: "Refining", cls: "on-amber" },
  { value: "transport", label: "Transport", cls: "on-amber" },
  { value: "steel", label: "Steel", cls: "on-amber" },
  { value: "cement", label: "Cement", cls: "on-amber" },
  { value: "aluminum", label: "Aluminum", cls: "on-teal" },
  { value: "chemicals", label: "Chemicals", cls: "" },
  { value: "pulp-paper", label: "Pulp & paper", cls: "" },
  { value: "minerals", label: "Minerals", cls: "" },
  { value: "other", label: "Other", cls: "" },
];
const COUNTRIES = [
  "All countries", "United States", "Germany", "India", "Saudi Arabia",
  "Brazil", "China", "United Kingdom", "South Africa", "Australia",
  "Nigeria", "Egypt", "Norway", "Canada",
];

export type DataSource = "all" | "climate_trace" | "epa" | "wri" | "owid";

export const DATA_SOURCES: { value: DataSource; label: string; detail: string }[] = [
  { value: "all", label: "All sources", detail: "Everything currently loaded" },
  { value: "climate_trace", label: "Climate TRACE", detail: "Modelled site emissions, 2021-2024" },
  { value: "epa", label: "EPA GHGRP", detail: "Reported US facilities, 2010-2023" },
  { value: "wri", label: "WRI Power Plants", detail: "Capacity, generation, intensity" },
  { value: "owid", label: "Our World in Data", detail: "Country context, 1950-2024" },
];

interface Props {
  sites: Site[];
  activeSource: DataSource;
  onChangeSource: (source: DataSource) => void;
  activeSectors: string[];
  onToggleSector: (sector: string) => void;
  onSelectSite: (site: Site) => void;
  country: string;
  onChangeCountry: (country: string) => void;
}

export default function LeftRail({
  sites,
  activeSource,
  onChangeSource,
  activeSectors,
  onToggleSector,
  onSelectSite,
  country,
  onChangeCountry,
}: Props) {
  const sectorCounts = sites.reduce<Record<string, number>>((acc, s) => {
    const key = s.sector ?? "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const presentSectors = SECTORS.filter((s) => sectorCounts[s.value]);
  const emptySectors = SECTORS.filter((s) => !sectorCounts[s.value]);

  const topEmitters = [...sites].sort((a, b) => b.co2 - a.co2).slice(0, 5);
  const maxCo2 = topEmitters[0]?.co2 ?? 1;

  return (
    <div className="rail">
      <div className="rail-section">
        <div className="rail-label">Country</div>
        <select
          style={{ width: "100%" }}
          value={country}
          onChange={(e) => onChangeCountry(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="rail-section">
        <div className="rail-label">
          Sector
          {activeSectors.length > 0 && (
            <button className="rail-clear" onClick={() => activeSectors.forEach(onToggleSector)}>
              clear
            </button>
          )}
        </div>
        {/* Only sectors actually present are clickable, each with its site
            count — with thousands of facilities loaded, knowing the split
            up front matters more than showing every possible label. */}
        <div className="chip-row">
          {presentSectors.map((s) => (
            <div
              key={s.value}
              className={`chip ${activeSectors.includes(s.value) ? s.cls : ""}`}
              style={{ opacity: activeSectors.length === 0 || activeSectors.includes(s.value) ? 1 : 0.4 }}
              onClick={() => onToggleSector(s.value)}
              title={`${sectorCounts[s.value]} sites`}
            >
              {s.label} <b className="chip-count">{sectorCounts[s.value]}</b>
            </div>
          ))}
        </div>
        {emptySectors.length > 0 && (
          <div className="rail-note">
            Not in this view: {emptySectors.map((s) => s.label).join(", ")}
          </div>
        )}
      </div>

      <div className="rail-section">
        <div className="rail-label">Data sources</div>
        <div className="source-list">
          {DATA_SOURCES.map((s) => (
            <button
              key={s.value}
              className={`source-btn ${activeSource === s.value ? "active" : ""}`}
              onClick={() => onChangeSource(s.value)}
            >
              <span className="source-name">{s.label}</span>
              <span className="source-detail">{s.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-label">Top emitters</div>
        <div>
          {topEmitters.map((s) => (
            <div key={s.id}>
              <div className="emitter-row" onClick={() => onSelectSite(s)}>
                <span>{s.company?.split(" ")[0] ?? "—"}</span>
                <span className="mono">{fmtMt(s.co2)}</span>
              </div>
              <div className="bar">
                <i style={{ width: `${(s.co2 / maxCo2) * 100}%`, background: intensityColor[s.intensity] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
