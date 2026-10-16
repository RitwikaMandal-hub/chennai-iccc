# Chennai AI ICCC — Smart City Integrated Command & Control Centre

A digital-twin command centre for Chennai: live traffic, flood, air-quality and e-waste monitoring, an AI operations agent with **human-in-the-loop approval**, and a **3D emergency-response simulation** built with three.js.

**Live demo:** https://ritwikamandal-hub.github.io/chennai-iccc/ — works on laptop and phone, no install needed.
## Features

| Module | What it shows |
| --- | --- |
| Command Center | 2.5D city map (zones, roads, junctions, sensors, vehicles, incidents), KPI cards with live trends, AI assistant, simulated CCTV feed, event timeline, system status |
| **3D Simulation** | Step-by-step 3D replay of three emergencies: road accident (ambulance + green corridor + police), building fire (smoke sensors, drone recon, fire tenders, evacuation), urban flood (rain, water-level sensors, ML forecast, road closures, re-routing, boat rescue, pumps) |
| Smart Mobility | Junction congestion, adaptive signals, live vehicles |
| Flood & Disaster | Water-level sensors and flood-risk zones |
| Emergency Response | Incident queue and AI-assisted response planning |
| AI Operations | Gemini + RAG agent, action plans, approve / reject, simulated execution |
| Waste & E-Waste | Collection-point fill levels and pickup planning |

### How the 3D simulation works

Each scenario walks through the real ICCC workflow:
**detect → relay to ICCC → AI triage → operator approval → dispatch → on-scene → resolve.**

- Emergency vehicles are routed with BFS over the road graph. Blocked roads (accident, flood) are avoided, and the flood scenario shows the rejected "shortest" route.
- **Green corridor:** signals a few junctions ahead of the ambulance are held green and released once it passes.
- Civilian cars obey signals, queue behind each other, U-turn at closures, and pull over for sirens.
- The UI shows the current step, the system responsible (CCTV AI, IoT network, AI agent, …), a timestamped event log and a summary with response times.
- Controls: play/pause, restart, 1×/2×/4× speed, auto or free camera (drag, pinch or scroll to explore).
- Deep links: `#/simulation?scenario=accident|fire|flood`.

## Architecture

```
frontend/      React 19 + Vite + Tailwind 4, Leaflet, Recharts, three.js
backend/       Node.js + Express + Socket.IO, simulation engine (5 s ticks)
database/      PostgreSQL + PostGIS schema and seed data
ai-service/    FastAPI + Gemini + RAG, safety guard and approval workflow
ml-service/    FastAPI + scikit-learn models (traffic, flood, e-waste, anomaly)
```

### Demo mode (used for the public link)

GitHub Pages can only host static files. When the frontend is built without `VITE_API_URL`, it switches to **demo mode** (`frontend/src/lib/demoEngine.js`). This is an in-browser copy of the backend simulation and the AI service's fallback responses, so the public link works with no servers running. The header shows **Live Demo** in this mode.

When running locally with the services up, `frontend/.env.development` points the app at the real backend and AI service instead.

## Run locally (full stack)

```bash
# 1. Database (PostgreSQL 15+ with PostGIS)
psql -U postgres -c "CREATE DATABASE chennai_iccc;"
psql -U postgres -d chennai_iccc -f database/schema.sql
psql -U postgres -d chennai_iccc -f database/seed.sql

# 2. Backend  (create backend/.env with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, FRONTEND_URL)
cd backend && npm install && npm run dev

# 3. ML service  (port 8000)
cd ml-service && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
uvicorn main:app --port 8000

# 4. AI service  (create ai-service/.env with GEMINI_API_KEY and ML_SERVICE_URL)
cd ai-service && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
uvicorn main:app --port 8100

# 5. Frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Only the frontend is needed to try the demo locally: `cd frontend && npm install && npm run build && npm run preview`.

## Deploy to GitHub Pages

1. Create an empty repository on GitHub (for example `chennai-iccc`).
2. Push this project to its `main` branch.
3. In the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The workflow `.github/workflows/deploy-pages.yml` builds `frontend/` and publishes it. Your link is `https://<username>.github.io/<repo-name>/` (this project: https://ritwikamandal-hub.github.io/chennai-iccc/).

`.env` files (Gemini key, database password) are excluded by `.gitignore` and never uploaded.
