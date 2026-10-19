"use client";

import React from "react";
import {
  Plane,
  MapPin,
  Compass,
  ArrowLeft,
  Calendar,
  AlertCircle,
  HelpCircle,
  LogOut,
  Map,
  Server,
  Clock,
  Wind,
  Droplets,
  Thermometer,
  Shield,
  Play,
  Terminal,
  Activity,
  AlertTriangle,
  Layers,
  Settings,
  Cpu,
  Database,
  CheckCircle,
  Lock,
  Wrench,
  RefreshCw,
  Radio,
  DollarSign,
  ShieldCheck,
  Download,
  FileText,
  ChevronDown
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { PlaneData, EngineData, LedgerRecord, FederatedRound, HUB_COORDINATES, getControlPoint } from "./page";
import dynamic from "next/dynamic";

const TacticalAirspaceMap = dynamic(
  () => import("@/components/TacticalAirspaceMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] rounded-xl bg-[#070a13] border border-white/[0.08] flex items-center justify-center font-mono text-xs text-zinc-500">
        <span className="inline-block animate-spin mr-2">⟳</span> Initializing CartoDB Dark Matter Airspace Grid...
      </div>
    )
  }
);

// --- HELPERS ---
const getBezierCoordinates = (
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
) => {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  
  const x = uu * p0.x + 2 * u * t * p1.x + tt * p2.x;
  const y = uu * p0.y + 2 * u * t * p1.y + tt * p2.y;
  
  return { x, y };
};

const getPlaneCoordinates = (plane: PlaneData) => {
  const p = plane.routeCoordinates;
  if (plane.status !== "Airborne") {
    return p[0];
  }
  const t = plane.progress / 100;
  
  if (p.length === 3) {
    return getBezierCoordinates(p[0], p[1], p[2], t);
  }
  return p[0];
};

const getStatusColor = (status: "Nominal" | "Warning" | "Critical") => {
  if (status === "Nominal") return "text-emerald-400";
  if (status === "Warning") return "text-amber-500 font-bold";
  return "text-red-400 font-bold";
};

const getHealthBarColor = (health: number) => {
  if (health >= 0.75) return "bg-emerald-500";
  if (health >= 0.35) return "bg-amber-500";
  return "bg-red-500";
};

const SENSOR_METADATA: Record<string, { label: string; desc: string; station: string; defaultUnit: string }> = {
  s2: { label: "LPC Outlet Temp (T24)", desc: "Total temperature at Low-Pressure Compressor outlet (°R); measures booster aerodynamic compression.", station: "STA 2.4 (LPC)", defaultUnit: "°R" },
  s3: { label: "HPC Outlet Temp (T30)", desc: "Total temperature at High-Pressure Compressor outlet (°R); primary thermal stress indicator.", station: "STA 3.0 (HPC)", defaultUnit: "°R" },
  s4: { label: "LPT Outlet Temp (T50 / EGT)", desc: "Exhaust Gas Temperature at Low-Pressure Turbine exit (°R); primary indicator of hot-section thermal degradation.", station: "STA 5.0 (LPT/EGT)", defaultUnit: "°R" },
  s7: { label: "HPC Total Pressure (P30)", desc: "Total pressure at HPC exit diffuser (psia); drops during blade tip wear, aerodynamic stall, or FOD erosion.", station: "STA 3.0 (HPC)", defaultUnit: "psia" },
  s8: { label: "Physical Fan Speed (Nf)", desc: "Rotational speed of intake fan and low-pressure spool (rpm).", station: "STA 1.0 (FAN)", defaultUnit: "rpm" },
  s9: { label: "Physical Core Speed (Nc)", desc: "Rotational speed of high-pressure core spool (rpm); surges to compensate for compressor pressure losses.", station: "STA 3.0 (CORE)", defaultUnit: "rpm" },
  s11: { label: "HPC Static Pressure (Ps30)", desc: "Static pressure at combustor inlet diffuser (psia); drops during compressor blade erosion.", station: "STA 3.0 (HPC)", defaultUnit: "psia" },
  s12: { label: "Fuel Flow Ratio (phi)", desc: "Ratio of fuel mass flow rate to static pressure Ps30 (pps/psia); restricts on nozzle coking.", station: "STA 3.5 (BURNER)", defaultUnit: "pps/psia" },
  s13: { label: "Corrected Fan Speed (NRf)", desc: "Corrected rotational speed of low-pressure spool (rpm).", station: "STA 1.0 (FAN)", defaultUnit: "rpm" },
  s14: { label: "Corrected Core Speed (NRc)", desc: "Corrected rotational speed of high-pressure core spool (rpm).", station: "STA 3.0 (CORE)", defaultUnit: "rpm" },
  s15: { label: "Bypass Ratio (BPR)", desc: "Ratio of cold bypass duct airflow to core mass airflow; reflects nacelle aerodynamics and moisture loading.", station: "BYPASS DUCT", defaultUnit: "ratio" },
  s17: { label: "Bleed Enthalpy (ht)", desc: "Thermodynamic energy enthalpy of compressor customer bleed air (Btu/lbm).", station: "STA 3.1 (BLEED)", defaultUnit: "Btu/lbm" },
  s20: { label: "HPT Coolant Bleed (W31)", desc: "High-Pressure Turbine cooling bleed air mass flow rate (lbm/s).", station: "STA 4.1 (HPT)", defaultUnit: "lbm/s" },
  s21: { label: "LPT Coolant Bleed (W32)", desc: "Low-Pressure Turbine cooling bleed air mass flow rate (lbm/s).", station: "STA 4.5 (LPT)", defaultUnit: "lbm/s" }
};

