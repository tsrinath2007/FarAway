import React, { useState, useEffect } from 'react';
import { 
  Train, 
  Activity, 
  AlertTriangle, 
  Cpu, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  Clock,
  Layers
} from 'lucide-react';
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

// Simplified Count-Up Hook for Stats
function useCountUp(target, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(target);
    if (start === end) return;

    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 25);
    
    const timer = setInterval(() => {
      const stepValue = Math.ceil(end / (totalMiliseconds / incrementTime));
      start += stepValue;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState(new Date());

  // Overhauled Map Interactions States
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

  // 1. Live Ticking Clock (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Train position state for Step 1 animation
  const [trainPos, setTrainPos] = useState({ x: CITY_COORDS.kolkata.x, y: CITY_COORDS.kolkata.y });

  // 2. Auto-play effect with sub-second progress ticks (50ms interval)
  useEffect(() => {
    if (!isPlaying) {
      setProgress(0);
      return;
    }
    const tickTime = 50; // ms
    const increment = (tickTime / 3000) * 100; // 3 seconds total
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((current) => (current + 1) % 4);
          return 0;
        }
        return prev + increment;
      });
    }, tickTime);

    return () => clearInterval(timer);
  }, [isPlaying, activeStep]);

  // Train dynamic sliding simulation in Step 1
  useEffect(() => {
    if (activeStep !== 0) return;
    let t = 0;
    const interval = setInterval(() => {
      t = (t + 0.04) % 1.04;
      setTrainPos({
        x: CITY_COORDS.kolkata.x + t * (CITY_COORDS.bhubaneswar.x - CITY_COORDS.kolkata.x),
        y: CITY_COORDS.kolkata.y + t * (CITY_COORDS.bhubaneswar.y - CITY_COORDS.kolkata.y)
      });
    }, 80);
    return () => clearInterval(interval);
  }, [activeStep]);

  const handleStepSelect = (idx) => {
    setActiveStep(idx);
    setProgress(0);
  };

  const handlePrev = () => {
    setActiveStep((prev) => (prev - 1 + 4) % 4);
    setProgress(0);
  };

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % 4);
    setProgress(0);
  };

  // Hover and tooltip handlers for the India Map UI
  const handleStateMouseEnter = (loc, e) => {
    const stateName = loc.name || '';
    const stateId = loc.id || '';
    const nameLength = stateName.length;
    
    // Generate realistic, consistent telemetry scanning values deterministically
    const sensorsOnline = 12 + (nameLength * 7) % 20;
    const sensorsTotal = sensorsOnline + (nameLength % 3);
    const signalPercent = 88 + (nameLength * 2) % 13;
    const scannerStatus = nameLength % 3 === 0 ? 'CALIBRATING' : 'SCANNING - ACTIVE';
    const trafficFlow = nameLength % 5 === 0 ? 'SLOWED' : 'NORMAL';
    
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

  // Animate numbers for the bottom metrics cards
  const kmCount = useCountUp(87432);
  const faultsCount = useCountUp(14);
  const warnedCount = useCountUp(9);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans relative overflow-hidden scanline select-none">
      
      {/* SECTION 1: HERO HEADER (MINIMAL + CLOCK) */}
      <header className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between z-20 gap-4">
        {/* Logo and Icon */}
        <div className="flex items-center space-x-2.5">
          <div className="bg-red-600 p-2 rounded flex items-center justify-center animate-pulse">
            <Train className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-wider text-white font-mono flex items-center">
            PULSE <span className="text-red-500 ml-1">RAIL</span>
          </h1>
        </div>

        {/* Story Tagline Banner */}
        <div className="text-center flex-1 max-w-2xl px-4">
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white uppercase">
            Every train is a track inspector.
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            When a train detects a fault, every train behind it is warned — automatically.
          </p>
        </div>

        {/* Right Info: Live Indicator & Clock */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 font-mono tracking-wide">
              SYSTEM LIVE
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md text-slate-300">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-bold font-mono tracking-wider">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </div>
      </header>

      {/* SECTION 2: THE STORY (MAIN 65% VIEWPORT HEIGHT) */}
      <main className="flex-1 px-6 py-8 flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full z-10">
        
        {/* LEFT PANEL: 4-STEP STORY SLIDESHOW */}
        <div className="flex-1 flex flex-col justify-between max-w-md">
          <div className="space-y-4">
            
            {/* Slideshow Progress Bar */}
            <div className="flex flex-col space-y-1">
              <h3 className="text-xs font-mono text-slate-500 tracking-widest uppercase">
                AUTONOMOUS PROTECTION SEQUENCE
              </h3>
              <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900 mt-1">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-red-500 to-emerald-500 transition-all duration-75"
                  style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
                />
              </div>
            </div>

            {/* Step 1 Card */}
            <div 
              onClick={() => handleStepSelect(0)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                activeStep === 0 
                  ? 'bg-slate-900/80 border-blue-500/80 shadow-md shadow-blue-950/40 opacity-100 scale-[1.02]' 
                  : 'bg-slate-950/30 border-slate-900 opacity-40 hover:opacity-75'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-950 border border-blue-800 text-xs font-bold text-blue-400 font-mono">
                  1
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">
                    Train Passes Over Crack
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Passenger Train #12631 transits Bhubaneswar sector and records wheels hitting a structural rail defect.
                  </p>

                  {/* Dynamic Visual: Shaking waveform when step is active */}
                  {activeStep === 0 && (
                    <div className="mt-3">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">ACCELEROMETER VIBRATION SPIKE</span>
                      <svg viewBox="0 0 200 60" className="w-full h-12 bg-slate-950/80 border border-slate-800 rounded p-1">
                        <line x1="0" y1="30" x2="200" y2="30" stroke="#1E293B" strokeDasharray="2 2" />
                        <path
                          key="waveform-s1"
                          d="M 0,30 L 30,30 L 50,30 L 70,30 L 85,28 L 100,10 L 108,50 L 115,5 L 122,55 L 130,30 L 150,30 L 170,30 L 200,30"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="animate-draw"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2 Card */}
            <div 
              onClick={() => handleStepSelect(1)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                activeStep === 1 
                  ? 'bg-slate-900/80 border-red-500/80 shadow-md shadow-red-950/40 opacity-100 scale-[1.02]' 
                  : 'bg-slate-950/30 border-slate-900 opacity-40 hover:opacity-75'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-950 border border-red-800 text-xs font-bold text-red-400 font-mono">
                  2
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">
                    Anomalous Deflection Verified
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sensors confirm critical energy release. Anomaly flagged as severe track crack.
                  </p>

                  {/* Dynamic Visual: Warning Badge when step is active */}
                  {activeStep === 1 && (
                    <div className="mt-3 flex items-center space-x-3 bg-red-950/40 border border-red-900/60 rounded p-2 animate-pulse">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="text-[10px] font-mono text-red-400">
                        <div className="font-bold">FAULT VERIFIED: RAIL CRACK</div>
                        <div>COORDINATES: 20.3°N, 85.8°E // SEVERITY: CRITICAL</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3 Card */}
            <div 
              onClick={() => handleStepSelect(2)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                activeStep === 2 
                  ? 'bg-slate-900/80 border-amber-500/80 shadow-md shadow-amber-950/40 opacity-100 scale-[1.02]' 
                  : 'bg-slate-950/30 border-slate-900 opacity-40 hover:opacity-75'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-950 border border-amber-800 text-xs font-bold text-amber-400 font-mono">
                  3
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">
                    Autonomous Risk Calculation
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    AI agents query train schedules and locate two approaching trains within collision distance.
                  </p>

                  {/* Dynamic Visual: Agent processing readout */}
                  {activeStep === 2 && (
                    <div className="mt-3 bg-slate-950 border border-slate-800 rounded p-2 space-y-1 text-[10px] font-mono text-amber-500">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <Cpu className="h-3.5 w-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                          <span>COLLISION THREAT DETECTED</span>
                        </span>
                        <span className="font-bold">ETA: 4.2 MIN</span>
                      </div>
                      <div className="text-slate-500">
                        • Train #22846 (approaching Chennai-Kolkata segment)
                        <br />
                        • Train #18401 (approaching Kolkata-Chennai segment)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 4 Card */}
            <div 
              onClick={() => handleStepSelect(3)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                activeStep === 3 
                  ? 'bg-slate-900/80 border-emerald-500/80 shadow-md shadow-emerald-950/40 opacity-100 scale-[1.02]' 
                  : 'bg-slate-950/30 border-slate-900 opacity-40 hover:opacity-75'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-950 border border-emerald-800 text-xs font-bold text-emerald-400 font-mono">
                  4
                </span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">
                    Alerts Sent & Safety Secured
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cab signals are forced to slow down, stopping approaching traffic. Maintenance team receives coordinates.
                  </p>

                  {/* Dynamic Visual: Safety checklist */}
                  {activeStep === 3 && (
                    <div key="checklist-s4" className="mt-3 bg-emerald-950/20 border border-emerald-900/40 rounded p-2 text-[10px] font-mono text-emerald-400 space-y-1">
                      <div className="flex items-center space-x-1.5 animate-fade-in" style={{ animationDelay: '200ms' }}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Train #22846 Slowed to Safe Speed</span>
                      </div>
                      <div className="flex items-center space-x-1.5 animate-fade-in" style={{ animationDelay: '600ms' }}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Train #18401 Slowed to Safe Speed</span>
                      </div>
                      <div className="flex items-center space-x-1.5 animate-fade-in" style={{ animationDelay: '1000ms' }}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Repair Crew Notified (Zone B7)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SLIDESHOW CONTROLS */}
          <div className="mt-6 flex items-center justify-between bg-slate-950 border border-slate-900 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                {isPlaying ? 'AUTO-PLAY ACTIVE' : 'AUTO-PLAY PAUSED'}
              </span>
            </div>

            {/* Slider Dots & Arrows */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={handlePrev} 
                className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex space-x-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStepSelect(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeStep === idx ? 'w-4 bg-blue-500' : 'w-2 bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <button 
                onClick={handleNext} 
                className="p-1 rounded hover:bg-slate-905 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: LARGE DETAILED SVG MAP (OVERHAULED UI) */}
        <div 
          id="india-map-container"
          className="flex-1 bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden grid-scan min-h-[500px]"
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
          
          {/* Legend indicator */}
          <div className="absolute bottom-4 left-4 bg-slate-950/95 border border-slate-900/80 px-3 py-2 rounded-lg text-[9px] font-mono space-y-1.5 z-20 backdrop-blur-sm shadow-md">
            <div className="text-slate-500 font-bold uppercase tracking-widest text-[8px] border-b border-slate-900 pb-1 mb-1">Network Legend</div>
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-6 bg-sky-500/20 border border-sky-400/50 block rounded-full"></span>
              <span className="text-slate-300">Scanning Corridor</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 block glow-green"></span>
              <span className="text-slate-300">Junction Hub</span>
            </div>
            {activeStep > 0 && (
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-red-500 block glow-red animate-pulse"></span>
                <span className="text-red-400 font-bold">Anomaly Warning</span>
              </div>
            )}
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
                    {/* Track base backing */}
                    <path d={corridor.path} fill="none" stroke="#020617" strokeWidth="4.5" />
                    {/* Track neon outer glow */}
                    <path d={corridor.path} fill="none" stroke="#0EA5E9" strokeWidth="3" strokeOpacity="0.22" className="glow-neon-blue" />
                    {/* Track active center line */}
                    <path d={corridor.path} fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.75" />
                    {/* Active flowing train signal dashes */}
                    <path d={corridor.path} fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.85" className="animate-track-flow" />
                  </g>
                ))}
              </g>
            )}

            {/* Secondary Network Nodes (Ambient Beacons) */}
            {mapLayers.secondary && SECONDARY_HUBS.map((hub) => (
              <g key={hub.name} opacity="0.6">
                <circle cx={hub.x} cy={hub.y} r="2.5" fill="#38BDF8" />
                <circle cx={hub.x} cy={hub.y} r="5" fill="none" stroke="#38BDF8" strokeWidth="0.8" className="beacon-pulse-ring" />
              </g>
            ))}

            {/* Major Hub Junction Cities (Glowing rings) */}
            {mapLayers.junctions && Object.values(CITY_COORDS).map((city) => {
              if (city.name === 'BHUBANESWAR') return null; // handled dynamically in step overlays
              return (
                <g key={city.name} className="cursor-pointer" onClick={() => setActiveHub(city)}>
                  {/* Outer glow aura */}
                  <circle cx={city.x} cy={city.y} r="10" fill="#10B981" fillOpacity="0.12" />
                  {/* Inner green core */}
                  <circle cx={city.x} cy={city.y} r="4" fill="#10B981" className="glow-green" />
                  {/* Pulse ring */}
                  <circle cx={city.x} cy={city.y} r="8" fill="none" stroke="#10B981" strokeWidth="0.8" className="pulse-marker" />
                </g>
              );
            })}

            {/* City Text Labels (Operations Terminal Look) */}
            {mapLayers.junctions && (
              <g fill="rgba(148, 163, 184, 0.75)" fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="0.05em">
                <text x={CITY_COORDS.delhi.x + 8} y={CITY_COORDS.delhi.y + 3}>{CITY_COORDS.delhi.name}</text>
                <text x={CITY_COORDS.mumbai.x - 52} y={CITY_COORDS.mumbai.y + 3}>{CITY_COORDS.mumbai.name}</text>
                <text x={CITY_COORDS.kolkata.x + 8} y={CITY_COORDS.kolkata.y + 3}>{CITY_COORDS.kolkata.name}</text>
                <text x={CITY_COORDS.chennai.x + 8} y={CITY_COORDS.chennai.y + 3}>{CITY_COORDS.chennai.name}</text>
              </g>
            )}

            {/* Dynamic Layer: STEP 1 */}
            {activeStep === 0 && mapLayers.telemetry && (
              <g>
                {/* Moving Train Dot #12631 along Kolkata-Bhubaneswar track */}
                <circle cx={trainPos.x} cy={trainPos.y} r="12" fill="#FBBF24" fillOpacity="0.15" />
                <circle cx={trainPos.x} cy={trainPos.y} r="4.5" fill="#FBBF24" className="glow-yellow" />
                
                {/* Dynamic scan sweep ripple */}
                <circle cx={trainPos.x} cy={trainPos.y} r="18" fill="none" stroke="#FBBF24" strokeWidth="1" className="pulse-marker" />
                
                {/* Telemetry Pointer Leader Line */}
                <path 
                  d={`M ${trainPos.x} ${trainPos.y} L ${trainPos.x + 35} ${trainPos.y - 45} H ${trainPos.x + 90}`} 
                  fill="none" 
                  stroke="rgba(251, 191, 36, 0.6)" 
                  strokeWidth="0.8" 
                  strokeDasharray="2 2"
                />
                
                {/* HUD Telemetry card */}
                <foreignObject 
                  x={trainPos.x + 40} 
                  y={trainPos.y - 95} 
                  width="110" 
                  height="50"
                  className="overflow-visible"
                >
                  <div className="bg-slate-950/90 border border-amber-500/40 p-1.5 rounded font-mono text-[8px] space-y-0.5 leading-none shadow-md">
                    <div className="font-bold text-amber-400 border-b border-amber-500/20 pb-0.5 mb-1 flex justify-between">
                      <span>LOCO #12631</span>
                      <span className="animate-pulse">● LIVE</span>
                    </div>
                    <div className="text-white flex justify-between"><span>SPD:</span> <span>110 KM/H</span></div>
                    <div className="text-white flex justify-between"><span>VIB:</span> <span>0.12G (OK)</span></div>
                    <div className="text-white flex justify-between"><span>TEMP:</span> <span>34.2°C</span></div>
                  </div>
                </foreignObject>
              </g>
            )}

            {/* Dynamic Layer: STEP 2 */}
            {activeStep === 1 && mapLayers.telemetry && (
              <g>
                {/* Train has cleared the crack site */}
                <circle cx={345} cy={425} r="3" fill="rgba(148, 163, 184, 0.4)" />
                
                {/* RED PULSING CRACK DOT AT BHUBANESWAR */}
                <circle cx={CITY_COORDS.bhubaneswar.x} cy={CITY_COORDS.bhubaneswar.y} r="14" fill="#EF4444" fillOpacity="0.15" />
                <circle cx={CITY_COORDS.bhubaneswar.x} cy={CITY_COORDS.bhubaneswar.y} r="5" fill="#EF4444" className="glow-red" />
                <circle cx={CITY_COORDS.bhubaneswar.x} cy={CITY_COORDS.bhubaneswar.y} r="22" fill="none" stroke="#EF4444" strokeWidth="1.5" className="pulse-marker" />
                
                {/* Target Reticle Crosshair */}
                <g stroke="#EF4444" strokeWidth="1">
                  <line x1={CITY_COORDS.bhubaneswar.x - 12} y1={CITY_COORDS.bhubaneswar.y} x2={CITY_COORDS.bhubaneswar.x - 8} y2={CITY_COORDS.bhubaneswar.y} />
                  <line x1={CITY_COORDS.bhubaneswar.x + 8} y1={CITY_COORDS.bhubaneswar.y} x2={CITY_COORDS.bhubaneswar.x + 12} y2={CITY_COORDS.bhubaneswar.y} />
                  <line x1={CITY_COORDS.bhubaneswar.x} y1={CITY_COORDS.bhubaneswar.y - 12} x2={CITY_COORDS.bhubaneswar.x} y2={CITY_COORDS.bhubaneswar.y - 8} />
                  <line x1={CITY_COORDS.bhubaneswar.x} y1={CITY_COORDS.bhubaneswar.y + 8} x2={CITY_COORDS.bhubaneswar.x} y2={CITY_COORDS.bhubaneswar.y + 12} />
                </g>
                
                {/* Telemetry Pointer Leader Line */}
                <path 
                  d={`M ${CITY_COORDS.bhubaneswar.x} ${CITY_COORDS.bhubaneswar.y} L ${CITY_COORDS.bhubaneswar.x - 45} ${CITY_COORDS.bhubaneswar.y - 45} H ${CITY_COORDS.bhubaneswar.x - 105}`} 
                  fill="none" 
                  stroke="rgba(239, 68, 68, 0.7)" 
                  strokeWidth="0.8" 
                  strokeDasharray="2 2"
                />
                
                {/* HUD Telemetry Card */}
                <foreignObject 
                  x={CITY_COORDS.bhubaneswar.x - 145} 
                  y={CITY_COORDS.bhubaneswar.y - 100} 
                  width="115" 
                  height="55"
                  className="overflow-visible"
                >
                  <div className="bg-slate-950/90 border border-red-500/50 p-1.5 rounded font-mono text-[8px] space-y-0.5 leading-none shadow-md shadow-red-950/30">
                    <div className="font-bold text-red-500 border-b border-red-500/20 pb-0.5 mb-1 flex justify-between animate-pulse">
                      <span>▲ CRACK DETECTED</span>
                    </div>
                    <div className="text-white flex justify-between"><span>VIB G-FORCE:</span> <span className="text-red-400 font-bold">4.82G</span></div>
                    <div className="text-white flex justify-between"><span>DEFLECT:</span> <span className="text-red-400 font-bold">+12.8mm</span></div>
                    <div className="text-white flex justify-between"><span>SEVERITY:</span> <span className="text-red-400 font-bold">CRITICAL</span></div>
                  </div>
                </foreignObject>
              </g>
            )}

            {/* Dynamic Layer: STEP 3 */}
            {activeStep === 2 && mapLayers.telemetry && (
              <g>
                {/* Warning marker at defect */}
                <circle cx={CITY_COORDS.bhubaneswar.x} cy={CITY_COORDS.bhubaneswar.y} r="5" fill="#EF4444" className="glow-red" />
                <circle cx={CITY_COORDS.bhubaneswar.x} cy={CITY_COORDS.bhubaneswar.y} r="10" fill="none" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="2 2" />

                {/* Train #22846 approaching from Chennai (x=317, y=477) */}
                <circle cx="317" cy="477" r="12" fill="#F59E0B" fillOpacity="0.15" />
                <circle cx="317" cy="477" r="4.5" fill="#F59E0B" className="glow-yellow" />
                <circle cx="317" cy="477" r="18" fill="none" stroke="#F59E0B" strokeWidth="0.8" className="pulse-marker" />
                <line x1="317" y1="477" x2={CITY_COORDS.bhubaneswar.x} y2={CITY_COORDS.bhubaneswar.y} stroke="#EF4444" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.7" />
                
                {/* Train 1 Telemetry Pointer Line */}
                <path 
                  d="M 317 477 L 277 477 L 277 437 H 217" 
                  fill="none" 
                  stroke="rgba(245, 158, 11, 0.6)" 
                  strokeWidth="0.8" 
                  strokeDasharray="2 2"
                />
                <foreignObject 
                  x="155" 
                  y="387" 
                  width="110" 
                  height="50"
                  className="overflow-visible"
                >
                  <div className="bg-slate-950/90 border border-amber-500/40 p-1.5 rounded font-mono text-[8px] space-y-0.5 leading-none shadow-md">
                    <div className="font-bold text-amber-400 border-b border-amber-500/20 pb-0.5 mb-1 flex justify-between">
                      <span>TRAIN #22846</span>
                    </div>
                    <div className="text-white flex justify-between"><span>DISTANCE:</span> <span>9.2 km</span></div>
                    <div className="text-white flex justify-between"><span>SPD:</span> <span>95 KM/H</span></div>
                    <div className="text-red-400 font-bold flex justify-between"><span>ETA IMPACT:</span> <span>3M 45S</span></div>
                  </div>
                </foreignObject>

                {/* Train #18401 approaching from Kolkata (x=395, y=388) */}
                <circle cx="395" cy="388" r="12" fill="#F59E0B" fillOpacity="0.15" />
                <circle cx="395" cy="388" r="4.5" fill="#F59E0B" className="glow-yellow" />
                <circle cx="395" cy="388" r="18" fill="none" stroke="#F59E0B" strokeWidth="0.8" className="pulse-marker" />
                <line x1="395" y1="388" x2={CITY_COORDS.bhubaneswar.x} y2={CITY_COORDS.bhubaneswar.y} stroke="#EF4444" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.7" />
                
                {/* Train 2 Telemetry Pointer Line */}
                <path 
                  d="M 395 388 L 435 388 L 435 348 H 485" 
                  fill="none" 
                  stroke="rgba(245, 158, 11, 0.6)" 
                  strokeWidth="0.8" 
                  strokeDasharray="2 2"
                />
                <foreignObject 
                  x="490" 
                  y="303" 
                  width="110" 
                  height="50"
                  className="overflow-visible"
                >
                  <div className="bg-slate-950/90 border border-amber-500/40 p-1.5 rounded font-mono text-[8px] space-y-0.5 leading-none shadow-md">
                    <div className="font-bold text-amber-400 border-b border-amber-500/20 pb-0.5 mb-1 flex justify-between">
                      <span>TRAIN #18401</span>
                    </div>
                    <div className="text-white flex justify-between"><span>DISTANCE:</span> <span>12.4 km</span></div>
                    <div className="text-white flex justify-between"><span>SPD:</span> <span>105 KM/H</span></div>
                    <div className="text-red-400 font-bold flex justify-between"><span>ETA IMPACT:</span> <span>5M 12S</span></div>
                  </div>
                </foreignObject>
              </g>
            )}

            {/* Dynamic Layer: STEP 4 */}
            {activeStep === 3 && mapLayers.telemetry && (
              <g>
                {/* Defect is contained (turns orange) */}
                <circle cx={CITY_COORDS.bhubaneswar.x} cy={CITY_COORDS.bhubaneswar.y} r="6" fill="#F97316" className="glow-orange" />
                <circle cx={CITY_COORDS.bhubaneswar.x} cy={CITY_COORDS.bhubaneswar.y} r="12" fill="none" stroke="#F97316" strokeWidth="0.8" strokeDasharray="3 3" />
                
                {/* Warned Train A stops (green check) */}
                <circle cx="317" cy="477" r="12" fill="#10B981" fillOpacity="0.15" />
                <circle cx="317" cy="477" r="4.5" fill="#10B981" className="glow-green" />
                <circle cx="317" cy="477" r="18" fill="none" stroke="#10B981" strokeWidth="0.8" className="pulse-marker" />
                
                <path 
                  d="M 317 477 L 277 477 L 277 437 H 217" 
                  fill="none" 
                  stroke="rgba(16, 185, 129, 0.6)" 
                  strokeWidth="0.8" 
                  strokeDasharray="2 2"
                />
                <foreignObject 
                  x="155" 
                  y="387" 
                  width="110" 
                  height="50"
                  className="overflow-visible"
                >
                  <div className="bg-slate-950/90 border border-emerald-500/50 p-1.5 rounded font-mono text-[8px] space-y-0.5 leading-none shadow-md shadow-emerald-950/20">
                    <div className="font-bold text-emerald-400 border-b border-emerald-500/20 pb-0.5 mb-1 flex justify-between">
                      <span>TRAIN #22846</span>
                      <span>✓ SAFE</span>
                    </div>
                    <div className="text-white flex justify-between"><span>CURRENT SPD:</span> <span className="text-emerald-400 font-bold">0 KM/H</span></div>
                    <div className="text-white flex justify-between"><span>SIGNAL ALARM:</span> <span>SAFE-STOP</span></div>
                    <div className="text-emerald-400 font-bold flex justify-between"><span>BRAKE:</span> <span>ENGAGED</span></div>
                  </div>
                </foreignObject>

                {/* Warned Train B stops (green check) */}
                <circle cx="395" cy="388" r="12" fill="#10B981" fillOpacity="0.15" />
                <circle cx="395" cy="388" r="4.5" fill="#10B981" className="glow-green" />
                <circle cx="395" cy="388" r="18" fill="none" stroke="#10B981" strokeWidth="0.8" className="pulse-marker" />
                
                <path 
                  d="M 395 388 L 435 388 L 435 348 H 485" 
                  fill="none" 
                  stroke="rgba(16, 185, 129, 0.6)" 
                  strokeWidth="0.8" 
                  strokeDasharray="2 2"
                />
                <foreignObject 
                  x="490" 
                  y="303" 
                  width="110" 
                  height="50"
                  className="overflow-visible"
                >
                  <div className="bg-slate-950/90 border border-emerald-500/50 p-1.5 rounded font-mono text-[8px] space-y-0.5 leading-none shadow-md shadow-emerald-950/20">
                    <div className="font-bold text-emerald-400 border-b border-emerald-500/20 pb-0.5 mb-1 flex justify-between">
                      <span>TRAIN #18401</span>
                      <span>✓ SAFE</span>
                    </div>
                    <div className="text-white flex justify-between"><span>CURRENT SPD:</span> <span className="text-emerald-400 font-bold">0 KM/H</span></div>
                    <div className="text-white flex justify-between"><span>SIGNAL ALARM:</span> <span>SAFE-STOP</span></div>
                    <div className="text-emerald-400 font-bold flex justify-between"><span>BRAKE:</span> <span>ENGAGED</span></div>
                  </div>
                </foreignObject>

                {/* Repair Crew dispatched near Bhubaneswar */}
                <g transform="translate(378, 420)" className="animate-bounce">
                  <rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="#3B82F6" className="glow-blue" />
                  <circle cx="0" cy="0" r="10" fill="none" stroke="#3B82F6" strokeWidth="1.2" className="beacon-pulse-ring" />
                </g>
                
                <path 
                  d={`M 378 420 L 418 420 H 458`} 
                  fill="none" 
                  stroke="rgba(59, 130, 246, 0.6)" 
                  strokeWidth="0.8" 
                  strokeDasharray="2 2"
                />
                <foreignObject 
                  x="463" 
                  y="395" 
                  width="110" 
                  height="45"
                  className="overflow-visible"
                >
                  <div className="bg-slate-950/90 border border-blue-500/50 p-1.5 rounded font-mono text-[8px] space-y-0.5 leading-none shadow-md shadow-blue-950/20">
                    <div className="font-bold text-blue-400 border-b border-blue-500/20 pb-0.5 mb-1 flex justify-between">
                      <span>REPAIR CREW</span>
                    </div>
                    <div className="text-white flex justify-between"><span>ZONE SECTOR:</span> <span>B7</span></div>
                    <div className="text-white flex justify-between"><span>STATUS:</span> <span className="text-blue-400 font-bold">DISPATCHED</span></div>
                  </div>
                </foreignObject>
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
                <span className={`font-bold ${hoveredState.scannerStatus.includes('ACTIVE') ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                  {hoveredState.scannerStatus}
                </span>
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
            <span className="text-[10px] font-mono tracking-wider text-slate-400 block">
              {activeStep === 0 && 'STEP 1: Locomotive Accelerometers Scan Rail Structural Vibration'}
              {activeStep === 1 && 'STEP 2: Vibration Deviation Exceeds Threshold — Critical Crack Verified'}
              {activeStep === 2 && 'STEP 3: Spatial Agent Analyzes Rail Schedule & Identifies Collision Risk'}
              {activeStep === 3 && 'STEP 4: Cab Signals Slow Trains Automatically — Repair Team Deployed'}
            </span>
          </div>
        </div>

      </main>

      {/* SECTION 3: IMPACT BAR AT BOTTOM (3 CARDS ONLY) */}
      <footer className="bg-slate-950/90 border-t border-slate-900 px-6 py-6 z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-[#0B0F19] border border-slate-900 rounded-lg p-5 flex flex-col items-center text-center">
            <div className="text-[10px] font-mono text-blue-400 tracking-widest uppercase">
              Coverage Scanned Today
            </div>
            <h3 className="text-3xl font-bold font-mono text-white mt-1">
              {kmCount.toLocaleString()} <span className="text-lg text-blue-500 font-sans">km</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              By 13,247 trains. No new hardware.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0B0F19] border border-slate-900 rounded-lg p-5 flex flex-col items-center text-center">
            <div className="text-[10px] font-mono text-red-400 tracking-widest uppercase">
              Track Anomalies Detected
            </div>
            <h3 className="text-3xl font-bold font-mono text-white mt-1">
              {faultsCount} <span className="text-xs text-red-500 font-mono font-medium">CRITICAL</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Average 1.8 seconds detection time.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0B0F19] border border-slate-900 rounded-lg p-5 flex flex-col items-center text-center">
            <div className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase">
              Train Cab Warnings Dispatched
            </div>
            <h3 className="text-3xl font-bold font-mono text-white mt-1">
              {warnedCount} <span className="text-xs text-emerald-400 font-mono font-medium">SUCCESS</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Zero new trackside sensors.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
