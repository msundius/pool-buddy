import React, { useState, useEffect } from 'react';
import { Settings, X, KeyRound, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api';

// Settings drawer. Currently holds the Gemini API key, which is stored in the
// database (settings table) — never in source or a config file. The key value
// is write-only from the UI: the backend reports only whether one is set.
export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [keyIsSet, setKeyIsSet] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiClient
      .getSettingStatus('gemini_api_key')
      .then((r) => setKeyIsSet(!!r?.isSet))
      .catch(() => {});
  }, [open]);

  const saveKey = async () => {
    setSaving(true);
    try {
      await apiClient.saveSetting('gemini_api_key', keyInput.trim());
      setKeyIsSet(keyInput.trim().length > 0);
      setKeyInput('');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      console.warn('Could not save Gemini key.', e);
    } finally {
      setSaving(false);
    }
  };

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
          <div className="relative w-full max-w-md bg-white h-full shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-sky-500" /> Settings
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <KeyRound className="h-4 w-4 text-amber-500" /> Gemini API Key
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Powers natural-language command parsing. Get a key from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 underline"
                >
                  Google AI Studio
                </a>
                . Stored securely in your local database — without it, commands fall back to a
                simpler built-in parser.
              </p>

              <div
                className={`text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${
                  keyIsSet ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {keyIsSet ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> A key is currently saved.
                  </>
                ) : (
                  'No key saved yet.'
                )}
              </div>

              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={keyIsSet ? 'Enter a new key to replace…' : 'AIzaSy…'}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <button
                onClick={saveKey}
                disabled={saving || keyInput.trim().length === 0}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-medium rounded-lg py-2 text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save Key'}
              </button>
              {savedFlash && (
                <p className="text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Saved.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
