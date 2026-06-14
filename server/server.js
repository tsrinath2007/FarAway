const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper to map route fractional position to coordinates (for calculations)
function getCoordinatesForPosition(route, position) {
  // Mumbai to Delhi (135, 430) -> (188, 205)
  if (route === 'mumbai-delhi') {
    return {
      x: Math.round(135 + position * (188 - 135)),
      y: Math.round(430 + position * (205 - 430))
    };
  }
  // Delhi to Kolkata (188, 205) -> (425, 370)
  if (route === 'delhi-kolkata') {
    return {
      x: Math.round(188 + position * (425 - 188)),
      y: Math.round(205 + position * (370 - 205))
    };
  }
  // Kolkata to Chennai via Bhubaneswar:
  // Kolkata (425, 370) -> Bhubaneswar (365, 405) -> Chennai (245, 585)
  if (route === 'kolkata-chennai') {
    if (position <= 0.3) {
      // Kolkata to Bhubaneswar (scaled 0 to 0.3)
      const t = position / 0.3;
      return {
        x: Math.round(425 + t * (365 - 425)),
        y: Math.round(370 + t * (405 - 370))
      };
    } else {
      // Bhubaneswar to Chennai (scaled 0.3 to 1.0)
      const t = (position - 0.3) / 0.7;
      return {
        x: Math.round(365 + t * (245 - 365)),
        y: Math.round(405 + t * (585 - 405))
      };
    }
  }
  return { x: 0, y: 0 };
}

// Route sections mapping
const routeSections = {
  'mumbai-delhi': Array.from({ length: 15 }, (_, i) => `TRK-${501 + i}`),
  'delhi-kolkata': Array.from({ length: 15 }, (_, i) => `TRK-${516 + i}`),
  'kolkata-chennai': Array.from({ length: 20 }, (_, i) => `TRK-${531 + i}`)
};

// REST APIs

// 1. GET /api/kpis - Retrieve top KPIs
app.get('/api/kpis', (req, res) => {
  const data = db.get();
  const activeFaults = data.faults.filter(f => f.status === 'ACTIVE');
  
  // Calculate aggregate track health score: average of all 50 sections
  const totalHealth = data.sections.reduce((sum, s) => sum + s.healthScore, 0);
  const health = Math.max(0, Math.min(100, Math.round(totalHealth / data.sections.length)));

  res.json({
    trackHealthScore: health,
    activeTrains: data.trains.length,
    activeFaults: activeFaults.length,
    alertsSentToday: data.kpis.alertsSentToday
  });
});

// 2. GET /api/faults - Get all faults
app.get('/api/faults', (req, res) => {
  const data = db.get();
  res.json(data.faults);
});

// 3. GET /api/trains - Get all trains
app.get('/api/trains', (req, res) => {
  const data = db.get();
  res.json(data.trains);
});

// 4. GET /api/logs - Get activity logs
app.get('/api/logs', (req, res) => {
  const data = db.get();
  res.json(data.logs);
});

// 5. GET /api/sections - Get all 50 track sections
app.get('/api/sections', (req, res) => {
  const data = db.get();
  res.json(data.sections || []);
});

// 6. POST /api/faults/clear-all - Reset database
app.post('/api/faults/clear-all', (req, res) => {
  const data = db.reset();
  db.addLog('System database was reset. Active warnings and history cleared.', 'warning');
  res.json({ success: true, message: 'Database reset successful', data });
});

// 7. POST /api/inject-fault - Manually inject an anomaly
app.post('/api/inject-fault', (req, res) => {
  const { route, segmentIndex, severity } = req.body;
  
  if (!route || segmentIndex === undefined || !severity) {
    return res.status(400).json({ error: 'Missing route, segmentIndex, or severity' });
  }

  const data = db.get();
  
  // Check if route is valid
  const sectionsList = routeSections[route];
  if (!sectionsList) {
    return res.status(400).json({ error: 'Invalid route' });
  }

  // Calculate position and map to sectionId
  const position = segmentIndex / 100;
  let idx = Math.floor(position * sectionsList.length);
  if (idx >= sectionsList.length) idx = sectionsList.length - 1;
  const sectionId = sectionsList[idx];

  // Check if active fault already exists on this section
  const existingFault = data.faults.find(
    f => f.sectionId === sectionId && f.status === 'ACTIVE'
  );

  if (existingFault) {
    return res.json({ success: false, message: `An active fault already exists in section ${sectionId}.` });
  }

  // Create new fault
  const coords = getCoordinatesForPosition(route, position);
  const corridorName = route.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
  
  const newFault = {
    id: `fault-${Date.now()}`,
    sectionId,
    route,
    segmentIndex,
    position,
    coords,
    severity: severity.toUpperCase(),
    corridor: corridorName,
    detectedBy: 'SYSTEM',
    timestamp: new Date().toISOString(),
    confidence: 1,
    status: 'ACTIVE',
    vibrationPeak: severity.toUpperCase() === 'CRITICAL' ? 6.2 : 3.8
  };

  data.faults.unshift(newFault);
  
  // Update section DB status
  const section = data.sections.find(s => s.sectionId === sectionId);
  if (section) {
    section.status = severity.toUpperCase();
    section.healthScore = severity.toUpperCase() === 'CRITICAL' ? 20 : 50;
    section.confidence = 1;
    section.lastUpdated = new Date().toISOString();
  }

  db.save(data);
  db.addLog(`⚠️ ANOMALY INJECTED: Critical track fracture detected on [${corridorName}] corridor at section [${sectionId}]`, 'critical');

  res.json({ success: true, fault: newFault });
});

