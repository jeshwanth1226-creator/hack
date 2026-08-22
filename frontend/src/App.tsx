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

  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket("ws://127.0.0.1:8765");
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
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
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
    } catch {
      setConnected(false);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleAction = (action: string, severityChoice?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, severity: severityChoice }));
    }

    setState((prev) => {
      let next = { ...prev };

      if (action === "TRIGGER_EMERGENCY") {
        next.emergency_active = true;
        next.severity = severityChoice || "CRITICAL (CODE RED)";

        if (next.severity.includes("ROUTINE")) {
          next.police_decision = "NORMAL FLOW (NO PREEMPTION)";
          next.alert = "ROUTINE TRANSPORT - STANDARD TRAFFIC SIGNALS MAINTAINED";
          next.signals = next.signals.map((s) => ({ ...s, status: "RED" }));
          return next;
        }

        if (!next.police_available) {
          next.police_decision = "AUTO_APPROVED";
          next.signals = next.road_blocked
            ? [
                { id: 1, name: "Intersection 1 - MG Road", status: "GREEN" },
                { id: 5, name: "Intersection 5 - Ring Road Bypass", status: "GREEN" },
                { id: 4, name: "Intersection 4 - Hospital Link", status: "PREPARING" },
              ]
            : [
                { id: 1, name: "Intersection 1 - MG Road", status: "GREEN" },
                { id: 2, name: "Intersection 2 - Central Ave", status: "GREEN" },
                { id: 3, name: "Intersection 3 - Park Street", status: "PREPARING" },
                { id: 4, name: "Intersection 4 - Hospital Link", status: "RED" },
              ];
          next.alert = `AUTOMATIC FAILOVER ENGAGED FOR ${next.severity}`;
        } else {
          next.police_decision = "PENDING";
          next.alert = `EMERGENCY ALERT [${next.severity}] - AWAITING POLICE APPROVAL`;
        }
      } else if (action === "POLICE_APPROVE") {
        if (next.emergency_active) {
          next.police_decision = "APPROVED";
          next.signals = next.road_blocked
            ? [
                { id: 1, name: "Intersection 1 - MG Road", status: "GREEN" },
                { id: 5, name: "Intersection 5 - Ring Road Bypass", status: "GREEN" },
                { id: 4, name: "Intersection 4 - Hospital Link", status: "PREPARING" },
              ]
            : [
                { id: 1, name: "Intersection 1 - MG Road", status: "GREEN" },
                { id: 2, name: "Intersection 2 - Central Ave", status: "GREEN" },
                { id: 3, name: "Intersection 3 - Park Street", status: "PREPARING" },
                { id: 4, name: "Intersection 4 - Hospital Link", status: "RED" },
              ];
          next.alert = `GREEN-WAVE CLEARED FOR ${next.severity || "CRITICAL"}`;
        }
      } else if (action === "POLICE_REJECT") {
        if (next.emergency_active) {
          next.police_decision = "REJECTED (REROUTING SUGGESTED)";
          next.road_blocked = true;
          next.route_name = "Alternative Bypass (Route B)";
          next.eta_seconds = 240;
          next.distance_km = 3.1;
          next.signals = [
            { id: 1, name: "Intersection 1 - MG Road", status: "RED" },
            { id: 5, name: "Intersection 5 - Ring Road Bypass", status: "RED" },
            { id: 4, name: "Intersection 4 - Hospital Link", status: "RED" },
          ];
          next.alert = "PRIMARY ROUTE REJECTED - DETOUR SUGGESTED TO ROUTE B";
        }
      } else if (action === "TOGGLE_ROAD_BLOCK") {
        next.road_blocked = !next.road_blocked;
        if (next.road_blocked) {
          next.route_name = "Alternative Bypass (Route B)";
          next.eta_seconds = 240;
          next.distance_km = 3.1;
          if (next.emergency_active && (next.police_decision === "APPROVED" || next.police_decision === "AUTO_APPROVED")) {
            next.signals = [
              { id: 1, name: "Intersection 1 - MG Road", status: "GREEN" },
              { id: 5, name: "Intersection 5 - Ring Road Bypass", status: "GREEN" },
              { id: 4, name: "Intersection 4 - Hospital Link", status: "PREPARING" },
            ];
            next.alert = "ROAD BLOCKED - ALTERNATIVE ROUTE B ACTIVE";
          }
        } else {
          next.route_name = "Primary Corridor (Route A)";
          next.eta_seconds = 180;
          next.distance_km = 2.4;
          if (next.emergency_active && (next.police_decision === "APPROVED" || next.police_decision === "AUTO_APPROVED")) {
            next.signals = [
              { id: 1, name: "Intersection 1 - MG Road", status: "GREEN" },
              { id: 2, name: "Intersection 2 - Central Ave", status: "GREEN" },
              { id: 3, name: "Intersection 3 - Park Street", status: "PREPARING" },
              { id: 4, name: "Intersection 4 - Hospital Link", status: "RED" },
            ];
            next.alert = "GREEN-WAVE ACTIVE - PRIMARY ROUTE A";
          }
        }
      } else if (action === "TOGGLE_OPERATOR") {
        next.police_available = !next.police_available;
        if (!next.police_available && next.emergency_active && next.police_decision === "PENDING") {
          next.police_decision = "AUTO_APPROVED";
          next.alert = `OPERATOR OFFLINE - AUTO FAILOVER ACTIVATED FOR ${next.severity || "CRITICAL"}`;
          next.signals = [
            { id: 1, name: "Intersection 1 - MG Road", status: "GREEN" },
            { id: 2, name: "Intersection 2 - Central Ave", status: "GREEN" },
            { id: 3, name: "Intersection 3 - Park Street", status: "PREPARING" },
            { id: 4, name: "Intersection 4 - Hospital Link", status: "RED" },
          ];
        }
      } else if (action === "RESET_NORMAL") {
        next = { ...DEFAULT_STATE, police_available: next.police_available };
      }
      return next;
    });
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
    <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif", backgroundColor: "#0b0f19", color: "#f1f5f9", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.7rem", color: "#38bdf8" }}>🚨 TRAFFIC POLICE COMMAND CENTER</h1>
          <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>EMERGENCY GREEN-WAVE AUTOMATION & CORRIDOR DISPATCH</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <span style={{ padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "bold", backgroundColor: connected ? "#064e3b" : "#334155", color: connected ? "#34d399" : "#94a3b8" }}>
            {connected ? "● BACKEND SYNCED" : "○ LOCAL RUNTIME ACTIVE"}
          </span>
          <span style={{ padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "bold", backgroundColor: state.police_available ? "#14532d" : "#78350f", color: state.police_available ? "#4ade80" : "#fbbf24" }}>
            {state.police_available ? "● OPERATOR ONLINE" : "🤖 AUTO-PILOT FAILOVER"}
          </span>
        </div>
      </header>

      {/* Notification Banner */}
      <div style={{ marginTop: "18px", padding: "14px", borderRadius: "8px", fontWeight: "bold", textAlign: "center", backgroundColor: state.emergency_active ? (state.police_decision.includes("REJECTED") ? "#450a0a" : "#064e3b") : "#1e293b", border: "1px solid #334155", color: "#f8fafc" }}>
        SYSTEM NOTIFICATION: {state.alert}
      </div>

      {/* Telemetry Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginTop: "18px" }}>
        <div style={{ backgroundColor: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Ambulance Location</div>
          <div style={{ fontSize: "1.05rem", fontWeight: "bold", marginTop: "6px" }}>{state.ambulance_location}</div>
        </div>
        <div style={{ backgroundColor: "#111827", padding: "16px", borderRadius: "8px", border: `1px solid ${badgeStyle.border}` }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Patient Triage Code</div>
          <div style={{ fontSize: "1.05rem", fontWeight: "bold", marginTop: "6px", color: badgeStyle.text }}>{state.severity || "NONE"}</div>
        </div>
        <div style={{ backgroundColor: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>ETA & Distance</div>
          <div style={{ fontSize: "1.05rem", fontWeight: "bold", marginTop: "6px", color: "#38bdf8" }}>{state.eta_seconds}s ({state.distance_km} km)</div>
        </div>
        <div style={{ backgroundColor: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Current Route</div>
          <div style={{ fontSize: "1.05rem", fontWeight: "bold", marginTop: "6px", color: "#f59e0b" }}>{state.route_name}</div>
        </div>
        <div style={{ backgroundColor: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Emergency Decision</div>
          <div style={{ fontSize: "1.05rem", fontWeight: "bold", marginTop: "6px", color: state.police_decision === "APPROVED" || state.police_decision === "AUTO_APPROVED" ? "#4ade80" : state.police_decision.includes("REJECTED") ? "#f87171" : "#fbbf24" }}>{state.police_decision}</div>
        </div>
      </div>

      {/* Signal Corridor Grid */}
      <div style={{ marginTop: "18px", backgroundColor: "#111827", padding: "20px", borderRadius: "8px", border: "1px solid #1e293b" }}>
        <h4 style={{ margin: "0 0 14px 0", color: "#cbd5e1", textTransform: "uppercase", fontSize: "0.85rem" }}>Corridor Signal Sequence ({state.signals.length} Intersections)</h4>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.signals.length}, 1fr)`, gap: "12px" }}>
          {state.signals.map((sig) => (
            <div key={sig.id} style={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "6px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "0.85rem", color: "#e2e8f0", marginBottom: "10px" }}>{sig.name}</div>
              <span style={{ display: "inline-block", padding: "6px 18px", borderRadius: "20px", fontWeight: "bold", fontSize: "0.85rem", backgroundColor: sig.status === "GREEN" ? "#15803d" : sig.status === "PREPARING" ? "#b45309" : "#b91c1c", color: "#fff" }}>
                {sig.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatch Action Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "18px" }}>
        <button onClick={() => handleAction("POLICE_APPROVE")} style={{ padding: "14px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>
          [ APPROVE GREEN WAVE ]
        </button>
        <button onClick={() => handleAction("POLICE_REJECT")} style={{ padding: "14px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>
          [ REJECT ]
        </button>
      </div>

      {/* Simulator Bar */}
      <div style={{ marginTop: "18px", backgroundColor: "#111827", padding: "16px", borderRadius: "8px", border: "1px solid #1e293b" }}>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", fontWeight: "bold" }}>
          🚑 Ambulance Driver Dispatch Options (Patient Triage Severity)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
          <button onClick={() => handleAction("TRIGGER_EMERGENCY", "CRITICAL (CODE RED)")} style={{ padding: "8px 14px", backgroundColor: "#450a0a", border: "1px solid #ef4444", color: "#fca5a5", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            🔴 Call: Critical (Code Red)
          </button>
          <button onClick={() => handleAction("TRIGGER_EMERGENCY", "URGENT (CODE YELLOW)")} style={{ padding: "8px 14px", backgroundColor: "#451a03", border: "1px solid #f59e0b", color: "#fde68a", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            🟡 Call: Urgent (Code Yellow)
          </button>
          <button onClick={() => handleAction("TRIGGER_EMERGENCY", "ROUTINE (CODE GREEN)")} style={{ padding: "8px 14px", backgroundColor: "#064e3b", border: "1px solid #10b981", color: "#a7f3d0", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            🟢 Call: Routine (Code Green)
          </button>
        </div>

        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "10px", textTransform: "uppercase", fontWeight: "bold" }}>
          Grid & Operator Environment Overrides
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button onClick={() => handleAction("TOGGLE_ROAD_BLOCK")} style={{ padding: "8px 14px", backgroundColor: "#1e293b", border: "1px solid #f59e0b", color: "#fbbf24", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            🚧 Block / Reroute Corridor
          </button>
          <button onClick={() => handleAction("TOGGLE_OPERATOR")} style={{ padding: "8px 14px", backgroundColor: "#1e293b", border: "1px solid #8b5cf6", color: "#a78bfa", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            👮 Operator On/Offline
          </button>
          <button onClick={() => handleAction("RESET_NORMAL")} style={{ padding: "8px 14px", backgroundColor: "#1e293b", border: "1px solid #64748b", color: "#94a3b8", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            🔄 Reset Normal
          </button>
        </div>
      </div>
    </div>
  );
}
