# Pool Buddy — Roadmap

## Done in this PR (foundation)

- [x] **#9 — Replace Firebase with local Postgres.** Browser talks to the
      Express backend, which owns the Postgres connection. Schema + seed created
      automatically on boot (`db.ts`). REST API in `api.ts`.
- [x] **#10 — Dockerize the backend.** `Dockerfile` + `docker-compose.yml`
      (Postgres + backend). DB connection via `DATABASE_URL`.
- [x] **#1 — Secrets out of source.** Firebase removed entirely. Gemini key now
      stored in the `settings` table, entered via the in-app Settings panel.
- [x] **#5 — Port to env var; remove hardcoded personal data.** `PORT` is an env
      var; the footer email is gone.
- [x] **#2 — Notification ID fix.** IDs now come from the database, so
      read-state persists correctly.

## Remaining

- [ ] **#4 — Notification dedup + pagination guard.** Backend caps the load at
      30; still want smarter dedup of recurring chemistry alerts.
- [ ] **#3 — Replace DOM-string Alexa trigger** between `AlexaConnectionManager`
      and `AlexaSandbox` with proper React state.
- [ ] **#6 — Home Assistant integration layer.** Rewire device handlers to call
      HA's REST API so buttons control real plugs. HA URL + token in `settings`.
- [ ] **#7 — Poll real temp from HA (Inkbird via Tuya→HA) → write to Postgres.**
      Replace the mock thermometer; build temp history.

## Deferred

- [ ] **#8 — Expose devices + Inkbird to Alexa via Nabu Casa**; move schedules
      to HA automations.
- [ ] Voice mic button (Web Speech → existing Gemini parser).

## Nice to have

- [ ] Native mobile packaging (Capacitor / PWA).
- [ ] Chemistry trend charts (now straightforward with SQL).
- [ ] Optional user login for the app.
