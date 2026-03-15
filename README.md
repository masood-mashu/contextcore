# ⬡ ContextCore

> A local-first personal context engine that observes your activity, infers your focus and energy state, and exposes it via a local REST API — so every tool you use can finally know how you're doing.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat-square&logo=node.js&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat-square&logo=electron&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-00f5c4?style=flat-square)

---

## What is ContextCore?

Most productivity tools treat you as a **stateless stranger** every session. Your IDE doesn't know you just came out of 3 back-to-back meetings. Your calendar doesn't know your energy is depleted. No app talks to any other app about _you_.

ContextCore fixes this. It runs silently in the background, builds a **living model of your current state** (focus, energy, stress), and exposes it through a local REST API that any tool can query.

**Everything stays on your device. No cloud. No tracking. No API keys.**

---

## Demo

| Electron Dashboard               | VS Code Extension           |
| -------------------------------- | --------------------------- |
| ![Dashboard](docs/dashboard.png) | ![VS Code](docs/vscode.png) |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Your Device                    │
│                                                 │
│  Calendar · App Usage · Mood Input              │
│          ↓                                      │
│   Context Engine (runs every 15 min)            │
│   → Scores focus, energy, stress (0-10)         │
│   → Classifies state (deep_work, scattered...)  │
│          ↓                                      │
│   SQLite Database (sql.js, local)               │
│          ↓                                      │
│   Express REST API (localhost:7337)             │
│     ↙           ↘                              │
│ Electron App   VS Code Extension                │
│ (Dashboard)    (Status Bar)                     │
│                                                 │
│   Daily Mirror → Ollama (phi3:mini, local LLM)  │
└─────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
contextcore/
├── packages/
│   ├── shared/           # TypeScript types + constants
│   └── database/         # sql.js + 5 repository classes
│
├── apps/
│   ├── context-engine/   # Scorer + classifier + engine loop
│   ├── api-server/       # Express REST API on :7337
│   ├── electron/         # Desktop dashboard
│   └── vscode-extension/ # VS Code status bar integration
│
├── docs/                 # Documentation + screenshots
├── tsconfig.base.json    # Shared TypeScript config
└── package.json          # npm workspaces root
```

---

## Features

### 🎯 Context Engine

- Computes **focus score**, **energy score**, and **stress score** every 15 minutes
- Rule-based state classifier: `deep_work` · `scattered` · `in_meeting` · `break` · `unknown`
- Processes app focus events, calendar data, and mood check-ins
- Confidence scoring — knows when it doesn't have enough data

### 🌐 Local REST API

- Runs on `localhost:7337` — token authenticated
- `GET /context` — full context snapshot
- `GET /context/focus` — lightweight focus state for integrations
- `GET /context/history` — timeline of past states
- `POST /mood` — log a mood check-in
- `GET /mirror` — AI-generated daily debrief
- `POST /context/refresh` — force engine recompute

### 🖥️ Electron Dashboard

- Live context cards — focus, energy, stress
- 24-hour timeline chart
- Mood logging with emoji picker
- Daily Mirror section powered by local LLM

### 💻 VS Code Extension

- Live focus state in the status bar (`🎯 Deep Focus ⚡ High`)
- Rich tooltip with all context details
- Context panel (`Ctrl+Shift+C`)
- Mood picker via command palette
- Focus nudge notifications when scattered
- Built-in 25-min Pomodoro timer

### ◈ Daily Mirror (AI Debrief)

- Powered by **Ollama + phi3:mini** running locally
- Reads your context history and generates a personalized daily summary
- Gracefully falls back to rule-based summary if Ollama isn't running
- Example: _"Strong focus day — 3.2 hrs deep work. Energy dipped after 9 PM. Tomorrow: protect your morning block."_

---

## Tech Stack

| Layer             | Technology                                    |
| ----------------- | --------------------------------------------- |
| Language          | TypeScript 5.x (strict mode)                  |
| Runtime           | Node.js 24.x                                  |
| Database          | sql.js (SQLite, in-memory + file persistence) |
| API Server        | Express.js + CORS                             |
| Desktop App       | Electron 28                                   |
| VS Code Extension | VS Code Extension API                         |
| Local LLM         | Ollama + phi3:mini (3.8B)                     |
| Monorepo          | npm workspaces                                |
| Build             | TypeScript compiler (tsc)                     |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Git
- [Ollama](https://ollama.com/download) (optional, for AI Mirror)

### Installation

```bash
# Clone the repo
git clone https://github.com/masood-mashu/contextcore.git
cd contextcore

