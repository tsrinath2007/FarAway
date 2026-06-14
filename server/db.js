const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Default seeded data structure
const DEFAULT_DB = {
  trains: [
    {
      id: 'TRAIN-101',
      name: 'Mumbai Express',
      route: 'mumbai-delhi',
      speed: 110,
      baseSpeed: 110,
      position: 0.1, // fraction along route (0 to 1)
      vibration: 1.2,
      status: 'NORMAL',
      alertActive: false,
      alertMessage: '',
      sensorStatus: 'HEALTHY'
    },
    {
      id: 'TRAIN-202',
      name: 'Kolkata Mail',
      route: 'delhi-kolkata',
      speed: 100,
      baseSpeed: 100,
      position: 0.45,
      vibration: 0.95,
      status: 'NORMAL',
      alertActive: false,
      alertMessage: '',
      sensorStatus: 'HEALTHY'
    },
    {
      id: 'TRAIN-303',
      name: 'Chennai Coastal',
      route: 'kolkata-chennai',
      speed: 120,
      baseSpeed: 120,
      position: 0.8,
      vibration: 1.4,
      status: 'NORMAL',
      alertActive: false,
      alertMessage: '',
      sensorStatus: 'HEALTHY'
    }
  ],
  faults: [],
  logs: [
    {
      id: 'log-0',
      timestamp: new Date().toISOString(),
      message: 'TrackPulse AI Cloud Operations Core initialized.',
      type: 'info'
    },
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      message: 'Active scanning channels established on Delhi, Mumbai, Kolkata, Chennai rail grids.',
      type: 'info'
    }
  ],
  kpis: {
    alertsSentToday: 0
  }
};

// Ensure data directory exists
function ensureDirectoryExistence() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Read database from disk
function readDB() {
  ensureDirectoryExistence();
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDB(DEFAULT_DB);
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON DB file, recovering with defaults:', err);
    return DEFAULT_DB;
  }
}

// Write database to disk
function writeDB(data) {
  ensureDirectoryExistence();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing JSON DB file:', err);
    return false;
  }
}

const db = {
  // Get all data
  get: () => readDB(),

  // Save all data
  save: (data) => writeDB(data),

  // Reset database to initial seeds
  reset: () => {
    writeDB(DEFAULT_DB);
    return DEFAULT_DB;
  },

  // Helper to add a system log
  addLog: (message, type = 'info') => {
    const data = readDB();
    const newLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      message,
      type
    };
    data.logs.unshift(newLog); // New logs at start
    if (data.logs.length > 150) data.logs.pop(); // Cap log size
    writeDB(data);
    return newLog;
  }
};

module.exports = db;
