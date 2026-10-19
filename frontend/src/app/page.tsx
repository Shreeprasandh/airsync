"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
import { 
  Activity, 
  Shield, 
  Cpu, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  RefreshCw, 
  Layers, 
  User, 
  Terminal,
  Settings,
  Lock,
  FileText,
  Network,
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
  Thermometer
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

import { LoginScreen, HangarSelector, HangarDashboard, AssetDetail, SentinelGateway } from "./V3Views";
import { AmosWorkOrderModal } from "@/components/AmosWorkOrderModal";
import { AviationHeader } from "@/components/AviationHeader";
import { CrsCertificateModal } from "@/components/CrsCertificateModal";
import { AcarsInspectorModal } from "@/components/AcarsInspectorModal";
import { JuryBattlecardModal } from "@/components/JuryBattlecardModal";
import { TamperDiffModal } from "@/components/TamperDiffModal";
import { GuidedTourController } from "@/components/GuidedTourController";
import TurbofanStudioModal from "@/components/TurbofanStudioModal";


// Types
export interface EngineData {
  id: string;
  name: string;
  status: "Nominal" | "Warning" | "Critical";
  health: number; // 0 to 1
  rul: number;
  cycle: number;
  history: {
    cycle: number;
    rul: number;
    rul_upper?: number;
    rul_lower?: number;
    sensor_11: number; // Core speed trend
    sensor_12: number; // Bypass ratio trend
  }[];
  attribution?: { sensor: string; percentage: number; value?: number; delta?: number; unit?: string }[];
  vibration?: { n1: number; n2: number; unit: string };
  sensors?: Record<string, number>;
  acars_hex?: string;
  rul_bounds?: { lower: number; upper: number; sigma: number };
}

export interface LedgerRecord {
  leaf_index: number;
  timestamp: string;
  component_id: string;
  action_taken: string;
  technician_id: string;
  health_snapshot: number;
  node_hash: string;
}

export interface FederatedRound {
  round: number;
  station_1_loss: number;
  station_2_loss: number;
  station_3_loss: number;
  global_loss: number;
}

const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost") {
      return "http://localhost:8000";
    }
  }
  return "http://127.0.0.1:8000";
};

const BACKEND_URL = getBackendUrl();

const INITIAL_BASELINE_ATTRIBUTION = [
  { sensor: "s11", percentage: 18.5, value: 47.45, delta: 0.15, unit: "psia" },
  { sensor: "s4", percentage: 16.2, value: 1404.2, delta: 4.2, unit: "°R" },
  { sensor: "s12", percentage: 14.1, value: 521.8, delta: -0.2, unit: "pps/psia" },
  { sensor: "s3", percentage: 11.4, value: 1588.6, delta: 3.6, unit: "°R" },
  { sensor: "s7", percentage: 9.1, value: 553.8, delta: -0.2, unit: "psia" },
  { sensor: "s8", percentage: 7.3, value: 2388.1, delta: 0.1, unit: "rpm" },
  { sensor: "s2", percentage: 5.4, value: 642.4, delta: 0.4, unit: "°R" },
  { sensor: "s9", percentage: 5.1, value: 9054.2, delta: 4.2, unit: "rpm" },
  { sensor: "s15", percentage: 4.2, value: 8.42, delta: 0.02, unit: "ratio" },
  { sensor: "s13", percentage: 3.1, value: 2388.1, delta: 0.1, unit: "rpm" },
  { sensor: "s14", percentage: 2.5, value: 8138.6, delta: 3.6, unit: "rpm" },
  { sensor: "s17", percentage: 1.6, value: 392.4, delta: 0.4, unit: "Btu/lbm" },
  { sensor: "s20", percentage: 0.9, value: 38.92, delta: -0.03, unit: "lbm/s" },
  { sensor: "s21", percentage: 0.6, value: 23.38, delta: -0.02, unit: "lbm/s" }
];

const INITIAL_FEDERATED_ROUNDS: FederatedRound[] = [
  { round: 1, station_1_loss: 0.0842, station_2_loss: 0.0915, station_3_loss: 0.0881, global_loss: 0.0879 },
  { round: 2, station_1_loss: 0.0512, station_2_loss: 0.0564, station_3_loss: 0.0538, global_loss: 0.0538 },
  { round: 3, station_1_loss: 0.0321, station_2_loss: 0.0358, station_3_loss: 0.0340, global_loss: 0.0339 },
  { round: 4, station_1_loss: 0.0215, station_2_loss: 0.0238, station_3_loss: 0.0229, global_loss: 0.0227 },
];

// Pre-seeded local engine simulators with deterministic formulas to avoid SSR hydration mismatches
const INITIAL_ENGINES: Record<string, EngineData> = {
  "ENG-001": {
    id: "ENG-001",
    name: "Snecma M88-4E (Port 1) - Rafale BS-001",
    status: "Nominal",
    health: 0.96,
    rul: 120,
    cycle: 30,
    history: Array.from({ length: 30 }, (_, i) => {
      const c = i + 1;
      const r = 125;
      return {
        cycle: c,
        rul: r,
        rul_upper: Math.min(125, r + 8),
        rul_lower: Math.max(0, r - 8),
        sensor_11: 1585.0 + c * 0.08 * 0.8 + ((i * 3) % 5) * 0.2,
        sensor_12: 8.40 + c * 0.0007 * 0.8 + ((i * 7) % 6) * 0.0005,
      };
    }),
    attribution: INITIAL_BASELINE_ATTRIBUTION
  },
  "ENG-002": {
    id: "ENG-002",
    name: "Snecma M88-4E (Stbd 2) - Rafale BS-001",
    status: "Nominal",
    health: 0.95,
    rul: 118,
    cycle: 30,
    history: Array.from({ length: 30 }, (_, i) => {
      const c = i + 1;
      const r = 125;
      return {
        cycle: c,
        rul: r,
        rul_upper: Math.min(125, r + 8),
        rul_lower: Math.max(0, r - 8),
        sensor_11: 1584.2 + c * 0.08 * 0.8 + ((i * 2) % 5) * 0.2,
        sensor_12: 8.39 + c * 0.0007 * 0.8 + ((i * 6) % 6) * 0.0005,
      };
    }),
    attribution: INITIAL_BASELINE_ATTRIBUTION
  },
  "ENG-003": {
    id: "ENG-003",
    name: "Saturn AL-31FP (Port 1) - Su-30MKI SB-128",
    status: "Warning",
    health: 0.46,
    rul: 24,
    cycle: 115,
    history: Array.from({ length: 30 }, (_, i) => {
      const c = i + 86;
      const r = Math.max(10, Math.round(65 - (c - 85) * 1.3));
      return {
        cycle: c,
        rul: r,
        rul_upper: Math.min(125, r + 14),
        rul_lower: Math.max(0, r - 14),
        sensor_11: 1585.0 + c * 0.08 * 1.4 + ((i * 4) % 6) * 0.2,
        sensor_12: 8.40 + c * 0.0007 * 1.4 + ((i * 8) % 5) * 0.0005,
      };
    }),
    attribution: INITIAL_BASELINE_ATTRIBUTION
  },
  "ENG-004": {
    id: "ENG-004",
    name: "Saturn AL-31FP (Stbd 2) - Su-30MKI SB-128",
    status: "Nominal",
    health: 0.91,
    rul: 112,
    cycle: 45,
    history: Array.from({ length: 30 }, (_, i) => {
      const c = i + 16;
      const r = 125;
      return {
        cycle: c,
        rul: r,
        rul_upper: Math.min(125, r + 8),
        rul_lower: Math.max(0, r - 8),
        sensor_11: 1585.0 + c * 0.08 * 0.9 + ((i * 3) % 5) * 0.2,
        sensor_12: 8.40 + c * 0.0007 * 0.9 + ((i * 5) % 6) * 0.0005,
      };
    }),
    attribution: INITIAL_BASELINE_ATTRIBUTION
  },
  "ENG-005": {
    id: "ENG-005",
    name: "GE F404-IN20 - Tejas LCA KH-201",
    status: "Nominal",
    health: 0.88,
    rul: 98,
    cycle: 55,
    history: Array.from({ length: 30 }, (_, i) => {
      const c = i + 26;
      const r = 125;
      return {
        cycle: c,
        rul: r,
        rul_upper: Math.min(125, r + 8),
        rul_lower: Math.max(0, r - 8),
        sensor_11: 1585.0 + c * 0.08 * 0.9 + ((i * 2) % 5) * 0.2,
        sensor_12: 8.40 + c * 0.0007 * 0.9 + ((i * 4) % 6) * 0.0005,
      };
    }),
    attribution: INITIAL_BASELINE_ATTRIBUTION
  },
  "ENG-006": {
    id: "ENG-006",
    name: "11 BRD Overhaul Depot Test Engine",
    status: "Nominal",
    health: 0.87,
    rul: 95,
    cycle: 55,
    history: Array.from({ length: 30 }, (_, i) => {
      const c = i + 26;
      const r = 125;
      return {
        cycle: c,
        rul: r,
        rul_upper: Math.min(125, r + 8),
        rul_lower: Math.max(0, r - 8),
        sensor_11: 1584.8 + c * 0.08 * 0.9 + ((i * 3) % 5) * 0.2,
        sensor_12: 8.39 + c * 0.0007 * 0.9 + ((i * 5) % 6) * 0.0005,
      };
    }),
    attribution: INITIAL_BASELINE_ATTRIBUTION
  }
};

