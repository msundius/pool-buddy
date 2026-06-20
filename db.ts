import pg from 'pg';

const { Pool } = pg;

// Connection comes from DATABASE_URL (set by docker-compose / environment).
// Falls back to a sane local default for non-Docker development.
const connectionString =
  process.env.DATABASE_URL ||
  'postgres://poolbuddy:poolbuddy@localhost:5432/poolbuddy';

export const pool = new Pool({ connectionString });

// --- Default seed data (only inserted when a table is empty) ---
const DEFAULT_CONFIG = {
  shape: 'round',
  diameter: 18,
  width: null,
  length: null,
  avgDepth: 4,
  volumeGallons: 5978,
};

const DEFAULT_DEVICES: Record<string, any> = {
  pump: {
    isCurrentlyOn: false,
    dailyTargetHours: 8,
    scheduleStart: '08:00',
    scheduleEnd: '16:00',
    autoScheduled: true,
    lastChanged: new Date().toISOString(),
  },
  chlorinator: {
    isCurrentlyOn: false,
    outputPercentage: 45,
    scheduleStart: '09:00',
    scheduleEnd: '15:00',
    autoScheduled: true,
    lastChanged: new Date().toISOString(),
  },
  heater: {
    isCurrentlyOn: false,
    targetTemperature: 84,
    mode: 'eco',
    lastChanged: new Date().toISOString(),
  },
  thermometer: {
    currentWaterTemp: 81.2,
    currentAirTemp: 76,
    trend: 'stable',
    batteryPercentage: 94,
    lastSynced: new Date().toISOString(),
  },
};

const DEFAULT_CHEMISTRY = {
  ph: 7.9,
  chlorine: 0.5,
  alkalinity: 70,
  cya: 20,
  calcium: 110,
  temperature: 81,
  notes: 'Starting baseline measurement. Pool balance needs priority adjustments.',
};

const DEFAULT_TASKS = [
  {
    id: 'skim',
    name: 'Skim Water Leaves/Bugs',
    description: 'Use telescoping pole net to scoop floaters from pool surface.',
    intervalDays: 1,
    lastDone: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    upcomingDue: new Date(Date.now()).toISOString(),
    category: 'cleaning',
  },
  {
    id: 'vacuum',
    name: 'Vacuum Pool Floor',
    description: 'Connect vacuum hose to skimmer suction port to capture grit.',
    intervalDays: 7,
    lastDone: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    upcomingDue: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    category: 'cleaning',
  },
  {
    id: 'backwash',
    name: 'Backwash Sand Filter',
    description: 'Reverse sand flow when gauge shows +8 PSI increase.',
    intervalDays: 10,
    lastDone: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
    upcomingDue: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    category: 'filter',
  },
  {
    id: 'shock',
    name: 'Liquid Chlorine Shock',
    description: 'Shock pool with 12% solution after dusk to kill persistent algae.',
    intervalDays: 14,
    lastDone: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    upcomingDue: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    category: 'chemistry',
  },
];

// Create the schema and seed defaults on first boot. Idempotent.
export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pool_config (
      id TEXT PRIMARY KEY DEFAULT 'main',
      shape TEXT,
      diameter REAL,
      width REAL,
      length REAL,
      avg_depth REAL,
      volume_gallons INTEGER
    );

    CREATE TABLE IF NOT EXISTS chemistry_logs (
      id SERIAL PRIMARY KEY,
      ph REAL,
      chlorine REAL,
      alkalinity REAL,
      cya REAL,
      calcium REAL,
      temperature REAL,
      notes TEXT,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS device_status (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      interval_days INTEGER NOT NULL,
      last_done TIMESTAMPTZ,
      upcoming_due TIMESTAMPTZ,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS alexa_history (
      id SERIAL PRIMARY KEY,
      command TEXT,
      alexa_response TEXT,
      device_state_changed TEXT,
      success BOOLEAN,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title TEXT,
      message TEXT,
      type TEXT,
      category TEXT,
      read BOOLEAN NOT NULL DEFAULT false,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await seedDefaults();
}

async function seedDefaults(): Promise<void> {
  // Pool config singleton
  const cfg = await pool.query('SELECT 1 FROM pool_config WHERE id = $1', ['main']);
  if (cfg.rowCount === 0) {
    await pool.query(
      `INSERT INTO pool_config (id, shape, diameter, width, length, avg_depth, volume_gallons)
       VALUES ('main', $1, $2, $3, $4, $5, $6)`,
      [
        DEFAULT_CONFIG.shape,
        DEFAULT_CONFIG.diameter,
        DEFAULT_CONFIG.width,
        DEFAULT_CONFIG.length,
        DEFAULT_CONFIG.avgDepth,
        DEFAULT_CONFIG.volumeGallons,
      ]
    );
  }

  // Devices
  for (const [id, data] of Object.entries(DEFAULT_DEVICES)) {
    await pool.query(
      `INSERT INTO device_status (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [id, data]
    );
  }

  // Chemistry seed
  const chem = await pool.query('SELECT 1 FROM chemistry_logs LIMIT 1');
  if (chem.rowCount === 0) {
    await pool.query(
      `INSERT INTO chemistry_logs (ph, chlorine, alkalinity, cya, calcium, temperature, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        DEFAULT_CHEMISTRY.ph,
        DEFAULT_CHEMISTRY.chlorine,
        DEFAULT_CHEMISTRY.alkalinity,
        DEFAULT_CHEMISTRY.cya,
        DEFAULT_CHEMISTRY.calcium,
        DEFAULT_CHEMISTRY.temperature,
        DEFAULT_CHEMISTRY.notes,
      ]
    );
  }

  // Maintenance tasks seed
  const tasks = await pool.query('SELECT 1 FROM maintenance_tasks LIMIT 1');
  if (tasks.rowCount === 0) {
    for (const t of DEFAULT_TASKS) {
      await pool.query(
        `INSERT INTO maintenance_tasks (id, name, description, interval_days, last_done, upcoming_due, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [t.id, t.name, t.description, t.intervalDays, t.lastDone, t.upcomingDue, t.category]
      );
    }
  }
}

// --- Settings helpers (used for the Gemini API key, later HA token, etc.) ---
export async function getSetting(key: string): Promise<string | null> {
  const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return res.rowCount && res.rowCount > 0 ? res.rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}
