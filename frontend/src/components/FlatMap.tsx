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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);

  function clampOffset(x: number, y: number, s: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    const maxX = rect ? (rect.width * (s - 1)) / 2 : 0;
    const maxY = rect ? (rect.height * (s - 1)) / 2 : 0;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }

  function setZoom(next: number) {
    const s = Math.max(1, Math.min(4, next));
    setScale(s);
    setOffset((o) => clampOffset(o.x, o.y, s));
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoom(scale * 1.3),
    zoomOut: () => setZoom(scale / 1.3),
  }));

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    setOffset(clampOffset(d.baseX + dx, d.baseY + dy, scale));
  }
  function onPointerUp() {
    dragState.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    setZoom(e.deltaY < 0 ? scale * 1.15 : scale / 1.15);
  }

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
    <div
      ref={containerRef}
      className={`flatmap ${visible ? "active" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      style={{ cursor: scale > 1 ? "grab" : "default", touchAction: "none" }}
    >
      <div style={{ position: "absolute", inset: 0, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center center", transition: dragState.current ? "none" : "transform .2s ease" }}>
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
