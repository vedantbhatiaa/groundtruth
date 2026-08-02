interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export default function NavDrawer({ open, onClose, onNavigate }: Props) {
  function go(view: string) {
    onNavigate(view);
    onClose();
  }
  return (
    <>
      <div className={`nav-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <nav className={`nav-drawer ${open ? "open" : ""}`}>
        <div className="nav-brand">
          <div className="mark display">G</div>
          <div className="word display">Groundtruth</div>
        </div>
        <a className="nav-item" onClick={() => go("map3d")}>Home</a>
        <div className="nav-section">Track emissions</div>
        <a className="nav-item sub" onClick={() => go("map2d")}>Explore map</a>
        <a className="nav-item sub" onClick={() => go("analysis")}>Company analysis</a>
        <div className="nav-section">Resources</div>
        <a className="nav-item sub" onClick={() => go("downloads")}>Data downloads</a>
        <a className="nav-item sub" onClick={() => go("methodology")}>Approach and methodology</a>
        <a className="nav-item sub" onClick={() => go("sectors")}>Sectors covered</a>
        <div className="nav-section">More</div>
        <a className="nav-item sub" onClick={() => go("news")}>News and insights</a>
        <a className="nav-item sub" onClick={() => go("support")}>Support</a>
        <a className="nav-item sub" onClick={() => go("contact")}>Contact</a>
        <a className="nav-item sub" onClick={() => go("about")}>About this project</a>
      </nav>
    </>
  );
}
