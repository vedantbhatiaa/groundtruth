interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NavDrawer({ open, onClose }: Props) {
  return (
    <>
      <div className={`nav-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <nav className={`nav-drawer ${open ? "open" : ""}`}>
        <div className="nav-brand">
          <div className="mark display">G</div>
          <div>
            <div className="word display">Groundtruth</div>
            <div className="tag">emissions, traced to source</div>
          </div>
        </div>
        <a className="nav-item">Home</a>
        <div className="nav-section">Track emissions</div>
        <a className="nav-item sub">Explore map</a>
        <a className="nav-item sub">Company analysis</a>
        <a className="nav-item sub">Country inventories</a>
        <div className="nav-section">Resources</div>
        <a className="nav-item sub">Data downloads</a>
        <a className="nav-item sub">Approach and methodology</a>
        <a className="nav-item sub">Sectors covered</a>
        <div className="nav-section">More</div>
        <a className="nav-item sub">News and insights</a>
        <a className="nav-item sub">Support</a>
        <a className="nav-item sub">Contact</a>
        <a className="nav-item sub">About this project</a>
      </nav>
    </>
  );
}
