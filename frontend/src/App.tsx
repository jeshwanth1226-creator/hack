import { useState, useEffect, useRef, useCallback } from "react";
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
  const [role, setRole] = useState<"hq" | "ambulance">("hq");
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Paramedic OTP & Registration State
  const [isAmbulanceLoggedIn, setIsAmbulanceLoggedIn] = useState(false);
  const [ambulanceId, setAmbulanceId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [phone, setPhone] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "ambulance") setRole("ambulance");
    else setRole("hq");

    try {
      bcRef.current = new BroadcastChannel("traffic_corridor_channel");
      bcRef.current.onmessage = (event) => {
        if (event.data?.type === "STATE_UPDATE") {
          setState((prev) => ({ ...prev, ...event.data.data }));
          setConnected(true);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }

    setConnected(true);

    return () => {
      if (bcRef.current) bcRef.current.close();
    };
  }, []);

  const handleAction = useCallback((action: string, severityChoice?: string) => {
    setState((prev) => {
      let nextState = { ...prev };

      if (action === "TRIGGER_EMERGENCY") {
        const isRoutine = severityChoice?.includes("ROUTINE");
        nextState = {
          ...prev,
          emergency_active: !isRoutine,
          severity: severityChoice || "CRITICAL (CODE RED)",
          police_decision: isRoutine ? "ROUTINE_TRANSFER" : (prev.police_available ? "PENDING" : "AUTO_APPROVED"),
          signals: prev.signals.map((s) => ({
            ...s,
            status: !isRoutine && !prev.police_available ? "GREEN" : (isRoutine ? "RED" : "PREPARING"),
          })),
          alert: isRoutine
            ? "ROUTINE TRANSFER IN PROGRESS - REGULAR SIGNALS"
            : `EMERGENCY ALERT: ${severityChoice} - CLEARANCE REQUESTED`,
        };
      } else if (action === "POLICE_APPROVE") {
        nextState = {
          ...prev,
          police_decision: "APPROVED",
          signals: prev.signals.map((s) => ({ ...s, status: "GREEN" })),
          alert: "POLICE APPROVED: FULL GREEN WAVE CORRIDOR ACTIVE",
        };
      } else if (action === "POLICE_REJECT") {
        nextState = {
          ...prev,
          police_decision: "REJECTED",
          signals: prev.signals.map((s) => ({ ...s, status: "RED" })),
          alert: "POLICE OVERRIDE: GREEN CORRIDOR REJECTED",
        };
      } else if (action === "TOGGLE_ROAD_BLOCK") {
        const nextBlocked = !prev.road_blocked;
        nextState = {
          ...prev,
          road_blocked: nextBlocked,
          route_name: nextBlocked ? "Alternative Bypass (Route B)" : "Primary Corridor (Route A)",
          distance_km: nextBlocked ? 3.8 : 2.4,
          eta_seconds: nextBlocked ? 260 : 180,
          alert: nextBlocked ? "CONGESTION/BLOCKAGE DETECTED - REROUTING AMBULANCE" : "PRIMARY CORRIDOR CLEARED",
        };
      } else if (action === "TOGGLE_OPERATOR") {
        const nextAvail = !prev.police_available;
        nextState = {
          ...prev,
          police_available: nextAvail,
          alert: nextAvail ? "HQ OPERATOR ONLINE" : "FAILOVER: AUTONOMOUS DISPATCH ACTIVE",
        };
      } else if (action === "RESET_NORMAL") {
        nextState = {
          ...DEFAULT_STATE,
          route_name: "Primary Corridor (Route A)",
          police_available: prev.police_available,
        };
      }

      if (bcRef.current) {
        bcRef.current.postMessage({ type: "STATE_UPDATE", data: nextState });
      }

      return nextState;
    });
  }, []);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambulanceId.trim() || !driverName.trim() || !phone.trim()) return;
    const mockCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(mockCode);
    setOtpSent(true);
    setOtpError("");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.trim() === generatedOtp || enteredOtp.trim() === "1234") {
      setIsAmbulanceLoggedIn(true);
      setOtpError("");
    } else {
      setOtpError("Invalid OTP. Please check the code and try again.");
    }
  };

  const handleLogout = () => {
    setIsAmbulanceLoggedIn(false);
    setOtpSent(false);
    setEnteredOtp("");
    setGeneratedOtp("");
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
            {connected ? "● LIVE SYNCED" : "○ DISCONNECTED"}
          </span>
        </div>
      </header>

      {/* Alert Banner */}
      <div style={{ marginTop: "14px", padding: "12px", borderRadius: "8px", fontWeight: "bold", textAlign: "center", backgroundColor: state.emergency_active ? (state.police_decision.includes("REJECTED") ? "#450a0a" : "#064e3b") : "#1e293b", border: "1px solid #334155", color: "#f8fafc" }}>
        STATUS: {state.alert}
      </div>

      {/* Ambulance Role Logic */}
      {role === "ambulance" ? (
        !isAmbulanceLoggedIn ? (
          /* Paramedic Secure 2FA Registration / Login Gate */
          <div style={{ maxWidth: "420px", margin: "40px auto 0 auto", backgroundColor: "#111827", padding: "28px", borderRadius: "10px", border: "1px solid #1e293b" }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", color: "#38bdf8", textAlign: "center" }}>
              🚑 Paramedic & Vehicle Dispatch Auth
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.85rem", color: "#94a3b8", textAlign: "center" }}>
              Secure 2FA validation to enable signal override
            </p>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "5px" }}>
                    Vehicle / Ambulance ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AMB-108-HYD"
                    value={ambulanceId}
                    onChange={(e) => setAmbulanceId(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f8fafc", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "5px" }}>
                    Paramedic / Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jeshwanth"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f8fafc", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "5px" }}>
                    Registered Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f8fafc", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "5px" }}>
                    Base Hospital / Center
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo Hospital"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f8fafc", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  type="submit"
                  style={{ marginTop: "10px", padding: "12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}
                >
                  Request OTP Verification →
                </button>
              </form>
            ) : (
              /* OTP Verification Step */
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ backgroundColor: "#064e3b", padding: "10px 14px", borderRadius: "6px", border: "1px solid #059669", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", color: "#a7f3d0" }}>Verification Code sent to {phone}:</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#34d399", letterSpacing: "3px", marginTop: "4px" }}>
                    {generatedOtp}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "5px" }}>
                    Enter 4-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="Enter code above or 1234"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    style={{ width: "100%", padding: "12px", borderRadius: "6px", backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f8fafc", boxSizing: "border-box", textAlign: "center", fontSize: "1.2rem", letterSpacing: "4px" }}
                  />
                </div>

                {otpError && (
                  <div style={{ color: "#f87171", fontSize: "0.8rem", textAlign: "center" }}>
                    {otpError}
                  </div>
                )}

                <button
                  type="submit"
                  style={{ padding: "12px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}
                >
                  Verify & Connect Dispatch Console ✓
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  style={{ padding: "8px", backgroundColor: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
                >
                  ← Edit Driver Details
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Actual Ambulance Dispatch Console */
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "8px 12px", backgroundColor: "#1e293b", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Active Unit: <strong style={{ color: "#38bdf8" }}>{ambulanceId}</strong> | Driver: <strong style={{ color: "#f8fafc" }}>{driverName}</strong> {hospitalName && `(${hospitalName})`}
              </div>
              <button
                onClick={handleLogout}
                style={{ padding: "4px 8px", backgroundColor: "#334155", color: "#fca5a5", border: "1px solid #475569", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Change Driver / Logout
              </button>
            </div>

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
        )
      ) : (
        /* HQ Operator View */
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
