import { Site, intensityColor } from "../data/sampleSites";

const SECTORS = [
  { value: "coal", label: "Coal", cls: "on-amber" },
  { value: "gas", label: "Gas", cls: "on-amber" },
  { value: "solar", label: "Solar", cls: "on-teal" },
  { value: "upstream", label: "Upstream", cls: "on-amber" },
  { value: "steel", label: "Steel", cls: "on-amber" },
  { value: "cement", label: "Cement", cls: "on-amber" },
  { value: "aluminum", label: "Aluminum", cls: "on-teal" },
];
const COUNTRIES = [
  "All countries", "United States", "Germany", "India", "Saudi Arabia",
  "Brazil", "China", "United Kingdom", "South Africa", "Australia",
  "Nigeria", "Egypt", "Norway", "Canada",
];

interface Props {
  sites: Site[];
  activeSectors: string[];
  onToggleSector: (sector: string) => void;
  onSelectSite: (site: Site) => void;
  country: string;
  onChangeCountry: (country: string) => void;
}

export default function LeftRail({
  sites,
  activeSectors,
  onToggleSector,
  onSelectSite,
  country,
  onChangeCountry,
}: Props) {
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
        <div className="rail-label">Sector</div>
        <div className="chip-row">
          {SECTORS.map((s) => (
            <div
              key={s.value}
              className={`chip ${activeSectors.includes(s.value) ? s.cls : ""}`}
              style={{ opacity: activeSectors.length === 0 || activeSectors.includes(s.value) ? 1 : 0.4 }}
              onClick={() => onToggleSector(s.value)}
            >
              {s.label}
            </div>
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
                <span className="mono">{s.co2}M t</span>
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
