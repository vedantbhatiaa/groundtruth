export interface Site {
  id: string;
  name: string;
  company: string;
  country: string;
  sector: string;
  lat: number;
  lng: number;
  co2: number;
  trend: string;
  intensity: "high" | "medium" | "low";
  news: string[];
  capacity?: number | null;
  asset_type?: string | null;
  generation_gwh?: number | null;
  primary_fuel?: string | null;
  commissioning_year?: number | null;
  baseline_year?: number | null;
}

// Mirrors ingestion/sample_data/sites_sample.csv (2024 rows) — local fallback
// when the backend API isn't running, so the UI stays browsable standalone.
export const sampleSites: Site[] = [
  { id: "site-001", name: "Riverside power station", company: "Northgate Energy", country: "United States", sector: "coal", lat: 38.9, lng: -90.2, co2: 4.2, trend: "+3%", intensity: "high", news: ["Northgate Energy flagged in a recent emissions review", "Site included in latest United States sector disclosure"] },
  { id: "site-002", name: "Meridian gas plant", company: "Northgate Energy", country: "United States", sector: "gas", lat: 29.8, lng: -95.4, co2: 2.1, trend: "5%", intensity: "medium", news: ["Northgate Energy efficiency upgrade under review", "Site included in latest United States sector disclosure"] },
  { id: "site-003", name: "Sable Point terminal", company: "Northgate Energy", country: "United States", sector: "upstream", lat: 29.3, lng: -94.8, co2: 3.4, trend: "+7%", intensity: "high", news: ["Northgate Energy flagged in a recent emissions review", "Site included in latest United States sector disclosure"] },
  { id: "site-004", name: "Rheinland works", company: "Vestara Industries", country: "Germany", sector: "coal", lat: 51.2, lng: 6.8, co2: 3.6, trend: "+3%", intensity: "high", news: ["Vestara Industries flagged in a recent emissions review", "Site included in latest Germany sector disclosure"] },
  { id: "site-005", name: "Solkraft solar farm", company: "Vestara Industries", country: "Germany", sector: "solar", lat: 52.5, lng: 13.4, co2: 0.2, trend: "-3%", intensity: "low", news: ["Vestara Industries capacity expansion approved", "Site included in latest Germany sector disclosure"] },
  { id: "site-006", name: "Nordsee gas hub", company: "Vestara Industries", country: "Germany", sector: "gas", lat: 54.3, lng: 8.1, co2: 1.9, trend: "5%", intensity: "medium", news: ["Vestara Industries efficiency upgrade under review", "Site included in latest Germany sector disclosure"] },
  { id: "site-007", name: "Deccan thermal plant", company: "Bharat Power Corp", country: "India", sector: "coal", lat: 19.1, lng: 72.9, co2: 5.1, trend: "+7%", intensity: "high", news: ["Bharat Power Corp flagged in a recent emissions review", "Site included in latest India sector disclosure"] },
  { id: "site-008", name: "Ganga basin field", company: "Bharat Power Corp", country: "India", sector: "upstream", lat: 25.3, lng: 83.0, co2: 1.8, trend: "3%", intensity: "medium", news: ["Bharat Power Corp efficiency upgrade under review", "Site included in latest India sector disclosure"] },
  { id: "site-009", name: "Coromandel wind park", company: "Bharat Power Corp", country: "India", sector: "solar", lat: 13.1, lng: 80.3, co2: 0.3, trend: "-3%", intensity: "low", news: ["Bharat Power Corp capacity expansion approved", "Site included in latest India sector disclosure"] },
  { id: "site-010", name: "Rub al Khali field", company: "Al Bariq Energy", country: "Saudi Arabia", sector: "upstream", lat: 21.5, lng: 51.2, co2: 6.4, trend: "+3%", intensity: "high", news: ["Al Bariq Energy flagged in a recent emissions review", "Site included in latest Saudi Arabia sector disclosure"] },
  { id: "site-011", name: "Jeddah gas terminal", company: "Al Bariq Energy", country: "Saudi Arabia", sector: "gas", lat: 21.5, lng: 39.2, co2: 2.9, trend: "7%", intensity: "medium", news: ["Al Bariq Energy efficiency upgrade under review", "Site included in latest Saudi Arabia sector disclosure"] },
  { id: "site-012", name: "Dammam refinery", company: "Al Bariq Energy", country: "Saudi Arabia", sector: "upstream", lat: 26.4, lng: 50.1, co2: 5.7, trend: "+7%", intensity: "high", news: ["Al Bariq Energy flagged in a recent emissions review", "Site included in latest Saudi Arabia sector disclosure"] },
  { id: "site-013", name: "Sertao gas field", company: "Costa Verde Energia", country: "Brazil", sector: "gas", lat: -9.4, lng: -40.5, co2: 2.4, trend: "7%", intensity: "medium", news: ["Costa Verde Energia efficiency upgrade under review", "Site included in latest Brazil sector disclosure"] },
  { id: "site-014", name: "Bahia thermal plant", company: "Costa Verde Energia", country: "Brazil", sector: "coal", lat: -12.9, lng: -38.5, co2: 3.1, trend: "5%", intensity: "medium", news: ["Costa Verde Energia efficiency upgrade under review", "Site included in latest Brazil sector disclosure"] },
  { id: "site-015", name: "Amazonas hydro station", company: "Costa Verde Energia", country: "Brazil", sector: "solar", lat: -3.1, lng: -60.0, co2: 0.1, trend: "-5%", intensity: "low", news: ["Costa Verde Energia capacity expansion approved", "Site included in latest Brazil sector disclosure"] },
  { id: "site-016", name: "Ordos coal complex", company: "Huabei Power", country: "China", sector: "coal", lat: 39.6, lng: 109.8, co2: 7.8, trend: "+7%", intensity: "high", news: ["Huabei Power flagged in a recent emissions review", "Site included in latest China sector disclosure"] },
  { id: "site-017", name: "Bohai gas platform", company: "Huabei Power", country: "China", sector: "upstream", lat: 38.0, lng: 119.5, co2: 4.6, trend: "+7%", intensity: "high", news: ["Huabei Power flagged in a recent emissions review", "Site included in latest China sector disclosure"] },
  { id: "site-018", name: "Gobi solar array", company: "Huabei Power", country: "China", sector: "solar", lat: 40.2, lng: 105.0, co2: 0.4, trend: "-3%", intensity: "low", news: ["Huabei Power capacity expansion approved", "Site included in latest China sector disclosure"] },
  { id: "site-019", name: "Teesside works", company: "Albion Energy", country: "United Kingdom", sector: "gas", lat: 54.6, lng: -1.2, co2: 2.2, trend: "3%", intensity: "medium", news: ["Albion Energy efficiency upgrade under review", "Site included in latest United Kingdom sector disclosure"] },
  { id: "site-020", name: "North Sea platform", company: "Albion Energy", country: "United Kingdom", sector: "upstream", lat: 58.4, lng: 1.5, co2: 3.9, trend: "+7%", intensity: "high", news: ["Albion Energy flagged in a recent emissions review", "Site included in latest United Kingdom sector disclosure"] },
  { id: "site-021", name: "Karoo gas field", company: "Meridian Africa", country: "South Africa", sector: "gas", lat: -32.3, lng: 22.1, co2: 2.6, trend: "7%", intensity: "medium", news: ["Meridian Africa efficiency upgrade under review", "Site included in latest South Africa sector disclosure"] },
  { id: "site-022", name: "Mpumalanga power station", company: "Meridian Africa", country: "South Africa", sector: "coal", lat: -25.9, lng: 29.2, co2: 6.1, trend: "+3%", intensity: "high", news: ["Meridian Africa flagged in a recent emissions review", "Site included in latest South Africa sector disclosure"] },
  { id: "site-023", name: "Pilbara gas hub", company: "Outback Resources", country: "Australia", sector: "upstream", lat: -20.7, lng: 116.8, co2: 3.3, trend: "7%", intensity: "medium", news: ["Outback Resources efficiency upgrade under review", "Site included in latest Australia sector disclosure"] },
  { id: "site-024", name: "Hunter Valley plant", company: "Outback Resources", country: "Australia", sector: "coal", lat: -32.6, lng: 151.0, co2: 4.8, trend: "+5%", intensity: "high", news: ["Outback Resources flagged in a recent emissions review", "Site included in latest Australia sector disclosure"] },
  { id: "site-025", name: "Niger delta field", company: "Sahel Energy", country: "Nigeria", sector: "upstream", lat: 4.8, lng: 6.3, co2: 5.4, trend: "+7%", intensity: "high", news: ["Sahel Energy flagged in a recent emissions review", "Site included in latest Nigeria sector disclosure"] },
  { id: "site-026", name: "Lagos gas terminal", company: "Sahel Energy", country: "Nigeria", sector: "gas", lat: 6.5, lng: 3.4, co2: 2.0, trend: "5%", intensity: "medium", news: ["Sahel Energy efficiency upgrade under review", "Site included in latest Nigeria sector disclosure"] },
  { id: "site-027", name: "Ruhr steelworks", company: "Ferrum Group", country: "Germany", sector: "steel", lat: 51.5, lng: 7.1, co2: 4.9, trend: "+5%", intensity: "high", news: ["Ferrum Group flagged in a recent emissions review", "Site included in latest Germany sector disclosure"] },
  { id: "site-028", name: "Jamshedpur steel plant", company: "Ferrum Group", country: "India", sector: "steel", lat: 22.8, lng: 86.2, co2: 5.6, trend: "+5%", intensity: "high", news: ["Ferrum Group flagged in a recent emissions review", "Site included in latest India sector disclosure"] },
  { id: "site-029", name: "Gary works", company: "Ferrum Group", country: "United States", sector: "steel", lat: 41.6, lng: -87.3, co2: 3.8, trend: "+7%", intensity: "high", news: ["Ferrum Group flagged in a recent emissions review", "Site included in latest United States sector disclosure"] },
  { id: "site-030", name: "Nile cement complex", company: "Atlas Cement", country: "Egypt", sector: "cement", lat: 30.0, lng: 31.2, co2: 3.2, trend: "5%", intensity: "medium", news: ["Atlas Cement efficiency upgrade under review", "Site included in latest Egypt sector disclosure"] },
  { id: "site-031", name: "Texas cement kiln", company: "Atlas Cement", country: "United States", sector: "cement", lat: 32.8, lng: -96.8, co2: 2.7, trend: "3%", intensity: "medium", news: ["Atlas Cement efficiency upgrade under review", "Site included in latest United States sector disclosure"] },
  { id: "site-032", name: "Rajasthan cement works", company: "Atlas Cement", country: "India", sector: "cement", lat: 26.9, lng: 75.8, co2: 3.5, trend: "+7%", intensity: "high", news: ["Atlas Cement flagged in a recent emissions review", "Site included in latest India sector disclosure"] },
  { id: "site-033", name: "Fjord aluminium smelter", company: "Nordlys Metals", country: "Norway", sector: "aluminum", lat: 60.4, lng: 5.3, co2: 1.2, trend: "-3%", intensity: "low", news: ["Nordlys Metals capacity expansion approved", "Site included in latest Norway sector disclosure"] },
  { id: "site-034", name: "Quebec smelter", company: "Nordlys Metals", country: "Canada", sector: "aluminum", lat: 46.8, lng: -71.2, co2: 1.6, trend: "5%", intensity: "medium", news: ["Nordlys Metals efficiency upgrade under review", "Site included in latest Canada sector disclosure"] },
  { id: "site-035", name: "Gulf aluminium works", company: "Nordlys Metals", country: "Saudi Arabia", sector: "aluminum", lat: 27.0, lng: 49.6, co2: 2.8, trend: "5%", intensity: "medium", news: ["Nordlys Metals efficiency upgrade under review", "Site included in latest Saudi Arabia sector disclosure"] },
  { id: "site-036", name: "Anhui cement plant", company: "Dragon Materials", country: "China", sector: "cement", lat: 31.8, lng: 117.2, co2: 6.2, trend: "+7%", intensity: "high", news: ["Dragon Materials flagged in a recent emissions review", "Site included in latest China sector disclosure"] },
];

export const intensityColor: Record<Site["intensity"], string> = {
  high: "#ef5b5b",
  medium: "#f2a93b",
  low: "#2dd9b8",
};
