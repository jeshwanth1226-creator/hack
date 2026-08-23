from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List

app = FastAPI(title="Traffic Corridor API", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

login_sessions: List[Dict[str, Any]] = []

@app.get("/")
@app.head("/")
def root():
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

from fastapi.responses import HTMLResponse

@app.get("/dashboard", response_class=HTMLResponse)
async def view_dashboard():
    data_list = active_users if 'active_users' in globals() else (users if 'users' in globals() else [])
    rows_html = ""
    for u in data_list:
        rows_html += f"""
        <tr class="border-b border-slate-700 hover:bg-slate-800/50 transition">
            <td class="px-6 py-4 font-semibold text-emerald-400 uppercase">{u.get('role', 'N/A')}</td>
            <td class="px-6 py-4 font-mono text-cyan-300">{u.get('vehicle_id', u.get('vehicle_no', 'N/A'))}</td>
            <td class="px-6 py-4 text-slate-100">{u.get('driver_name', u.get('driver_id', 'N/A'))}</td>
            <td class="px-6 py-4 text-amber-300">{u.get('hospital', 'N/A')}</td>
            <td class="px-6 py-4 text-slate-400 text-xs font-mono">{u.get('login_time', 'N/A')}</td>
            <td class="px-6 py-4"><span class="px-2.5 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">ACTIVE</span></td>
        </tr>
        """
    if not rows_html:
        rows_html = """<tr><td colspan="6" class="text-center py-8 text-slate-500">No active corridor sessions registered yet.</td></tr>"""

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="5">
        <title>Green Wave | Active Corridor Sessions</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen p-8 font-sans">
        <div class="max-w-6xl mx-auto space-y-6">
            <div class="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                    <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                        Green Wave Corridor | Live Registry
                    </h1>
                    <p class="text-slate-400 text-sm mt-1">Real-time Emergency Vehicle & Traffic Signal Sync</p>
                </div>
                <div class="text-right">
                    <span class="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        Auto-refreshing (5s)
                    </span>
                    <p class="text-xs text-slate-500 mt-1">Total Active Units: <strong class="text-emerald-400">{len(data_list)}</strong></p>
                </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                        <tr>
                            <th class="px-6 py-4">Role</th>
                            <th class="px-6 py-4">Vehicle ID</th>
                            <th class="px-6 py-4">Driver / Officer</th>
                            <th class="px-6 py-4">Destination Hospital</th>
                            <th class="px-6 py-4">Logged In At</th>
                            <th class="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                        {rows_html}
                    </tbody>
                </table>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
