import { Theme } from "../hooks/useTheme";

interface Props {
  onOpenNav: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  backendOnline: boolean;
}

export default function Header({
  onOpenNav,
  theme,
  onToggleTheme,
  searchQuery,
  onChangeSearchQuery,
  backendOnline,
}: Props) {
  return (
    <header>
      <button className="hamburger" onClick={onOpenNav} aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="brand">
        <div className="mark display">G</div>
        <div>
          <span className="word">Groundtruth</span>
          <span className="tag">/ emissions, traced to source</span>
        </div>
      </div>

      <div className="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search by company, site, or location"
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
        />
      </div>

      <div className="filterbar-spacer" />

      <div className="status">
        <span className={`dot ${backendOnline ? "" : "offline"}`} />
        {backendOnline ? "Live · Climate TRACE synced" : "Offline · showing sample data"}
      </div>

      <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle light and dark mode">
        {theme === "light" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </button>
    </header>
  );
}
