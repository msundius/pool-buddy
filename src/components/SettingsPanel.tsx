import React, { useState, useEffect } from 'react';
import { Settings, X, KeyRound, CheckCircle2, Home, Thermometer, Zap } from 'lucide-react';
import { apiClient } from '../api';

type SaveFlash = Record<string, boolean>;

// Settings drawer — stores all configuration in the database.
// Secrets (API keys, tokens) are write-only: the backend never sends the value back.
// Non-secrets (entity IDs, URLs) are readable and pre-populated.
export function SettingsPanel() {
  const [open, setOpen] = useState(false);

  // Gemini
  const [geminiIsSet, setGeminiIsSet] = useState(false);
  const [geminiInput, setGeminiInput] = useState('');

  // Home Assistant
  const [haUrl, setHaUrl] = useState('');
  const [haToken, setHaToken] = useState('');
  const [haTokenIsSet, setHaTokenIsSet] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [haEntityPump, setHaEntityPump] = useState('');
  const [haEntityChlor, setHaEntityChlor] = useState('');
  const [haEntityHeater, setHaEntityHeater] = useState('');
  const [haEntityTemp, setHaEntityTemp] = useState('');

  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState<SaveFlash>({});

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiClient.getSettingStatus('gemini_api_key'),
      apiClient.getSettingStatus('ha_token'),
      apiClient.getSettingStatus('ha_url'),
      apiClient.getSettingStatus('ha_entity_pump'),
      apiClient.getSettingStatus('ha_entity_chlorinator'),
      apiClient.getSettingStatus('ha_entity_heater'),
      apiClient.getSettingStatus('ha_temp_entity'),
    ]).then(([gem, tok, url, pump, chlor, heat, temp]) => {
      setGeminiIsSet(!!gem?.isSet);
      setHaTokenIsSet(!!tok?.isSet);
      if (url?.value) setHaUrl(url.value);
      if (pump?.value) setHaEntityPump(pump.value);
      if (chlor?.value) setHaEntityChlor(chlor.value);
      if (heat?.value) setHaEntityHeater(heat.value);
      if (temp?.value) setHaEntityTemp(temp.value);
    }).catch(() => {});
  }, [open]);

  async function save(key: string, value: string, setter?: (v: string) => void) {
    setSaving(key);
    try {
      await apiClient.saveSetting(key, value.trim());
      if (setter) setter(value.trim());
      setFlash((f) => ({ ...f, [key]: true }));
      setTimeout(() => setFlash((f) => ({ ...f, [key]: false })), 2500);
    } catch (e) {
      console.warn(`Could not save ${key}.`, e);
    } finally {
      setSaving(null);
    }
  }

  // Tests the *saved* HA URL + token (the backend reads them from the DB),
  // so save those fields before testing.
  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await apiClient.haPing();
      setTestResult({
        ok: true,
        msg: `Connected to ${r.url} — Home Assistant is reachable and the token works.`,
      });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message ?? 'Connection failed.' });
    } finally {
      setTesting(false);
    }
  }

  function SavedBadge({ k }: { k: string }) {
    return flash[k] ? (
      <span className="text-xs text-emerald-600 flex items-center gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" /> Saved
      </span>
    ) : null;
  }

  function Field({
    label, value, onChange, onSave, settingKey, type = 'text', placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    onSave: () => void; settingKey: string; type?: string; placeholder?: string;
  }) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">{label}</label>
          <SavedBadge k={settingKey} />
        </div>
        <div className="flex gap-2">
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <button
            onClick={onSave}
            disabled={saving === settingKey || value.trim().length === 0}
            className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-medium rounded-lg px-3 py-2 text-sm transition-colors"
          >
            {saving === settingKey ? '…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl p-6 overflow-y-auto space-y-8">

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-sky-500" /> Settings
              </h2>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Gemini */}
            <section className="space-y-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <KeyRound className="h-4 w-4 text-amber-500" /> Gemini AI
              </h3>
              <p className="text-xs text-slate-500">
                Powers natural-language command parsing. Get a key from{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-600 underline">
                  Google AI Studio
                </a>. Without it, commands use the built-in regex parser.
              </p>
              <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${geminiIsSet ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {geminiIsSet ? <><CheckCircle2 className="h-3.5 w-3.5" /> Key saved</> : 'No key saved yet.'}
              </div>
              <Field
                label="API Key" settingKey="gemini_api_key" type="password"
                value={geminiInput} onChange={setGeminiInput}
                placeholder={geminiIsSet ? 'Enter new key to replace…' : 'AIzaSy…'}
                onSave={() => save('gemini_api_key', geminiInput, () => { setGeminiIsSet(true); setGeminiInput(''); })}
              />
            </section>

            {/* Home Assistant */}
            <section className="space-y-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Home className="h-4 w-4 text-sky-500" /> Home Assistant
              </h3>
              <p className="text-xs text-slate-500">
                Point this at your Home Assistant and create a Long-Lived Access
                Token in HA under your Profile → scroll to bottom. When HA runs on
                the same host as this app, use{' '}
                <code className="bg-slate-100 px-1 rounded">http://host.docker.internal:8123</code>{' '}
                (the default). Otherwise use HA's IP or a hostname the container
                can resolve.
              </p>
              <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${haTokenIsSet ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {haTokenIsSet ? <><CheckCircle2 className="h-3.5 w-3.5" /> Token saved — HA integration active</> : '⚠ No token yet — device control is simulated only'}
              </div>
              <Field
                label="Base URL" settingKey="ha_url"
                value={haUrl} onChange={setHaUrl}
                placeholder="http://host.docker.internal:8123"
                onSave={() => save('ha_url', haUrl)}
              />
              <Field
                label="Long-Lived Access Token" settingKey="ha_token" type="password"
                value={haToken} onChange={setHaToken}
                placeholder={haTokenIsSet ? 'Enter new token to replace…' : 'eyJ0eXAi…'}
                onSave={() => save('ha_token', haToken, () => { setHaTokenIsSet(true); setHaToken(''); })}
              />

              <button
                onClick={testConnection}
                disabled={testing}
                className="w-full border border-sky-300 text-sky-700 hover:bg-sky-50 disabled:opacity-50 font-medium rounded-lg px-3 py-2 text-sm transition-colors"
              >
                {testing ? 'Testing…' : 'Test connection'}
              </button>
              {testResult && (
                <div className={`text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {testResult.ok && <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                  <span>{testResult.msg}</span>
                </div>
              )}
              <p className="text-xs text-slate-400">Save the URL and token first, then test.</p>

              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Device Entity IDs
              </h4>
              <p className="text-xs text-slate-400">Find these in HA → Developer Tools → States. Usually look like <code className="bg-slate-100 px-1 rounded">switch.pool_pump</code>.</p>

              <Field label="Pump entity" settingKey="ha_entity_pump"
                value={haEntityPump} onChange={setHaEntityPump}
                placeholder="switch.pool_pump"
                onSave={() => save('ha_entity_pump', haEntityPump)} />

              <Field label="Chlorinator entity" settingKey="ha_entity_chlorinator"
                value={haEntityChlor} onChange={setHaEntityChlor}
                placeholder="switch.pool_chlorinator"
                onSave={() => save('ha_entity_chlorinator', haEntityChlor)} />

              <Field label="Solar heater entity" settingKey="ha_entity_heater"
                value={haEntityHeater} onChange={setHaEntityHeater}
                placeholder="switch.solar_pump"
                onSave={() => save('ha_entity_heater', haEntityHeater)} />

              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2 flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5" /> Inkbird Temperature Sensor
              </h4>
              <p className="text-xs text-slate-400">Polled every 5 minutes and written to the database automatically.</p>

              <Field label="Temperature sensor entity" settingKey="ha_temp_entity"
                value={haEntityTemp} onChange={setHaEntityTemp}
                placeholder="sensor.inkbird_pool_temperature"
                onSave={() => save('ha_temp_entity', haEntityTemp)} />
            </section>

          </div>
        </div>
      )}
    </>
  );
}
