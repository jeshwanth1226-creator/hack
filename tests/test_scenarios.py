import pytest
import websockets
import json
import asyncio

WS_URI = "ws://localhost:8765"

async def send_and_receive(action, **kwargs):
    async with websockets.connect(WS_URI) as ws:
        _ = await ws.recv()
        payload = {"action": action, **kwargs}
        await ws.send(json.dumps(payload))
        response = await ws.recv()
        return json.loads(response)["data"]

@pytest.mark.asyncio
async def test_01_normal_ambulance():
    state = await send_and_receive("CANCEL_EMERGENCY")
    assert state["emergency_active"] is False
    assert "NORMAL" in state["alert"]

@pytest.mark.asyncio
async def test_02_emergency_ambulance():
    state = await send_and_receive("TRIGGER_EMERGENCY")
    assert state["emergency_active"] is True
    assert state["police_decision"] in ["PENDING", "AUTO_APPROVED"]

@pytest.mark.asyncio
async def test_03_emergency_police_approval():
    await send_and_receive("TRIGGER_EMERGENCY")
    state = await send_and_receive("POLICE_APPROVE")
    assert state["police_decision"] == "APPROVED"
    assert any(s["status"] == "GREEN" for s in state["signals"])

@pytest.mark.asyncio
async def test_04_emergency_police_rejection():
    await send_and_receive("TRIGGER_EMERGENCY")
    state = await send_and_receive("POLICE_REJECT")
    assert state["police_decision"] == "REJECTED"
    assert all(s["status"] == "RED" for s in state["signals"])

@pytest.mark.asyncio
async def test_05_no_police_automatic_emergency_mode():
    await send_and_receive("TOGGLE_POLICE_AVAILABILITY", value=False)
    state = await send_and_receive("TRIGGER_EMERGENCY")
    assert state["police_decision"] == "AUTO_APPROVED"
    assert any(s["status"] == "GREEN" for s in state["signals"])
    await send_and_receive("TOGGLE_POLICE_AVAILABILITY", value=True)

@pytest.mark.asyncio
async def test_06_road_blockage_rerouting():
    await send_and_receive("TRIGGER_EMERGENCY")
    await send_and_receive("POLICE_APPROVE")
    state = await send_and_receive("TRIGGER_ROADBLOCK", value=True)
    assert state["road_blocked"] is True
    assert "ALTERNATIVE ROUTE ACTIVE" in state["alert"]

@pytest.mark.asyncio
async def test_07_green_wave_recalculation_after_rerouting():
    state = await send_and_receive("TRIGGER_ROADBLOCK", value=True)
    signal_ids = [s["id"] for s in state["signals"]]
    assert 5 in signal_ids

@pytest.mark.asyncio
async def test_08_emergency_cancellation_signals_return_to_normal():
    state = await send_and_receive("CANCEL_EMERGENCY")
    assert state["emergency_active"] is False
    assert all(s["status"] == "RED" for s in state["signals"])
