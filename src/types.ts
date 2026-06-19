export interface PoolVolumeConfig {
  shape: 'round' | 'rectangular' | 'oval';
  diameter?: number; // for round (feet)
  width?: number; // for rect/oval (feet)
  length?: number; // for rect/oval (feet)
  avgDepth: number; // feet
  volumeGallons: number; // calculated or custom overridden
}

export interface ChemicalReading {
  id?: string;
  timestamp: any; // Firestore Timestamp or string
  ph: number; // pH level
  chlorine: number; // ppm
  alkalinity: number; // ppm
  cya: number; // ppm (stabilizer)
  calcium: number; // ppm
  temperature: number; // °F
  notes?: string;
}

export interface PumpStatus {
  isCurrentlyOn: boolean;
  dailyTargetHours: number;
  scheduleStart: string; // "HH:MM"
  scheduleEnd: string; // "HH:MM"
  autoScheduled: boolean;
  lastChanged: any;
}

export interface ChlorinatorStatus {
  isCurrentlyOn: boolean;
  outputPercentage: number; // 0 to 100%
  scheduleStart: string; // "HH:MM"
  scheduleEnd: string; // "HH:MM"
  autoScheduled: boolean;
  lastChanged: any;
}

export interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  intervalDays: number;
  lastDone: any; // timestamp or ISO string
  upcomingDue: any; // calculated due time
  category: 'cleaning' | 'chemistry' | 'filter' | 'hardware';
}

export interface InAppNotification {
  id: string;
  timestamp: any;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  read: boolean;
  category: 'chemical' | 'pump' | 'maintenance' | 'alexa';
}

export interface AlexaLog {
  id: string;
  timestamp: any;
  command: string; // raw command typed/simulated
  alexaResponse: string; // Alexa reply text
  deviceStateChanged: string; // "Pump: OFF", etc.
  success: boolean;
}

export interface HeaterStatus {
  isCurrentlyOn: boolean;
  targetTemperature: number;
  mode: 'eco' | 'rapid' | 'solar';
  lastChanged: any;
}

export interface ThermometerStatus {
  currentWaterTemp: number;
  currentAirTemp: number;
  trend: 'rising' | 'falling' | 'stable';
  batteryPercentage: number;
  lastSynced: string;
}

export interface AlexaConnection {
  isLinked: boolean;
  authCode: string;
  smartHomeLinkedAt: string | null;
  serverRegion: string;
  allowExternalCommands: boolean;
}

