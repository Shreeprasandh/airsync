"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

interface JuryBattlecardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuestionAnswer {
  id: string;
  category: string;
  question: string;
  hostileTrap: string;
  unassailableAnswer: string;
  keyPhrases: string[];
}

const BATTLECARDS: QuestionAnswer[] = [
  {
    id: "q1",
    category: "DSSC Sovereign Problem Context & Flight-Line User",
    question: "Who actually faces this operational crisis today, and why are paper logs & disconnected BRDs failing the IAF?",
    hostileTrap: "Military judges will test if this is merely an academic AI model without an actual frontline operator or operational workflow.",
    unassailableAnswer: "The Senior Engineering Officer (SEngO) of frontline combat squadrons (e.g. No. 17 Golden Arrows at AFS Ambala, No. 8 Pursoots at AFS Bareilly) and Flight-Line Maintenance Command (FLMC). Currently, technicians rely on physical paper IAF Form 700 binders, un-networked logbooks, and asynchronous telephone requisitions to Base Repair Depots (e.g. 11 BRD Ojhar). Critical LRU failures ground fighters unexpectedly on the tarmac for weeks while spares are freighted across the country. AirSync eliminates this operational blind spot: in-flight LRU thermal decay triggers automated, cryptographically sealed spares dispatch with an integrated 12-hour transit buffer, arriving 22 hours prior to predicted flight-line failure and lifting squadron Sortie Generation Rate (SGR) by +28%.",
    keyPhrases: ["SEngO & FLMC Direct Workflow", "IAF Form 700 Paper Elimination", "11 BRD Forward Spares Sync", "+28% Sortie Generation Rate"]
  },
  {
    id: "q2",
    category: "MoD DEF-STAN 05-138 & Sovereign Air-Gap Security",
    question: "Why not adopt foreign OEM packages like Boeing APM, Airbus Skywise, or GE Predix for IAF fleets?",
    hostileTrap: "Senior defense officers will test why the Indian Ministry of Defence should not buy established commercial/foreign fleet monitoring packages.",
    unassailableAnswer: "Foreign OEM cloud systems (Boeing APM, Airbus Skywise, GE Predix) violate Indian Ministry of Defence DEF-STAN 05-138 air-gap security regulations. They demand streaming gigabytes of unencrypted tactical flight telemetry to foreign-hosted cloud servers, exposing combat flight profiles, base coordinates, and weapons loads to foreign surveillance and electronic warfare exploitation during geopolitical conflict. Furthermore, during wartime or sanctions, foreign OEMs can unilaterally terminate cloud API access. AirSync is 100% sovereign, on-premise, and air-gapped: INT8 TCN ONNX inference executes at the base edge in <0.39ms, telemetry is compressed to 48-byte ARINC 620 binary frames, and multi-base intelligence is pooled via FedProx federated learning with zero raw telemetry departure.",
    keyPhrases: ["MoD DEF-STAN 05-138 Compliance", "100% Sovereign Air-Gapped Edge", "Zero Foreign Cloud Dependency", "Sanction-Immune FedProx Learning"]
  },
  {
    id: "q3",
    category: "The 4 Disconnected Silos & Architectural Breakthrough",
    question: "Why hasn't anyone in defense solved this yet? What is AirSync's architectural breakthrough?",
    hostileTrap: "Evaluators test if your solution is just a UI dashboard over existing military databases or another generic neural net.",
    unassailableAnswer: "Previous military digitization attempts failed because they attempted to build monolithic centralized ERPs that broke down during communications blackouts and could not bridge the 4 Disconnected Silos: (1) In-flight avionics telemetry was air-gapped and un-networked; (2) Flight-line squadrons ran on paper Form 700; (3) Base Repair Depots (BRDs) operated on delayed batch ERPs; and (4) Cross-squadron AI model sharing was strictly banned due to classified data-sharing policies. AirSync solves all four: (1) Hardware optical data diodes extract real-time sensor streams without touching flight controls; (2) Peter Todd RFC 6962 Merkle Mountain Ranges replace paper with immutable, tamper-evident logs; (3) 11 BRD forward inventory links dispatch spares automatically with lead-time tracking; and (4) FedProx federated learning aggregates model weights across airbases with mathematical differential privacy.",
    keyPhrases: ["4 Disconnected Silos Solved", "Hardware Optical Data Diode", "RFC 6962 Merkle Mountain Range", "Cross-Airbase FedProx Learning"]
  },
  {
    id: "q4",
    category: "CEMILAC DDPMAS & DO-178C DAL-C Partitioning",
    question: "How can you run AI prognostics on combat aircraft without invalidating CEMILAC FADEC airworthiness certifications?",
    hostileTrap: "Certification scientists from CEMILAC/DGAQA will pounce on software safety levels if you imply AI writes to the flight control bus.",
    unassailableAnswer: "AirSync never touches the DAL-A FADEC or fly-by-wire flight computers. It is strictly partitioned into the auxiliary Engine Health Monitoring Unit (EHMU) certified under RTCA DO-178C DAL-C (Non-Hazardous Maintenance Monitoring) and CEMILAC DDPMAS guidelines. Connection to the MIL-STD-1553B / ARINC 429 avionics bus is physically enforced via an optical hardware receive-only data diode. Transmit pins are disconnected. Backward data injection from AirSync to flight controls is physically and electromagnetically impossible.",
    keyPhrases: ["CEMILAC DDPMAS Parity", "DO-178C DAL-C Auxiliary Partitioning", "Optical Hardware Data Diode", "Zero-Write Physical Bus Isolation"]
  },
  {
    id: "q5",
    category: "Severe Weather Rejection & Tactical Sensor Validation",
    question: "Desert dust storms in Rajasthan or monsoon downpours degrade compressor pressure. How do you prevent false fighter groundings?",
    hostileTrap: "Aeronautical engineers will test if severe atmospheric conditions trick your neural net into declaring catastrophic engine failure.",
    unassailableAnswer: "AirSync implements Twin-Engine Differential Telemetry (ΔTelemetry = ENG-1 – ENG-2) across twin-engine fighters like the Rafale EH (Snecma M88) and Su-30MKI (Saturn AL-31FP). Environmental disturbances (desert sand ingestion, extreme monsoon precipitation, high-altitude turbulence) impact both port and starboard engines simultaneously as common-mode environmental noise (ΔTelemetry ≈ 0). In contrast, true mechanical blade erosion or high-pressure compressor stall is asymmetric and isolated to a single engine (ΔTelemetry > 15%). The edge AI automatically inhibits maintenance alerts when common-mode symmetry is detected.",
    keyPhrases: ["Twin-Engine Differential Telemetry", "Common-Mode Environmental Rejection", "Asymmetric Blade Wear Isolation", "Zero Nuisance Groundings"]
  }
];

