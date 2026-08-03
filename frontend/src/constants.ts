/**
 * One place for dataset metadata. Coverage years were previously repeated
 * across App, LeftRail, AnalysisView and CountryPanel, so a loader change
 * meant hunting for four copies that could silently disagree.
 */
export type DataSource = "all" | "climate_trace" | "epa" | "wri";

export interface SourceMeta {
  value: DataSource;
  label: string;
  detail: string;
  minYear?: number;
  maxYear?: number;
}

export const DATA_SOURCES: SourceMeta[] = [
  { value: "all", label: "All sources", detail: "Everything currently loaded" },
  {
    value: "climate_trace",
    label: "Climate TRACE",
    detail: "Modelled site emissions",
    minYear: 2021,
    maxYear: 2024,
  },
  {
    value: "epa",
    label: "EPA GHGRP",
    detail: "Reported US facilities",
    minYear: 2010,
    maxYear: 2023,
  },
  { value: "wri", label: "WRI Power Plants", detail: "Capacity, generation, intensity" },
];

export const SOURCE_META: Record<string, SourceMeta> = Object.fromEntries(
  DATA_SOURCES.map((s) => [s.value, s])
);

/** Widest span any loaded dataset covers — drives year dropdowns and defaults. */
export const DATA_MIN_YEAR = 2010;
export const DATA_MAX_YEAR = 2024;

export function sourceRangeLabel(value: DataSource): string {
  const meta = SOURCE_META[value];
  if (!meta?.minYear || !meta?.maxYear) return "";
  return `${meta.minYear}\u2013${meta.maxYear}`;
}
