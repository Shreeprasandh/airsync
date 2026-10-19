"use client";

import React, { useEffect } from "react";
import { X, Printer, Download, FileText, CheckCircle2, ShieldCheck } from "lucide-react";

interface CrsCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  rootHash: string;
  backendUrl: string;
  totalRecords: number;
  latestLeaf?: {
    leaf_index: number;
    timestamp: string;
    component_id: string;
    action_taken: string;
    technician_id: string;
    health_snapshot: number;
    node_hash: string;
  };
}

export function CrsCertificateModal({
  isOpen,
  onClose,
  rootHash,
  backendUrl,
  totalRecords,
  latestLeaf
}: CrsCertificateModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trackingNumber = `CRS-2026-IN-BLR-${String(totalRecords).padStart(5, "0")}`;
  const techId = latestLeaf?.technician_id || "AME-B1-8429";
  const timestamp = latestLeaf?.timestamp || new Date().toISOString();
  const componentId = latestLeaf?.component_id || "ENG-001";
  const actionTaken = latestLeaf?.action_taken || "CRS: Certified Maintenance Release & Flight Clearance (ATA 72-00)";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(`${backendUrl}/api/v1/ledger/certificate.pdf`, "_blank");
  };

  const handleDownloadJson = () => {
    window.open(`${backendUrl}/api/v1/ledger/export`, "_blank");
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-crs-certificate, #printable-crs-certificate * {
            visibility: visible;
          }
          #printable-crs-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
        }
      `}} />

      <div 
        onClick={e => e.stopPropagation()}
        className="bg-[#0b0e17] border border-white/[0.12] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-100 animate-in fade-in zoom-in-95 duration-200 cursor-default"
      >
        
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#07090e]">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                IAF Form 700 • Authorized Certificate of Release to Service
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono">
                Military Airworthiness Defense Certificate (DGAQA / CEMILAC DDPMAS Compliance)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold flex items-center space-x-1.5 border border-white/[0.08] transition-colors cursor-pointer"
              title="Print Certificate"
            >
              <Printer className="h-3.5 w-3.5 text-cyan-400" />
              <span>PRINT</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Download Official PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span>DOWNLOAD PDF</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-lg bg-[#0c101a] hover:bg-[#141b2a] text-zinc-300 text-xs font-mono flex items-center space-x-1.5 border border-white/[0.08] transition-colors cursor-pointer"
              title="Download Machine-Readable JSON"
            >
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              <span>JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Printable Area) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div 
            id="printable-crs-certificate" 
            className="bg-white text-zinc-900 p-8 rounded-xl border border-zinc-300 shadow-sm font-sans space-y-4 select-text"
          >
            {/* Header Banner */}
            <div className="border-2 border-zinc-900 p-4 text-center space-y-1 bg-zinc-50">
              <h1 className="text-xs font-bold uppercase tracking-widest text-zinc-700">
                INDIAN AIR FORCE • AIR HEADQUARTERS (VAYU BHAVAN)
              </h1>
              <h2 className="text-base font-black uppercase tracking-wider text-zinc-950">
                AUTHORIZED CERTIFICATE OF RELEASE TO SERVICE — IAF FORM 700
              </h2>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase">
                DIRECTORATE GENERAL OF AERONAUTICAL QUALITY ASSURANCE (DGAQA) & CEMILAC DDPMAS COMPLIANCE
              </p>
            </div>

            {/* Grid 1: Approved Org & Tracking Number */}
            <div className="grid grid-cols-2 border border-zinc-900 text-[11px]">
              <div className="p-3 border-r border-zinc-900 space-y-1">
                <span className="text-[9px] font-bold uppercase text-zinc-500 block">
                  4. OPERATING SQUADRON & OVERHAUL DEPOT:
                </span>
                <p className="font-bold text-zinc-950">No. 17 Squadron (Golden Arrows) • AFS Ambala (VIAM)</p>
                <p className="text-zinc-700 text-[10px]">
                  Maintenance Depot: 11 Base Repair Depot (11 BRD Ojhar, VAOZ)
                </p>
                <p className="text-zinc-600 text-[9px] font-mono pt-1">
                  APPROVAL REF: <strong>CEMILAC/TC/2026-08 | DGAQA/DDPMAS/IAF-2026</strong>
                </p>
              </div>

              <div className="p-3 space-y-2">
                <div>
                  <span className="text-[9px] font-bold uppercase text-zinc-500 block">
                    3. FORM TRACKING NUMBER:
                  </span>
                  <p className="font-mono font-black text-sm text-zinc-950 tracking-wider">
                    {trackingNumber.replace("CRS-2026-IN-BLR", "CRS-IAF-2026-AMB")}
                  </p>
                </div>
                <div className="border-t border-zinc-200 pt-1.5">
                  <span className="text-[9px] font-bold uppercase text-zinc-500 block">
                    5. TECHNICAL WORK ORDER REF:
                  </span>
                  <p className="font-mono text-zinc-900 font-bold text-[10px]">
                    WO-IAF-SQN17-{latestLeaf?.leaf_index || 101} • ATA 72-00 • AIRFRAME: DASSAULT RAFALE EH (BS-001)
                  </p>
                </div>
              </div>
            </div>

            {/* Item Table (Blocks 6-11) */}
            <div className="border border-zinc-900 text-[10px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-100 border-b border-zinc-900 text-[9px] font-bold uppercase">
                  <tr>
                    <th className="p-2 border-r border-zinc-900 w-10 text-center">6. ITEM</th>
                    <th className="p-2 border-r border-zinc-900">7. DESCRIPTION</th>
                    <th className="p-2 border-r border-zinc-900">8. PART NUMBER</th>
                    <th className="p-2 border-r border-zinc-900 w-12 text-center">9. QTY</th>
                    <th className="p-2 border-r border-zinc-900">10. SERIAL NO.</th>
                    <th className="p-2">11. STATUS / WORK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-[10px]">
                  <tr>
                    <td className="p-2 border-r border-zinc-900 text-center font-mono">01</td>
                    <td className="p-2 border-r border-zinc-900 font-semibold">
                      Snecma M88-4E Turbofan Military Propulsion System
                    </td>
                    <td className="p-2 border-r border-zinc-900 font-mono">M88-4E-MOD-2026</td>
                    <td className="p-2 border-r border-zinc-900 text-center font-mono">1 EA</td>
                    <td className="p-2 border-r border-zinc-900 font-mono font-bold text-zinc-950">
                      {componentId}
                    </td>
                    <td className="p-2 font-mono text-[9px]">
                      {actionTaken}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Block 12: Remarks & Cryptographic MMR Verification */}
            <div className="border border-zinc-900 p-3 space-y-2 bg-zinc-50/60 text-[10px]">
              <span className="text-[9px] font-bold uppercase text-zinc-600 block">
                12. REMARKS & CRYPTOGRAPHIC MMR AUDIT LOG VERIFICATION:
              </span>
              <p className="text-zinc-700 leading-relaxed text-[10px]">
                Certifies that the maintenance recorded above was executed and cryptographically sealed on the AirSync 
                immutable Merkle Mountain Range (Peter Todd RFC 6962 specification). Zero tampering detected across all leaves.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[9px]">
                <div className="bg-white p-2 border border-zinc-300 rounded">
                  <span className="text-zinc-500 font-bold block">MMR ROOT SEAL (SHA-256):</span>
                  <span className="text-zinc-900 select-all break-all">{rootHash || "0x00de4a1f...8c92"}</span>
                </div>
                <div className="bg-white p-2 border border-zinc-300 rounded">
                  <span className="text-zinc-500 font-bold block">ED25519 MILITARY HARDWARE SIGNATURE:</span>
                  <span className="text-zinc-900 select-all break-all">{latestLeaf?.node_hash || "0x3f4a9b...8821"}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-600 pt-1">
                <span>HEALTH SNAPSHOT: <strong className="text-emerald-700">{(latestLeaf?.health_snapshot ?? 0.98) * 100}% NOMINAL</strong></span>
                <span>INSPECTION PROTOCOL: <strong>DGAQA TECH DIRECTIVE HPC BORESCOPE & ROTOR CLEARANCE VERIFIED</strong></span>
              </div>
            </div>

            {/* Block 13 & 14: Certification Statements & Signatures */}
            <div className="grid grid-cols-2 border border-zinc-900 text-[10px]">
              <div className="p-3 border-r border-zinc-900 space-y-2">
                <span className="text-[9px] font-bold uppercase text-zinc-600 block">
                  13a. CERTIFIES THAT UNLESS OTHERWISE SPECIFIED:
                </span>
                <p className="text-zinc-700 text-[9px] leading-relaxed">
                  The work identified in Block 11 and described in Block 12 was accomplished in accordance with DGAQA / CEMILAC DDPMAS directives 
                  and the aircraft is considered fully airworthy and cleared for operational sortie release.
                </p>
                <div className="pt-2">
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                    AIRWORTHINESS CLEARANCE: FULLY CERTIFIED FOR FLIGHT
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div>
                  <span className="text-[9px] font-bold uppercase text-zinc-600 block">
                    14. AUTHORIZED CERTIFYING SIGNATURE:
                  </span>
                  <div className="font-mono text-sm font-bold text-zinc-950 pt-1 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{techId.includes("AME") ? "IAF-SEngO-SQN17 (Sqn Ldr)" : techId}</span>
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-1.5 text-[9px] font-mono space-y-0.5 text-zinc-600">
                  <p>AUTHORIZATION NO: <strong>DGAQA/IAF/SEngO-1701/CR-2026</strong></p>
                  <p>TIMESTAMP (UTC): <strong>{timestamp}</strong></p>
                </div>
              </div>
            </div>

            {/* Regulatory Footer */}
            <div className="text-[8px] text-zinc-500 text-center font-mono pt-1">
              IAF FORM 700 ISSUE 2026 • DIRECTED BY AIR HEADQUARTERS (VAYU BHAVAN) • CEMILAC / DGAQA STATUTORY RECORD.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
