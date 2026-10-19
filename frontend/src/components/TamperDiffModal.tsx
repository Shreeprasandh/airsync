"use client";

import React, { useEffect } from "react";
import { X, ShieldAlert, AlertOctagon, CheckCircle2 } from "lucide-react";

interface TamperDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  tamperedLeafIndex?: number;
  originalHash?: string;
  tamperedHash?: string;
  originalHealth?: number;
  tamperedHealth?: number;
  rootMismatch?: boolean;
}

export function TamperDiffModal({
  isOpen,
  onClose,
  tamperedLeafIndex = 15,
  originalHash = "0xa3bb0c994a921121ba5195aea84be9b429efd2b9714b7f37addcdae02f0bbf5",
  tamperedHash = "0xf8e19c0281b37492c10aa241bf9841804b78912c9041ea51809ba472689ef210",
  originalHealth = 0.98,
  tamperedHealth = 0.45,
  rootMismatch = true
}: TamperDiffModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200 font-sans text-zinc-100 select-none cursor-pointer"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-[#0b0e17] border border-red-500/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col font-sans cursor-default"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-red-950/30">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-200 font-mono flex items-center space-x-2">
                <span>Cryptographic Ledger Tamper Defense • Peter Todd MMR Verification</span>
                {rootMismatch && (
                  <span className="text-[9px] bg-red-950 border border-red-500/50 text-red-300 px-2 py-0.5 rounded font-bold">
                    ROOT MISMATCH DETECTED
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono">
                Unauthorized bit-level modification intercepted and rejected in O(log N) verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Diff Content */}
        <div className="p-6 space-y-5 text-left text-xs font-mono">
          
          {/* Target Record Info */}
          <div className="flex items-center justify-between bg-[#070a12] p-3 rounded-xl border border-white/[0.06]">
            <span className="text-zinc-400">TARGET AUDIT ROW:</span>
            <span className="font-bold text-cyan-400">LEAF INDEX #{tamperedLeafIndex} (SQLite mro_ledger)</span>
          </div>

          {/* Side-by-Side Payload Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Original State */}
            <div className="p-4 bg-[#070a12] border border-emerald-500/30 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Legitimate Signed Record</span>
              </span>
              <div className="space-y-1 text-[11px] text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">HEALTH SNAPSHOT:</span>
                  <strong className="text-emerald-400 font-bold">{(originalHealth * 100).toFixed(0)}% (NOMINAL)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SIGNING STATION:</span>
                  <span className="text-zinc-300">STATION_001 (BLR)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">AME LICENSE:</span>
                  <span className="text-zinc-300">AME-B1-8429</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-[9px] text-zinc-500 block">SHA-256 LEAF DIGEST:</span>
                <span className="text-[9px] text-emerald-300/90 break-all select-all">{originalHash}</span>
              </div>
            </div>

            {/* Tampered State */}
            <div className="p-4 bg-red-950/20 border border-red-500/40 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-red-400 uppercase flex items-center space-x-1.5">
                <AlertOctagon className="h-3.5 w-3.5" />
                <span>Malicious Modification (Bit-Flip)</span>
              </span>
              <div className="space-y-1 text-[11px] text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">HEALTH SNAPSHOT:</span>
                  <strong className="text-red-400 font-bold">{(tamperedHealth * 100).toFixed(0)}% (FALSIFIED)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SIGNING STATION:</span>
                  <span className="text-zinc-400 line-through">STATION_001 (BLR)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">HSM INTEGRITY:</span>
                  <span className="text-red-400 font-bold">SIGNATURE INVALID</span>
                </div>
              </div>
              <div className="pt-2 border-t border-red-500/20">
                <span className="text-[9px] text-zinc-500 block">CORRUPTED SHA-256 DIGEST:</span>
                <span className="text-[9px] text-red-300 break-all select-all">{tamperedHash}</span>
              </div>
            </div>

          </div>

          {/* Cryptographic Proof Cascade Alert */}
          <div className="p-4 bg-red-950/30 border border-red-500/50 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase">
              <ShieldAlert className="h-4 w-4" />
              <span>MMR PEAK CASCADE REJECTION</span>
            </div>
            <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
              Because Peter Todd Merkle Mountain Ranges use deterministic parent hashing:
              <span className="block font-mono text-[10px] text-cyan-300 py-1">
                Parent_Hash = SHA256(Left_Peak + Right_Peak)
              </span>
              Flipping a single bit in Leaf #{tamperedLeafIndex} propagates exponentially up Mountain 1 Peak #15, 
              causing an immediate mismatch with the hardware-sealed MMR Root Seal. Verification aborted in &lt;1.8ms.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              CLOSE AUDIT ALERT
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
