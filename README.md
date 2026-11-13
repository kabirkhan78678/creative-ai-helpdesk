# CyberDesk - Internal IT Management & Helpdesk Suite
> **Futuristic Cross-Platform Desktop Software (Windows, macOS, Linux)**  
> Built with **Electron + React + Tailwind CSS + Framer Motion**, powered by **Python FastAPI** and **MySQL / SQLite**.

---

## ⚡ Key Features

1. **Asset & Inventory Management**:
   - Live PC fleet monitoring dashboard with real-time online/offline status indicators.
   - Live hardware telemetry gauges: **CPU Load %**, **RAM Allocation (Used/Total GB)**, **OS Details**, **IP & MAC addresses**.
   - Workstation-to-Employee mapping with Department tagging.

2. **Helpdesk & Ticketing System**:
   - Multi-queue ticketing center with live status filters: `PENDING`, `IN PROGRESS`, `RESOLVED`, `CLOSED`.
   - Priority severity tagging: `CRITICAL` (Pulsing neon alert), `HIGH`, `MEDIUM`, `LOW`.
   - "Raise Ticket" modal linked directly to the affected workstation.
   - Real-time status synchronization across all connected clients via WebSockets.

3. **Remote Desktop Access (WebRTC + Interactive Canvas)**:
   - One-click remote assistance initiation from any PC card.
   - Employee security prompt: *"Incoming Remote Request: Allow / Decline"*.
   - Low-latency interactive remote desktop viewer with live FPS counter, latency tracker (ms), and real-time mouse coordinate dispatching.

4. **Real-time Live Chat**:
   - Peer-to-peer and Admin-to-Employee live messaging drawer.
   - Contextual linking directly to helpdesk tickets.

5. **Futuristic Dark & Neon Cyan UI**:
   - Deep obsidian background (`#050608`), Neon Cyan (`#00ffcc`) glowing borders and accents.
   - Glassmorphic panels with smooth Framer Motion transitions.

---

## 📂 Project Structure

```
desktop software/
├── backend/                       # Python FastAPI Backend
│   ├── app/
│   │   ├── api/                   # REST API Endpoints (Auth, Devices, Tickets, Chat, Remote)
│   │   ├── core/                  # Config & WebSocketHub (Signaling + Broadcast)
│   │   ├── db/                    # SQLAlchemy engine & session maker
│   │   ├── models/                # Database entities
│   │   └── schemas/               # Pydantic validation models
│   ├── agent_telemetry.py         # Hardware telemetry ingestion agent
│   ├── seed.py                    # Database seeder (Sample users, PCs, tickets)
│   ├── main.py                    # FastAPI entrypoint & WebSocket endpoint
│   ├── requirements.txt
│   └── .venv/                     # Python Virtual Environment
│
├── desktop/                       # Cross-Platform Desktop Frontend
│   ├── electron/                  # Electron main & preload scripts
│   │   ├── main.ts
│   │   └── preload.ts
│   ├── src/
│   │   ├── components/            # Header, FleetGrid, TicketCenter, LiveChat, RemoteDesk
│   │   ├── context/               # WebSocketContext & auto-reconnect
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── start_all.bat                  # One-click launcher for backend + desktop
├── run_backend.bat                # Launch FastAPI controller
├── run_desktop.bat                # Launch Electron + Vite desktop client
└── run_telemetry_agent.bat        # Launch background telemetry generator
```

---

## 🚀 How to Run

### Option A: One-Click Launch (Windows)
Double-click `start_all.bat`. This automatically starts:
1. The FastAPI Backend on `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).
2. The Electron + React Desktop Application.

### Option B: Manual Terminal Execution

#### 1. Backend:
```powershell
cd backend
.\.venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```

#### 2. Desktop Frontend:
```powershell
cd desktop
npm run electron:dev
```

#### 3. (Optional) Run Live Telemetry Agent:
To see live fluctuating CPU & RAM telemetry stream across the dashboard:
```powershell
cd backend
.\.venv\Scripts\activate
python agent_telemetry.py
```

---

## 🗄️ Database Configuration (MySQL & SQLite)

The backend is configured to run out-of-the-box with **SQLite** (`it_helpdesk.db`) for immediate zero-config testing, and can switch to **MySQL** at any time.

To use MySQL:
1. Ensure your MySQL server (e.g. MySQL 8.0) is running:
   ```powershell
   Start-Service MySQL80
   ```
2. In `backend/app/core/config.py` or a `.env` file in `backend/`, set:
   ```ini
   DB_ENGINE=mysql
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DB=it_helpdesk_db
   ```
3. Run `python seed.py` to initialize tables and populate sample company fleet data.