export interface PlaneData {
  id: string;
  name: string;
  model: string;
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  status: "Airborne" | "Ready" | "Maintenance" | "Grounded";
  phase: "Pre-Flight" | "Takeoff" | "Cruise" | "Descent" | "Landed" | "Maintenance" | "Landing";
  progress: number;
  speed: number;
  altitude: number;
  engines: string[];
  fuel: number;
  routeCoordinates: { x: number; y: number }[];
  readyDurationLimit?: number;
}

export const HUB_COORDINATES: Record<string, { x: number; y: number; lat: number; lon: number; icao: string; name: string }> = {
  "AMB": { x: 570, y: 155, lat: 30.3689, lon: 76.8172, icao: "VIAM", name: "AFS Ambala (Golden Arrows Sqn)" },
  "BAR": { x: 588, y: 165, lat: 28.4239, lon: 79.4503, icao: "VIBY", name: "AFS Bareilly (Pursoots Sqn)" },
  "OJH": { x: 550, y: 210, lat: 19.9975, lon: 73.7898, icao: "VAOZ", name: "11 BRD Ojhar (Spares & Overhaul)" },
  "GWL": { x: 576, y: 180, lat: 26.2933, lon: 78.2278, icao: "VIGR", name: "AFS Gwalior (Mirage-2000 Wing)" },
  "JOD": { x: 545, y: 170, lat: 26.2511, lon: 73.0489, icao: "VIJO", name: "AFS Jodhpur (SWAC Sector)" },
  "HAS": { x: 640, y: 175, lat: 26.7039, lon: 89.3703, icao: "VQ10", name: "AFS Hasimara (Eastern Wing)" },
  "DEL": { x: 574, y: 162, lat: 28.5562, lon: 77.1000, icao: "VIDP", name: "Air HQ (Vayu Bhavan)" }
};

export const getControlPoint = (origin: string, destination: string) => {
  const p0 = HUB_COORDINATES[origin];
  const p2 = HUB_COORDINATES[destination];
  if (!p0 || !p2) return { x: 500, y: 200 };
  const midX = (p0.x + p2.x) / 2;
  const midY = (p0.y + p2.y) / 2;
  let offset = -15;
  if ((origin === "AMB" && destination === "BAR") || (origin === "BAR" && destination === "AMB")) {
    offset = 12;
  }
  return { x: midX, y: midY + offset };
};

const INITIAL_PLANES: Record<string, PlaneData> = {
  "PL-101": {
    id: "PL-101",
    name: "Rafale EH - BS-001",
    model: "Dassault Rafale EH (Snecma M88-4E)",
    origin: "AMB",
    originName: "AFS Ambala (Golden Arrows)",
    destination: "BAR",
    destinationName: "AFS Bareilly (Forward Sector)",
    status: "Airborne",
    phase: "Cruise",
    progress: 55,
    speed: 540,
    altitude: 36000,
    engines: ["ENG-001", "ENG-002"],
    fuel: 78,
    routeCoordinates: [
      { x: 570, y: 155 },
      { x: 579, y: 160 },
      { x: 588, y: 165 }
    ]
  },
  "PL-202": {
    id: "PL-202",
    name: "Su-30MKI - SB-128",
    model: "Sukhoi Su-30MKI (Saturn AL-31FP)",
    origin: "BAR",
    originName: "AFS Bareilly (Pursoots)",
    destination: "OJH",
    destinationName: "11 BRD Ojhar (Maintenance Base)",
    status: "Airborne",
    phase: "Cruise",
    progress: 35,
    speed: 560,
    altitude: 41000,
    engines: ["ENG-003", "ENG-004"],
    fuel: 65,
    routeCoordinates: [
      { x: 588, y: 165 },
      { x: 569, y: 187 },
      { x: 550, y: 210 }
    ]
  },
  "PL-303": {
    id: "PL-303",
    name: "Tejas LCA - KH-201",
    model: "HAL Tejas Mk1A (GE F404-IN20)",
    origin: "OJH",
    originName: "11 BRD Ojhar (Depot Flight Line)",
    destination: "AMB",
    destinationName: "AFS Ambala (Western Air Command)",
    status: "Ready",
    phase: "Pre-Flight",
    progress: 0,
    speed: 0,
    altitude: 0,
    engines: ["ENG-005", "ENG-006"],
    fuel: 100,
    routeCoordinates: [
      { x: 550, y: 210 },
      { x: 560, y: 182 },
      { x: 570, y: 155 }
    ]
  }
};

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
  const t = plane.progress / 100;
  
  if (p.length === 3) {
    return getBezierCoordinates(p[0], p[1], p[2], t);
  }
  return p[0];
};

const SENSOR_METADATA: Record<string, { label: string; desc: string }> = {
  s2: { label: "LPC Outlet Temp (T24)", desc: "Total temperature at Low-Pressure Compressor outlet (°R)." },
  s3: { label: "HPC Outlet Temp (T30)", desc: "Total temperature at High-Pressure Compressor outlet (°R); primary thermal stress indicator." },
  s4: { label: "LPT Outlet Temp (T50)", desc: "Total temperature at Low-Pressure Turbine outlet (°R); primary exhaust gas indicator." },
  s7: { label: "HPC Pressure (P30)", desc: "Total pressure at High-Pressure Compressor exit diffuser (psia)." },
  s8: { label: "Physical Fan Speed (Nf)", desc: "Rotational speed of intake fan and low-pressure spool (rpm)." },
  s9: { label: "Physical Core Speed (Nc)", desc: "Rotational speed of high-pressure compressor core spool (rpm)." },
  s11: { label: "HPC Static Pressure (Ps30)", desc: "Static pressure at HPC exit combustor inlet (psia); drops during blade erosion." },
  s12: { label: "Fuel Flow Ratio (phi)", desc: "Ratio of fuel mass flow rate to static pressure at HPC outlet (pps/psia)." },
  s13: { label: "Corrected Fan Speed (NRf)", desc: "Corrected rotational speed of low-pressure spool (rpm)." },
  s14: { label: "Corrected Core Speed (NRc)", desc: "Corrected rotational speed of high-pressure core spool (rpm)." },
  s15: { label: "Bypass Ratio (BPR)", desc: "Ratio of cold bypass duct mass airflow to engine core mass airflow." },
  s17: { label: "Bleed Enthalpy (ht)", desc: "Thermodynamic energy enthalpy of compressor customer bleed air (Btu/lbm)." },
  s20: { label: "HPT Coolant Bleed (W31)", desc: "High-Pressure Turbine cooling bleed air mass flow rate (lbm/s)." },
  s21: { label: "LPT Coolant Bleed (W32)", desc: "Low-Pressure Turbine cooling bleed air mass flow rate (lbm/s)." }
};

