import { useState } from "react";
import { Site, intensityColor } from "../data/sampleSites";
import { sendChatMessage } from "../api/client";
import { fmtMt } from "../utils/format";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sites: Site[];
  activeSiteId?: string;
  onSelectSite: (site: Site) => void;
}

export default function ChatDrawer({ open, onClose, sites, activeSiteId, onSelectSite }: Props) {
  const [tab, setTab] = useState<"assistant" | "sites">("assistant");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Ask me anything about the sites on the map — emissions trends, news, or filings." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const result = await sendChatMessage(text, activeSiteId);
      setMessages((m) => [...m, { role: "bot", text: result.answer }]);
    } catch (err) {
      console.error("[Groundtruth] chat send failed:", err);
      setMessages((m) => [...m, { role: "bot", text: "Something went wrong sending that — check the browser console for details." }]);
    } finally {
      setSending(false);
    }
  }

  const sortedSites = [...sites].sort((a, b) => (sortDesc ? b.co2 - a.co2 : a.co2 - b.co2));

  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-header">
        <span className="display">Groundtruth</span>
        <button className="drawer-collapse" onClick={onClose}>
          ▾
        </button>
      </div>
      <div className="drawer-tabs">
        <div className={`drawer-tab ${tab === "assistant" ? "active" : ""}`} onClick={() => setTab("assistant")}>
          Assistant
        </div>
        <div className={`drawer-tab ${tab === "sites" ? "active" : ""}`} onClick={() => setTab("sites")}>
          Sites
        </div>
      </div>

      <div className={`drawer-panel ${tab === "assistant" ? "active" : ""}`}>
        <div className="chat-log">
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.text}
            </div>
          ))}
          {sending && <div className="bubble bot">Thinking…</div>}
        </div>
        <div className="chat-input-row">
          <input
            type="text"
            placeholder="Ask a question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="send-btn" onClick={send} disabled={sending}>
            →
          </button>
        </div>
      </div>

      <div className={`drawer-panel ${tab === "sites" ? "active" : ""}`}>
        <div className="sites-list">
          <span className="sites-sort" onClick={() => setSortDesc((d) => !d)}>Sort by emission rate {sortDesc ? "\u2193" : "\u2191"}</span>
          {sortedSites.map((s) => (
            <div key={s.id} className="site-card" onClick={() => onSelectSite(s)}>
              <div
                className="swatch"
                style={{ background: `${intensityColor[s.intensity]}22`, border: `1px solid ${intensityColor[s.intensity]}` }}
              />
              <div>
                <div className="name">{s.name}</div>
                <div className="loc">
                  {s.country} · {s.lat?.toFixed(1) ?? "?"}, {s.lng?.toFixed(1) ?? "?"}
                </div>
                <div className="rate" style={{ color: intensityColor[s.intensity] }}>
                  {fmtMt(s.co2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
