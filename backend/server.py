import asyncio
import json
import websockets

CLIENTS = set()

STATE = {
    "emergency_active": False,
    "police_available": True,
    "police_decision": "PENDING",
    "road_blocked": False,
    "ambulance_location": "7th Cross, MG Road",
    "route_name": "Primary Corridor (Route A)",
    "eta_seconds": 180,
    "distance_km": 2.4,
    "signals": [
        {"id": 1, "name": "Intersection 1 - MG Road", "status": "RED"},
        {"id": 2, "name": "Intersection 2 - Central Ave", "status": "RED"},
        {"id": 3, "name": "Intersection 3 - Park Street", "status": "RED"},
        {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"},
    ],
    "alert": "NORMAL OPERATIONS - SYSTEM READY"
}

async def broadcast_state():
    if CLIENTS:
        message = json.dumps({"type": "STATE_UPDATE", "data": STATE})
        await asyncio.gather(*[client.send(message) for client in CLIENTS if not client.closed])

def recalculate_corridor():
    if not STATE["emergency_active"]:
        for s in STATE["signals"]:
            s["status"] = "RED"
        STATE["alert"] = "NORMAL OPERATIONS - SYSTEM READY"
        return

    if STATE["police_decision"] == "REJECTED":
        for s in STATE["signals"]:
            s["status"] = "RED"
        STATE["alert"] = "GREEN WAVE REJECTED BY POLICE OPERATOR"
        return

    if STATE["road_blocked"]:
        STATE["route_name"] = "Alternative Bypass (Route B)"
        STATE["eta_seconds"] = 240
        STATE["distance_km"] = 3.1
        STATE["signals"] = [
            {"id": 1, "name": "Intersection 1 - MG Road", "status": "GREEN"},
            {"id": 5, "name": "Intersection 5 - Ring Road Bypass", "status": "GREEN"},
            {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "PREPARING"},
        ]
        STATE["alert"] = "ROAD BLOCKED - ROUTE RECALCULATING -> ALTERNATIVE ROUTE ACTIVE"
    else:
        STATE["route_name"] = "Primary Corridor (Route A)"
        STATE["eta_seconds"] = 180
        STATE["distance_km"] = 2.4
        STATE["signals"] = [
            {"id": 1, "name": "Intersection 1 - MG Road", "status": "GREEN"},
            {"id": 2, "name": "Intersection 2 - Central Ave", "status": "GREEN"},
            {"id": 3, "name": "Intersection 3 - Park Street", "status": "PREPARING"},
            {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"},
        ]
        STATE["alert"] = "GREEN-WAVE ACTIVE - CORRIDOR SYNCHRONIZED"

async def handler(websocket):
    CLIENTS.add(websocket)
    try:
        await websocket.send(json.dumps({"type": "STATE_UPDATE", "data": STATE}))
        async for message in websocket:
            data = json.loads(message)
            action = data.get("action")

            if action == "TRIGGER_EMERGENCY":
                STATE["emergency_active"] = True
                STATE["police_decision"] = "AUTO_APPROVED" if not STATE["police_available"] else "PENDING"
                if STATE["police_decision"] == "AUTO_APPROVED":
                    recalculate_corridor()
                else:
                    STATE["alert"] = "EMERGENCY VEHICLE DETECTED - AWAITING POLICE APPROVAL"

            elif action == "POLICE_APPROVE":
                if STATE["emergency_active"]:
                    STATE["police_decision"] = "APPROVED"
                    recalculate_corridor()

            elif action == "POLICE_REJECT":
                if STATE["emergency_active"]:
                    STATE["police_decision"] = "REJECTED"
                    recalculate_corridor()

            elif action == "TOGGLE_ROAD_BLOCK":
                STATE["road_blocked"] = not STATE["road_blocked"]
                if STATE["emergency_active"] and STATE["police_decision"] in ["APPROVED", "AUTO_APPROVED"]:
                    recalculate_corridor()

            elif action == "TOGGLE_OPERATOR":
                STATE["police_available"] = not STATE["police_available"]
                if STATE["emergency_active"] and not STATE["police_available"] and STATE["police_decision"] == "PENDING":
                    STATE["police_decision"] = "AUTO_APPROVED"
                    recalculate_corridor()

            elif action == "RESET_NORMAL":
                STATE["emergency_active"] = False
                STATE["police_decision"] = "PENDING"
                STATE["road_blocked"] = False
                STATE["ambulance_location"] = "7th Cross, MG Road"
                STATE["route_name"] = "Primary Corridor (Route A)"
                STATE["eta_seconds"] = 180
                STATE["distance_km"] = 2.4
                STATE["signals"] = [
                    {"id": 1, "name": "Intersection 1 - MG Road", "status": "RED"},
                    {"id": 2, "name": "Intersection 2 - Central Ave", "status": "RED"},
                    {"id": 3, "name": "Intersection 3 - Park Street", "status": "RED"},
                    {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"},
                ]
                recalculate_corridor()

            await broadcast_state()
    finally:
        CLIENTS.discard(websocket)

async def main():
    print("Traffic Police WebSocket Server running on ws://127.0.0.1:8765")
    async with websockets.serve(handler, "0.0.0.0", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
