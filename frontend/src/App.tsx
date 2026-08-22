import React, { useState, useEffect } from 'react';

interface Signal {
  id: number;
  name: string;
  status: 'RED' | 'GREEN' | 'PREPARING';
}

interface SystemState {
  emergency_active: boolean;
  police_available: boolean;
  police_decision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';
  road_blocked: boolean;
  route_name: string;
  ambulance_location: string;
  eta_seconds: number;
  distance_km: number;
  signals: Signal[];
  alert: string;
}

export default function App() {
  const [state, setState] = useState<SystemState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8765');
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'STATE_UPDATE') {
        setState(payload.data);
      }
    };
    setWs(socket);
    return () => socket.close();
  }, []);

  const sendAction = (action: string, extra = {}) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, ...extra }));
    }
  };

  if (!state) {
    return (
      <div style={{ background: '#0a0d14', color: '#58a6ff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <h2>CONNECTING TO DISPATCH COMMAND SERVER...</h2>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0d14', color: '#c9d1d9', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #21262d', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f0f6fc', fontSize: '24px', letterSpacing: '0.5px' }}>🚨 TRAFFIC POLICE COMMAND CENTER</h1>
          <span style={{ color: '#8b949e', fontSize: '13px' }}>EMERGENCY GREEN-WAVE AUTOMATION & CORRIDOR DISPATCH</span>
        </div>
        <div style={{ background: state.police_available ? '#23863622' : '#d2992222', border: `1px solid ${state.police_available ? '#238636' : '#d29922'}`, padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: state.police_available ? '#3fb950' : '#d29922' }}>
          {state.police_available ? '● OPERATOR ONLINE' : '▲ AUTO-PILOT FAILOVER'}
        </div>
      </div>

      {/* Dynamic Alert Banner */}
      <div style={{ margin: '16px 0', padding: '14px 20px', borderRadius: '8px', fontWeight: 'bold', letterSpacing: '0.5px', background: state.alert.includes('ALTERNATIVE') ? '#1f6feb22' : state.alert.includes('BLOCKED') ? '#da363322' : state.alert.includes('ACTIVE') ? '#23863622' : '#161b22', border: `1px solid ${state.alert.includes('ALTERNATIVE') ? '#58a6ff' : state.alert.includes('BLOCKED') ? '#f85149' : state.alert.includes('ACTIVE') ? '#3fb950' : '#30363d'}`, color: state.alert.includes('ALTERNATIVE') ? '#58a6ff' : state.alert.includes('BLOCKED') ? '#f85149' : state.alert.includes('ACTIVE') ? '#3fb950' : '#8b949e' }}>
        SYSTEM NOTIFICATION: {state.alert}
      </div>

      {/* Telemetry Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', margin: '16px 0' }}>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#8b949e', fontSize: '12px' }}>AMBULANCE LOCATION</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f0f6fc', marginTop: '6px' }}>{state.ambulance_location}</div>
        </div>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#8b949e', fontSize: '12px' }}>ETA & DISTANCE</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3fb950', marginTop: '6px' }}>{state.eta_seconds}s ({state.distance_km} km)</div>
        </div>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#8b949e', fontSize: '12px' }}>CURRENT ROUTE</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d29922', marginTop: '6px' }}>{state.route_name}</div>
        </div>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#8b949e', fontSize: '12px' }}>EMERGENCY DECISION</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: state.police_decision === 'APPROVED' || state.police_decision === 'AUTO_APPROVED' ? '#3fb950' : state.police_decision === 'REJECTED' ? '#f85149' : '#e3b341', marginTop: '6px' }}>
            {state.police_decision}
          </div>
        </div>
      </div>

      {/* Signal Corridor Visualizer */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#f0f6fc' }}>CORRIDOR SIGNAL SEQUENCE ({state.signals.length} INTERSECTIONS)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {state.signals.map((sig) => (
            <div key={sig.id} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#c9d1d9', fontWeight: '600' }}>{sig.name}</div>
              <div style={{ display: 'inline-block', marginTop: '12px', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', background: sig.status === 'GREEN' ? '#238636' : sig.status === 'PREPARING' ? '#9e6a03' : '#da3633', color: '#ffffff' }}>
                {sig.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Dispatch Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '24px 0' }}>
        <button
          onClick={() => sendAction('POLICE_APPROVE')}
          disabled={!state.police_available || !state.emergency_active}
          style={{ background: '#238636', color: '#fff', padding: '16px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: state.police_available && state.emergency_active ? 'pointer' : 'not-allowed', opacity: state.police_available && state.emergency_active ? 1 : 0.4 }}
        >
          [ APPROVE GREEN WAVE ]
        </button>
        <button
          onClick={() => sendAction('POLICE_REJECT')}
          disabled={!state.police_available || !state.emergency_active}
          style={{ background: '#da3633', color: '#fff', padding: '16px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: state.police_available && state.emergency_active ? 'pointer' : 'not-allowed', opacity: state.police_available && state.emergency_active ? 1 : 0.4 }}
        >
          [ REJECT ]
        </button>
      </div>

      {/* Hackathon Simulation Toolbar */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#8b949e', marginBottom: '12px' }}>HACKATHON SIMULATION CONTROLS</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => sendAction('TRIGGER_EMERGENCY')} style={{ background: '#21262d', color: '#58a6ff', border: '1px solid #30363d', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🚑 Trigger Emergency Call</button>
          <button onClick={() => sendAction('TRIGGER_ROADBLOCK', { value: !state.road_blocked })} style={{ background: '#21262d', color: '#d29922', border: '1px solid #30363d', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🚧 Block / Reroute Corridor</button>
          <button onClick={() => sendAction('TOGGLE_POLICE_AVAILABILITY', { value: !state.police_available })} style={{ background: '#21262d', color: '#a371f7', border: '1px solid #30363d', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>👮 Operator On/Offline</button>
          <button onClick={() => sendAction('CANCEL_EMERGENCY')} style={{ background: '#21262d', color: '#f85149', border: '1px solid #30363d', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🔄 Reset Normal</button>
        </div>
      </div>
    </div>
  );
}