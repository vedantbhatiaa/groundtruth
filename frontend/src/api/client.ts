import { sampleSites, Site } from "../data/sampleSites";

const BASE = "/api";

/**
 * Every function falls back gracefully if the backend isn't reachable, so
 * the frontend stays browsable standalone. checkHealth() lets App.tsx show
 * that state honestly in the header instead of a hardcoded "Live" badge.
 */

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSites(
  industry?: string[],
  country?: string,
  year?: number,
  trendWindow?: number
): Promise<Site[]> {
  try {
    const params = new URLSearchParams();
    industry?.forEach((i) => params.append("industry", i));
    if (country) params.append("country", country);
    if (year) params.append("year", String(year));
    if (trendWindow) params.append("trend_window", String(trendWindow));
    const res = await fetch(`${BASE}/sites?${params}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`backend returned ${res.status}: ${body.slice(0, 300)}`);
    }
    return await res.json();
  } catch (err) {
    console.error("[Groundtruth] /api/sites FAILED — falling back to fictional sample data. Reason:", err);
    return sampleSites;
  }
}

export async function sendChatMessage(message: string, activeSiteId?: string) {
  try {
    const res = await fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, active_site_id: activeSiteId ?? null }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[Groundtruth] /api/chat unreachable:", err);
    return {
      answer:
        "The assistant backend isn't reachable — check that uvicorn is running in backend/ and see its terminal for errors.",
      sources_used: [],
    };
  }
}

export interface NewsItem {
  title: string;
  url: string;
  published: string;
  source: string;
}

export async function fetchCompanyNews(company: string): Promise<NewsItem[] | null> {
  try {
    const res = await fetch(`${BASE}/ingest/news?company=${encodeURIComponent(company)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("news fetch failed");
    return await res.json();
  } catch (err) {
    console.warn("[Groundtruth] live news unavailable:", err);
    return null;
  }
}

export interface Filing {
  company: string;
  form_type: string[] | string;
  filed: string;
  accession_no: string;
}

export async function fetchCompanyFilings(company: string): Promise<Filing[] | null> {
  try {
    const res = await fetch(`${BASE}/ingest/filings?company=${encodeURIComponent(company)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("filings fetch failed");
    return await res.json();
  } catch (err) {
    console.warn("[Groundtruth] filings unavailable:", err);
    return null;
  }
}

export interface YearTotal {
  year: number;
  total: number;
}

export async function fetchStatsTimeseries(
  industry?: string[],
  country?: string
): Promise<YearTotal[] | null> {
  try {
    const params = new URLSearchParams();
    industry?.forEach((i) => params.append("industry", i));
    if (country) params.append("country", country);
    const res = await fetch(`${BASE}/analytics/stats/timeseries?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("stats fetch failed");
    return await res.json();
  } catch {
    return null;
  }
}

export interface CompanyTimeseries {
  years: YearTotal[];
  sectors: { sector: string; total: number }[];
  sectors_by_year?: { year: number; sector: string; total: number }[];
}

export async function fetchCompanyTimeseries(
  company: string,
  yearFrom?: number,
  yearTo?: number
): Promise<CompanyTimeseries | null> {
  try {
    const params = new URLSearchParams();
    if (yearFrom) params.append("year_from", String(yearFrom));
    if (yearTo) params.append("year_to", String(yearTo));
    const res = await fetch(
      `${BASE}/analytics/company/${encodeURIComponent(company)}/timeseries?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error("company timeseries failed");
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchSiteTimeseries(siteId: string): Promise<{ year: number; tons: number }[] | null> {
  try {
    const res = await fetch(`${BASE}/sites/${encodeURIComponent(siteId)}/timeseries`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("site timeseries failed");
    return await res.json();
  } catch {
    return null;
  }
}

export interface CountryStat {
  year: number;
  co2: number | null;
  coal_co2: number | null;
  oil_co2: number | null;
  gas_co2: number | null;
  cement_co2: number | null;
  co2_per_capita: number | null;
  energy_per_capita: number | null;
  share_global_co2: number | null;
  population: number | null;
}

export async function fetchCountryTimeseries(
  country: string,
  fromYear = 1990,
  toYear = 2024
): Promise<CountryStat[] | null> {
  try {
    const res = await fetch(
      `${BASE}/analytics/country/${encodeURIComponent(country)}/timeseries?from_year=${fromYear}&to_year=${toYear}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error("country timeseries failed");
    return await res.json();
  } catch (err) {
    console.warn("[Groundtruth] country stats unavailable:", err);
    return null;
  }
}

/** Sectors that exist anywhere in the loaded data, regardless of filters. */
export async function fetchAvailableSectors(): Promise<string[] | null> {
  try {
    const res = await fetch(`${BASE}/sites/sectors`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("sectors fetch failed");
    const rows: { sector: string; n: number }[] = await res.json();
    return rows.map((r) => r.sector);
  } catch (err) {
    console.warn("[Groundtruth] sector list unavailable:", err);
    return null;
  }
}