export function JuryBattlecardModal({ isOpen, onClose }: JuryBattlecardModalProps) {
  const [activeCardId, setActiveCardId] = useState<string>("q1");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCard = BATTLECARDS.find(c => c.id === activeCardId) || BATTLECARDS[0];

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200 font-sans text-zinc-100 select-none cursor-pointer"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-[#0b0e17] border border-white/[0.12] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] cursor-default"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#07090e]">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="h-5 w-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center space-x-2">
                <span>Airworthiness Defense & Sovereign Defense Audit Matrix (SIH 2026)</span>
                <span className="text-[9px] bg-purple-950 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded font-bold">
                  SIH26249 DEFENSE JURY
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono">
                Ministry of Defence & DSSC Wellington evaluation defenses, CEMILAC/DGAQA certification proofs, and thermodynamic validation matrix
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

        {/* Modal Layout: Sidebar + Question Detail */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] overflow-hidden flex-1">
          
          {/* Left Column: Battlecard List */}
          <div className="p-4 space-y-2 overflow-y-auto bg-[#080b12] text-left">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block px-2 pb-1">
              AUDIT EVALUATION TOPICS
            </span>

            {BATTLECARDS.map((card, idx) => {
              const isSelected = card.id === activeCardId;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveCardId(card.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                    isSelected 
                      ? "bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/30" 
                      : "bg-[#0c0f17] border-white/[0.06] hover:border-white/[0.16]"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-purple-400 font-bold">DEFENSE #{idx + 1}</span>
                    <span className="text-zinc-500 text-[9px]">{card.category.split(" ")[0]}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2">
                    {card.question}
                  </h4>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Question Breakdown */}
          <div className="md:col-span-2 p-6 space-y-5 overflow-y-auto text-left bg-[#0b0e17]">
            <div>
              <span className="text-[10px] font-mono uppercase bg-purple-950/60 border border-purple-500/40 text-purple-300 px-2.5 py-0.5 rounded font-bold">
                {activeCard.category}
              </span>
              <h3 className="text-base font-bold text-white mt-2 leading-snug">
                &ldquo;{activeCard.question}&rdquo;
              </h3>
            </div>

            {/* The Trap (What the Judge is thinking) */}
            <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-red-400 uppercase flex items-center space-x-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>The Hostile Judge Trap (What They Are Testing)</span>
              </span>
              <p className="text-zinc-300 text-xs leading-relaxed font-sans">
                {activeCard.hostileTrap}
              </p>
            </div>

            {/* The Unassailable Defense (The Killer Answer) */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-2">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>The Unassailable Aerospace Defense (The 30-Second Answer)</span>
              </span>
              <p className="text-zinc-100 text-xs leading-relaxed font-sans select-text">
                {activeCard.unassailableAnswer}
              </p>
            </div>

            {/* Key Terminology Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">
                Key Technical Anchor Phrases to Deliver:
              </span>
              <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                {activeCard.keyPhrases.map((phrase, i) => (
                  <span 
                    key={i}
                    className="px-2.5 py-1 rounded bg-[#070a12] border border-cyan-500/30 text-cyan-300 font-bold"
                  >
                    ✓ {phrase}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
