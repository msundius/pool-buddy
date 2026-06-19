import React, { useState } from 'react';
import { ChemicalReading, PoolVolumeConfig } from '../types';
import { evaluateChemistry } from '../utils/poolMath';
import { Beaker, Plus, History, HelpCircle, Check, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

interface ChemistryTrackerProps {
  volumeConfig: PoolVolumeConfig;
  readingsHistory: ChemicalReading[];
  onAddReading: (reading: Omit<ChemicalReading, 'id' | 'timestamp'>) => void;
}

export function ChemistryTracker({ volumeConfig, readingsHistory, onAddReading }: ChemistryTrackerProps) {
  const current: ChemicalReading = readingsHistory[0] || {
    ph: 7.4,
    chlorine: 2.5,
    alkalinity: 95,
    cya: 45,
    calcium: 180,
    temperature: 78,
    timestamp: new Date().toISOString(),
  };

  // Form states
  const [ph, setPh] = useState<string>(current.ph.toString());
  const [chlorine, setChlorine] = useState<string>(current.chlorine.toString());
  const [alkalinity, setAlkalinity] = useState<string>(current.alkalinity.toString());
  const [cya, setCya] = useState<string>(current.cya.toString());
  const [calcium, setCalcium] = useState<string>(current.calcium.toString());
  const [temp, setTemp] = useState<string>(current.temperature.toString());
  const [notes, setNotes] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'status' | 'add' | 'history'>('status');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddReading({
      ph: parseFloat(ph) || 7.4,
      chlorine: parseFloat(chlorine) || 0,
      alkalinity: parseInt(alkalinity) || 0,
      cya: parseInt(cya) || 0,
      calcium: parseInt(calcium) || 0,
      temperature: parseInt(temp) || 78,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    setActiveTab('status');
  };

  const chemistryChecks = evaluateChemistry(
    {
      ph: current.ph,
      chlorine: current.chlorine,
      alkalinity: current.alkalinity,
      cya: current.cya,
      calcium: current.calcium,
    },
    volumeConfig.volumeGallons
  );

  const getStatusColor = (status: 'ideal' | 'low' | 'high') => {
    switch (status) {
      case 'ideal':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'low':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const getIndicatorDot = (status: 'ideal' | 'low' | 'high') => {
    switch (status) {
      case 'ideal':
        return 'bg-emerald-500';
      case 'low':
        return 'bg-amber-500';
      case 'high':
        return 'bg-rose-500';
    }
  };

  return (
    <div id="chemistry-tracker-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full">
      {/* Card Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <div className="bg-sky-50 text-sky-600 p-2 rounded-xl">
            <Beaker className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Water Chemistry Specialist</h3>
            <p className="text-xs text-slate-400">Track and calculate corrective chemical dosages</p>
          </div>
        </div>

        <div className="flex rounded-lg bg-slate-50 p-1 select-none border border-slate-200/50">
          <button
            id="tab-chem-status"
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'status' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/35' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Diagnostics
          </button>
          <button
            id="tab-chem-add"
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'add' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/35' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            New Test
          </button>
          <button
            id="tab-chem-history"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-800 shadow-xs border border-slate-200/35' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1">
        {/* TAB 1: Diagnostics and Chemical Dose Calculator */}
        {activeTab === 'status' && (
          <div id="chem-tab-content-status" className="space-y-4">
            {/* Quick Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {chemistryChecks.map((check) => (
                <div
                  key={check.parameter}
                  className={`border rounded-xl p-2.5 flex flex-col justify-between transition-colors ${getStatusColor(
                    check.status
                  )}`}
                >
                  <span className="text-[11px] font-medium opacity-80 block truncate">{check.name}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-base font-bold font-mono">
                      {check.parameter === 'ph' ? check.currentValue.toFixed(1) : check.currentValue}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {check.parameter === 'ph' ? 'pH' : 'ppm'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${getIndicatorDot(check.status)}`}></span>
                    <span className="text-[9px] font-bold capitalize tracking-wide">{check.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Diagnostics Recommendations Box */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Dosage adjustments recommended:
              </h4>

              <div className="space-y-2">
                {chemistryChecks.every((c) => c.status === 'ideal') ? (
                  <div id="chemistry-healthy-hero" className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 text-center">
                    <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-850">Your Pool Water is Perfectly Balanced!</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Keep the pump running under schedule and test again in 2-3 days.
                    </p>
                  </div>
                ) : (
                  chemistryChecks
                    .filter((c) => c.status !== 'ideal')
                    .map((item) => (
                      <div
                        id={`advice-row-${item.parameter}`}
                        key={item.parameter}
                        className="border border-slate-200 bg-slate-50/55 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm"
                      >
                        <div className="space-y-1 md:max-w-md">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${getIndicatorDot(item.status)}`}></span>
                            <span className="font-semibold text-slate-850">{item.name} is {item.status}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (Target: {item.lowTarget}-{item.highTarget})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{item.recommendation}</p>
                        </div>

                        {item.chemicalAdjustment ? (
                          <div id={`dosage-calc-${item.parameter}`} className="bg-sky-50/60 border border-sky-100 rounded-xl p-2.5 flex items-center gap-3 self-start md:self-auto min-w-[200px]">
                            <div className="bg-sky-500 text-white p-1.5 rounded-lg flex-shrink-0">
                              <Beaker className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                              <p className="text-[10px] text-slate-400 font-medium">Add to water pool:</p>
                              <p className="font-bold text-sky-600 font-mono text-sm">
                                {item.chemicalAdjustment.amount}
                              </p>
                              <p className="text-[10px] font-medium text-slate-600 truncate max-w-[170px]" title={item.chemicalAdjustment.chemicalName}>
                                {item.chemicalAdjustment.chemicalName}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs bg-slate-100 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg font-medium self-start md:self-auto">
                            No immediate dosing
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Last Reading Summary Footer */}
            {readingsHistory.length > 0 && (
              <div className="text-[11px] text-slate-400 bg-slate-50/30 border border-dashed border-slate-200 rounded-lg p-2.5 flex justify-between">
                <span>Water Temp: <b className="text-slate-600 font-mono">{current.temperature}°F</b></span>
                <span>Active Water Balance Refreshed: <b className="text-slate-600">Dynamic Live</b></span>
                <span>Last tested: <b className="text-slate-600">{new Date(current.timestamp).toLocaleDateString()} at {new Date(current.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b></span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Enter New Measurement Readings */}
        {activeTab === 'add' && (
          <form id="form-add-chemistry-test" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="input-chem-ph" className="text-xs font-semibold text-slate-500 mb-1 block">pH level (7.2 - 7.8)</label>
                <input
                  id="input-chem-ph"
                  type="number"
                  step="0.1"
                  min="6.0"
                  max="8.8"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-mono bg-white"
                  placeholder="7.4"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-chem-cl" className="text-xs font-semibold text-slate-500 mb-1 block">Free Chlorine (FC ppm)</label>
                <input
                  id="input-chem-cl"
                  type="number"
                  step="0.1"
                  min="0"
                  max="15"
                  value={chlorine}
                  onChange={(e) => setChlorine(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-mono bg-white"
                  placeholder="3.0"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-chem-ta" className="text-xs font-semibold text-slate-500 mb-1 block">Alkalinity (TA ppm)</label>
                <input
                  id="input-chem-ta"
                  type="number"
                  min="0"
                  max="400"
                  step="5"
                  value={alkalinity}
                  onChange={(e) => setAlkalinity(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-mono bg-white"
                  placeholder="100"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-chem-cya" className="text-xs font-semibold text-slate-500 mb-1 block">Stabilizer (CYA ppm)</label>
                <input
                  id="input-chem-cya"
                  type="number"
                  min="0"
                  max="200"
                  step="5"
                  value={cya}
                  onChange={(e) => setCya(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-mono bg-white"
                  placeholder="40"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-chem-ch" className="text-xs font-semibold text-slate-500 mb-1 block">Calcium Hardness (CH)</label>
                <input
                  id="input-chem-ch"
                  type="number"
                  min="0"
                  max="800"
                  step="10"
                  value={calcium}
                  onChange={(e) => setCalcium(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-mono bg-white"
                  placeholder="200"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-chem-temp" className="text-xs font-semibold text-slate-500 mb-1 block">Water Temp (°F)</label>
                <input
                  id="input-chem-temp"
                  type="number"
                  min="40"
                  max="105"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-mono bg-white"
                  placeholder="78"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-chem-notes" className="text-xs font-semibold text-slate-500 mb-1 block">Dosing / Maintenance notes (optional)</label>
              <input
                id="input-chem-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Planted liquid shock last night, water looks slightly cloudy..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
              />
            </div>

            <button
              id="btn-save-chem-reading"
              type="submit"
              className="w-full bg-sky-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-sky-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Commit Water Analysis Log
            </button>
          </form>
        )}

        {/* TAB 3: History Timeline Logs */}
        {activeTab === 'history' && (
          <div id="chem-tab-content-history" className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {readingsHistory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No historical recordings. Log your first pool analysis!</p>
            ) : (
              <div className="relative border-l border-slate-200 ml-2.5 pl-4 space-y-4 py-1">
                {readingsHistory.map((h, idx) => (
                  <div id={`history-item-${idx}`} key={idx} className="relative">
                    {/* circle marker */}
                    <span className="absolute -left-[20.5px] top-1 h-3.5 w-3.5 rounded-full bg-white border-2 border-sky-500 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                    </span>

                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {new Date(h.timestamp).toLocaleDateString()} @ {new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                          {h.temperature}°F
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2 text-center text-xs">
                        <div className="bg-white rounded-lg p-1 border border-slate-200">
                          <span className="text-[9px] text-slate-450 block font-medium">pH</span>
                          <span className="font-bold font-mono text-slate-700">{h.ph.toFixed(1)}</span>
                        </div>
                        <div className="bg-white rounded-lg p-1 border border-slate-200">
                          <span className="text-[9px] text-slate-450 block font-medium font-sans">CL</span>
                          <span className="font-bold font-mono text-slate-700">{h.chlorine.toFixed(1)}</span>
                        </div>
                        <div className="bg-white rounded-lg p-1 border border-slate-200">
                          <span className="text-[9px] text-slate-450 block font-medium">TA</span>
                          <span className="font-bold font-mono text-slate-700">{h.alkalinity}</span>
                        </div>
                        <div className="bg-white rounded-lg p-1 border border-slate-200">
                          <span className="text-[9px] text-slate-450 block font-medium font-sans">CYA</span>
                          <span className="font-bold font-mono text-slate-700">{h.cya}</span>
                        </div>
                        <div className="bg-white rounded-lg p-1 border border-slate-200">
                          <span className="text-[9px] text-slate-450 block font-medium">CH</span>
                          <span className="font-bold font-mono text-slate-700">{h.calcium}</span>
                        </div>
                      </div>

                      {h.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-2 border-t border-slate-200 pt-1.5 truncate">
                          &ldquo;{h.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
