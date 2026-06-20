// Thin client for the Pool Buddy backend REST API.
// The browser no longer talks to a database directly — all persistence goes
// through the Express backend, which owns the Postgres connection.

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  // Some endpoints (DELETE) may return an empty body.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const apiClient = {
  getState: () => req('/state'),
  updateConfig: (config: any) => req('/config', { method: 'PUT', body: JSON.stringify(config) }),
  addChemistry: (reading: any) => req('/chemistry', { method: 'POST', body: JSON.stringify(reading) }),
  updateDevice: (id: string, data: any) =>
    req(`/device/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addTask: (task: any) => req('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  completeTask: (id: string) => req(`/tasks/${id}/complete`, { method: 'PUT' }),
  addNotification: (n: any) => req('/notifications', { method: 'POST', body: JSON.stringify(n) }),
  markNotificationRead: (id: string) => req(`/notifications/${id}/read`, { method: 'PUT' }),
  clearNotifications: () => req('/notifications', { method: 'DELETE' }),
  addAlexaLog: (log: any) => req('/alexa-history', { method: 'POST', body: JSON.stringify(log) }),
  getSettingStatus: (key: string) => req(`/settings/${key}`),
  saveSetting: (key: string, value: string) =>
    req(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
};
