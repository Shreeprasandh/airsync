"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Database, 
  Radio,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff
} from "lucide-react";

interface GuidedTourControllerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAct: (act: 1 | 2 | 3) => void;
  onOpenCrsModal: () => void;
  onOpenBattlecard: () => void;
  onOpenAcarsModal: () => void;
  setViewState: (view: 'dashboard' | 'asset-detail' | 'sentinel-gate') => void;
}

interface TourStep {
  step: number;
  title: string;
  actLabel?: string;
  actNumber?: 1 | 2 | 3;
  targetView?: 'dashboard' | 'asset-detail' | 'sentinel-gate';
  modalTrigger?: 'crs' | 'battlecard' | 'acars';
  narration: string;
  keyMetric: string;
  metricLabel: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: "Tactical Airspace Radar & Sovereign Fighter Fleet",
    targetView: "dashboard",
    narration: "Welcome to AirSync at AFS Ambala (Western Air Command) and AFS Bareilly. Combat aircraft (Rafale EH, Su-30MKI, Tejas LCA) stream multi-sensor tactical telemetry over air-gapped WebSocket. Local INT8 edge inference runs in <0.39ms without cloud latency.",
    keyMetric: "6 Fighters / 12 Engines",
    metricLabel: "LIVE TACTICAL RADAR",
    icon: <Activity className="h-4 w-4 text-emerald-400" />
  },
  {
    step: 2,
    title: "Severe Weather Cancellation & Zero Mission Aborts",
    actLabel: "Act 1",
    actNumber: 1,
    targetView: "sentinel-gate",
    narration: "Rafale EH (BS-001) encounters severe weather microbursts. While raw compressor temperatures dip, the Twin-Engine Differential Telemetry Gauge compares Port vs Starboard Snecma M88 engines. Symmetrical disturbance (Δ < 2%) inhibits false mission abort and unnecessary engine removal.",
    keyMetric: "+28% Sortie Generation",
    metricLabel: "COMBAT READINESS PRESERVED",
    icon: <Sparkles className="h-4 w-4 text-cyan-400" />
  },
  {
    step: 3,
    title: "Asymmetric HPC Decay & 11 BRD Spares Dispatch",
    actLabel: "Act 2",
    actNumber: 2,
    targetView: "sentinel-gate",
    narration: "Su-30MKI (SB-128) develops asymmetric HPC thermal decay (ΔP30 > 15%). The telemetry compresses into a 48-byte ARINC 620 tactical packet. AirSync automatically initiates 11 BRD Ojhar forward spares dispatch with a 12-hour transit buffer, arriving 22 hours prior to flight-line failure.",
    keyMetric: "12h Transit / 22h Margin",
    metricLabel: "11 BRD FORWARD SPARES LINK",
    icon: <Radio className="h-4 w-4 text-amber-400" />
  },
  {
    step: 4,
    title: "Peter Todd Merkle Mountain Range & <2ms Cyber Defense",
    actLabel: "Act 3",
    actNumber: 3,
    targetView: "sentinel-gate",
    narration: "All flight-line maintenance records form an immutable Merkle Mountain Range (RFC 6962). When an adversary attempts SQLite log tampering during an airbase cyber event, the cryptographic root hash desynchronizes in <2ms, isolating the corrupted entry.",
    keyMetric: "< 2ms Detection",
    metricLabel: "PETER TODD MMR DAG",
    icon: <Database className="h-4 w-4 text-red-400" />
  },
  {
    step: 5,
    title: "Military Airworthiness: IAF Form 700 / DGAQA / CEMILAC",
    targetView: "sentinel-gate",
    modalTrigger: "crs",
    narration: "The certified flight-line overhaul concludes with an automated Indian Air Force Form 700 Certificate of Release to Service. Cryptographically sealed with the Peter Todd MMR root and Ed25519 SEngO signature, meeting CEMILAC and DGAQA airworthiness mandates.",
    keyMetric: "IAF Form 700 / DGAQA",
    metricLabel: "AUTHORIZED RELEASE (CRS)",
    icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />
  }
];

