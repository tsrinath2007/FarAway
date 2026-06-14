const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Helper to seed 50 default track sections
const generateDefaultSections = () => {
  const sections = [];
  for (let i = 501; i <= 550; i++) {
    sections.push({
      sectionId: 'TRK-' + i,
      healthScore: 100,
      status: 'SAFE',
      confidence: 0,
      lastUpdated: new Date().toISOString()
    });
  }
  return sections;
};

// Default seeded data structure with realistic train numbers
const DEFAULT_DB = {
  trains: [
    {
      id: '12727',
      name: '12727 (Express)',
      route: 'mumbai-delhi', // Vijayawada → Visakhapatnam
      speed: 78,
      baseSpeed: 78,
      position: 0.1,
      vibration: 1.2,
      status: 'NORMAL',
      currentSection: 'TRK-502',
      alertActive: false,
      alertMessage: '',
      sensorStatus: 'HEALTHY'
    },
    {
      id: '12805',
      name: '12805 (Superfast)',
      route: 'delhi-kolkata', // New Delhi → Howrah
      speed: 100,
      baseSpeed: 100,
      position: 0.45,
      vibration: 0.95,
      status: 'NORMAL',
      currentSection: 'TRK-522',
      alertActive: false,
      alertMessage: '',
      sensorStatus: 'HEALTHY'
    },
    {
      id: '12645',
      name: '12645 (Mail)',
      route: 'kolkata-chennai', // Kolkata → Chennai
      speed: 115,
      baseSpeed: 115,
      position: 0.8,
      vibration: 1.4,
      status: 'NORMAL',
      currentSection: 'TRK-547',
      alertActive: false,
      alertMessage: '',
      sensorStatus: 'HEALTHY'
    }
  ],
  sections: generateDefaultSections(),
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
      message: 'Active scanning channels established. 50 track sectors (TRK-501 to TRK-550) mapped.',
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
