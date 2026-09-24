# Implementation Plan — Lucky Draw (SOP restructure)

Status: **DRAFT — waiting for Phase 1 approval** (`docs/requirements/`). No code is written before approval.
Branch: `feature/sop-restructure` (sub-branches per story, merged here, then to `main`).

## 1. Scope

Rebuild the working prototype (`index.html` + `server.js`, on `main`) into the SOP stack without changing the look:

| Layer | Now | After |
|---|---|---|
| Frontend | one 80 KB HTML file, vanilla JS | `frontend/` React + TypeScript + Tailwind (Vite) |
| Backend | `server.js` proxy, no deps | `backend/` Node + Express + TypeScript, MVC, Zod |
| Data | Google Sheet via Apps Script | same, plus new `Prizes` tab. **No database (approved exception).** |
| Prize draw | browser | **backend**, under a per-booth lock |
| Prize config | browser localStorage | Sheet tab `Prizes`, read-only in the app |
| Deploy | Dockerfile | root multi-stage `Dockerfile` (build frontend → backend serves it, one origin for the cookie), root `docker-compose.yml`, Railway single service |

Approved exceptions to the SOP (recorded in `docs/requirements/README.md`):
- Phase 2 brand colors/typography: keep the existing dark design of `lucky-spin.html`.
- Phase 3 database: none. Google Sheet is the store; the Apps Script client is the repository layer.

## 2. Architecture

```
Browser (React SPA)
  │  cookie: lucky_session (JWT, 4 h, booth claim)
  ▼
backend (Express)  ── serves frontend build + /api
  routes → controllers → services → repositories
                                   └─ SheetRepository → Apps Script (token) → Google Sheet
```

- One backend instance (Railway `numReplicas: 1`). The draw uses an in-process mutex per booth, so two kiosks
  can never both win the last item. Apps Script `LockService` still guards the row write.
- Apps Script URL, token, JWT secret, credentials, admin PIN live only in backend env.

### 2.1 Folder layout (SOP 4.1)

```
lucky-spin/
├── Dockerfile                  multi-stage: frontend build + backend runtime
├── docker-compose.yml
├── .env.example
├── apps-script/Code.gs
├── docs/requirements/          ← Phase 1 (PM)
├── implementation_plan.md
├── task.md
├── backend/
│   └── src/
│       ├── config/env.ts               Zod-validated env
│       ├── routes/                     auth, players, prizes, spins, admin
│       ├── controllers/
│       ├── services/                   auth, draw (odds, quota, pick), player, prize
│       ├── repositories/sheet.repository.ts
│       ├── middlewares/                authenticate, authorize, validate, errorHandler, rateLimit
│       ├── validators/                 Zod schemas
│       ├── utils/                      AppError classes, jwt, csv
│       └── types/
│   └── tests/                          Supertest integration (unit tests co-located)
└── frontend/
    └── src/
        ├── pages/                      LoginPage, BoothPage
        ├── components/common/          Button, Input, Toggle, Toast
        ├── components/features/
        │   ├── wheel/                  useWheelScene (three.js), FlatWheel, wheelTexture, slices
        │   ├── picker/                 PlayerPicker, PlayerCard
        │   ├── reveal/                 RevealOverlay, confetti
        │   └── admin/                  AdminPanel, PrizesTab (read-only), PlayersTab, SettingsTab
        ├── hooks/                      useSession, usePlayers (20 s poll), usePrizes, useSound
        ├── services/api.ts
        ├── styles/                     tokens (Tailwind theme = existing design), keyframes
        └── types/
```

## 3. API (SOP response shape)

All `/api/*` except `POST /api/auth/login` require the session cookie. Booth comes from the JWT, never from the client.

| Method | Path | Body / query (Zod) | Success | Errors |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{ username, password, booth: 'A'\|'B' }` | 200 `{ booth, expiresAt }` + cookie | 400, 401, 429 |
| POST | `/api/auth/logout` | – | 200 | – |
| GET | `/api/auth/me` | – | 200 `{ booth, expiresAt, isAdmin }` | 401 |
| GET | `/api/players` | – | 200 `[{ id, name, company, feedback, played, prize }]` | 401, 502 |
| GET | `/api/prizes` | – | 200 `[{ id, name, color, isWin, rate, stock, given, cap, remaining, chance, isAvailable }]` | 401, 502 |
| POST | `/api/spins` | `{ playerId }` | 201 `{ prize: { id, name, isWin }, player }` | 404 player, 409 already played, 409 sold out, 502 |
| POST | `/api/admin/unlock` | `{ pin }` | 200, JWT gains `isAdmin` | 401, 429 |
| POST | `/api/admin/players/:id/reset` | – | 200 | 403, 404, 502 |
| GET | `/api/admin/players.csv` | – | 200 `text/csv` UTF-8 BOM | 403 |
| GET | `/healthz` | – | 200 | – |

Spin sequence: tap → frontend starts spinning at full speed immediately → `POST /api/spins` (draw → write Sheet,
2–8 s) → frontend eases the wheel onto the returned prize within the configured duration. If the call fails, the wheel
stops on no prize and shows the error; nothing is written.

## 4. Sheet changes (Apps Script)

New tab `Prizes` (one row per prize per booth):

| booth | name | color | rate | stock | cap_schedule | is_enabled | is_win |
|---|---|---|---|---|---|---|---|
| A | กระบอกน้ำ | #FFFFFF | 2.5 | 3 | 00:00=1;14:00=2;15:00=3 | TRUE | TRUE |

`cap_schedule` is optional; **default: empty = total stock per booth only** (product owner: wheel closes when the booth has nothing left). New Apps Script action `prizes`.

## 5. Work breakdown (owners = agents in `.claude/agents/`)

| # | Task | Owner | Depends on |
|---|---|---|---|
| 1 | Phase 1 requirements + approval | pm → **product owner** | – |
| 2 | Project init: folders, TS strict, ESLint/Prettier, Vitest, Dockerfiles, compose | backend-engineer + frontend-engineer | 1 |
| 3 | Failing tests: draw service (odds, stock, quota, lock), auth, API contract | qa-engineer | 1 |
| 4 | Backend: config, auth/JWT, SheetRepository, draw service, routes | backend-engineer | 2, 3 |
| 5 | Apps Script: `Prizes` tab + `prizes` action + tests | backend-engineer | 3 |
| 6 | Failing tests: login page, picker, admin tabs, spin flow (RTL) | qa-engineer | 1 |
| 7 | Frontend: port design to Tailwind tokens, pages, wheel scene hook, admin | frontend-engineer | 2, 6 |
| 8 | Visual parity check old vs new (desktop 1440, mobile 375) + E2E + UAT scenarios | qa-engineer | 4, 5, 7 |
| 9 | Gate 1 (lint, types, tests, coverage) + Gate 2 (integration, P95, security) | qa-engineer | 8 |
| 10 | Merge to `main`, deploy Railway | lead | 9 |

## 6. Risks

- **Design drift in the port** — 230 lines of tuned CSS and 600 lines of three.js. Mitigation: move the scene code
  as-is into one hook, map CSS 1:1 to Tailwind tokens, and screenshot-compare against `lucky-spin.html`.
- **Spin latency** — Apps Script 2–8 s. Mitigation: spin starts before the response (section 3).
- **Event deadline** — the current `main` stays deployable until this branch passes Gate 2.