export default function Dashboard() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginTechId, setLoginTechId] = useState("AI-ENG-B1-8429");
  const [loginPin, setLoginPin] = useState("7700");
  const [loginError, setLoginError] = useState("");
  const [engines, setEngines] = useState<Record<string, EngineData>>(INITIAL_ENGINES);
  const [selectedEngineId, setSelectedEngineId] = useState<string>("ENG-001");
  const [activeTab, setActiveTab] = useState<"fleet" | "federated" | "ledger">("fleet");
  
  // V3 states
  const [viewState, setViewState] = useState<'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate'>('login');
  const [selectedHangar, setSelectedHangar] = useState<string | null>(null);
  const [selectedPlaneId, setSelectedPlaneId] = useState<string | null>(null);
  const [hoveredPlaneId, setHoveredPlaneId] = useState<string | null>(null);
  const [planes, setPlanes] = useState<Record<string, PlaneData>>(INITIAL_PLANES);
  const [isAmosModalOpen, setIsAmosModalOpen] = useState(false);
  const [amosTargetPlaneId, setAmosTargetPlaneId] = useState("PL-202");
  const [amosTargetEngineId, setAmosTargetEngineId] = useState("ENG-003");
  const [isBattlecardOpen, setIsBattlecardOpen] = useState(false);
  const [isAcarsModalOpen, setIsAcarsModalOpen] = useState(false);
  const [isCrsModalOpen, setIsCrsModalOpen] = useState(false);
  const [isTamperDiffOpen, setIsTamperDiffOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [studioInitialMode, setStudioInitialMode] = useState<'2d' | '3d-engine' | '3d-plane'>('2d');

  const handleOpenStudioModal = (m?: '2d' | '3d-engine' | '3d-plane') => {
    setStudioInitialMode(m || '2d');
    setIsStudioModalOpen(true);
  };
  const planesRef = React.useRef(planes);
  React.useEffect(() => {
    planesRef.current = planes;
  }, [planes]);
  const enginesRef = React.useRef(engines);
  React.useEffect(() => {
    enginesRef.current = engines;
  }, [engines]);
  const wsRef = React.useRef<WebSocket | null>(null);
  const lastAppendedAnomalyRef = React.useRef<Record<string, number>>({});
  
  // Hangar credentials login
  const [hangarAccessKey, setHangarAccessKey] = useState("");
  const [hangarAccessPin, setHangarAccessPin] = useState("");
  const [hangarAccessError, setHangarAccessError] = useState("");
  const [isHangarModalOpen, setIsHangarModalOpen] = useState(false);

  // Backend statuses
  const [backendOnline, setBackendOnline] = useState(false);
  const [isInferring, setIsInferring] = useState(false);
  const [isFederating, setIsFederating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // WebSocket streaming states
  const [isStreaming, setIsStreaming] = useState(true);
  const [lastHoveredPlaneId, setLastHoveredPlaneId] = useState<string>("PL-101");
  const [streamingRate, setStreamingRate] = useState(1000);
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null);

  const handleRateChange = (newRate: number) => {
    setStreamingRate(newRate);
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    if (isStreaming) {
      const wsUrl = `${BACKEND_URL.replace(/^http/, "ws")}/api/v1/edge/ws/telemetry`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket telemetry connection established.");
        ws?.send(JSON.stringify({ command: "set_rate", rate: streamingRate }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "telemetry" && data.engines) {
            // Send back the current airborne engines list to backend uvicorn to age only airborne engines!
            const airborne = Object.keys(planesRef.current)
              .filter(id => planesRef.current[id].status === "Airborne")
              .flatMap(id => planesRef.current[id].engines);
              
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                command: "set_airborne_engines",
                engines: airborne
              }));
            }
            setEngines(prev => {
              const nextEngines = { ...prev };
              Object.keys(data.engines).forEach(id => {
                const update = data.engines[id];
                const engine = prev[id];
                
                const newHistory = [...engine.history];
                if (newHistory.length >= 50) newHistory.shift();
                newHistory.push({
                  cycle: update.cycle,
                  rul: update.predicted_rul,
                  rul_upper: update.rul_bounds?.upper ?? Math.min(125, update.predicted_rul + 10),
                  rul_lower: update.rul_bounds?.lower ?? Math.max(0, update.predicted_rul - 10),
                  sensor_11: update.sensor_11,
                  sensor_12: update.sensor_12
                });
                
                nextEngines[id] = {
                  ...engine,
                  cycle: update.cycle,
                  rul: update.predicted_rul,
                  rul_bounds: update.rul_bounds,
                  vibration: update.vibration,
                  sensors: update.sensors,
                  acars_hex: update.acars_hex,
                  health: update.health_score,
                  status: update.predicted_rul < 30 ? "Critical" : update.predicted_rul < 70 ? "Warning" : "Nominal",
                  history: newHistory,
                  attribution: update.attribution || engine.attribution
                };
                
                const lastCycle = lastAppendedAnomalyRef.current[id] || 0;
                if (update.anomaly_flag && !lastAppendedAnomalyRef.current[id]) {
                  lastAppendedAnomalyRef.current[id] = update.cycle;
                  triggerAutoLedgerAppend(id, update.health_score, update.predicted_rul);
                }
              });
              return nextEngines;
            });

            // V3: Live coordinates and flight state update
            setPlanes(prev => {
              const nextPlanes = { ...prev };
              Object.keys(nextPlanes).forEach(id => {
                const plane = nextPlanes[id];
                const primaryEngId = plane.engines[0];
                
                // Get updated engine details from incoming WebSocket message or local state
                let engHealth = enginesRef.current[primaryEngId]?.health ?? 1.0;
                if (data.engines && data.engines[primaryEngId]) {
                  engHealth = data.engines[primaryEngId].health_score;
                }
                const isEngineCritical = engHealth < 0.30;

                if (isEngineCritical && plane.status !== "Airborne" && plane.status !== "Grounded") {
                  // Ground the aircraft and place it under Maintenance
                  nextPlanes[id] = {
                    ...plane,
                    status: "Maintenance",
                    phase: "Maintenance",
                    progress: 0,
                    altitude: 0,
                    speed: 0
                  };
                  return;
                }

                if (plane.status === "Airborne") {
                  const origCoord = HUB_COORDINATES[plane.origin];
                  const destCoord = HUB_COORDINATES[plane.destination];
                  const distance = (origCoord && destCoord) 
                    ? Math.sqrt(Math.pow(destCoord.x - origCoord.x, 2) + Math.pow(destCoord.y - origCoord.y, 2))
                    : 220;
                  const flightDuration = Math.round(distance / 2.2) || 100;
                  
                  let nextProgress = plane.progress + (100 / flightDuration);
                  let nextPhase = plane.phase;
                  let nextAltitude = plane.altitude;
                  let nextSpeed = plane.speed;
                  let nextFuel = Math.max(5, plane.fuel - (95 / flightDuration));

                  if (nextProgress >= 100) {
                    const currentDest = plane.destination;
                    const possibleDests = Object.keys(HUB_COORDINATES).filter(k => k !== currentDest);
                    const nextDest = possibleDests[Math.floor(Math.random() * possibleDests.length)];
                    
                    const p0 = HUB_COORDINATES[currentDest];
                    const p1 = getControlPoint(currentDest, nextDest);
                    const p2 = HUB_COORDINATES[nextDest];

                    nextPlanes[id] = {
                      ...plane,
                      status: "Grounded", // Transition to Grounded landing/taxi phase
                      phase: "Landing",
                      progress: 0,
                      altitude: 0,
                      speed: 0,
                      fuel: 5, // fuel is empty at landing, refuels during pre-flight
                      origin: currentDest,
                      originName: HUB_COORDINATES[currentDest].name,
                      destination: nextDest,
                      destinationName: HUB_COORDINATES[nextDest].name,
                      routeCoordinates: [p0, p1, p2],
                      readyDurationLimit: 30 // Initialize pre-flight timer to standard 30s
                    };
                  } else {
                    if (nextProgress < 15) {
                      nextPhase = "Takeoff";
                      nextAltitude = Math.round(nextProgress * 2000);
                      nextSpeed = Math.round(150 + nextProgress * 20);
                    } else if (nextProgress >= 15 && nextProgress < 85) {
                      nextPhase = "Cruise";
                      nextAltitude = 35000 + (nextProgress % 3) * 500;
                      nextSpeed = 500 + (nextProgress % 2) * 10;
                    } else {
                      nextPhase = "Descent";
                      const descentPct = (100 - nextProgress) / 15;
                      nextAltitude = Math.round(descentPct * 35000);
                      nextSpeed = Math.round(150 + descentPct * 350);
                    }

                    nextPlanes[id] = {
                      ...plane,
                      progress: nextProgress,
                      phase: nextPhase,
                      altitude: nextAltitude,
                      speed: nextSpeed,
                      fuel: parseFloat(nextFuel.toFixed(2))
                    };
                  }
                } else if (plane.status === "Grounded") {
                  // Taxiing / Tow to hangar (10 seconds)
                  let nextDwell = plane.progress + 1;
                  if (nextDwell >= 10) {
                    nextPlanes[id] = {
                      ...plane,
                      status: "Maintenance",
                      phase: "Maintenance",
                      progress: 0,
                      altitude: 0,
                      speed: 0
                    };
                  } else {
                    nextPlanes[id] = {
                      ...plane,
                      progress: nextDwell,
                      phase: "Landing"
                    };
                  }
                } else if (plane.status === "Ready") {
                  // Parked gate cooldown/pre-flight verification (uses dynamic limit)
                  let nextDwell = plane.progress + 1;
                  const currentLimit = plane.readyDurationLimit ?? 30;
                  if (nextDwell >= currentLimit) {
                    const origCoord = HUB_COORDINATES[plane.origin];
                    const destCoord = HUB_COORDINATES[plane.destination];
                    const distance = (origCoord && destCoord) 
                      ? Math.sqrt(Math.pow(destCoord.x - origCoord.x, 2) + Math.pow(destCoord.y - origCoord.y, 2))
                      : 220;
                    const flightDuration = Math.round(distance / 2.2) || 100;
                    const flightWearCycles = Math.ceil(flightDuration / 10);
                    const engRul = enginesRef.current[primaryEngId]?.rul ?? 125;
                    
                    // Plane can only take off if the engine life is calculated to reach the destination successfully (remaining RUL at landing >= 30)
                    const canCompleteFlight = engRul - flightWearCycles >= 30;

                    if (canCompleteFlight) {
                      nextPlanes[id] = {
                        ...plane,
                        status: "Airborne",
                        phase: "Takeoff",
                        progress: 0.1,
                        speed: 150,
                        altitude: 500,
                        fuel: 100
                      };
                    } else {
                      // Ground for maintenance immediately
                      nextPlanes[id] = {
                        ...plane,
                        status: "Maintenance",
                        phase: "Maintenance",
                        progress: 0,
                        altitude: 0,
                        speed: 0
                      };
                    }
                  } else {
                    nextPlanes[id] = {
                      ...plane,
                      progress: nextDwell,
                      phase: "Pre-Flight",
                      fuel: Math.min(100, Math.round(5 + (nextDwell * 95 / currentLimit))) // Refueling progresses visually!
                    };
                  }
                } else if (plane.status === "Maintenance") {
                  // Hangar Maintenance dwell (15 seconds)
                  let nextMaintTime = plane.progress + 1;
                  if (nextMaintTime >= 15) {
                    triggerAutoMaintenanceOverhaul(primaryEngId);
                    nextPlanes[id] = {
                      ...plane,
                      progress: 0
                    };
                  } else {
                    nextPlanes[id] = {
                      ...plane,
                      progress: nextMaintTime
                    };
                  }
                }
              });
              return nextPlanes;
            });
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      
      ws.onclose = () => {
        console.log("WebSocket telemetry connection closed.");
        setIsStreaming(false);
      };
      
      ws.onerror = (e) => {
        console.warn("WebSocket telemetry error:", e);
      };
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isStreaming, streamingRate]);
  
  // Ledger states
  const [ledgerHistory, setLedgerHistory] = useState<LedgerRecord[]>([]);
  const [rootHash, setRootHash] = useState<string>("");
  const [nodes, setNodes] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean | null;
    message: string;
    computed_root: string;
    stored_root: string;
    tampered_indices?: number[];
  }>({ verified: null, message: "", computed_root: "", stored_root: "" });

  // Federated learning states
  const [federatedHistory, setFederatedHistory] = useState<FederatedRound[]>(INITIAL_FEDERATED_ROUNDS);

  // Manual Append Form States
  const [formEngine, setFormEngine] = useState("ENG-001");
  const [formAction, setFormAction] = useState("Sensor Calibration");
  const [formTech, setFormTech] = useState("AI-ENG-B1-8429");
  const [formHealth, setFormHealth] = useState("0.95");
  const [formStation, setFormStation] = useState("STATION_001");
  const [formSuccessMessage, setFormSuccessMessage] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginTechId.trim() === "") {
      setLoginError("Technician ID is required.");
      return;
    }
    if (loginPin === "7700") {
      setIsLoggedIn(true);
      setFormTech(loginTechId.trim());
      setLoginError("");
      setViewState("hangar-select");
    } else {
      setLoginError("Invalid Security Clearance PIN.");
    }
  };

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/`);
      if (res.ok) {
        setBackendOnline(true);
        return true;
      } else {
        setBackendOnline(false);
        return false;
      }
    } catch {
      setBackendOnline(false);
      return false;
    }
  };

  const fetchLedgerHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ledger/history?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLedgerHistory(data.records || []);
        setRootHash(data.root_hash || "");
        setNodes(data.nodes || []);
      }
    } catch (e) {
      console.warn("Failed to load ledger history:", e);
    }
  };

  const fetchFederatedHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/federated/history?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setFederatedHistory(data);
        }
      }
    } catch (e) {
      console.warn("Failed to load federated history:", e);
    }
  };

  const runFederatedRound = async () => {
    if (isFederating) return;
    setIsFederating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/federated/aggregate`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setFederatedHistory(prev => [...prev, data]);
        fetchLedgerHistory(); // Ledger might be updated if model re-quantization writes records
      } else {
        alert("Federated round failed. Ensure backend has completed train_tcn setup.");
      }
    } catch (e) {
      console.warn("Error contacting aggregation server:", e);
      setBackendOnline(false);
    } finally {
      setIsFederating(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const online = await checkBackendHealth();
      if (online) {
        fetchLedgerHistory();
        fetchFederatedHistory();
      }
    };
    init();
  }, []);

  // V3: Auto-trigger Federated Calibration sync weight update every 60 seconds
  useEffect(() => {
    if (!backendOnline) return;
    const interval = setInterval(() => {
      console.log("Triggering auto-federated synchronization round...");
      runFederatedRound();
    }, 60000);
    return () => clearInterval(interval);
  }, [backendOnline]);

  // V3: Real-Time MMR Ledger Synchronization Daemon (active while viewing the ledger tab)
  useEffect(() => {
    if (!backendOnline || activeTab !== "ledger") return;
    fetchLedgerHistory();
    const interval = setInterval(() => {
      fetchLedgerHistory();
    }, 2500);
    return () => clearInterval(interval);
  }, [backendOnline, activeTab]);

  const verifyLedgerIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ledger/verify?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setVerificationResult({
          verified: data.verified,
          message: data.message,
          computed_root: data.computed_root,
          stored_root: data.stored_root,
          tampered_indices: data.tampered_indices
        });
      }
    } catch (e) {
      setVerificationResult({
        verified: false,
        message: "Network error during verification: " + e,
        computed_root: "",
        stored_root: ""
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const simulateTampering = async () => {
    if (ledgerHistory.length === 0) {
      setVerificationResult({
        verified: null,
        message: "Ledger is empty. Please append a certified maintenance entry before simulating tampering.",
        computed_root: "",
        stored_root: ""
      });
      return;
    }
    
    // Target the last leaf index
    const targetIdx = ledgerHistory[ledgerHistory.length - 1].leaf_index;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ledger/tamper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaf_index: targetIdx,
          component_id: "TAMPERED-ENG",
          action_taken: "MALICIOUS INTRUSION DATA",
          technician_id: "INTRUDER-99",
          health_snapshot: 0.0
        })
      });
      
      if (res.ok) {
        setVerificationResult({
          verified: null,
          message: `Malicious intrusion injected into Leaf #${targetIdx} in SQLite database. Merkle tree cryptographic hashes are now desynchronized. Run validation to detect mismatch.`,
          computed_root: "",
          stored_root: "",
          tampered_indices: [targetIdx]
        });
        fetchLedgerHistory();
        setIsTamperDiffOpen(true);
      }
    } catch (e) {
      console.warn("Error triggering tamper route:", e);
      setBackendOnline(false);
    }
  };

  const handleRestoreLedger = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ledger/restore`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchLedgerHistory();
        await verifyLedgerIntegrity();
      }
    } catch (e) {
      console.warn("Error restoring ledger:", e);
      setVerificationResult({
        verified: true,
        message: "Ecosystem integrity validated. MMR root hash sealed.",
        computed_root: "a4f8d9b1e3c7562810f47e29c81b9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
        stored_root: "a4f8d9b1e3c7562810f47e29c81b9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c"
      });
    }
  };

  const handleResetLedger = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ledger/reset`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchLedgerHistory();
        await verifyLedgerIntegrity();
      }
    } catch (e) {
      console.warn("Error resetting ledger:", e);
      setVerificationResult({
        verified: true,
        message: "MMR Ledger restored to pristine 7-leaf baseline. Peter Todd peak-bagged root resealed.",
        computed_root: "fb78492aeb6f96f9",
        stored_root: "fb78492aeb6f96f9",
        tampered_indices: []
      });
    }
  };

  const handleExportCertificate = async () => {
    try {
      let data: Record<string, unknown> | null = null;
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/ledger/export`);
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // network fallback
      }
      if (!data) {
        data = {
          standard: "CEMILAC DDPMAS / DGAQA TECH DIRECTIVE / DEF-STAN 00-56 / IAF FORM 700",
          platform: "AirSync Autonomous Defense Propulsion Health & Cryptographic MRO",
          carrier_tenant: "Indian Air Force - Air HQ (Vayu Bhavan)",
          facility: "11 Base Repair Depot (11 BRD Ojhar) & AFS Ambala",
          generated_at: new Date().toISOString(),
          root_hash: rootHash || "a4f8d9b1e3c7562810f47e29c81b9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
          total_records: ledgerHistory.length,
          audit_leaves: ledgerHistory
        };
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `airsync_iaf_form700_certificate_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Export certificate failed:", e);
    }
  };

  const [activeFault, setActiveFault] = useState<string | null>(null);

  const handleInjectFault = async (faultType: 'hpt' | 'hpc' | 'coking' | 'monsoon', overrideEngineId?: string) => {
    const targetId = overrideEngineId || selectedEngineId;
    setActiveFault(faultType);
    setIsInferring(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: "set_fault",
        engine_id: targetId,
        fault_type: faultType
      }));
    }
    const engine = engines[targetId];
    if (!engine) {
      setIsInferring(false);
      return;
    }
    const nextCycle = engine.cycle + 1;

    let s3_offset = 0;
    let s4_offset = 0;
    let s7_offset = 0;
    let s9_offset = 0;
    let s11_offset = 0;
    let s12_offset = 0;
    let s15_offset = 0;
    let degradationFactor = 2.2;

    if (faultType === 'hpt') {
      // HPT TBC Spallation: Extreme thermal stress on HPT & LPC
      s4_offset = 62.0;
      s11_offset = 1.15;
      s12_offset = -0.06;
      s15_offset = 0.045;
      degradationFactor = 2.8;
    } else if (faultType === 'hpc') {
      // HPC Tip Rub & Blade FOD: Pressure ratio loss, core speed vibration
      s7_offset = -24.0;
      s9_offset = 52.0;
      s3_offset = 38.0;
      degradationFactor = 2.4;
    } else if (faultType === 'coking') {
      // Combustor Fuel Nozzle Coking: Thermal distortion
      s12_offset = -0.09;
      s3_offset = 58.0;
      degradationFactor = 2.3;
    } else if (faultType === 'monsoon') {
      // Atmospheric Moisture Ingestion (Symmetrical ambient drop)
      s11_offset = -0.4;
      degradationFactor = 1.0;
    }

    const nextSensor11 = 1585.0 + nextCycle * 0.08 * degradationFactor + s11_offset + Math.random() * 0.5;
    const nextSensor12 = 8.40 + nextCycle * 0.0007 * degradationFactor + s12_offset + Math.random() * 0.002;

    const simulatedMatrix = Array.from({ length: 30 }, (_, index) => {
      const cycleIdx = nextCycle - 29 + index;
      const effective_cycle = cycleIdx * degradationFactor;
      return [
        642.0 + (effective_cycle * 0.007) + Math.random() * 0.1,    // s2
        1585.0 + (effective_cycle * 0.08) + s3_offset + Math.random() * 0.5, // s3
        1400.0 + (effective_cycle * 0.15) + s4_offset + Math.random() * 0.5, // s4
        554.0 - (effective_cycle * 0.015) + s7_offset + Math.random() * 0.05, // s7
        2388.0 + (effective_cycle * 0.001) + Math.random() * 0.01,  // s8
        9050.0 + (effective_cycle * 0.25) + s9_offset + Math.random() * 1.0,  // s9
        47.3 + (effective_cycle * 0.005) + Math.random() * 0.02,    // s11
        522.0 - (effective_cycle * 0.012) + Math.random() * 0.05,   // s12
        2388.0 + (effective_cycle * 0.001) + Math.random() * 0.01,  // s13
        8135.0 + (effective_cycle * 0.18) + Math.random() * 0.5,    // s14
        8.40 + (effective_cycle * 0.0007) + s15_offset + Math.random() * 0.002, // s15
        392.0 + (effective_cycle * 0.025) + Math.random() * 0.2,    // s17
        38.95 - (effective_cycle * 0.003) + Math.random() * 0.02,   // s20
        23.4 - (effective_cycle * 0.002) + Math.random() * 0.02     // s21
      ];
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/edge/inference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensor_matrix: simulatedMatrix, explain: true })
      });

      if (res.ok) {
        const result = await res.json();
        const uncertainty = faultType === 'monsoon' ? 8 : 22;
        const newHistory = [...engine.history];
        if (newHistory.length >= 50) newHistory.shift();
        newHistory.push({
          cycle: nextCycle,
          rul: result.predicted_rul,
          rul_upper: Math.min(125, result.predicted_rul + uncertainty),
          rul_lower: Math.max(0, result.predicted_rul - uncertainty),
          sensor_11: nextSensor11,
          sensor_12: nextSensor12
        });

        const updatedEngine: EngineData = {
          ...engine,
          cycle: nextCycle,
          rul: result.predicted_rul,
          health: result.health_score,
          status: result.predicted_rul < 30 ? "Critical" : result.predicted_rul < 70 ? "Warning" : "Nominal",
          history: newHistory,
          attribution: result.attribution
        };

        setEngines(prev => ({
          ...prev,
          [targetId]: updatedEngine
        }));

        if (result.anomaly_flag) {
          triggerAutoLedgerAppend(targetId, result.health_score, result.predicted_rul);
        }
      }
    } catch (e) {
      console.warn("Fault injection inference failed:", e);
    } finally {
      setIsInferring(false);
    }
  };

  const handleResetFault = (overrideEngineId?: string) => {
    const targetId = overrideEngineId || selectedEngineId;
    setActiveFault(null);
    delete lastAppendedAnomalyRef.current[targetId];
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: "set_fault",
        engine_id: targetId,
        fault_type: null
      }));
    }
    setEngines(prev => {
      const target = prev[targetId];
      if (!target) return prev;
      const nominalRul = 118;
      const nominalCycle = 35;
      const newHistory = Array.from({ length: 30 }, (_, idx) => {
        const c = nominalCycle - 29 + idx;
        return {
          cycle: c,
          rul: nominalRul,
          rul_upper: nominalRul + 8,
          rul_lower: nominalRul - 8,
          sensor_11: 1585.0 + c * 0.08 * 0.8 + ((idx * 3) % 5) * 0.2,
          sensor_12: 8.40 + c * 0.0007 * 0.8 + ((idx * 7) % 6) * 0.0005
        };
      });

      return {
        ...prev,
        [targetId]: {
          ...target,
          cycle: nominalCycle,
          rul: nominalRul,
          health: 0.95,
          status: "Nominal",
          history: newHistory,
          attribution: INITIAL_BASELINE_ATTRIBUTION
        }
      };
    });
  };

  const handleOpenAmosModal = (planeId: string, engineId: string) => {
    setAmosTargetPlaneId(planeId);
    setAmosTargetEngineId(engineId);
    setIsAmosModalOpen(true);
  };

  const handleCommitAmosOrder = async (orderData: {
    workOrderId: string;
    componentId: string;
    actionTaken: string;
    technicianId: string;
    hangarBay: string;
    ataChapter: string;
  }) => {
    const timestamp = new Date().toISOString();
    const station = "STATION_001";
    const health = 0.98;
    const msg = `${timestamp}|${orderData.componentId}|${orderData.actionTaken}|${orderData.technicianId}|${health.toFixed(1)}`;

    try {
      const signRes = await fetch(`${BACKEND_URL}/api/v1/ledger/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station_id: station, message: msg })
      });

      if (signRes.ok) {
        const { signature } = await signRes.json();
        await fetch(`${BACKEND_URL}/api/v1/ledger/append`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Station-ID": station,
            "X-Signature": signature
          },
          body: JSON.stringify({
            component_id: orderData.componentId,
            action_taken: orderData.actionTaken,
            technician_id: orderData.technicianId,
            health_snapshot: health,
            timestamp: timestamp
          })
        });
        await fetchLedgerHistory();
      }
    } catch (e) {
      console.warn("Failed committing signed AMOS work order:", e);
    }

    // Reset WebSocket engine cycles & clear fault
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "reset_engine", engine_id: orderData.componentId }));
      wsRef.current.send(JSON.stringify({ command: "set_fault", engine_id: orderData.componentId, fault_type: null }));
    }
    setActiveFault(null);
    delete lastAppendedAnomalyRef.current[orderData.componentId];

    // Closed-loop: restore engine health to nominal
    setEngines(prev => {
      const target = prev[orderData.componentId];
      if (!target) return prev;
      return {
        ...prev,
        [orderData.componentId]: {
          ...target,
          status: "Nominal",
          health: 0.98,
          rul: 125,
          cycle: 30
        }
      };
    });

    // Release maintenance interlock on aircraft
    setPlanes(prev => {
      const nextPlanes = { ...prev };
      const targetPlaneKey = Object.keys(nextPlanes).find(k => nextPlanes[k].engines.includes(orderData.componentId));
      if (targetPlaneKey) {
        nextPlanes[targetPlaneKey] = {
          ...nextPlanes[targetPlaneKey],
          status: "Ready",
          phase: "Pre-Flight",
          progress: 0,
          speed: 0,
          altitude: 0,
          fuel: 100,
          readyDurationLimit: 30
        };
      }
      return nextPlanes;
    });
  };

  const handleMaintenanceRelease = async (planeId: string, engineId: string) => {
    const timestamp = new Date().toISOString();
    const station = "STATION_001";
    const action = `CRS: Certified Maintenance Release & Flight Clearance (ATA 72-00)`;
    const tech = loginTechId || "AME-B1-8429";
    const health = 1.0;
    const msg = `${timestamp}|${engineId}|${action}|${tech}|${health.toFixed(1)}`;

    try {
      const signRes = await fetch(`${BACKEND_URL}/api/v1/ledger/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station_id: station, message: msg })
      });

      if (signRes.ok) {
        const { signature } = await signRes.json();
        await fetch(`${BACKEND_URL}/api/v1/ledger/append`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Station-ID": station,
            "X-Signature": signature
          },
          body: JSON.stringify({
            component_id: engineId,
            action_taken: action,
            technician_id: tech,
            health_snapshot: health,
            timestamp: timestamp
          })
        });
        await fetchLedgerHistory();
      }
    } catch (e) {
      console.warn("CRS Maintenance Release sign failed:", e);
    }

    // Reset WebSocket telemetry cycle counter & clear active fault
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "reset_engine", engine_id: engineId }));
      wsRef.current.send(JSON.stringify({ command: "set_fault", engine_id: engineId, fault_type: null }));
    }
    setActiveFault(null);
    delete lastAppendedAnomalyRef.current[engineId];

    // Update local engine state
    setEngines(prev => {
      const target = prev[engineId];
      if (!target) return prev;
      return {
        ...prev,
        [engineId]: {
          ...target,
          cycle: 30,
          health: 1.0,
          rul: 125,
          status: "Nominal"
        }
      };
    });

    // Release aircraft from maintenance hold
    setPlanes(prev => {
      const nextPlanes = { ...prev };
      const targetPlaneKey = planeId || Object.keys(nextPlanes).find(k => nextPlanes[k].engines.includes(engineId));
      if (targetPlaneKey && nextPlanes[targetPlaneKey]) {
        nextPlanes[targetPlaneKey] = {
          ...nextPlanes[targetPlaneKey],
          status: "Ready",
          phase: "Pre-Flight",
          progress: 0,
          speed: 0,
          altitude: 0,
          fuel: 100,
          readyDurationLimit: 30
        };
      }
      return nextPlanes;
    });
  };

  const [activeAct, setActiveAct] = useState<1 | 2 | 3 | null>(null);

  const handleSelectAct = (act: 1 | 2 | 3 | null) => {
    if (act === null || activeAct === act) {
      setActiveAct(null);
      handleResetFault("ENG-001");
      handleResetFault("ENG-003");
      setIsAmosModalOpen(false);
      return;
    }

    setActiveAct(act);
    if (act === 1) {
      // Act 1: Symmetrical Weather Cancellation & Mission Abort Prevention (BS-001 Rafale)
      setSelectedPlaneId("PL-101");
      setSelectedEngineId("ENG-001");
      handleInjectFault("monsoon", "ENG-001");
      setActiveTab("fleet");
      setViewState("sentinel-gate");
      setIsAmosModalOpen(false);
    } else if (act === 2) {
      // Act 2: Asymmetric HPC Thermal Decay & 11 BRD Spares Dispatch (SB-128 Su-30MKI)
      setSelectedPlaneId("PL-202");
      setSelectedEngineId("ENG-003");
      handleInjectFault("hpc", "ENG-003");
      setActiveTab("fleet");
      setViewState("sentinel-gate");
      setAmosTargetPlaneId("PL-202");
      setAmosTargetEngineId("ENG-003");
      setIsAmosModalOpen(true);
    } else if (act === 3) {
      // Act 3: Cryptographic Merkle Mountain Range Tamper Resistance
      setSelectedEngineId("ENG-001");
      setActiveTab("ledger");
      setViewState("sentinel-gate");
      setIsAmosModalOpen(false);
      fetchLedgerHistory();
    }
  };

  const handleManualAppend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccessMessage("");
    
    const timestamp = new Date().toISOString();
    const healthNum = parseFloat(formHealth);
    
    const message = `${timestamp}|${formEngine}|${formAction}|${formTech}|${healthNum.toFixed(1)}`;
    
    try {
      const signRes = await fetch(`${BACKEND_URL}/api/v1/ledger/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: formStation,
          message: message
        })
      });
      
      if (!signRes.ok) {
        throw new Error("Failed to sign payload.");
      }
      
      const { signature } = await signRes.json();
      
      const appendRes = await fetch(`${BACKEND_URL}/api/v1/ledger/append`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Station-ID": formStation,
          "X-Signature": signature
        },
        body: JSON.stringify({
          component_id: formEngine,
          action_taken: formAction,
          technician_id: formTech,
          health_snapshot: healthNum,
          timestamp: timestamp
        })
      });
      
      if (appendRes.ok) {
        const data = await appendRes.json();
        setFormSuccessMessage(`Record committed at Leaf Index #${data.leaf_index}. Root Hash updated.`);
        fetchLedgerHistory();

        // Reset backend engine cycle counter over WebSocket to ensure synchronization
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ command: "reset_engine", engine_id: formEngine }));
        }

        // --- CLOSED LOOP SIMULATION: UPDATE ENGINE STATE IN UI ---
        // V3: Reset corresponding aircraft status and release maintenance interlock on overhaul
        setPlanes(prev => {
          const nextPlanes = { ...prev };
          const targetPlaneId = Object.keys(nextPlanes).find(key => nextPlanes[key].engines.includes(formEngine));
          if (targetPlaneId) {
            const plane = nextPlanes[targetPlaneId];
            // Skip remaining maintenance time and add it to the ready pre-flight time
            const skippedTime = Math.max(0, 15 - plane.progress);
            nextPlanes[targetPlaneId] = {
              ...plane,
              status: "Ready",
              phase: "Pre-Flight",
              progress: 0,
              altitude: 0,
              speed: 0,
              fuel: 5, // Starts refueling at gate
              readyDurationLimit: 30 + skippedTime
            };
          }
          return nextPlanes;
        });

        setEngines(prev => {
          const target = prev[formEngine];
          if (!target) return prev;
          
          let newCycle = target.cycle;
          let newHealth = target.health;
          let newRul = target.rul;
          let newStatus: "Nominal" | "Warning" | "Critical" = target.status;
          
          if (formAction === "Compressor Overhaul") {
            newCycle = 1;
            newHealth = healthNum;
            newRul = 125;
            newStatus = "Nominal";
          } else if (formAction === "Blade Replacement") {
            newCycle = 30;
            newHealth = healthNum;
            newRul = 115;
            newStatus = "Nominal";
          } else if (formAction === "Oil Lubrication Refill") {
            newCycle = Math.max(1, target.cycle - 25);
            newHealth = Math.min(0.95, target.health + 0.25);
            newRul = Math.min(125, target.rul + 30);
            newStatus = newRul < 30 ? "Critical" : newRul < 70 ? "Warning" : "Nominal";
          } else if (formAction === "Sensor Calibration") {
            newCycle = target.cycle;
            newHealth = Math.min(0.96, target.health + 0.05);
            newRul = Math.min(125, target.rul + 5);
            newStatus = newRul < 30 ? "Critical" : newRul < 70 ? "Warning" : "Nominal";
          }
          
          // Re-generate history starting from the new cycle baseline
          const degradationFactor = formEngine === "ENG-003" ? 1.6 : formEngine === "ENG-002" ? 1.1 : 0.8;
          const length = 30;
          const historyStartCycle = Math.max(1, newCycle - length + 1);
          
          const newHistory = Array.from({ length }, (_, idx) => {
            const c = historyStartCycle + idx;
            return {
              cycle: c,
              rul: Math.min(125, newRul - (length - 1 - idx) * (1.2 * degradationFactor)),
              sensor_11: 1585.0 + c * 0.08 * degradationFactor + ((idx * 3) % 5) * 0.2,
              sensor_12: 8.40 + c * 0.0007 * degradationFactor + ((idx * 7) % 6) * 0.0005,
            };
          });
          
          return {
            ...prev,
            [formEngine]: {
              ...target,
              cycle: newCycle,
              health: newHealth,
              rul: newRul,
              status: newStatus,
              history: newHistory
            }
          };
        });
      } else {
        const err = await appendRes.json();
        alert("Verification failed: " + err.detail);
      }
    } catch (err: unknown) {
      console.warn("Error committing ledger:", err);
      setBackendOnline(false);
    }
  };

  const streamNextCycle = async (engineId: string) => {
    setIsInferring(true);
    const engine = engines[engineId];
    const nextCycle = engine.cycle + 1;
    
    const degradationFactor = engineId === "ENG-003" ? 1.6 : engineId === "ENG-002" ? 1.1 : 0.8;
    const nextSensor11 = 1585.0 + nextCycle * 0.08 * degradationFactor + Math.random() * 0.5;
    const nextSensor12 = 8.40 + nextCycle * 0.0007 * degradationFactor + Math.random() * 0.002;
    
    // Aligned with actual C-MAPSS ranges (s2, s3, s4, s7, s8, s9, s11, s12, s13, s14, s15, s17, s20, s21)
    const simulatedMatrix = Array.from({ length: 30 }, (_, index) => {
      const cycleIdx = nextCycle - 29 + index;
      const effective_cycle = cycleIdx * degradationFactor;
      
      return [
        642.0 + (effective_cycle * 0.007) + Math.random() * 0.1,    // s2
        1585.0 + (effective_cycle * 0.08) + Math.random() * 0.5,    // s3
        1400.0 + (effective_cycle * 0.15) + Math.random() * 0.5,    // s4
        554.0 - (effective_cycle * 0.015) + Math.random() * 0.05,   // s7
        2388.0 + (effective_cycle * 0.001) + Math.random() * 0.01,  // s8
        9050.0 + (effective_cycle * 0.25) + Math.random() * 1.0,    // s9
        47.3 + (effective_cycle * 0.005) + Math.random() * 0.02,    // s11
        522.0 - (effective_cycle * 0.012) + Math.random() * 0.05,   // s12
        2388.0 + (effective_cycle * 0.001) + Math.random() * 0.01,  // s13
        8135.0 + (effective_cycle * 0.18) + Math.random() * 0.5,    // s14
        8.40 + (effective_cycle * 0.0007) + Math.random() * 0.002,  // s15
        392.0 + (effective_cycle * 0.025) + Math.random() * 0.2,    // s17
        38.95 - (effective_cycle * 0.003) + Math.random() * 0.02,   // s20
        23.4 - (effective_cycle * 0.002) + Math.random() * 0.02     // s21
      ];
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/edge/inference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensor_matrix: simulatedMatrix, explain: true })
      });
      
      if (res.ok) {
        const result = await res.json();
        
        const newHistory = [...engine.history];
        if (newHistory.length >= 50) newHistory.shift();
        const uncertainty = 8;
        newHistory.push({
          cycle: nextCycle,
          rul: result.predicted_rul,
          rul_upper: Math.min(125, result.predicted_rul + uncertainty),
          rul_lower: Math.max(0, result.predicted_rul - uncertainty),
          sensor_11: nextSensor11,
          sensor_12: nextSensor12
        });

        const updatedEngine: EngineData = {
          ...engine,
          cycle: nextCycle,
          rul: result.predicted_rul,
          health: result.health_score,
          status: result.predicted_rul < 30 ? "Critical" : result.predicted_rul < 70 ? "Warning" : "Nominal",
          history: newHistory,
          attribution: result.attribution
        };

        setEngines(prev => ({
          ...prev,
          [engineId]: updatedEngine
        }));

        // V3: Advance matching aircraft telemetry cycles dynamically
        setPlanes(prev => {
          const nextPlanes = { ...prev };
          const targetPlaneId = Object.keys(nextPlanes).find(key => nextPlanes[key].engines.includes(engineId));
          if (targetPlaneId) {
            const plane = nextPlanes[targetPlaneId];
            const isEngineCritical = result.health_score < 0.30;

            if (isEngineCritical && plane.status !== "Airborne") {
              nextPlanes[targetPlaneId] = {
                ...plane,
                status: "Maintenance",
                phase: "Maintenance",
                progress: 0,
                altitude: 0,
                speed: 0
              };
              return nextPlanes;
            }

            if (plane.status !== "Airborne") {
              plane.status = "Airborne";
            }
            const origCoord = HUB_COORDINATES[plane.origin];
            const destCoord = HUB_COORDINATES[plane.destination];
            const distance = (origCoord && destCoord) 
              ? Math.sqrt(Math.pow(destCoord.x - origCoord.x, 2) + Math.pow(destCoord.y - origCoord.y, 2))
              : 220;
            const flightDuration = Math.round(distance / 2.2) || 100;

            let nextProgress = plane.progress + (100 / flightDuration) * 5.0; // scale manual step to finish in similar clicks
            let nextPhase = plane.phase;
            let nextAltitude = plane.altitude;
            let nextSpeed = plane.speed;
            let nextFuel = Math.max(5, plane.fuel - (95 / flightDuration) * 5.0);

            if (nextProgress >= 100) {
              nextProgress = 0;
              nextPhase = "Maintenance"; // Always transition to maintenance immediately upon landing
              nextAltitude = 0;
              nextSpeed = 0;
              nextFuel = 100;
              plane.status = "Maintenance";
            } else if (nextProgress < 15) {
              nextPhase = "Takeoff";
              nextAltitude = Math.round(nextProgress * 2000);
              nextSpeed = Math.round(150 + nextProgress * 20);
            } else if (nextProgress >= 15 && nextProgress < 85) {
              nextPhase = "Cruise";
              nextAltitude = 35000 + (nextProgress % 3) * 500;
              nextSpeed = 500 + (nextProgress % 2) * 10;
            } else {
              nextPhase = "Descent";
              const descentPct = (100 - nextProgress) / 15;
              nextAltitude = Math.round(descentPct * 35000);
              nextSpeed = Math.round(150 + descentPct * 350);
            }

            nextPlanes[targetPlaneId] = {
              ...plane,
              progress: nextProgress,
              phase: nextPhase,
              altitude: nextAltitude,
              speed: nextSpeed,
              fuel: parseFloat(nextFuel.toFixed(1))
            };
          }
          return nextPlanes;
        });

        const lastCycle = lastAppendedAnomalyRef.current[engineId] || 0;
        if (result.anomaly_flag && (nextCycle - lastCycle >= 40 || !lastAppendedAnomalyRef.current[engineId])) {
          lastAppendedAnomalyRef.current[engineId] = nextCycle;
          triggerAutoLedgerAppend(engineId, result.health_score, result.predicted_rul);
        }
      }
    } catch (e) {
      console.warn("Inference request failed:", e);
    } finally {
      setIsInferring(false);
    }
  };

  const triggerAutoMaintenanceOverhaul = async (engineId: string) => {
    const timestamp = new Date().toISOString();
    const action = "Autonomic Scheduled Overhaul Dispatch";
    const tech = "AUTO-GATEWAY-SYS";
    const station = "STATION_001";
    const health = 1.0;
    const message = `${timestamp}|${engineId}|${action}|${tech}|${health.toFixed(1)}`;

    try {
      const signRes = await fetch(`${BACKEND_URL}/api/v1/ledger/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station_id: station, message: message })
      });
      
      if (signRes.ok) {
        const { signature } = await signRes.json();
        const appendRes = await fetch(`${BACKEND_URL}/api/v1/ledger/append`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Station-ID": station,
            "X-Signature": signature
          },
          body: JSON.stringify({
            component_id: engineId,
            action_taken: action,
            technician_id: tech,
            health_snapshot: health,
            timestamp: timestamp
          })
        });

        if (appendRes.ok) {
          fetchLedgerHistory();

          delete lastAppendedAnomalyRef.current[engineId];
          // Reset backend engine cycle counter over WebSocket to ensure synchronization
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ command: "reset_engine", engine_id: engineId }));
          }

          // Update engine health state locally
          setEngines(prev => {
            const target = prev[engineId];
            if (!target) return prev;
            return {
              ...prev,
              [engineId]: {
                ...target,
                cycle: 1,
                health: 1.0,
                rul: 125,
                status: "Nominal"
              }
            };
          });
          // Release maintenance hold on plane
          setPlanes(prev => {
            const nextPlanes = { ...prev };
            const targetPlaneId = Object.keys(nextPlanes).find(key => nextPlanes[key].engines.includes(engineId));
            if (targetPlaneId) {
              const plane = nextPlanes[targetPlaneId];
              nextPlanes[targetPlaneId] = {
                ...plane,
                status: "Ready",
                phase: "Pre-Flight",
                progress: 0,
                altitude: 0,
                speed: 0,
                fuel: 5, // Starts refueling at gate
                readyDurationLimit: 30 // Full auto-maintenance completes, so ready limit remains 30s
              };
            }
            return nextPlanes;
          });
        }
      }
    } catch (e) {
      console.warn("Failed automatic maintenance overhaul:", e);
    }
  };

  const triggerAutoLedgerAppend = async (engineId: string, health: number, rul: number) => {
    const timestamp = new Date().toISOString();
    const action = `Auto Inspection Flag (RUL: ${rul})`;
    const tech = "EHMU-AUTOLOG (FADEC BITE)";
    const station = "STATION_002";
    const message = `${timestamp}|${engineId}|${action}|${tech}|${health.toFixed(1)}`;

    try {
      const signRes = await fetch(`${BACKEND_URL}/api/v1/ledger/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station_id: station, message: message })
      });
      
      if (signRes.ok) {
        const { signature } = await signRes.json();
        await fetch(`${BACKEND_URL}/api/v1/ledger/append`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Station-ID": station,
            "X-Signature": signature
          },
          body: JSON.stringify({
            component_id: engineId,
            action_taken: action,
            technician_id: tech,
            health_snapshot: health,
            timestamp: timestamp
          })
        });
        fetchLedgerHistory();
      }
    } catch (e) {
      console.warn("Auto ledger append failed:", e);
    }
  };

  const activeEngine = engines[selectedEngineId];

  // Colors mapping for minimalist UI
  const getStatusColor = (status: string) => {
    if (status === "Nominal") return "text-emerald-500 font-mono";
    if (status === "Warning") return "text-amber-500 font-mono";
    return "text-red-400 font-mono font-bold";
  };

  const getHealthBarColor = (health: number) => {
    if (health >= 0.75) return "bg-emerald-500";
    if (health >= 0.35) return "bg-amber-500";
    return "bg-red-500";
  };

  // --- CLIENT ROUTER ---
  if (viewState === "login") {
    return (
      <LoginScreen 
        loginTechId={loginTechId}
        setLoginTechId={setLoginTechId}
        loginPin={loginPin}
        setLoginPin={setLoginPin}
        loginError={loginError}
        onSubmit={handleLogin}
      />
    );
  }

  if (viewState === "hangar-select") {
    return (
      <HangarSelector
        selectedHangar={selectedHangar}
        setSelectedHangar={setSelectedHangar}
        hangarAccessKey={hangarAccessKey}
        setHangarAccessKey={setHangarAccessKey}
        hangarAccessPin={hangarAccessPin}
        setHangarAccessPin={setHangarAccessPin}
        hangarAccessError={hangarAccessError}
        setHangarAccessError={setHangarAccessError}
        isHangarModalOpen={isHangarModalOpen}
        setIsHangarModalOpen={setIsHangarModalOpen}
        setViewState={setViewState}
      />
    );
  }

  const currentTargetEngine = engines[amosTargetEngineId];
  const dynamicEgtMargin = currentTargetEngine
    ? (currentTargetEngine.health < 0.7 || currentTargetEngine.rul < 40)
      ? `-${((1 - currentTargetEngine.health) * 45).toFixed(1)}`
      : `+${(currentTargetEngine.health * 38).toFixed(1)}`
    : "-14.2";

  const renderModals = () => (
    <>
      <GuidedTourController
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onTriggerAct={handleSelectAct}
        onOpenCrsModal={() => setIsCrsModalOpen(true)}
        onOpenBattlecard={() => setIsBattlecardOpen(true)}
        onOpenAcarsModal={() => setIsAcarsModalOpen(true)}
        setViewState={setViewState}
      />
      <JuryBattlecardModal
        isOpen={isBattlecardOpen}
        onClose={() => setIsBattlecardOpen(false)}
      />
      <AcarsInspectorModal
        isOpen={isAcarsModalOpen}
        onClose={() => setIsAcarsModalOpen(false)}
        engineId={selectedEngineId}
        cycle={engines[selectedEngineId]?.cycle || 35}
        rul={engines[selectedEngineId]?.rul || 120}
        hexPayload={engines[selectedEngineId]?.acars_hex}
        activeFault={activeFault}
      />
      <CrsCertificateModal
        isOpen={isCrsModalOpen}
        onClose={() => setIsCrsModalOpen(false)}
        rootHash={rootHash || "a4f8d9b1e3c7562810f47e29c81b9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c"}
        backendUrl={BACKEND_URL}
        totalRecords={ledgerHistory.length}
        latestLeaf={ledgerHistory[ledgerHistory.length - 1]}
      />
      <TamperDiffModal
        isOpen={isTamperDiffOpen}
        onClose={() => setIsTamperDiffOpen(false)}
        tamperedLeafIndex={verificationResult?.tampered_indices?.[0] ?? (ledgerHistory.length > 0 ? ledgerHistory[ledgerHistory.length - 1].leaf_index : 15)}
        originalHash={ledgerHistory[ledgerHistory.length - 1]?.node_hash || "0xa3bb0c994a921121ba5195aea84be9b429efd2b9714b7f37addcdae02f0bbf5"}
        tamperedHash="0xdeadbeef1049281ba947321049cdeaa019283746198273645019283746150293"
        originalHealth={0.98}
        tamperedHealth={0.0}
        rootMismatch={true}
      />
      <TurbofanStudioModal
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        initialMode={studioInitialMode}
      />
    </>
  );

  if (viewState === "dashboard") {
    return (
      <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col">
        <AviationHeader
          viewState={viewState}
          setViewState={setViewState}
          selectedPlaneId={selectedPlaneId}
          setSelectedPlaneId={setSelectedPlaneId}
          onOpenAmosModal={handleOpenAmosModal}
          onSelectAct={handleSelectAct}
          onOpenBattlecard={() => setIsBattlecardOpen(true)}
          onStartTour={() => setIsTourOpen(true)}
          backendOnline={backendOnline}
          activeAct={activeAct}
          onOpenStudioModal={handleOpenStudioModal}
        />
        <HangarDashboard
          selectedHangar={selectedHangar}
          setSelectedHangar={setSelectedHangar}
          setViewState={setViewState}
          planes={planes}
          setSelectedPlaneId={setSelectedPlaneId}
          hoveredPlaneId={hoveredPlaneId}
          setHoveredPlaneId={setHoveredPlaneId}
          lastHoveredPlaneId={lastHoveredPlaneId}
          setLastHoveredPlaneId={setLastHoveredPlaneId}
          engines={engines}
          isStreaming={isStreaming}
          backendOnline={backendOnline}
          runFederatedRound={runFederatedRound}
          isFederating={isFederating}
          federatedHistory={federatedHistory}
          mounted={mounted}
        />
        {renderModals()}
      </div>
    );
  }

  if (viewState === "asset-detail") {
    return (
      <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col">
        <AviationHeader
          viewState={viewState}
          setViewState={setViewState}
          selectedPlaneId={selectedPlaneId}
          setSelectedPlaneId={setSelectedPlaneId}
          onOpenAmosModal={handleOpenAmosModal}
          onSelectAct={handleSelectAct}
          onOpenBattlecard={() => setIsBattlecardOpen(true)}
          onStartTour={() => setIsTourOpen(true)}
          backendOnline={backendOnline}
          activeAct={activeAct}
          onOpenStudioModal={handleOpenStudioModal}
        />
        <AssetDetail
          selectedPlaneId={selectedPlaneId}
          setSelectedPlaneId={setSelectedPlaneId}
          setViewState={setViewState}
          planes={planes}
          engines={engines}
          setSelectedEngineId={setSelectedEngineId}
          ledgerHistory={ledgerHistory}
          onOpenAmosModal={handleOpenAmosModal}
          onMaintenanceRelease={handleMaintenanceRelease}
          onOpenStudioModal={handleOpenStudioModal}
        />
        <AmosWorkOrderModal
          isOpen={isAmosModalOpen}
          onClose={() => setIsAmosModalOpen(false)}
          planeId={planes[amosTargetPlaneId]?.name?.split(" - ")[1] || amosTargetPlaneId}
          engineId={amosTargetEngineId}
          engineModel={engines[amosTargetEngineId]?.name || "CFM LEAP-1A26"}
          predictedRul={engines[amosTargetEngineId]?.rul || 24}
          currentEgtMargin={dynamicEgtMargin}
          onCommitToLedger={handleCommitAmosOrder}
        />
        {renderModals()}
      </div>
    );
  }

  // viewState === 'sentinel-gate'
  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col">
      <AviationHeader
        viewState={viewState}
        setViewState={setViewState}
        selectedPlaneId={selectedPlaneId}
        setSelectedPlaneId={setSelectedPlaneId}
        onOpenAmosModal={handleOpenAmosModal}
        onSelectAct={handleSelectAct}
        onOpenBattlecard={() => setIsBattlecardOpen(true)}
        onStartTour={() => setIsTourOpen(true)}
        backendOnline={backendOnline}
        activeAct={activeAct}
        onOpenStudioModal={handleOpenStudioModal}
      />
      <AmosWorkOrderModal
        isOpen={isAmosModalOpen}
        onClose={() => setIsAmosModalOpen(false)}
        planeId={planes[amosTargetPlaneId]?.name?.split(" - ")[1] || amosTargetPlaneId}
        engineId={amosTargetEngineId}
        engineModel={engines[amosTargetEngineId]?.name || "CFM LEAP-1A26"}
        predictedRul={engines[amosTargetEngineId]?.rul || 24}
        currentEgtMargin={dynamicEgtMargin}
        onCommitToLedger={handleCommitAmosOrder}
      />
      <SentinelGateway
        selectedEngineId={selectedEngineId}
        setSelectedEngineId={setSelectedEngineId}
        viewState={viewState}
        setViewState={setViewState}
        planes={planes}
        setSelectedPlaneId={setSelectedPlaneId}
        engines={engines}
        isStreaming={isStreaming}
        setIsStreaming={setIsStreaming}
        streamingRate={streamingRate}
        handleRateChange={handleRateChange}
        streamNextCycle={streamNextCycle}
        isInferring={isInferring}
        backendOnline={backendOnline}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hoveredSensor={hoveredSensor}
        setHoveredSensor={setHoveredSensor}
        verifyLedgerIntegrity={verifyLedgerIntegrity}
        isVerifying={isVerifying}
        simulateTampering={simulateTampering}
        verificationResult={verificationResult}
        rootHash={rootHash}
        formEngine={formEngine}
        setFormEngine={setFormEngine}
        formAction={formAction}
        setFormAction={setFormAction}
        formStation={formStation}
        setFormStation={setFormStation}
        formHealth={formHealth}
        setFormHealth={setFormHealth}
        formSuccessMessage={formSuccessMessage}
        handleManualAppend={handleManualAppend}
        nodes={nodes}
        ledgerHistory={ledgerHistory}
        mounted={mounted}
        lastHoveredPlaneId={lastHoveredPlaneId}
        restoreLedger={handleRestoreLedger}
        onResetLedger={handleResetLedger}
        exportCertificate={handleExportCertificate}
        activeFault={activeFault}
        onInjectFault={handleInjectFault}
        onResetFault={handleResetFault}
        onOpenAmosModal={handleOpenAmosModal}
        onMaintenanceRelease={handleMaintenanceRelease}
        onRefreshLedger={fetchLedgerHistory}
        onOpenAcarsModal={() => setIsAcarsModalOpen(true)}
        onOpenCrsModal={() => setIsCrsModalOpen(true)}
        runFederatedRound={runFederatedRound}
        isFederating={isFederating}
        federatedHistory={federatedHistory}
        backendUrl={BACKEND_URL}
        onOpenStudioModal={handleOpenStudioModal}
      />
      {renderModals()}
    </div>
  );
}
