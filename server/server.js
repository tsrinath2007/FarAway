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

// REST APIs

// 1. GET /api/kpis - Retrieve top KPIs
app.get('/api/kpis', (req, res) => {
  const data = db.get();
  const activeFaults = data.faults.filter(f => f.status === 'ACTIVE');
  
  // Calculate aggregate track health score: base 100, drops by 15 for each critical, 8 for warnings
  let health = 100;
  activeFaults.forEach(f => {
    if (f.severity === 'CRITICAL') {
      health -= 15;
    } else {
      health -= 8;
    }
  });
  health = Math.max(0, Math.min(100, health));

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

// 5. POST /api/faults/clear-all - Reset database
app.post('/api/faults/clear-all', (req, res) => {
  const data = db.reset();
  db.addLog('System database was reset. Active warnings and history cleared.', 'warning');
  res.json({ success: true, message: 'Database reset successful', data });
});

// 6. POST /api/faults/inject - Manually inject an anomaly
app.post('/api/faults/inject', (req, res) => {
  const { route, segmentIndex, severity } = req.body;
  
  if (!route || segmentIndex === undefined || !severity) {
    return res.status(400).json({ error: 'Missing route, segmentIndex, or severity' });
  }

  const data = db.get();
  
  // Check if active fault already exists in segment range
  const existingFault = data.faults.find(
    f => f.route === route && 
         f.status === 'ACTIVE' && 
         Math.abs(f.segmentIndex - segmentIndex) <= 3
  );

  if (existingFault) {
    return res.json({ success: false, message: 'An active fault already exists in this sector.' });
  }

  // Create new fault
  const position = segmentIndex / 100;
  const coords = getCoordinatesForPosition(route, position);
  
  const newFault = {
    id: `fault-${Date.now()}`,
    route,
    segmentIndex,
    position,
    coords,
    severity: severity.toUpperCase(),
    timestamp: new Date().toISOString(),
    trainId: 'CONTROL-ROOM',
    vibrationPeak: severity.toUpperCase() === 'CRITICAL' ? 6.2 : 3.8,
    confidence: 3, // start with confidence 3 for manual injections
    status: 'ACTIVE'
  };

  data.faults.unshift(newFault);
  db.save(data);
  db.addLog(`⚠️ ANOMALY INJECTED: Critical track fracture detected on [${route.replace('-', ' to ')}] corridor at segment [${segmentIndex}%]`, 'critical');

  res.json({ success: true, fault: newFault });
});

// 7. POST /api/trains/update - Update train position and test warnings
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

  // Map position to a 0-100 track segment index
  const trainSegment = Math.floor(train.position * 100);

  // Find active faults on this train's route
  const activeFaults = data.faults.filter(f => f.route === train.route && f.status === 'ACTIVE');
  
  let closestWarning = null;
  let shouldSlowDown = false;

  activeFaults.forEach(fault => {
    // Check if fault is ahead of train. Because it is a loop, we check both normal ahead and loop wrap
    // We trigger warning if fault is within 12 segments ahead (braking distance)
    let diff = fault.segmentIndex - trainSegment;
    
    // Handle route wrap-around (e.g. train is at 95, fault is at 3, route length is 100)
    if (diff < -80) {
      diff += 100; // loop wrap
    }

    if (diff > 0 && diff <= 12) {
      shouldSlowDown = true;
      if (!closestWarning || diff < closestWarning.diff) {
        closestWarning = {
          faultId: fault.id,
          severity: fault.severity,
          segmentIndex: fault.segmentIndex,
          distance: diff,
          diff
        };
      }
    }
  });

  if (shouldSlowDown && closestWarning) {
    if (!train.alertActive) {
      train.alertActive = true;
      data.kpis.alertsSentToday += 1;
      db.addLog(`📲 SIGNALING ALERT: Speed forced to 30 km/h for [${train.name}] approaching active fault sector [${closestWarning.segmentIndex}%]`, 'warning');
    }
    train.status = 'SLOWING';
    train.speed = 30; // restricted speed limit
    train.alertMessage = `⚠️ RESTRICTED SPEED: Anomaly ahead in ${closestWarning.distance}% segment. Reduce speed recommended.`;
  } else {
    if (train.alertActive) {
      train.alertActive = false;
      train.status = 'NORMAL';
      train.speed = train.baseSpeed;
      train.alertMessage = '';
      db.addLog(`✅ Track cleared. [${train.name}] cleared danger zone and resumed standard speed (${train.baseSpeed} km/h).`, 'info');
    }
  }

  data.trains[trainIndex] = train;
  db.save(data);
  res.json({ train, closestWarning });
});

