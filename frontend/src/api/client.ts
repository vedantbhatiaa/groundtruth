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
    const res = await fetch(`${BASE}/sites?${params}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[Groundtruth] /api/sites unreachable, using bundled sample data:", err);
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
}

export async function fetchCompanyTimeseries(company: string): Promise<CompanyTimeseries | null> {
  try {
    const res = await fetch(`${BASE}/analytics/company/${encodeURIComponent(company)}/timeseries`, {
      signal: AbortSignal.timeout(5000),
    });
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
