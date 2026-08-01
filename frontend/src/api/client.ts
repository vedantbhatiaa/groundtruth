import { sampleSites, Site } from "../data/sampleSites";

const BASE = "/api";

/**
 * Every function here falls back to the bundled sample data if the backend
 * isn't reachable, so the frontend is browsable on its own. But that
 * fallback is silent by design (no error thrown to the caller) — which
 * previously meant there was no visible way to tell "live data" from
 * "backend unreachable, showing sample data" apart. checkHealth() exists
 * so App.tsx can show that honestly instead of a hardcoded "Live" badge.
 */

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSites(industry?: string[], country?: string): Promise<Site[]> {
  try {
    const params = new URLSearchParams();
    industry?.forEach((i) => params.append("industry", i));
    if (country) params.append("country", country);
    const res = await fetch(`${BASE}/sites?${params}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("backend unavailable");
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
    if (!res.ok) throw new Error("backend unavailable");
    return await res.json();
  } catch (err) {
    console.warn("[Groundtruth] /api/chat unreachable:", err);
    return {
      answer:
        "The assistant backend isn't running yet — start it with `uvicorn app.main:app --reload` in backend/ to get real answers.",
      sources_used: [],
    };
  }
}
