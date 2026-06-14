import React, { useState, useEffect, useRef } from 'react';
import { 
  Train, 
  Activity, 
  AlertTriangle, 
  Cpu, 
  CheckCircle2, 
  Play, 
  Pause,
  Clock,
  Layers,
  RefreshCw,
  Sliders,
  Settings,
  Shield,
  FileText,
  AlertOctagon,
  Trash2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  CartesianGrid 
} from 'recharts';
import indiaMap from '@svg-maps/india';

// Coordinates scaled to 612x696 viewBox
const CITY_COORDS = {
  delhi: { x: 188, y: 205, name: 'DELHI' },
  mumbai: { x: 135, y: 430, name: 'MUMBAI' },
  kolkata: { x: 425, y: 370, name: 'KOLKATA' },
  chennai: { x: 245, y: 585, name: 'CHENNAI' },
  bhubaneswar: { x: 365, y: 405, name: 'BHUBANESWAR' }
};

// Rail Corridors path definitions
const CORRIDORS = [
  { id: 'mumbai-delhi', path: `M ${CITY_COORDS.mumbai.x},${CITY_COORDS.mumbai.y} L ${CITY_COORDS.delhi.x},${CITY_COORDS.delhi.y}` },
  { id: 'delhi-kolkata', path: `M ${CITY_COORDS.delhi.x},${CITY_COORDS.delhi.y} L ${CITY_COORDS.kolkata.x},${CITY_COORDS.kolkata.y}` },
  { id: 'kolkata-chennai', path: `M ${CITY_COORDS.kolkata.x},${CITY_COORDS.kolkata.y} L ${CITY_COORDS.bhubaneswar.x},${CITY_COORDS.bhubaneswar.y} L ${CITY_COORDS.chennai.x},${CITY_COORDS.chennai.y}` }
];

// Secondary nodes (ambient beacons) representing nationwide track monitoring
const SECONDARY_HUBS = [
  { name: 'HYDERABAD', x: 250, y: 490 },
  { name: 'BENGALURU', x: 215, y: 575 },
  { name: 'AHMEDABAD', x: 105, y: 365 },
  { name: 'JAIPUR', x: 155, y: 245 },
  { name: 'NAGPUR', x: 265, y: 395 },
  { name: 'GUWAHATI', x: 520, y: 285 },
  { name: 'LUCKNOW', x: 255, y: 228 },
  { name: 'PATNA', x: 355, y: 258 }
];

