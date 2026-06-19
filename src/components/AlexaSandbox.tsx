import React, { useState } from 'react';
import { AlexaLog, ChemicalReading, PumpStatus, ChlorinatorStatus, PoolVolumeConfig, HeaterStatus, ThermometerStatus } from '../types';
import { Smartphone, Mic, Send, Speech, Terminal, Volume2, Sparkles, CheckCircle, Wifi, Activity } from 'lucide-react';

interface AlexaSandboxProps {
  volumeConfig: PoolVolumeConfig;
  currentReading: ChemicalReading;
  pump: PumpStatus;
  chlorinator: ChlorinatorStatus;
  heater: HeaterStatus;
  thermometer: ThermometerStatus;
  logs: AlexaLog[];
  onAlexaCommandSuccess: (log: AlexaLog, triggerMutate: { device: string; property: string; value: any }) => void;
}

const PRESET_COMMANDS = [
  "Alexa, ask Pool Manager to turn on the pump.",
  "Alexa, ask Pool Manager to set the pool heater to 85 degrees.",
  "Alexa, ask Pool Manager for the pool temperature.",
  "Alexa, turn off the chemical chlorinator.",
  "Alexa, turn off the pool heater.",
];

export function AlexaSandbox({
  volumeConfig,
  currentReading,
  pump,
  chlorinator,
  heater,
  thermometer,
  logs,
  onAlexaCommandSuccess,
}: AlexaSandboxProps) {
  const [customCommand, setCustomCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [alexaVoiceOutput, setAlexaVoiceOutput] = useState<string>('Alexa is linked. Try saying "Alexa, turn on the pool heater" to begin.');
  const [showLogs, setShowLogs] = useState(false);

  // Send voice query to fullstack backend proxy /api/alexa-command
  const handleSendCommand = async (cmdText: string) => {
    if (!cmdText.trim() || isProcessing) return;
    setIsProcessing(true);
    setAlexaVoiceOutput('Linking smart home controller...');

    try {
      const response = await fetch('/api/alexa-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: cmdText,
          currentStatus: {
            ph: currentReading.ph,
            chlorine: currentReading.chlorine,
            alkalinity: currentReading.alkalinity,
            cya: currentReading.cya,
            calcium: currentReading.calcium,
            temperature: currentReading.temperature,
            volumeGallons: volumeConfig.volumeGallons,
            pumpIsOn: pump.isCurrentlyOn,
            pumpHours: pump.dailyTargetHours,
            chlorinatorIsOn: chlorinator.isCurrentlyOn,
            chlorinatorPercentage: chlorinator.outputPercentage,
            heaterIsOn: heater.isCurrentlyOn,
            heaterTargetTemp: heater.targetTemperature,
            heaterMode: heater.mode,
            waterTemp: thermometer.currentWaterTemp,
            airTemp: thermometer.currentAirTemp,
            thermometerTrend: thermometer.trend,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Alexa connection timeout');
      }

      const data = await response.json();
      
      const newLog: AlexaLog = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        command: cmdText,
        alexaResponse: data.reply,
        deviceStateChanged: data.changeState ? `${data.targetDevice} ${data.targetProperty} updated to ${data.targetValue}` : 'None',
        success: true,
      };

      setAlexaVoiceOutput(data.reply);

      // Trigger mutation of parent state
      if (data.changeState) {
        onAlexaCommandSuccess(newLog, {
          device: data.targetDevice,
          property: data.targetProperty,
          value: data.targetValue,
        });
      } else {
        // Just log the voice query
        onAlexaCommandSuccess(newLog, { device: 'none', property: 'none', value: null });
      }

    } catch (err: any) {
      console.error(err);
      setAlexaVoiceOutput("Sorry, I had trouble reaching the Pool Manager skill. Make sure the backend is fully active.");
    } finally {
      setIsProcessing(false);
      setCustomCommand('');
    }
  };

  return (
    <div id="alexa-sandbox-card" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="bg-sky-50 text-sky-600 p-2 rounded-xl">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Alexa Voice Integrator</h3>
              <p className="text-xs text-slate-400">Alexa Smart Home Skill simulation sandbox</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 text-sky-600 px-3 py-1 rounded-full text-xs font-semibold">
            <Wifi className="h-3 w-3 animate-ping" />
            <span>Simulated Online</span>
          </div>
        </div>

        {/* Outer Alexa Speaker Visual */}
        <div className="relative overflow-hidden bg-slate-900 rounded-xl p-5 border border-slate-800 flex flex-col items-center gap-4 text-center select-none shadow-inner">
          {/* Neon Ring */}
          <div className={`relative h-20 w-20 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${
            isProcessing 
              ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-105' 
              : 'border-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.3)]'
          }`}>
            <Volume2 className={`h-8 w-8 text-sky-400 transition-colors ${isProcessing ? 'text-sky-300' : ''}`} />
            
            {/* soundwave bars */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center gap-1">
                <span className="w-1 h-8 bg-sky-450 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                <span className="w-1 h-12 bg-sky-450 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                <span className="w-1 h-6 bg-sky-450 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-sky-400 font-bold block">Smart Speaker Response</span>
            <p id="alexa-spoken-response" className="text-sm font-medium text-slate-150 italic px-2">
              &ldquo;{alexaVoiceOutput}&rdquo;
            </p>
          </div>
        </div>

        {/* Preset Triggers */}
        <div className="mt-4 space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Or select a live voice action:</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COMMANDS.map((cmd) => (
              <button
                id={`preset-cmd-${cmd.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                key={cmd}
                onClick={() => handleSendCommand(cmd)}
                disabled={isProcessing}
                className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium transition-all text-left truncate max-w-full disabled:opacity-50 cursor-pointer"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* User Manual Speech Field */}
        <div className="mt-4 flex gap-2">
          <input
            id="input-alexa-manual-cmd"
            type="text"
            placeholder="Say: 'Alexa, set chlorinator schedule...'"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendCommand(customCommand)}
            disabled={isProcessing}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white text-slate-800"
          />
          <button
            id="btn-send-custom-command"
            onClick={() => handleSendCommand(customCommand)}
            disabled={isProcessing || !customCommand.trim()}
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-3.5 py-2 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Execution Logs Drawer Toggle */}
      <div className="mt-4 border-t border-slate-200 pt-3">
        <button
          id="btn-toggle-alexa-logs"
          onClick={() => setShowLogs(!showLogs)}
          className="text-xs font-semibold text-slate-550 hover:text-slate-850 flex items-center gap-1 cursor-pointer"
        >
          <Terminal className="h-4 w-4 text-sky-500" />
          {showLogs ? 'Hide Voice Interface Logging' : 'View API Skill Logs'} ({logs.length})
        </button>

        {showLogs && (
          <div id="alexa-skill-logs-drawer" className="mt-2 bg-slate-900 rounded-lg p-2.5 max-h-[140px] overflow-y-auto border border-slate-800 text-[10px] font-mono text-slate-400 space-y-2">
            {logs.length === 0 ? (
              <p className="text-center italic py-2">No command logs yet. Trigger a voice command above.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-b border-slate-800 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex justify-between text-sky-400 font-bold">
                    <span>[UTTERANCE]: &ldquo;{log.command}&rdquo;</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</span>
                  </div>
                  <div className="text-emerald-400">[REPLY]: {log.alexaResponse}</div>
                  <div className="text-cyan-400">[STATE CHANGE]: {log.deviceStateChanged}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
