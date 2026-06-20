// Home Assistant REST API client.
// All configuration (URL, token, entity IDs) is stored in the settings table
// so it can be changed from the UI without a restart.
//
// HA REST API docs: https://developers.home-assistant.io/docs/api/rest/

import { getSetting } from './db';

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
}

async function getConfig() {
  const [url, token] = await Promise.all([
    getSetting('ha_url'),
    getSetting('ha_token'),
  ]);
  // Strip any trailing slash so `${url}/api/...` never produces `//api`.
  const base = (url || 'http://isabella:8123').replace(/\/+$/, '');
  return { url: base, token };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Fetch the current state of any HA entity.
export async function getEntityState(entityId: string): Promise<HaState> {
  const { url, token } = await getConfig();
  if (!token) throw new Error('Home Assistant token not configured.');

  const res = await fetch(`${url}/api/states/${entityId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`HA API error ${res.status} for ${entityId}`);
  return res.json();
}

// Turn a switch/light entity on or off.
export async function setEntityState(
  entityId: string,
  on: boolean
): Promise<void> {
  const { url, token } = await getConfig();
  if (!token) throw new Error('Home Assistant token not configured.');

  const domain = entityId.split('.')[0]; // e.g. "switch" from "switch.pool_pump"
  const service = on ? 'turn_on' : 'turn_off';

  const res = await fetch(`${url}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ entity_id: entityId }),
  });
  if (!res.ok) throw new Error(`HA service call failed: ${res.status}`);
}

// Connectivity check used by the Settings "Test connection" button.
// Hits HA's API root, which returns {"message":"API running."} on success —
// verifying both that the URL is reachable and that the token is valid.
export async function ping(): Promise<{
  ok: boolean;
  status?: number;
  url: string;
  error?: string;
}> {
  const { url, token } = await getConfig();
  if (!token) {
    return { ok: false, url, error: 'No Home Assistant token configured.' };
  }
  try {
    const res = await fetch(`${url}/api/`, { headers: headers(token) });
    if (!res.ok) {
      const hint =
        res.status === 401
          ? 'token rejected — recreate the Long-Lived Access Token'
          : `HA returned HTTP ${res.status}`;
      return { ok: false, status: res.status, url, error: hint };
    }
    return { ok: true, status: res.status, url };
  } catch (err: any) {
    // Network-level failure (DNS, refused, timeout) — never reached HA.
    return {
      ok: false,
      url,
      error: `${err?.message ?? 'fetch failed'} — check the URL and that the backend can reach this host`,
    };
  }
}

// Read the current temperature from the Inkbird sensor entity.
// Returns the numeric value and unit, or null if not available.
export async function readTemperature(
  entityId: string
): Promise<{ value: number; unit: string } | null> {
  try {
    const state = await getEntityState(entityId);
    const value = parseFloat(state.state);
    if (isNaN(value)) return null;
    const unit = state.attributes.unit_of_measurement || '°F';
    return { value, unit };
  } catch {
    return null;
  }
}
