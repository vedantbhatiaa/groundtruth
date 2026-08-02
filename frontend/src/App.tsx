import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import NavDrawer from "./components/NavDrawer";
import FilterBar from "./components/FilterBar";
import LeftRail from "./components/LeftRail";
import GlobeStage, { GlobeStageHandle, MapStyle } from "./components/GlobeStage";
import FlatMap from "./components/FlatMap";
import IconRail from "./components/IconRail";
import LegendCard from "./components/LegendCard";
import SummaryCard from "./components/SummaryCard";
import SiteOverlay from "./components/SiteOverlay";
import ControlRow from "./components/ControlRow";
import ChatDrawer from "./components/ChatDrawer";
import ChatFab from "./components/ChatFab";
import AnalysisView from "./components/AnalysisView";
import CompanyDetail from "./components/CompanyDetail";
import InfoPage from "./components/InfoPage";
import { useTheme } from "./hooks/useTheme";
import { fetchSites, checkHealth, fetchStatsTimeseries } from "./api/client";
import { Site, sampleSites } from "./data/sampleSites";

const INDUSTRY_LABELS: Record<string, string> = {
  power: "Power & energy",
  oil: "Oil & gas",
  manufacturing: "Manufacturing",
};

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [view, setView] = useState("map");

  const [sites, setSites] = useState<Site[]>(sampleSites);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["power"]);
  const [selectedYear, setSelectedYear] = useState("2024");
  const [trendWindow, setTrendWindow] = useState<"5" | "10">("5");
  const [activeSectors, setActiveSectors] = useState<string[]>([]);
  const [country, setCountry] = useState("All countries");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [legendOn, setLegendOn] = useState(false);
  const [sitesOn, setSitesOn] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>("default");
  const [backendOnline, setBackendOnline] = useState(false);
  const [statsSpark, setStatsSpark] = useState<number[] | undefined>(undefined);

  const globeHandle = useRef<GlobeStageHandle>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const online = await checkHealth();
      if (!cancelled) setBackendOnline(online);
    }
    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Refetch on any filter change — industry, country, year, AND trend
  // window all flow through to the backend query now.
  useEffect(() => {
    const ind = selectedIndustries.length ? selectedIndustries : undefined;
    const ctry = country === "All countries" ? undefined : country;
    fetchSites(ind, ctry, parseInt(selectedYear, 10), parseInt(trendWindow, 10)).then((rows) => {
      setSites(rows);
      // A previously selected site may not exist under the new filters —
      // clear it instead of showing a stale overlay next to fresh totals.
      setSelectedSite((prev) => (prev && rows.some((r) => r.id === prev.id) ? prev : null));
    });
    fetchStatsTimeseries(ind, ctry).then((rows) => {
      setStatsSpark(rows && rows.length > 0 ? rows.map((r) => r.total) : undefined);
    });
  }, [selectedIndustries, country, selectedYear, trendWindow]);

  let visibleSites = activeSectors.length
    ? sites.filter((s) => activeSectors.includes(s.sector))
    : sites;

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    visibleSites = visibleSites.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.company ?? "").toLowerCase().includes(q) ||
        (s.country ?? "").toLowerCase().includes(q)
    );
  }

  function toggleSector(sector: string) {
    setActiveSectors((prev) => (prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]));
  }

  function downloadCsv() {
    const header = "id,name,company,country,sector,lat,lng,co2_mt,trend,intensity";
    const rows = visibleSites.map(
      (s) => `${s.id},"${s.name}","${s.company}","${s.country}",${s.sector},${s.lat},${s.lng},${s.co2},${s.trend},${s.intensity}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = `groundtruth-sites-${selectedYear}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function handleNavigate(target: string) {
    if (target === "downloads") {
      downloadCsv();
      return; // stays on current view; the download is the action
    }
    setView(target);
  }

  const summaryLabel = `${
    selectedIndustries.length === 0
      ? "All industries"
      : selectedIndustries.map((i) => INDUSTRY_LABELS[i] ?? i).join(", ")
  } · ${selectedYear}`;

  return (
    <>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} onNavigate={handleNavigate} />
      <Header
        onOpenNav={() => setNavOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        backendOnline={backendOnline}
      />
      <FilterBar
        selectedIndustries={selectedIndustries}
        onChangeIndustries={setSelectedIndustries}
        selectedYear={selectedYear}
        onChangeYear={setSelectedYear}
        trendWindow={trendWindow}
        onChangeTrendWindow={setTrendWindow}
      />

      {view === "analysis" ? (
        <AnalysisView
          sites={visibleSites}
          onBack={() => setView("map")}
          onSelectCompany={(c) => setView(`company:${c}`)}
        />
      ) : view.startsWith("company:") ? (
        <CompanyDetail
          company={view.slice("company:".length)}
          sites={visibleSites}
          onBack={() => setView("analysis")}
          onSelectSite={(s) => {
            setSelectedSite(s);
            setView("map");
          }}
        />
      ) : view !== "map" ? (
        <InfoPage page={view} onBack={() => setView("map")} />
      ) : (
        <div className="shell">
          <LeftRail
            sites={visibleSites}
            activeSectors={activeSectors}
            onToggleSector={toggleSector}
            onSelectSite={setSelectedSite}
            country={country}
            onChangeCountry={setCountry}
          />

          <div className="stage">
            <GlobeStage
              ref={globeHandle}
              sites={visibleSites}
              theme={theme}
              mapStyle={mapStyle}
              showSites={sitesOn}
              onSelectSite={setSelectedSite}
              visible={viewMode === "3d"}
            />
            <FlatMap sites={sitesOn ? visibleSites : []} visible={viewMode === "2d"} onSelectSite={setSelectedSite} />

            <IconRail active={viewMode === "2d"} />
            <LegendCard active={legendOn} />
            <SummaryCard sites={visibleSites} label={summaryLabel} sparkValues={statsSpark} />
            <SiteOverlay site={selectedSite} onClose={() => setSelectedSite(null)} />

            <ControlRow
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              legendOn={legendOn}
              onToggleLegend={() => setLegendOn((v) => !v)}
              sitesOn={sitesOn}
              onToggleSites={() => setSitesOn((v) => !v)}
              mapStyle={mapStyle}
              onChangeMapStyle={setMapStyle}
              onZoomIn={() => globeHandle.current?.zoomIn()}
              onZoomOut={() => globeHandle.current?.zoomOut()}
              onDownload={() => globeHandle.current?.downloadImage()}
            />

            <ChatFab visible={!chatOpen} onOpen={() => setChatOpen(true)} />
          </div>

          <ChatDrawer
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            sites={visibleSites}
            activeSiteId={selectedSite?.id}
            onSelectSite={setSelectedSite}
          />
        </div>
      )}
    </>
  );
}
