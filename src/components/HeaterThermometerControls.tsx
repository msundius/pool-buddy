import React, { useState } from 'react';
import { HeaterStatus, ThermometerStatus } from '../types';
import { Flame, Thermometer, Battery, Wifi, RefreshCw, Sun, Zap, Info, ShieldAlert, CheckCircle } from 'lucide-react';

interface HeaterThermometerControlsProps {
  heater: HeaterStatus;
  thermometer: ThermometerStatus;
  onUpdateHeater: (updates: Partial<HeaterStatus>) => void;
  onUpdateThermometer: (updates: Partial<ThermometerStatus>) => void;
}

export function HeaterThermometerControls({
  heater,
  thermometer,
  onUpdateHeater,
  onUpdateThermometer,
}: HeaterThermometerControlsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncSensor = () => {
    setIsSyncing(true);
    setSyncStatus('Reading BLE payload...');
    setTimeout(() => {
      // Simulate reading a telemetry packet from the smart pool buoy
      const randomOffset = parseFloat((Math.random() * 0.6 - 0.3).toFixed(1));
      const nextTemp = parseFloat((thermometer.currentWaterTemp + randomOffset).toFixed(1));
      
      let newTrend: 'rising' | 'falling' | 'stable' = 'stable';
      if (randomOffset > 0.05) newTrend = 'rising';
      else if (randomOffset < -0.05) newTrend = 'falling';

      const nextAirOffset = Math.floor(Math.random() * 3 - 1);
      const nextAirTemp = thermometer.currentAirTemp + nextAirOffset;

      const nextBattery = Math.max(1, thermometer.batteryPercentage - 1);

      onUpdateThermometer({
        currentWaterTemp: nextTemp,
        currentAirTemp: nextAirTemp,
        trend: newTrend,
        batteryPercentage: nextBattery,
        lastSynced: new Date().toISOString(),
      });

      setIsSyncing(false);
      setSyncStatus('Buoy sensor telemetry synced.');
      setTimeout(() => setSyncStatus(null), 3000);
    }, 1200);
  };

  const isHeatingActive = heater.isCurrentlyOn && thermometer.currentWaterTemp < heater.targetTemperature;
  const isTargetAchieved = heater.isCurrentlyOn && thermometer.currentWaterTemp >= heater.targetTemperature;

  return (
    <div id="heater-thermometer-container" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* HEATER CONTROL CONTAINER */}
      <div id="heater-module-box" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl transition-all ${heater.isCurrentlyOn ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
                <Flame className={`h-5 w-5 ${isHeatingActive ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Smart Spa & Pool Heater</h3>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Alexa Smart Home Accessory</span>
              </div>
            </div>

            {/* Power Toggle Switch */}
            <button
              id="btn-toggle-heater"
              onClick={() => onUpdateHeater({ isCurrentlyOn: !heater.isCurrentlyOn, lastChanged: new Date().toISOString() })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                heater.isCurrentlyOn ? 'bg-sky-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  heater.isCurrentlyOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Quick status banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Operational State</span>
              {isHeatingActive ? (
                <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                  Active (Heating)
                </span>
              ) : isTargetAchieved ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Target Temperature Met
                </span>
              ) : heater.isCurrentlyOn ? (
                <span className="text-xs font-bold text-amber-500">Idle / Monitoring</span>
              ) : (
                <span className="text-xs font-bold text-slate-400">Heater Disarmed</span>
              )}
            </div>

            {/* Real-time description */}
            <p className="text-[11px] text-slate-500 mt-1 pb-1.5 border-b border-slate-200/50">
              {heater.isCurrentlyOn 
                ? `System is continuously cycling water to maintain target temp of ${heater.targetTemperature}°F.`
                : 'Heater is physically switched off. Smart freeze-protection remains active in the background.'
              }
            </p>

            {/* Target Temperature Slider control */}
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-semibold text-slate-500">Thermostat Target</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{heater.targetTemperature}°F</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  id="btn-temp-down"
                  type="button"
                  onClick={() => {
                    const next = Math.max(65, heater.targetTemperature - 1);
                    onUpdateHeater({ targetTemperature: next });
                  }}
                  className="bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold px-2 py-0.5 text-xs select-none active:scale-95 transition-transform"
                >
                  -
                </button>
                <input
                  id="input-heater-temp"
                  type="range"
                  min="65"
                  max="104"
                  value={heater.targetTemperature}
                  onChange={(e) => onUpdateHeater({ targetTemperature: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <button
                  id="btn-temp-up"
                  type="button"
                  onClick={() => {
                    const next = Math.min(104, heater.targetTemperature + 1);
                    onUpdateHeater({ targetTemperature: next });
                  }}
                  className="bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold px-2 py-0.5 text-xs select-none active:scale-95 transition-transform"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Heating Modes */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Heating Efficiency Mode</span>
            <div className="grid grid-cols-3 gap-2">
              {(['eco', 'rapid', 'solar'] as const).map((m) => (
                <button
                  id={`btn-heater-mode-${m}`}
                  key={m}
                  type="button"
                  onClick={() => onUpdateHeater({ mode: m })}
                  className={`text-xs py-1.5 rounded-lg border font-semibold transition-all cursor-pointer capitalize ${
                    heater.mode === m
                      ? m === 'eco'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                        : m === 'rapid'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs'
                        : 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-500">
            <Sun className="h-3.5 w-3.5 text-rose-400" />
            Energy Class: <b className="text-emerald-600 font-semibold">Standard Green</b>
          </span>
          <span>Target: {heater.targetTemperature}°F • {heater.mode.toUpperCase()}</span>
        </div>
      </div>


      {/* THERMOMETRE CONTROL CONTAINER */}
      <div id="thermometer-module-box" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-sky-50 text-sky-600 p-2 rounded-xl">
                <Thermometer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Smart Float Thermometer</h3>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">IoT Buoy Telemetry</span>
              </div>
            </div>

            {/* Smart buoy stats */}
            <div className="flex items-center gap-3">
              {/* Battery level status */}
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                <Battery className={`h-3.5 w-3.5 ${
                  thermometer.batteryPercentage < 20 ? 'text-rose-500' : 'text-emerald-500'
                }`} />
                <span>{thermometer.batteryPercentage}%</span>
              </div>
              <Wifi className="h-4 w-4 text-emerald-500" />
            </div>
          </div>

          {/* Quick status display */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Water temperature digital readout */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center relative overflow-hidden flex flex-col justify-center items-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">WATER TEMP</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tighter">
                  {thermometer.currentWaterTemp.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-slate-500">°F</span>
              </div>
              {/* trend marker */}
              <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                thermometer.trend === 'rising' 
                  ? 'bg-rose-50 text-rose-600'
                  : thermometer.trend === 'falling'
                  ? 'bg-sky-50 text-sky-605'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {thermometer.trend === 'rising' ? '▲ Heating' : thermometer.trend === 'falling' ? '▼ Cooling' : 'Stable'}
              </span>
            </div>

            {/* Air Temperature digital readout */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">AIR REFERENCE</span>
              <div className="flex items-baseline gap-0.5 mt-1">
                <span className="text-2xl font-bold text-slate-800 font-mono tracking-tighter">
                  {thermometer.currentAirTemp}
                </span>
                <span className="text-xs font-bold text-slate-500">°F</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-2 block font-medium">Ambient Sensor</span>
            </div>
          </div>

          {/* Sensor calibration help */}
          <div className="bg-sky-50/30 border border-sky-100 rounded-xl p-3 mb-3">
            <div className="flex gap-2 text-[11px] leading-relaxed text-slate-600">
              <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <b>Solar Radiation Factor:</b> Calibrated automatically against UV ambient sky exposure to avoid skin-burn warnings. Last calibrated: <span className="font-mono font-medium">{new Date(thermometer.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>.
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            id="btn-sync-buoy-sensor"
            onClick={handleSyncSensor}
            disabled={isSyncing}
            className="w-full bg-slate-800 text-white hover:bg-slate-900 font-semibold rounded-lg py-2 text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Requesting Buoy Bluetooth Stream...' : 'Force Sync Thermometer Telemetry'}
          </button>
          
          {syncStatus && (
            <p className="text-[10px] text-center text-sky-600 font-semibold mt-1.5 animate-pulse">
              {syncStatus}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