export function GuidedTourController({
  isOpen,
  onClose,
  onTriggerAct,
  onOpenCrsModal,
  onOpenBattlecard,
  onOpenAcarsModal,
  setViewState
}: GuidedTourControllerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPeekMode, setIsPeekMode] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];

  // Apply step actions on step transition
  const executeStepActions = useCallback((index: number) => {
    const target = TOUR_STEPS[index];
    if (target.actNumber) {
      onTriggerAct(target.actNumber);
    } else if (target.targetView) {
      setViewState(target.targetView);
    }

    if (target.modalTrigger === "crs") {
      onOpenCrsModal();
    } else if (target.modalTrigger === "battlecard") {
      onOpenBattlecard();
    } else if (target.modalTrigger === "acars") {
      onOpenAcarsModal();
    }
  }, [onTriggerAct, setViewState, onOpenCrsModal, onOpenBattlecard, onOpenAcarsModal]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      executeStepActions(nextIndex);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      executeStepActions(prevIndex);
    }
  };

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen && isAutoPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < TOUR_STEPS.length - 1) {
            const next = prev + 1;
            executeStepActions(next);
            return next;
          } else {
            setIsAutoPlaying(false);
            return prev;
          }
        });
      }, 10000); // 10 seconds per step
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, isAutoPlaying, executeStepActions]);

  if (!isOpen) return null;

  // Render Minimized floating widget if minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 font-sans select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="bg-[#0b0e17]/95 backdrop-blur-md border border-white/[0.12] rounded-xl shadow-2xl px-4 py-2 flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-cyan-300 font-bold">TOUR • STEP {step.step}/5</span>
            <span className="text-zinc-400 hidden sm:inline truncate max-w-[180px]">{step.title}</span>
          </div>

          <div className="flex items-center space-x-1 pl-2 border-l border-white/[0.1]">
            <button 
              onClick={handlePrev} 
              disabled={currentStepIndex === 0} 
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Previous Step"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={handleNext} 
              className="p-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
              title="Next Step"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setIsMinimized(false)} 
              className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-colors"
              title="Expand Tour"
            >
              <Maximize2 className="h-3 w-3" />
              <span>EXPAND</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1 text-zinc-500 hover:text-red-400 ml-1 cursor-pointer"
              title="Exit Tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 inset-x-4 max-w-4xl mx-auto z-50 animate-in slide-in-from-bottom-5 duration-300 font-sans select-none transition-all ${
      isPeekMode ? "opacity-35 backdrop-blur-none" : "opacity-100"
    }`}>
      <div className="bg-[#0b0e17]/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl shadow-2xl p-5 text-zinc-100 flex flex-col md:flex-row items-center justify-between gap-5 ring-1 ring-cyan-500/30">
        
        {/* Left Section: Step Indicator & Content */}
        <div className="flex-1 space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center space-x-1.5">
              {step.icon}
              <span>INNOVENT-27 TOUR • STEP {step.step} OF 5</span>
            </span>

            {step.actLabel && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono uppercase font-bold">
                {step.actLabel} ACTIVE
              </span>
            )}

            <div className="flex items-center space-x-1.5 ml-auto md:ml-0 px-2.5 py-0.5 rounded bg-[#070a12] border border-white/[0.08] text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">{step.metricLabel}:</span>
              <strong className="text-white font-bold">{step.keyMetric}</strong>
            </div>

            {/* Peek / Minimize Fast Action Bar */}
            <div className="flex items-center space-x-1 ml-auto">
              <button
                type="button"
                onClick={() => setIsPeekMode(!isPeekMode)}
                className={`p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                  isPeekMode 
                    ? "bg-cyan-500/30 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/40" 
                    : "bg-[#070a12] border-white/[0.08] text-zinc-400 hover:text-white"
                }`}
                title={isPeekMode ? "Restore Full Opacity (Currently Translucent)" : "Translucent Mode (Make card translucent to view dashboard beneath)"}
              >
                {isPeekMode ? <EyeOff className="h-3.5 w-3.5 text-cyan-300" /> : <Eye className="h-3.5 w-3.5" />}
                {isPeekMode && <span className="text-[9px] font-bold text-cyan-300 font-mono hidden sm:inline">RESTORE</span>}
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg border border-white/[0.08] bg-[#070a12] hover:bg-[#101420] text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                title="Minimize Tour Card to bottom-right pill"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <h3 className="text-sm md:text-base font-mono font-bold text-white tracking-tight">
            {step.title}
          </h3>

          <p className="text-xs text-zinc-300 leading-relaxed font-sans max-w-2xl">
            {step.narration}
          </p>
        </div>

        {/* Right Section: Navigation Controls */}
        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-white/[0.1] pt-3 md:pt-0 md:pl-5 w-full md:w-auto justify-between md:justify-end">
          
          {/* Auto-Play Toggle */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
              isAutoPlaying 
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse" 
                : "bg-[#070a12] border-white/[0.08] text-zinc-400 hover:text-white"
            }`}
            title="Automatically advance through each stage every 10 seconds"
          >
            {isAutoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isAutoPlaying ? "PAUSE" : "AUTO-PLAY"}</span>
          </button>

          {/* Prev */}
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`p-2 rounded-xl border border-white/[0.08] transition-colors cursor-pointer ${
              currentStepIndex === 0 ? "opacity-30 cursor-not-allowed text-zinc-600" : "bg-[#070a12] hover:bg-[#101420] text-zinc-300"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Next / Finish */}
          <button
            onClick={handleNext}
            className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#1a253f] border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <span>{currentStepIndex === TOUR_STEPS.length - 1 ? "FINISH TOUR" : "NEXT STEP"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-white/[0.08] bg-[#070a12] hover:bg-red-950/40 hover:text-red-400 text-zinc-400 transition-colors cursor-pointer ml-1"
            title="Exit Presentation Tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
