import React, { useState } from 'react';
import { PumpStatus, ChlorinatorStatus } from '../types';
import { ToggleLeft, ToggleRight, Clock, Percent, Zap, RefreshCw, Smartphone } from 'lucide-react';

interface PumpChlorinatorControlsProps {
  pump: PumpStatus;
  chlorinator: ChlorinatorStatus;
  onUpdatePump: (updates: Partial<PumpStatus>) => void;
  onUpdateChlorinator: (updates: Partial<ChlorinatorStatus>) => void;
}

export function PumpChlorinatorControls({
  pump,
  chlorinator,
  onUpdatePump,
  onUpdateChlorinator,
}: PumpChlorinatorControlsProps) {
  const [targetHours, setTargetHours] = useState<string>(pump.dailyTargetHours.toString());
  const [pStart, setPStart] = useState<string>(pump.scheduleStart);
  const [pEnd, setPEnd] = useState<string>(pump.scheduleEnd);

  const [cPercent, setCPercent] = useState<number>(chlorinator.outputPercentage);
  const [cStart, setCStart] = useState<string>(chlorinator.scheduleStart);
  const [cEnd, setCEnd] = useState<string>(chlorinator.scheduleEnd);

  const savePumpSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePump({
      dailyTargetHours: parseInt(targetHours) || 8,
      scheduleStart: pStart,
      scheduleEnd: pEnd,
      lastChanged: new Date().toISOString(),
    });
  };

  const saveChlorinatorSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateChlorinator({
      outputPercentage: cPercent,
      scheduleStart: cStart,
      scheduleEnd: cEnd,
      lastChanged: new Date().toISOString(),
    });
  };

  // Helper to compute runtime coverage
  const calculateHoursDifference = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
    if (diffMins < 0) diffMins += 24 * 60; // wraps around midnight
    return (diffMins / 60).toFixed(1);
  };

  const pumpScheduledDiff = calculateHoursDifference(pump.scheduleStart, pump.scheduleEnd);
  const chlorinatorScheduledDiff = calculateHoursDifference(chlorinator.scheduleStart, chlorinator.scheduleEnd);

  return (
    <div id="pump-chlorinator-container" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* PUMP MODULE */}
      <div id="pump-module-box" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl transition-colors ${pump.isCurrentlyOn ? 'bg-sky-50 text-sky-600 animate-pulse' : 'bg-slate-150 text-slate-400'}`}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-base">Filter Pump Station</h3>
                <p className="text-xs text-slate-400">Manage daily water turnover schedules</p>
              </div>
            </div>

            <button
              id="btn-toggle-pump"
              onClick={() => onUpdatePump({ isCurrentlyOn: !pump.isCurrentlyOn, lastChanged: new Date().toISOString() })}
              className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
            >
              {pump.isCurrentlyOn ? (
                <ToggleRight className="h-10 w-10 text-sky-500" />
              ) : (
                <ToggleLeft className="h-10 w-10 text-slate-300" />
              )}
            </button>
          </div>

          {/* Quick status banner */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Manual Mode</span>
              <span className={`text-xs font-bold ${pump.isCurrentlyOn ? 'text-sky-600' : 'text-slate-500'}`}>
                {pump.isCurrentlyOn ? 'PUMP ACTIVE' : 'PUMP IDLE'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Daily Coverage</span>
              <span className="text-xs font-bold text-slate-700">
                {pumpScheduledDiff} hrs scheduled
              </span>
            </div>
          </div>

          {/* Scheduler Form */}
          <form onSubmit={savePumpSchedule} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="input-pump-target" className="text-[11px] font-bold text-slate-500 block mb-1">Target (hrs)</label>
                <input
                  id="input-pump-target"
                  type="number"
                  min="1"
                  max="24"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>
              <div>
                <label htmlFor="input-pump-start" className="text-[11px] font-bold text-slate-500 block mb-1">ON Time</label>
                <input
                  id="input-pump-start"
                  type="time"
                  value={pStart}
                  onChange={(e) => setPStart(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>
              <div>
                <label htmlFor="input-pump-end" className="text-[11px] font-bold text-slate-500 block mb-1">OFF Time</label>
                <input
                  id="input-pump-end"
                  type="time"
                  value={pEnd}
                  onChange={(e) => setPEnd(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>
            </div>

            <button
              id="btn-save-pump-settings"
              type="submit"
              className="w-full bg-slate-800 text-white rounded-lg py-2 text-xs font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <Clock className="h-3.5 w-3.5" />
              Save Pump Work Schedule
            </button>
          </form>
        </div>

        {/* Schedule Visualization */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-500">
            <Smartphone className="h-3.5 w-3.5 text-sky-500" />
            Alexa Linked Control: <b className="text-sky-600 font-semibold">Enabled</b>
          </span>
          <span>Last modified: {pump.lastChanged ? new Date(pump.lastChanged).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'never'}</span>
        </div>
      </div>

      {/* CHLORINATOR MODULE */}
      <div id="chlorinator-module-box" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl transition-colors ${chlorinator.isCurrentlyOn ? 'bg-sky-50 text-sky-600 animate-pulse' : 'bg-slate-150 text-slate-400'}`}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-base">SWG Chlorinator Cell</h3>
                <p className="text-xs text-slate-400">Saltwater Chlorine generator settings</p>
              </div>
            </div>

            <button
              id="btn-toggle-chlorinator"
              onClick={() => onUpdateChlorinator({ isCurrentlyOn: !chlorinator.isCurrentlyOn, lastChanged: new Date().toISOString() })}
              className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
            >
              {chlorinator.isCurrentlyOn ? (
                <ToggleRight className="h-10 w-10 text-sky-500" />
              ) : (
                <ToggleLeft className="h-10 w-10 text-slate-300" />
              )}
            </button>
          </div>

          {/* Quick status/percentage control */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" /> Cell Output Duty
              </span>
              <span className="font-mono font-bold text-sky-600 text-sm">{cPercent}% Target</span>
            </div>
            <input
              id="input-chlorinator-percent"
              type="range"
              min="0"
              max="100"
              step="5"
              value={cPercent}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setCPercent(val);
                // Also update live parent state if change occurs
                onUpdateChlorinator({ outputPercentage: val });
              }}
              className="w-full h-1.5 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Scheduler Form */}
          <form onSubmit={saveChlorinatorSchedule} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="input-cl-start" className="text-[11px] font-bold text-slate-500 block mb-1">Cycled ON</label>
                <input
                  id="input-cl-start"
                  type="time"
                  value={cStart}
                  onChange={(e) => setCStart(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>
              <div>
                <label htmlFor="input-cl-end" className="text-[11px] font-bold text-slate-500 block mb-1">Cycled OFF</label>
                <input
                  id="input-cl-end"
                  type="time"
                  value={cEnd}
                  onChange={(e) => setCEnd(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 bg-white"
                />
              </div>
            </div>

            <button
              id="btn-save-chlorinator-settings"
              type="submit"
              className="w-full bg-slate-800 text-white rounded-lg py-2 text-xs font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <Clock className="h-3.5 w-3.5" />
              Save Electrolysis Schedule
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-500">
            <Smartphone className="h-3.5 w-3.5 text-sky-500" />
            Alexa Linked Control: <b className="text-sky-600 font-semibold">Enabled</b>
          </span>
          <span>Duty Duration: {chlorinatorScheduledDiff} hrs</span>
        </div>
      </div>

    </div>
  );
}
