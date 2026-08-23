from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

app = FastAPI(title="Traffic Corridor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory Storage for Active Corridor State
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

# In-Memory Storage for Logged In Users / Sessions
login_sessions: List[Dict[str, Any]] = []

@app.get("/")
def read_root():
    return {"status": "online", "system": "Green Corridor Optimization Engine"}

@app.get("/status")
def get_status():
    return corridor_state

@app.get("/users")
def get_logged_in_users():
    return {"total_users": len(login_sessions), "sessions": login_sessions}

@app.post("/login")
def save_login(payload: Dict[str, Any]):
    login_sessions.append(payload)
    return {"status": "success", "message": "User login session recorded", "total_sessions": len(login_sessions)}

@app.post("/action")
def update_action(payload: Dict[str, Any]):
    global corridor_state
    if "state" in payload:
        corridor_state = payload["state"]
    return {"status": "success", "updated_state": corridor_state}
