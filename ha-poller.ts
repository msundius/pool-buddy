// Background poller: reads the Inkbird temperature from Home Assistant every
// N minutes and writes it to the database as a device_status update.
// Starts automatically when the server boots; stops gracefully on SIGTERM.

import { getSetting, pool } from './db';
import { readTemperature } from './ha';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function pollTemperature() {
  const entityId = await getSetting('ha_temp_entity');
  if (!entityId) return; // not configured yet — skip silently

  const reading = await readTemperature(entityId);
  if (!reading) return;

  // Convert to °F if HA is reporting in °C
  const tempF =
    reading.unit === '°C'
      ? Math.round((reading.value * 9) / 5 + 32)
      : reading.value;

  // Update the thermometer device_status row with the live reading.
  await pool.query(
    `INSERT INTO device_status (id, data)
     VALUES ('thermometer', $1)
     ON CONFLICT (id) DO UPDATE
       SET data = device_status.data || $1`,
    [
      JSON.stringify({
        currentWaterTemp: tempF,
        lastSynced: new Date().toISOString(),
      }),
    ]
  );

  console.log(`[HA poller] Pool temp updated: ${tempF}°F`);
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startHaPoller() {
  // Run immediately on boot, then on interval.
  pollTemperature().catch((e) =>
    console.warn('[HA poller] Initial poll failed:', e.message)
  );

  timer = setInterval(() => {
    pollTemperature().catch((e) =>
      console.warn('[HA poller] Poll failed:', e.message)
    );
  }, POLL_INTERVAL_MS);
}

export function stopHaPoller() {
  if (timer) clearInterval(timer);
}
