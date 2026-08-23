from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List

app = FastAPI(title="Traffic Corridor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active Corridor State
corridor_state = {
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
        {"id": 4, "name": "Intersection 4 - Hospital Link", "status": "RED"},
    ],
    "alert": "NORMAL OPERATIONS - SYSTEM READY",
}

# User Logins In-Memory List
login_sessions: List[Dict[str, Any]] = []

@app.get("/")
def read_root():
    return {"status": "online", "system": "Green Corridor Engine"}

@app.get("/status")
def get_status():
    return corridor_state

@app.get("/users")
def get_users():
    return {
        "status": "success",
        "total_active_logins": len(login_sessions),
        "users": login_sessions
    }

@app.post("/login")
def save_login(payload: Dict[str, Any]):
    login_sessions.append(payload)
    return {
        "status": "success",
        "message": "User session recorded",
        "total_active_logins": len(login_sessions),
        "data": payload
    }

@app.post("/action")
def update_action(payload: Dict[str, Any]):
    global corridor_state
    if "state" in payload:
        corridor_state = payload["state"]
    return {"status": "success", "updated_state": corridor_state}