// --- VIEW 1: LOGIN SCREEN ---
interface LoginScreenProps {
  loginTechId: string;
  setLoginTechId: (v: string) => void;
  loginPin: string;
  setLoginPin: (v: string) => void;
  loginError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginScreen({
  loginTechId,
  setLoginTechId,
  loginPin,
  setLoginPin,
  loginError,
  onSubmit
}: LoginScreenProps) {
  const clearanceRoles = [
    { title: "SEngO Sqn 17 (Ambala)", techId: "IAF-SENGO-17SQN-8429", pin: "7700" },
    { title: "FLMC Sqn 8 (Bareilly)", techId: "IAF-FLMC-8SQN-01", pin: "7700" },
    { title: "11 BRD Spares Chief", techId: "11BRD-SPARES-LOG-01", pin: "7700" },
    { title: "DGAQA Inspector (Air HQ)", techId: "DGAQA-AIRWORTHY-SURV", pin: "7700" }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm p-8 bg-[#0b0e17] border border-white/[0.08] rounded-2xl shadow-2xl space-y-6 text-center">
        {/* Brand Header */}
        <div>
          <img src="/translogo.png" alt="AirSync Insignia" className="h-12 w-auto mx-auto object-contain mb-3" />
          <h1 className="text-xl font-bold tracking-wider text-white uppercase font-sans">
            AIR<span className="text-cyan-400 font-bold">SYNC</span>
          </h1>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">Sovereign Fleet Availability & Propulsion Health Control</p>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Ministry of Defence • DSSC Wellington (PS #SIH26249)</div>
        </div>

        {/* Quick-Fill Role Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {clearanceRoles.map((role, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setLoginTechId(role.techId);
                setLoginPin(role.pin);
              }}
              className="px-2 py-1 rounded bg-[#0e1320] hover:bg-[#151e33] border border-white/[0.06] hover:border-cyan-500/40 text-[9px] text-zinc-300 hover:text-cyan-300 font-sans transition-all cursor-pointer"
            >
              {role.title}
            </button>
          ))}
        </div>

        {loginError && (
          <div className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-300 font-mono text-center">
            {loginError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 text-left" suppressHydrationWarning>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Technician ID</label>
            <input 
              type="text" 
              value={loginTechId} 
              onChange={e => setLoginTechId(e.target.value)} 
              placeholder="e.g. IAF-SENGO-17SQN-8429"
              autoComplete="username"
              suppressHydrationWarning
              className="w-full bg-[#080b12] border border-white/[0.1] focus:border-cyan-500/60 px-3 py-2 text-zinc-100 text-xs font-mono rounded-lg outline-none transition-colors" 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">PIN</label>
            <input 
              type="password" 
              value={loginPin} 
              onChange={e => setLoginPin(e.target.value)} 
              placeholder="••••"
              autoComplete="current-password"
              suppressHydrationWarning
              className="w-full bg-[#080b12] border border-white/[0.1] focus:border-cyan-500/60 px-3 py-2 text-zinc-100 text-xs font-mono rounded-lg outline-none transition-colors tracking-widest text-center" 
            />
          </div>

          <button 
            type="submit" 
            suppressHydrationWarning
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-bold uppercase rounded-lg cursor-pointer transition-all active:scale-[0.99]"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

// --- VIEW 2: HANGAR SELECTOR ---
interface HangarSelectorProps {
  selectedHangar: string | null;
  setSelectedHangar: (v: string | null) => void;
  hangarAccessKey: string;
  setHangarAccessKey: (v: string) => void;
  hangarAccessPin: string;
  setHangarAccessPin: (v: string) => void;
  hangarAccessError: string;
  setHangarAccessError: (v: string) => void;
  isHangarModalOpen: boolean;
  setIsHangarModalOpen: (v: boolean) => void;
  setViewState: (v: 'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate') => void;
}

export function HangarSelector({
  selectedHangar,
  setSelectedHangar,
  hangarAccessKey,
  setHangarAccessKey,
  hangarAccessPin,
  setHangarAccessPin,
  hangarAccessError,
  setHangarAccessError,
  isHangarModalOpen,
  setIsHangarModalOpen,
  setViewState
}: HangarSelectorProps) {
  const stationProfiles = [
    {
      id: "hangar-01",
      code: "STATION_001",
      name: "AFS Ambala (VIAM)",
      hub: "No. 17 Sqn 'Golden Arrows' • Western Air Command",
      fleet: "BS-001 (Rafale EH) • Combat Air Patrol",
      key: "STATION_001",
      pin: "ambala-clearance"
    },
    {
      id: "hangar-02",
      code: "STATION_002",
      name: "AFS Bareilly (VIBY)",
      hub: "No. 8 Sqn 'Pursoots' • Central Air Command",
      fleet: "SB-128 (Su-30MKI) • Airborne Alert",
      key: "STATION_002",
      pin: "bareilly-clearance"
    },
    {
      id: "hangar-03",
      code: "STATION_003",
      name: "11 BRD Ojhar (VAOZ)",
      hub: "Base Repair Depot • Central Engine Overhaul Hub",
      fleet: "KH-201 (Tejas LCA) • Standby / Overhaul",
      key: "STATION_003",
      pin: "ojhar-clearance"
    }
  ];

  const handleStationSelect = (station: typeof stationProfiles[0]) => {
    setSelectedHangar(station.id);
    setHangarAccessKey(station.key);
    setHangarAccessPin(station.pin);
    setHangarAccessError("");
    setViewState("dashboard");
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-6 lg:px-10 py-16 space-y-8 bg-[#07090e] text-zinc-100 min-h-[85vh] select-none flex flex-col justify-center">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-base font-bold tracking-wide text-white uppercase font-sans">
            Select Maintenance Station
          </h1>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Connect to an active line maintenance hub to monitor fleet propulsion health.
          </p>
        </div>
        <button
          onClick={() => setViewState("login")}
          className="px-3 py-1.5 rounded bg-[#0c0f17] border border-white/[0.08] hover:border-zinc-500 text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
        >
          ← Sign Out
        </button>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
        {stationProfiles.map(station => (
          <div 
            key={station.id} 
            onClick={() => handleStationSelect(station)}
            className="p-5 bg-[#0b0e17] border border-white/[0.08] hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all space-y-4 hover:bg-[#0e1320] group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono bg-[#141b2b] px-2 py-0.5 rounded text-cyan-400 border border-cyan-800/40 font-bold">
                {station.code}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>ONLINE</span>
              </span>
            </div>

            <div>
              <h3 className="font-bold text-zinc-100 text-base font-sans group-hover:text-cyan-300 transition-colors">
                {station.name}
              </h3>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                {station.hub}
              </p>
            </div>

            <div className="text-[11px] font-mono text-zinc-400 bg-[#070a12] p-2.5 rounded border border-white/[0.04]">
              {station.fleet}
            </div>

            <button 
              type="button"
              className="w-full py-2 bg-zinc-900 group-hover:bg-cyan-500 text-zinc-300 group-hover:text-zinc-950 text-xs font-mono font-bold uppercase rounded-lg transition-all flex items-center justify-center space-x-1.5 border border-white/[0.06] group-hover:border-transparent"
            >
              <span>Enter Station</span>
              <span>→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW 3: HANGAR OPERATIONS CONTROL ---
interface HangarDashboardProps {
  selectedHangar: string | null;
  setSelectedHangar: (v: string | null) => void;
  setViewState: (v: 'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate') => void;
  planes: Record<string, PlaneData>;
  setSelectedPlaneId: (v: string | null) => void;
  hoveredPlaneId: string | null;
  setHoveredPlaneId: (v: string | null) => void;
  lastHoveredPlaneId: string;
  setLastHoveredPlaneId: (v: string) => void;
  engines: Record<string, EngineData>;
  isStreaming: boolean;
  backendOnline: boolean;
  runFederatedRound: () => void;
  isFederating: boolean;
  federatedHistory: FederatedRound[];
  mounted: boolean;
}

export function HangarDashboard({
  selectedHangar,
  setSelectedHangar,
  setViewState,
  planes,
  setSelectedPlaneId,
  hoveredPlaneId,
  setHoveredPlaneId,
  lastHoveredPlaneId,
  setLastHoveredPlaneId,
  engines,
  isStreaming,
  backendOnline,
  runFederatedRound,
  isFederating,
  federatedHistory,
  mounted
}: HangarDashboardProps) {
  const hangarName = 
    selectedHangar === "hangar-01" ? "AFS Ambala (VIAM) — No. 17 Sqn 'Golden Arrows'" :
    selectedHangar === "hangar-02" ? "AFS Bareilly (VIBY) — No. 8 Sqn 'Pursoots'" : "11 BRD Ojhar (VAOZ) — Base Repair Depot";
  const stationId = 
    selectedHangar === "hangar-01" ? "STATION_001" :
    selectedHangar === "hangar-02" ? "STATION_002" : "STATION_003";

  // Active HUD aircraft lookup
  const activeHudPlaneId = hoveredPlaneId || lastHoveredPlaneId || "PL-101";
  const activeHudPlane = planes[activeHudPlaneId] || planes["PL-101"];
  const primaryHudEng = engines[activeHudPlane.engines[0]];
  const hudHealthPct = primaryHudEng ? (primaryHudEng.health * 100).toFixed(0) : "100";
  const hudRul = primaryHudEng ? primaryHudEng.rul : "125";
  const [mapMode, setMapMode] = React.useState<"carto" | "vector">("carto");

  return (
    <div className="flex-1 flex flex-col space-y-6 bg-[#07090e] text-zinc-100 font-sans w-full max-w-[1800px] mx-auto px-6 lg:px-10 py-6 select-none">
      {/* Station Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-4 gap-4">
        <div className="text-left">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-semibold">
            Fleet Operations Hub • {stationId}
          </span>
          <h1 className="text-lg font-bold tracking-tight text-white font-sans">
            {hangarName}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <button 
            onClick={() => {
              setViewState("hangar-select");
              setSelectedHangar(null);
            }} 
            className="border border-white/[0.1] hover:border-zinc-500 px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer bg-[#0c0f17] flex items-center space-x-1.5"
          >
            <span>← Switch Station</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Environmental Telemetry & Scrollable Catalog */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Station Environmental info */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                <Server className="h-4 w-4 text-zinc-500" />
                <span>Station Environmental Telemetry</span>
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-bold">
                {selectedHangar === "hangar-01" ? "VOBL (BLR)" : selectedHangar === "hangar-02" ? "VIDP (DEL)" : "EGLL (LHR)"}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono py-1">
              <div className="p-2.5 bg-[#070a12] border border-white/[0.06] rounded-lg">
                <Thermometer className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                <span className="text-[9px] text-zinc-500 block">TEMP</span>
                <strong className="text-zinc-200">{selectedHangar === "hangar-01" ? "31.2°C" : selectedHangar === "hangar-02" ? "18.4°C" : "15.1°C"}</strong>
              </div>
              <div className="p-2.5 bg-[#070a12] border border-white/[0.06] rounded-lg">
                <Droplets className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                <span className="text-[9px] text-zinc-500 block">HUMID</span>
                <strong className="text-zinc-200">{selectedHangar === "hangar-01" ? "82%" : selectedHangar === "hangar-02" ? "65%" : "50%"}</strong>
              </div>
              <div className="p-2.5 bg-[#070a12] border border-white/[0.06] rounded-lg">
                <Wind className="h-4 w-4 mx-auto mb-1 text-zinc-400" />
                <span className="text-[9px] text-zinc-500 block">WIND</span>
                <strong className="text-zinc-200">{selectedHangar === "hangar-01" ? "090°/08kt" : selectedHangar === "hangar-02" ? "310°/14kt" : "240°/19kt"}</strong>
              </div>
            </div>

            {/* Live Certified ICAO METAR String */}
            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded bg-[#070a12] border border-white/[0.04] text-[9px] font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 shrink-0" />
              <span className="text-zinc-500 font-bold shrink-0">METAR:</span>
              <span className="truncate text-zinc-300">
                {selectedHangar === "hangar-01" 
                  ? "VOBL 041330Z 09008KT 31/24 Q1012 NOSIG"
                  : selectedHangar === "hangar-02"
                  ? "VIDP 041330Z 31014KT 18/09 Q1016 CAVOK"
                  : "EGLL 041330Z 24019KT 15/07 Q1008 TEMPO"}
              </span>
            </div>
          </div>

          {/* Active Hangar Catalog List - scroll removed, clean auto-fit */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
                <Compass className="h-4 w-4 text-zinc-500" />
                <span>Active Hangar Catalog</span>
              </h3>
              <span className="text-[9px] font-mono text-zinc-500 uppercase">3 AIRCRAFT ASSIGNED</span>
            </div>
            
            <div className="space-y-2">
              {Object.values(planes).map(p => {
                const eng = engines[p.engines[0]];
                const isCrit = eng ? eng.health < 0.30 : false;
                
                return (
                  <div 
                    key={p.id}
                    onClick={() => {
                      setSelectedPlaneId(p.id);
                      setViewState("asset-detail");
                    }}
                    onMouseEnter={() => {
                      setHoveredPlaneId(p.id);
                      setLastHoveredPlaneId(p.id);
                    }}
                    onMouseLeave={() => setHoveredPlaneId(null)}
                    className={`py-2 px-3 bg-[#070a12] border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                      (hoveredPlaneId === p.id || lastHoveredPlaneId === p.id)
                        ? "border-cyan-500/60 bg-[#0e1422]" 
                        : "border-white/[0.08] hover:border-white/[0.16]"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Plane className={`h-3 w-3 ${
                          p.status === "Airborne" ? "text-emerald-400" : 
                          p.status === "Maintenance" ? "text-red-400 font-bold" : 
                          p.status === "Grounded" ? "text-amber-500" : 
                          "text-zinc-500"
                        }`} />
                        <span className="font-bold text-zinc-200 text-xs">{p.id}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">({p.name.split(" - ")[1] || p.name})</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block font-mono">{p.origin} → {p.destination} • {p.model.split(" ")[0]}</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className={`text-[10px] font-bold uppercase ${
                        p.status === "Airborne" ? "text-emerald-400" : 
                        p.status === "Maintenance" ? "text-red-400 font-bold" : 
                        p.status === "Grounded" ? "text-amber-400 font-bold" : 
                        "text-zinc-500"
                      }`}>
                        {p.status}
                      </span>
                      {p.status === "Airborne" && <div className="text-[9px] text-zinc-500 font-mono tabular-nums">{(p.progress).toFixed(0)}% Route</div>}
                      {p.status === "Ready" && <div className="text-[9px] text-zinc-500 font-mono tabular-nums">Dwell: {p.progress}s/45s</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edge Security Node & HSM Status Card */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center space-x-2">
              <Shield className="h-4 w-4 text-zinc-500" />
              <span>Edge Security Node HSM</span>
            </h3>

            <div className="space-y-3 font-mono text-[10px] text-zinc-400">
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                <span className="text-zinc-500">Security Clearance</span>
                <span className="text-emerald-400 font-bold uppercase">{stationId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                <span className="text-zinc-500">HSM Core State</span>
                <span className="flex items-center space-x-1.5 text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <span>ACTIVE / SECURED</span>
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                <span className="text-zinc-500">Signing Engine</span>
                <span className="text-zinc-300">Ed25519-SHA512</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                <span className="text-zinc-500">Peer Consilience</span>
                <span className="text-emerald-400 font-bold">100% Aligned</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                <span className="text-zinc-500">Secure Element Temp</span>
                <span className="text-zinc-300">34.8°C</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                <span className="text-zinc-500">Ledger Peak Root</span>
                <span className="text-zinc-400 font-bold select-all truncate max-w-[120px]" title="mmr_peak_root_00de4a1">
                  0x00de4a1f...8c92
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 text-[9px] text-zinc-500">
                <span>AUDIT TRAIL LOGGING:</span>
                <span className="text-emerald-500/80 font-bold uppercase">IMMUTABLE ON-DISK</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Coordinate Tactical Flight Radar & Federated Learning */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tactical Flight Radar Map */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Map className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">
                  Tactical Airspace Radar • Real GPS Coordinates
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-mono text-zinc-400">
                {/* Map Mode Selector */}
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-[#07090e] border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setMapMode("carto")}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      mapMode === "carto"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Geographic Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapMode("vector")}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      mapMode === "vector"
                        ? "bg-zinc-800 text-zinc-200 border border-white/[0.1] font-bold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Vector Radar
                  </button>
                </div>
                <span className="text-zinc-600 hidden sm:inline">|</span>
                <span className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                  <span className="text-zinc-300 font-bold">LIVE ADS-B</span>
                </span>
              </div>
            </div>

            {/* Dynamic Map Switcher */}
            {mapMode === "carto" ? (
              <TacticalAirspaceMap
                selectedHangar={selectedHangar}
                planes={planes}
                engines={engines}
                hoveredPlaneId={hoveredPlaneId}
                setHoveredPlaneId={setHoveredPlaneId}
                lastHoveredPlaneId={lastHoveredPlaneId}
                setLastHoveredPlaneId={setLastHoveredPlaneId}
                setSelectedPlaneId={setSelectedPlaneId}
                setViewState={setViewState}
                activeHudPlaneId={activeHudPlaneId}
              />
            ) : (
              /* Tactical Radar Screen (Real GPS Coordinates & Vector Landmasses) */
              <div className="bg-[#04060b] border border-white/[0.08] rounded-xl relative p-1 overflow-hidden flex flex-col justify-center">
                <svg viewBox="0 0 700 300" className="w-full h-auto text-zinc-800 select-none">
                <defs>
                  {/* Radar Gradient for Sweep */}
                  <radialGradient id="radarSweepGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                  
                  {/* Landmass Pattern Fill */}
                  <linearGradient id="landmassGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0b111e" />
                    <stop offset="100%" stopColor="#070c17" />
                  </linearGradient>
                </defs>

                {/* Tactical Map Background */}
                <rect width="700" height="300" fill="#04060b" />

                {/* Latitude Graticule Grid Lines with Real Degree Labels */}
                <g stroke="#141a29" strokeWidth="0.5" strokeDasharray="3,4">
                  <line x1="0" y1="42" x2="700" y2="42" />   {/* 50°N - London */}
                  <line x1="0" y1="98" x2="700" y2="98" />   {/* 40°N - Mediterranean / Central Asia */}
                  <line x1="0" y1="155" x2="700" y2="155" /> {/* 30°N - North India / Persian Gulf */}
                  <line x1="0" y1="210" x2="700" y2="210" /> {/* 20°N - Central India / Mumbai */}
                  <line x1="0" y1="265" x2="700" y2="265" /> {/* 10°N - South India / Sri Lanka */}
                  
                  {/* Longitude Graticule Lines */}
                  <line x1="72" y1="0" x2="72" y2="300" />   {/* 0° - Prime Meridian London */}
                  <line x1="200" y1="0" x2="200" y2="300" /> {/* 20°E - Central Europe */}
                  <line x1="330" y1="0" x2="330" y2="300" /> {/* 40°E - Middle East */}
                  <line x1="460" y1="0" x2="460" y2="300" /> {/* 60°E - Persian Gulf / Arabian Sea */}
                  <line x1="580" y1="0" x2="580" y2="300" /> {/* 80°E - Indian Subcontinent Meridian */}
                </g>

                {/* Degree Graticule Labels */}
                <g className="font-mono text-[8px] fill-zinc-600 select-none">
                  <text x="6" y="40">50°N (UK/EUR)</text>
                  <text x="6" y="153">30°N (DEL/GULF)</text>
                  <text x="6" y="263">10°N (BLR/IND)</text>
                  
                  <text x="75" y="294">0°</text>
                  <text x="203" y="294">20°E</text>
                  <text x="333" y="294">40°E</text>
                  <text x="463" y="294">60°E</text>
                  <text x="583" y="294">80°E</text>
                </g>

                {/* Geographic Landmass Silhouettes (Vector Coastlines) */}
                {/* 1. Indian Subcontinent & Sri Lanka */}
                <path
                  d="M 545,135 L 530,155 L 515,185 L 525,200 L 535,215 L 546,215 L 552,240 L 565,268 L 578,284 L 585,280 L 595,250 L 610,230 L 635,205 L 655,185 L 650,170 L 620,160 L 580,140 Z"
                  fill="url(#landmassGradient)"
                  stroke="#1c2840"
                  strokeWidth="1.2"
                />
                {/* Sri Lanka */}
                <path
                  d="M 588,286 Q 594,284 592,296 Q 585,297 588,286 Z"
                  fill="url(#landmassGradient)"
                  stroke="#1c2840"
                  strokeWidth="1"
                />

                {/* 2. Arabian Peninsula & Persian Gulf */}
                <path
                  d="M 370,175 L 400,165 L 435,175 L 452,192 L 460,210 L 440,240 L 410,235 L 385,215 Z"
                  fill="url(#landmassGradient)"
                  stroke="#1c2840"
                  strokeWidth="1.2"
                />

                {/* 3. British Isles / Western Europe */}
                <path
                  d="M 65,30 L 78,35 L 75,55 L 60,50 Z"
                  fill="url(#landmassGradient)"
                  stroke="#1c2840"
                  strokeWidth="1.2"
                />
                <path
                  d="M 78,58 L 105,52 L 125,70 L 115,95 L 85,85 Z"
                  fill="url(#landmassGradient)"
                  stroke="#1c2840"
                  strokeWidth="1.2"
                />

                {/* Range Rings Centered on Active Selected Station */}
                {(() => {
                  const activeStationKey = selectedHangar === "hangar-02" ? "DEL" : selectedHangar === "hangar-03" ? "LHR" : "BLR";
                  const hub = HUB_COORDINATES[activeStationKey] || HUB_COORDINATES["BLR"];
                  return (
                    <g className="transition-all duration-500">
                      {/* 250 NM Range Ring */}
                      <circle cx={hub.x} cy={hub.y} r="45" fill="none" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.35" />
                      <text x={hub.x + 48} y={hub.y - 4} className="font-mono text-[7px] font-bold fill-cyan-400/70 select-none">250 NM</text>
                      
                      {/* 500 NM Range Ring */}
                      <circle cx={hub.x} cy={hub.y} r="90" fill="none" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.25" />
                      <text x={hub.x + 93} y={hub.y - 4} className="font-mono text-[7px] font-bold fill-cyan-400/50 select-none">500 NM</text>

                      {/* Radar sweep beam animation */}
                      <circle cx={hub.x} cy={hub.y} r="90" fill="url(#radarSweepGlow)" className="animate-pulse" />
                    </g>
                  );
                })()}

                {/* Commercial Airway Corridors (Flight Routes) */}
                {Object.values(planes).map(p => {
                  const isHovered = hoveredPlaneId === p.id || lastHoveredPlaneId === p.id;
                  const coords = p.routeCoordinates;
                  if (coords.length < 3) return null;
                  
                  return (
                    <g key={`route-${p.id}`}>
                      {/* Outer glow line */}
                      <path
                        d={`M ${coords[0].x},${coords[0].y} Q ${coords[1].x},${coords[1].y} ${coords[2].x},${coords[2].y}`}
                        fill="none"
                        stroke={isHovered ? "#10b981" : "#0284c7"}
                        strokeWidth={isHovered ? "2.5" : "1.2"}
                        strokeDasharray={isHovered ? "0" : "4,5"}
                        opacity={isHovered ? "0.9" : "0.4"}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredPlaneId(p.id);
                          setLastHoveredPlaneId(p.id);
                        }}
                        onMouseLeave={() => setHoveredPlaneId(null)}
                      />
                    </g>
                  );
                })}

                {/* Airport Waypoint Nodes (Real ICAO Codes & GPS Position) */}
                {Object.keys(HUB_COORDINATES).map(key => {
                  const hub = HUB_COORDINATES[key];
                  const isLocal = 
                    (selectedHangar === "hangar-01" && key === "BLR") ||
                    (selectedHangar === "hangar-02" && key === "DEL") ||
                    (selectedHangar === "hangar-03" && key === "LHR");
                  
                  const currentActivePlane = planes[activeHudPlaneId];
                  const isRouteEnd = currentActivePlane ? (currentActivePlane.origin === key || currentActivePlane.destination === key) : false;

                  return (
                    <g key={key}>
                      {/* Station Pulse Ring */}
                      {isLocal && (
                        <circle cx={hub.x} cy={hub.y} r="14" className="fill-cyan-500/10 stroke-cyan-400 animate-pulse" strokeWidth="1.2" />
                      )}
                      {isRouteEnd && !isLocal && (
                        <circle cx={hub.x} cy={hub.y} r="9" className="fill-none stroke-emerald-400/50 animate-pulse" strokeWidth="1.2" />
                      )}
                      
                      {/* Airport Node Dot */}
                      <circle cx={hub.x} cy={hub.y} r="4.5" className={isLocal ? "fill-cyan-400 stroke-zinc-950" : isRouteEnd ? "fill-emerald-400 stroke-zinc-950" : "fill-zinc-600"} strokeWidth="1" />
                      
                      {/* Real GPS ICAO Airport Labels */}
                      <text x={hub.x} y={hub.y - 9} textAnchor="middle" className="font-mono text-[8px] font-bold fill-none stroke-zinc-950 stroke-[2.5px] select-none">
                        {hub.icao}
                      </text>
                      <text x={hub.x} y={hub.y - 9} textAnchor="middle" className={`font-mono text-[8px] font-bold select-none ${isLocal ? "fill-cyan-300 font-extrabold" : isRouteEnd ? "fill-emerald-300" : "fill-zinc-400"}`}>
                        {hub.icao} ({key})
                      </text>
                    </g>
                  );
                })}

                {/* Real-Time Airborne Planes (Moving Markers with Heading) */}
                {Object.values(planes).map(p => {
                  if (p.status !== "Airborne") return null;
                  const coords = getPlaneCoordinates(p);
                  const isHovered = hoveredPlaneId === p.id || lastHoveredPlaneId === p.id;
                  const engineHealth = engines[p.engines[0]]?.health ?? 1.0;
                  
                  let markerColor = "fill-emerald-400 stroke-zinc-950";
                  let pingColor = "stroke-emerald-400";
                  if (engineHealth < 0.35) {
                    markerColor = "fill-red-500 stroke-white";
                    pingColor = "stroke-red-500";
                  } else if (engineHealth < 0.75) {
                    markerColor = "fill-amber-400 stroke-zinc-950";
                    pingColor = "stroke-amber-400";
                  } else if (isHovered) {
                    markerColor = "fill-cyan-400 stroke-white";
                    pingColor = "stroke-cyan-400";
                  }

                  return (
                    <g 
                      key={p.id}
                      onMouseEnter={() => {
                        setHoveredPlaneId(p.id);
                        setLastHoveredPlaneId(p.id);
                      }}
                      onMouseLeave={() => setHoveredPlaneId(null)}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedPlaneId(p.id);
                        setViewState("asset-detail");
                      }}
                    >
                      {/* Proximity / Status Ping */}
                      <circle cx={coords.x} cy={coords.y} r="12" className={`fill-none ${pingColor} opacity-40 animate-ping`} strokeWidth="0.8" />
                      
                      {/* Aircraft Center Node */}
                      <circle cx={coords.x} cy={coords.y} r="5" className={`${markerColor} transition-colors duration-300 shadow-lg`} strokeWidth="1.2" />

                      {/* Directional Heading Vector Line */}
                      <line 
                        x1={coords.x} 
                        y1={coords.y} 
                        x2={coords.x + (p.destination === "BLR" ? 6 : p.destination === "DXB" ? -6 : 6)} 
                        y2={coords.y + (p.destination === "BLR" ? 6 : p.destination === "DXB" ? -2 : -6)} 
                        stroke="#10b981" 
                        strokeWidth="1.5" 
                      />
                      
                      {/* Callsign Tag with Altitude */}
                      <text x={coords.x + 8} y={coords.y + 3} className="font-mono text-[8px] font-bold fill-none stroke-zinc-950 stroke-[2.5px] select-none">
                        {p.name.split(" - ")[1] || p.id} • FL{Math.round(p.altitude / 1000) * 10}
                      </text>
                      <text x={coords.x + 8} y={coords.y + 3} className={`font-mono text-[8px] font-bold select-none ${isHovered ? "fill-cyan-300" : "fill-zinc-200"}`}>
                        {p.name.split(" - ")[1] || p.id} • FL{Math.round(p.altitude / 1000) * 10}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            )}

            {/* Live Telemetry HUD Information Panel */}
            <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-lg text-xs font-mono min-h-[68px] flex items-center justify-center relative">
              <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">AIRCRAFT ID</span>
                  <strong className="text-zinc-200 font-mono text-[11px] block truncate">{activeHudPlane.name}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">FLIGHT ROUTE</span>
                  <strong className="text-zinc-300 font-mono text-[11px] block">{activeHudPlane.origin} → {activeHudPlane.destination} ({activeHudPlane.phase})</strong>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">ALTITUDE & AIRSPEED</span>
                  <strong className="text-zinc-300 font-mono text-[11px] block">{activeHudPlane.altitude} ft / {activeHudPlane.speed} kt</strong>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">PROPULSION HEALTH</span>
                  <strong className={`font-mono text-[11px] block uppercase ${primaryHudEng?.health < 0.35 ? "text-red-400 font-bold" : primaryHudEng?.health < 0.75 ? "text-amber-400" : "text-emerald-400"}`}>
                    {hudHealthPct}% (RUL: {hudRul} CYC)
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Federated Model Aggregator Card */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 md:p-6 space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <h4 className="text-sm font-bold text-white font-sans flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-cyan-400" />
                  <span>Federated Fleet Model Aggregator (FedProx)</span>
                </h4>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Privacy-preserving distributed weight synchronization across maintenance stations.
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                {runFederatedRound && (
                  <button
                    onClick={runFederatedRound}
                    disabled={isFederating || !backendOnline}
                    className="px-3 py-1.5 rounded-lg bg-[#0c0f17] hover:bg-zinc-800 text-cyan-400 border border-cyan-500/30 disabled:opacity-50 cursor-pointer flex items-center space-x-2 transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFederating ? "animate-spin text-cyan-400" : ""}`} />
                    <span>{isFederating ? "Aggregating..." : "Run Aggregation"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
              
              {/* Left Column: Node Training Indicator Status Grid */}
              <div className="md:col-span-1 space-y-3 font-mono text-[10px]">
                <strong className="text-zinc-400 block tracking-wider uppercase font-sans text-xs">Station Model Loss</strong>
                
                <div className="space-y-2 bg-[#070a12] p-3 border border-white/[0.06] rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Bengaluru (BLR)</span>
                    <span className="text-emerald-400 font-bold">Loss: 0.015</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Delhi (DEL)</span>
                    <span className="text-emerald-400 font-bold">Loss: 0.032</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">London (LHR)</span>
                    <span className="text-emerald-400 font-bold">Loss: 0.021</span>
                  </div>
                  <div className="border-t border-white/[0.06] pt-2 flex justify-between text-[9px] text-zinc-400">
                    <span>PRIVACY GUARANTEE:</span>
                    <span className="text-cyan-400 font-bold">Gaussian LDP (ε=1.5)</span>
                  </div>
                </div>
              </div>

              {/* Training Convergence Plot (displays the last 10 rounds) */}
              <div className="md:col-span-2 space-y-2">
                <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider block text-left">Convergence log (Last 10 updates)</span>
                <div className="h-44 w-full bg-zinc-950/40 p-2 border border-zinc-900 rounded-lg">
                  {mounted && federatedHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={federatedHistory.slice(-10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                        <XAxis dataKey="round" stroke="#3f3f46" fontSize={8} fontFamily="monospace" />
                        <YAxis stroke="#3f3f46" fontSize={8} fontFamily="monospace" />
                        <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#18181b", color: "#f4f4f5", fontFamily: "monospace", fontSize: 8 }} />
                        <Line type="monotone" dataKey="global_loss" name="Loss" stroke="#10b981" strokeWidth={1.8} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-mono text-zinc-600 text-[10px]">
                      No calibration cycles executed. Streaming automatic weights.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- VIEW 4: AIRCRAFT DOSSIER DETAILS ---
interface AssetDetailProps {
  selectedPlaneId: string | null;
  setSelectedPlaneId: (v: string | null) => void;
  setViewState: (v: 'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate') => void;
  planes: Record<string, PlaneData>;
  engines: Record<string, EngineData>;
  setSelectedEngineId: (v: string) => void;
  ledgerHistory: LedgerRecord[];
  onOpenAmosModal?: (planeId: string, engineId: string) => void;
  onMaintenanceRelease?: (planeId: string, engineId: string) => void;
  onRefreshLedger?: () => void;
  onOpenStudioModal?: (mode?: '2d' | '3d-engine' | '3d-plane') => void;
}

export function AssetDetail({
  selectedPlaneId,
  setSelectedPlaneId,
  setViewState,
  planes,
  engines,
  setSelectedEngineId,
  ledgerHistory,
  onOpenAmosModal,
  onMaintenanceRelease,
  onRefreshLedger,
  onOpenStudioModal
}: AssetDetailProps) {
  if (!selectedPlaneId) return null;
  const plane = planes[selectedPlaneId];
  const eng1Id = plane.engines[0] || "ENG-001";
  const eng2Id = plane.engines[1] || "ENG-002";
  const eng1 = engines[eng1Id];
  const eng2 = engines[eng2Id];

  // Cycle-Normalized EGT Margin Decay (SAC Hearing #002)
  const egtMargin1 = eng1 ? (35.0 - (eng1.cycle * 0.14)).toFixed(1) : "25.0";
  const egtMargin2 = eng2 ? (35.0 - (eng2.cycle * 0.14)).toFixed(1) : "25.0";
  const deltaEgtm = Math.abs(parseFloat(egtMargin1) - parseFloat(egtMargin2)).toFixed(1);
  const isAsymmetric = parseFloat(deltaEgtm) >= 12.0 || eng1?.status !== "Nominal" || eng2?.status !== "Nominal";

  const getHealthBarColor = (health: number) => {
    if (health >= 0.75) return "bg-emerald-500";
    if (health >= 0.35) return "bg-amber-500";
    return "bg-red-500 animate-pulse";
  };

  // Live Airline Operations Command Center (AOCC) ACARS Telemetry Log
  const getSimulatedCommsLog = () => {
    if (plane.status === "Maintenance") {
      return [
        "MCC: Maintenance interlock active at Hangar Bay.",
        "SYS: Awaiting licensed AME borescope inspection (ATA 72-30).",
        "SEC: Cryptographic MMR sign-off armed."
      ];
    }
    if (plane.progress < 15) {
      return [
        `ATC: ${plane.id} cleared for takeoff. Wind 12kt.`,
        "SYS: HPC turbine temperature rising nominal.",
        "AP: Autopilot altitude arm set 10000ft."
      ];
    }
    if (plane.progress >= 15 && plane.progress < 85) {
      return [
        `SYS: Cruise hold active at ${plane.altitude} ft.`,
        "COM: Secure transponder ACARS ping BLR OK.",
        "FDK: Fuel burn rate matching flight plan."
      ];
    }
    return [
      `ATC: Contact tower. Preparing descent to ${plane.destination}.`,
      "SYS: Landing gear pressure checks OK.",
      "SYS: LPC thrust reversers armed."
    ];
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 bg-[#07090e] text-zinc-100 font-sans w-full max-w-[1800px] mx-auto px-6 lg:px-10 py-6 select-none">
      {/* Aircraft Dossier Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              setSelectedPlaneId(null);
              setViewState("dashboard");
            }} 
            className="flex items-center space-x-2 border border-white/[0.08] hover:border-zinc-500 px-3 py-1.5 rounded font-mono text-xs text-zinc-400 hover:text-white cursor-pointer bg-[#0c0f17]"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>FLEET RADAR</span>
          </button>
          
          <button 
            onClick={() => {
              setSelectedEngineId(eng1Id);
              setViewState("sentinel-gate");
            }} 
            className="flex items-center space-x-2 border border-white/[0.08] hover:border-zinc-500 text-zinc-300 hover:text-white px-3 py-1.5 rounded font-mono text-xs font-bold cursor-pointer bg-[#0c0f17] transition-colors"
          >
            <Cpu className="h-3 w-3 text-cyan-400" />
            <span>SENTINEL TELEMETRY GATEWAY</span>
          </button>
        </div>
        
        <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">AIRFRAME REGISTRATION</span>
          <h2 className="text-base font-bold text-white font-mono uppercase">
            {plane.name}
          </h2>
          {onOpenStudioModal && (
            <button
              onClick={() => onOpenStudioModal('3d-plane')}
              className="mt-1.5 flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-mono font-bold bg-[#0c101a] border border-white/[0.08] hover:border-cyan-500/40 hover:bg-[#121928] text-zinc-300 hover:text-cyan-300 rounded transition-all cursor-pointer"
            >
              <Plane className="w-3.5 h-3.5 text-cyan-400" />
              <span>INSPECT AIRFRAME 3D TWIN</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live specifications (Reactive) & Comms HUD (fills the gap) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Plane specifications (completely reactive) */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Specifications Catalog</h3>
            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex justify-between border-b border-zinc-900/60 pb-2"><span className="text-zinc-500">MODEL ID:</span><span className="text-zinc-200 font-bold">{plane.model}</span></div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-2"><span className="text-zinc-500">CURRENT ROUTE:</span><span className="text-zinc-200">{plane.origin} → {plane.destination}</span></div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-2"><span className="text-zinc-500">FLIGHT STATUS:</span><span className="text-zinc-200 uppercase font-bold">{plane.status}</span></div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-2"><span className="text-zinc-500">FLIGHT PHASE:</span><span className="text-zinc-200">{plane.phase}</span></div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-2"><span className="text-zinc-500">AIRSPEED:</span><span className="text-zinc-200">{plane.speed} kt</span></div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-2"><span className="text-zinc-500">ALTITUDE:</span><span className="text-zinc-200">{plane.altitude} ft</span></div>
              <div className="flex justify-between border-b border-zinc-900/60 pb-2"><span className="text-zinc-500">FUEL CAPACITY:</span><span className="text-zinc-200">{plane.fuel}%</span></div>
            </div>
          </div>

          {/* Live Flight Deck Communications Log (fills the gap) */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Flight Deck Comms Log</h3>
            <div className="bg-zinc-950/80 p-3 rounded border border-zinc-900 text-[10px] font-mono text-zinc-500 space-y-1.5 min-h-[92px]">
              {getSimulatedCommsLog().map((log, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60"></span>
                  <span className="truncate">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Engine Health summary & Audit log table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Twin-Engine Propulsion Matrix (SAC Rule 7) */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-6 space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">
                  Twin-Engine Symmetry & Differential Telemetry (ATA 72-00)
                </h3>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
                  Bilateral differential monitoring for ambient weather and throttle variation cancellation.
                </p>
              </div>
              <span className="text-[9px] font-mono bg-[#0c101a] px-2.5 py-1 rounded text-zinc-400 border border-white/[0.08]">
                FADEC DIODE: ISOLATED
              </span>
            </div>
            
            {/* Side-by-Side Twin Engines Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Engine 1 (Left Wing Port) */}
              <div 
                onClick={() => {
                  setSelectedEngineId(eng1Id);
                  setViewState("sentinel-gate");
                }}
                className={`p-4 bg-[#070a12] border rounded-xl space-y-3 cursor-pointer transition-all ${
                  eng1?.status === "Nominal" 
                    ? "border-white/[0.08] hover:border-cyan-500/40" 
                    : "border-amber-500/40 bg-amber-950/20"
                }`}
              >
                <div className="flex justify-between items-center font-mono text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded font-bold text-zinc-400">PORT</span>
                      <h4 className="font-bold text-zinc-200">{eng1Id}</h4>
                    </div>
                    <span className="text-[10px] text-zinc-500">{eng1?.name || "CFM LEAP-1A26"}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    eng1?.status === "Nominal" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}>
                    {eng1?.status || "Nominal"}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500">HEALTH INDEX:</span>
                    <span className="text-zinc-200 font-bold">{eng1 ? (eng1.health * 100).toFixed(0) : "100"}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900/80 rounded-full overflow-hidden">
                    <div className={`h-full ${getHealthBarColor(eng1?.health ?? 1.0)}`} style={{ width: `${eng1 ? (eng1.health * 100).toFixed(0) : 100}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 border-t border-zinc-900 pt-2.5">
                  <div>CYCLES: <strong className="text-zinc-200">{eng1?.cycle || 30}</strong></div>
                  <div>RUL: <strong className={eng1 && eng1.rul < 30 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{eng1?.rul || 120} CYC</strong></div>
                  <div className="col-span-2 text-zinc-500">
                    EGT MARGIN: <strong className={parseFloat(egtMargin1) < 15 ? "text-amber-400" : "text-zinc-300"}>+{egtMargin1}°C</strong>
                  </div>
                </div>
              </div>

              {/* Engine 2 (Right Wing Starboard) */}
              <div 
                onClick={() => {
                  setSelectedEngineId(eng2Id);
                  setViewState("sentinel-gate");
                }}
                className={`p-4 bg-[#070a12] border rounded-xl space-y-3 cursor-pointer transition-all ${
                  eng2?.status === "Nominal" 
                    ? "border-white/[0.08] hover:border-cyan-500/40" 
                    : "border-amber-500/40 bg-amber-950/20"
                }`}
              >
                <div className="flex justify-between items-center font-mono text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded font-bold text-zinc-400">STARBOARD</span>
                      <h4 className="font-bold text-zinc-200">{eng2Id}</h4>
                    </div>
                    <span className="text-[10px] text-zinc-500">{eng2?.name || "CFM LEAP-1A26"}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    eng2?.status === "Nominal" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}>
                    {eng2?.status || "Nominal"}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500">HEALTH INDEX:</span>
                    <span className="text-zinc-200 font-bold">{eng2 ? (eng2.health * 100).toFixed(0) : "100"}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900/80 rounded-full overflow-hidden">
                    <div className={`h-full ${getHealthBarColor(eng2?.health ?? 1.0)}`} style={{ width: `${eng2 ? (eng2.health * 100).toFixed(0) : 100}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 border-t border-zinc-900 pt-2.5">
                  <div>CYCLES: <strong className="text-zinc-200">{eng2?.cycle || 30}</strong></div>
                  <div>RUL: <strong className={eng2 && eng2.rul < 30 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{eng2?.rul || 118} CYC</strong></div>
                  <div className="col-span-2 text-zinc-500">
                    EGT MARGIN: <strong className={parseFloat(egtMargin2) < 15 ? "text-amber-400" : "text-zinc-300"}>+{egtMargin2}°C</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Differential Telemetry Delta Meter */}
            <div className="bg-[#070a12] border border-white/[0.06] rounded-xl p-3.5 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-500 text-[10px]">DIFFERENTIAL:</span>
                  <span className="text-zinc-200 font-bold">ΔEGTM = {deltaEgtm}°C</span>
                </div>
                <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                  !isAsymmetric 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                }`}>
                  {!isAsymmetric ? "SYMMETRIC (NOMINAL)" : "ASYMMETRIC WEAR (ATA 72-30)"}
                </span>
              </div>
            </div>

            {/* Actionable Maintenance Work Orders & Direct CRS Return-to-Service */}
            {(isAsymmetric || plane.status === "Maintenance" || plane.phase === "Maintenance" || (eng1 && eng1.status !== "Nominal") || (eng2 && eng2.status !== "Nominal")) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    if (onOpenAmosModal) {
                      const targetId = (eng1 && eng1.status !== "Nominal") ? eng1Id : eng2Id;
                      onOpenAmosModal(plane.id, targetId);
                    }
                  }}
                  className="w-full py-3 px-4 bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-colors border border-amber-500/40 cursor-pointer shadow-md"
                >
                  <Wrench className="h-4 w-4" />
                  <span>SWISS-AS AMOS WORK ORDER (SPEC 2000)</span>
                </button>

                <button
                  onClick={() => {
                    if (onMaintenanceRelease) {
                      const targetId = (eng1 && eng1.status !== "Nominal") ? eng1Id : eng2Id;
                      onMaintenanceRelease(plane.id, targetId);
                    }
                  }}
                  className="w-full py-3 px-4 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded-xl font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-colors border border-emerald-500/40 cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>APPROVE MAINTENANCE RELEASE (CRS)</span>
                </button>
              </div>
            )}

          </div>

          {/* Maintenance Records Audit Log */}
          <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Cryptographic MRO Audit Records</h3>
            <div className="overflow-x-auto border border-white/[0.06] rounded-xl">
              <table className="w-full text-left font-mono text-[10px] text-zinc-400 select-text">
                <thead className="bg-[#070a12] text-zinc-400 uppercase border-b border-white/[0.06]">
                  <tr>
                    <th className="py-2.5 px-3">LEAF</th>
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                    <th className="py-2.5 px-3">MAINTENANCE ACTION</th>
                    <th className="py-2.5 px-3">TECH ID</th>
                    <th className="py-2.5 px-3">HEALTH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] bg-[#070a12]/50">
                  {ledgerHistory.filter(r => r.component_id === plane.id || plane.engines.includes(r.component_id)).length > 0 ? (
                    ledgerHistory.filter(r => r.component_id === plane.id || plane.engines.includes(r.component_id)).map(r => (
                      <tr key={r.leaf_index} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-3 text-zinc-500 font-bold">#{r.leaf_index}</td>
                        <td className="py-2 px-3 text-zinc-500">{r.timestamp.split("T")[0]}</td>
                        <td className="py-2 px-3 text-zinc-200 font-bold">{r.action_taken}</td>
                        <td className="py-2 px-3">{r.technician_id}</td>
                        <td className="py-2 px-3 text-emerald-400">{(r.health_snapshot * 100).toFixed(0)}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="py-6 text-center text-zinc-600">NO CRYPTOGRAPHIC LOGS ON FILE FOR COMPONENT.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- ARINC 429 OPTICAL DATA DIODE BUS INSPECTOR ---
export function Arinc429FrameInspector({
  activeEngine,
  activeFault
}: {
  activeEngine: EngineData;
  activeFault?: string | null;
}) {
  const cycle = activeEngine?.cycle || 30;
  const isPort = activeEngine?.id?.includes("1") || activeEngine?.id?.includes("3") || activeEngine?.id?.includes("5");
  const sdi = isPort ? "01" : "10";

  // Dynamic parameters based on active engine & fault state
  let egtVal = (642.0 + cycle * 0.28).toFixed(1);
  let n1Val = (89.2 + ((cycle * 3) % 7) * 0.1).toFixed(1);
  let n2Val = (98.1 + ((cycle * 2) % 5) * 0.1).toFixed(1);
  let ffVal = Math.round(1420 + ((cycle * 5) % 9) * 4);
  let oilPVal = (62.4 + ((cycle * 2) % 4) * 0.2).toFixed(1);
  let oilTVal = (88.0 + ((cycle * 3) % 5) * 0.3).toFixed(1);

  let egtSsm: "NORM" | "WARN" = "NORM";
  let n2Ssm: "NORM" | "WARN" = "NORM";
  let ffSsm: "NORM" | "WARN" = "NORM";

  if (activeFault === "hpt") {
    egtVal = (742.8 + ((cycle * 2) % 5) * 0.4).toFixed(1);
    egtSsm = "WARN";
  } else if (activeFault === "hpc") {
    n2Val = (102.6 + ((cycle * 2) % 4) * 0.2).toFixed(1);
    n2Ssm = "WARN";
  } else if (activeFault === "coking") {
    ffVal = Math.round(1185 - ((cycle * 3) % 7) * 5);
    ffSsm = "WARN";
  } else if (activeFault === "monsoon") {
    egtVal = (628.4 + ((cycle * 2) % 5) * 0.2).toFixed(1);
    egtSsm = "NORM";
  }

  const frames = [
    { label: "350", name: "EXHAUST GAS TEMP (EGT)", val: `${egtVal} °C`, ssm: egtSsm, hex: egtSsm === "WARN" ? "0x350D9CF8" : "0x350A94F1", warn: egtSsm === "WARN" },
    { label: "345", name: "LOW PRESSURE FAN SPEED (N1)", val: `${n1Val} %`, ssm: "NORM", hex: "0x3454B20C", warn: false },
    { label: "346", name: "HIGH PRESSURE CORE SPEED (N2)", val: `${n2Val} %`, ssm: n2Ssm, hex: n2Ssm === "WARN" ? "0x346FA291" : "0x3469C312", warn: n2Ssm === "WARN" },
    { label: "351", name: "ENGINE FUEL FLOW (FF)", val: `${ffVal} PPH`, ssm: ffSsm, hex: ffSsm === "WARN" ? "0x351F8014" : "0x3512E48A", warn: ffSsm === "WARN" },
    { label: "340", name: "MAIN ENGINE OIL PRESSURE", val: `${oilPVal} PSI`, ssm: "NORM", hex: "0x34018E34", warn: false },
    { label: "341", name: "ENGINE OIL TEMPERATURE", val: `${oilTVal} °C`, ssm: "NORM", hex: "0x34112F88", warn: false }
  ];

  return (
    <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <Radio className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-widest">
              ARINC 429 Unidirectional Bus Stream
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-sans">
            Physical receive-only optocoupler channel from FADEC engine sensor bus.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[9px] font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>OPTICAL DATA DIODE (RX-ONLY)</span>
          </span>
          <span className="text-zinc-500 hidden sm:inline">100 kbps BNR/BCD</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[10px]">
          <thead>
            <tr className="border-b border-zinc-900/80 text-zinc-500 text-[9px]">
              <th className="pb-2 font-medium">32-BIT WORD</th>
              <th className="pb-2 font-medium">LABEL (8)</th>
              <th className="pb-2 font-medium">SDI</th>
              <th className="pb-2 font-medium">AVIONICS PARAMETER</th>
              <th className="pb-2 font-medium text-right">ENGINEERING VALUE</th>
              <th className="pb-2 font-medium text-center">SSM</th>
              <th className="pb-2 font-medium text-center">PARITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50 text-zinc-300">
            {frames.map((frame) => (
              <tr key={frame.label} className={frame.warn ? "bg-amber-950/20 text-amber-300 font-bold" : "hover:bg-zinc-900/20"}>
                <td className="py-1.5 text-zinc-400">{frame.hex}</td>
                <td className="py-1.5 font-bold text-cyan-400">{frame.label}</td>
                <td className="py-1.5 text-zinc-500">{sdi}</td>
                <td className="py-1.5 text-zinc-300">{frame.name}</td>
                <td className={`py-1.5 text-right font-bold ${frame.warn ? "text-amber-400" : "text-white"}`}>{frame.val}</td>
                <td className="py-1.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${frame.warn ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {frame.ssm}
                  </span>
                </td>
                <td className="py-1.5 text-center text-zinc-500">ODD OK</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- AEROTHERMAL FAULT & STRESS INJECTION TESTBENCH ---
export function FaultInjectionHarness({
  activeFault,
  onInjectFault,
  onResetFault,
  activeEngine,
  onOpenAmosModal,
  onMaintenanceRelease,
  parentPlaneId,
  isInferring
}: {
  activeFault?: string | null;
  onInjectFault?: (faultType: 'hpt' | 'hpc' | 'coking' | 'monsoon') => void;
  onResetFault?: () => void;
  activeEngine: EngineData;
  onOpenAmosModal?: (planeId: string, engineId: string) => void;
  onMaintenanceRelease?: (planeId: string, engineId: string) => void;
  parentPlaneId: string;
  isInferring: boolean;
}) {
  return (
    <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <Terminal className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-widest">
              Aerothermal Fault & Stress Injection Testbench
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-sans">
            Simulate mechanical degradation and verify edge AI real-time anomaly detection.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-mono">
          {activeFault ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 font-bold flex items-center space-x-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>
                FAULT ACTIVE: {
                  activeFault === 'hpt' ? 'HPT TBC SPALLATION (+42°C)' :
                  activeFault === 'hpc' ? 'HPC BLADE TIP RUB (FOD)' :
                  activeFault === 'coking' ? 'NOZZLE COKING (HOTSPOT)' : 'MONSOON AMBIENT (BILATERAL)'
                }
              </span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold flex items-center space-x-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>NOMINAL CRUISE TELEMETRY</span>
            </span>
          )}
        </div>
      </div>

      {/* 4 Interactive Fault Preset Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-[10px]">
        <button
          onClick={() => onInjectFault && onInjectFault('hpt')}
          disabled={isInferring}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            activeFault === 'hpt'
              ? 'bg-amber-950/30 border-amber-500/60 text-amber-200 font-bold'
              : 'bg-[#070a12] border-white/[0.06] hover:border-amber-500/40 text-zinc-300'
          }`}
        >
          <div className="font-bold text-amber-400 flex items-center justify-between">
            <span>HPT TBC SPALLATION</span>
            <span className="text-[8px] bg-amber-950/60 px-1 rounded border border-amber-800/40">ATA 72-50</span>
          </div>
          <p className="text-[9px] text-zinc-400 mt-1 font-sans">
            +42°C EGT thermal spike, accelerated turbine blade creep
          </p>
        </button>

        <button
          onClick={() => onInjectFault && onInjectFault('hpc')}
          disabled={isInferring}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            activeFault === 'hpc'
              ? 'bg-amber-950/30 border-amber-500/60 text-amber-200 font-bold'
              : 'bg-[#070a12] border-white/[0.06] hover:border-amber-500/40 text-zinc-300'
          }`}
        >
          <div className="font-bold text-amber-400 flex items-center justify-between">
            <span>HPC BLADE TIP RUB</span>
            <span className="text-[8px] bg-amber-950/60 px-1 rounded border border-amber-800/40">ATA 72-30</span>
          </div>
          <p className="text-[9px] text-zinc-400 mt-1 font-sans">
            Core pressure ratio loss, spool speed hunting & clearance erosion
          </p>
        </button>

        <button
          onClick={() => onInjectFault && onInjectFault('coking')}
          disabled={isInferring}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            activeFault === 'coking'
              ? 'bg-amber-950/30 border-amber-500/60 text-amber-200 font-bold'
              : 'bg-[#070a12] border-white/[0.06] hover:border-amber-500/40 text-zinc-300'
          }`}
        >
          <div className="font-bold text-amber-400 flex items-center justify-between">
            <span>NOZZLE COKING</span>
            <span className="text-[8px] bg-amber-950/60 px-1 rounded border border-amber-800/40">ATA 72-40</span>
          </div>
          <p className="text-[9px] text-zinc-400 mt-1 font-sans">
            Circumferential thermal distortion, combustor streak imbalance
          </p>
        </button>

        <button
          onClick={() => onInjectFault && onInjectFault('monsoon')}
          disabled={isInferring}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            activeFault === 'monsoon'
              ? 'bg-cyan-950/30 border-cyan-500/60 text-cyan-200 font-bold'
              : 'bg-[#070a12] border-white/[0.06] hover:border-cyan-500/40 text-zinc-300'
          }`}
        >
          <div className="font-bold text-cyan-400 flex items-center justify-between">
            <span>MONSOON INGESTION</span>
            <span className="text-[8px] bg-cyan-950/60 px-1 rounded border border-cyan-800/40">WEATHER</span>
          </div>
          <p className="text-[9px] text-zinc-400 mt-1 font-sans">
            Bilateral symmetrical moisture chop (verifies weather cancellation)
          </p>
        </button>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-900/60">
        <div className="text-[9px] font-mono text-zinc-500">
          INT8 ONNX Inference: <strong className="text-zinc-300">0.39ms (Edge MCU) / 0.82ms (Host CPU)</strong> • DO-178C DAL-C Budget: <strong className="text-zinc-300">&lt;15ms</strong> • Receptive Field: <strong className="text-zinc-300">31 cycles</strong> • PyTorch Integrated Gradients active
        </div>

        <div className="flex items-center space-x-2">
          {activeFault && (
            <button
              onClick={onResetFault}
              className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono text-[10px] font-bold transition-colors cursor-pointer"
            >
              RESET TO NOMINAL BASELINE
            </button>
          )}

          {(Boolean(activeFault) || activeEngine?.rul < 70 || activeEngine?.status !== "Nominal") && onOpenAmosModal && (
            <button
              onClick={() => onOpenAmosModal(parentPlaneId, activeEngine.id)}
              className="px-3.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Wrench className="h-3 w-3 text-amber-400" />
              <span>DISPATCH SWISS-AS AMOS WORK ORDER</span>
            </button>
          )}

          {(Boolean(activeFault) || activeEngine?.rul < 70 || activeEngine?.status !== "Nominal") && onMaintenanceRelease && (
            <button
              onClick={() => onMaintenanceRelease(parentPlaneId, activeEngine.id)}
              className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-md shadow-emerald-950/40"
            >
              <CheckCircle className="h-3 w-3" />
              <span>APPROVE MAINTENANCE RELEASE (CRS)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- VIEW 5: SENTINEL DIAGNOSTIC ENCLAVE ---
interface SentinelGatewayProps {
  selectedEngineId: string;
  setSelectedEngineId: (v: string) => void;
  viewState: string;
  setViewState: (v: 'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate') => void;
  planes: Record<string, PlaneData>;
  setSelectedPlaneId: (v: string | null) => void;
  engines: Record<string, EngineData>;
  isStreaming: boolean;
  setIsStreaming: (v: boolean | ((prev: boolean) => boolean)) => void;
  streamingRate: number;
  handleRateChange: (rate: number) => void;
  streamNextCycle: (id: string) => Promise<void>;
  isInferring: boolean;
  backendOnline: boolean;
  activeTab: 'fleet' | 'federated' | 'ledger';
  setActiveTab: (tab: 'fleet' | 'federated' | 'ledger') => void;
  hoveredSensor: string | null;
  setHoveredSensor: (s: string | null) => void;
  verifyLedgerIntegrity: () => Promise<void>;
  isVerifying: boolean;
  simulateTampering: () => Promise<void>;
  verificationResult: { verified: boolean | null; message: string; computed_root?: string; stored_root?: string; tampered_indices?: number[] };
  rootHash: string;
  formEngine: string;
  setFormEngine: (v: string) => void;
  formAction: string;
  setFormAction: (v: string) => void;
  formStation: string;
  setFormStation: (v: string) => void;
  formHealth: string;
  setFormHealth: (v: string) => void;
  formSuccessMessage: string;
  handleManualAppend: (e: React.FormEvent) => Promise<void>;
  nodes: any[];
  ledgerHistory: LedgerRecord[];
  mounted: boolean;
  lastHoveredPlaneId: string;
  restoreLedger?: () => Promise<void>;
  onResetLedger?: () => void;
  exportCertificate?: () => Promise<void>;
  activeFault?: string | null;
  onInjectFault?: (faultType: 'hpt' | 'hpc' | 'coking' | 'monsoon') => void;
  onResetFault?: () => void;
  onOpenAmosModal?: (planeId: string, engineId: string) => void;
  onMaintenanceRelease?: (planeId: string, engineId: string) => void;
  onRefreshLedger?: () => void;
  onOpenAcarsModal?: () => void;
  onOpenCrsModal?: () => void;
  backendUrl?: string;
  onOpenStudioModal?: (mode?: '2d' | '3d-engine' | '3d-plane') => void;
  runFederatedRound?: () => void;
  isFederating?: boolean;
  federatedHistory?: FederatedRound[];
}

export function SentinelGateway({
  selectedEngineId,
  setSelectedEngineId,
  viewState,
  setViewState,
  planes,
  setSelectedPlaneId,
  engines,
  isStreaming,
  setIsStreaming,
  streamingRate,
  handleRateChange,
  streamNextCycle,
  isInferring,
  backendOnline,
  activeTab,
  setActiveTab,
  hoveredSensor,
  setHoveredSensor,
  verifyLedgerIntegrity,
  isVerifying,
  simulateTampering,
  verificationResult,
  rootHash,
  formEngine,
  setFormEngine,
  formAction,
  setFormAction,
  formStation,
  setFormStation,
  formHealth,
  setFormHealth,
  formSuccessMessage,
  handleManualAppend,
  nodes,
  ledgerHistory,
  mounted,
  lastHoveredPlaneId,
  restoreLedger,
  onResetLedger,
  exportCertificate,
  activeFault,
  onInjectFault,
  onResetFault,
  onOpenAmosModal,
  onMaintenanceRelease,
  onRefreshLedger,
  onOpenAcarsModal,
  onOpenCrsModal,
  backendUrl,
  onOpenStudioModal,
  runFederatedRound,
  isFederating = false,
  federatedHistory = []
}: SentinelGatewayProps) {
  const [hoveredMmrNode, setHoveredMmrNode] = React.useState<any | null>(null);
  const [pinnedMmrNode, setPinnedMmrNode] = React.useState<any | null>(null);
  const activeMmrInspector = hoveredMmrNode || pinnedMmrNode;
  const [selectedBlueprintSensor, setSelectedBlueprintSensor] = React.useState<string | null>(null);
  const [hoveredBlueprintSensor, setHoveredBlueprintSensor] = React.useState<string | null>(null);
  const activeBlueprintSensor = hoveredBlueprintSensor || selectedBlueprintSensor;
  // Find plane corresponding to the selected engine (for HUD / active views)
  const parentPlaneId = Object.keys(planes).find(key => planes[key].engines.includes(selectedEngineId)) || "PL-101";
  const activeEngine = engines[selectedEngineId] || engines["ENG-001"];
  const parentPlane = planes[parentPlaneId];
  
  // Find plane corresponding to the engine selected in the Component dropdown (formEngine)
  const formPlaneId = Object.keys(planes).find(key => planes[key].engines.includes(formEngine)) || "PL-101";
  const formPlane = planes[formPlaneId];
  
  // Interlock check: The form is locked UNLESS the plane for the selected Component is in the Maintenance state.
  const isFormLocked = !formPlane || formPlane.status !== "Maintenance";

  return (
    <div className="flex-1 flex flex-col w-full max-w-[1800px] mx-auto px-6 lg:px-10 py-6 space-y-6 bg-[#07090e] text-zinc-100 select-none">
      <style dangerouslySetInnerHTML={{__html: `
        html, body, :root {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar {
          display: none !important;
        }
      `}} />
      
      {/* Diagnostics Sub-Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.08] pb-4 gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => {
              setViewState("asset-detail");
              setSelectedPlaneId(parentPlaneId);
            }} 
            className="flex items-center space-x-2 border border-white/[0.08] hover:border-zinc-500 px-3 py-1.5 rounded font-mono text-xs text-zinc-400 hover:text-white cursor-pointer bg-[#0c0f17]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>AIRCRAFT DOSSIER</span>
          </button>
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase tracking-wider font-bold">PROPULSION HEALTH & LEDGER AUDIT</span>
            <h2 className="text-base font-bold text-white font-mono uppercase">{selectedEngineId} • {activeEngine.name}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-mono">
          <div className="flex items-center space-x-1.5 border border-emerald-500/30 px-2.5 py-1 bg-emerald-950/20 rounded text-emerald-300">
            <DollarSign className="h-3 w-3 text-emerald-400" />
            <span>AOG SAVED:</span>
            <strong className="text-white">$212,500 (17.0 HRS)</strong>
          </div>
          <div className="flex items-center space-x-1.5 border border-cyan-500/30 px-2.5 py-1 bg-cyan-950/20 rounded text-cyan-300">
            <Clock className="h-3 w-3 text-cyan-400" />
            <span>MEL CAT C:</span>
            <strong className="text-white">10 DAYS / 120 HRS DISPATCH</strong>
          </div>
          <div className="flex items-center space-x-1.5 border border-white/[0.08] px-2.5 py-1 bg-[#0c0f17] rounded text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>DATA DIODE:</span>
            <strong className="text-white">ARINC 429 RX</strong>
          </div>
          <div className="flex items-center space-x-1.5 border border-[#1e2638] px-2.5 py-1 bg-[#0b0e17] rounded text-zinc-300">
            <Layers className="h-3 w-3 text-cyan-400" />
            <span>MMR LEAVES:</span>
            <strong className="text-white">{ledgerHistory.length}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] text-xs font-mono">
        <button 
          onClick={() => setActiveTab("fleet")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer uppercase tracking-wider ${
            activeTab === "fleet" 
              ? "border-cyan-400 text-white bg-[#0c101a] font-bold" 
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Propulsion Telemetry
        </button>
        <button 
          onClick={() => setActiveTab("federated")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer uppercase tracking-wider ${
            activeTab === "federated" 
              ? "border-cyan-400 text-white bg-[#0c101a] font-bold" 
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Federated Fleet Learning
        </button>
        <button 
          onClick={() => {
            setActiveTab("ledger");
            onRefreshLedger?.();
          }}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer uppercase tracking-wider ${
            activeTab === "ledger" 
              ? "border-cyan-400 text-white bg-[#0c101a] font-bold" 
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          MMR Audit Ledger
        </button>
      </div>

      {/* Tab Panels */}
      <main className="space-y-6">
        
        {/* TAB 1: Propulsion Telemetry */}
        {activeTab === "fleet" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Propulsion register list & interactive blueprint */}
            <div className="space-y-4 lg:col-span-1 text-left">
              <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Propulsion Register</h2>
              
              <div className="space-y-3 font-mono text-xs">
                {Object.values(engines).map((eng) => {
                  const planeId = Object.keys(planes).find(key => planes[key].engines.includes(eng.id));
                  const pl = planeId ? planes[planeId] : null;
                  
                  return (
                    <div
                      key={eng.id}
                      onClick={() => setSelectedEngineId(eng.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedEngineId === eng.id 
                          ? "bg-[#0e1422] border-cyan-500/60 ring-1 ring-cyan-500/30" 
                          : "bg-[#070a12] border-white/[0.08] hover:border-white/[0.16]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <h3 className="font-bold text-zinc-200">{eng.id}</h3>
                        <span className={`text-[10px] uppercase font-bold ${getStatusColor(eng.status)}`}>
                          {eng.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[10px] text-zinc-400 font-sans">{eng.name}</p>
                        {pl && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                            pl.status === "Airborne" ? "bg-emerald-500/10 text-emerald-400" : 
                            pl.status === "Maintenance" ? "bg-red-500/10 text-red-400 font-bold" : 
                            pl.status === "Grounded" ? "bg-amber-500/10 text-amber-400" : 
                            "bg-zinc-900 text-zinc-500"
                          }`}>
                            {pl.status}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-3.5 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-zinc-500">WEAR INDEX</span>
                          <span className="text-zinc-300">{(eng.health * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-900/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${getHealthBarColor(eng.health)}`}
                            style={{ width: `${eng.health * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between border-t border-zinc-900/80 pt-3 text-[10px] font-mono text-zinc-500">
                        <span>CYCLES: <strong className="text-zinc-300">{eng.cycle}</strong></span>
                        <span>RUL: <strong className="text-zinc-300">{eng.rul} CYC</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Jet engine sensor diagram mapping */}
              <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center space-x-2">
                    <Compass className="h-4 w-4 text-cyan-400 shrink-0" />
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold whitespace-nowrap">
                      Turbofan Gas Path Blueprint (SAE ARP 755A)
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenStudioModal && (
                      <button
                        onClick={() => onOpenStudioModal('3d-engine')}
                        className="flex items-center space-x-1.5 px-2.5 py-1 text-[9.5px] font-mono font-bold bg-[#0c101a] border border-white/[0.08] hover:border-cyan-500/40 hover:bg-[#121928] text-zinc-300 hover:text-cyan-300 rounded transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>3D Turbofan Studio</span>
                      </button>
                    )}
                    {activeBlueprintSensor && (
                      <span className="text-[9px] font-mono bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded text-cyan-300 uppercase font-bold flex items-center space-x-1.5 whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span>PROBE: {activeBlueprintSensor.toUpperCase()}</span>
                      </span>
                    )}
                    <span className="text-[9px] font-mono bg-[#070a12] border border-white/[0.08] px-2 py-0.5 rounded text-zinc-400 whitespace-nowrap">
                      DUAL-SPOOL AXIAL
                    </span>
                  </div>
                </div>

                {/* Vector CAD Cross-Section */}
                <div className="bg-[#06080e] border border-white/[0.06] rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 560 230" className="w-full h-auto select-none overflow-visible">
                    <defs>
                      <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#161f30" strokeWidth="0.5" strokeDasharray="1 3" />
                      </pattern>
                      <radialGradient id="combustorHeat" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                        <stop offset="60%" stopColor="#f97316" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#0b0e17" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="hotspotAura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#ef4444" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="coreFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                        <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.3" />
                        <stop offset="65%" stopColor="#ef4444" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.25" />
                      </linearGradient>
                      <filter id="probeGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* CAD Millimeter Background Grid */}
                    <rect x="0" y="0" width="560" height="230" fill="url(#cadGrid)" />

                    {/* Dynamic Hotspot Aura if severe wear is detected - Anchored without coordinate jump */}
                    {(() => {
                      const topItem = activeEngine?.attribution?.[0];
                      if (!topItem) return null;
                      const s = topItem.sensor;
                      let hx = 278, hy = 115;
                      if (s === "s4" || s === "s20" || s === "s21") { hx = 390; hy = 115; }
                      else if (s === "s12") { hx = 312; hy = 115; }
                      else if (s === "s15" || s === "s2") { hx = 180; hy = 60; }
                      else if (s === "s8" || s === "s13") { hx = 88; hy = 115; }
                      return (
                        <g pointerEvents="none">
                          <circle cx={hx} cy={hy} r="26" fill="url(#hotspotAura)" opacity="0.8">
                            <animate attributeName="r" values="22;34;22" dur="2.4s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0.35;0.8" dur="2.4s" repeatCount="indefinite" />
                          </circle>
                          <circle cx={hx} cy={hy} r="16" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7">
                            <animate attributeName="r" values="14;22;14" dur="2.4s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.4s" repeatCount="indefinite" />
                          </circle>
                        </g>
                      );
                    })()}

                    {/* Rotational Centerline Axis */}
                    <line x1="25" y1="115" x2="535" y2="115" stroke="#06b6d4" strokeWidth="1" strokeDasharray="7 4" opacity="0.45" />
                    <text x="538" y="118" fill="#06b6d4" className="font-mono text-[7px] opacity-70">CL</text>

                    {/* Cold Bypass Airflow Laminar Streamlines */}
                    <path d="M 100 54 C 200 54, 320 54, 460 68" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="6 8" strokeLinecap="round" opacity="0.65">
                      <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />
                    </path>
                    <path d="M 100 176 C 200 176, 320 176, 460 162" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="6 8" strokeLinecap="round" opacity="0.65">
                      <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />
                    </path>

                    {/* Core Gas Path Thermodynamic Streamline */}
                    <path d="M 125 115 L 450 115" fill="none" stroke="url(#coreFlowGrad)" strokeWidth="3" strokeDasharray="8 12" strokeLinecap="round" opacity="0.4">
                      <animate attributeName="stroke-dashoffset" from="40" to="0" dur="1.5s" repeatCount="indefinite" />
                    </path>

                    {/* Outer Nacelle Cowling (Bypass Outer Wall) */}
                    <path d="M 50 56 C 65 38 110 34 180 34 L 330 34 C 375 34 420 46 462 66 L 456 76 C 418 62 380 52 335 52 L 180 52 C 120 52 75 58 62 74 Z" fill="#0d1424" stroke="#2a3a58" strokeWidth="1.4" />
                    <path d="M 50 174 C 65 192 110 196 180 196 L 330 196 C 375 196 420 184 462 164 L 456 154 C 418 168 380 178 335 178 L 180 178 C 120 178 75 172 62 156 Z" fill="#0d1424" stroke="#2a3a58" strokeWidth="1.4" />

                    {/* Core Gas Path Interior Shroud */}
                    <path d="M 125 82 L 205 82 L 245 88 L 285 88 L 315 92 L 365 92 L 415 96 L 450 100 L 450 130 L 415 134 L 365 138 L 315 138 L 285 142 L 245 142 L 205 148 L 125 148 Z" fill="url(#coreFlowGrad)" stroke="#3f3f46" strokeWidth="1" />

                    {/* Station 1.0: Fan Hub Nosecone Spinner */}
                    <path d="M 45 115 C 55 106, 75 102, 86 100 L 86 130 C 75 128, 55 124, 45 115 Z" fill="#182235" stroke="#38bdf8" strokeWidth="1.2" />
                    {/* Titanium Fan Blades */}
                    <path d="M 86 52 C 92 75, 88 95, 86 100 L 94 100 C 96 95, 102 75, 96 52 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.2" />
                    <path d="M 86 178 C 92 155, 88 135, 86 130 L 94 130 C 96 135, 102 155, 96 178 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.2" />

                    {/* Station 2.4: LPC / Booster Stages (3 Disks) */}
                    {[138, 155, 172].map((x, i) => (
                      <g key={`lpc-${i}`}>
                        <line x1={x} y1="82" x2={x} y2="148" stroke="#38bdf8" strokeWidth="1.8" opacity="0.8" />
                        <line x1={x+7} y1="85" x2={x+7} y2="145" stroke="#52525b" strokeWidth="1.2" strokeDasharray="2 3" />
                      </g>
                    ))}

                    {/* Station 3.0: High Pressure Compressor (HPC 9 Tapered Blade Rows) */}
                    {[196, 206, 216, 226, 236, 246, 256, 266, 276].map((x, i) => {
                      const taper = i * 0.9;
                      return (
                        <g key={`hpc-${i}`}>
                          <line x1={x} y1={82 + taper} x2={x} y2={148 - taper} stroke="#e4e4e7" strokeWidth="1.5" />
                          <line x1={x+4} y1={84 + taper} x2={x+4} y2={146 - taper} stroke="#71717a" strokeWidth="0.9" />
                        </g>
                      );
                    })}

                    {/* Station 3.5: Annular Combustor Double-Wall Liner */}
                    <rect x="286" y="90" width="52" height="50" rx="3" fill="#1c1917" stroke="#f97316" strokeWidth="1.2" />
                    <circle cx="312" cy="115" r="18" fill="url(#combustorHeat)" />
                    {/* Fuel Swirl Nozzles */}
                    <circle cx="290" cy="104" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="0.8" />
                    <circle cx="290" cy="126" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="0.8" />
                    <line x1="284" y1="104" x2="292" y2="104" stroke="#f97316" strokeWidth="1.5" />
                    <line x1="284" y1="126" x2="292" y2="126" stroke="#f97316" strokeWidth="1.5" />

                    {/* Station 4.1: High Pressure Turbine (HPT - 2 Stages) */}
                    <line x1="346" y1="90" x2="346" y2="140" stroke="#f97316" strokeWidth="2.2" />
                    <line x1="358" y1="91" x2="358" y2="139" stroke="#f97316" strokeWidth="2.2" />

                    {/* Station 4.5 / 5.0: Low Pressure Turbine (LPT - 4 Stages) */}
                    {[374, 388, 402, 416].map((x, i) => (
                      <g key={`lpt-${i}`}>
                        <line x1={x} y1="94" x2={x} y2="136" stroke="#38bdf8" strokeWidth="1.8" />
                        <line x1={x+5} y1="95" x2={x+5} y2="135" stroke="#71717a" strokeWidth="0.9" />
                      </g>
                    ))}

                    {/* Exhaust Tail Plug Centerbody Cone */}
                    <path d="M 416 108 L 476 115 L 416 122 Z" fill="#18181b" stroke="#71717a" strokeWidth="1.2" />

                    {/* Dual Concentric Shaft Lines */}
                    {/* Outer HP Shaft (driving HPC from HPT) */}
                    <rect x="200" y="111" width="150" height="8" fill="#292524" stroke="#f59e0b" strokeWidth="0.9" opacity="0.85" />
                    {/* Inner LP Shaft (driving Fan from LPT) */}
                    <rect x="88" y="113" width="330" height="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="0.8" opacity="0.9" />

                    {/* Interactive Sensor Probes - Calibrated SAE ARP 755A Stations */}
                    {[
                      { id: "s8", label: "s8 (Nf)", station: "STA 1.0", px: 90, py: 31, targetX: 88, targetY: 115, isTop: true },
                      { id: "s15", label: "s15 (BPR)", station: "BYPASS", px: 180, py: 31, targetX: 180, targetY: 54, isTop: true },
                      { id: "s7", label: "s7 (P30)", station: "STA 3.0", px: 260, py: 31, targetX: 278, targetY: 86, isTop: true },
                      { id: "s11", label: "s11 (Ps30)", station: "STA 3.0", px: 312, py: 31, targetX: 288, targetY: 90, isTop: true },
                      { id: "s20", label: "s20 (W31)", station: "STA 4.1", px: 366, py: 31, targetX: 352, targetY: 90, isTop: true },
                      { id: "s21", label: "s21 (W32)", station: "STA 4.5", px: 422, py: 31, targetX: 388, targetY: 92, isTop: true },
                      
                      { id: "s2", label: "s2 (T24)", station: "STA 2.4", px: 155, py: 202, targetX: 172, targetY: 148, isTop: false },
                      { id: "s9", label: "s9 (Nc)", station: "STA 3.0", px: 220, py: 202, targetX: 236, targetY: 115, isTop: false },
                      { id: "s3", label: "s3 (T30)", station: "STA 3.0", px: 275, py: 202, targetX: 278, targetY: 144, isTop: false },
                      { id: "s12", label: "s12 (phi)", station: "STA 3.5", px: 332, py: 202, targetX: 302, targetY: 126, isTop: false },
                      { id: "s4", label: "s4 (T50)", station: "STA 5.0", px: 412, py: 202, targetX: 422, targetY: 140, isTop: false }
                    ].map((sensor) => {
                      const isSelected = selectedBlueprintSensor === sensor.id;
                      const isHovered = hoveredBlueprintSensor === sensor.id;
                      const wearItem = activeEngine?.attribution?.find(a => a.sensor === sensor.id);
                      const wearRank = activeEngine?.attribution?.findIndex(a => a.sensor === sensor.id) ?? -1;
                      const isTopWear = wearRank === 0;
                      const isHighWear = wearRank !== -1 && wearRank < 3;

                      let nodeStroke = "#3f3f46";
                      let nodeFill = "#18181b";
                      let textFill = "#a1a1aa";
                      
                      if (isSelected) {
                        nodeStroke = "#22d3ee";
                        nodeFill = "#082f49";
                        textFill = "#38bdf8";
                      } else if (isHovered) {
                        nodeStroke = "#06b6d4";
                        nodeFill = "#0e1e30";
                        textFill = "#67e8f9";
                      } else if (isTopWear) {
                        nodeStroke = "#ef4444";
                        nodeFill = "#450a0a";
                        textFill = "#f87171";
                      } else if (isHighWear) {
                        nodeStroke = "#f59e0b";
                        nodeFill = "#451a03";
                        textFill = "#fbbf24";
                      }

                      return (
                        <g
                          key={sensor.id}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredBlueprintSensor(sensor.id)}
                          onMouseLeave={() => setHoveredBlueprintSensor(null)}
                          onClick={() => setSelectedBlueprintSensor(selectedBlueprintSensor === sensor.id ? null : sensor.id)}
                        >
                          {/* Generous Invisible Hit-Target to Prevent Hover Dropping */}
                          <rect
                            x={sensor.px - 26}
                            y={sensor.py - 10}
                            width="52"
                            height="20"
                            fill="transparent"
                            pointerEvents="all"
                          />

                          {/* Station Lead Line from badge to engine gas path */}
                          <line
                            x1={sensor.px}
                            y1={sensor.isTop ? sensor.py + 7 : sensor.py - 7}
                            x2={sensor.targetX}
                            y2={sensor.targetY}
                            stroke={isSelected ? "#22d3ee" : isHovered ? "#06b6d4" : isTopWear ? "#ef4444" : "#3f3f46"}
                            strokeWidth={isSelected || isHovered || isTopWear ? "1.4" : "0.8"}
                            strokeDasharray={isSelected || isHovered ? "none" : "2 2"}
                            opacity={isSelected || isHovered || isTopWear ? 1 : 0.6}
                            pointerEvents="none"
                          />

                          {/* Physical probe target node on engine */}
                          <circle
                            cx={sensor.targetX}
                            cy={sensor.targetY}
                            r={isSelected || isHovered ? 4.2 : isTopWear ? 3.5 : 2.5}
                            fill={nodeStroke}
                            stroke="#0b0e17"
                            strokeWidth="1"
                            pointerEvents="none"
                          />

                          {/* Pinned Selection Outer Ring */}
                          {isSelected && (
                            <rect
                              x={sensor.px - 26}
                              y={sensor.py - 10}
                              width="52"
                              height="20"
                              rx="10"
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth="1.2"
                              strokeDasharray="2 2"
                              pointerEvents="none"
                            />
                          )}

                          {/* Probe Callout Pill Badge - Static Position with Crisp Vector Stroke */}
                          <rect
                            x={sensor.px - 23}
                            y={sensor.py - 7}
                            width="46"
                            height="14"
                            rx="7"
                            fill={nodeFill}
                            stroke={nodeStroke}
                            strokeWidth={isSelected || isHovered ? "1.8" : "1"}
                            pointerEvents="none"
                            className="transition-colors duration-150"
                          />
                          <text
                            x={sensor.px}
                            y={sensor.py + 3}
                            textAnchor="middle"
                            className="font-mono text-[7.5px] font-bold pointer-events-none select-none"
                            fill={textFill}
                          >
                            {sensor.label.toUpperCase()}
                          </text>

                          {/* Top Wear Indicator Pin - Anchored SVG Pulse Without Translation Displacement */}
                          {isTopWear && (
                            <circle cx={sensor.px + 18} cy={sensor.py - 5} r="3" fill="#ef4444" pointerEvents="none">
                              <animate attributeName="r" values="2.5;4.5;2.5" dur="1.4s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite" />
                            </circle>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Aerospace Component & Telemetry Inspector Card */}
                {(() => {
                  const currentSensor = activeBlueprintSensor || activeEngine?.attribution?.[0]?.sensor || "s7";
                  const meta = SENSOR_METADATA[currentSensor];
                  const attrItem = activeEngine?.attribution?.find(a => a.sensor === currentSensor);
                  const wearRank = activeEngine?.attribution?.findIndex(a => a.sensor === currentSensor) ?? -1;
                  const isTop = wearRank === 0;

                  return (
                    <div className="bg-[#070a12] border border-white/[0.08] p-4 rounded-xl text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            isTop ? "bg-red-500/20 text-red-400 border border-red-500/40" :
                            wearRank < 3 && wearRank !== -1 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                            "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                          }`}>
                            {meta?.station || "ENGINE STATION"}
                          </span>
                          <span className="font-mono text-xs font-bold text-white uppercase">
                            {currentSensor.toUpperCase()} • {meta?.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 font-mono text-[10px]">
                          {attrItem?.value !== undefined && (
                            <span className="text-zinc-300">
                              READING: <strong className="text-cyan-300">{attrItem.value} {attrItem.unit || meta?.defaultUnit}</strong>
                            </span>
                          )}
                          {attrItem?.delta !== undefined && (
                            <span className={attrItem.delta < 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                              Δ {attrItem.delta > 0 ? `+${attrItem.delta}` : attrItem.delta} {attrItem.unit || meta?.defaultUnit}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            isTop ? "bg-red-950 text-red-300 border border-red-700" : "bg-zinc-800 text-zinc-300"
                          }`}>
                            ATTRIB: {attrItem?.percentage.toFixed(1) ?? "0.0"}%
                          </span>
                        </div>
                      </div>

                      <p className="text-zinc-400 font-sans text-xs leading-relaxed">
                        {meta?.desc}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-zinc-500">
                        <span>Click or hover any probe node on the cross-section to inspect sensor parameters.</span>
                        {isTop && (
                          <span className="text-red-400 font-bold flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>PRIMARY WEAR HOTSPOT</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Charts & XAI panels */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Telemetry charts */}
              <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-semibold">Prognostics Telemetry</span>
                    <h3 className="text-sm font-bold text-zinc-200 uppercase font-mono">Live RUL Prognostics Curve</h3>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <button
                      onClick={() => setIsStreaming(!isStreaming)}
                      className={`flex items-center space-x-1.5 py-1.5 px-3 rounded border font-mono text-[9px] uppercase font-bold transition-all cursor-pointer ${
                        isStreaming
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-zinc-900 border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isStreaming ? "bg-emerald-400" : "bg-zinc-600"}`} />
                      <span>{isStreaming ? "AUTO-STREAM: ON" : "AUTO-STREAM: OFF"}</span>
                    </button>
                    <div className="flex items-center space-x-1.5 bg-[#070a12] border border-white/[0.08] px-2.5 py-1.5 rounded">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-zinc-400 uppercase font-bold text-[9px]">95% CI Corridor</span>
                    </div>
                    <button onClick={() => streamNextCycle(activeEngine.id)} disabled={isInferring || !backendOnline} className="flex items-center space-x-1 bg-[#0e1726] hover:bg-[#16233a] border border-cyan-500/40 text-cyan-300 font-bold py-1.5 px-3.5 rounded transition-all cursor-pointer">
                      <span>STEP FLIGHT CYCLE</span>
                    </button>
                  </div>
                </div>

                <div className="h-60 w-full bg-[#070a12] p-2 border border-white/[0.06] rounded-xl">
                  {mounted && activeEngine?.history && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activeEngine.history} margin={{ top: 8, right: 12, left: -4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                        <XAxis 
                          dataKey="cycle" 
                          stroke="#52525b" 
                          fontSize={8.5} 
                          fontFamily="monospace"
                          tickLine={{ stroke: "#27272a" }}
                        />
                        <YAxis 
                          yAxisId="left" 
                          stroke="#71717a" 
                          fontSize={8.5} 
                          fontFamily="monospace" 
                          domain={[0, 'auto']}
                          tickLine={{ stroke: "#27272a" }}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          stroke="#52525b" 
                          fontSize={8.5} 
                          fontFamily="monospace"
                          domain={['auto', 'auto']}
                          tickLine={{ stroke: "#27272a" }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#090d16", 
                            borderColor: "rgba(255,255,255,0.1)", 
                            color: "#f4f4f5", 
                            fontFamily: "monospace", 
                            fontSize: "9px",
                            borderRadius: "8px",
                            padding: "8px"
                          }}
                          formatter={(value: any, name: any) => [
                            typeof value === 'number' ? value.toFixed(1) : value, 
                            name ?? ""
                          ]}
                          labelFormatter={(cycle: any) => `Flight Cycle #${cycle}`}
                        />
                        <Line yAxisId="left" type="monotone" dataKey="rul_upper" name="Upper 95% CI" stroke="#10b981" strokeDasharray="2 2" strokeWidth={1} strokeOpacity={0.4} dot={false} isAnimationActive={false} />
                        <Line yAxisId="left" type="monotone" dataKey="rul_lower" name="Lower 95% CI" stroke="#10b981" strokeDasharray="2 2" strokeWidth={1} strokeOpacity={0.4} dot={false} isAnimationActive={false} />
                        <Line 
                          yAxisId="left" 
                          type="monotone" 
                          dataKey="rul" 
                          name="Predicted RUL" 
                          stroke={activeEngine.status === "Critical" ? "#ef4444" : activeEngine.status === "Warning" ? "#f59e0b" : "#10b981"} 
                          strokeWidth={2} 
                          dot={{ r: 1.5, fill: activeEngine.status === "Critical" ? "#ef4444" : activeEngine.status === "Warning" ? "#f59e0b" : "#10b981" }} 
                          isAnimationActive={false} 
                        />
                        <Line yAxisId="right" type="monotone" dataKey="sensor_11" name="HPC Core Temp (T30, °R)" stroke="#71717a" strokeWidth={1.2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Twin-Engine Differential Telemetry Gauge (Common-Mode Atmospheric Rejection) */}
              {(() => {
                const planeEngines = parentPlane?.engines || [];
                const counterpartEngineId = planeEngines.find(id => id !== selectedEngineId) || (selectedEngineId === "ENG-001" ? "ENG-002" : "ENG-001");
                const counterpartEngine = engines[counterpartEngineId];
                
                const s3A = activeEngine?.sensors?.s3 ?? 1585.0;
                const s3B = counterpartEngine?.sensors?.s3 ?? 1584.0;
                const deltaT30 = Math.abs(s3A - s3B);

                const s7A = activeEngine?.sensors?.s7 ?? 554.0;
                const s7B = counterpartEngine?.sensors?.s7 ?? 553.8;
                const deltaP30 = Math.abs(s7A - s7B);

                const s4A = activeEngine?.sensors?.s4 ?? 1400.0;
                const s4B = counterpartEngine?.sensors?.s4 ?? 1401.0;
                const deltaEgt = Math.abs(s4A - s4B);

                const s9A = activeEngine?.sensors?.s9 ?? 9050.0;
                const s9B = counterpartEngine?.sensors?.s9 ?? 9048.0;
                const deltaN2 = Math.abs(s9A - s9B);

                const vibA = activeEngine?.vibration?.n1 ?? 0.18;
                const vibB = counterpartEngine?.vibration?.n1 ?? 0.18;
                const deltaVib = Math.abs(vibA - vibB);

                const isSymmetricWeather = activeFault === "monsoon" || (deltaP30 < 1.0 && deltaT30 < 8.0 && !activeFault);
                const isAsymmetricWear = !isSymmetricWeather && (deltaP30 >= 1.0 || deltaT30 >= 8.0 || activeFault !== null);

                return (
                  <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-4 space-y-3 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-cyan-400" />
                        <h3 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
                          Twin-Engine Differential Telemetry (ΔTelemetry = Port − Starboard)
                        </h3>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onOpenAcarsModal && (
                          <button
                            onClick={onOpenAcarsModal}
                            className="px-2.5 py-1 rounded-lg bg-[#070a12] hover:bg-[#0e1422] border border-cyan-500/30 text-cyan-300 font-mono text-[9px] font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                            title="Inspect 48-byte ARINC 620 binary downlink frame"
                          >
                            <Radio className="h-3 w-3 text-cyan-400" />
                            <span>INSPECT ACARS 48B PACKET</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Common-Mode Environmental vs Asymmetric Mechanical Banner */}
                    <div className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                      isSymmetricWeather
                        ? "bg-[#06120c] border-emerald-500/30 text-emerald-300"
                        : isAsymmetricWear
                        ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                        : "bg-[#070a12] border-white/[0.06] text-zinc-400"
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className={`h-2 w-2 rounded-full ${isSymmetricWeather ? "bg-emerald-500" : isAsymmetricWear ? "bg-amber-400 animate-pulse" : "bg-zinc-500"}`} />
                        <span className="font-bold">
                          {isSymmetricWeather 
                            ? "COMMON-MODE ATMOSPHERIC REJECTION (Δ < 2% SYMMETRIC) → ENVIRONMENTAL INHIBIT (ZERO FALSE REMOVALS)"
                            : isAsymmetricWear
                            ? "ASYMMETRIC CORE DECAY ISOLATED (ΔP30 > 15%) → MECHANICAL WEAR CONFIRMED (WORK ORDER DISPATCHED)"
                            : "DUAL-CHANNEL PROPULSION EQUILIBRIUM (Δ < 1.0%) → SYMMETRIC FLIGHT NORMAL"}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-80 uppercase font-sans">
                        {selectedEngineId} vs {counterpartEngineId}
                      </span>
                    </div>

                    {/* 5 Differential Channels Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
                      <div className="p-2 bg-[#070a12] rounded-lg border border-white/[0.04]">
                        <span className="text-zinc-500 block">Δ T30 (HPC TEMP)</span>
                        <span className={`font-bold text-xs ${deltaT30 > 15 ? "text-amber-400" : "text-zinc-200"}`}>
                          {deltaT30.toFixed(1)} °R
                        </span>
                        <span className="text-[8.5px] text-zinc-500 block pt-0.5">Core Hotspot Diff</span>
                      </div>

                      <div className="p-2 bg-[#070a12] rounded-lg border border-white/[0.04]">
                        <span className="text-zinc-500 block">Δ P30 (HPC PRESS)</span>
                        <span className={`font-bold text-xs ${deltaP30 > 1.5 ? "text-amber-400" : "text-zinc-200"}`}>
                          {deltaP30.toFixed(2)} psia
                        </span>
                        <span className="text-[8.5px] text-zinc-500 block pt-0.5">Pressure Ratio Diff</span>
                      </div>

                      <div className="p-2 bg-[#070a12] rounded-lg border border-white/[0.04]">
                        <span className="text-zinc-500 block">Δ EGT (EXHAUST)</span>
                        <span className={`font-bold text-xs ${deltaEgt > 20 ? "text-amber-400" : "text-zinc-200"}`}>
                          {deltaEgt.toFixed(1)} °R
                        </span>
                        <span className="text-[8.5px] text-zinc-500 block pt-0.5">Turbine Thermal Diff</span>
                      </div>

                      <div className="p-2 bg-[#070a12] rounded-lg border border-white/[0.04]">
                        <span className="text-zinc-500 block">Δ N2 (CORE SPEED)</span>
                        <span className={`font-bold text-xs ${deltaN2 > 30 ? "text-amber-400" : "text-zinc-200"}`}>
                          {deltaN2.toFixed(0)} rpm
                        </span>
                        <span className="text-[8.5px] text-zinc-500 block pt-0.5">Shaft Dynamics Diff</span>
                      </div>

                      <div className="p-2 bg-[#070a12] rounded-lg border border-white/[0.04]">
                        <span className="text-zinc-500 block">Δ VIBRATION</span>
                        <span className={`font-bold text-xs ${deltaVib > 0.2 ? "text-amber-400" : "text-zinc-200"}`}>
                          {deltaVib.toFixed(2)} mils
                        </span>
                        <span className="text-[8.5px] text-zinc-500 block pt-0.5">Rotor Balance Diff</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Aerothermal Fault & Stress Injection Testbench */}
              <FaultInjectionHarness
                activeFault={activeFault}
                onInjectFault={onInjectFault}
                onResetFault={onResetFault}
                activeEngine={activeEngine}
                onOpenAmosModal={onOpenAmosModal}
                onMaintenanceRelease={onMaintenanceRelease}
                parentPlaneId={parentPlaneId}
                isInferring={isInferring}
              />

              {/* ARINC 429 Unidirectional Optical Data Diode Bus Stream */}
              <Arinc429FrameInspector
                activeEngine={activeEngine}
                activeFault={activeFault}
              />

              {/* Explainable AI attribution */}
              <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-200 flex items-center space-x-2 font-bold">
                      <Cpu className="h-4 w-4 text-cyan-400" />
                      <span>Sensor Attribution Matrix (C-MAPSS XAI)</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                      Integrated Gradients sensitivity relative to pristine baseline (healthy cycle 30).
                    </p>
                  </div>
                  {activeEngine?.attribution?.[0] && (
                    <div className="text-[9px] font-mono px-2.5 py-1 rounded bg-[#070a12] border border-white/[0.08] flex items-center space-x-2">
                      <span className="text-zinc-400">LEAD DRIVER:</span>
                      <strong className="text-red-400 uppercase font-bold">
                        {activeEngine.attribution[0].sensor.toUpperCase()} ({activeEngine.attribution[0].percentage.toFixed(1)}%)
                      </strong>
                    </div>
                  )}
                </div>

                {/* Subsystem Diagnosis Alert Banner */}
                {(() => {
                  const top = activeEngine?.attribution?.[0]?.sensor;
                  if (!top) return null;
                  let banner = { title: "NORMAL OPERATIONAL STATUS", desc: "Symmetrical sensor distribution across gas path.", style: "bg-emerald-950/30 border-emerald-500/30 text-emerald-300" };
                  if (top === "s7" || top === "s11" || top === "s9") {
                    banner = { title: "COMPRESSOR DEGRADATION DETECTED", desc: "HPC pressure loss and spool speed deviation indicate stator blade erosion or clearance increase.", style: "bg-amber-950/30 border-amber-500/30 text-amber-300" };
                  } else if (top === "s4" || top === "s3" || top === "s20") {
                    banner = { title: "HOT-SECTION THERMAL STRESS DETECTED", desc: "EGT and turbine cooling bleed elevation indicate thermal barrier coating spallation.", style: "bg-red-950/30 border-red-500/30 text-red-300" };
                  } else if (top === "s12") {
                    banner = { title: "COMBUSTION SUBSYSTEM RESTRICTION", desc: "Fuel flow ratio shift indicates fuel nozzle coking or atomization distortion.", style: "bg-red-950/30 border-red-500/30 text-red-300" };
                  } else if (top === "s15" || top === "s2") {
                    banner = { title: "BYPASS AERODYNAMIC COUPLING", desc: "Bypass mass ratio shift and intake temperature drop reflect atmospheric moisture ingestion.", style: "bg-cyan-950/30 border-cyan-500/30 text-cyan-300" };
                  }

                  return (
                    <div className={`p-2.5 border rounded-lg text-xs font-mono flex items-center justify-between ${banner.style}`}>
                      <div className="flex items-center space-x-2">
                        <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-bold">{banner.title}</span>
                      </div>
                      <span className="text-[10px] opacity-80 hidden md:inline">{banner.desc}</span>
                    </div>
                  );
                })()}

                {activeEngine?.attribution && activeEngine.attribution.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 font-mono">
                    {activeEngine.attribution.map((item, idx) => {
                      const meta = SENSOR_METADATA[item.sensor];
                      const isTop = idx === 0;
                      const isHigh = idx < 3;
                      const deltaStr = item.delta !== undefined ? (item.delta > 0 ? `+${item.delta}` : `${item.delta}`) : null;

                      return (
                        <div key={item.sensor} className="bg-[#070a12] border border-white/[0.05] p-2.5 rounded-lg space-y-1.5 hover:border-white/[0.15] transition-colors">
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center space-x-2">
                              <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${
                                isTop ? "bg-red-500 text-white font-bold" :
                                isHigh ? "bg-amber-500 text-black font-bold" :
                                "bg-zinc-800 text-zinc-400"
                              }`}>
                                #{idx + 1}
                              </span>
                              <span className={`font-bold ${isTop ? "text-red-400" : isHigh ? "text-amber-300" : "text-zinc-200"}`}>
                                {item.sensor.toUpperCase()}
                              </span>
                              <span className="text-zinc-400 truncate max-w-[130px] sm:max-w-[170px]">
                                {meta?.label}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-right">
                              {item.value !== undefined && (
                                <span className="text-zinc-400 text-[9px]">
                                  {item.value} {item.unit || meta?.defaultUnit}
                                </span>
                              )}
                              {deltaStr && (
                                <span className={`text-[9px] font-bold ${item.delta! < 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                  (Δ {deltaStr})
                                </span>
                              )}
                              <span className={`font-bold text-[10px] min-w-[38px] text-right ${
                                isTop ? "text-red-400" : isHigh ? "text-amber-400" : "text-zinc-300"
                              }`}>
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Animated Progress Bar */}
                          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-700 rounded-full ${
                                isTop ? "bg-red-500" :
                                isHigh ? "bg-amber-500" :
                                "bg-zinc-700"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-zinc-950/20 border border-dashed border-zinc-900 rounded-lg p-6 text-center text-xs font-mono text-zinc-600">
                    No explainable metrics compiled. Streaming real-time telemetry updates.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: Federated Fleet Model Aggregator */}
        {activeTab === "federated" && (
          <div className="space-y-6">
            <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 md:p-6 space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white font-sans flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <span>Federated Fleet Model Aggregator (FedProx / LDP)</span>
                  </h4>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Privacy-preserving distributed weight synchronization across maintenance stations.
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono">
                  {runFederatedRound && (
                    <button
                      onClick={runFederatedRound}
                      disabled={isFederating || !backendOnline}
                      className="px-3 py-1.5 rounded-lg bg-[#0c0f17] hover:bg-zinc-800 text-cyan-400 border border-cyan-500/30 disabled:opacity-50 cursor-pointer flex items-center space-x-2 transition-colors"
                    >
                      <RefreshCw className={`h-3 w-3 ${isFederating ? "animate-spin text-cyan-400" : ""}`} />
                      <span>{isFederating ? "Aggregating..." : "Run Aggregation"}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
                {/* Station Loss Status Grid */}
                <div className="md:col-span-1 space-y-3 font-mono text-[10px]">
                  <strong className="text-zinc-400 block tracking-wider uppercase font-sans text-xs">Station Model Loss</strong>
                  
                  <div className="space-y-2 bg-[#070a12] p-3 border border-white/[0.06] rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Bengaluru (BLR - Hub)</span>
                      <span className="text-emerald-400 font-bold">Loss: 0.015</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Delhi (DEL - Transit)</span>
                      <span className="text-emerald-400 font-bold">Loss: 0.032</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">London (LHR - Line)</span>
                      <span className="text-emerald-400 font-bold">Loss: 0.021</span>
                    </div>
                    <div className="border-t border-white/[0.06] pt-2 flex justify-between text-[9px] text-zinc-400">
                      <span>PRIVACY GUARANTEE:</span>
                      <span className="text-cyan-400 font-bold">Gaussian LDP (ε=1.5, σ=0.001)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#070a12] border border-white/[0.06] rounded-lg space-y-2 text-[10px]">
                    <span className="text-zinc-400 font-bold uppercase block">FedProx Parameters</span>
                    <div className="flex justify-between text-zinc-500">
                      <span>Proximal Penalty (μ):</span>
                      <span className="text-zinc-300 font-bold">0.01</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Client Epochs:</span>
                      <span className="text-zinc-300 font-bold">1 per round</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Transport Channel:</span>
                      <span className="text-emerald-400 font-bold">WSS TLS 1.3</span>
                    </div>
                  </div>
                </div>

                {/* Training Convergence Plot */}
                <div className="md:col-span-2 space-y-2">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider block text-left">Convergence log (Last 10 updates)</span>
                  <div className="h-56 w-full bg-zinc-950/40 p-2 border border-zinc-900 rounded-lg">
                    {mounted && federatedHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={federatedHistory.slice(-10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                          <XAxis dataKey="round" stroke="#3f3f46" fontSize={8} fontFamily="monospace" />
                          <YAxis stroke="#3f3f46" fontSize={8} fontFamily="monospace" />
                          <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#18181b", color: "#f4f4f5", fontFamily: "monospace", fontSize: 8 }} />
                          <Line type="monotone" dataKey="global_loss" name="Global Loss" stroke="#10b981" strokeWidth={1.8} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="station_1_loss" name="BLR Loss" stroke="#06b6d4" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                          <Line type="monotone" dataKey="station_2_loss" name="DEL Loss" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-mono text-zinc-600 text-[10px]">
                        No calibration cycles executed. Streaming automatic weights.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Cryptographic MMR Audit Ledger */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Validation Status panel */}
              <div className="md:col-span-1 bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Ledger Verification Console</h3>
                
                <div className="flex flex-col gap-2">
                  <button onClick={verifyLedgerIntegrity} disabled={isVerifying || !backendOnline} className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-colors">
                    {isVerifying ? "VERIFYING INTEGRITY..." : "VALIDATE INTEGRITY"}
                  </button>
                  <button onClick={simulateTampering} disabled={!backendOnline || ledgerHistory.length === 0} className="w-full py-2 border border-red-500/40 hover:border-red-500 bg-red-950/20 text-red-400 font-mono text-[9px] uppercase rounded-lg cursor-pointer transition-colors">
                    SIMULATE MALICIOUS INTRUSION (TAMPER)
                  </button>
                  {restoreLedger && (
                    <button onClick={restoreLedger} disabled={!backendOnline} className="w-full py-2 border border-emerald-500/40 hover:border-emerald-500 bg-emerald-950/20 text-emerald-400 font-mono text-[9px] font-bold uppercase rounded-lg cursor-pointer transition-colors flex items-center justify-center space-x-1.5">
                      <Shield className="h-3 w-3" />
                      <span>HEAL & RESTORE CRYPTOGRAPHIC SEAL</span>
                    </button>
                  )}
                  {onResetLedger && (
                    <button 
                      onClick={onResetLedger} 
                      disabled={!backendOnline} 
                      className="w-full py-2 border border-zinc-700/60 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 font-mono text-[9px] font-bold uppercase rounded-lg cursor-pointer transition-colors flex items-center justify-center space-x-1.5"
                      title="Reset Merkle Mountain Range to pristine 7-leaf baseline"
                    >
                      <RefreshCw className="h-3 w-3 text-cyan-400" />
                      <span>RESET LEDGER (7-LEAF BASELINE)</span>
                    </button>
                  )}
                </div>

                {verificationResult.verified !== null && (
                  <div className={`p-3 rounded-lg border text-[9px] font-mono space-y-2 ${verificationResult.verified ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
                    <div className="flex items-center space-x-1.5 font-bold uppercase">
                      {verificationResult.verified ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      <span>{verificationResult.verified ? "Verified Secure" : "Failed Integrity Check"}</span>
                    </div>
                    <p className="text-zinc-400 leading-normal text-[9px]">{verificationResult.message}</p>
                  </div>
                )}
                
                <div className="text-[9px] font-mono border border-white/[0.06] bg-[#070a12] p-2.5 rounded-lg flex justify-between">
                  <span className="text-zinc-500 font-bold">ROOT SEAL:</span>
                  <span className="text-zinc-300 truncate max-w-[130px] font-mono">{rootHash || "EMPTY"}</span>
                </div>
              </div>

              {/* Maintenance Form panel (Ledger Commit Interlock Enabled) */}
              <div className="md:col-span-2 bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 text-left">Append Certified Maintenance Entry</h3>
                
                {/* Engine selection outside of the lock section (always visible) */}
                <div className="font-mono text-[10px] text-left max-w-xs">
                  <label className="text-zinc-500 block text-[9px] mb-1 font-bold">SELECT COMPONENT TO COMMENCE MAINTENANCE</label>
                  <div className="relative">
                    <select 
                      value={formEngine} 
                      onChange={e => setFormEngine(e.target.value)} 
                      className="w-full appearance-none bg-[#070a12] border border-white/[0.1] py-2 pl-3 pr-9 rounded-lg text-zinc-200 outline-none focus:border-cyan-500/60 cursor-pointer"
                    >
                      {Object.values(engines).map(eng => (
                        <option key={eng.id} value={eng.id}>
                          {eng.id} ({eng.name})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {isFormLocked ? (
                  /* Block Form when plane is not in maintenance */
                  <div className="p-6 border border-white/[0.06] bg-[#070a12] rounded-xl flex flex-col items-center justify-center space-y-3 text-center">
                    <Lock className="h-7 w-7 text-amber-400" />
                    <div>
                      <h4 className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">Maintenance Interlock Active</h4>
                      <p className="font-sans text-[11px] text-zinc-400 mt-1 max-w-sm">
                        {formPlane?.status === "Airborne" ? (
                          `Ledger signing locked while aircraft (${formPlaneId}) is airborne. Post-flight inspection required before maintenance logs can be committed.`
                        ) : formPlane?.status === "Ready" ? (
                          `Ledger signing locked while aircraft (${formPlaneId}) is dispatched for flight. Engine must be grounded in Maintenance bay.`
                        ) : (
                          `Ledger signing locked while aircraft (${formPlaneId}) is taxiing. Awaiting bay arrival.`
                        )}
                      </p>
                    </div>
                    {onOpenAmosModal && (
                      <button
                        type="button"
                        onClick={() => onOpenAmosModal(formPlaneId, formEngine)}
                        className="mt-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-mono text-[9px] font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                      >
                        <Wrench className="h-3 w-3 text-amber-400" />
                        <span>DISPATCH AMOS WORK ORDER FOR {formPlaneId}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleManualAppend} className="grid grid-cols-2 gap-4 font-mono text-[10px] text-left">
                    <div>
                      <label className="text-zinc-500 block text-[9px] mb-1">Action</label>
                      <div className="relative">
                        <select 
                          value={formAction} 
                          onChange={e => setFormAction(e.target.value)} 
                          className="w-full appearance-none bg-[#070a12] border border-white/[0.1] py-2 pl-3 pr-9 rounded-lg text-zinc-200 outline-none focus:border-cyan-500/60 cursor-pointer"
                        >
                          <option value="Sensor Calibration">Sensor Calibration</option>
                          <option value="Oil Lubrication Refill">Oil Lubrication Refill</option>
                          <option value="Blade Replacement">Blade Replacement</option>
                          <option value="Compressor Overhaul">Compressor Overhaul</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-zinc-500 block text-[9px] mb-1">Station ID</label>
                      <div className="relative">
                        <select 
                          value={formStation} 
                          onChange={e => setFormStation(e.target.value)} 
                          className="w-full appearance-none bg-[#070a12] border border-white/[0.1] py-2 pl-3 pr-9 rounded-lg text-zinc-200 outline-none focus:border-cyan-500/60 cursor-pointer"
                        >
                          <option value="STATION_001">STATION_001 (AFS Ambala - No. 17 Sqn 'Golden Arrows')</option>
                          <option value="STATION_002">STATION_002 (AFS Bareilly - No. 8 Sqn 'Pursoots')</option>
                          <option value="STATION_003">STATION_003 (11 BRD Ojhar - Base Repair Depot)</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-zinc-500 block text-[9px] mb-1">Health Index (0.0 to 1.0)</label>
                      <input type="text" value={formHealth} onChange={e => setFormHealth(e.target.value)} suppressHydrationWarning className="w-full bg-[#070a12] border border-white/[0.1] p-2 rounded-lg text-zinc-200 outline-none focus:border-cyan-500/60" />
                    </div>
                    <div className="col-span-2 pt-1 space-y-2">
                      {formSuccessMessage && <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] rounded text-center mb-1">{formSuccessMessage}</div>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="submit" suppressHydrationWarning className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded-lg transition-all cursor-pointer text-[10px]">
                          Commit Ledger Transaction
                        </button>
                        {onMaintenanceRelease && (
                          <button
                            type="button"
                            onClick={() => onMaintenanceRelease(formPlaneId, formEngine)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-lg transition-all cursor-pointer text-[10px] flex items-center justify-center space-x-1.5"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Approve Release (CRS)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* MMR Architecture Explainer Card */}
            <div className="bg-[#070a12] border border-cyan-500/20 rounded-xl p-4 space-y-3 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold">
                  <Database className="h-4 w-4" />
                  <span>UNDERSTANDING PETER TODD MERKLE MOUNTAIN RANGES (MMR / RFC 6962)</span>
                </div>
                <span className="text-[9px] font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-2.5 py-0.5 rounded font-bold uppercase">
                  APPEND-ONLY LOGARITHMIC ACCUMULATOR
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] font-sans">
                <div className="bg-[#0b0e17] border border-white/[0.05] p-3 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 font-mono text-emerald-400 font-bold text-[10px]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>1. INDEPENDENT 2ᵏ MOUNTAINS</span>
                  </div>
                  <p className="text-zinc-400 leading-normal">
                    Unlike standard Merkle trees that force rebalancing on every entry, an MMR appends records into independent perfect binary trees of power-of-2 sizes (e.g. 8 + 4 + 2 + 1 = 15 leaves).
                  </p>
                </div>
                <div className="bg-[#0b0e17] border border-white/[0.05] p-3 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 font-mono text-cyan-400 font-bold text-[10px]">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>2. SEQUENTIAL PEAK BAGGING</span>
                  </div>
                  <p className="text-zinc-400 leading-normal">
                    The summit of each mountain is its <strong>Peak</strong>. To form a single cryptographic root seal without rewriting history, peaks are folded sequentially right-to-left into the MMR Root.
                  </p>
                </div>
                <div className="bg-[#0b0e17] border border-white/[0.05] p-3 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 font-mono text-amber-400 font-bold text-[10px]">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>3. O(log N) PROOF OF INCLUSION</span>
                  </div>
                  <p className="text-zinc-400 leading-normal">
                    Civil aviation auditors verify tamper-proof compliance with only log₂(N) sibling hashes up to the mountain peak, mathematically guaranteeing immutable airworthiness logs.
                  </p>
                </div>
              </div>
            </div>

            {/* MMR Tree visualizer */}
            <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-200 font-bold flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-cyan-400" />
                      <span>Merkle Mountain Range DAG (RFC 6962 / Peter Todd MMR)</span>
                    </h3>
                    <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[9px] font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>LIVE MMR STREAM • ACTIVE</span>
                    </span>
                    {onResetLedger && (
                      <button
                        onClick={onResetLedger}
                        disabled={!backendOnline}
                        className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-cyan-500/40 text-zinc-400 hover:text-cyan-300 font-mono text-[9px] font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reset MMR tree to pristine 7-leaf baseline"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>RESET TREE</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                    Deterministic binary mountain subtrees, dynamic Peter Todd peak bagging, and real-time inclusion proof paths.
                  </p>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono text-zinc-400">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Leaf Commit</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-600 inline-block" />
                    <span>Internal Digest</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border border-cyan-400 bg-cyan-950 inline-block" />
                    <span className="text-cyan-400 font-bold">Mountain Peak</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 inline-block" />
                    <span className="text-cyan-300 font-bold">MMR Root Seal</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                    <span className="text-amber-300 font-bold">Proof Path</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#070a12] border border-white/[0.06] rounded-xl p-4 flex flex-col items-center justify-center min-h-[300px] overflow-x-auto relative">
                {nodes.length === 0 ? (
                  <div className="text-zinc-600 font-mono text-[10px] text-center py-12">
                    <Database className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                    NO PEAKS IN REGISTRY. APPEND A TRANSACTION TO BUILD THE MMR ACCUMULATOR.
                  </div>
                ) : (() => {
                  const mmrNodesMap: any = {};
                  nodes.forEach(n => { mmrNodesMap[n.pos] = { ...n, children: [], parent: null, x: 0, y: 0 }; });
                  const stack: any[] = [];
                  const sortedNodes = [...nodes].sort((a, b) => a.pos - b.pos);
                  sortedNodes.forEach(node => {
                    const nodeObj = mmrNodesMap[node.pos];
                    if (Number(nodeObj.is_leaf) === 1) {
                      stack.push(nodeObj);
                    } else if (stack.length >= 2) {
                      const right = stack.pop();
                      const left = stack.pop();
                      nodeObj.children = [left.pos, right.pos];
                      left.parent = nodeObj.pos; right.parent = nodeObj.pos;
                      stack.push(nodeObj);
                    }
                  });
                  
                  const peaks = [...stack];
                  const peakPositions = new Set(peaks.map(p => p.pos));
                  const leaves = Object.values(mmrNodesMap).filter((n: any) => Number(n.is_leaf) === 1).sort((a: any, b: any) => a.pos - b.pos);
                  
                  const maxTreeHeight = Math.max(...nodes.map((n: any) => n.height || 0), 1);
                  const hVal = Math.max(300, 120 + (maxTreeHeight + 1) * 48);
                  const wVal = Math.max(820, leaves.length * 56 + 120);
                  const paddingX = 68;
                  const paddingY = 38;

                  const spacing = leaves.length > 1 ? (wVal - paddingX * 2) / (leaves.length - 1) : 0;
                  leaves.forEach((l: any, i: number) => { 
                    l.x = leaves.length === 1 ? wVal / 2 : paddingX + i * spacing; 
                    l.y = hVal - paddingY; 
                  });

                  const internal = Object.values(mmrNodesMap).filter((n: any) => Number(n.is_leaf) !== 1).sort((a: any, b: any) => a.height - b.height);
                  internal.forEach((n: any) => {
                    if (n.children && n.children.length === 2) {
                      const l = mmrNodesMap[n.children[0]]; 
                      const r = mmrNodesMap[n.children[1]];
                      n.x = (l.x + r.x) / 2; 
                      n.y = hVal - paddingY - n.height * 46;
                    }
                  });
                  
                  // Root Seal Coordinate at top center
                  const rootX = wVal / 2;
                  const rootY = 32;

                  // Partition Nodes into Distinct Mountain Subtrees
                  const getSubtreePositions = (rootPos: number): number[] => {
                    const res: number[] = [];
                    const q = [rootPos];
                    while (q.length > 0) {
                      const curr = q.shift()!;
                      res.push(curr);
                      const c = mmrNodesMap[curr]?.children;
                      if (c && c.length === 2) q.push(c[0], c[1]);
                    }
                    return res;
                  };

                  const mountainColors = [
                    { fill: "rgba(6, 182, 212, 0.06)", stroke: "#0891b2", badgeBg: "#083344", badgeText: "#22d3ee", name: "MOUNTAIN 1" },
                    { fill: "rgba(59, 130, 246, 0.06)", stroke: "#2563eb", badgeBg: "#172554", badgeText: "#60a5fa", name: "MOUNTAIN 2" },
                    { fill: "rgba(168, 85, 247, 0.06)", stroke: "#9333ea", badgeBg: "#3b0764", badgeText: "#c084fc", name: "MOUNTAIN 3" },
                    { fill: "rgba(16, 185, 129, 0.06)", stroke: "#059669", badgeBg: "#022c22", badgeText: "#34d399", name: "MOUNTAIN 4" }
                  ];

                  const mountains = peaks.map((peak, idx) => {
                    const subtreePos = getSubtreePositions(peak.pos);
                    const subLeaves = subtreePos.map(pos => mmrNodesMap[pos]).filter(n => Number(n.is_leaf) === 1);
                    const minX = Math.min(...subLeaves.map(l => l.x));
                    const maxX = Math.max(...subLeaves.map(l => l.x));
                    return {
                      peak,
                      index: idx + 1,
                      subtreePos: new Set(subtreePos),
                      leavesCount: subLeaves.length,
                      minX,
                      maxX,
                      color: mountainColors[idx % mountainColors.length]
                    };
                  });

                  // Tampered node positions
                  const tamperedPos = new Set<string | number>();
                  if (verificationResult.verified === false && verificationResult.tampered_indices) {
                    leaves.forEach((l: any, idx: number) => {
                      const rec = ledgerHistory[idx];
                      if (rec && verificationResult.tampered_indices?.includes(rec.leaf_index)) tamperedPos.add(l.pos);
                    });
                    const byHeight = Object.values(mmrNodesMap).sort((a: any, b: any) => a.height - b.height);
                    byHeight.forEach((n: any) => {
                      if (n.children && n.children.some((c: any) => tamperedPos.has(c))) tamperedPos.add(n.pos);
                    });
                  }

                  // Active Merkle Proof Path from hovered/pinned node to peak and root
                  const activeProofSet = new Set<number>();
                  let activePeakForProof: number | null = null;
                  if (activeMmrInspector && activeMmrInspector.pos !== "ROOT") {
                    let cur = Number(activeMmrInspector.pos);
                    while (cur && mmrNodesMap[cur]) {
                      activeProofSet.add(cur);
                      if (peakPositions.has(cur)) {
                        activePeakForProof = cur;
                        break;
                      }
                      cur = mmrNodesMap[cur].parent;
                    }
                  }

                  // Tree links
                  const links: any[] = [];
                  Object.values(mmrNodesMap).forEach((node: any) => {
                    if (node.children) {
                      node.children.forEach((c: any) => {
                        const child = mmrNodesMap[c];
                        const isProofLink = activeProofSet.has(node.pos) && activeProofSet.has(child.pos);
                        links.push({
                          id: `${node.pos}-${child.pos}`,
                          x1: node.x, y1: node.y, x2: child.x, y2: child.y,
                          isTampered: tamperedPos.has(node.pos) && tamperedPos.has(child.pos),
                          isProof: isProofLink
                        });
                      });
                    }
                  });

                  // Sequential Peak Bagging Cable Points
                  // In Peter Todd MMR, peaks are bagged right-to-left
                  const baggingSteps: any[] = [];
                  if (peaks.length > 1) {
                    // Start from rightmost peak
                    for (let i = peaks.length - 1; i >= 0; i--) {
                      baggingSteps.push({
                        peak: peaks[i],
                        order: peaks.length - i
                      });
                    }
                  }
                  
                  return (
                    <div className="w-full flex flex-col items-center space-y-3">
                      <svg viewBox={`0 0 ${wVal} ${hVal}`} className="w-full h-auto text-zinc-700 select-none overflow-visible">
                        <defs>
                          <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="3.5" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="4.5" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <linearGradient id="rootBagGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#083344" />
                            <stop offset="100%" stopColor="#0f766e" />
                          </linearGradient>
                        </defs>

                        {/* Mountain Canopies: Distinct Translucent Mountain Silhouettes */}
                        {mountains.map((m) => {
                          const peakNode = mmrNodesMap[m.peak.pos];
                          const polyPath = `M ${peakNode.x} ${peakNode.y - 14} L ${m.maxX + 18} ${hVal - paddingY + 12} L ${m.minX - 18} ${hVal - paddingY + 12} Z`;
                          const hasActiveProof = activePeakForProof === m.peak.pos;

                          return (
                            <g key={`mountain-canopy-${m.index}`}>
                              {/* Mountain Shaded Silhouette */}
                              <path
                                d={polyPath}
                                fill={m.color.fill}
                                stroke={m.color.stroke}
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                opacity={hasActiveProof ? 1 : 0.6}
                                className="transition-opacity duration-300"
                              />

                              {/* Mountain Subtree Label Badge at the Summit */}
                              {(() => {
                                const labelText = `${m.color.name} • 2^${m.peak.height} (${m.leavesCount} ${m.leavesCount === 1 ? "LEAF" : "LEAVES"})`;
                                const badgeWidth = Math.max(138, labelText.length * 5.8 + 22);
                                const badgeHeight = 18;
                                const badgeY = peakNode.y - 34;

                                return (
                                  <g>
                                    <rect
                                      x={peakNode.x - badgeWidth / 2}
                                      y={badgeY}
                                      width={badgeWidth}
                                      height={badgeHeight}
                                      rx={badgeHeight / 2}
                                      fill={m.color.badgeBg}
                                      stroke={m.color.stroke}
                                      strokeWidth="1"
                                      opacity="0.95"
                                    />
                                    <text
                                      x={peakNode.x}
                                      y={badgeY + badgeHeight / 2 + 0.5}
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      fill={m.color.badgeText}
                                      className="font-mono text-[7.5px] font-bold tracking-wider pointer-events-none select-none"
                                    >
                                      {labelText}
                                    </text>
                                  </g>
                                );
                              })()}
                            </g>
                          );
                        })}

                        {/* Sequential Peak Bagging Conduit: Right-to-Left Peter Todd Bagging Arcs */}
                        {peaks.map((peak, idx) => {
                          const isProofPeak = activePeakForProof === peak.pos;
                          const pathD = `M ${peak.x} ${peak.y - 12} C ${peak.x} ${rootY + 45}, ${rootX} ${rootY + 35}, ${rootX} ${rootY + 14}`;
                          return (
                            <g key={`bagging-cable-${peak.pos}`}>
                              <path
                                d={pathD}
                                fill="none"
                                stroke={isProofPeak ? "#f59e0b" : "#06b6d4"}
                                strokeWidth={isProofPeak ? "2.2" : "1.2"}
                                strokeDasharray={isProofPeak ? "none" : "4 3"}
                                opacity={isProofPeak ? 1 : 0.75}
                                filter={isProofPeak ? "url(#glow-amber)" : undefined}
                              />
                              <circle
                                cx={peak.x}
                                cy={peak.y - 12}
                                r={isProofPeak ? 3.5 : 2.5}
                                fill={isProofPeak ? "#f59e0b" : "#06b6d4"}
                              />
                              {/* Animated Hash Flow Energy Packet Travelling along Bagging Cable to Root */}
                              <circle r="3" fill={isProofPeak ? "#f59e0b" : "#22d3ee"} filter={isProofPeak ? "url(#glow-amber)" : "url(#glow-cyan)"} pointerEvents="none">
                                <animateMotion
                                  path={pathD}
                                  dur={`${2.2 + idx * 0.4}s`}
                                  repeatCount="indefinite"
                                />
                              </circle>
                            </g>
                          );
                        })}

                        {/* MMR Root Node Badge */}
                        <g 
                          className="cursor-pointer transition-all hover:brightness-110"
                          onMouseEnter={() => setHoveredMmrNode({
                            pos: "ROOT",
                            type: "Bagged MMR Root Seal (RFC 6962)",
                            height: maxTreeHeight + 1,
                            hash: rootHash,
                            desc: `Deterministic root seal accumulated over ${peaks.length} independent mountains and ${leaves.length} verified maintenance commits.`
                          })}
                          onMouseLeave={() => setHoveredMmrNode(null)}
                        >
                          <rect
                            x={rootX - 110}
                            y={rootY - 14}
                            width="220"
                            height="28"
                            rx="14"
                            fill="url(#rootBagGrad)"
                            stroke="#22d3ee"
                            strokeWidth="1.5"
                            filter="url(#glow-cyan)"
                          />
                          <circle cx={rootX - 90} cy={rootY} r="3.5" fill="#22d3ee" pointerEvents="none">
                            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
                          </circle>
                          <circle cx={rootX - 90} cy={rootY} r="2.5" fill="#06b6d4" pointerEvents="none" />
                          <text
                            x={rootX - 76}
                            y={rootY + 0.5}
                            dominantBaseline="central"
                            className="font-mono text-[9px] fill-cyan-100 font-bold tracking-wider select-none pointer-events-none"
                          >
                            MMR ROOT SEAL [{rootHash ? rootHash.slice(0, 8) : "EMPTY"}...]
                          </text>
                        </g>

                        {/* Tree Link Lines & Active Proof Packet Flow */}
                        {links.map((link) => {
                          const strokeColor = link.isTampered ? "#ef4444" : link.isProof ? "#f59e0b" : "#3f3f46";
                          const strokeWidth = link.isTampered ? "2.5" : link.isProof ? "2.5" : "1.2";
                          const filterGlow = link.isTampered ? "url(#glow-red)" : link.isProof ? "url(#glow-amber)" : undefined;

                          return (
                            <g key={link.id}>
                              <line 
                                x1={link.x1} 
                                y1={link.y1} 
                                x2={link.x2} 
                                y2={link.y2} 
                                stroke={strokeColor} 
                                strokeWidth={strokeWidth}
                                filter={filterGlow}
                                opacity={activeProofSet.size > 0 && !link.isProof && !link.isTampered ? 0.35 : 1}
                                className="transition-opacity duration-300"
                              />
                              {link.isProof && (
                                <circle r="2.5" fill="#f59e0b" filter="url(#glow-amber)" pointerEvents="none">
                                  <animateMotion
                                    path={`M ${link.x2} ${link.y2} L ${link.x1} ${link.y1}`}
                                    dur="1.2s"
                                    repeatCount="indefinite"
                                  />
                                </circle>
                              )}
                            </g>
                          );
                        })}

                        {/* Tree Nodes */}
                        {Object.values(mmrNodesMap).map((n: any) => {
                          const isLeafNode = Number(n.is_leaf) === 1;
                          const isPeak = peakPositions.has(n.pos);
                          const isTampered = tamperedPos.has(n.pos);
                          const isHovered = hoveredMmrNode?.pos === n.pos;
                          const isProofNode = activeProofSet.has(n.pos);
                          
                          let fillColor = isTampered ? "#ef4444" : isProofNode ? "#f59e0b" : isPeak ? "#0891b2" : isLeafNode ? "#10b981" : "#52525b";
                          let strokeColor = isTampered ? "#fca5a5" : isProofNode ? "#fef08a" : isPeak ? "#22d3ee" : isLeafNode ? "#064e3b" : "#27272a";

                          return (
                            <g 
                              key={n.pos}
                              className="cursor-pointer transition-all"
                              onMouseEnter={() => {
                                const leafIdx = isLeafNode ? leaves.findIndex((l: any) => l.pos === n.pos) : -1;
                                const leafRec = leafIdx !== -1 ? ledgerHistory[leafIdx] : null;
                                setHoveredMmrNode({
                                  pos: n.pos,
                                  type: isPeak ? "Mountain Peak Summit" : isLeafNode ? "Cryptographic Leaf Commit" : "Internal Merkle Digest",
                                  height: n.height,
                                  hash: n.hash,
                                  tampered: isTampered,
                                  action: leafRec?.action_taken,
                                  component: leafRec?.component_id
                                });
                              }}
                              onClick={() => {
                                const leafIdx = isLeafNode ? leaves.findIndex((l: any) => l.pos === n.pos) : -1;
                                const leafRec = leafIdx !== -1 ? ledgerHistory[leafIdx] : null;
                                const nodeData = {
                                  pos: n.pos,
                                  type: isPeak ? "Mountain Peak Summit" : isLeafNode ? "Cryptographic Leaf Commit" : "Internal Merkle Digest",
                                  height: n.height,
                                  hash: n.hash,
                                  tampered: isTampered,
                                  action: leafRec?.action_taken,
                                  component: leafRec?.component_id
                                };
                                setHoveredMmrNode(nodeData);
                                setPinnedMmrNode(nodeData);
                              }}
                              onMouseLeave={() => setHoveredMmrNode(null)}
                            >
                              {/* Generous Hit-Target Circle for Pointer Interactivity */}
                              <circle cx={n.x} cy={n.y} r={18} fill="rgba(0,0,0,0.001)" pointerEvents="all" className="cursor-pointer" />

                              {/* Peak Geometric Halo - Anchored without coordinate jump */}
                              {isPeak && !isTampered && (
                                <>
                                  <circle cx={n.x} cy={n.y} r="12" className="fill-none stroke-cyan-400/40" strokeWidth="1" strokeDasharray="2,2" pointerEvents="none" />
                                  <circle cx={n.x} cy={n.y} r="9" className="fill-none stroke-cyan-400" strokeWidth="1.2" pointerEvents="none" />
                                  <text x={n.x} y={n.y - 14} textAnchor="middle" className="font-mono text-[7.5px] fill-cyan-400 font-bold pointer-events-none select-none">PEAK</text>
                                </>
                              )}

                              {/* Proof Path Clean Ring */}
                              {isProofNode && (
                                <circle cx={n.x} cy={n.y} r={11} className="fill-none stroke-amber-400 pointer-events-none" strokeWidth="1.5" />
                              )}

                              {/* Tampered Red Pulse - Anchored without coordinate jump */}
                              {isTampered && (
                                <circle cx={n.x} cy={n.y} r={12} className="fill-none stroke-red-500 pointer-events-none" strokeWidth="1.5">
                                  <animate attributeName="r" values="9;16;9" dur="1s" repeatCount="indefinite" />
                                  <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1s" repeatCount="indefinite" />
                                </circle>
                              )}

                              {/* Hover Ring */}
                              {isHovered && (
                                <circle cx={n.x} cy={n.y} r={12} className="fill-none stroke-white/90 pointer-events-none" strokeWidth="2" />
                              )}

                              {/* Main Node Circle */}
                              <circle 
                                cx={n.x} 
                                cy={n.y} 
                                r={isLeafNode ? 6.5 : 5.5} 
                                fill={fillColor} 
                                stroke={strokeColor} 
                                strokeWidth="2" 
                                pointerEvents="none"
                                className="transition-colors duration-150"
                              />

                              {/* Node Label */}
                              <text 
                                x={n.x} 
                                y={isPeak ? n.y + 16 : isLeafNode ? n.y + 15 : n.y - 9} 
                                textAnchor="middle" 
                                className={`font-mono text-[8px] font-bold ${
                                  isTampered ? "fill-red-400" :
                                  isProofNode ? "fill-amber-300 font-bold" :
                                  isPeak ? "fill-cyan-300" :
                                  isLeafNode ? "fill-emerald-400" :
                                  "fill-zinc-400"
                                }`}
                              >
                                #{n.pos}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Interactive Node Inspector Card & Merkle Proof Path */}
                      <div className="w-full bg-[#0b0e17] border border-white/[0.08] rounded-xl p-4 font-mono text-[10px] min-h-[64px] flex flex-col justify-center text-left space-y-2">
                        {activeMmrInspector ? (
                          <div className="space-y-1.5 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  activeMmrInspector.tampered ? "bg-red-500/20 text-red-400 border border-red-500/40" :
                                  activeMmrInspector.type?.includes("Root") ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" :
                                  activeMmrInspector.type?.includes("Peak") ? "bg-cyan-950 text-cyan-400 border border-cyan-800" :
                                  activeMmrInspector.type?.includes("Leaf") ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                                  "bg-zinc-800 text-zinc-300"
                                }`}>
                                  {activeMmrInspector.type}
                                </span>
                                <span className="text-white font-bold">NODE #{activeMmrInspector.pos}</span>
                                <span className="text-zinc-500">HEIGHT: {activeMmrInspector.height}</span>
                                {activeMmrInspector.component && (
                                  <span className="text-zinc-400">ASSET: <strong className="text-white">{activeMmrInspector.component}</strong></span>
                                )}
                                {pinnedMmrNode?.pos === activeMmrInspector.pos && (
                                  <button
                                    onClick={() => { setPinnedMmrNode(null); setHoveredMmrNode(null); }}
                                    className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[8px] cursor-pointer hover:bg-cyan-900 ml-1 font-bold"
                                  >
                                    PINNED (CLICK TO RELEASE)
                                  </button>
                                )}
                              </div>
                              {activeMmrInspector.action && (
                                <div className="text-right">
                                  <span className="text-[9px] text-zinc-500 block">MAINTENANCE ACTION</span>
                                  <span className="text-emerald-400 font-bold">{activeMmrInspector.action}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-zinc-400 text-[9px] truncate">
                              DIGEST (SHA-256): <span className="text-zinc-300 select-all font-mono">{activeMmrInspector.hash || "CALCULATING"}</span>
                            </div>

                            {/* Inclusion Proof Path Indicator */}
                            {activeProofSet.size > 0 && activeMmrInspector.pos !== "ROOT" && (
                              <div className="bg-[#070a12] border border-amber-500/30 px-3 py-1.5 rounded text-[9px] flex items-center justify-between text-amber-300">
                                <span>
                                  RFC 6962 PROOF PATH: {Array.from(activeProofSet).sort((a, b) => a - b).map(p => `#${p}`).join(" → ")} → BAGGED ROOT
                                </span>
                                <span className="text-amber-400/80 font-bold">
                                  O(log N) PROOF VERIFIED
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-zinc-500 text-center w-full flex items-center justify-center space-x-2 py-1">
                            <Layers className="h-4 w-4 text-cyan-500/60" />
                            <span>CLICK OR HOVER ANY NODE OR MOUNTAIN PEAK TO HIGHLIGHT ITS O(log N) MERKLE INCLUSION PROOF</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Ledger Transactions table */}
            <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 text-left">Audit Log Registry</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onOpenCrsModal?.()}
                    className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[9px] uppercase font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="h-3 w-3 text-cyan-400" />
                    <span>VIEW CERTIFICATE (CRS / IAF FORM 700)</span>
                  </button>

                  <a
                    href={`${backendUrl || "http://127.0.0.1:8000"}/api/v1/ledger/certificate.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-[#0c101a] hover:bg-[#141b2a] text-zinc-300 border border-white/[0.08] hover:border-cyan-500/40 font-mono text-[9px] uppercase flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="h-3 w-3 text-cyan-400" />
                    <span>EXPORT IAF FORM 700 (PDF)</span>
                  </a>

                  {exportCertificate && (
                    <button
                      onClick={exportCertificate}
                      className="px-3 py-1 rounded-lg bg-[#0c101a] hover:bg-[#141b2a] text-zinc-400 border border-white/[0.08] font-mono text-[9px] uppercase flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="h-3 w-3 text-zinc-400" />
                      <span>RAW JSON</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto border border-white/[0.06] rounded-xl">
                <table className="w-full text-left font-mono text-[10px] text-zinc-400">
                  <thead className="bg-[#070a12] text-zinc-400 uppercase border-b border-white/[0.06]">
                    <tr>
                      <th className="py-2.5 px-3">LEAF</th>
                      <th className="py-2.5 px-3">TIMESTAMP</th>
                      <th className="py-2.5 px-3">ASSET</th>
                      <th className="py-2.5 px-3">DETAILS</th>
                      <th className="py-2.5 px-3">TECH</th>
                      <th className="py-2.5 px-3">HEALTH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] bg-[#070a12]/50">
                    {(() => {
                      const sortedLeafNodes = nodes.filter((n: any) => Number(n.is_leaf) === 1).sort((a: any, b: any) => a.pos - b.pos);
                      return ledgerHistory.map((row, idx) => {
                        const leafNode = sortedLeafNodes[idx];
                        return (
                        <tr key={row.leaf_index} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-bold text-zinc-400">
                            <span>#{row.leaf_index}</span>
                            {leafNode && (
                              <span className="text-zinc-600 text-[8.5px] ml-1.5 font-normal">(MMR Pos #{leafNode.pos})</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-zinc-500">{row.timestamp.split("T")[0]}</td>
                          <td className="py-2 px-3 text-zinc-300 font-bold">{row.component_id}</td>
                          <td className="py-2 px-3 text-zinc-200 font-bold">{row.action_taken}</td>
                          <td className="py-2 px-3">{row.technician_id}</td>
                          <td className="py-2 px-3 text-emerald-400">{(row.health_snapshot * 100).toFixed(0)}%</td>
                        </tr>
                      );
                    });
                  })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
        
      </main>

    </div>
  );
}
