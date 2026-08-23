import { useState, useEffect, useRef } from "react";
import "./App.css";

interface Signal {
  id: number;
  name: string;
  status: "RED" | "GREEN" | "PREPARING";
}

interface CorridorState {
  emergency_active: boolean;
  police_available: boolean;
  police_decision: string;
  road_blocked: boolean;
  ambulance_location: string;
  route_name: string;
  eta_seconds: number;
  distance_km: number;
  severity?: string;
  signals: Signal[];
  alert: string;
}

const DEFAULT_STATE: CorridorState = {
  emergency_active: false,
  police_available: true,
  police_decision: "PENDING",
  road_blocked: false,
  ambulance_location: "7th Cross, MG Road",
  route_name: "Primary Corridor (Route A)",
  eta_seconds: 180,
  distance_km: 2.4,
  severity: "NONE",
  signals: [
    { id: 1, name: "Intersection 1 - MG Road", status: "RED" },
    { id: 2, name: "Intersection 2 - Central Ave", status: "RED" },
    { id: 3, name: "Intersection 3 - Park Street", status: "RED" },
    { id: 4, name: "Intersection 4 - Hospital Link", status: "RED" },
  ],
  alert: "NORMAL OPERATIONS - SYSTEM READY",
};

export default function App() {
  const [state, setState] = useState<CorridorState>(DEFAULT_STATE);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [role, setRole] = useState<"hq" | "ambulance">("hq");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "ambulance") setRole("ambulance");
    else setRole("hq");

    const WS_URL =
      window.location.hostname === "localhost"
        ? "ws://127.0.0.1:8765/ws"
        : "wss://traffic-backend-4e01.onrender.com/ws";

    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected to Render cloud backend");
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "STATE_UPDATE" && msg.data) {
              setState((prev) => ({
                ...prev,
                ...msg.data,
                severity: msg.data.severity || prev.severity || "CRITICAL (CODE RED)",
              }));
            }
          } catch (e) {
            console.error(e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimer = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          setConnected(false);
          ws.close();
        };
      } catch (err) {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleAction = (action: string, severityChoice?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, severity: severityChoice }));
    }
  };

  const getSeverityBadgeColor = () => {
    const sev = state.severity || "NONE";
    if (sev.includes("CRITICAL")) return { bg: "#450a0a", text: "#f87171", border: "#dc2626" };
    if (sev.includes("URGENT")) return { bg: "#451a03", text: "#fbbf24", border: "#d97706" };
    if (sev.includes("ROUTINE")) return { bg: "#064e3b", text: "#34d399", border: "#059669" };
    return { bg: "#1e293b", text: "#94a3b8", border: "#334155" };
  };

  const badgeStyle = getSeverityBadgeColor();

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", backgroundColor: "#0b0f19", color: "#f1f5f9", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#38bdf8" }}>
            {role === "hq" ? "🚨 TRAFFIC POLICE COMMAND HQ" : "🚑 AMBULANCE ON-BOARD DISPATCH"}
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            {role === "hq" ? "Corridor Green-Wave Coordination System" : "Emergency Priority Broadcast & Fast Track"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => {
              const nextRole = role === "hq" ? "ambulance" : "hq";
              window.location.search = `?role=${nextRole}`;
            }}
            style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: "#334155", color: "#f8fafc", border: "1px solid #475569", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
          >
            Switch to {role === "hq" ? "🚑 Ambulance App" : "🚨 HQ App"}
          </button>
          <span style={{ padding: "6px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold", backgroundColor: connected ? "#064e3b" : "#450a0a", color: connected ? "#34d399" : "#fca5a5" }}>
            {connected ? "● CLOUD SYNCED" : "○ DISCONNECTED"}
          </span>
        </div>
      </header>

      {/* Alert Banner */}
      <div style={{ marginTop: "14px", padding: "12px", borderRadius: "8px", fontWeight: "bold", textAlign: "center", backgroundColor: state.emergency_active ? (state.police_decision.includes("REJECTED") ? "#450a0a" : "#064e3b") : "#1e293b", border: "1px solid #334155", color: "#f8fafc" }}>
        STATUS: {state.alert}
      </div>

      {/* Ambulance Layout */}
      {role === "ambulance" ? (
        <div style={{ marginTop: "20px" }}>
          <div style={{ backgroundColor: "#111827", padding: "18px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#38bdf8", fontSize: "1.1rem" }}>📍 LIVE NAVIGATION</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ backgroundColor: "#1f2937", padding: "12px", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>CURRENT CORRIDOR</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fbbf24" }}>{state.route_name}</div>
              </div>
              <div style={{ backgroundColor: "#1f2937", padding: "12px", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>ETA / DISTANCE</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#38bdf8" }}>{state.eta_seconds}s ({state.distance_km} km)</div>
              </div>
            </div>
            <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#1f2937", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>HQ CLEARANCE STATUS: </span>
              <strong style={{ color: state.police_decision === "APPROVED" || state.police_decision === "AUTO_APPROVED" ? "#4ade80" : "#f87171" }}>
                {state.police_decision}
              </strong>
            </div>
          </div>

          <h3 style={{ color: "#e2e8f0", fontSize: "1rem", marginBottom: "10px" }}>SELECT PATIENT EMERGENCY SEVERITY:</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button onClick={() => handleAction("TRIGGER_EMERGENCY", "CRITICAL (CODE RED)")} style={{ padding: "18px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1.1rem", cursor: "pointer" }}>
              🔴 CODE RED: CRITICAL (CARDIAC / TRAUMA)
            </button>
            <button onClick={() => handleAction("TRIGGER_EMERGENCY", "URGENT (CODE YELLOW)")} style={{ padding: "16px", backgroundColor: "#d97706", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>
              🟡 CODE YELLOW: URGENT (STABLE / MONITORING)
            </button>
            <button onClick={() => handleAction("TRIGGER_EMERGENCY", "ROUTINE (CODE GREEN)")} style={{ padding: "14px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "0.95rem", cursor: "pointer" }}>
              🟢 CODE GREEN: ROUTINE TRANSFER (NO OVERRIDE)
            </button>
            <button onClick={() => handleAction("RESET_NORMAL")} style={{ padding: "12px", backgroundColor: "#334155", color: "#cbd5e1", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}>
              🔄 Reset Dispatch Trip
            </button>
          </div>
        </div>
      ) : (
        /* HQ Operator Layout */
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div style={{ backgroundColor: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>AMBULANCE LOCATION</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", marginTop: "4px" }}>{state.ambulance_location}</div>
            </div>
            <div style={{ backgroundColor: "#111827", padding: "14px", borderRadius: "8px", border: `1px solid ${badgeStyle.border}` }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>PATIENT SEVERITY</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", marginTop: "4px", color: badgeStyle.text }}>{state.severity || "NONE"}</div>
            </div>
            <div style={{ backgroundColor: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>ETA & DISTANCE</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", marginTop: "4px", color: "#38bdf8" }}>{state.eta_seconds}s ({state.distance_km} km)</div>
            </div>
            <div style={{ backgroundColor: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>ASSIGNED ROUTE</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", marginTop: "4px", color: "#f59e0b" }}>{state.route_name}</div>
            </div>
          </div>

          <div style={{ marginTop: "16px", backgroundColor: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #1e293b" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#cbd5e1", fontSize: "0.8rem", textTransform: "uppercase" }}>Corridor Signals ({state.signals.length} Intersections)</h4>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.signals.length}, 1fr)`, gap: "10px" }}>
              {state.signals.map((sig) => (
                <div key={sig.id} style={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "6px", padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", color: "#e2e8f0", marginBottom: "8px" }}>{sig.name}</div>
                  <span style={{ display: "inline-block", padding: "5px 14px", borderRadius: "20px", fontWeight: "bold", fontSize: "0.8rem", backgroundColor: sig.status === "GREEN" ? "#15803d" : sig.status === "PREPARING" ? "#b45309" : "#b91c1c", color: "#fff" }}>
                    {sig.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
            <button onClick={() => handleAction("POLICE_APPROVE")} style={{ padding: "14px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>
              [ APPROVE GREEN WAVE ]
            </button>
            <button onClick={() => handleAction("POLICE_REJECT")} style={{ padding: "14px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>
              [ REJECT CORRIDOR ]
            </button>
          </div>

          <div style={{ marginTop: "16px", backgroundColor: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => handleAction("TOGGLE_ROAD_BLOCK")} style={{ padding: "8px 12px", backgroundColor: "#1e293b", border: "1px solid #f59e0b", color: "#fbbf24", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem" }}>
              🚧 Block Corridor
            </button>
            <button onClick={() => handleAction("TOGGLE_OPERATOR")} style={{ padding: "8px 12px", backgroundColor: "#1e293b", border: "1px solid #8b5cf6", color: "#a78bfa", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem" }}>
              👮 Operator Failover
            </button>
            <button onClick={() => handleAction("RESET_NORMAL")} style={{ padding: "8px 12px", backgroundColor: "#1e293b", border: "1px solid #64748b", color: "#94a3b8", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem" }}>
              🔄 Reset Normal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
