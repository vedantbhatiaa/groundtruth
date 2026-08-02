import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Site, intensityColor } from "../data/sampleSites";

interface Props {
  sites: Site[];
  visible: boolean;
  onSelectSite: (site: Site) => void;
}

interface DotPosition {
  site: Site;
  x: number;
  y: number;
  size: number;
}

export interface FlatMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
}

const FlatMap = forwardRef<FlatMapHandle, Props>(({ sites, visible, onSelectSite }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<DotPosition[]>([]);
  const [scale, setScale] = useState(1);

  useImperativeHandle(ref, () => ({
    zoomIn: () => setScale((s) => Math.min(4, s * 1.3)),
    zoomOut: () => setScale((s) => Math.max(1, s / 1.3)),
  }));

  useEffect(() => {
    function project() {
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      let rectW: number, rectH: number, rectX: number, rectY: number;
      if (cw / ch > 2) {
        rectH = ch;
        rectW = ch * 2;
        rectX = (cw - rectW) / 2;
        rectY = 0;
      } else {
        rectW = cw;
        rectH = cw / 2;
        rectX = 0;
        rectY = (ch - rectH) / 2;
      }
      const maxCo2 = Math.max(...sites.map((s) => s.co2 ?? 0), 0.001);
      setDots(
        sites.map((s) => ({
          site: s,
          x: rectX + ((s.lng + 180) / 360) * rectW,
          y: rectY + ((90 - s.lat) / 180) * rectH,
          size: 7 + 24 * Math.sqrt((s.co2 ?? 0) / maxCo2),
        }))
      );
    }
    project();
    window.addEventListener("resize", project);
    return () => window.removeEventListener("resize", project);
  }, [sites, visible]);

  return (
    <div ref={containerRef} className={`flatmap ${visible ? "active" : ""}`}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform .2s ease" }}>
      <img src="https://unpkg.com/three-globe/example/img/earth-day.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div>
        {dots.map(({ site, x, y, size }) => (
          <div
            key={site.id}
            className="flat-dot"
            title={site.name}
            onClick={() => onSelectSite(site)}
            style={{
              left: x,
              top: y,
              width: size,
              height: size,
              background: intensityColor[site.intensity],
              color: intensityColor[site.intensity],
            }}
          />
        ))}
      </div>
      </div>
    </div>
  );
});

export default FlatMap;
