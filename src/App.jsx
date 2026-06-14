import React, { useState, useEffect, useRef } from 'react';
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
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import indiaMap from '@svg-maps/india';

// Coordinates for key cities calibrated for the 612x696 @svg-maps/india viewbox
const CITIES = {
  delhi: { x: 188, y: 205, name: 'Delhi' },
  mumbai: { x: 135, y: 430, name: 'Mumbai' },
  kolkata: { x: 425, y: 370, name: 'Kolkata' },
  chennai: { x: 245, y: 585, name: 'Chennai' },
  bhubaneswar: { x: 365, y: 405, name: 'Bhubaneswar' }
};

// Secondary monitoring nodes representing nationwide track inspections
const SECONDARY_HUBS = [
  { name: 'Hyderabad', x: 250, y: 490 },
  { name: 'Bengaluru', x: 215, y: 575 },
  { name: 'Ahmedabad', x: 105, y: 365 },
  { name: 'Jaipur', x: 155, y: 245 },
  { name: 'Nagpur', x: 265, y: 395 },
  { name: 'Guwahati', x: 520, y: 285 },
  { name: 'Lucknow', x: 255, y: 228 },
  { name: 'Patna', x: 355, y: 258 }
];

// Count-up hook for numbers
function useCountUp(targetString, isPlaying, duration = 1500) {
  const [value, setValue] = useState(0);
  const target = parseInt(targetString.replace(/,/g, ''), 10);
  
  useEffect(() => {
    if (!isPlaying) return;
    let start = 0;
    const totalTicks = 60;
    const tickDuration = duration / totalTicks;
    let tick = 0;
    
    const timer = setInterval(() => {
      tick++;
      const progress = tick / totalTicks;
      const easeProgress = 1 - Math.pow(1 - progress, 2); // Ease out
      const current = Math.floor(easeProgress * target);
      setValue(current);
      if (tick >= totalTicks) {
        clearInterval(timer);
        setValue(target);
      }
    }, tickDuration);
    
    return () => clearInterval(timer);
  }, [targetString, isPlaying, target, duration]);

  return value.toLocaleString();
}

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [subProgress, setSubProgress] = useState(0); // 0 to 100 within a step
  const [vibrations, setVibrations] = useState(() => 
    Array.from({ length: 40 }, () => 10 + Math.random() * 5)
  );
  const [time, setTime] = useState(new Date());
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // State for interactive map hovers
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsHowItWorksOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync subProgress with 3-second step duration (30ms * 100 = 3s)
  useEffect(() => {
    let interval;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setSubProgress((prev) => {
          if (prev >= 100) {
            setActiveStep((step) => (step + 1) % 4);
            return 0;
          }
          return prev + 1;
        });
      }, 30);
    } else {
      setSubProgress(100);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, activeStep]);

  // Handle live scrolling vibration graph in Card 1
  useEffect(() => {
    let tickCount = 0;
    const timer = setInterval(() => {
      setVibrations((prev) => {
        const next = [...prev];
        next.shift();
        
        let val = 10 + Math.random() * 5; // Base normal signal
        
        if (activeStep === 0) {
          if (isAutoPlaying) {
            // Autoplay: inject chaotic noise modulated by sine envelope
            if (subProgress > 30 && subProgress < 75) {
              const x = (subProgress - 30) / 45; // 0 to 1
              const envelope = Math.sin(x * Math.PI);
              const spikeNoise = 10 + Math.random() * 38; // Jagged noise
              val += envelope * spikeNoise;
            }
          } else {
            // Manual: periodically inject severe spikes
            tickCount = (tickCount + 1) % 40;
            if (tickCount > 10 && tickCount < 25) {
              const x = (tickCount - 10) / 15; // 0 to 1
              const envelope = Math.sin(x * Math.PI);
              const spikeNoise = 15 + Math.random() * 42; // Severe jagged noise
              val += envelope * spikeNoise;
            }
          }
        }
        
        next.push(val);
        return next;
      });
    }, 70);

    return () => clearInterval(timer);
  }, [activeStep, subProgress, isAutoPlaying]);

  // Jump to step manually
  const goToStep = (stepIndex) => {
    setIsAutoPlaying(false);
    setActiveStep(stepIndex);
    setSubProgress(100);
  };

  const nextStep = () => {
    setIsAutoPlaying(false);
    setActiveStep((prev) => (prev + 1) % 4);
    setSubProgress(100);
  };

  const prevStep = () => {
    setIsAutoPlaying(false);
    setActiveStep((prev) => (prev - 1 + 4) % 4);
    setSubProgress(100);
  };

  // Map state interactive handlers
  const handleStateMouseEnter = (loc, e) => {
    const name = loc.name || '';
    const nameLength = name.length;
    
    const sensorsOnline = 15 + (nameLength * 7) % 25;
    const sensorsTotal = sensorsOnline + (nameLength % 3);
    const signalPercent = 89 + (nameLength * 3) % 11;
    const trafficFlow = nameLength % 5 === 0 ? 'RESTRICTED' : 'NORMAL';
    
    setHoveredState({
      name: name.toUpperCase(),
      sensorsOnline,
      sensorsTotal,
      signalPercent,
      trafficFlow
    });
  };

  const handleStateMouseMove = (e) => {
    const container = document.getElementById('india-map-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleStateMouseLeave = () => {
    setHoveredState(null);
  };

  // Fixed coordinates for the detecting train (#12631) - midway between Kolkata and Bhubaneswar
  const getStep1TrainCoords = () => {
    return {
      x: 395, 
      y: 387
    };
  };

  // Fixed coordinates for approaching trains in Step 3 - midway points
  const getStep3Train1Coords = () => {
    // Chennai to Bhubaneswar midway
    return {
      x: 305, 
      y: 495
    };
  };

  const getStep3Train2Coords = () => {
    // Kolkata to Bhubaneswar midway
    return {
      x: 395, 
      y: 387
    };
  };

  // Impact stats count-up values
  const kmMonitored = useCountUp("87,432", true);
  const faultsDetected = useCountUp("14", true);
  const trainsWarned = useCountUp("9", true);

  return (
    <div className="min-h-screen bg-[#050b18] text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500/30 selection:text-white">
      
      {/* SECTION 1 - HERO HEADER */}
      <header className="border-b border-slate-900/80 bg-[#060e22]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo with small train icon */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 p-2 rounded-lg shadow-lg shadow-sky-950/40">
              <Train className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-widest text-white">PULSE<span className="text-sky-400">RAIL</span></span>
              <span className="hidden sm:inline-block text-[9px] font-mono tracking-widest text-slate-500 uppercase ml-2 border-l border-slate-800 pl-2">System Live</span>
            </div>
          </div>

          {/* Autoplay status and quick controls */}
          <div className="flex items-center gap-4">
            {/* Conceptual Slide Modal trigger */}
            <button 
              onClick={() => setIsHowItWorksOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide bg-[#091127] text-sky-400 border border-slate-900 hover:text-white hover:border-slate-800 transition-all cursor-pointer flex items-center gap-2"
            >
              <Cpu className="h-3.5 w-3.5 text-sky-400" />
              HOW IT WORKS
            </button>

            <button 
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                isAutoPlaying 
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {isAutoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isAutoPlaying ? 'AUTO PLAYING' : 'PAUSED'}
            </button>

            {/* Small top right clock */}
            <div className="flex items-center gap-2 bg-[#091127] border border-slate-900 px-3 py-1.5 rounded-full text-slate-300">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold font-mono tracking-wider">
                {time.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
          </div>

        </div>

        {/* Minimal Hero Header Text */}
        <div className="max-w-4xl mx-auto text-center py-6 px-4">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
            Every train is a track inspector.
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-medium">
            When a train detects a fault, every train behind it is warned — automatically.
          </p>
        </div>
      </header>

      {/* SECTION 2 - THE STORY (65% screen height on large displays) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-4 flex flex-col lg:flex-row gap-8 items-stretch justify-center min-h-[500px]">
        
        {/* Left Column: Numbered Story Cards */}
        <div className="w-full lg:w-[45%] flex flex-col justify-between gap-4">
          
          {/* Card Navigation Progress Bars */}
          <div className="grid grid-cols-4 gap-2.5 pb-2">
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx}
                onClick={() => goToStep(idx)}
                className="h-1.5 rounded-full bg-slate-900 cursor-pointer overflow-hidden relative"
              >
                <div 
                  className={`h-full absolute left-0 top-0 transition-all ${
                    activeStep === idx 
                      ? 'bg-sky-400' 
                      : activeStep > idx ? 'bg-sky-600/60' : 'bg-transparent'
                  }`}
                  style={{ 
                    width: activeStep === idx ? `${subProgress}%` : activeStep > idx ? '100%' : '0%',
                    transition: activeStep === idx && isAutoPlaying ? 'width 30ms linear' : 'width 200ms ease'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Step Cards List */}
          <div className="flex-1 flex flex-col justify-between gap-4">
            
            {/* Step 1 Card */}
            <div 
              onClick={() => goToStep(0)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                activeStep === 0 
                  ? 'bg-[#0f1b35] border-sky-500/50 shadow-md shadow-sky-950/20' 
                  : 'bg-[#080f21] border-slate-900 opacity-60 hover:opacity-85'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${activeStep === 0 ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-500'}`}>01</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white leading-tight">
                    Train #12631 passes over a cracked rail near Bhubaneswar
                  </h3>
                  
                  {activeStep === 0 && (
                    <div className="mt-3 bg-slate-950/60 border border-slate-900 rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
                        <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-sky-400" /> Live Axle Vibration</span>
                        <span className={vibrations.some(v => v > 20) ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400'}>
                          {vibrations.some(v => v > 20) ? `ANOMALY DETECTED (${(Math.max(...vibrations) / 10).toFixed(1)}G)` : `NOMINAL (${(vibrations[vibrations.length - 1] / 10).toFixed(1)}G)`}
                        </span>
                      </div>
                      
                      {/* Scrolling Graph */}
                      <svg width="100%" height="50" className="mt-2">
                        {vibrations.map((v, i) => {
                          if (i === 0) return null;
                          const x1 = (i - 1) * 8;
                          const y1 = 50 - vibrations[i - 1];
                          const x2 = i * 8;
                          const y2 = 50 - vibrations[i];
                          const isSpike = vibrations[i - 1] > 20 || vibrations[i] > 20;
                          return (
                            <line 
                              key={i} 
                              x1={`${(i - 1) * 2.5}%`} 
                              y1={y1} 
                              x2={`${i * 2.5}%`} 
                              y2={y2} 
                              stroke={isSpike ? '#f87171' : '#38bdf8'} 
                              strokeWidth={isSpike ? 2.5 : 1.5}
                              className={isSpike ? 'glow-red' : ''}
                            />
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2 Card */}
            <div 
              onClick={() => goToStep(1)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                activeStep === 1 
                  ? 'bg-[#1e131d] border-red-500/50 shadow-md shadow-red-950/20' 
                  : 'bg-[#080f21] border-slate-900 opacity-60 hover:opacity-85'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${activeStep === 1 ? 'bg-red-500 text-slate-950' : 'bg-slate-900 text-slate-500'}`}>02</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white leading-tight">
                    Abnormal vibration detected — Rail Crack confirmed
                  </h3>
                  
                  {activeStep === 1 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-red-950/30 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 font-mono">STATUS</span>
                        <span className="text-red-400 font-bold flex items-center gap-1.5 mt-0.5 animate-pulse">
                          <AlertTriangle className="h-3 w-3" /> CRITICAL FAULT
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 font-mono">SEVERITY</span>
                        <span className="text-white font-bold mt-0.5">HIGH IMPACT</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 font-mono">LOCATION</span>
                        <span className="text-sky-400 font-mono font-bold mt-0.5">20.3°N, 85.8°E</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 font-mono">CONFIRMED BY</span>
                        <span className="text-slate-300 font-bold mt-0.5">Automated AI Consensus</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3 Card */}
            <div 
              onClick={() => goToStep(2)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                activeStep === 2 
                  ? 'bg-[#0e1c28] border-amber-500/50 shadow-md shadow-amber-950/20' 
                  : 'bg-[#080f21] border-slate-900 opacity-60 hover:opacity-85'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${activeStep === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500'}`}>03</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white leading-tight">
                    Autonomous agent calculates risk — 2 trains approaching within 15km
                  </h3>
                  
                  {activeStep === 2 && (
                    <div className="mt-3 bg-slate-950/60 border border-slate-900 rounded-lg p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 relative">
                          <Cpu className="h-4.5 w-4.5 text-amber-400" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block">COLLISION MITIGATION</span>
                          <span className="text-xs text-slate-300 font-bold">Computing safe slow-down zones</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono block">NEXT TRAIN ETA</span>
                        <span className="text-sm font-extrabold text-amber-400 font-mono">4.2 minutes</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 4 Card */}
            <div 
              onClick={() => goToStep(3)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                activeStep === 3 
                  ? 'bg-[#0d1f1d] border-emerald-500/50 shadow-md shadow-emerald-950/20' 
                  : 'bg-[#080f21] border-slate-900 opacity-60 hover:opacity-85'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${activeStep === 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-500'}`}>04</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white leading-tight">
                    Alerts dispatched. Trains slow down. Maintenance team notified.
                  </h3>
                  
                  {activeStep === 3 && (
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2.5 py-1 px-2 bg-slate-950/50 rounded border border-slate-900">
                        <CheckCircle2 className={`h-4 w-4 text-emerald-400 transition-opacity duration-300 ${subProgress > 20 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                        <span className="text-slate-300 font-medium">Train #22846 warned — slows down automatically</span>
                      </div>
                      <div className="flex items-center gap-2.5 py-1 px-2 bg-slate-950/50 rounded border border-slate-900">
                        <CheckCircle2 className={`h-4 w-4 text-emerald-400 transition-opacity duration-300 ${subProgress > 55 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                        <span className="text-slate-300 font-medium">Train #18401 warned — slows down automatically</span>
                      </div>
                      <div className="flex items-center gap-2.5 py-1 px-2 bg-slate-950/50 rounded border border-slate-900">
                        <CheckCircle2 className={`h-4 w-4 text-emerald-400 transition-opacity duration-300 ${subProgress > 80 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                        <span className="text-slate-300 font-medium">Maintenance Team B7 notified with GPS details</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Prev/Next Manual Navigation */}
          <div className="flex justify-between items-center bg-[#070e20] border border-slate-900 p-2.5 rounded-xl">
            <button 
              onClick={prevStep}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-xs font-mono font-bold text-slate-500">Step {activeStep + 1} of 4</span>
            <button 
              onClick={nextStep}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Right Column: Holographic SVG Map of India */}
        <div 
          id="india-map-container"
          className="flex-1 bg-[#070e20]/60 border border-slate-900/90 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]"
        >
          
          {/* Cyber Corner Brackets */}
          <div className="cyber-corner cyber-corner-tl"></div>
          <div className="cyber-corner cyber-corner-tr"></div>
          <div className="cyber-corner cyber-corner-bl"></div>
          <div className="cyber-corner cyber-corner-br"></div>

          {/* Cyber-themed background design details */}
          <div className="absolute top-3 left-4 text-[9px] font-mono text-slate-600 tracking-[0.2em] pointer-events-none select-none">
            TACTICAL MONITORING INTERFACE
          </div>
          <div className="absolute bottom-3 right-4 text-[9px] font-mono text-slate-600 tracking-[0.2em] pointer-events-none select-none flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> STEP SYNC: {subProgress}%
          </div>

          <svg viewBox="0 0 612 696" className="w-full h-full max-h-[500px] select-none relative z-10">
            {/* Outline grid pattern */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.015)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

            {/* Detailed States of India from @svg-maps/india */}
            {indiaMap.locations.map((loc) => {
              const isHovered = hoveredState && hoveredState.name === loc.name.toUpperCase();
              return (
                <path
                  key={loc.id}
                  d={loc.path}
                  name={loc.name}
                  id={loc.id}
                  fill={isHovered ? 'rgba(14, 165, 233, 0.12)' : 'rgba(11, 15, 25, 0.55)'}
                  stroke={isHovered ? 'rgba(14, 165, 233, 0.7)' : 'rgba(56, 189, 248, 0.14)'}
                  strokeWidth={isHovered ? '1.5' : '0.8'}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={(e) => handleStateMouseEnter(loc, e)}
                  onMouseMove={handleStateMouseMove}
                  onMouseLeave={handleStateMouseLeave}
                />
              );
            })}

            {/* 3 Main Railway lines */}
            {/* Mumbai to Delhi */}
            <path
              d={`M ${CITIES.mumbai.x},${CITIES.mumbai.y} L ${CITIES.delhi.x},${CITIES.delhi.y}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={`M ${CITIES.mumbai.x},${CITIES.mumbai.y} L ${CITIES.delhi.x},${CITIES.delhi.y}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Delhi to Kolkata */}
            <path
              d={`M ${CITIES.delhi.x},${CITIES.delhi.y} L ${CITIES.kolkata.x},${CITIES.kolkata.y}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={`M ${CITIES.delhi.x},${CITIES.delhi.y} L ${CITIES.kolkata.x},${CITIES.kolkata.y}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Kolkata to Chennai (passes near Bhubaneswar) */}
            <path
              d={`M ${CITIES.kolkata.x},${CITIES.kolkata.y} L ${CITIES.bhubaneswar.x},${CITIES.bhubaneswar.y} L ${CITIES.chennai.x},${CITIES.chennai.y}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={`M ${CITIES.kolkata.x},${CITIES.kolkata.y} L ${CITIES.bhubaneswar.x},${CITIES.bhubaneswar.y} L ${CITIES.chennai.x},${CITIES.chennai.y}`}
              fill="none"
              stroke={
                activeStep === 0 ? 'rgba(56, 189, 248, 0.5)' : 
                activeStep === 1 ? 'rgba(239, 68, 68, 0.5)' : 
                activeStep === 2 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(16, 185, 129, 0.5)'
              }
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* City Nodes */}
            {Object.values(CITIES).map((city) => (
              <g key={city.name} transform={`translate(${city.x}, ${city.y})`}>
                <circle r="4.5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                <text 
                  x="8" 
                  y="4" 
                  fill="#94a3b8" 
                  fontSize="10" 
                  fontWeight="bold" 
                  fontFamily="monospace"
                  className="pointer-events-none select-none"
                >
                  {city.name.toUpperCase()}
                </text>
              </g>
            ))}

            {/* Secondary monitoring hubs */}
            {SECONDARY_HUBS.map((hub) => (
              <g key={hub.name} transform={`translate(${hub.x}, ${hub.y})`}>
                <circle r="1.5" fill="#10B981" className="glow-neon-green" />
              </g>
            ))}

            {/* --- STEP-DRIVEN DYNAMIC LAYERS --- */}

            {/* Step 1: Static Train dot positioned midway */}
            {activeStep === 0 && (
              <g>
                {/* Core train dot */}
                <circle 
                  cx={getStep1TrainCoords().x} 
                  cy={getStep1TrainCoords().y} 
                  r="6" 
                  fill="#38bdf8" 
                  className="glow-neon-blue"
                />
                {/* Train Label */}
                <g transform={`translate(${getStep1TrainCoords().x - 45}, ${getStep1TrainCoords().y - 20})`}>
                  <rect width="90" height="15" rx="3" fill="#0c152b" stroke="#38bdf8" strokeWidth="0.8" />
                  <text x="45" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    TRAIN #12631 (110km/h)
                  </text>
                </g>
              </g>
            )}

            {/* Step 2: Red Alert dot at Bhubaneswar with Train #12631 parked */}
            {activeStep === 1 && (
              <g>
                {/* Train dot parked at Bhubaneswar */}
                <circle 
                  cx={CITIES.bhubaneswar.x} 
                  cy={CITIES.bhubaneswar.y} 
                  r="6" 
                  fill="#38bdf8" 
                  className="glow-neon-blue"
                />
                <g transform={`translate(${CITIES.bhubaneswar.x - 45}, ${CITIES.bhubaneswar.y - 20})`}>
                  <rect width="90" height="15" rx="3" fill="#0c152b" stroke="#38bdf8" strokeWidth="0.8" />
                  <text x="45" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    TRAIN #12631 (0km/h)
                  </text>
                </g>
              </g>
            )}

            {/* Alert badge (defect marker) at Bhubaneswar for Step 2+ */}
            {activeStep >= 1 && (
              <g transform={`translate(${CITIES.bhubaneswar.x}, ${CITIES.bhubaneswar.y})`}>
                {/* Core alert dot (static, no pulsing scale animation) */}
                <circle 
                  r="6" 
                  fill={activeStep === 3 ? '#F97316' : '#EF4444'} 
                  className={activeStep === 3 ? 'glow-neon-orange' : 'glow-neon-red'} 
                />
                {/* Warning icon overlay */}
                {activeStep !== 3 ? (
                  <path 
                    d="M-3,2 L3,2 L0,-4 Z" 
                    fill="white" 
                    className="pointer-events-none" 
                  />
                ) : (
                  <path 
                    d="M-2,0 L-0.5,1.5 L2,-1" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="1" 
                    className="pointer-events-none" 
                  />
                )}
                {/* Floating Status Banner */}
                <g transform={`translate(-50, -28)`}>
                  <rect 
                    width="100" 
                    height="16" 
                    rx="3" 
                    fill="#0f070b" 
                    stroke={activeStep === 3 ? '#F97316' : '#EF4444'} 
                    strokeWidth="1" 
                  />
                  <text 
                    x="50" 
                    y="11" 
                    fill={activeStep === 3 ? '#F97316' : '#EF4444'} 
                    fontSize="8" 
                    fontWeight="extrabold" 
                    fontFamily="sans-serif" 
                    textAnchor="middle"
                  >
                    {activeStep === 3 ? 'CRACK CONTAINED' : 'CRACK CONFIRMED'}
                  </text>
                </g>
              </g>
            )}

            {/* Step 3: Risk calculations & 2 approaching static yellow train dots */}
            {activeStep === 2 && (
              <g>
                {/* Train 1 (Chennai-Bhubaneswar midway) */}
                <circle 
                  cx={getStep3Train1Coords().x} 
                  cy={getStep3Train1Coords().y} 
                  r="5" 
                  fill="#F59E0B" 
                  className="glow-neon-amber"
                />
                
                {/* Train 2 (Kolkata-Bhubaneswar midway) */}
                <circle 
                  cx={getStep3Train2Coords().x} 
                  cy={getStep3Train2Coords().y} 
                  r="5" 
                  fill="#F59E0B" 
                  className="glow-neon-amber"
                />

                {/* Distance dotted lines to Bhubaneswar */}
                <line 
                  x1={getStep3Train1Coords().x} 
                  y1={getStep3Train1Coords().y} 
                  x2={CITIES.bhubaneswar.x} 
                  y2={CITIES.bhubaneswar.y} 
                  stroke="#F59E0B" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  opacity="0.6"
                />
                <line 
                  x1={getStep3Train2Coords().x} 
                  y1={getStep3Train2Coords().y} 
                  x2={CITIES.bhubaneswar.x} 
                  y2={CITIES.bhubaneswar.y} 
                  stroke="#F59E0B" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  opacity="0.6"
                />

                {/* Train Labels and Distance markers */}
                <g transform={`translate(${getStep3Train1Coords().x - 45}, ${getStep3Train1Coords().y - 22})`}>
                  <rect width="90" height="15" rx="3" fill="#0f0d07" stroke="#F59E0B" strokeWidth="0.8" />
                  <text x="45" y="11" fill="#F59E0B" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    #22846 | 7.5 km away
                  </text>
                </g>
                <g transform={`translate(${getStep3Train2Coords().x - 45}, ${getStep3Train2Coords().y - 22})`}>
                  <rect width="90" height="15" rx="3" fill="#0f0d07" stroke="#F59E0B" strokeWidth="0.8" />
                  <text x="45" y="11" fill="#F59E0B" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    #18401 | 5.0 km away
                  </text>
                </g>
              </g>
            )}

            {/* Step 4: Alerts Dispatched, trains slowed, green checks near trains */}
            {activeStep === 3 && (
              <g>
                {/* Train 1 Safe dot */}
                <circle 
                  cx={getStep3Train1Coords().x} 
                  cy={getStep3Train1Coords().y} 
                  r="6" 
                  fill="#10B981" 
                  className="glow-neon-green"
                />
                
                {/* Train 2 Safe dot */}
                <circle 
                  cx={getStep3Train2Coords().x} 
                  cy={getStep3Train2Coords().y} 
                  r="6" 
                  fill="#10B981" 
                  className="glow-neon-green"
                />

                {/* Green check symbols */}
                <g transform={`translate(${getStep3Train1Coords().x + 10}, ${getStep3Train1Coords().y - 12})`}>
                  <circle r="6" fill="#10B981" />
                  <path d="M-2.5,0 L-0.5,2 L2.5,-1" fill="none" stroke="white" strokeWidth="1.2" />
                </g>
                <g transform={`translate(${getStep3Train2Coords().x + 10}, ${getStep3Train2Coords().y - 12})`}>
                  <circle r="6" fill="#10B981" />
                  <path d="M-2.5,0 L-0.5,2 L2.5,-1" fill="none" stroke="white" strokeWidth="1.2" />
                </g>

                {/* Train Status Labels */}
                <g transform={`translate(${getStep3Train1Coords().x - 45}, ${getStep3Train1Coords().y - 25})`}>
                  <rect width="90" height="15" rx="3" fill="#070f0a" stroke="#10B981" strokeWidth="0.8" />
                  <text x="45" y="11" fill="#10B981" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    #22846 Warned (Safe)
                  </text>
                </g>
                <g transform={`translate(${getStep3Train2Coords().x - 45}, ${getStep3Train2Coords().y - 25})`}>
                  <rect width="90" height="15" rx="3" fill="#070f0a" stroke="#10B981" strokeWidth="0.8" />
                  <text x="45" y="11" fill="#10B981" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    #18401 Warned (Safe)
                  </text>
                </g>
              </g>
            )}

          </svg>

          {/* Interactive Floating State Tooltip Card */}
          {hoveredState && (
            <div 
              className="absolute glass-tooltip p-3 rounded-lg border border-sky-500/25 pointer-events-none text-xs z-30 transition-all duration-100 flex flex-col gap-1 w-44 shadow-2xl"
              style={{ 
                left: `${tooltipPos.x + 12}px`, 
                top: `${tooltipPos.y + 12}px` 
              }}
            >
              <div className="flex justify-between items-center border-b border-sky-500/20 pb-1 mb-1">
                <span className="font-extrabold text-sky-400 tracking-wider uppercase truncate max-w-[110px]">{hoveredState.name}</span>
                <span className="text-[8px] font-mono bg-sky-500/10 text-sky-400 px-1 rounded uppercase">Sector Scan</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">SCAN MONITOR:</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">SENSORS ONLINE:</span>
                <span className="text-white font-mono font-bold">{hoveredState.sensorsOnline} / {hoveredState.sensorsTotal}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">SIGNAL GAIN:</span>
                <span className="text-sky-300 font-mono font-bold">{hoveredState.signalPercent}%</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">TRAFFIC FLOW:</span>
                <span className={`font-bold ${hoveredState.trafficFlow === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'}`}>{hoveredState.trafficFlow}</span>
              </div>
            </div>
          )}

          {/* Network Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-950/85 border border-slate-900/60 p-3 rounded-xl z-20 text-[9px] flex flex-col gap-1.5 shadow-lg max-w-[150px] pointer-events-none">
            <span className="font-bold tracking-wider text-slate-500 uppercase border-b border-slate-900 pb-1 mb-0.5">Network Legend</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-1.5 rounded-full bg-sky-500/20 border border-sky-400/50"></div>
              <span className="text-slate-300 font-semibold">Scanning Corridor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-neon-green"></div>
              <span className="text-slate-300 font-semibold">Junction Hub</span>
            </div>
          </div>

        </div>

      </main>

      {/* SECTION 3 - IMPACT BAR */}
      <footer className="border-t border-slate-900/80 bg-[#060e22]/90 backdrop-blur-md py-6 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-[#081127] border border-slate-900/60 p-4 rounded-2xl flex flex-col items-center text-center shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {kmMonitored} km
            </span>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mt-1">
              monitored today
            </span>
            <span className="text-[11px] text-slate-400 mt-2 font-medium">
              By 13,247 trains. No new hardware.
            </span>
          </div>

          {/* Card 2 */}
          <div className="bg-[#081127] border border-slate-900/60 p-4 rounded-2xl flex flex-col items-center text-center shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {faultsDetected}
            </span>
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">
              faults detected
            </span>
            <span className="text-[11px] text-slate-400 mt-2 font-medium">
              Avg 1.8s detection time
            </span>
          </div>

          {/* Card 3 */}
          <div className="bg-[#081127] border border-slate-900/60 p-4 rounded-2xl flex flex-col items-center text-center shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {trainsWarned}
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">
              trains warned in time
            </span>
            <span className="text-[11px] text-slate-400 mt-2 font-medium">
              Zero new trackside sensors
            </span>
          </div>

        </div>

        {/* Team & Teammates Credits Sub-Footer */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-900/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-400">Team: </span>
            <span className="font-mono text-sky-400 font-bold">tsrinath2020</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-center md:text-right">
            <span className="text-slate-400 font-semibold">Teammates:</span>
            <span className="text-sky-300/90 font-medium">Thota Sai Eswar Srinath <span className="text-[10px] text-sky-400 font-bold font-mono px-1 bg-sky-950/40 rounded border border-sky-900/30">Team Lead</span></span>
            <span>Bondugula Pranav Teja</span>
            <span>Pushkar Koppeti</span>
            <span>Nikhil Sai Kadiri</span>
            <span>BIRUDARAJU ARYABHAT RAJU</span>
          </div>
        </div>
      </footer>

      {/* HOW IT WORKS MODAL OVERLAY */}
      {isHowItWorksOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsHowItWorksOpen(false)}
        >
          <div 
            className="bg-[#070e20] border border-slate-900 rounded-3xl w-full max-w-7xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative shadow-2xl flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Cyber Corner Brackets */}
            <div className="cyber-corner cyber-corner-tl"></div>
            <div className="cyber-corner cyber-corner-tr"></div>
            <div className="cyber-corner cyber-corner-bl"></div>
            <div className="cyber-corner cyber-corner-br"></div>

            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-900 pb-4">
              <div>
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-bold">Concept Overview</span>
                <h2 className="text-2xl font-black text-white leading-tight mt-1">
                  From detection to continuous improvement.
                </h2>
                <p className="text-xs text-slate-400 mt-1">A closed-loop system that gets smarter with every train.</p>
              </div>
              <button 
                onClick={() => setIsHowItWorksOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-white transition-all cursor-pointer text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
              
              {/* Left Column: 4-Step Closed Loop Flow */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Step 1 */}
                <div className="bg-[#0a142c] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between gap-4 relative">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-teal-500 rounded-t-2xl"></div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-black font-mono">1</span>
                    <span className="text-xs font-bold text-white">Detect the fault</span>
                  </div>
                  
                  {/* Accelerometer SVG Graphic */}
                  <div className="h-20 bg-slate-950/60 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="flex flex-col items-center gap-1">
                      <Train className="h-8 w-8 text-teal-400" />
                      <span className="text-[8px] font-mono text-teal-400/80 tracking-widest">LOCO SENSOR</span>
                    </div>
                    {/* Simulated pulse spike */}
                    <svg className="absolute inset-x-0 bottom-0 h-6 w-full" stroke="rgba(20, 184, 166, 0.4)" strokeWidth="1.5" fill="none">
                      <path d="M 0 12 L 80 12 L 90 2 L 100 22 L 110 12 L 300 12" />
                    </svg>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Axle-box accelerometers continuously record vibrations as the train moves. On-board models analyze the data in real time and detect abnormal patterns.
                  </p>
                  
                  <div className="bg-teal-500/10 border border-teal-500/20 py-1 px-2 rounded-lg flex items-center gap-1.5 text-[9px] text-teal-300 font-bold">
                    <CheckCircle2 className="h-3 w-3 text-teal-400" />
                    Fault detected & location tagged.
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-[#0a142c] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between gap-4 relative">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500 rounded-t-2xl"></div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black font-mono">2</span>
                    <span className="text-xs font-bold text-white">Store in database</span>
                  </div>
                  
                  {/* Database SVG Graphic */}
                  <div className="h-20 bg-slate-950/60 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="flex flex-col items-center gap-1">
                      <Cpu className="h-8 w-8 text-amber-400" />
                      <span className="text-[8px] font-mono text-amber-400/80 tracking-widest">CLOUD UPLOAD</span>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Detected fault data and location are securely uploaded to the central database in real time. The system creates a live track health map for the entire network.
                  </p>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 py-1 px-2 rounded-lg flex items-center gap-1.5 text-[9px] text-amber-300 font-bold">
                    <CheckCircle2 className="h-3 w-3 text-amber-400" />
                    Data stored & globally available.
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-[#0a142c] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between gap-4 relative">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500 rounded-t-2xl"></div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-slate-950 flex items-center justify-center text-[10px] font-black font-mono">3</span>
                    <span className="text-xs font-bold text-white">Warn the next train</span>
                  </div>
                  
                  {/* Alert warning SVG Graphic */}
                  <div className="h-20 bg-slate-950/60 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="flex flex-col items-center gap-1">
                      <AlertCircle className="h-8 w-8 text-red-400" />
                      <span className="text-[8px] font-mono text-red-400/80 tracking-widest">COLLISION SHIELD</span>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    When another train approaches the same location, the system already knows the risk. It sends alerts to the loco pilot and control systems to slow down in advance.
                  </p>
                  
                  <div className="bg-red-500/10 border border-red-500/20 py-1 px-2 rounded-lg flex items-center gap-1.5 text-[9px] text-red-300 font-bold">
                    <CheckCircle2 className="h-3 w-3 text-red-400" />
                    Prevents accidents. Saves lives.
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-[#0a142c] border border-slate-900 rounded-2xl p-4 flex flex-col justify-between gap-4 relative">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-500 rounded-t-2xl"></div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center text-[10px] font-black font-mono">4</span>
                    <span className="text-xs font-bold text-white">Improve the AI</span>
                  </div>
                  
                  {/* Feedback cycle SVG Graphic */}
                  <div className="h-20 bg-slate-950/60 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="flex flex-col items-center gap-1">
                      <Activity className="h-8 w-8 text-sky-400" />
                      <span className="text-[8px] font-mono text-sky-400/80 tracking-widest">AI RE-TRAINING</span>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    If an alert in Step 3 turns out to be inaccurate (false alarm) or missed, the system learns from it. The AI model is continuously updated with new data.
                  </p>
                  
                  <div className="bg-sky-500/10 border border-sky-500/20 py-1 px-2 rounded-lg flex items-center gap-1.5 text-[9px] text-sky-300 font-bold">
                    <CheckCircle2 className="h-3 w-3 text-sky-400" />
                    Smarter system. Fewer mistakes.
                  </div>
                </div>

              </div>

              {/* Right Column: Highlights & Value Proposition */}
              <div className="w-full lg:w-[28%] bg-[#081127] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between gap-4">
                
                <div>
                  <p className="text-[11px] font-semibold text-slate-300 leading-relaxed pb-3 border-b border-slate-900">
                    Use axle-box accelerometers already mounted on trains to monitor track health without adding any new hardware.
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono text-red-500 uppercase tracking-wider font-extrabold">Key Highlights</h4>
                  <ul className="mt-2.5 space-y-2 text-[11px] text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                      Real-time detection using existing sensors
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                      Centralized database & live track map
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                      Advance slowdown warnings to trains
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                      AI learns from feedback loops
                    </li>
                  </ul>
                </div>

                <div className="border-t border-slate-900 pt-3">
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-extrabold">Why It Works</h4>
                  <ul className="mt-2.5 space-y-2 text-[11px] text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
                      Cost-effective (existing hardware)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
                      Easy to deploy immediately
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
                      Powerful deep learning models
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
                      Scalable to thousands of trains
                    </li>
                  </ul>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
