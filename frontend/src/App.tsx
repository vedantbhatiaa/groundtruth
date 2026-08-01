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
import { useTheme } from "./hooks/useTheme";
import { fetchSites, checkHealth } from "./api/client";
import { Site, sampleSites } from "./data/sampleSites";

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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

  const globeHandle = useRef<GlobeStageHandle>(null);

  // Real health check, polled every 15s — this is what makes the header
  // status badge honest instead of a hardcoded "Live" claim. If this never
  // flips to true, the backend genuinely isn't reachable from the browser
  // (check the uvicorn terminal is still running and CORS origin matches).
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

  useEffect(() => {
    fetchSites(
      selectedIndustries.length ? selectedIndustries : undefined,
      country === "All countries" ? undefined : country
    ).then(setSites);
  }, [selectedIndustries, country]);

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

  return (
    <>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
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
          <SummaryCard sites={visibleSites} />
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
    </>
  );
}