export default function App() {
  // UI & Network state
  const [kpis, setKpis] = useState({
    trackHealthScore: 100,
    activeTrains: 3,
    activeFaults: 0,
    alertsSentToday: 0
  });
  const [trains, setTrains] = useState([]);
  const [faults, setFaults] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedTrainId, setSelectedTrainId] = useState('TRAIN-101');
  const [isSimulating, setIsSimulating] = useState(true);
  const [time, setTime] = useState(new Date());

  // Interactive controls
  const [injectRoute, setInjectRoute] = useState('kolkata-chennai');
  const [injectSegment, setInjectSegment] = useState(30);
  const [injectSeverity, setInjectSeverity] = useState('CRITICAL');
  const [trainFaultToggles, setTrainFaultToggles] = useState({
    'TRAIN-101': false,
    'TRAIN-202': false,
    'TRAIN-303': false
  });

  // Map state
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [activeHub, setActiveHub] = useState(null);
  const [mapLayers, setMapLayers] = useState({
    grid: true,
    corridors: true,
    radar: true,
    telemetry: true,
    junctions: true,
    secondary: true
  });

  // Vibration graph history (for Selected Train)
  const [vibHistory, setVibHistory] = useState([]);
  const historyCounter = useRef(0);

  // 1. Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all backend stats
  const fetchAllData = async () => {
    try {
      const [kpiRes, trainRes, faultRes, logRes] = await Promise.all([
        fetch('/api/kpis').then(r => r.json()),
        fetch('/api/trains').then(r => r.json()),
        fetch('/api/faults').then(r => r.json()),
        fetch('/api/logs').then(r => r.json())
      ]);
      setKpis(kpiRes);
      setTrains(trainRes);
      setFaults(faultRes);
      setLogs(logRes);
    } catch (err) {
      console.error('Error connecting to backend services:', err);
    }
  };

  // Telemetry loop: Runs every 250ms when simulation is active
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(async () => {
      // 1. Locally advance positions of simulated trains
      const data = await fetch('/api/trains').then(r => r.json()).catch(() => []);
      if (!data || data.length === 0) return;

      for (let train of data) {
        // Calculate step speed-to-position modifier
        const speedVal = train.speed || train.baseSpeed || 100;
        const positionIncrement = (speedVal / 3600) * 0.25 * 0.15; // artificially scaled for visual dashboard feedback
        const nextPosition = (train.position + positionIncrement) % 1.0;
        const segmentIndex = Math.floor(nextPosition * 100);

        // 2. Read sensor accelerometer vibration
        let vibration = 0.6 + Math.random() * 0.6; // Base healthy vibration

        // Check if train has manual anomaly mode turned on
        if (trainFaultToggles[train.id]) {
          vibration = 4.2 + Math.random() * 2.8; // Generate severe vibration peaks
        } else {
          // Check if train is passing over an active fault segment on its route
          const routeFaults = faults.filter(f => f.route === train.route && f.status === 'ACTIVE');
          routeFaults.forEach(fault => {
            if (Math.abs(fault.segmentIndex - segmentIndex) <= 3) {
              vibration = fault.severity === 'CRITICAL' ? 5.8 + Math.random() * 2.5 : 3.6 + Math.random() * 1.5;
            }
          });
        }

        // 3. Post telemetry update
        await fetch('/api/trains/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: train.id,
            position: nextPosition,
            vibration,
            speed: train.speed
          })
        });

        // 4. Report sensors to consensus learning loops
        await fetch('/api/faults/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainId: train.id,
            route: train.route,
            position: nextPosition,
            vibration
          })
        });
      }

      // Fetch fresh global state
      fetchAllData();
    }, 800);

    return () => clearInterval(interval);
  }, [isSimulating, trainFaultToggles, faults]);

  // Update real-time vibration scrolling graph for the selected train
  useEffect(() => {
    if (trains.length === 0) return;
    const currentTrain = trains.find(t => t.id === selectedTrainId);
    if (!currentTrain) return;

    setVibHistory(prev => {
      const next = [...prev, {
        time: historyCounter.current++,
        Vibration: parseFloat(currentTrain.vibration.toFixed(2))
      }];
      if (next.length > 25) next.shift(); // Keep last 25 ticks
      return next;
    });
  }, [trains, selectedTrainId]);

  // Initial Seed
  useEffect(() => {
    fetchAllData();
  }, []);

  // Trigger manual injection
  const handleInjectFault = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/faults/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: injectRoute,
          segmentIndex: parseInt(injectSegment),
          severity: injectSeverity
        })
      }).then(r => r.json());

      if (res.success) {
        fetchAllData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset database
  const handleReset = async () => {
    try {
      await fetch('/api/faults/clear-all', { method: 'POST' });
      setVibHistory([]);
      setTrainFaultToggles({
        'TRAIN-101': false,
        'TRAIN-202': false,
        'TRAIN-303': false
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Get train path coordinates along the route
  const getTrainScreenCoords = (train) => {
    const route = train.route;
    const position = train.position;
    
    if (route === 'mumbai-delhi') {
      return {
        x: 135 + position * (188 - 135),
        y: 430 + position * (205 - 430)
      };
    }
    if (route === 'delhi-kolkata') {
      return {
        x: 188 + position * (425 - 188),
        y: 205 + position * (370 - 205)
      };
    }
    if (route === 'kolkata-chennai') {
      if (position <= 0.3) {
        const t = position / 0.3;
        return {
          x: 425 + t * (365 - 425),
          y: 370 + t * (405 - 370)
        };
      } else {
        const t = (position - 0.3) / 0.7;
        return {
          x: 365 + t * (245 - 365),
          y: 405 + t * (585 - 405)
        };
      }
    }
    return { x: 0, y: 0 };
  };

  // Hover and Tooltip handlers for India Map
  const handleStateMouseEnter = (loc, e) => {
    const stateName = loc.name || '';
    const stateId = loc.id || '';
    const nameLength = stateName.length;
    
    const sensorsOnline = 15 + (nameLength * 9) % 30;
    const sensorsTotal = sensorsOnline + (nameLength % 4);
    const signalPercent = 85 + (nameLength * 3) % 16;
    const scannerStatus = nameLength % 4 === 0 ? 'CALIBRATING' : 'SCANNING - ACTIVE';
    const trafficFlow = nameLength % 6 === 0 ? 'RESTRICTED' : 'NORMAL';
    
    setHoveredState({
      id: stateId,
      name: stateName.toUpperCase(),
      sensorsOnline,
      sensorsTotal,
      signalPercent,
      scannerStatus,
      trafficFlow
    });
  };

  const handleStateMouseMove = (e) => {
    const mapBounds = document.getElementById('india-map-container')?.getBoundingClientRect();
    if (mapBounds) {
      setTooltipPos({
        x: e.clientX - mapBounds.left,
        y: e.clientY - mapBounds.top
      });
    }
  };

  const handleStateMouseLeave = () => {
    setHoveredState(null);
  };

  const activeTrainDetails = trains.find(t => t.id === selectedTrainId) || {};

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans relative select-none">
      
      {/* SECTION 1: HEADER HEADER */}
      <header className="border-b border-slate-900 bg-slate-950/90 px-6 py-4 flex flex-col md:flex-row items-center justify-between z-20 gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="bg-sky-500 p-2 rounded flex items-center justify-center animate-pulse glow-neon-blue">
            <Cpu className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white font-mono flex items-center">
              TRACKPULSE <span className="text-sky-400 ml-1">AI</span>
            </h1>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none mt-0.5">Collaborative Rail Safety Net</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-400 font-mono tracking-wider">
              {isSimulating ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-slate-300">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-bold font-mono tracking-wider">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </div>
      </header>

      {/* SECTION 2: TOP RIBBON CARD STATS */}
      <section className="bg-slate-950/40 border-b border-slate-900 px-6 py-4 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-3 flex flex-col justify-between shadow-inner">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">TRACK HEALTH INDEX</span>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <h3 className={`text-2xl font-bold font-mono ${kpis.trackHealthScore >= 85 ? 'text-emerald-400 text-glow' : kpis.trackHealthScore >= 60 ? 'text-amber-400' : 'text-red-400 animate-pulse'}`}>
                {kpis.trackHealthScore}%
              </h3>
              <span className="text-[8px] font-mono text-slate-400">NOMINAL</span>
            </div>
          </div>
          {/* KPI 2 */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-3 flex flex-col justify-between shadow-inner">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">ACTIVE SENSOR NODES</span>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <h3 className="text-2xl font-bold font-mono text-white">
                {kpis.activeTrains} / 3
              </h3>
              <span className="text-[8px] font-mono text-emerald-400">ONLINE</span>
            </div>
          </div>
          {/* KPI 3 */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-3 flex flex-col justify-between shadow-inner">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">ACTIVE ANOMALIES</span>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <h3 className={`text-2xl font-bold font-mono ${kpis.activeFaults > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                {kpis.activeFaults}
              </h3>
              <span className="text-[8px] font-mono text-slate-400">UNRESOLVED</span>
            </div>
          </div>
          {/* KPI 4 */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-3 flex flex-col justify-between shadow-inner">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">CAB ALERTS DISPATCHED</span>
            <div className="flex items-baseline space-x-1.5 mt-1.5">
              <h3 className="text-2xl font-bold font-mono text-sky-400">
                {kpis.alertsSentToday}
              </h3>
              <span className="text-[8px] font-mono text-slate-400">TODAY</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CENTER LAYOUT ROW */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* LEFT COMPONENT: SIMULATION COCKPIT */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
          
          {/* Simulation Toggles */}
          <div className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 flex flex-col gap-3.5">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-sky-400" />
                SYSTEM CONTROLS
              </h3>
              <button 
                onClick={handleReset}
                title="Reset Database"
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex-1 py-2 px-3 rounded text-xs font-semibold font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all ${isSimulating ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}
              >
                {isSimulating ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    PAUSE SIM
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    RESUME SIM
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Individual Train Sensors */}
          <div className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 flex flex-col gap-3.5">
            <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <Train className="h-3.5 w-3.5 text-sky-400" />
              SENSOR CONFIGURATION
            </h3>
            
            <div className="space-y-4">
              {trains.map(train => (
                <div key={train.id} className="p-3 bg-slate-900/40 border border-slate-900 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white font-mono">{train.name}</span>
                    <span className={`text-[8px] font-mono px-1 rounded ${train.alertActive ? 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                      {train.alertActive ? 'WARNING' : 'HEALTHY'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-500">CORRIDOR:</span>
                    <span className="text-slate-300 uppercase">{train.route.replace('-', ' → ')}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-500">SPEED LIMIT:</span>
                    <span className="text-white font-bold">{train.speed} km/h</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-900 pt-2 mt-1">
                    <span className="text-[9px] font-mono text-slate-500">ANOMALY TRIGGER:</span>
                    <button
                      onClick={() => setTrainFaultToggles(prev => ({ ...prev, [train.id]: !prev[train.id] }))}
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${trainFaultToggles[train.id] ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                    >
                      {trainFaultToggles[train.id] ? 'FAULT INJECTED' : 'NORMAL SCAN'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Fault Injector */}
          <form onSubmit={handleInjectFault} className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <AlertOctagon className="h-3.5 w-3.5 text-red-500 animate-pulse" />
              ANOMALY INJECTOR
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono text-slate-500">SELECT CORRIDOR</label>
              <select 
                value={injectRoute} 
                onChange={(e) => setInjectRoute(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="mumbai-delhi">Mumbai → Delhi (Corridor A)</option>
                <option value="delhi-kolkata">Delhi → Kolkata (Corridor B)</option>
                <option value="kolkata-chennai">Kolkata → Chennai (Corridor C)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono text-slate-500">SECTOR INDEX %</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={injectSegment} 
                  onChange={(e) => setInjectSegment(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 outline-none font-mono text-center"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono text-slate-500">SEVERITY</label>
                <select 
                  value={injectSeverity} 
                  onChange={(e) => setInjectSeverity(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 outline-none"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="WARNING">WARNING</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="mt-1 w-full bg-red-600/10 text-red-400 border border-red-500/30 font-mono font-bold text-xs py-2 rounded hover:bg-red-600 hover:text-white transition-all cursor-pointer"
            >
              INJECT STRUCTURAL FRACTURE
            </button>
          </form>

        </div>

        {/* MIDDLE COMPONENT: ACTIVE MAP CANVAS */}
        <div 
          id="india-map-container"
          className="flex-1 bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]"
        >
          {/* Cyber Corner Brackets */}
          <div className="cyber-corner cyber-corner-tl"></div>
          <div className="cyber-corner cyber-corner-tr"></div>
          <div className="cyber-corner cyber-corner-bl"></div>
          <div className="cyber-corner cyber-corner-br"></div>

          {/* Compass Coord Marks on borders */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[7px] font-mono text-slate-600 tracking-[0.2em] pointer-events-none select-none">
            LAT RANGE: 8° 4' N — 37° 6' N
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-mono text-slate-600 tracking-[0.2em] pointer-events-none select-none">
            LON RANGE: 68° 7' E — 97° 2' E
          </div>

          {/* Map Layer Controller (Interactive Toggles) */}
          <div className="absolute top-4 right-4 bg-slate-950/95 border border-slate-900/80 p-2 rounded-lg z-25 backdrop-blur-md flex items-center gap-2.5 shadow-md">
            <span className="text-[8px] font-bold font-mono tracking-widest text-slate-500 border-r border-slate-800 pr-2">LAYERS</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setMapLayers(prev => ({ ...prev, grid: !prev.grid }))}
                title="Toggle Holographic Grid"
                className={`p-1.5 rounded transition-all ${mapLayers.grid ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'bg-slate-900/60 border border-slate-800/80 text-slate-500 hover:text-slate-400'}`}
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
              
              <button 
                onClick={() => setMapLayers(prev => ({ ...prev, corridors: !prev.corridors }))}
                title="Toggle Active Rail Tracks"
                className={`p-1.5 rounded transition-all ${mapLayers.corridors ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'bg-slate-900/60 border border-slate-800/80 text-slate-500 hover:text-slate-400'}`}
              >
                <Activity className="h-3.5 w-3.5" />
              </button>
              
              <button 
                onClick={() => setMapLayers(prev => ({ ...prev, radar: !prev.radar }))}
                title="Toggle Compass Radar Sweep"
                className={`p-1.5 rounded transition-all ${mapLayers.radar ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'bg-slate-900/60 border border-slate-800/80 text-slate-500 hover:text-slate-400'}`}
              >
                <Clock className="h-3.5 w-3.5" />
              </button>

              <button 
                onClick={() => setMapLayers(prev => ({ ...prev, secondary: !prev.secondary }))}
                title="Toggle Secondary Monitoring Beacons"
                className={`p-1.5 rounded transition-all ${mapLayers.secondary ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'bg-slate-900/60 border border-slate-800/80 text-slate-500 hover:text-slate-400'}`}
              >
                <Cpu className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <svg viewBox={indiaMap.viewBox} className="w-full max-h-[440px] relative z-10">
            {/* Holographic Radar Grid in SVG Defs */}
            <defs>
              <linearGradient id="radar-sweep-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(14, 165, 233, 0)" />
                <stop offset="100%" stopColor="rgba(14, 165, 233, 0.35)" />
              </linearGradient>
              <pattern id="radar-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(56, 189, 248, 0.035)" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Grid Overlay Rect */}
            {mapLayers.grid && (
              <rect width="100%" height="100%" fill="url(#radar-grid)" pointerEvents="none" />
            )}

            {/* Slow Spinning Radar Compass in Background */}
            {mapLayers.radar && (
              <g className="animate-slow-spin" opacity="0.12" pointerEvents="none">
                <circle cx="306" cy="348" r="140" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="0.8" strokeDasharray="2 10" />
                <circle cx="306" cy="348" r="145" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="0.8" strokeDasharray="1 4" />
                <path d="M 306 198 L 306 208 M 306 488 L 306 498 M 156 348 L 166 348 M 446 348 L 456 348" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.2" />
              </g>
            )}
            {mapLayers.radar && (
              <g className="animate-slow-spin-reverse" opacity="0.08" pointerEvents="none">
                <circle cx="306" cy="348" r="220" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="0.8" strokeDasharray="4 20" />
              </g>
            )}

            {/* Radar Concentric Rings */}
            {mapLayers.grid && (
              <g fill="none" stroke="rgba(56, 189, 248, 0.03)" strokeWidth="0.8" pointerEvents="none">
                <circle cx="306" cy="348" r="80" />
                <circle cx="306" cy="348" r="160" strokeDasharray="2 4" />
                <circle cx="306" cy="348" r="240" />
                <circle cx="306" cy="348" r="320" strokeDasharray="3 6" />
              </g>
            )}

            {/* Radar Sweep Rotating Line */}
            {mapLayers.radar && (
              <line 
                x1="306" 
                y1="348" 
                x2="306" 
                y2="48" 
                stroke="url(#radar-sweep-grad)" 
                strokeWidth="2.5" 
                className="radar-sweep-indicator" 
                pointerEvents="none"
              />
            )}

            {/* Detailed India States Path */}
            {indiaMap.locations.map((loc) => (
              <path
                key={loc.id}
                d={loc.path}
                name={loc.name}
                id={loc.id}
                fill="rgba(11, 15, 25, 0.6)"
                stroke="rgba(56, 189, 248, 0.16)"
                strokeWidth="0.7"
                className="transition-all duration-300 hover:fill-sky-500/10 hover:stroke-sky-400/80 cursor-pointer"
                onMouseEnter={(e) => handleStateMouseEnter(loc, e)}
                onMouseMove={handleStateMouseMove}
                onMouseLeave={handleStateMouseLeave}
              />
            ))}

            {/* Glowing Railway Corridors (Neon styling) */}
            {mapLayers.corridors && (
              <g strokeLinecap="round">
                {CORRIDORS.map((corridor) => (
                  <g key={corridor.id}>
                    <path d={corridor.path} fill="none" stroke="#020617" strokeWidth="4.5" />
                    <path d={corridor.path} fill="none" stroke="#0EA5E9" strokeWidth="3" strokeOpacity="0.22" className="glow-neon-blue" />
                    <path d={corridor.path} fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.75" />
                    <path d={corridor.path} fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.85" className="animate-track-flow" />
                  </g>
                ))}
              </g>
            )}

            {/* Secondary Network Nodes (Ambient Beacons) */}
            {mapLayers.secondary && SECONDARY_HUBS.map((hub) => (
              <g key={hub.name} opacity="0.6">
                <circle cx={hub.x} cy={hub.y} r="2.5" fill="#38BDF8" />
                <circle cx={hub.x} cy={hub.y} r="2.5" fill="none" stroke="#38BDF8" strokeWidth="0.8">
                  <animate attributeName="r" values="2.5;7.5;2.5" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.8;0.1;0.8" dur="2.4s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}

            {/* Active Fault Markings on Map */}
            {faults.filter(f => f.status === 'ACTIVE').map(fault => (
              <g key={fault.id}>
                {/* Outer pulsing red beacon */}
                <circle cx={fault.coords.x} cy={fault.coords.y} r="14" fill="#EF4444" fillOpacity="0.12" />
                <circle cx={fault.coords.x} cy={fault.coords.y} r="4.5" fill="#EF4444" className="glow-red animate-pulse" />
                <circle cx={fault.coords.x} cy={fault.coords.y} r="4.5" fill="none" stroke="#EF4444" strokeWidth="1.5">
                  <animate attributeName="r" values="4.5;22;4.5" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.8;0.1;0.8" dur="1.6s" repeatCount="indefinite" />
                </circle>

                {/* Cyber Brackets target frame */}
                <g stroke="#EF4444" strokeWidth="0.8">
                  <line x1={fault.coords.x - 10} y1={fault.coords.y - 10} x2={fault.coords.x - 5} y2={fault.coords.y - 10} />
                  <line x1={fault.coords.x - 10} y1={fault.coords.y - 10} x2={fault.coords.x - 10} y2={fault.coords.y - 5} />
                  
                  <line x1={fault.coords.x + 10} y1={fault.coords.y - 10} x2={fault.coords.x + 5} y2={fault.coords.y - 10} />
                  <line x1={fault.coords.x + 10} y1={fault.coords.y - 10} x2={fault.coords.x + 10} y2={fault.coords.y - 5} />
                  
                  <line x1={fault.coords.x - 10} y1={fault.coords.y + 10} x2={fault.coords.x - 5} y2={fault.coords.y + 10} />
                  <line x1={fault.coords.x - 10} y1={fault.coords.y + 10} x2={fault.coords.x - 10} y2={fault.coords.y + 5} />
                  
                  <line x1={fault.coords.x + 10} y1={fault.coords.y + 10} x2={fault.coords.x + 5} y2={fault.coords.y + 10} />
                  <line x1={fault.coords.x + 10} y1={fault.coords.y + 10} x2={fault.coords.x + 10} y2={fault.coords.y + 5} />
                </g>

                {/* Floating Sector label */}
                <g transform={`translate(${fault.coords.x + 14}, ${fault.coords.y - 4})`}>
                  <rect x="-2" y="-6" width="60" height="9" rx="1" fill="#020617" stroke="#EF4444" strokeWidth="0.6" fillOpacity="0.85" />
                  <text x="0" y="1" fill="#EF4444" fontSize="5.5" fontFamily="monospace" fontWeight="bold">ANOMALY {fault.segmentIndex}%</text>
                </g>
              </g>
            ))}

            {/* Live Moving Trains */}
            {mapLayers.telemetry && trains.map(train => {
              const coords = getTrainScreenCoords(train);
              const isSelected = train.id === selectedTrainId;
              
              return (
                <g 
                  key={train.id} 
                  className="cursor-pointer"
                  onClick={() => setSelectedTrainId(train.id)}
                >
                  {/* Aura around selected train */}
                  {isSelected && (
                    <circle cx={coords.x} cy={coords.y} r="18" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" className="animate-spin" style={{ animationDuration: '6s' }} />
                  )}

                  {/* Pulsing signal halo */}
                  <circle cx={coords.x} cy={coords.y} r="10" fill={train.alertActive ? '#EF4444' : '#FBBF24'} fillOpacity="0.15" />
                  <circle cx={coords.x} cy={coords.y} r="4.5" fill={train.alertActive ? '#EF4444' : '#FBBF24'} className={train.alertActive ? 'glow-red' : 'glow-yellow'} />
                  <circle cx={coords.x} cy={coords.y} r="4.5" fill="none" stroke={train.alertActive ? '#EF4444' : '#FBBF24'} strokeWidth="0.8">
                    <animate attributeName="r" values="4.5;14;4.5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>

                  {/* Overlay text for speed */}
                  <g transform={`translate(${coords.x + 10}, ${coords.y - 12})`}>
                    <rect x="-4" y="-8" width="62" height="11" rx="1.5" fill="#020617" stroke={isSelected ? '#38BDF8' : '#64748B'} strokeWidth="0.8" fillOpacity="0.9" />
                    <text x="0" y="0" fill="#FFF" fontSize="6.5" fontFamily="monospace" fontWeight="bold">
                      {train.id} • {train.speed}K
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Major Hub Junction Cities (Glowing rings) */}
            {mapLayers.junctions && Object.values(CITY_COORDS).map((city) => (
              <g key={city.name} className="cursor-pointer" onClick={() => setActiveHub(city)}>
                <circle cx={city.x} cy={city.y} r="10" fill="#10B981" fillOpacity="0.12" />
                <circle cx={city.x} cy={city.y} r="4" fill="#10B981" className="glow-green" />
                <circle cx={city.x} cy={city.y} r="4" fill="none" stroke="#10B981" strokeWidth="0.8">
                  <animate attributeName="r" values="4;10;4" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.8;0.1;0.8" dur="2.4s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}

            {/* City Text Labels (Operations Terminal Look) */}
            {mapLayers.junctions && (
              <g fill="rgba(148, 163, 184, 0.75)" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="0.05em">
                <text x={CITY_COORDS.delhi.x + 8} y={CITY_COORDS.delhi.y + 3}>{CITY_COORDS.delhi.name}</text>
                <text x={CITY_COORDS.mumbai.x - 52} y={CITY_COORDS.mumbai.y + 3}>{CITY_COORDS.mumbai.name}</text>
                <text x={CITY_COORDS.kolkata.x + 8} y={CITY_COORDS.kolkata.y + 3}>{CITY_COORDS.kolkata.name}</text>
                <text x={CITY_COORDS.chennai.x + 8} y={CITY_COORDS.chennai.y + 3}>{CITY_COORDS.chennai.name}</text>
              </g>
            )}
          </svg>

          {/* Floating Hover State Tooltip */}
          {hoveredState && (
            <div 
              className="absolute glass-tooltip p-3 rounded-lg z-30 pointer-events-none w-56 flex flex-col gap-1.5 text-[10px] font-mono shadow-lg"
              style={{ 
                left: `${tooltipPos.x + 15}px`, 
                top: `${tooltipPos.y + 15}px` 
              }}
            >
              <div className="flex justify-between items-center border-b border-sky-500/20 pb-1.5 mb-0.5">
                <span className="font-bold text-sky-400 tracking-wider">{hoveredState.name}</span>
                <span className="text-[8px] bg-slate-900 border border-slate-800 px-1 rounded text-slate-400">ZONE {hoveredState.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">SCAN MONITOR:</span>
                <span className="text-emerald-400 font-bold">{hoveredState.scannerStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">SENSORS ONLINE:</span>
                <span className="text-white font-bold">{hoveredState.sensorsOnline} / {hoveredState.sensorsTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">SIGNAL GAIN:</span>
                <span className="text-sky-400 font-bold">{hoveredState.signalPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">TRAFFIC FLOW:</span>
                <span className={`font-bold ${hoveredState.trafficFlow === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                  {hoveredState.trafficFlow}
                </span>
              </div>
            </div>
          )}

          {/* Junction Hub Interactive Click Modal */}
          {activeHub && (
            <div className="absolute bottom-16 right-4 bg-slate-950/95 border border-emerald-500/40 p-3 rounded-lg z-20 w-48 text-[10px] font-mono shadow-lg shadow-black/80">
              <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1 mb-1.5 text-emerald-400 font-bold">
                <span>[ HUB: {activeHub.name} ]</span>
                <button onClick={() => setActiveHub(null)} className="text-slate-400 hover:text-white font-sans text-xs shrink-0 cursor-pointer">×</button>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>TELEMETRY:</span>
                  <span className="text-emerald-400 font-bold">ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span>DEPOT STATUS:</span>
                  <span className="text-white">STANDBY</span>
                </div>
                <div className="flex justify-between">
                  <span>COORDINATES:</span>
                  <span className="text-slate-400">{activeHub.y}°N, {activeHub.x}°E</span>
                </div>
                <div className="flex justify-between">
                  <span>SCAN CHANNELS:</span>
                  <span className="text-white">12 ACTIVE</span>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Map Status overlay text */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 border border-slate-900 p-2.5 rounded text-center z-15 backdrop-blur-sm">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 block uppercase">
              {faults.filter(f => f.status === 'ACTIVE').length > 0 
                ? '⚠️ CRITICAL ALARM: Anomalies flagged on corridors. Auto-signal restriction active.' 
                : '🛡️ ALL CLEAR: Structural rail health verified. Consensus scan active.'}
            </span>
          </div>
        </div>

        {/* RIGHT COMPONENT: LIVE ALERTS AND OPERATIONS LOG */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
          
          {/* Operations Warn Banner */}
          <div className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 flex flex-col gap-3.5 flex-1 min-h-[220px]">
            <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              SIGNAL WARNING FEED
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 custom-scrollbar max-h-[300px]">
              {trains.filter(t => t.alertActive).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-8">
                  <Shield className="h-8 w-8 text-slate-700 mb-2" />
                  <p className="text-[10px] font-mono uppercase tracking-widest">No active alerts</p>
                  <p className="text-[9px] mt-1">All trains operating at standard route velocities.</p>
                </div>
              ) : (
                trains.filter(t => t.alertActive).map(train => (
                  <div key={train.id} className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg flex flex-col gap-1.5 animate-pulse">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="font-bold text-red-400 uppercase">[ SPEED RESTRICTION ]</span>
                      <span className="text-slate-400">{train.id}</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-300 leading-tight">
                      {train.alertMessage}
                    </p>
                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mt-1 border-t border-red-500/10 pt-1">
                      <span>RECOMMENDED SPD:</span>
                      <span className="text-amber-400 font-bold">30 km/h</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 flex flex-col gap-3.5 flex-1 min-h-[220px]">
            <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <FileText className="h-3.5 w-3.5 text-sky-400" />
              CLOUD TELEMETRY AUDIT
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar max-h-[280px]">
              {logs.length === 0 ? (
                <p className="text-[10px] font-mono text-slate-500 text-center py-8">Awaiting audit signals...</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="text-[9.5px] font-mono leading-tight flex flex-col gap-0.5 border-b border-slate-900/60 pb-1.5">
                    <div className="flex justify-between text-slate-500">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`uppercase font-bold text-[8px] ${log.type === 'critical' ? 'text-red-500' : log.type === 'warning' ? 'text-amber-500' : 'text-sky-500'}`}>
                        {log.type}
                      </span>
                    </div>
                    <p className="text-slate-300">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* SECTION 4: BOTTOM ANALYSIS TELEMETRY BAY */}
      <footer className="bg-slate-950/90 border-t border-slate-900 px-6 py-6 z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Oscilloscope Vibration waves */}
          <div className="bg-[#080c16] border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span className="text-[10.5px] font-mono font-bold text-white uppercase tracking-wider">LIVE AXLE ACCELERATION (G)</span>
              <select 
                value={selectedTrainId}
                onChange={(e) => setSelectedTrainId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 font-mono outline-none"
              >
                {trains.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                ))}
              </select>
            </div>
            
            <div className="h-32 w-full mt-1.5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vibHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#10192e" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 9]} stroke="#475569" fontSize={8} fontFamily="monospace" />
                  <ChartTooltip 
                    contentStyle={{ background: '#020617', border: '1px solid #1e293b', fontSize: '9px', fontFamily: 'monospace' }}
                    labelStyle={{ color: '#64748b' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Vibration" 
                    stroke={activeTrainDetails.vibration >= 3.5 ? '#EF4444' : '#38BDF8'} 
                    strokeWidth={1.8} 
                    dot={false}
                    className={activeTrainDetails.vibration >= 3.5 ? 'glow-red' : 'glow-neon-blue'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-t border-slate-900 pt-2">
              <span>CURRENT PEAK: <strong className={activeTrainDetails.vibration >= 3.5 ? 'text-red-400' : 'text-slate-300'}>{activeTrainDetails.vibration?.toFixed(2)}G</strong></span>
              <span>NOMINAL TOLERANCE: &lt; 2.5G</span>
            </div>
          </div>

          {/* Segment Heatmap Grid */}
          <div className="bg-[#080c16] border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
            <span className="text-[10.5px] font-mono font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-2">SEGMENT SCANNING MESH (HEATMAP)</span>
            
            <div className="flex-1 flex flex-col justify-around gap-2.5 mt-1">
              {['mumbai-delhi', 'delhi-kolkata', 'kolkata-chennai'].map(route => {
                const routeFaults = faults.filter(f => f.route === route && f.status === 'ACTIVE');
                return (
                  <div key={route} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                      <span className="uppercase">{route.replace('-', ' → ')}</span>
                      <span className={routeFaults.length > 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {routeFaults.length > 0 ? `${routeFaults.length} FAULT ZONE(S)` : 'SECURED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-20 gap-0.5 h-3 bg-slate-950 border border-slate-900 rounded-sm overflow-hidden">
                      {Array.from({ length: 20 }).map((_, idx) => {
                        const segmentMin = idx * 5;
                        const segmentMax = (idx + 1) * 5;
                        
                        // Check if an active fault sits in this segment block range
                        const hasFault = routeFaults.some(
                          f => f.segmentIndex >= segmentMin && f.segmentIndex < segmentMax
                        );

                        return (
                          <div 
                            key={idx}
                            className={`h-full border-r border-slate-950/20 ${hasFault ? 'bg-red-500 glow-red animate-pulse' : 'bg-emerald-500/80 hover:bg-emerald-400'}`}
                            title={`Segment ${segmentMin}% - ${segmentMax}%`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fault history Table */}
          <div className="bg-[#080c16] border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
            <span className="text-[10.5px] font-mono font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-2">ACTIVE ANOMALY REGISTRY</span>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[110px] mt-1">
              <table className="w-full text-left font-mono text-[9px]">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500">
                    <th className="pb-1.5">ROUTE</th>
                    <th className="pb-1.5 text-center">SEGMENT</th>
                    <th className="pb-1.5 text-center">CONFIDENCE</th>
                    <th className="pb-1.5 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {faults.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-slate-500">No anomalies recorded in history.</td>
                    </tr>
                  ) : (
                    faults.slice(0, 5).map(fault => (
                      <tr key={fault.id}>
                        <td className="py-1 uppercase">{fault.route.replace('-', ' → ')}</td>
                        <td className="py-1 text-center">{fault.segmentIndex}%</td>
                        <td className="py-1 text-center">{fault.confidence} / 5</td>
                        <td className={`py-1 text-right font-bold ${fault.status === 'ACTIVE' ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                          {fault.status}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
