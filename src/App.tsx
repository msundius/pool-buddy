import React, { useState, useEffect } from 'react';
import { apiClient } from './api';

import {
  PoolVolumeConfig,
  ChemicalReading,
  PumpStatus,
  ChlorinatorStatus,
  MaintenanceTask,
  InAppNotification,
  AlexaLog,
  HeaterStatus,
  ThermometerStatus,
  AlexaConnection,
} from './types';

// Import newly created sub-components
import { VolumeCalculator } from './components/VolumeCalculator';
import { ChemistryTracker } from './components/ChemistryTracker';
import { PumpChlorinatorControls } from './components/PumpChlorinatorControls';
import { MaintenancePlanner } from './components/MaintenancePlanner';
import { AlexaSandbox } from './components/AlexaSandbox';
import { NotificationCenter } from './components/NotificationCenter';
import { HeaterThermometerControls } from './components/HeaterThermometerControls';
import { AlexaConnectionManager } from './components/AlexaConnectionManager';
import { SettingsPanel } from './components/SettingsPanel';

import { Waves } from 'lucide-react';

// Default initial mock parameters for smooth start
const DEFAULT_VOLUME: PoolVolumeConfig = {
  shape: 'round',
  diameter: 18,
  avgDepth: 4,
  volumeGallons: 5978, // pi * 9^2 * 4 * 7.48 = 5978 gal (or 18*18*4*5.9 = 7646 gal. Using round formula 18*18*4*5.875 = 7614 approx)
};

const DEFAULT_CHEMISTRY_HISTORY: ChemicalReading[] = [
  {
    ph: 7.9, // high!
    chlorine: 0.5, // low!
    alkalinity: 70, // low!
    cya: 20, // low!
    calcium: 110, // low!
    temperature: 81,
    timestamp: new Date().toISOString(),
    notes: 'Starting baseline measurement. Pool balance needs priority adjustments.',
  },
];

const DEFAULT_PUMP: PumpStatus = {
  isCurrentlyOn: false,
  dailyTargetHours: 8,
  scheduleStart: '08:00',
  scheduleEnd: '16:00',
  autoScheduled: true,
  lastChanged: new Date().toISOString(),
};

const DEFAULT_CHLORINATOR: ChlorinatorStatus = {
  isCurrentlyOn: false,
  outputPercentage: 45,
  scheduleStart: '09:00',
  scheduleEnd: '15:00',
  autoScheduled: true,
  lastChanged: new Date().toISOString(),
};

const DEFAULT_TAKS: MaintenanceTask[] = [
  {
    id: 'skim',
    name: 'Skim Water Leaves/Bugs',
    description: 'Use telescoping pole net to scoop floaters from pool surface.',
    intervalDays: 1,
    lastDone: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), // 36 hours ago
    upcomingDue: new Date(Date.now()).toISOString(),
    category: 'cleaning',
  },
  {
    id: 'vacuum',
    name: 'Vacuum Pool Floor',
    description: 'Connect vacuum hose to skimmer suction port to capture grit.',
    intervalDays: 7,
    lastDone: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    upcomingDue: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    category: 'cleaning',
  },
  {
    id: 'backwash',
    name: 'Backwash Sand Filter',
    description: 'Reverse sand flow when gauge shows +8 PSI increase.',
    intervalDays: 10,
    lastDone: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(), // overdue!
    upcomingDue: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    category: 'filter',
  },
  {
    id: 'shock',
    name: 'Liquid Chlorine Shock',
    description: 'Shock pool with 12% solution after dusk to kill persistent algae.',
    intervalDays: 14,
    lastDone: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    upcomingDue: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    category: 'chemistry',
  },
];

const DEFAULT_HEATER: HeaterStatus = {
  isCurrentlyOn: false,
  targetTemperature: 84,
  mode: 'eco',
  lastChanged: new Date().toISOString(),
};

const DEFAULT_THERMOMETER: ThermometerStatus = {
  currentWaterTemp: 81.2,
  currentAirTemp: 76,
  trend: 'stable',
  batteryPercentage: 94,
  lastSynced: new Date().toISOString(),
};

