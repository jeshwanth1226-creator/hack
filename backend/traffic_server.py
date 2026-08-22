import asyncio
import json
import os
import websockets

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

CONNECTED = set()

async def broadcast_state():
    if CONNECTED:
        msg = json.dumps({"type": "STATE_UPDATE", "data": STATE})
        await asyncio.gather(*[client.send(msg) for client in CONNECTED])

async def handler(websocket):
    CONNECTED.add(websocket)
    await websocket.send(json.dumps({"type": "STATE_UPDATE", "data": STATE}))
    try:
        async for message in websocket:
            req = json.loads(message)
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

            await broadcast_state()
    finally:
        CONNECTED.remove(websocket)

async def main():
    port = int(os.environ.get("PORT", 8765))
    async with websockets.serve(handler, "0.0.0.0", port):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
