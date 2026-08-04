import { useState } from "react";
import { MapStyle } from "./GlobeStage";

interface Props {
  viewMode: "3d" | "2d";
  onChangeViewMode: (mode: "3d" | "2d") => void;
  legendOn: boolean;
  onToggleLegend: () => void;
  sitesOn: boolean;
  onToggleSites: () => void;
  mapStyle: MapStyle;
  onChangeMapStyle: (style: MapStyle) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDownload: () => void;
}

const STYLES: MapStyle[] = ["default", "satellite", "terrain"];

export default function ControlRow({
  viewMode,
  onChangeViewMode,
  legendOn,
  onToggleLegend,
  sitesOn,
  onToggleSites,
  mapStyle,
  onChangeMapStyle,
  onZoomIn,
  onZoomOut,
  onDownload,
}: Props) {
  const [howtoOpen, setHowtoOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  return (
    <div className="control-row">
      <div className={`pill-btn ${sitesOn ? "on" : ""}`} onClick={onToggleSites}>
        <div className="switch">
          <i />
        </div>
        <span className="pill-text">Sites</span>
      </div>

      <div className={`pill-btn ${legendOn ? "on" : ""}`} onClick={onToggleLegend}>
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l9 4.9-9 4.9-9-4.9L12 2z" />
          <path d="M3 12.1l9 4.9 9-4.9M3 17l9 4.9L21 17" />
        </svg>
        <span className="pill-text">Legend</span>
      </div>

      <div className="dd" style={{ position: "relative" }}>
        <div className="pill-btn" onClick={() => setHowtoOpen((o) => !o)}>
          <svg className="pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.5" />
            <path d="M12 17h.01" />
          </svg>
          <span className="pill-text">How to use</span>
        </div>
        <div className={`howto-pop ${howtoOpen ? "open" : ""}`}>
          Rotate the globe by dragging, scroll to zoom, and click any point to inspect a site.
          Switch to the flat map for a full-world overview, or open the assistant to ask about
          what you're seeing.
        </div>
      </div>

      <div className="icon-group">
        <button className={viewMode === "3d" ? "active" : ""} onClick={() => onChangeViewMode("3d")} title="3D globe" aria-label="3D globe">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
          </svg>
        </button>
        <button className={viewMode === "2d" ? "active" : ""} onClick={() => onChangeViewMode("2d")} title="Flat map" aria-label="Flat map">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18M9 5v14" />
          </svg>
        </button>

        <div className="divider" />

        <div className="dd" style={{ position: "relative" }}>
          <button className={mapStyle !== "default" ? "active" : ""} onClick={() => setStyleOpen((o) => !o)} title="Map style" aria-label="Map style">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
              <path d="M9 3v15M15 6v15" />
            </svg>
          </button>
          <div className={`style-dd ${styleOpen ? "open" : ""}`}>
            {STYLES.map((s) => (
              <div
                key={s}
                className={`dd-item single ${mapStyle === s ? "checked" : ""}`}
                onClick={() => {
                  onChangeMapStyle(s);
                  setStyleOpen(false);
                }}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </div>
            ))}
          </div>
        </div>

        <button onClick={onDownload} title="Download view" aria-label="Download view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
        <button onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
