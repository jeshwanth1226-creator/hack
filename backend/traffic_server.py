import os
import json
from typing import Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATE = {
    "emergency_active": False,
    "police_available": True,
    "police_decision": "PENDING",
    "road_blocked": False,
    "ambulance_location": "7th Cross, MG Road",
    "route_name": "Primary Corridor (Route A)",
    "eta_seconds": 180,
    "distance_km": 2.4,
    "severity": "NONE",
    "signals": [
        {"id": 1, "name": "Intersection 1 - MG Road", "status": "RED"},
        {"id": 2, "name": "Intersection 2 - Central Ave", "status": "RED"},
        {"id": 3, "name": "Intersection 3 - Park Street", "status": "RED"},
        {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"}
    ],
    "alert": "NORMAL OPERATIONS - SYSTEM READY"
}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        await websocket.send_text(json.dumps({"type": "STATE_UPDATE", "data": STATE}))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self):
        msg = json.dumps({"type": "STATE_UPDATE", "data": STATE})
        for connection in list(self.active_connections):
            try:
                await connection.send_text(msg)
            except Exception:
                self.active_connections.discard(connection)

manager = ConnectionManager()

@app.get("/")
async def health_check():
    return PlainTextResponse("Traffic Server Live")

@app.websocket("/ws")
@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            req = json.loads(data)
            action = req.get("action")
            sev = req.get("severity")

            if action == "TRIGGER_EMERGENCY":
                STATE["emergency_active"] = True
                STATE["severity"] = sev or "CRITICAL (CODE RED)"
                if "ROUTINE" in STATE["severity"]:
                    STATE["police_decision"] = "NORMAL FLOW (NO PREEMPTION)"
                    STATE["alert"] = "ROUTINE TRANSPORT - STANDARD TRAFFIC SIGNALS MAINTAINED"
                    for s in STATE["signals"]:
                        s["status"] = "RED"
                elif not STATE["police_available"]:
                    STATE["police_decision"] = "AUTO_APPROVED"
                    STATE["alert"] = f"AUTOMATIC FAILOVER ENGAGED FOR {STATE['severity']}"
                    for s in STATE["signals"]:
                        s["status"] = "GREEN"
                else:
                    STATE["police_decision"] = "PENDING"
                    STATE["alert"] = f"EMERGENCY ALERT [{STATE['severity']}] - AWAITING POLICE APPROVAL"

            elif action == "POLICE_APPROVE":
                if STATE["emergency_active"]:
                    STATE["police_decision"] = "APPROVED"
                    STATE["alert"] = f"GREEN-WAVE CLEARED FOR {STATE['severity']}"
                    for s in STATE["signals"]:
                        s["status"] = "GREEN"

            elif action == "POLICE_REJECT":
                if STATE["emergency_active"]:
                    STATE["police_decision"] = "REJECTED (REROUTING SUGGESTED)"
                    STATE["road_blocked"] = True
                    STATE["route_name"] = "Alternative Bypass (Route B)"
                    STATE["eta_seconds"] = 240
                    STATE["distance_km"] = 3.1
                    STATE["signals"] = [
                        {"id": 1, "name": "Intersection 1 - MG Road", "status": "RED"},
                        {"id": 5, "name": "Intersection 5 - Ring Road Bypass", "status": "RED"},
                        {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"}
                    ]
                    STATE["alert"] = "PRIMARY ROUTE REJECTED - DETOUR SUGGESTED TO ROUTE B"

            elif action == "TOGGLE_ROAD_BLOCK":
                STATE["road_blocked"] = not STATE["road_blocked"]
                if STATE["road_blocked"]:
                    STATE["route_name"] = "Alternative Bypass (Route B)"
                    STATE["eta_seconds"] = 240
                    STATE["distance_km"] = 3.1
                    STATE["signals"] = [
                        {"id": 1, "name": "Intersection 1 - MG Road", "status": "GREEN" if STATE["emergency_active"] and STATE["police_decision"] in ["APPROVED", "AUTO_APPROVED"] else "RED"},
                        {"id": 5, "name": "Intersection 5 - Ring Road Bypass", "status": "GREEN" if STATE["emergency_active"] and STATE["police_decision"] in ["APPROVED", "AUTO_APPROVED"] else "RED"},
                        {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "PREPARING" if STATE["emergency_active"] and STATE["police_decision"] in ["APPROVED", "AUTO_APPROVED"] else "RED"}
                    ]
                    STATE["alert"] = "ROAD BLOCKED - ALTERNATIVE ROUTE ACTIVE"
                else:
                    STATE["route_name"] = "Primary Corridor (Route A)"
                    STATE["eta_seconds"] = 180
                    STATE["distance_km"] = 2.4
                    STATE["signals"] = [
                        {"id": 1, "name": "Intersection 1 - MG Road", "status": "GREEN" if STATE["emergency_active"] and STATE["police_decision"] in ["APPROVED", "AUTO_APPROVED"] else "RED"},
                        {"id": 2, "name": "Intersection 2 - Central Ave", "status": "GREEN" if STATE["emergency_active"] and STATE["police_decision"] in ["APPROVED", "AUTO_APPROVED"] else "RED"},
                        {"id": 3, "name": "Intersection 3 - Park Street", "status": "PREPARING" if STATE["emergency_active"] and STATE["police_decision"] in ["APPROVED", "AUTO_APPROVED"] else "RED"},
                        {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"}
                    ]
                    STATE["alert"] = "PRIMARY CORRIDOR ACTIVE"

            elif action == "TOGGLE_OPERATOR":
                STATE["police_available"] = not STATE["police_available"]
                if not STATE["police_available"] and STATE["emergency_active"] and STATE["police_decision"] == "PENDING":
                    STATE["police_decision"] = "AUTO_APPROVED"
                    STATE["alert"] = f"OPERATOR OFFLINE - AUTO FAILOVER ACTIVATED FOR {STATE['severity']}"
                    for s in STATE["signals"]:
                        s["status"] = "GREEN"

            elif action == "RESET_NORMAL":
                STATE.update({
                    "emergency_active": False,
                    "police_decision": "PENDING",
                    "road_blocked": False,
                    "ambulance_location": "7th Cross, MG Road",
                    "route_name": "Primary Corridor (Route A)",
                    "eta_seconds": 180,
                    "distance_km": 2.4,
                    "severity": "NONE",
                    "signals": [
                        {"id": 1, "name": "Intersection 1 - MG Road", "status": "RED"},
                        {"id": 2, "name": "Intersection 2 - Central Ave", "status": "RED"},
                        {"id": 3, "name": "Intersection 3 - Park Street", "status": "RED"},
                        {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"}
                    ],
                    "alert": "NORMAL OPERATIONS - SYSTEM READY"
                })

            await manager.broadcast()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8765))
    uvicorn.run(app, host="0.0.0.0", port=port)
