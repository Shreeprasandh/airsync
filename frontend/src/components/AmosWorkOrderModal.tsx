"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Wrench, 
  Lock,
  ChevronDown,
  Send,
  Boxes
} from "lucide-react";

interface AmosWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  planeId: string;
  engineId: string;
  engineModel?: string;
  predictedRul: number | string;
  currentEgtMargin?: number | string;
  onCommitToLedger: (orderData: {
    workOrderId: string;
    componentId: string;
    actionTaken: string;
    technicianId: string;
    hangarBay: string;
    ataChapter: string;
  }) => void;
}

export function AmosWorkOrderModal({
  isOpen,
  onClose,
  planeId,
  engineId,
  engineModel = "Snecma M88-4E",
  predictedRul,
  currentEgtMargin = "-14.2",
  onCommitToLedger,
}: AmosWorkOrderModalProps) {
  const [techLicense, setTechLicense] = useState("IAF-SEngO-SQN17 (Sqn Ldr S. Venugopal)");
  const [hangarBay, setHangarBay] = useState("AFS Ambala (Bay 02 - Western Air Command)");
  const [certifiedCheck, setCertifiedCheck] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const workOrderId = React.useMemo(() => `WO-IAF-${planeId}-94812`, [planeId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignAndCommit = () => {
    if (!certifiedCheck) return;
    setIsSubmitting(true);

    setTimeout(() => {
      onCommitToLedger({
        workOrderId,
        componentId: engineId,
        actionTaken: `IAF Work Order: ATA 72-30 HPC Blade Replacement & 11 BRD Spares Dispatch (Bay ${hangarBay.slice(0, 10)})`,
        technicianId: techLicense.split(" ")[0] || "IAF-SEngO-SQN17",
        hangarBay,
        ataChapter: "72-30-00",
      });
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1400);
    }, 600);
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-[#0b0e17] border border-white/[0.08] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col font-mono text-zinc-200 cursor-default"
      >
        
        {/* Modal Header */}
        <div className="bg-[#0e121d] border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image 
              src="/translogo.png" 
              alt="AirSync Insignia" 
              width={32} 
              height={32} 
              className="h-8 w-auto object-contain" 
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  AirSync Flight-Line Maintenance & 11 BRD Spares Dispatch
                </h3>
                <span className="text-[9px] bg-red-950/70 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-bold">
                  MoD DEFENSE CONNECTOR
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans">
                IAF / DGAQA DDPMAS Spec 2000 Closed-Loop Spares Synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Core Work Order Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Card: Target Asset & Diagnostics */}
            <div className="bg-[#070a12] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Asset Telemetry Snapshot</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                  PROGNOSTIC TRIGGER
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">FIGHTER TAIL:</span>
                  <span className="text-zinc-100 font-bold">{planeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TURBOFAN COMPONENT:</span>
                  <span className="text-zinc-100 font-bold">{engineId} (S/N {engineId}-IAF-8849)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ROTABLE LRU PART NO:</span>
                  <span className="text-cyan-400 font-bold font-mono">P/N M88-HPC-ROTOR-MOD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">POWERPLANT MODEL:</span>
                  <span className="text-zinc-300">{engineModel}</span>
                </div>
                <div className="flex justify-between border-t border-white/[0.06] pt-2">
                  <span className="text-zinc-500">PREDICTED RUL:</span>
                  <span className="text-amber-400 font-bold">{predictedRul} FLIGHT HOURS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">EGT MARGIN DECAY:</span>
                  <span className="text-red-400 font-bold">{currentEgtMargin}°C (THERMAL DECAY)</span>
                </div>
              </div>
            </div>

            {/* Right Card: IAF Technical Directive */}
            <div className="bg-[#070a12] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">IAF Technical Directive Task</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
                  ATA 72-30-00
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">WORK ORDER ID:</span>
                  <span className="text-zinc-200 font-bold">{workOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ACTION DIRECTIVE:</span>
                  <span className="text-zinc-100 font-bold">HPC BORESCOPE & BLADE REPLACEMENT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TOOLING ALLOCATED:</span>
                  <span className="text-zinc-300">MIL-BORESCOPE-HD-KIT-4</span>
                </div>
                <div className="flex justify-between border-t border-white/[0.06] pt-2">
                  <span className="text-zinc-500">DEPOT SPARES ORDER:</span>
                  <span className="text-zinc-300">LRU-HPC-BLADE-SET-M88 (1 EA)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ESTIMATED TURNAROUND:</span>
                  <span className="text-emerald-400 font-bold">2.5 HOURS (RAPID SORTIE RECOVERY)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Closed-Loop 11 BRD Spares Requisition Bridge */}
          <div className="bg-[#070e1b] border border-cyan-500/30 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div className="flex items-center space-x-2">
                <Boxes className="h-4 w-4 text-cyan-400" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  11 Base Repair Depot (11 BRD Ojhar) — Forward Spares Inventory Sync
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                STOCK VERIFIED: 4 UNITS IN BUFFER
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] pt-1">
              <div className="bg-[#080c14] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-zinc-500 block text-[10px]">DEPOT LOCATION:</span>
                <span className="text-zinc-200 font-semibold font-mono">11 BRD Ojhar (VAOZ)</span>
              </div>
              <div className="bg-[#080c14] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-zinc-500 block text-[10px]">LOGISTICS LEAD-TIME:</span>
                <span className="text-cyan-300 font-bold font-mono">12 Flight Hours (Transit)</span>
              </div>
              <div className="bg-[#080c14] p-2.5 rounded-lg border border-white/[0.06]">
                <span className="text-zinc-500 block text-[10px]">ARRIVAL MARGIN:</span>
                <span className="text-emerald-400 font-bold font-mono">+22 Hours (Pre-Failure Delivery)</span>
              </div>
            </div>
          </div>

          {/* Air Base Hangar & Engineering Officer Signoff */}
          <div className="bg-[#070a12] border border-white/[0.06] rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Air Force Station & Authorization Bay</span>
              <span className="text-[10px] text-zinc-400">Tactical Command Sector</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
              <div className="space-y-1.5 text-left">
                <label className="text-zinc-500 block text-[10px]">ALLOCATED MAINTENANCE BAY:</label>
                <div className="relative">
                  <select 
                    value={hangarBay} 
                    onChange={(e) => setHangarBay(e.target.value)}
                    className="w-full appearance-none bg-[#0c101a] border border-white/[0.1] rounded-lg px-3 py-2 pr-9 text-zinc-200 focus:outline-none focus:border-cyan-500/60 text-xs cursor-pointer font-mono"
                  >
                    <option value="AFS Ambala (Bay 02 - Western Air Command)">AFS Ambala (Bay 02 - Western Air Command)</option>
                    <option value="AFS Bareilly (Bay 01 - Central Air Command)">AFS Bareilly (Bay 01 - Central Air Command)</option>
                    <option value="11 BRD Ojhar (Heavy Overhaul Bay 03)">11 BRD Ojhar (Heavy Overhaul Bay 03)</option>
                    <option value="AFS Hasimara (Forward Quick Turn Bay)">AFS Hasimara (Forward Quick Turn Bay)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-zinc-500 block text-[10px]">AUTHORIZED ENGINEERING OFFICER (SEngO / CEMILAC):</label>
                <input 
                  type="text" 
                  value={techLicense}
                  onChange={(e) => setTechLicense(e.target.value)}
                  className="w-full bg-[#0c101a] border border-white/[0.1] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500/60 text-xs font-mono"
                  placeholder="IAF-SEngO-SQN17"
                />
              </div>
            </div>
          </div>

          {/* Human-in-the-Loop Certification Checkbox */}
          <div className="bg-[#070a12] border border-white/[0.06] rounded-xl p-3.5 flex items-start space-x-3">
            <input 
              type="checkbox" 
              id="ame-cert" 
              checked={certifiedCheck}
              onChange={(e) => setCertifiedCheck(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
            />
            <label htmlFor="ame-cert" className="text-[11px] text-zinc-300 leading-relaxed cursor-pointer select-none text-left">
              <strong className="text-zinc-100 font-semibold">Senior Engineering Officer (SEngO) Attestation:</strong> I certify that this work order initiates an authorized physical borescope inspection and pre-positions the replacement LRU kit from 11 BRD Ojhar. Final release requires IAF Form 700 sign-off.
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#0e121d] border-t border-white/[0.08] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-[10px] text-zinc-500">
            <Lock className="h-3.5 w-3.5 text-zinc-400" />
            <span>Cryptographically sealed via Ed25519 & MMR Ledger</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-white/[0.08] hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer bg-[#0c101a]"
            >
              Cancel
            </button>
            <button
              onClick={handleSignAndCommit}
              disabled={!certifiedCheck || isSubmitting || submitted}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                submitted 
                  ? "bg-emerald-500 text-zinc-950"
                  : "bg-red-600 hover:bg-red-500 text-white border border-red-500/40"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>COMMITTED TO MMR LEDGER</span>
                </>
              ) : isSubmitting ? (
                <span>SEALING CRYPTOGRAPHIC HASH...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>DISPATCH IAF WORK ORDER & SPARES</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