# Install all dependencies
npm install

# Build all packages
npm run build --workspace=packages/shared
npm run build --workspace=packages/database
npm run build --workspace=apps/context-engine
npm run build --workspace=apps/api-server
npm run build --workspace=apps/electron
npm run build --workspace=apps/vscode-extension
```

### Running

**Start the API server** (required for everything):

```bash
node apps/api-server/dist/index.js
```

**Start the Electron dashboard:**

```bash
.\node_modules\.bin\electron apps/electron
```

**Install VS Code extension** (dev mode):

- Press `F5` in VS Code with the repo open
- Select "Run ContextCore Extension"
- Look for the status bar in the new window

### Enable AI Mirror (optional)

```bash
# Install Ollama from https://ollama.com/download
# Then pull phi3:mini (2.3GB)
ollama pull phi3:mini

# Ollama starts automatically — Mirror will use it on next call
curl http://127.0.0.1:7337/mirror \
  -H "X-ContextCore-Token: cc-dev-token-2024"
```

---

## API Reference

**Base URL:** `http://127.0.0.1:7337`  
**Auth:** `X-ContextCore-Token: cc-dev-token-2024` header

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/health`                   | Liveness check (no auth) |
| GET    | `/context`                  | Full context snapshot    |
| GET    | `/context/focus`            | Focus state only         |
| GET    | `/context/history?hours=24` | Historical states        |
| POST   | `/context/refresh`          | Force recompute now      |
| POST   | `/mood`                     | Log mood check-in        |
| GET    | `/mood/today`               | Today's mood             |
| GET    | `/mirror`                   | AI daily debrief         |

### Example Response

```json
{
  "ok": true,
  "context": {
    "focus_state": "deep_work",
    "focus_score": 8.2,
    "energy_level": "high",
    "energy_score": 7.5,
    "stress_category": "low",
    "stress_level": 2.1,
    "deep_work_minutes_today": 147,
    "meetings_today": 1,
    "inference_reason": "Sustained deep work detected — focus score 8.2/10",
    "confidence": 0.87
  }
}
```

---

## How Context is Inferred

ContextCore uses a **3-stage pipeline**:

**1. Signal Gathering** — collects raw events (app focus, mood check-ins, calendar)

**2. Scoring** — converts signals to numeric scores:

- `focus_score` — based on app type, session duration, switching frequency
- `energy_score` — mood check-in + time of day + meeting load
- `stress_score` — meeting density + late-night work + mood signals

**3. Classification** — converts scores to human-readable states:

```
focus_score ≥ 8.0  →  deep_work
focus_score ≥ 2.0  →  scattered
focus_score < 2.0  →  break
```

---

## Roadmap

- [ ] Google Calendar OAuth sync
- [ ] macOS/Windows native app focus tracking
- [ ] Apple Watch / Fitbit integration
- [ ] Context rules engine (if stress > 7 → mute Slack)
- [ ] ContextCore SDK for third-party integrations
- [ ] Windows installer (.exe)
- [ ] macOS app bundle (.app)
- [ ] Test coverage

---

## Project Structure — Key Files

```
packages/shared/src/types/context.ts     ← Core TypeScript interfaces
packages/database/src/db.ts             ← SQLite connection + migrations
packages/database/src/repositories/     ← Repository pattern (5 classes)
apps/context-engine/src/scorer.ts       ← Scoring algorithm
apps/context-engine/src/classifier.ts   ← State classification
apps/context-engine/src/engine.ts       ← Engine loop + signal gathering
apps/api-server/src/index.ts            ← Express server entry point
apps/api-server/src/middleware/auth.ts  ← Token authentication
apps/api-server/src/services/           ← Mirror AI service
apps/electron/src/main.ts               ← Electron main process
apps/vscode-extension/src/extension.ts  ← VS Code extension entry
```

---

## Built By

**Mohammed Masood** — 3rd year CSE (Data Science) student at Bangalore Institute of Technology.

- Portfolio: [mohammed-masood.vercel.app](https://mohammed-masood.vercel.app)
- GitHub: [@masood-mashu](https://github.com/masood-mashu)

---

## License

MIT — do whatever you want with it.
