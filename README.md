# Pool Buddy

Self-hosted above-ground pool manager: water-chemistry tracking with dosing
advice, equipment scheduling (pump / chlorinator / heater), maintenance
planning, and an AI-assisted command parser.

Data is stored in a local **PostgreSQL** database, fronted by an Express
backend. The browser never talks to the database directly — all persistence
goes through the backend API.

## Run with Docker (recommended)

Brings up Postgres + the app together.

```bash
# Edit POSTGRES_PASSWORD / DATABASE_URL in docker-compose.yml first, then:
docker compose up --build
```

App: http://localhost:3000

## Run locally (without Docker)

**Prerequisites:** Node.js 20+, a reachable PostgreSQL instance.

1. Install dependencies: `npm install`
2. Point the app at your database (defaults to
   `postgres://poolbuddy:poolbuddy@localhost:5432/poolbuddy`):
   ```bash
   export DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
   ```
3. Run: `npm run dev` (schema is created and seeded automatically on first boot)

## Configuration

- **Database connection** — `DATABASE_URL` env var (set in `docker-compose.yml`
  for Docker). This is the only bootstrap setting.
- **Gemini API key** — *not* stored in source or a config file. Open the app's
  **Settings** panel (gear icon, top-right) and paste a key from
  [Google AI Studio](https://aistudio.google.com/app/apikey). It's saved in the
  database. Without a key, commands fall back to a built-in regex parser.

See [TODO.md](TODO.md) for the planned roadmap (Home Assistant integration,
Inkbird temperature, Alexa via Nabu Casa, etc.).

## Contributing

Contributions are welcome. Please open an issue or pull request to discuss
changes before submitting larger work.
