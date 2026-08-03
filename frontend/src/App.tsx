import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import NavDrawer from "./components/NavDrawer";
import FilterBar from "./components/FilterBar";
import LeftRail, { DataSource } from "./components/LeftRail";
import GlobeStage, { GlobeStageHandle, MapStyle } from "./components/GlobeStage";
import FlatMap, { FlatMapHandle } from "./components/FlatMap";
import LegendCard from "./components/LegendCard";
import SummaryCard from "./components/SummaryCard";
import SiteOverlay from "./components/SiteOverlay";
import ControlRow from "./components/ControlRow";
import ChatDrawer from "./components/ChatDrawer";
import ChatFab from "./components/ChatFab";
import AnalysisView from "./components/AnalysisView";
import CompanyDetail from "./components/CompanyDetail";
import InfoPage from "./components/InfoPage";
import CountryPanel from "./components/CountryPanel";
import { useTheme } from "./hooks/useTheme";
import { fetchSites, checkHealth, fetchStatsTimeseries, fetchAvailableSectors } from "./api/client";
import { Site, sampleSites } from "./data/sampleSites";
import { fmtMt } from "./utils/format";

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
  // Each source covers a different span. Selecting a year outside a source's
  // range returns nothing — which looked like "the data didn't load" when it
  // was really just 2024 against EPA data that stops at 2023.
  const SOURCE_YEARS: Record<string, { min: number; max: number; label: string }> = {
    climate_trace: { min: 2021, max: 2024, label: "Climate TRACE" },
    epa: { min: 2010, max: 2023, label: "EPA GHGRP" },
  };
  const [trendWindow, setTrendWindow] = useState<"5" | "10">("5");
  const [activeSectors, setActiveSectors] = useState<string[]>([]);
  const [country, setCountry] = useState("All countries");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [compareSite, setCompareSite] = useState<Site | null>(null);
  // Lets the user close the auto-opened country panel without it snapping
  // straight back; reset whenever the selection changes.
  const [countryPanelDismissed, setCountryPanelDismissed] = useState(false);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [legendOn, setLegendOn] = useState(false);
  const [sitesOn, setSitesOn] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>("default");
  const [backendOnline, setBackendOnline] = useState(false);
  const [statsSpark, setStatsSpark] = useState<number[] | undefined>(undefined);
  const [activeSource, setActiveSource] = useState<DataSource>("all");
  // Which sectors exist in the data at all — lets the rail distinguish
  // "absent from this view" from "absent from every dataset".
  const [loadedSectors, setLoadedSectors] = useState<string[]>([]);

  // Ctrl/Cmd/Shift-click adds a second site for side-by-side comparison;
  // a plain click always resets to a single selection.
  function handleSelectSite(site: Site, additive = false) {
    setCountryPanelDismissed(false);
    // Re-clicking an already-selected site deselects it, whichever slot
    // it's in and whether or not a modifier is held. When the primary is
    // removed but a comparison site remains, that one gets promoted.
    if (selectedSite?.id === site.id) {
      setSelectedSite(compareSite);
      setCompareSite(null);
      return;
    }
    if (compareSite?.id === site.id) {
      setCompareSite(null);
      return;
    }
    if (additive && selectedSite) {
      setCompareSite(site);
      return;
    }
    setSelectedSite(site);
    setCompareSite(null);
  }

  function clearSelection() {
    setSelectedSite(null);
    setCompareSite(null);
    setCountryPanelDismissed(false);
  }

  const selectedIds = [selectedSite?.id, compareSite?.id].filter(Boolean) as string[];
  // A country typed into the search bar should drive the country panel too,
  // not just filter markers — searching "India" now behaves like picking it
  // from the dropdown.
  const searchedCountry =
    country === "All countries" && searchQuery.trim()
      ? sites.find((s) => (s.country ?? "").toLowerCase() === searchQuery.trim().toLowerCase())?.country ?? null
      : null;
  const filterCountry = country !== "All countries" ? country : searchedCountry;

  // Selecting a site opens its OWN country's context automatically, so the
  // site sits on the left and its national picture on the right. A second
  // site takes the right slot instead and the country panel steps aside.
  const panelCountry = compareSite
    ? null
    : countryPanelDismissed
      ? null
      : selectedSite?.country ?? filterCountry;
  const countryPanelOpen = !!panelCountry;
  // The site card only moves left once something occupies the right slot.
  const siteOnLeft = countryPanelOpen || !!compareSite;

  // Snap the selected year into the active source's coverage.
  useEffect(() => {
    const range = SOURCE_YEARS[activeSource];
    if (!range) return;
    const y = parseInt(selectedYear, 10);
    if (y > range.max) setSelectedYear(String(range.max));
    else if (y < range.min) setSelectedYear(String(range.min));
  }, [activeSource]);

  const globeHandle = useRef<GlobeStageHandle>(null);
  const flatHandle = useRef<FlatMapHandle>(null);

  useEffect(() => {
    fetchAvailableSectors().then((rows) => rows && setLoadedSectors(rows));
  }, []);

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
      setCompareSite((prev) => (prev && rows.some((r) => r.id === prev.id) ? prev : null));
    });
    fetchStatsTimeseries(ind, ctry).then((rows) => {
      setStatsSpark(rows && rows.length > 0 ? rows.map((r) => r.total) : undefined);
    });
  }, [selectedIndustries, country, selectedYear, trendWindow]);

  let visibleSites = activeSectors.length
    ? sites.filter((s) => activeSectors.includes(s.sector))
    : sites;

  // Data-source filter: "wri" narrows to sites the WRI join actually
  // enriched (they're the only ones with capacity/generation), "owid" is
  // country-scale so site markers are hidden entirely.
  if (activeSource === "climate_trace") {
    visibleSites = visibleSites.filter((s) => (s.source ?? "").startsWith("climate_trace"));
  } else if (activeSource === "epa") {
    visibleSites = visibleSites.filter((s) => s.source === "epa_ghgrp" || s.id.startsWith("epa-"));
  } else if (activeSource === "wri") {
    visibleSites = visibleSites.filter((s) => s.generation_gwh != null || s.capacity != null);
  }

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
    if (target === "map3d") {
      setView("map");
      setViewMode("3d");
      return;
    }
    if (target === "map2d") {
      setView("map");
      setViewMode("2d");
      return;
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
        onHome={() => handleNavigate("map3d")}
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
          selectedYear={parseInt(selectedYear, 10)}
          trendWindow={parseInt(trendWindow, 10)}
          onBack={() => setView("analysis")}
          onSelectSite={(s) => {
            handleSelectSite(s);
            setView("map");
          }}
        />
      ) : view !== "map" ? (
        <InfoPage page={view} onBack={() => setView("map")} />
      ) : (
        <div className="shell">
          <LeftRail
            sites={visibleSites}
            activeSource={activeSource}
            onChangeSource={setActiveSource}
            loadedSectors={loadedSectors}
            activeSectors={activeSectors}
            onToggleSector={toggleSector}
            onSelectSite={handleSelectSite}
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
              onSelectSite={handleSelectSite}
              selectedIds={selectedIds}
              visible={viewMode === "3d"}
              paused={!!selectedSite}
            />
            <FlatMap ref={flatHandle} sites={sitesOn ? visibleSites : []} visible={viewMode === "2d"} onSelectSite={handleSelectSite} selectedIds={selectedIds} focusedSiteId={selectedSite?.id ?? null} mapStyle={mapStyle} theme={theme} />

            <LegendCard active={legendOn} />
            {activeSource !== "owid" && (
              <SummaryCard sites={visibleSites} label={summaryLabel} sparkValues={statsSpark} />
            )}
            <SiteOverlay
              site={selectedSite}
              sites={visibleSites}
              side={siteOnLeft ? "left" : "right"}
              onClose={clearSelection}
            />
            {compareSite && (
              <SiteOverlay
                site={compareSite}
                sites={visibleSites}
                side="right"
                onClose={() => setCompareSite(null)}
              />
            )}
            {compareSite && selectedSite && (
              <div className="compare-badge">
                Comparing 2 sites · {fmtMt(Math.abs((selectedSite.co2 ?? 0) - (compareSite.co2 ?? 0)))} apart
              </div>
            )}
            {countryPanelOpen && panelCountry && (
              <CountryPanel
                country={panelCountry}
                onClose={() => {
                  if (selectedSite) {
                    // Site-driven: just dismiss the panel, keep the site.
                    setCountryPanelDismissed(true);
                  } else {
                    setCountry("All countries");
                    if (searchedCountry) setSearchQuery("");
                  }
                }}
              />
            )}
            {activeSource === "climate_trace" && !selectedSite && !countryPanelOpen && (
              <div className="country-panel">
                <div className="site-name display">Climate TRACE</div>
                <div className="site-sub">Modelled asset-level emissions</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)", marginTop: 12 }}>
                  Emissions <b>inferred from observation</b> — satellite imagery,
                  remote sensing and ground data run through sector models to
                  estimate output at individual assets worldwide.
                </p>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-faint)", marginTop: 10 }}>
                  Global coverage, including facilities that report to no
                  regulator — the trade-off is that figures are estimates, not
                  declarations. Asset-level history runs 2021–2024.
                </p>
                <div className="mini-kpis" style={{ marginTop: 10 }}>
                  <div><span className="mini-kpi-label">Sites in view</span><b>{visibleSites.length}</b></div>
                  <div><span className="mini-kpi-label">Years available</span><b>2021–2024</b></div>
                </div>
                {parseInt(selectedYear, 10) < 2021 && (
                  <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--amber)", marginTop: 10 }}>
                    {selectedYear} is outside this source's range — switch to 2021
                    or later to see sites.
                  </p>
                )}
              </div>
            )}
            {activeSource === "epa" && !selectedSite && !countryPanelOpen && (
              <div className="country-panel">
                <div className="site-name display">EPA GHGRP</div>
                <div className="site-sub">US Greenhouse Gas Reporting Program</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)", marginTop: 12 }}>
                  Facility-level emissions <b>reported by operators</b> under legal
                  obligation, 2010–2023. Roughly 8,000 US facilities above the
                  25,000 t CO2e threshold.
                </p>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-faint)", marginTop: 10 }}>
                  Kept separate from Climate TRACE rather than merged: Climate
                  TRACE <i>models</i> emissions from observation, GHGRP records
                  what operators <i>declare</i>. Same unit, different method — so
                  compare them, don't add them.
                </p>
                <div className="mini-kpis" style={{ marginTop: 10 }}>
                  <div><span className="mini-kpi-label">Facilities in view</span><b>{visibleSites.length}</b></div>
                  <div><span className="mini-kpi-label">Years available</span><b>2010–2023</b></div>
                </div>
                {parseInt(selectedYear, 10) > 2023 && (
                  <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--amber)", marginTop: 10 }}>
                    {selectedYear} is outside this source's range — switch the year
                    filter to 2023 or earlier to see facilities.
                  </p>
                )}
              </div>
            )}
            {activeSource === "wri" && !selectedSite && !countryPanelOpen && (
              <div className="country-panel">
                <div className="site-name display">WRI Power Plants</div>
                <div className="site-sub">Global Power Plant Database</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)", marginTop: 12 }}>
                  The map is narrowed to sites matched against WRI's database of
                  ~35,000 plants. Those matches add four fields you can see by
                  clicking any remaining site:
                </p>
                <dl className="entity-stats" style={{ marginTop: 10 }}>
                  <div><dt>Capacity</dt><dd>MW</dd></div>
                  <div><dt>Est. generation</dt><dd>GWh/yr</dd></div>
                  <div><dt>Primary fuel</dt><dd>coal, gas, hydro…</dd></div>
                  <div><dt>Commissioned</dt><dd>year built</dd></div>
                </dl>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-faint)", marginTop: 10 }}>
                  Capacity and generation together give real emissions intensity
                  (t CO2e per MWh) — the one metric emissions alone can't provide.
                  Matching is a spatial join, so only sites that are a single
                  identifiable plant match; district-level assets don't.
                </p>
                <div className="mini-kpis" style={{ marginTop: 10 }}>
                  <div>
                    <span className="mini-kpi-label">Matched sites in view</span>
                    <b>{visibleSites.length}</b>
                  </div>
                </div>
              </div>
            )}

            <ControlRow
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              legendOn={legendOn}
              onToggleLegend={() => setLegendOn((v) => !v)}
              sitesOn={sitesOn}
              onToggleSites={() => setSitesOn((v) => !v)}
              mapStyle={mapStyle}
              onChangeMapStyle={setMapStyle}
              onZoomIn={() => (viewMode === "3d" ? globeHandle.current?.zoomIn() : flatHandle.current?.zoomIn())}
              onZoomOut={() => (viewMode === "3d" ? globeHandle.current?.zoomOut() : flatHandle.current?.zoomOut())}
              onDownload={() => globeHandle.current?.downloadImage()}
            />

            <ChatFab visible={!chatOpen} onOpen={() => setChatOpen(true)} />
          </div>

          <ChatDrawer
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            sites={visibleSites}
            activeSiteId={selectedSite?.id}
            onSelectSite={handleSelectSite}
          />
        </div>
      )}
    </>
  );
}
