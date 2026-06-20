import { Router } from 'express';
import { pool, getSetting, setSetting } from './db';
import { setEntityState, getEntityState, ping } from './ha';

export const api = Router();

// --- Row <-> client shape mappers ---
function rowToConfig(r: any) {
  return {
    shape: r.shape,
    diameter: r.diameter ?? undefined,
    width: r.width ?? undefined,
    length: r.length ?? undefined,
    avgDepth: r.avg_depth,
    volumeGallons: r.volume_gallons,
  };
}

function rowToChemistry(r: any) {
  return {
    id: String(r.id),
    ph: r.ph,
    chlorine: r.chlorine,
    alkalinity: r.alkalinity,
    cya: r.cya,
    calcium: r.calcium,
    temperature: r.temperature,
    notes: r.notes ?? undefined,
    timestamp: r.timestamp,
  };
}

function rowToTask(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    intervalDays: r.interval_days,
    lastDone: r.last_done,
    upcomingDue: r.upcoming_due,
    category: r.category,
  };
}

function rowToNotification(r: any) {
  return {
    id: String(r.id),
    title: r.title,
    message: r.message,
    type: r.type,
    category: r.category,
    read: r.read,
    timestamp: r.timestamp,
  };
}

function rowToAlexaLog(r: any) {
  return {
    id: String(r.id),
    command: r.command,
    alexaResponse: r.alexa_response,
    deviceStateChanged: r.device_state_changed,
    success: r.success,
    timestamp: r.timestamp,
  };
}

// GET /api/state — full bootstrap payload for the frontend on load
api.get('/state', async (_req, res) => {
  try {
    const [cfg, chem, devices, tasks, alexa, notifs] = await Promise.all([
      pool.query("SELECT * FROM pool_config WHERE id = 'main'"),
      pool.query('SELECT * FROM chemistry_logs ORDER BY timestamp DESC LIMIT 10'),
      pool.query('SELECT * FROM device_status'),
      pool.query('SELECT * FROM maintenance_tasks'),
      pool.query('SELECT * FROM alexa_history ORDER BY timestamp DESC LIMIT 15'),
      pool.query('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 30'),
    ]);

    const deviceMap: Record<string, any> = {};
    devices.rows.forEach((r) => (deviceMap[r.id] = r.data));

    res.json({
      config: cfg.rowCount ? rowToConfig(cfg.rows[0]) : null,
      chemistry: chem.rows.map(rowToChemistry),
      pump: deviceMap.pump ?? null,
      chlorinator: deviceMap.chlorinator ?? null,
      heater: deviceMap.heater ?? null,
      thermometer: deviceMap.thermometer ?? null,
      alexaConnection: deviceMap.alexa_connection ?? null,
      tasks: tasks.rows.map(rowToTask),
      alexaLogs: alexa.rows.map(rowToAlexaLog),
      notifications: notifs.rows.map(rowToNotification),
    });
  } catch (err: any) {
    console.error('GET /state failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/config
api.put('/config', async (req, res) => {
  try {
    const c = req.body;
    await pool.query(
      `INSERT INTO pool_config (id, shape, diameter, width, length, avg_depth, volume_gallons)
       VALUES ('main', $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         shape = EXCLUDED.shape, diameter = EXCLUDED.diameter, width = EXCLUDED.width,
         length = EXCLUDED.length, avg_depth = EXCLUDED.avg_depth, volume_gallons = EXCLUDED.volume_gallons`,
      [c.shape, c.diameter ?? null, c.width ?? null, c.length ?? null, c.avgDepth, c.volumeGallons]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chemistry — add a reading, returns the stored row (with DB id + timestamp)
api.post('/chemistry', async (req, res) => {
  try {
    const c = req.body;
    const r = await pool.query(
      `INSERT INTO chemistry_logs (ph, chlorine, alkalinity, cya, calcium, temperature, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [c.ph, c.chlorine, c.alkalinity, c.cya, c.calcium, c.temperature, c.notes ?? null]
    );
    res.json(rowToChemistry(r.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/device/:id — upsert a device's JSON state (pump, chlorinator, heater, thermometer, alexa_connection)
api.put('/device/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `INSERT INTO device_status (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [id, req.body]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create a maintenance task
api.post('/tasks', async (req, res) => {
  try {
    const t = req.body;
    await pool.query(
      `INSERT INTO maintenance_tasks (id, name, description, interval_days, last_done, upcoming_due, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [t.id, t.name, t.description, t.intervalDays, t.lastDone, t.upcomingDue, t.category]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id/complete — mark done, recompute next due date
api.put('/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE maintenance_tasks
       SET last_done = now(),
           upcoming_due = now() + (interval_days || ' days')::interval
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'task not found' });
    res.json(rowToTask(r.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications — create, returns row with DB-assigned id
api.post('/notifications', async (req, res) => {
  try {
    const n = req.body;
    const r = await pool.query(
      `INSERT INTO notifications (title, message, type, category, read)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [n.title, n.message, n.type, n.category, n.read ?? false]
    );
    res.json(rowToNotification(r.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read
api.put('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications — clear all
api.delete('/notifications', async (_req, res) => {
  try {
    await pool.query('DELETE FROM notifications');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alexa-history — log a voice interaction
api.post('/alexa-history', async (req, res) => {
  try {
    const l = req.body;
    const r = await pool.query(
      `INSERT INTO alexa_history (command, alexa_response, device_state_changed, success)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [l.command, l.alexaResponse, l.deviceStateChanged, l.success]
    );
    res.json(rowToAlexaLog(r.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Settings ---
// Secret keys (API keys, tokens) return only isSet — never the value itself.
// Non-secret keys (entity IDs, URLs) return the value so the frontend can use them.
const SECRET_KEYS = new Set(['gemini_api_key', 'ha_token']);

api.get('/settings/:key', async (req, res) => {
  try {
    const val = await getSetting(req.params.key);
    const isSecret = SECRET_KEYS.has(req.params.key);
    res.json({
      key: req.params.key,
      isSet: !!val,
      value: isSecret ? undefined : (val ?? null),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.put('/settings/:key', async (req, res) => {
  try {
    await setSetting(req.params.key, req.body.value ?? '');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Home Assistant passthrough ---

// POST /api/ha/device/:entity  body: { on: boolean }
// Tells HA to turn a switch on or off, then syncs state to our DB.
api.post('/ha/device/:entity', async (req, res) => {
  const entityId = req.params.entity;
  const { on } = req.body;
  if (typeof on !== 'boolean') {
    return res.status(400).json({ error: '"on" (boolean) is required' });
  }
  try {
    await setEntityState(entityId, on);
    res.json({ ok: true, entity_id: entityId, on });
  } catch (err: any) {
    console.warn(`HA device control failed for ${entityId}:`, err.message);
    // Return the error but don't 500 — the frontend state update already
    // happened optimistically and we don't want to confuse the UI.
    res.status(503).json({ error: err.message, haUnreachable: true });
  }
});

// GET /api/ha/ping — verify the configured HA URL + token are reachable/valid.
api.get('/ha/ping', async (_req, res) => {
  const result = await ping();
  res.status(result.ok ? 200 : 503).json(result);
});

// GET /api/ha/state/:entity — read any HA entity state
api.get('/ha/state/:entity', async (req, res) => {
  try {
    const state = await getEntityState(req.params.entity);
    res.json(state);
  } catch (err: any) {
    res.status(503).json({ error: err.message });
  }
});