// Alias for old endpoint to be safe
app.post('/api/faults/inject', (req, res) => {
  const { route, segmentIndex, severity } = req.body;
  
  if (!route || segmentIndex === undefined || !severity) {
    return res.status(400).json({ error: 'Missing route, segmentIndex, or severity' });
  }

  const data = db.get();
  
  const sectionsList = routeSections[route];
  if (!sectionsList) {
    return res.status(400).json({ error: 'Invalid route' });
  }

  const position = segmentIndex / 100;
  let idx = Math.floor(position * sectionsList.length);
  if (idx >= sectionsList.length) idx = sectionsList.length - 1;
  const sectionId = sectionsList[idx];

  const existingFault = data.faults.find(
    f => f.sectionId === sectionId && f.status === 'ACTIVE'
  );

  if (existingFault) {
    return res.json({ success: false, message: `An active fault already exists in section ${sectionId}.` });
  }

  const coords = getCoordinatesForPosition(route, position);
  const corridorName = route.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
  
  const newFault = {
    id: `fault-${Date.now()}`,
    sectionId,
    route,
    segmentIndex,
    position,
    coords,
    severity: severity.toUpperCase(),
    corridor: corridorName,
    detectedBy: 'SYSTEM',
    timestamp: new Date().toISOString(),
    confidence: 1,
    status: 'ACTIVE',
    vibrationPeak: severity.toUpperCase() === 'CRITICAL' ? 6.2 : 3.8
  };

  data.faults.unshift(newFault);
  
  const section = data.sections.find(s => s.sectionId === sectionId);
  if (section) {
    section.status = severity.toUpperCase();
    section.healthScore = severity.toUpperCase() === 'CRITICAL' ? 20 : 50;
    section.confidence = 1;
    section.lastUpdated = new Date().toISOString();
  }

  db.save(data);
  db.addLog(`⚠️ ANOMALY INJECTED: Critical track fracture detected on [${corridorName}] corridor at section [${sectionId}]`, 'critical');

  res.json({ success: true, fault: newFault });
});

// 8. POST /api/trains/update - Update train position and test warnings
app.post('/api/trains/update', (req, res) => {
  const { id, position, vibration, speed } = req.body;
  if (!id || position === undefined) {
    return res.status(400).json({ error: 'Missing train ID or position' });
  }

  const data = db.get();
  const trainIndex = data.trains.findIndex(t => t.id === id);
  if (trainIndex === -1) {
    return res.status(404).json({ error: 'Train not found' });
  }

  const train = data.trains[trainIndex];
  train.position = parseFloat(position);
  train.vibration = parseFloat(vibration || 0.8);
  if (speed !== undefined) train.speed = parseFloat(speed);

  // Map position to section ID and find 3 sections ahead
  const sectionsList = routeSections[train.route] || [];
  if (sectionsList.length > 0) {
    const currentIdx = Math.floor(train.position * sectionsList.length) % sectionsList.length;
    train.currentSection = sectionsList[currentIdx];

    // Find next 3 sections ahead in loop path
    const nextSections = [
      sectionsList[(currentIdx + 1) % sectionsList.length],
      sectionsList[(currentIdx + 2) % sectionsList.length],
      sectionsList[(currentIdx + 3) % sectionsList.length]
    ];

    // Check if any of these sections has an active fault
    const faultySection = nextSections.find(secId => 
      data.faults.some(f => f.sectionId === secId && f.status === 'ACTIVE')
    );

    if (faultySection) {
      if (!train.alertActive) {
        train.alertActive = true;
        data.kpis.alertsSentToday += 1;
        db.addLog(`📲 SIGNALING ALERT: Speed forced to 30 km/h for [${train.name}] approaching active fault section [${faultySection}]`, 'warning');
      }
      train.status = 'SLOWING';
      train.speed = 30; // restricted speed limit
      train.alertMessage = `⚠️ RESTRICTED SPEED: Anomaly ahead in section ${faultySection}. Reduce speed recommended.`;
    } else {
      if (train.alertActive) {
        train.alertActive = false;
        train.status = 'NORMAL';
        train.speed = train.baseSpeed;
        train.alertMessage = '';
        db.addLog(`✅ Track cleared. [${train.name}] cleared danger zone and resumed standard speed (${train.baseSpeed} km/h).`, 'info');
      }
    }
  }

  data.trains[trainIndex] = train;
  db.save(data);
  res.json({ train });
});

