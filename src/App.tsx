import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  orderBy,
  query,
  limit,
  onSnapshot,
} from 'firebase/firestore';

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

import { Waves, Bell, Smartphone, HelpCircle, RefreshCw, Layers, CheckCircle } from 'lucide-react';

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

  // 1. Double-Tiered Storage Sync: Sync with Firebase, fallback to LocalStorage
  useEffect(() => {
    // Attempt to load from Firestore
    async function loadFirebaseData() {
      try {
        // --- Volume Config ---
        const volRef = doc(db, 'pool_config', 'main_pool');
        const volSnap = await getDoc(volRef);
        if (volSnap.exists()) {
          setVolumeConfig(volSnap.data() as PoolVolumeConfig);
        } else {
          await setDoc(volRef, DEFAULT_VOLUME);
        }

        // --- Chemistry Hits ---
        const chemQuery = query(collection(db, 'chemistry_logs'), orderBy('timestamp', 'desc'), limit(10));
        const chemSnap = await getDocs(chemQuery);
        if (!chemSnap.empty) {
          const loadedChem: ChemicalReading[] = [];
          chemSnap.forEach((doc) => {
            loadedChem.push(doc.data() as ChemicalReading);
          });
          setChemistryHistory(loadedChem);
        } else {
          // pre-seed
          const batchAdd = DEFAULT_CHEMISTRY_HISTORY.map((h) =>
            addDoc(collection(db, 'chemistry_logs'), h)
          );
          await Promise.all(batchAdd);
        }

        // --- Pump Sync ---
        const pumpRef = doc(db, 'device_status', 'pump');
        const pumpSnap = await getDoc(pumpRef);
        if (pumpSnap.exists()) {
          setPump(pumpSnap.data() as PumpStatus);
        } else {
          await setDoc(pumpRef, DEFAULT_PUMP);
        }

        // --- Chlorinator Sync ---
        const clRef = doc(db, 'device_status', 'chlorinator');
        const clSnap = await getDoc(clRef);
        if (clSnap.exists()) {
          setChlorinator(clSnap.data() as ChlorinatorStatus);
        } else {
          await setDoc(clRef, DEFAULT_CHLORINATOR);
        }

        // --- Heater Sync ---
        const heaterRef = doc(db, 'device_status', 'heater');
        const heaterSnap = await getDoc(heaterRef);
        if (heaterSnap.exists()) {
          setHeater(heaterSnap.data() as HeaterStatus);
        } else {
          await setDoc(heaterRef, DEFAULT_HEATER);
        }

        // --- Thermometer Sync ---
        const thermometerRef = doc(db, 'device_status', 'thermometer');
        const thermometerSnap = await getDoc(thermometerRef);
        if (thermometerSnap.exists()) {
          setThermometer(thermometerSnap.data() as ThermometerStatus);
        } else {
          await setDoc(thermometerRef, DEFAULT_THERMOMETER);
        }

        // --- Alexa Connection Sync ---
        const alexaConnectionRef = doc(db, 'device_status', 'alexa_connection');
        const alexaConnectionSnap = await getDoc(alexaConnectionRef);
        if (alexaConnectionSnap.exists()) {
          setAlexaConnection(alexaConnectionSnap.data() as AlexaConnection);
        } else {
          await setDoc(alexaConnectionRef, DEFAULT_ALEXA_CONNECTION);
        }

        // --- Maintenance Tasks ---
        const mCollection = collection(db, 'maintenance__schedules');
        const mSnap = await getDocs(mCollection);
        if (!mSnap.empty) {
          const loadedTasks: MaintenanceTask[] = [];
          mSnap.forEach((doc) => {
            loadedTasks.push({ id: doc.id, ...doc.data() } as MaintenanceTask);
          });
          setTasks(loadedTasks);
        } else {
          // Pre-seed
          const seedPromises = DEFAULT_TAKS.map((t) => {
            const { id, ...data } = t;
            return setDoc(doc(db, 'maintenance__schedules', id), data);
          });
          await Promise.all(seedPromises);
        }

        // --- Alexa Logs ---
        const alexaQuery = query(collection(db, 'alexa_history'), orderBy('timestamp', 'desc'), limit(15));
        const alexaSnap = await getDocs(alexaQuery);
        const loadedAlexa: AlexaLog[] = [];
        alexaSnap.forEach((doc) => {
          loadedAlexa.push(doc.data() as AlexaLog);
        });
        setAlexaLogs(loadedAlexa);

        // --- System Notifications ---
        const notifQuery = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(15));
        const notifSnap = await getDocs(notifQuery);
        const loadedNotifs: InAppNotification[] = [];
        notifSnap.forEach((doc) => {
          loadedNotifs.push({ id: doc.id, ...doc.data() } as InAppNotification);
        });
        setNotifications(loadedNotifs);

        setDbStateLoaded(true);
      } catch (err) {
        console.warn('Firebase connection delayed, using responsive client caching.', err);
        // Load fallback localStorage
        const cachedVol = localStorage.getItem('pool_vol');
        const cachedChem = localStorage.getItem('pool_chem');
        const cachedPump = localStorage.getItem('pool_pump');
        const cachedCl = localStorage.getItem('pool_cl');
        const cachedHeater = localStorage.getItem('pool_heater');
        const cachedTherm = localStorage.getItem('pool_thermometer');
        const cachedAlexaConn = localStorage.getItem('pool_alexa_conn');
        const cachedTasks = localStorage.getItem('pool_tasks');
        const cachedAlexa = localStorage.getItem('pool_alexa');
        const cachedNotifs = localStorage.getItem('pool_notifs');

        if (cachedVol) setVolumeConfig(JSON.parse(cachedVol));
        if (cachedChem) setChemistryHistory(JSON.parse(cachedChem));
        if (cachedPump) setPump(JSON.parse(cachedPump));
        if (cachedCl) setChlorinator(JSON.parse(cachedCl));
        if (cachedHeater) setHeater(JSON.parse(cachedHeater));
        if (cachedTherm) setThermometer(JSON.parse(cachedTherm));
        if (cachedAlexaConn) setAlexaConnection(JSON.parse(cachedAlexaConn));
        if (cachedTasks) setTasks(JSON.parse(cachedTasks));
        if (cachedAlexa) setAlexaLogs(JSON.parse(cachedAlexa));
        if (cachedNotifs) setNotifications(JSON.parse(cachedNotifs));

        setDbStateLoaded(true);
      }
    }

    loadFirebaseData();
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

    // Filter list to keep only unique alerts (avoid creating duplicates of the same type)
    if (generated.length > 0) {
      // Avoid writing if same alert exists unread
      setNotifications((prev) => {
        const unique = [...prev];
        generated.forEach((gen) => {
          const exists = unique.some((ex) => ex.title === gen.title && !ex.read);
          if (!exists) {
            const fresh: InAppNotification = {
              id: Math.random().toString(),
              ...gen,
            };
            unique.unshift(fresh);
            // Save to Firestore background if possible
            addDoc(collection(db, 'notifications'), fresh).catch(() => {});
          }
        });
        localStorage.setItem('pool_notifs', JSON.stringify(unique));
        return unique;
      });
    }
  }, [chemistryHistory]);

  // MUTATIONS helpers
  const handleUpdateVolume = async (newVol: PoolVolumeConfig) => {
    setVolumeConfig(newVol);
    localStorage.setItem('pool_vol', JSON.stringify(newVol));
    try {
      await setDoc(doc(db, 'pool_config', 'main_pool'), newVol);
    } catch (e) {
      console.warn('Network queued setting write.');
    }
  };

  const handleAddReading = async (newReadingObj: Omit<ChemicalReading, 'id' | 'timestamp'>) => {
    const fullReading: ChemicalReading = {
      ...newReadingObj,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [fullReading, ...chemistryHistory];
    setChemistryHistory(nextHistory);
    localStorage.setItem('pool_chem', JSON.stringify(nextHistory));

    try {
      await addDoc(collection(db, 'chemistry_logs'), fullReading);
    } catch (e) {
      console.warn('Network queued chemically log.');
    }
  };

  const handleUpdatePump = async (updates: Partial<PumpStatus>) => {
    const nextPump = { ...pump, ...updates };
    setPump(nextPump);
    localStorage.setItem('pool_pump', JSON.stringify(nextPump));
    try {
      await setDoc(doc(db, 'device_status', 'pump'), nextPump);
    } catch (e) {
      console.warn('Network queued pump change.');
    }
  };

  const handleUpdateChlorinator = async (updates: Partial<ChlorinatorStatus>) => {
    const nextCl = { ...chlorinator, ...updates };
    setChlorinator(nextCl);
    localStorage.setItem('pool_cl', JSON.stringify(nextCl));
    try {
      await setDoc(doc(db, 'device_status', 'chlorinator'), nextCl);
    } catch (e) {
      console.warn('Network queued chlorinator update.');
    }
  };

  const handleUpdateHeater = async (updates: Partial<HeaterStatus>) => {
    const nextHeater = { ...heater, ...updates };
    setHeater(nextHeater);
    localStorage.setItem('pool_heater', JSON.stringify(nextHeater));
    try {
      await setDoc(doc(db, 'device_status', 'heater'), nextHeater);
    } catch (e) {
      console.warn('Network queued heater update.');
    }
  };

  const handleUpdateThermometer = async (updates: Partial<ThermometerStatus>) => {
    const nextTherm = { ...thermometer, ...updates };
    setThermometer(nextTherm);
    localStorage.setItem('pool_thermometer', JSON.stringify(nextTherm));
    try {
      await setDoc(doc(db, 'device_status', 'thermometer'), nextTherm);
    } catch (e) {
      console.warn('Network queued thermometer update.');
    }
  };

  const handleUpdateAlexaConnection = async (updates: Partial<AlexaConnection>) => {
    const nextConn = { ...alexaConnection, ...updates };
    setAlexaConnection(nextConn);
    localStorage.setItem('pool_alexa_conn', JSON.stringify(nextConn));
    try {
      await setDoc(doc(db, 'device_status', 'alexa_connection'), nextConn);
    } catch (e) {
      console.warn('Network queued Alexa connection update.');
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

    const nextTasks = [newTask, ...tasks];
    setTasks(nextTasks);
    localStorage.setItem('pool_tasks', JSON.stringify(nextTasks));

    try {
      await setDoc(doc(db, 'maintenance__schedules', id), {
        name: newTask.name,
        description: newTask.description,
        intervalDays: newTask.intervalDays,
        lastDone: newTask.lastDone,
        upcomingDue: newTask.upcomingDue,
        category: newTask.category,
      });
    } catch (e) {
      console.warn('Network log task queue.');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const nextTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const last = new Date().toISOString();
        const due = new Date(Date.now() + t.intervalDays * 24 * 3600 * 1000).toISOString();
        return { ...t, lastDone: last, upcomingDue: due };
      }
      return t;
    });

    setTasks(nextTasks);
    localStorage.setItem('pool_tasks', JSON.stringify(nextTasks));

    const target = nextTasks.find((t) => t.id === taskId);
    if (target) {
      try {
        await setDoc(doc(db, 'maintenance__schedules', taskId), {
          name: target.name,
          description: target.description,
          intervalDays: target.intervalDays,
          lastDone: target.lastDone,
          upcomingDue: target.upcomingDue,
          category: target.category,
        });

        // Add to notifications
        const completeNotif: InAppNotification = {
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          title: `Duty Completed: ${target.name}`,
          message: `Pool task is logged successfully. Next scheduled task check is in ${target.intervalDays} days.`,
          type: 'success',
          read: false,
          category: 'maintenance',
        };
        setNotifications((prev) => {
          const val = [completeNotif, ...prev];
          localStorage.setItem('pool_notifs', JSON.stringify(val));
          return val;
        });
        await addDoc(collection(db, 'notifications'), completeNotif);
      } catch (e) {
        console.warn('Network queued schedule completed update.');
      }
    }
  };

  const handleAlexaCommandSuccess = async (
    log: AlexaLog,
    triggerMutate: { device: string; property: string; value: any }
  ) => {
    // Append log
    const nextLogs = [log, ...alexaLogs];
    setAlexaLogs(nextLogs);
    localStorage.setItem('pool_alexa', JSON.stringify(nextLogs));

    try {
      await addDoc(collection(db, 'alexa_history'), log);
    } catch (e) {
      console.warn('Queued voice interaction write.');
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
    const nextNotifs = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(nextNotifs);
    localStorage.setItem('pool_notifs', JSON.stringify(nextNotifs));
    try {
      await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
    } catch (e) {}
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    localStorage.setItem('pool_notifs', JSON.stringify([]));
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

          {/* Persistent alerts bell */}
          <div className="flex items-center gap-3">
            <NotificationCenter
              notifications={notifications}
              onMarkRead={markNotificationRead}
              onClearAll={clearAllNotifications}
            />
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
            <span>Linked Email: ioana@sundius.com</span>
            <span>Cloud Ingress Port: 3000</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
