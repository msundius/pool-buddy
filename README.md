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
# Create your config from the template and edit it (password, port, etc.):
cp .env.example .env
docker compose up --build
```

App: `http://localhost:<PORT>` (e.g. `http://localhost:3000`), where `PORT` is
whatever you set in `.env`.

## Run locally (without Docker)

**Prerequisites:** Node.js 20+, a reachable PostgreSQL instance.

1. Install dependencies: `npm install`
2. Create your config: `cp .env.example .env`, then point `DATABASE_URL` at your
   database and adjust `PORT` if you like.
3. Run: `npm run dev` (schema is created and seeded automatically on first boot)

## Configuration

All basic settings live in **`.env`** (copy `.env.example` to get started). It
is the single source of truth — read by both the Node server and Docker
Compose, so each value is set in exactly one place.

- **`PORT`** — port the backend listens on (e.g. `3000`). Change it here and it
  applies everywhere, including the Docker port mapping.
- **`DATABASE_URL`** / **`POSTGRES_*`** — database connection and the bundled
  Postgres container's credentials.
- **Gemini API key** — *not* stored in source or a config file. Open the app's
  **Settings** panel (gear icon, top-right) and paste a key from
  [Google AI Studio](https://aistudio.google.com/app/apikey). It's saved in the
  database. Without a key, commands fall back to a built-in regex parser.

See [TODO.md](TODO.md) for the planned roadmap (Home Assistant integration,
Inkbird temperature, Alexa via Nabu Casa, etc.).

## Contributing

Contributions are welcome. Please open an issue or pull request to discuss
changes before submitting larger work.
