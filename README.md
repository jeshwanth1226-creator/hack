\# 🚨 SirenFlow: Intelligent Emergency Green-Wave Traffic System



An intelligent traffic corridor management and automation platform designed to clear dynamic green waves for emergency ambulances while ensuring operator oversight and automated failover.



\---



\## 🛠️ Architecture \& Tech Stack



\* \*\*Android Ambulance Client (Kotlin / Jetpack Compose):\*\* Driver interface to request corridor clearance, view active routes, and track signal statuses (`PoliceControlsCard.kt`).

\* \*\*Real-time Dispatch Backend (Python / WebSockets):\*\* Event-driven server managing corridor telemetry, route calculation, operator overrides, and state broadcasting.

\* \*\*Traffic Police Command Center (React / TypeScript / Vite):\*\* Live dashboard for traffic dispatchers with manual approve/reject controls, incident rerouting, and failover telemetry.

\* \*\*Integration Harness (Pytest / Asyncio):\*\* Automated test suite covering 8 real-world dispatch scenarios.



\---



\## 🚦 Verified Test Scenarios (8/8 Passed)



1\. `test\_01\_normal\_ambulance`: Baseline traffic signal flow.

2\. `test\_02\_emergency\_ambulance`: Emergency trigger initializes pending state.

3\. `test\_03\_emergency\_police\_approval`: Operator green-wave corridor synchronization.

4\. `test\_04\_emergency\_police\_rejection`: Operator rejection holds red lights.

5\. `test\_05\_no\_police\_automatic\_emergency\_mode`: Automated green-wave failover when dispatch is offline.

6\. `test\_06\_road\_blockage\_rerouting`: Corridor blockage triggers automatic bypass rerouting.

7\. `test\_07\_green\_wave\_recalculation\_after\_rerouting`: Dynamic green wave recalculation along Route B.

8\. `test\_08\_emergency\_cancellation\_signals\_return\_to\_normal`: Reset restores default intersection timings.



\---



\## 🚀 Quickstart Guide



\### 1. Start Mock Server

```bash

python backend/server.py

