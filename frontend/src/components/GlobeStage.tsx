import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { Site, intensityColor } from "../data/sampleSites";
import { Theme } from "../hooks/useTheme";

export type MapStyle = "default" | "satellite" | "terrain";

const TEXTURES: Record<Theme, Record<MapStyle, string>> = {
  dark: {
    default: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
    satellite: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    terrain: "https://unpkg.com/three-globe/example/img/earth-topology.png",
  },
  light: {
    default: "https://unpkg.com/three-globe/example/img/earth-day.jpg",
    satellite: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    terrain: "https://unpkg.com/three-globe/example/img/earth-topology.png",
  },
};
const ATMO: Record<Theme, { color: string; alt: number }> = {
  dark: { color: "#2dd9b8", alt: 0.18 },
  light: { color: "#7fb2e0", alt: 0.1 },
};

export interface GlobeStageHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  downloadImage: () => void;
}

interface Props {
  sites: Site[];
  theme: Theme;
  mapStyle: MapStyle;
  showSites: boolean;
  onSelectSite: (site: Site) => void;
  visible: boolean;
}

const GlobeStage = forwardRef<GlobeStageHandle, Props>(
  ({ sites, theme, mapStyle, showSites, onSelectSite, visible }, ref) => {
    const globeRef = useRef<GlobeMethods | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 800, height: 600 });

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const g = globeRef.current;
        if (!g) return;
        const pov = g.pointOfView();
        g.pointOfView({ altitude: Math.max(0.4, pov.altitude * 0.75) }, 300);
      },
      zoomOut: () => {
        const g = globeRef.current;
        if (!g) return;
        const pov = g.pointOfView();
        g.pointOfView({ altitude: Math.min(4, pov.altitude * 1.35) }, 300);
      },
      downloadImage: () => {
        const canvas = containerRef.current?.querySelector("canvas");
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = "groundtruth-view.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      },
    }));

    // ResizeObserver instead of window resize: the stage also changes size
    // when the chat drawer opens/closes WITHOUT a window resize. Previously
    // the canvas kept its old larger width, spilled over the drawer, and
    // silently swallowed its clicks — the "panel works only after switching
    // views and back" bug.
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      function resize() {
        if (!containerRef.current) return;
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      window.addEventListener("resize", resize);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", resize);
      };
    }, [visible]);

    useEffect(() => {
      if (!globeRef.current) return;
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
    }, []);

    const texture = TEXTURES[theme][mapStyle];
    const atmo = ATMO[theme];
    const points = showSites ? sites : [];
    const maxCo2 = Math.max(...sites.map((s) => s.co2 ?? 0), 0.001);

    return (
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, overflow: "hidden", display: visible ? "block" : "none" }}
      >
        <Globe
          ref={globeRef}
          rendererConfig={{ preserveDrawingBuffer: true }}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={texture}
          bumpImageUrl={
            mapStyle === "terrain"
              ? undefined
              : "https://unpkg.com/three-globe/example/img/earth-topology.png"
          }
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d: any) => intensityColor[(d as Site).intensity]}
          pointAltitude={(d: any) => 0.02 + 0.28 * Math.sqrt(((d as Site).co2 ?? 0) / maxCo2)}
          pointRadius={(d: any) => 0.25 + 1.1 * Math.sqrt(((d as Site).co2 ?? 0) / maxCo2)}
          pointLabel={(d: any) => {
            const s = d as Site;
            return `<div style="font-family:Inter,sans-serif;font-size:12px;background:#131a24;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);color:#e7ecf2">${s.name}<br><span style="color:#8b95a5">${s.company}</span></div>`;
          }}
          onPointClick={(d: any) => onSelectSite(d as Site)}
          atmosphereColor={atmo.color}
          atmosphereAltitude={atmo.alt}
        />
      </div>
    );
  }
);

export default GlobeStage;
