# 🎮 CLAUDE.md — CS2D Developer Guide (SPA-first)

This document contains the minimal, up-to-date guidance to work on CS2D. Old promotional and deprecated content has been removed.

## Overview
- Architecture: React SPA for UI; Lively provides sockets/backend only.
- SPA dev server: Vite on port 5174.
- Backend services:
  - API Bridge (WEBrick): http://localhost:9294
  - Lively/Falcon (WS + lobby): http://localhost:9292
- E2E: Playwright tests run against the SPA, auto-starting all services.

## Run (SPA)
From `examples/cs2d/frontend`:

```bash
npm ci
npx playwright install
npm run dev -- --port=5174
# Open: http://localhost:5174
```

Routes:
- `/` or `/lobby` — Lobby
- `/room/:id` — Waiting room
- `/game` or `/game/:id` — Game canvas
- `/pixel` — Pixel UI demo

## E2E Tests (SPA-first)
The SPA Playwright config auto-starts:
- Vite at 5174 (baseURL in config)
- API Bridge at 9294
- Falcon/Lively at 9292

Run from `examples/cs2d/frontend`:
```bash
npm run test:e2e
```

Notes:
- Tests should use relative URLs (`/`, `/game`, etc.).
- `@playwright/test` version is aligned to `^1.54.2`.
- If a port is busy, change the Vite port in Playwright config.

## Services
- Vite dev server (SPA): 5174
- API Bridge (WEBrick): 9294 (`ruby ../src/servers/api_bridge_server.rb 9294`)
- Lively/Falcon (WS): 9292 (`ruby ../src/servers/start_server.rb`)

## Internationalization
- 3 languages supported: English, 繁體中文, 日本語.
- Language switching via `useI18n()`; translations in `src/i18n/translations.ts`.

## Gameplay (Basics)
- Movement: WASD, Jump: Space, Reload: R
- Weapons: switch keys 1–5; click canvas to shoot
- HUD and scoreboard (Tab) available in game

## Conventions
- SPA-first: avoid static `room.html`/`game.html` in new work.
- Use relative paths in tests; rely on Playwright `baseURL`.
- Run SPA tests from `examples/cs2d/frontend` to avoid mixed dependencies.

## Troubleshooting
- “test.describe called here” → ensure a single Playwright version (use SPA’s).
- Port in use → change Vite port in `examples/cs2d/frontend/playwright.config.ts`.
- Overcommit hooks blocking commit → install the gem or set `OVERCOMMIT_DISABLE=1`.

Last updated: keep this lean and accurate to current setup.

