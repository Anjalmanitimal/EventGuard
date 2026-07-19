# EventGuard

Secure, role-based event ticketing platform with real-time anti-fraud controls.
Coursework project for ST6005CEM Security.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose ODM), single-node replica set for transactions |
| CI | GitHub Actions (lint, build, `npm audit`) |

## Project Structure

```
eventguard/
├── frontend/   # Next.js app
├── backend/    # Express API
└── .github/    # CI workflows
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB running locally (e.g. the local MongoDB service on the default port 27017)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # edit MONGO_URI if needed
npm run dev
```

Runs on `http://localhost:4000`. Health check: `GET /api/health`.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Runs on `http://localhost:3000`. The homepage calls the backend's health endpoint
server-side and displays the result, confirming frontend → backend → MongoDB connectivity.

## CI

On every push/PR to `main`, GitHub Actions lints and builds both apps and runs
`npm audit --audit-level=high`. See `.github/workflows/ci.yml`.

## Containerization

Docker Compose (frontend, backend, MongoDB replica set) will be added later in the
project timeline rather than maintained alongside early, fast-changing scaffolding.
