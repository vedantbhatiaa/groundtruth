import { useState } from "react";

const INDUSTRIES = [
  { value: "power", label: "Power & energy" },
  { value: "oil", label: "Oil & gas" },
  { value: "manufacturing", label: "Manufacturing" },
];
const YEARS = [
  "2024", "2023", "2022", "2021", "2020", "2019", "2018",
  "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010",
];

interface Props {
  selectedIndustries: string[];
  onChangeIndustries: (values: string[]) => void;
  selectedYear: string;
  onChangeYear: (year: string) => void;
  trendWindow: "5" | "10";
  onChangeTrendWindow: (value: "5" | "10") => void;
}

export default function FilterBar({
  selectedIndustries,
  onChangeIndustries,
  selectedYear,
  onChangeYear,
  trendWindow,
  onChangeTrendWindow,
}: Props) {
  const [industryOpen, setIndustryOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const industryLabel =
    selectedIndustries.length === 0
      ? "All industries"
      : selectedIndustries.length === 1
      ? INDUSTRIES.find((i) => i.value === selectedIndustries[0])?.label
      : `${selectedIndustries.length} industries`;

  function toggleIndustry(value: string) {
    onChangeIndustries(
      selectedIndustries.includes(value)
        ? selectedIndustries.filter((v) => v !== value)
        : [...selectedIndustries, value]
    );
  }

  return (
    <div className="filterbar">
      <span className="filter-label">Filters</span>

      <div className="dd">
        <div className="dd-chip" onClick={() => setIndustryOpen((o) => !o)}>
          <span className="swatch-dot" />
          <span>{industryLabel}</span>
          {selectedIndustries.length > 0 && (
            <span
              className="x"
              onClick={(e) => {
                e.stopPropagation();
                onChangeIndustries([]);
              }}
            >
              ✕
            </span>
          )}
          <span className="chev">▾</span>
        </div>
        <div className={`dd-panel ${industryOpen ? "open" : ""}`}>
          {INDUSTRIES.map((ind) => (
            <div
              key={ind.value}
              className={`dd-item ${selectedIndustries.includes(ind.value) ? "checked" : ""}`}
              onClick={() => toggleIndustry(ind.value)}
            >
              <span className="box">{selectedIndustries.includes(ind.value) ? "✓" : ""}</span>
              {ind.label}
            </div>
          ))}
        </div>
      </div>

      <div className="dd">
        <div className="dd-chip" onClick={() => setYearOpen((o) => !o)}>
          <span>{selectedYear}</span>
          <span className="chev">▾</span>
        </div>
        <div className={`dd-panel ${yearOpen ? "open" : ""}`}>
          {YEARS.map((year) => (
            <div
              key={year}
              className={`dd-item single ${selectedYear === year ? "checked" : ""}`}
              onClick={() => {
                onChangeYear(year);
                setYearOpen(false);
              }}
            >
              {year}
            </div>
          ))}
        </div>
      </div>

      <span className="filter-label">Trend window</span>
      <div className="segmented">
        <button className={trendWindow === "10" ? "active" : ""} onClick={() => onChangeTrendWindow("10")}>
          10 YR
        </button>
        <button className={trendWindow === "5" ? "active" : ""} onClick={() => onChangeTrendWindow("5")}>
          5 YR
        </button>
      </div>
    </div>
  );
}
