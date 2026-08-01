# Frontend

React + Vite + TypeScript. Renders the globe/map, filters, and the
assistant drawer, talking to the FastAPI backend over `/api/*`.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173. The dev server proxies `/api/*` requests
to http://localhost:8000 (see `vite.config.ts`), so start the backend
first for real data — the app falls back to bundled sample data
automatically if the backend isn't running, so it's still browsable on
its own.

## Folder guide

- `src/components/` — one component per UI piece (Header, FilterBar,
  GlobeStage, ChatDrawer, etc.), matching the structure of the original
  HTML prototype
- `src/data/sampleSites.ts` — the 8 mock sites used as a local fallback
- `src/api/client.ts` — all backend calls live here; nothing else in the
  app calls `fetch` directly
- `src/styles/theme.css` — one shared stylesheet with CSS variables for
  light/dark mode, ported from the original prototype
- `src/hooks/useTheme.ts` — the light/dark mode toggle

## Notes on what's stubbed

- `ControlRow`'s satellite/terrain style buttons are wired to change
  state and highlight, but don't yet change the actual globe texture —
  that's a small addition to `GlobeStage`'s texture selection once you
  have real satellite/terrain tile sources to point at.
- The "Sites" toggle switch in the control row doesn't yet filter which
  points render; it's there as the UI hook, filtering logic is a one-line
  addition once decided (e.g. whether it means all sites vs. only
  currently visible-on-screen sites).
