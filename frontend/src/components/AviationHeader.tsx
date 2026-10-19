"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Shield, ChevronRight, Clock, Play, Layers } from "lucide-react";

interface AviationHeaderProps {
  viewState: 'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate';
  setViewState: (v: 'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate') => void;
  selectedPlaneId: string | null;
  setSelectedPlaneId: (id: string | null) => void;
  onOpenAmosModal?: (planeId: string, engineId: string) => void;
  onSelectAct?: (act: 1 | 2 | 3 | null) => void;
  backendOnline: boolean;
  activeAct?: 1 | 2 | 3 | null;
  onOpenBattlecard?: () => void;
  onStartTour?: () => void;
  onOpenStudioModal?: (mode?: '2d' | '3d-engine' | '3d-plane') => void;
}

export function AviationHeader({
  viewState,
  setViewState,
  selectedPlaneId,
  setSelectedPlaneId,
  onOpenAmosModal,
  onSelectAct,
  backendOnline,
  activeAct,
  onOpenBattlecard,
  onStartTour,
  onOpenStudioModal
}: AviationHeaderProps) {
  const [utcTime, setUtcTime] = useState<string>("");
  const [istTime, setIstTime] = useState<string>("");

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      setUtcTime(now.toISOString().slice(11, 19) + " Z");
      setIstTime(now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + " IST");
    };
    updateTimes();
    const timer = setInterval(updateTimes, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-[#07090e] border-b border-white/[0.08] text-zinc-100 select-none sticky top-0 z-40">
      {/* Top Telemetry & Global Status Strip */}
      <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-10 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono border-b border-white/[0.06]">
        
        {/* Left: Brand Identity & Tenant Framing */}
        <div className="flex items-center space-x-3">
          <div 
            onClick={() => setViewState("dashboard")}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <Image 
              src="/translogo.png" 
              alt="AirSync Logo" 
              width={32}
              height={32}
              priority
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wider text-white font-sans">
                  AIR<span className="text-cyan-400 font-bold">SYNC</span>
                </span>
                <span className="text-[9px] bg-red-950/60 text-red-300 border border-red-500/30 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider">
                  MoD / DSSC
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans tracking-tight">
                Defense Fleet Availability & MRO Ledger
              </p>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-[1px] bg-zinc-800/80 mx-1" />

          {/* Connected Tenant & ERP Gateway Chips */}
          <div className="hidden md:flex items-center space-x-2 text-[10px] font-mono">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0c0f17] border border-white/[0.08] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>IAF Air HQ (Vayu Bhavan)</span>
            </div>
            <div 
              onClick={() => onOpenAmosModal?.(selectedPlaneId || "PL-101", "ENG-003")}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0c0f17] border border-white/[0.08] hover:border-cyan-500/50 hover:text-cyan-300 transition-colors cursor-pointer text-zinc-400"
              title="Open 11 Base Repair Depot (BRD) Spares & Maintenance Requisition"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>11 BRD Spares Link</span>
            </div>
          </div>
        </div>

        {/* Right: Master Dual Clocks & Backend Status */}
        <div className="flex items-center space-x-3 text-[10px]">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#0e121b] border border-white/[0.08] text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span suppressHydrationWarning className="font-bold text-white tracking-widest">{utcTime || "00:00:00 Z"}</span>
            <span className="text-zinc-600">|</span>
            <span suppressHydrationWarning className="text-zinc-400">{istTime || "00:00:00 IST"}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0e121b] border border-white/[0.08]">
            <span className={`h-2 w-2 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-red-500"}`} />
            <span className="text-zinc-400">{backendOnline ? "AIRSYNC GATEWAY 8000 OK" : "OFFLINE"}</span>
          </div>
        </div>
      </div>

      {/* Lower Bar: Breadcrumb Navigation & 3-Act Evaluation Controller */}
      <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-10 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[#090c14]/90">
        
        {/* Navigation Breadcrumb Trail */}
        <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400">
          <button 
            onClick={() => {
              setSelectedPlaneId(null);
              setViewState("dashboard");
            }}
            className={`hover:text-white transition-colors cursor-pointer ${viewState === 'dashboard' ? "text-cyan-400 font-bold" : ""}`}
          >
            TACTICAL FLEET RADAR
          </button>
          
          {(viewState === 'asset-detail' || viewState === 'sentinel-gate') && (
            <>
              <ChevronRight className="h-3 w-3 text-zinc-600" />
              <button 
                onClick={() => setViewState("asset-detail")}
                className={`hover:text-white transition-colors cursor-pointer ${viewState === 'asset-detail' ? "text-cyan-400 font-bold" : ""}`}
              >
                FIGHTER DOSSIER [{selectedPlaneId || "BS-001"}]
              </button>
            </>
          )}

          {viewState === 'sentinel-gate' && (
            <>
              <ChevronRight className="h-3 w-3 text-zinc-600" />
              <span className="text-cyan-400 font-bold">
                AIRSYNC DEFENSE GATEWAY
              </span>
            </>
          )}
        </div>

        {/* Evaluation Scenario Controller & Defense Matrix */}
        <div className="flex items-center space-x-2 text-[10px] font-sans">
          <span className="text-zinc-500 hidden sm:inline text-[9px] uppercase tracking-wider mr-0.5">
            Tactical Scenarios:
          </span>

          <button
            onClick={() => onSelectAct ? onSelectAct(activeAct === 1 ? null : 1) : null}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1.5 border ${
              activeAct === 1
                ? "bg-cyan-950/70 text-cyan-300 border-cyan-500/60 font-semibold"
                : "bg-[#0c0f17] hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-white/[0.08]"
            }`}
            title={activeAct === 1 ? "Click to clear Act 1 scenario" : "Act 1: Symmetrical Weather & High-G Cancellation — Common-mode atmospheric disturbance rejection"}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Act 1: High-G & Weather Rejection</span>
          </button>

          <button
            onClick={() => onSelectAct ? onSelectAct(activeAct === 2 ? null : 2) : null}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1.5 border ${
              activeAct === 2
                ? "bg-amber-950/70 text-amber-300 border-amber-500/60 font-semibold"
                : "bg-[#0c0f17] hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-white/[0.08]"
            }`}
            title={activeAct === 2 ? "Click to clear Act 2 scenario" : "Act 2: Asymmetric HPC Thermal Decay & Closed-Loop 11 BRD Spares Requisition"}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Act 2: HPC Decay & BRD Spares</span>
          </button>

          <button
            onClick={() => onSelectAct ? onSelectAct(activeAct === 3 ? null : 3) : null}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1.5 border ${
              activeAct === 3
                ? "bg-cyan-950/70 text-cyan-300 border-cyan-400/60 font-semibold"
                : "bg-[#0c0f17] hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-white/[0.08]"
            }`}
            title={activeAct === 3 ? "Click to clear Act 3 scenario" : "Act 3: Cryptographic Merkle Mountain Range Tamper Defense"}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Act 3: Ledger Defense</span>
          </button>

          {activeAct && (
            <button
              onClick={() => onSelectAct ? onSelectAct(null) : null}
              className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.08] text-[9px] font-mono transition-colors cursor-pointer"
              title="Reset all active scenarios to nominal cruising flight"
            >
              RESET
            </button>
          )}

          {onOpenBattlecard && (
            <button
              onClick={onOpenBattlecard}
              className="ml-1 px-2.5 py-1 rounded bg-[#0c0f17] hover:bg-[#141b2a] text-zinc-300 hover:text-white border border-white/[0.08] hover:border-zinc-500 font-mono text-[9px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Open SIH 26249 Ministry of Defence Airworthiness & Jury Defense Matrix"
            >
              <Shield className="h-3 w-3 text-zinc-400" />
              <span>DEFENSE MATRIX</span>
            </button>
          )}

          {onStartTour && (
            <button
              onClick={onStartTour}
              className="ml-1 px-2.5 py-1 rounded bg-[#0c0f17] hover:bg-[#141b2a] text-zinc-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/40 font-mono text-[9px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Start AirSync Interactive 3-Minute Defense Briefing Tour"
            >
              <Play className="h-2.5 w-2.5 text-zinc-400 fill-zinc-400" />
              <span>GUIDED TOUR</span>
            </button>
          )}

          {onOpenStudioModal && (
            <button
              onClick={() => onOpenStudioModal('3d-engine')}
              className="ml-1 px-2.5 py-1 rounded bg-[#0c0f17] hover:bg-[#141b2a] text-zinc-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/40 font-mono text-[9px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Open AirSync 3D Digital Twin Studio"
            >
              <Layers className="h-3 w-3 text-zinc-400" />
              <span>3D TWIN</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
