import React, { useState, useCallback, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

const COLORS = {
  bg: "#0a0e1a",
  card: "#111827",
  cardBorder: "#1f2937",
  success: "#10b981",
  successDark: "#065f46",
  error: "#ef4444",
  errorDark: "#7f1d1d",
  slow: "#f59e0b",
  slowDark: "#78350f",
  blue: "#3b82f6",
  blueDark: "#1e3a5f",
  text: "#f9fafb",
  muted: "#6b7280",
  logBg: "#0d1117",
};

const css = `
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes countUp { from{transform:scale(1.3)} to{transform:scale(1)} }
  .btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn { transition: all 0.15s ease; }
  .log-entry { animation: fadeIn 0.2s ease; }
  .card:hover { border-color: #374151 !important; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
`;

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      flex: 1, background: COLORS.card, borderRadius: 12,
      padding: "1.25rem", border: `1px solid ${COLORS.cardBorder}`,
      textAlign: "center", position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 8, right: 12, fontSize: "1.4rem", opacity: 0.15 }}>{icon}</div>
      <div style={{ color: COLORS.muted, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "2.2rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function ActionCard({ title, subtitle, endpoint, type, color, darkColor, icon, onFire, onBurst, loading }) {
  return (
    <div className="card" style={{
      background: COLORS.card, borderRadius: 16, padding: "1.5rem",
      border: `1px solid ${COLORS.cardBorder}`, transition: "border-color 0.2s"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: "1.5rem" }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: COLORS.text }}>{title}</div>
          <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>{subtitle}</div>
        </div>
      </div>
      <div style={{
        background: darkColor, borderRadius: 8, padding: "0.5rem 0.75rem",
        marginBottom: 12, fontSize: "0.72rem", fontFamily: "monospace", color: "#9ca3af"
      }}>
        GET {endpoint}
      </div>
      <button className="btn" onClick={onFire} disabled={loading} style={{
        width: "100%", padding: "0.65rem", borderRadius: 8, border: "none",
        background: loading ? "#374151" : color, color: "#fff", fontWeight: 700,
        fontSize: "0.88rem", cursor: loading ? "not-allowed" : "pointer", marginBottom: 8
      }}>
        {loading ? "⏳ Enviando..." : `⚡ Fire 1 Request`}
      </button>
      <button className="btn" onClick={onBurst} style={{
        width: "100%", padding: "0.65rem", borderRadius: 8, border: `1px solid ${color}`,
        background: "transparent", color, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer"
      }}>
        🚀 Burst × 20
      </button>
    </div>
  );
}

function LogEntry({ entry }) {
  const colors = { success: COLORS.success, error: COLORS.error, slow: COLORS.slow };
  const icons = { success: "✅", error: "❌", slow: "⏳" };
  return (
    <div className="log-entry" style={{
      display: "flex", gap: 10, padding: "0.45rem 0",
      borderBottom: `1px solid #1f2937`, alignItems: "flex-start"
    }}>
      <span style={{ color: COLORS.muted, fontSize: "0.72rem", whiteSpace: "nowrap", paddingTop: 2 }}>{entry.ts}</span>
      <span style={{ fontSize: "0.85rem" }}>{icons[entry.type]}</span>
      <span style={{
        fontSize: "0.7rem", fontWeight: 700, padding: "1px 7px", borderRadius: 999,
        background: colors[entry.type] + "22", color: colors[entry.type], whiteSpace: "nowrap"
      }}>{entry.status}</span>
      <span style={{ fontSize: "0.78rem", color: "#d1d5db", fontFamily: "monospace" }}>{entry.message}</span>
      <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: COLORS.muted, whiteSpace: "nowrap" }}>{entry.ms}ms</span>
    </div>
  );
}