// 8. POST /api/faults/report - Consensus & Auto-clear reporting loop
app.post('/api/faults/report', (req, res) => {
  const { trainId, route, position, vibration } = req.body;
  if (!trainId || !route || position === undefined || vibration === undefined) {
    return res.status(400).json({ error: 'Missing report parameters' });
  }

  const data = db.get();
  const train = data.trains.find(t => t.id === trainId);
  const trainName = train ? train.name : trainId;
  const segmentIndex = Math.floor(parseFloat(position) * 100);
  const vibVal = parseFloat(vibration);

  // Search for an existing active fault in the reported sector (within +/- 3% segment tolerance)
  const existingFaultIndex = data.faults.findIndex(
    f => f.route === route && 
         f.status === 'ACTIVE' && 
         Math.abs(f.segmentIndex - segmentIndex) <= 3
  );

  if (vibVal >= 3.5) {
    // ----------------------------------------------------
    // CASE A: HIGH VIBRATION SPIKE DETECTED (TRACK FAULT)
    // ----------------------------------------------------
    if (existingFaultIndex !== -1) {
      // 1. Existing Anomaly: Increment Consensus Confidence
      const fault = data.faults[existingFaultIndex];
      fault.confidence = Math.min(5, fault.confidence + 1);
      fault.vibrationPeak = Math.max(fault.vibrationPeak, vibVal);
      fault.timestamp = new Date().toISOString();
      
      db.addLog(`🤝 CONSENSUS LEARNED: [${trainName}] verified anomaly at segment [${fault.segmentIndex}%] on [${route.replace('-', ' to ')}]. Confidence level increased to ${fault.confidence}/5.`, 'info');
    } else {
      // 2. New Anomaly: Create active track fault record
      const coords = getCoordinatesForPosition(route, parseFloat(position));
      const newFault = {
        id: `fault-${Date.now()}`,
        route,
        segmentIndex,
        position: parseFloat(position),
        coords,
        severity: vibVal >= 5.5 ? 'CRITICAL' : 'WARNING',
        timestamp: new Date().toISOString(),
        trainId,
        vibrationPeak: vibVal,
        confidence: 1,
        status: 'ACTIVE'
      };
      
      data.faults.unshift(newFault);
      db.addLog(`🚨 TRACK ACCELEROMETER ALERT: [${trainName}] reported axle deflection spike of ${vibVal.toFixed(1)}G at segment [${segmentIndex}%]`, 'critical');
    }
  } else {
    // ----------------------------------------------------
    // CASE B: NORMAL VIBRATION DETECTED (TRACK HEALTHY)
    // ----------------------------------------------------
    if (existingFaultIndex !== -1) {
      // An active fault was reported here, but this train detected a healthy scan.
      // Decrement confidence. If it drops to 0, mark as resolved (Auto-Clear).
      const fault = data.faults[existingFaultIndex];
      fault.confidence -= 1;
      
      db.addLog(`🧐 SCAN SCANNING: [${trainName}] passed segment [${fault.segmentIndex}%] with healthy readings (${vibVal.toFixed(1)}G). Confidence drops to ${fault.confidence}/5.`, 'info');

      if (fault.confidence <= 0) {
        fault.status = 'RESOLVED';
        fault.resolvedAt = new Date().toISOString();
        db.addLog(`✅ AUTO-CLEAR VERIFIED: Sector [${fault.segmentIndex}%] on [${route.replace('-', ' to ')}] restored to SAFE status. Health score updated to 100.`, 'info');
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