const DEFAULT_ALEXA_CONNECTION: AlexaConnection = {
  isLinked: true,
  authCode: '581-209',
  smartHomeLinkedAt: new Date().toISOString(),
  serverRegion: 'us-east-1',
  allowExternalCommands: true,
};

export default function App() {
  const [dbStateLoaded, setDbStateLoaded] = useState(false);

  // States
  const [volumeConfig, setVolumeConfig] = useState<PoolVolumeConfig>(DEFAULT_VOLUME);
  const [chemistryHistory, setChemistryHistory] = useState<ChemicalReading[]>(DEFAULT_CHEMISTRY_HISTORY);
  const [pump, setPump] = useState<PumpStatus>(DEFAULT_PUMP);
  const [chlorinator, setChlorinator] = useState<ChlorinatorStatus>(DEFAULT_CHLORINATOR);
  const [heater, setHeater] = useState<HeaterStatus>(DEFAULT_HEATER);
  const [thermometer, setThermometer] = useState<ThermometerStatus>(DEFAULT_THERMOMETER);
  const [alexaConnection, setAlexaConnection] = useState<AlexaConnection>(DEFAULT_ALEXA_CONNECTION);
  const [tasks, setTasks] = useState<MaintenanceTask[]>(DEFAULT_TAKS);
  const [alexaLogs, setAlexaLogs] = useState<AlexaLog[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // 1. Load all state from the backend (which owns the Postgres connection).
  useEffect(() => {
    async function loadState() {
      try {
        const state = await apiClient.getState();
        if (state.config) setVolumeConfig(state.config);
        if (state.chemistry?.length) setChemistryHistory(state.chemistry);
        if (state.pump) setPump(state.pump);
        if (state.chlorinator) setChlorinator(state.chlorinator);
        if (state.heater) setHeater(state.heater);
        if (state.thermometer) setThermometer(state.thermometer);
        if (state.alexaConnection) setAlexaConnection(state.alexaConnection);
        if (state.tasks?.length) setTasks(state.tasks);
        if (state.alexaLogs) setAlexaLogs(state.alexaLogs);
        if (state.notifications) setNotifications(state.notifications);
      } catch (err) {
        console.warn('Could not reach Pool Buddy backend; showing default state.', err);
      } finally {
        setDbStateLoaded(true);
      }
    }

    loadState();
  }, []);

  // 2. Automated Diagnostic Notifications Generator
  // Evaluates pool chemistry thresholds and generates critical unread alerts
  useEffect(() => {
    if (chemistryHistory.length === 0) return;
    const latest = chemistryHistory[0];
    const generated: Omit<InAppNotification, 'id'>[] = [];

    // Check pH limits
    if (latest.ph < 7.2) {
      generated.push({
        timestamp: new Date().toISOString(),
        title: 'Water Acidic Warning (Low pH)',
        message: `Current pH level of ${latest.ph} is below threshold. Soda Ash adjustment needed to protect pool elements.`,
        type: 'danger',
        read: false,
        category: 'chemical',
      });
    } else if (latest.ph > 7.6) {
      generated.push({
        timestamp: new Date().toISOString(),
        title: 'High pH Level Warning (Alkaline)',
        message: `Current pH of ${latest.ph} reduces chlorine sanitizer effectiveness. Add muriatic acid.`,
        type: 'warning',
        read: false,
        category: 'chemical',
      });
    }

    // Check Chlorine limits
    if (latest.chlorine < 1.0) {
      generated.push({
        timestamp: new Date().toISOString(),
        title: 'Sanitizer Shortage (Low Chlorine)',
        message: `Chlorine level is dangerously low at ${latest.chlorine} ppm. Risk of green algae blooming immediately.`,
        type: 'danger',
        read: false,
        category: 'chemical',
      });
    }

    // Check Alkalinity limits
    if (latest.alkalinity < 80) {
      generated.push({
        timestamp: new Date().toISOString(),
        title: 'Low Total Alkalinity',
        message: `Total alkalinity is ${latest.alkalinity} ppm. Water has low buffering capacity; pH values will bounce.`,
        type: 'warning',
        read: false,
        category: 'chemical',
      });
    }

    // Persist any new alerts that aren't already present unread, using the
    // backend-assigned id so read-state updates target the correct row.
    if (generated.length > 0) {
      (async () => {
        for (const gen of generated) {
          const exists = notifications.some((ex) => ex.title === gen.title && !ex.read);
          if (exists) continue;
          try {
            const saved = await apiClient.addNotification(gen);
            setNotifications((prev) => [saved, ...prev]);
          } catch (e) {
            console.warn('Could not save notification.', e);
          }
        }
      })();
    }
  }, [chemistryHistory]);

  // MUTATIONS helpers — optimistic local update, then persist via the backend API.
  const handleUpdateVolume = async (newVol: PoolVolumeConfig) => {
    setVolumeConfig(newVol);
    try {
      await apiClient.updateConfig(newVol);
    } catch (e) {
      console.warn('Could not save pool config.', e);
    }
  };

  const handleAddReading = async (newReadingObj: Omit<ChemicalReading, 'id' | 'timestamp'>) => {
    try {
      const saved = await apiClient.addChemistry(newReadingObj);
      setChemistryHistory((prev) => [saved, ...prev]);
    } catch (e) {
      console.warn('Could not save chemistry reading.', e);
    }
  };

  const handleUpdatePump = async (updates: Partial<PumpStatus>) => {
    const nextPump = { ...pump, ...updates };
    setPump(nextPump);
    try {
      await apiClient.updateDevice('pump', nextPump);
    } catch (e) {
      console.warn('Could not save pump change.', e);
    }
  };

  const handleUpdateChlorinator = async (updates: Partial<ChlorinatorStatus>) => {
    const nextCl = { ...chlorinator, ...updates };
    setChlorinator(nextCl);
    try {
      await apiClient.updateDevice('chlorinator', nextCl);
    } catch (e) {
      console.warn('Could not save chlorinator update.', e);
    }
  };

  const handleUpdateHeater = async (updates: Partial<HeaterStatus>) => {
    const nextHeater = { ...heater, ...updates };
    setHeater(nextHeater);
    try {
      await apiClient.updateDevice('heater', nextHeater);
    } catch (e) {
      console.warn('Could not save heater update.', e);
    }
  };

  const handleUpdateThermometer = async (updates: Partial<ThermometerStatus>) => {
    const nextTherm = { ...thermometer, ...updates };
    setThermometer(nextTherm);
    try {
      await apiClient.updateDevice('thermometer', nextTherm);
    } catch (e) {
      console.warn('Could not save thermometer update.', e);
    }
  };

  const handleUpdateAlexaConnection = async (updates: Partial<AlexaConnection>) => {
    const nextConn = { ...alexaConnection, ...updates };
    setAlexaConnection(nextConn);
    try {
      await apiClient.updateDevice('alexa_connection', nextConn);
    } catch (e) {
      console.warn('Could not save Alexa connection update.', e);
    }
  };

  const handleAddTask = async (taskObj: Omit<MaintenanceTask, 'id' | 'lastDone' | 'upcomingDue'>) => {
    const id = taskObj.name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
    const newTask: MaintenanceTask = {
      id,
      ...taskObj,
      lastDone: null,
      upcomingDue: new Date(Date.now() + taskObj.intervalDays * 24 * 3600 * 1000).toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    try {
      await apiClient.addTask(newTask);
    } catch (e) {
      console.warn('Could not save new task.', e);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const updated = await apiClient.completeTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

      const saved = await apiClient.addNotification({
        title: `Duty Completed: ${updated.name}`,
        message: `Pool task is logged successfully. Next scheduled task check is in ${updated.intervalDays} days.`,
        type: 'success',
        read: false,
        category: 'maintenance',
      });
      setNotifications((prev) => [saved, ...prev]);
    } catch (e) {
      console.warn('Could not complete task.', e);
    }
  };

  const handleAlexaCommandSuccess = async (
    log: AlexaLog,
    triggerMutate: { device: string; property: string; value: any }
  ) => {
    try {
      const saved = await apiClient.addAlexaLog(log);
      setAlexaLogs((prev) => [saved, ...prev]);
    } catch (e) {
      console.warn('Could not save voice interaction.', e);
    }

    // Trigger state changes
    if (triggerMutate.device === 'pump') {
      handleUpdatePump({ [triggerMutate.property]: triggerMutate.value });
    } else if (triggerMutate.device === 'chlorinator') {
      handleUpdateChlorinator({ [triggerMutate.property]: triggerMutate.value });
    } else if (triggerMutate.device === 'heater') {
      handleUpdateHeater({ [triggerMutate.property]: triggerMutate.value });
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiClient.markNotificationRead(id);
    } catch (e) {
      console.warn('Could not mark notification read.', e);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    try {
      await apiClient.clearNotifications();
    } catch (e) {
      console.warn('Could not clear notifications.', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-850 antialiased">
      
      {/* 1. APP HEADER */}
      <header className="bg-white border-b border-slate-200 px-4 py-4.5 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-sky-400 to-sky-600 text-white p-2.5 rounded-2xl shadow-sm">
              <Waves className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight leading-tight">Above-Ground Pool Buddy</h1>
              <p className="text-xs text-slate-400 font-medium">Automatic Chemical Balance & Alexa IoT Device Scheduler</p>
            </div>
          </div>

          {/* Persistent alerts bell + settings */}
          <div className="flex items-center gap-3">
            <NotificationCenter
              notifications={notifications}
              onMarkRead={markNotificationRead}
              onClearAll={clearAllNotifications}
            />
            <SettingsPanel />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Device Sync Row / Fast Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <VolumeCalculator config={volumeConfig} onUpdateConfig={handleUpdateVolume} />
          </div>

          <div className="lg:col-span-2">
            <AlexaConnectionManager
              connection={alexaConnection}
              pump={pump}
              chlorinator={chlorinator}
              heater={heater}
              thermometer={thermometer}
              onUpdateConnection={handleUpdateAlexaConnection}
              onAlexaWebhookTrigger={(cmd) => {
                const searchBox = document.getElementById('input-alexa-manual-cmd') as HTMLInputElement;
                if (searchBox) {
                  searchBox.value = cmd;
                  searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const triggerBtn = document.getElementById('btn-send-custom-command') as HTMLButtonElement;
                if (triggerBtn) {
                  setTimeout(() => triggerBtn.click(), 100);
                }
              }}
            />
          </div>
        </div>

        {/* Tab content grids */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* CHEMISTRY MONITOR (Diagnostics / Calculations) - span 7 */}
          <div className="lg:col-span-7 flex flex-col">
            <ChemistryTracker
              volumeConfig={volumeConfig}
              readingsHistory={chemistryHistory}
              onAddReading={handleAddReading}
            />
          </div>

          {/* ALEXA SIMULATOR PLAYGROUND - span 5 */}
          <div className="lg:col-span-5 flex flex-col">
            <AlexaSandbox
              volumeConfig={volumeConfig}
              currentReading={chemistryHistory[0] || DEFAULT_CHEMISTRY_HISTORY[0]}
              pump={pump}
              chlorinator={chlorinator}
              heater={heater}
              thermometer={thermometer}
              logs={alexaLogs}
              onAlexaCommandSuccess={handleAlexaCommandSuccess}
            />
          </div>

        </div>

        {/* HEATER & TEMPERATURE SENSOR CONTROLS */}
        <div id="section-heater-controls" className="grid grid-cols-1">
          <HeaterThermometerControls
            heater={heater}
            thermometer={thermometer}
            onUpdateHeater={handleUpdateHeater}
            onUpdateThermometer={handleUpdateThermometer}
          />
        </div>

        {/* DEVICE SCHEDULE CONTROLS */}
        <div className="grid grid-cols-1 gap-6">
          <PumpChlorinatorControls
            pump={pump}
            chlorinator={chlorinator}
            onUpdatePump={handleUpdatePump}
            onUpdateChlorinator={handleUpdateChlorinator}
          />
        </div>

        {/* MAINTENANCE CHECKLISTS */}
        <div className="grid grid-cols-1 gap-6">
          <MaintenancePlanner
            tasks={tasks}
            onCompleteTask={handleCompleteTask}
            onAddTask={handleAddTask}
          />
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 Above-Ground Pool Buddy. Automatically maintaining crystal-clear blue vinyl pools safely.</p>
          <div className="flex gap-4">
            <span>Self-hosted · Local Postgres</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
