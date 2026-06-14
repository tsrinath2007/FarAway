import React, { useState } from 'react';
import { Train, ChevronLeft, ChevronRight } from 'lucide-react';
import indiaMap from '@svg-maps/india';

export default function App() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none">
      
      {/* SECTION 1: HEADER */}
      <header className="border-b border-slate-900 bg-slate-950/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between z-20 gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="bg-red-600 p-2 rounded flex items-center justify-center">
            <Train className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-wider text-white font-mono">PULSE RAIL</h1>
        </div>
        <div className="text-center flex-1 max-w-2xl px-4">
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white uppercase">
            Every train is a track inspector.
          </h2>
        </div>
      </header>

      {/* SECTION 2: STORY FLOW */}
      <main className="flex-1 px-6 py-8 flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full z-10">
        
        {/* Step List Card Deck */}
        <div className="flex-1 flex flex-col justify-between max-w-md">
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-slate-500 tracking-widest uppercase">
              AUTONOMOUS PROTECTION SEQUENCE
            </h3>
            
            <div className={`p-4 rounded-lg border cursor-pointer ${activeStep === 0 ? 'bg-slate-900 border-blue-500' : 'bg-slate-950/30 border-slate-900 opacity-45'}`}>
              <h4 className="text-sm font-semibold text-white">1. Train Passes Over Crack</h4>
            </div>
            
            <div className={`p-4 rounded-lg border cursor-pointer ${activeStep === 1 ? 'bg-slate-900 border-red-500' : 'bg-slate-950/30 border-slate-900 opacity-45'}`}>
              <h4 className="text-sm font-semibold text-white">2. Anomalous Deflection Verified</h4>
            </div>

            <div className={`p-4 rounded-lg border cursor-pointer ${activeStep === 2 ? 'bg-slate-900 border-amber-500' : 'bg-slate-950/30 border-slate-900 opacity-45'}`}>
              <h4 className="text-sm font-semibold text-white">3. Autonomous Risk Calculation</h4>
            </div>

            <div className={`p-4 rounded-lg border cursor-pointer ${activeStep === 3 ? 'bg-slate-900 border-emerald-500' : 'bg-slate-950/30 border-slate-900 opacity-45'}`}>
              <h4 className="text-sm font-semibold text-white">4. Alerts Sent & Safety Secured</h4>
            </div>
          </div>

          {/* Slideshow dot navigation panel */}
          <div className="mt-6 flex items-center justify-end bg-slate-950 border border-slate-900 p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              <ChevronLeft className="h-4 w-4 text-slate-500 cursor-pointer" />
              <div className="flex space-x-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <button key={idx} className={`h-2 rounded-full ${activeStep === idx ? 'w-4 bg-blue-500' : 'w-2 bg-slate-800'}`} />
                ))}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Detailed India Map Container */}
        <div className="flex-1 bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <svg viewBox={indiaMap.viewBox} className="w-full max-h-[440px] relative z-10">
            {indiaMap.locations.map((loc) => (
              <path
                key={loc.id}
                d={loc.path}
                name={loc.name}
                id={loc.id}
                fill="#060913"
                stroke="#151E2E"
                strokeWidth="0.8"
              />
            ))}
          </svg>
        </div>

      </main>

      {/* SECTION 3: IMPACT BAR */}
      <footer className="bg-slate-950/90 border-t border-slate-900 px-6 py-6 z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0B0F19] border border-slate-900 rounded-lg p-5 text-center">
            <span className="text-[10px] font-mono text-blue-400 tracking-widest uppercase">Coverage Scanned Today</span>
            <h3 className="text-3xl font-bold font-mono text-white mt-1">87,432 km</h3>
          </div>
          <div className="bg-[#0B0F19] border border-slate-900 rounded-lg p-5 text-center">
            <span className="text-[10px] font-mono text-red-400 tracking-widest uppercase">Anomalies Detected</span>
            <h3 className="text-3xl font-bold font-mono text-white mt-1">14</h3>
          </div>
          <div className="bg-[#0B0F19] border border-slate-900 rounded-lg p-5 text-center">
            <span className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase">Warnings Dispatched</span>
            <h3 className="text-3xl font-bold font-mono text-white mt-1">9</h3>
          </div>
        </div>
      </footer>

    </div>
  );
}