export default function App() {
  const [log, setLog] = useState([]);
  const [counts, setCounts] = useState({ success: 0, error: 0, slow: 0 });
  const [loading, setLoading] = useState({});
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor(s%3600/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const addLog = useCallback((type, status, message, ms) => {
    setLog(prev => [{
      id: Date.now() + Math.random(), type, status, message, ms,
      ts: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 150));
    setCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
  }, []);

  const fireRequest = useCallback(async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    const urls = { success: "/api/success", error: "/api/error", slow: "/api/slow" };
    const t0 = performance.now();
    try {
      const res = await fetch(API_BASE + urls[type]);
      const data = await res.json();
      const ms = Math.round(performance.now() - t0);
      addLog(type, res.status, data.message, ms);
    } catch (err) {
      addLog("error", 0, err.message, Math.round(performance.now() - t0));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [addLog]);

  const burst = useCallback(async (type) => {
    for (let i = 0; i < 20; i++) {
      fireRequest(type);
      await new Promise(r => setTimeout(r, 60));
    }
  }, [fireRequest]);

  const total = counts.success + counts.error + counts.slow;
  const errorPct = total > 0 ? Math.round((counts.error / total) * 100) : 0;

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "1.5rem 2rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              🗼 WatchTower
            </h1>
            <p style={{ margin: 0, color: COLORS.muted, fontSize: "0.82rem" }}>Chaos Engineering & Observability Platform</p>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7rem", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Session Uptime</div>
              <div style={{ fontFamily: "monospace", fontSize: "1rem", color: COLORS.blue }}>{fmt(uptime)}</div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.success, boxShadow: `0 0 8px ${COLORS.success}`, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "0.78rem", color: COLORS.success, fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard label="Success" value={counts.success} color={COLORS.success} icon="✅" />
          <StatCard label="Errors" value={counts.error} color={COLORS.error} icon="❌" />
          <StatCard label="Slow" value={counts.slow} color={COLORS.slow} icon="⏳" />
          <StatCard label="Total" value={total} color={COLORS.blue} icon="📦" />
          <StatCard label="Error %" value={`${errorPct}%`} color={errorPct > 10 ? COLORS.error : COLORS.success} icon="📊" />
        </div>

        {/* Error bar */}
        {total > 0 && (
          <div style={{ marginBottom: "1.5rem", background: COLORS.card, borderRadius: 8, padding: "0.75rem 1rem", border: `1px solid ${COLORS.cardBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.75rem", color: COLORS.muted }}>Error Rate</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: errorPct > 10 ? COLORS.error : COLORS.success }}>{errorPct}% {errorPct > 10 ? "⚠️ ALERT THRESHOLD EXCEEDED" : "✅ Normal"}</span>
            </div>
            <div style={{ background: "#1f2937", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(errorPct, 100)}%`, background: errorPct > 10 ? COLORS.error : COLORS.success, borderRadius: 4, transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}

        {/* Action cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <ActionCard title="Success Endpoint" subtitle="Simula operacion exitosa" endpoint="/api/success → HTTP 200"
            type="success" color={COLORS.success} darkColor={COLORS.successDark} icon="✅"
            onFire={() => fireRequest("success")} onBurst={() => burst("success")} loading={loading.success} />
          <ActionCard title="Error Endpoint" subtitle="Simula fallo del servidor" endpoint="/api/error → HTTP 500"
            type="error" color={COLORS.error} darkColor={COLORS.errorDark} icon="❌"
            onFire={() => fireRequest("error")} onBurst={() => burst("error")} loading={loading.error} />
          <ActionCard title="Slow Endpoint" subtitle="Simula latencia alta" endpoint="/api/slow → 2s delay"
            type="slow" color={COLORS.slow} darkColor={COLORS.slowDark} icon="⏳"
            onFire={() => fireRequest("slow")} onBurst={() => burst("slow")} loading={loading.slow} />
        </div>

        {/* Links */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[["📊 Prometheus", "http://localhost:9090"], ["📈 Grafana", "http://localhost:3003"], ["🔔 Alertmanager", "http://localhost:9093"], ["⚙️ Metrics", "http://localhost:3001/metrics"]].map(([label, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" style={{
              padding: "0.4rem 0.9rem", borderRadius: 8, border: `1px solid ${COLORS.cardBorder}`,
              background: COLORS.card, color: COLORS.muted, fontSize: "0.78rem",
              textDecoration: "none", fontWeight: 500, transition: "color 0.15s"
            }}>{label}</a>
          ))}
          <button onClick={() => { setLog([]); setCounts({ success: 0, error: 0, slow: 0 }); }}
            style={{ marginLeft: "auto", padding: "0.4rem 0.9rem", borderRadius: 8, border: `1px solid ${COLORS.cardBorder}`, background: COLORS.card, color: COLORS.muted, fontSize: "0.78rem", cursor: "pointer" }}>
            🗑️ Clear
          </button>
        </div>

        {/* Log */}
        <div style={{ background: COLORS.logBg, borderRadius: 12, border: `1px solid ${COLORS.cardBorder}`, overflow: "hidden" }}>
          <div style={{ padding: "0.75rem 1rem", borderBottom: `1px solid ${COLORS.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>📋 Live Request Log</span>
            <span style={{ fontSize: "0.72rem", color: COLORS.muted }}>{log.length} entries</span>
          </div>
          <div style={{ padding: "0.5rem 1rem", maxHeight: 280, overflowY: "auto" }}>
            {log.length === 0
              ? <div style={{ color: COLORS.muted, fontSize: "0.82rem", padding: "1rem 0", textAlign: "center" }}>No requests yet — fire some above ☝️</div>
              : log.map(e => <LogEntry key={e.id} entry={e} />)
            }
          </div>
        </div>

      </div>
    </>
  );
}