// 9. POST /api/faults/report - Consensus & Auto-clear reporting loop
app.post('/api/faults/report', (req, res) => {
  const { trainId, route, position, vibration } = req.body;
  if (!trainId || !route || position === undefined || vibration === undefined) {
    return res.status(400).json({ error: 'Missing report parameters' });
  }

  const data = db.get();
  const train = data.trains.find(t => t.id === trainId);
  const trainName = train ? train.name : trainId;
  const positionVal = parseFloat(position);
  const vibVal = parseFloat(vibration);

  const sectionsList = routeSections[route] || [];
  if (sectionsList.length === 0) {
    return res.status(400).json({ error: 'Invalid route' });
  }
  const currentIdx = Math.floor(positionVal * sectionsList.length) % sectionsList.length;
  const sectionId = sectionsList[currentIdx];

  const section = data.sections.find(s => s.sectionId === sectionId);
  const existingFaultIndex = data.faults.findIndex(
    f => f.sectionId === sectionId && f.status === 'ACTIVE'
  );

  if (vibVal >= 3.5) {
    // Spike detected
    if (existingFaultIndex !== -1) {
      const fault = data.faults[existingFaultIndex];
      fault.confidence = Math.min(5, fault.confidence + 1);
      fault.vibrationPeak = Math.max(fault.vibrationPeak, vibVal);
      fault.timestamp = new Date().toISOString();

      if (section) {
        section.confidence = fault.confidence;
        section.lastUpdated = new Date().toISOString();
        if (fault.confidence >= 3) {
          if (section.status !== 'CONFIRMED FAULT') {
            section.status = 'CONFIRMED FAULT';
            section.healthScore = 15;
            db.addLog(`🤝 CONSENSUS LEARNED: [${trainName}] verified anomaly at section [${sectionId}]. Status upgraded to CONFIRMED FAULT (Confidence: ${fault.confidence}/5)`, 'critical');
          } else {
            db.addLog(`🤝 CONSENSUS LEARNED: [${trainName}] verified anomaly at section [${sectionId}]. Confidence level increased to ${fault.confidence}/5.`, 'info');
          }
        } else {
          db.addLog(`🤝 CONSENSUS LEARNED: [${trainName}] verified anomaly at section [${sectionId}]. Confidence level increased to ${fault.confidence}/5.`, 'info');
        }
      }
    } else {
      // New fault
      const coords = getCoordinatesForPosition(route, positionVal);
      const segmentIndex = Math.floor(positionVal * 100);
      const corridorName = route.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
      
      const newFault = {
        id: `fault-${Date.now()}`,
        sectionId,
        route,
        segmentIndex,
        position: positionVal,
        coords,
        severity: vibVal >= 5.5 ? 'CRITICAL' : 'WARNING',
        timestamp: new Date().toISOString(),
        trainId,
        vibrationPeak: vibVal,
        confidence: 1,
        status: 'ACTIVE',
        corridor: corridorName,
        detectedBy: 'SYSTEM'
      };

      data.faults.unshift(newFault);
      
      if (section) {
        section.status = newFault.severity;
        section.healthScore = newFault.severity === 'CRITICAL' ? 20 : 50;
        section.confidence = 1;
        section.lastUpdated = new Date().toISOString();
      }

      db.addLog(`🚨 TRACK ACCELEROMETER ALERT: [${trainName}] reported axle deflection spike of ${vibVal.toFixed(1)}G at section [${sectionId}]`, 'critical');
    }
  } else if (vibVal < 2.0) {
    // Normal / Healthy scan
    if (existingFaultIndex !== -1) {
      const fault = data.faults[existingFaultIndex];
      fault.confidence -= 1;

      if (section) {
        section.confidence = fault.confidence;
        section.lastUpdated = new Date().toISOString();
      }

      db.addLog(`🧐 SCAN SCANNING: [${trainName}] passed section [${sectionId}] with healthy readings (${vibVal.toFixed(1)}G). Confidence drops to ${fault.confidence}/5.`, 'info');

      if (fault.confidence <= 0) {
        fault.status = 'RESOLVED';
        fault.resolvedAt = new Date().toISOString();
        
        if (section) {
          section.status = 'SAFE';
          section.healthScore = 100;
          section.confidence = 0;
        }
        db.addLog(`✅ AUTO-CLEAR VERIFIED: Section [${sectionId}] restored to SAFE status. Health score updated to 100.`, 'info');
      } else {
        if (section && section.status === 'CONFIRMED FAULT' && fault.confidence < 3) {
          section.status = fault.severity;
          section.healthScore = fault.severity === 'CRITICAL' ? 20 : 50;
        }
      }
    }
  }

  db.save(data);
  res.json({ success: true, faults: data.faults });
});

// Start Server
app.listen(PORT, () => {
  console.log(`TrackPulse AI backend listening on port ${PORT}`);
  db.reset(); // Seed fresh db on start
});

