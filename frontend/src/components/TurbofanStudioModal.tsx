'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  ShieldCheck,
  Plane,
  CheckCircle2,
} from 'lucide-react';

interface TurbofanStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: '2d' | '3d-engine' | '3d-plane';
  initialSensor?: string;
  initialStation?: string;
}

// Boeing 737-800 Airframe Subsystems Directory
const B737_PARTS = [
  {
    id: 'b737_pylon_port',
    name: 'Port Engine Pylon & Nacelle',
    sub: 'ATA 54 / ATA 71 · CFM56-7B Mount',
    ata: 'ATA 54-10 / 71-11',
    code: 'PYLON-L',
    orbit: '40deg 75deg 65%',
    target: '7m 0m -5m',
    materials: 'Titanium Ti-6Al-4V Forgings & Inconel 718 Shear Fuse Pins',
    behavior: 'Distributes 27,300 lbf static takeoff thrust into wing front spar box. Monitored for shear pin fatigue and nacelle thermal stratification.',
    thermo: {
      temp: '185 °C (Nacelle Cavity)',
      cycle: 'Max 28.4 g Vibration Limit',
      degradation: 'Thermal stress fatigue & acoustically induced sonic fatigue',
    },
    sensor: {
      id: 'v_pylon_l',
      label: 'Port Pylon Accelerometer (TMSP)',
      station: 'PORT NACELLE',
      description: 'Tri-axial piezoelectric vibration transmitter tracking broadband core harmonic frequencies.',
      nominal: '0.8 IPS (< 1.5 IPS ALERT)',
    },
    inspection: 'NDT High-frequency Eddy Current (HFEC) on pylon attach lugs every 3,000 flight cycles (FAA AD 2021-10-06).',
  },
  {
    id: 'b737_pylon_stbd',
    name: 'Starboard Engine Nacelle',
    sub: 'ATA 54 / ATA 71 · CFM56-7B Mount',
    ata: 'ATA 54-10 / 71-11',
    code: 'PYLON-R',
    orbit: '320deg 75deg 65%',
    target: '-7m 0m -5m',
    materials: 'Titanium Ti-6Al-4V Forgings & Inconel 718 Shear Fuse Pins',
    behavior: 'Symmetric wing front spar load distribution. Continuous bleed duct thermal monitoring.',
    thermo: {
      temp: '182 °C (Nacelle Cavity)',
      cycle: 'Max 28.4 g Vibration Limit',
      degradation: 'Thermal fatigue & fan cowl latch wear',
    },
    sensor: {
      id: 'v_pylon_r',
      label: 'Starboard Pylon Accelerometer (TMSP)',
      station: 'STBD NACELLE',
      description: 'Tri-axial vibration sensor monitoring starboard engine core rotational harmonics.',
      nominal: '0.75 IPS (< 1.5 IPS ALERT)',
    },
    inspection: 'Visual inspection of cowl latch safety pins and ultrasonic check on upper link pins.',
  },
  {
    id: 'b737_radome_pitot',
    name: 'Nose Radome & Pitot Sensors',
    sub: 'ATA 34 / ATA 53 · Air Data & RDR-4000',
    ata: 'ATA 34-11 / 53-10',
    code: 'NOSE-RAD',
    orbit: '0deg 85deg 55%',
    target: '0m 2m 14m',
    materials: 'Multilayer Quartz-Epoxy Honeycomb Composite & Heated Copper Probes',
    behavior: 'Dielectric RF transparency for Honeywell RDR-4000 3D weather radar. Triple heated pitot-static masts.',
    thermo: {
      temp: '-54 °C (Cruise Ambient) / +65 °C (Heated)',
      cycle: '472 KTAS Dynamic Pressure (q)',
      degradation: 'Erosion boot peeling, lightning strike dissipation mesh micro-pitting',
    },
    sensor: {
      id: 'pitot_probe_1',
      label: 'Capt Pitot-Static Probe #1',
      station: 'FORWARD FUSELAGE',
      description: 'Electrically heated pitot mast feeding Air Data Inertial Reference System (ADIRS).',
      nominal: '28 VDC Heat OK / 0.00 PSI ΔP Bias',
    },
    inspection: 'Borescope inspection of water drain holes and electrical resistance test of heater elements (AMM 30-31-00).',
  },
  {
    id: 'b737_wing_port',
    name: 'Port Wing Box & Main Fuel Tank',
    sub: 'ATA 28 / ATA 57 · Primary Structure & Fuel',
    ata: 'ATA 28-10 / 57-10',
    code: 'WING-L',
    orbit: '50deg 60deg 75%',
    target: '12m 0m -8m',
    materials: 'Alclad 7075-T651 Top Skin & 2024-T351 Lower Tension Spar Skins',
    behavior: 'Carries primary flight bending and gust aeroelastic loads. Integral fuel cell holds 3,450 kg Jet-A1.',
    thermo: {
      temp: '-38 °C (Cold-Soaked Fuel)',
      cycle: 'Max Wing Deflection +1.8m / -0.6m',
      degradation: 'Stress corrosion cracking (SCC) at spar fastening caps and microbiological fuel corrosion',
    },
    sensor: {
      id: 'fuel_temp_l',
      label: 'Tank 1 Fuel Temp Transmitter',
      station: 'MAIN TANK #1',
      description: 'Hermetically sealed platinum RTD tracking minimum freezing point safety margin.',
      nominal: '-35 °C to +45 °C (-43 °C Freeze Limit)',
    },
    inspection: 'Ultrasonic scan of rear spar fastener holes and microbial fuel test kit analysis (ATA 28-00).',
  },
  {
    id: 'b737_flaps_ailerons',
    name: 'Flight Controls & Flaps',
    sub: 'ATA 27 · High-Lift Triple Slotted Flaps',
    ata: 'ATA 27-51 / 27-10',
    code: 'FLAPS-CTRL',
    orbit: '90deg 65deg 65%',
    target: '8m 0m -10m',
    materials: 'Carbon Fiber Reinforced Polymer (CFRP) & Titanium Flap Tracks',
    behavior: 'Generates maximum CL = 2.85 for short-field approach speeds. Hydraulic System B powered screw actuators.',
    thermo: {
      temp: 'Ambient (-55 °C to +50 °C)',
      cycle: '3,000 PSI Hydraulic System B',
      degradation: 'Flap carriage roller wear, asymmetry clutch slip, composite skin delamination',
    },
    sensor: {
      id: 'flap_skew_sensor',
      label: 'Flap Position & Skew Sensor',
      station: 'OUTBOARD FLAP TRACK #4',
      description: 'Dual rotary variable differential transformer (RVDT) detecting uncommanded mechanical asymmetry.',
      nominal: '0° to 40° Angular Match (±0.5° skew tolerance)',
    },
    inspection: 'Track wear measurement with dial indicators and acoustic emission testing on track beam attach pins.',
  },
  {
    id: 'b737_landing_gear',
    name: 'Main & Nose Landing Gear',
    sub: 'ATA 32 · Tricycle Gear & Carbon Brakes',
    ata: 'ATA 32-11 / 32-41',
    code: 'GEAR-MAIN',
    orbit: '45deg 100deg 50%',
    target: '0m -2m -2m',
    materials: '300M Ultra-High Strength Steel (280 ksi UTS) & Carbon-Carbon Brakes',
    behavior: 'Absorbs 10 ft/s sink rate descent kinetic energy. Nitrogen/hydraulic oleo dampener.',
    thermo: {
      temp: 'Up to 680 °C (Post Heavy Braking)',
      cycle: '200 PSI Nitrogen Pre-Charge',
      degradation: 'Hydrogen embrittlement on cadmium plated steel, tire carcass heat degradation, brake disc oxidation',
    },
    sensor: {
      id: 'brake_temp_m1',
      label: 'Main Gear Brake Temp Sensor',
      station: 'LEFT INBOARD WHEEL #1',
      description: 'Thermocouple transmitter monitoring carbon heat stack temperature for fuse plug thermal release safety.',
      nominal: '< 350 °C (Caution > 400 °C / Fuse Plug 550 °C)',
    },
    inspection: 'Magnetic particle testing (MPT) on axle journals and ultrasonic inspection of drag brace pins (AMM 32-11).',
  },
  {
    id: 'b737_tail_empennage',
    name: 'Vertical Fin & Hydraulic Rudder',
    sub: 'ATA 55 / ATA 27-21 · Directional Stability',
    ata: 'ATA 55-30 / 27-21',
    code: 'EMPENNAGE',
    orbit: '170deg 75deg 60%',
    target: '0m 6m -20m',
    materials: '7075 Aluminum Ribs & Graphite Composite Rudder Skin',
    behavior: 'Ensures directional yaw trim and Engine Inoperative (Vmca) control authority.',
    thermo: {
      temp: '-55 °C Cruise Altitude',
      cycle: 'Dual 3,000 PSI Hydraulic Actuators',
      degradation: 'PCU dual-concentric servo-valve thermal shock, hinge bracket play',
    },
    sensor: {
      id: 'yaw_damper_pos',
      label: 'Main Rudder PCU Feedback RVDT',
      station: 'AFT EMPENNAGE',
      description: 'Monitors rudder power control unit spool valve deflection and yaw damper stability commands.',
      nominal: '±26° Travel / < 0.2° Bias Offset',
    },
    inspection: 'Detailed visual and torque check on rudder hinge pins and PCU servo valve filter micron scan.',
  },
  {
    id: 'b737_apu_tailcone',
    name: 'Auxiliary Power Unit (APU GTCP131-9B)',
    sub: 'ATA 49 · Ground Pneumatics & 90 kVA Gen',
    ata: 'ATA 49-11 / 49-20',
    code: 'APU-AFT',
    orbit: '180deg 85deg 55%',
    target: '0m 3m -26m',
    materials: 'Titanium Fire Shield Enclosure & Inconel Impeller',
    behavior: 'Provides bleed air for engine ground start and 90 kVA 115 VAC 400 Hz electrical power.',
    thermo: {
      temp: '640 °C EGT Exhaust',
      cycle: '48 PSI Pneumatic Bleed Output',
      degradation: 'Compressor fouling, IGV actuator binding, exhaust eductor cracking',
    },
    sensor: {
      id: 'apu_egt_sensor',
      label: 'APU Exhaust Gas Temp Probe',
      station: 'TAILCONE COMPARTMENT',
      description: 'Dual chromel-alumel thermocouple sending real-time exhaust thermal data to APU FADEC controller.',
      nominal: '480 °C - 680 °C (< 710 °C Shutdown)',
    },
    inspection: 'Borescope inspection of APU centrifugal impeller and ignition exciter lead spark test (ATA 49).',
  },
];

// Turbofan Stations Directory
const ENGINE_3D_PARTS = [
  { id: 'st1', name: 'STA 1.0 Fan Face & Spinner', sub: 'ATA 72-21 · 61-inch Ti Blades', code: 'STA 1.0', orbit: '90deg 90deg 80%', target: '0.5m 0.6m -0.05m' },
  { id: 'st2', name: 'STA 2.0 LPC Booster Stages', sub: 'ATA 72-22 · 3-Stage Booster', code: 'STA 2.0', orbit: '70deg 85deg 80%', target: '0.25m 0.58m -0.05m' },
  { id: 'st25', name: 'STA 2.5 Core Splitter Inlet', sub: 'ATA 72-31 · Variable Bleed Valve', code: 'STA 2.5', orbit: '50deg 80deg 75%', target: '0.1m 0.56m -0.05m' },
  { id: 'st3', name: 'STA 3.0 HPC 9-Stage Core', sub: 'ATA 72-30 · Ti-6Al-4V & Inconel', code: 'STA 3.0', orbit: '35deg 75deg 75%', target: '-0.05m 0.55m -0.05m' },
  { id: 'st4', name: 'STA 4.0 Combustor Flame Tube', sub: 'ATA 72-40 · Hastelloy-X Annular', code: 'STA 4.0', orbit: '20deg 75deg 75%', target: '-0.22m 0.54m -0.05m' },
  { id: 'st45', name: 'STA 4.5 Single-Stage HPT', sub: 'ATA 72-51 · CMSX-4 Monocrystal', code: 'STA 4.5', orbit: '345deg 80deg 75%', target: '-0.36m 0.52m -0.05m' },
  { id: 'st5', name: 'STA 5.0 LPT 4-Stage Turbine', sub: 'ATA 72-52 · Rene 80 Turbines', code: 'STA 5.0', orbit: '320deg 85deg 80%', target: '-0.55m 0.48m -0.05m' },
  { id: 'st8', name: 'STA 8.0 Exhaust Mixer & Plug', sub: 'ATA 78-10 · Confluent Nozzle', code: 'STA 8.0', orbit: '270deg 90deg 85%', target: '-0.75m 0.45m -0.05m' },
];

const SENSOR_META: Record<string, { label: string; station: string; description: string; nominal: string }> = {
  s8: { label: 's8 (Nf Fan Speed)', station: 'STA 1.0', description: 'N1 low-pressure shaft rotational velocity transmitter.', nominal: '1,500 – 5,200 RPM' },
  s15: { label: 's15 (Bypass Ratio)', station: 'BYPASS', description: 'Cold fan bypass stream mass flow ratio transmitter.', nominal: '5.1 – 5.5 : 1' },
  s7: { label: 's7 (P30 Total Pressure)', station: 'STA 3.0', description: 'HPC exit total pressure sensor feeding FADEC fuel metering.', nominal: '380 – 540 psia' },
  s11: { label: 's11 (Ps30 Static Pressure)', station: 'STA 3.0', description: 'Diffuser static air pressure transducer.', nominal: '350 – 510 psia' },
  s20: { label: 's20 (W31 Coolant Flow)', station: 'STA 4.1', description: 'HPT nozzle guide vane cooling air bleed mass flux.', nominal: '14.2 – 16.8 lbm/s' },
  s21: { label: 's21 (W32 Coolant Flow)', station: 'STA 4.5', description: 'LPT stage 1 cooling air bleed mass flux.', nominal: '7.8 – 9.2 lbm/s' },
  s2: { label: 's2 (T24 Booster Temp)', station: 'STA 2.4', description: 'LPC exit total temperature probe.', nominal: '90 – 160 °C' },
  s9: { label: 's9 (Nc Core Speed)', station: 'STA 3.0', description: 'N2 high-pressure spool tachometer.', nominal: '8,500 – 14,460 RPM' },
  s3: { label: 's3 (T30 HPC Exit Temp)', station: 'STA 3.0', description: 'Combustor inlet total air temperature sensor.', nominal: '420 – 620 °C' },
  s12: { label: 's12 (phi Fuel Ratio)', station: 'STA 3.5', description: 'Fuel-air equivalence equivalence ratio diagnostic monitor.', nominal: '0.018 – 0.024' },
  s4: { label: 's4 (T50 EGT Exhaust)', station: 'STA 5.0', description: 'Exhaust Gas Temperature thermocouple rake.', nominal: '420 – 850 °C (< 950 °C Redline)' },
};

interface ModelViewerElement extends HTMLElement {
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  timeScale?: number;
}

export default function TurbofanStudioModal({
  isOpen,
  onClose,
  initialMode = '2d',
  initialSensor = 's7',
  initialStation = 'st3',
}: TurbofanStudioModalProps) {
  const [mode, setMode] = useState<'2d' | '3d-engine' | '3d-plane'>(initialMode);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);
  if (prevInitialMode !== initialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
  }
  const [throttle, setThrottle] = useState(10); // Default Ground/Flight Idle at 10%
  const [zoom, setZoom] = useState(1.0);
  const [selectedSensor, setSelectedSensor] = useState(initialSensor);
  const [selectedStationId, setSelectedStationId] = useState(initialStation);
  const [selectedB737PartId, setSelectedB737PartId] = useState('b737_pylon_port');
  const [activeFault, setActiveFault] = useState<string | null>(null);
  const [pinsHidden, setPinsHidden] = useState(false);

  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const motionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Synchronize timeScale and motion hiding when modelViewer mounts
  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    if (typeof mv.timeScale !== 'undefined') {
      mv.timeScale = Math.max(0.15, throttle / 50);
    }

    const handleCameraChange = () => {
      setPinsHidden(true);
      if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
      motionTimerRef.current = setTimeout(() => {
        setPinsHidden(false);
      }, 180);
    };

    mv.addEventListener('camera-change', handleCameraChange);
    return () => {
      mv.removeEventListener('camera-change', handleCameraChange);
    };
  }, [mode, throttle]);

  if (!isOpen) return null;

  // Real-time dynamic gauge telemetry calculations
  const n1 = Math.round(1200 + throttle * 42);
  const n2 = Math.round(8500 + throttle * 98);
  const egt = Math.round(410 + throttle * 3.8);
  const opr = (20 + throttle * 0.38).toFixed(1);

  // SVG Flow Animation Durations
  const bypassDur = (1.8 - (throttle / 100) * 1.35).toFixed(2) + 's';
  const coreDur = (2.2 - (throttle / 100) * 1.6).toFixed(2) + 's';

  // Hotspot Marker Coordinates for 2D CAD
  let hx = 278,
    hy = 115;
  if (activeFault === 'fault_tbc' || selectedSensor === 's4' || selectedSensor === 's20' || selectedSensor === 's21') {
    hx = 390;
    hy = 115;
  } else if (activeFault === 'fault_nozzle_coking' || selectedSensor === 's12') {
    hx = 312;
    hy = 115;
  } else if (activeFault === 'fault_bearing_breakdown') {
    hx = 390;
    hy = 115;
  } else if (activeFault === 'fault_bird_fod' || selectedSensor === 's8') {
    hx = 88;
    hy = 115;
  } else if (selectedSensor === 's15' || selectedSensor === 's2') {
    hx = 180;
    hy = 60;
  }

  // Camera Orbit Presets per Subsystem / Station
  const handleSelectB737Part = (partId: string) => {
    setSelectedB737PartId(partId);
    const p = B737_PARTS.find((item) => item.id === partId);
    if (p && modelViewerRef.current) {
      modelViewerRef.current.cameraOrbit = p.orbit;
      modelViewerRef.current.cameraTarget = p.target;
    }
  };

  const handleSelectEngineStation = (stationId: string) => {
    setSelectedStationId(stationId);
    const s = ENGINE_3D_PARTS.find((item) => item.id === stationId);
    if (s && modelViewerRef.current) {
      modelViewerRef.current.cameraOrbit = s.orbit;
      modelViewerRef.current.cameraTarget = s.target;
    }
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(zoom + 0.2, 2.4);
    setZoom(nextZoom);
    if (mode !== '2d' && modelViewerRef.current) {
      const fov = parseFloat(modelViewerRef.current.fieldOfView || '30') || 30;
      modelViewerRef.current.fieldOfView = Math.max(14, fov - 4) + 'deg';
    }
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(zoom - 0.2, 0.6);
    setZoom(nextZoom);
    if (mode !== '2d' && modelViewerRef.current) {
      const fov = parseFloat(modelViewerRef.current.fieldOfView || '30') || 30;
      modelViewerRef.current.fieldOfView = Math.min(58, fov + 4) + 'deg';
    }
  };

  const handleZoomReset = () => {
    setZoom(1.0);
    if (modelViewerRef.current) {
      if (mode === '3d-plane') {
        modelViewerRef.current.cameraOrbit = '40deg 75deg 48m';
        modelViewerRef.current.cameraTarget = '0m 5.4m 0.26m';
        modelViewerRef.current.fieldOfView = '28deg';
      } else if (mode === '3d-engine') {
        modelViewerRef.current.cameraOrbit = '0deg 80deg 105%';
        modelViewerRef.current.cameraTarget = 'auto';
        modelViewerRef.current.fieldOfView = '32deg';
      }
    }
  };

  const currentB737Part = B737_PARTS.find((p) => p.id === selectedB737PartId) || B737_PARTS[0];
  const currentEngineMeta = SENSOR_META[selectedSensor] || SENSOR_META.s7;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[92vh] bg-[#05080e] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#080d17] border-b border-white/[0.08] select-none">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center p-1.5 shadow-sm">
              <Image src="/logo.png" alt="sentinelMRO-vault" width={26} height={26} className="object-contain" priority />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  SentinelMRO Aerospace Digital Twin Studio
                </span>
                <span className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded">
                  FAA / EASA DETERMINISTIC
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                SAE ARP 755A Vector CAD &bull; Dual-Spool PBR Metallurgy &bull; Boeing 737-800 Airframe Twin
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Top Telemetry Gauges (Synchronized with 10% Ground Idle) */}
            <div className="hidden lg:flex items-center space-x-3 font-mono text-[11px] bg-[#050912] border border-white/[0.06] px-3 py-1.5 rounded-lg">
              <div>
                <span className="text-zinc-500 text-[9.5px]">N1:</span>{' '}
                <strong className="text-cyan-300">{n1.toLocaleString()} RPM</strong>
              </div>
              <span className="text-zinc-700">|</span>
              <div>
                <span className="text-zinc-500 text-[9.5px]">N2:</span>{' '}
                <strong className="text-cyan-300">{n2.toLocaleString()} RPM</strong>
              </div>
              <span className="text-zinc-700">|</span>
              <div>
                <span className="text-zinc-500 text-[9.5px]">EGT:</span>{' '}
                <strong className="text-amber-400">{egt} °C</strong>
              </div>
              <span className="text-zinc-700">|</span>
              <div>
                <span className="text-zinc-500 text-[9.5px]">OPR:</span>{' '}
                <strong className="text-emerald-400">{opr} : 1</strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Close Studio (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Column Studio Body Architecture */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_380px] gap-3 p-3 overflow-hidden min-h-0 bg-[#03060a]">
          {/* Left: Components & Subsystems Navigation Sidebar */}
          <div className="bg-[#060910] border border-white/[0.07] rounded-xl flex flex-col overflow-y-auto p-3 gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              <span>{mode === '3d-plane' ? 'B737-800 AIRFRAME' : 'TURBOFAN STATIONS'}</span>
              <span className="text-[9px] text-zinc-500">{mode === '3d-plane' ? 'AIRFRAME' : 'PBR CORE'}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {mode === '3d-plane' ? (
                B737_PARTS.map((part) => {
                  const isActive = selectedB737PartId === part.id;
                  return (
                    <button
                      key={part.id}
                      onClick={() => handleSelectB737Part(part.id)}
                      className={`p-2 rounded-lg text-left font-mono transition-all flex flex-col gap-0.5 border ${
                        isActive
                          ? 'border-cyan-400/80 bg-cyan-950/40 text-cyan-300 font-bold'
                          : 'border-white/[0.05] bg-white/[0.02] text-zinc-300 hover:border-cyan-500/40 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold">{part.name}</span>
                        <span className={`text-[8.5px] font-bold ${isActive ? 'text-cyan-300' : 'text-zinc-500'}`}>
                          {part.code}
                        </span>
                      </div>
                      <span className="text-[9.5px] text-zinc-400 truncate">{part.sub}</span>
                    </button>
                  );
                })
              ) : (
                ENGINE_3D_PARTS.map((part) => {
                  const isActive = selectedStationId === part.id;
                  return (
                    <button
                      key={part.id}
                      onClick={() => handleSelectEngineStation(part.id)}
                      className={`p-2 rounded-lg text-left font-mono transition-all flex flex-col gap-0.5 border ${
                        isActive
                          ? 'border-cyan-400/80 bg-cyan-950/40 text-cyan-300 font-bold'
                          : 'border-white/[0.05] bg-white/[0.02] text-zinc-300 hover:border-cyan-500/40 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold">{part.name}</span>
                        <span className={`text-[8.5px] font-bold ${isActive ? 'text-cyan-300' : 'text-zinc-500'}`}>
                          {part.code}
                        </span>
                      </div>
                      <span className="text-[9.5px] text-zinc-400 truncate">{part.sub}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Center: Viewport & Cockpit Toolbar */}
          <div className="flex flex-col bg-[#05080e] border border-white/[0.07] rounded-xl overflow-hidden relative">
            {/* Viewport Control Toolbar (No CAM text, conditional throttle, dynamic zoom percentage) */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#080d17] border-b border-white/[0.06] font-mono text-[11px] flex-wrap gap-2.5">
              {/* View Mode Badges */}
              <div className="flex items-center space-x-1.5">
                <span className="text-zinc-500 text-[10px] mr-1">VIEW:</span>
                <button
                  onClick={() => setMode('2d')}
                  className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                    mode === '2d'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'bg-[#0c101a] text-zinc-400 border border-white/[0.08] hover:text-white'
                  }`}
                >
                  2D VECTOR CAD
                </button>
                <button
                  onClick={() => setMode('3d-engine')}
                  className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                    mode === '3d-engine'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'bg-[#0c101a] text-zinc-400 border border-white/[0.08] hover:text-white'
                  }`}
                >
                  3D ENGINE CORE
                </button>
                <button
                  onClick={() => setMode('3d-plane')}
                  className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                    mode === '3d-plane'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'bg-[#0c101a] text-zinc-400 border border-white/[0.08] hover:text-white'
                  }`}
                >
                  3D B737 AIRFRAME
                </button>
              </div>

              {/* Dynamic Throttle Slider (Engine only; default 10% idle, hidden on airplane) */}
              {mode !== '3d-plane' && (
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 font-bold text-[10.5px]">THROTTLE (TLA):</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={throttle}
                    onChange={(e) => setThrottle(parseInt(e.target.value, 10))}
                    className="w-24 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-cyan-300 font-bold w-9 text-right">{throttle}%</span>
                </div>
              )}

              {/* Dynamic Zoom Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleZoomOut}
                  className="px-2 py-1 bg-[#0c101a] border border-white/[0.08] text-zinc-300 rounded hover:text-white hover:border-cyan-500/40 text-[11px]"
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  onClick={handleZoomReset}
                  className="px-2 py-1 bg-[#0c101a] border border-white/[0.08] text-cyan-300 rounded hover:text-white hover:border-cyan-500/40 text-[10.5px] font-bold min-w-[50px] text-center"
                  title="Reset Scale"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="px-2 py-1 bg-[#0c101a] border border-white/[0.08] text-zinc-300 rounded hover:text-white hover:border-cyan-500/40 text-[11px]"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
            </div>

            {/* Canvas Viewport (Zero scrollbar at 100% zoom; perfectly centered) */}
            <div
              className={`flex-1 relative flex items-center justify-center p-0 ${
                zoom > 1.0 ? 'overflow-auto' : 'overflow-hidden'
              }`}
            >
              {/* Mode 1: 3D Engine Core */}
              {mode === '3d-engine' && (
                <div className="w-full h-full flex flex-col relative">
                  <model-viewer
                    ref={modelViewerRef}
                    id="studio-model-viewer"
                    src="/models/turbofan.glb"
                    alt="High-Bypass Turbofan 3D Digital Twin"
                    camera-controls
                    auto-rotate
                    auto-rotate-delay="3000"
                    rotation-per-second="10deg"
                    shadow-intensity="0.4"
                    shadow-softness="0.5"
                    exposure="1.25"
                    environment-image="neutral"
                    camera-orbit="0deg 80deg 105%"
                    field-of-view="32deg"
                    min-field-of-view="15deg"
                    max-field-of-view="55deg"
                    interaction-prompt="none"
                    animation-name="idle"
                    autoplay
                    power-preference="high-performance"
                    style={{ width: '100%', height: '100%', minHeight: '480px', background: '#05080e' }}
                  >
                    {/* Hotspot Pins that disappear during motion */}
                    <button
                      className={`absolute flex flex-col items-center cursor-pointer transition-all duration-200 ${
                        pinsHidden ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
                      }`}
                      slot="hotspot-sta1"
                      data-position="540 640 -58"
                      data-normal="0.7 0.7 0"
                      onClick={() => handleSelectEngineStation('st1')}
                    >
                      <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#060b14]/90 border border-cyan-400 text-white font-mono text-[10px] shadow-lg backdrop-blur">
                        <span className="font-bold">STA 1.0 FAN FACE</span>
                        <span className="text-cyan-300">15 °C</span>
                      </div>
                      <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-400 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-cyan-400 border border-white/40 ring-1 ring-black/80" />
                    </button>

                    <button
                      className={`absolute flex flex-col items-center cursor-pointer transition-all duration-200 ${
                        pinsHidden ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
                      }`}
                      slot="hotspot-sta3"
                      data-position="20 560 -58"
                      data-normal="0 1 0"
                      onClick={() => handleSelectEngineStation('st3')}
                    >
                      <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#060b14]/90 border border-amber-400 text-white font-mono text-[10px] shadow-lg backdrop-blur">
                        <span className="font-bold">STA 3.0 HPC</span>
                        <span className="text-amber-300">{Math.round(480 + throttle * 1.8)} °C</span>
                      </div>
                      <div className="w-0.5 h-4 bg-gradient-to-b from-amber-400 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-amber-400 border border-white/40 ring-1 ring-black/80" />
                    </button>

                    <button
                      className={`absolute flex flex-col items-center cursor-pointer transition-all duration-200 ${
                        pinsHidden ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
                      }`}
                      slot="hotspot-sta4"
                      data-position="-240 540 -58"
                      data-normal="0 1 0"
                      onClick={() => handleSelectEngineStation('st4')}
                    >
                      <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#060b14]/90 border border-rose-400 text-white font-mono text-[10px] shadow-lg backdrop-blur">
                        <span className="font-bold">STA 4.0 COMBUSTOR</span>
                        <span className="text-rose-300">{Math.round(980 + throttle * 4.5)} °C</span>
                      </div>
                      <div className="w-0.5 h-4 bg-gradient-to-b from-rose-400 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-rose-400 border border-white/40 ring-1 ring-black/80" />
                    </button>

                    <button
                      className={`absolute flex flex-col items-center cursor-pointer transition-all duration-200 ${
                        pinsHidden ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
                      }`}
                      slot="hotspot-sta5"
                      data-position="-640 470 -58"
                      data-normal="-0.7 0.7 0"
                      onClick={() => handleSelectEngineStation('st5')}
                    >
                      <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#060b14]/90 border border-cyan-400 text-white font-mono text-[10px] shadow-lg backdrop-blur">
                        <span className="font-bold">STA 5.0 LPT/EXHAUST</span>
                        <span className="text-cyan-300">{egt} °C</span>
                      </div>
                      <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-400 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-cyan-400 border border-white/40 ring-1 ring-black/80" />
                    </button>
                  </model-viewer>

                  <div className="absolute bottom-3 left-3 bg-[#060b14]/90 backdrop-blur border border-white/[0.08] rounded-md px-3 py-1.5 font-mono text-[10.5px] text-zinc-400 pointer-events-none">
                    SPATIAL CAD: <strong className="text-cyan-300">CFM56 / LEAP DUAL-SPOOL TURBOFAN</strong> &bull; ROTORS ACTIVE
                  </div>
                </div>
              )}

              {/* Mode 2: 3D Boeing 737 Airframe */}
              {mode === '3d-plane' && (
                <div className="w-full h-full flex flex-col relative">
                  <model-viewer
                    ref={modelViewerRef}
                    id="studio-model-viewer"
                    src="/models/b737-800.glb"
                    alt="Boeing 737-800 Airframe Digital Twin"
                    camera-controls
                    auto-rotate
                    auto-rotate-delay="4000"
                    rotation-per-second="6deg"
                    shadow-intensity="0.5"
                    shadow-softness="0.6"
                    exposure="1.25"
                    environment-image="neutral"
                    camera-orbit="40deg 75deg 48m"
                    camera-target="0m 5.4m 0.26m"
                    field-of-view="28deg"
                    min-field-of-view="14deg"
                    max-field-of-view="60deg"
                    interaction-prompt="none"
                    power-preference="high-performance"
                    style={{ width: '100%', height: '100%', minHeight: '480px', background: '#05080e' }}
                  />

                  <div className="absolute bottom-3 left-3 bg-[#060b14]/90 backdrop-blur border border-white/[0.08] rounded-md px-3 py-1.5 font-mono text-[10.5px] text-zinc-400 pointer-events-none">
                    AIRFRAME TWIN: <strong className="text-cyan-300">BOEING 737-800 COMMERCIAL TRANSPORT</strong> &bull; AIRFRAME TELEMETRY
                  </div>
                </div>
              )}

              {/* Mode 3: 2D Vector CAD Blueprint */}
              {mode === '2d' && (
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease',
                    width: '100%',
                    maxWidth: '960px',
                    padding: '12px',
                  }}
                >
                  <svg viewBox="0 0 560 230" className="w-full h-auto select-none rounded-lg">
                    <defs>
                      <linearGradient id="coreFlowGradStudio" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                        <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.9" />
                        <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.9" />
                        <stop offset="75%" stopColor="#ef4444" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity="0.95" />
                      </linearGradient>
                      <radialGradient id="combustorHeatStudio" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity="0.9" />
                        <stop offset="60%" stopColor="#ea580c" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    <rect width="560" height="230" fill="#070c18" rx="8" />

                    {/* Background Blueprint Grid */}
                    <g opacity="0.12" stroke="#38bdf8" strokeWidth="0.5">
                      {Array.from({ length: 28 }).map((_, i) => (
                        <line key={`v-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="230" />
                      ))}
                      {Array.from({ length: 12 }).map((_, i) => (
                        <line key={`h-${i}`} x1="0" y1={i * 20} x2="560" y2={i * 20} />
                      ))}
                    </g>

                    {/* Active Sensor Pulsing Target Indicator */}
                    <g id="studio-sensor-marker">
                      <circle cx={hx} cy={hy} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2">
                        <animate attributeName="r" values="5;7;5" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={hx} cy={hy} r="17" fill="none" stroke="#ef4444" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.8">
                        <animate attributeName="r" values="14;24;14" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </g>

                    {/* Centerline */}
                    <line x1="25" y1="115" x2="535" y2="115" stroke="#06b6d4" strokeWidth="1" strokeDasharray="7 4" opacity="0.45" />
                    <text x="538" y="118" fill="#06b6d4" fontFamily="monospace" fontSize="7" opacity="0.7">CL</text>

                    {/* Bypass Streams */}
                    <path d="M 100 54 C 200 54, 320 54, 460 68" fill="none" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="6 8" strokeLinecap="round" opacity="0.7">
                      <animate attributeName="stroke-dashoffset" from="28" to="0" dur={bypassDur} repeatCount="indefinite" />
                    </path>
                    <path d="M 100 176 C 200 176, 320 176, 460 162" fill="none" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="6 8" strokeLinecap="round" opacity="0.7">
                      <animate attributeName="stroke-dashoffset" from="28" to="0" dur={bypassDur} repeatCount="indefinite" />
                    </path>

                    {/* Core Stream */}
                    <path d="M 125 115 L 450 115" fill="none" stroke="url(#coreFlowGradStudio)" strokeWidth="3.5" strokeDasharray="8 12" strokeLinecap="round" opacity="0.5">
                      <animate attributeName="stroke-dashoffset" from="40" to="0" dur={coreDur} repeatCount="indefinite" />
                    </path>

                    {/* Outer Nacelle & Casing */}
                    <path d="M 50 56 C 65 38 110 34 180 34 L 330 34 C 375 34 420 46 462 66 L 456 76 C 418 62 380 52 335 52 L 180 52 C 120 52 75 58 62 74 Z" fill="#0d1424" stroke="#2a3a58" strokeWidth="1.4" />
                    <path d="M 50 174 C 65 192 110 196 180 196 L 330 196 C 375 196 420 184 462 164 L 456 154 C 418 168 380 178 335 178 L 180 178 C 120 178 75 172 62 156 Z" fill="#0d1424" stroke="#2a3a58" strokeWidth="1.4" />

                    {/* Core Gas Path Boundary */}
                    <path d="M 125 82 L 205 82 L 245 88 L 285 88 L 315 92 L 365 92 L 415 96 L 450 100 L 450 130 L 415 134 L 365 138 L 315 138 L 285 142 L 245 142 L 205 148 L 125 148 Z" fill="url(#coreFlowGradStudio)" stroke="#3f3f46" strokeWidth="1" />

                    {/* Fan Face & Spinner */}
                    <path d="M 45 115 C 55 106, 75 102, 86 100 L 86 130 C 75 128, 55 124, 45 115 Z" fill="#182235" stroke="#38bdf8" strokeWidth="1.2" className="cursor-pointer" onClick={() => handleSelectEngineStation('st1')} />
                    <path d="M 86 52 C 92 75, 88 95, 86 100 L 94 100 C 96 95, 102 75, 96 52 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.2" className="cursor-pointer" onClick={() => handleSelectEngineStation('st1')} />
                    <path d="M 86 178 C 92 155, 88 135, 86 130 L 94 130 C 96 135, 102 155, 96 178 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.2" className="cursor-pointer" onClick={() => handleSelectEngineStation('st1')} />

                    {/* LPC Booster */}
                    <g stroke="#38bdf8" strokeWidth="1.8" opacity="0.85" className="cursor-pointer" onClick={() => handleSelectEngineStation('st25')}>
                      <line x1="138" y1="82" x2="138" y2="148" />
                      <line x1="155" y1="82" x2="155" y2="148" />
                      <line x1="172" y1="82" x2="172" y2="148" />
                    </g>

                    {/* HPC Blades */}
                    <g className="cursor-pointer" onClick={() => handleSelectEngineStation('st3')}>
                      {[196, 206, 216, 226, 236, 246, 256, 266, 276].map((x, i) => {
                        const taper = i * 0.9;
                        return (
                          <g key={`hpc-${i}`}>
                            <line x1={x} y1={82 + taper} x2={x} y2={148 - taper} stroke="#e4e4e7" strokeWidth="1.6" />
                            <line x1={x + 4} y1={84 + taper} x2={x + 4} y2={146 - taper} stroke="#71717a" strokeWidth="0.9" />
                          </g>
                        );
                      })}
                    </g>

                    {/* Combustor Chamber */}
                    <g className="cursor-pointer" onClick={() => handleSelectEngineStation('st4')}>
                      <rect x="286" y="90" width="52" height="50" rx="3" fill="#1c1917" stroke="#f97316" strokeWidth="1.4" />
                      <circle cx="312" cy="115" r="18" fill="url(#combustorHeatStudio)" />
                      <circle cx="290" cy="104" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="0.8" />
                      <circle cx="290" cy="126" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="0.8" />
                    </g>

                    {/* HPT Stages */}
                    <g className="cursor-pointer" onClick={() => handleSelectEngineStation('st45')}>
                      <line x1="344" y1="92" x2="344" y2="138" stroke="#ef4444" strokeWidth="2.2" />
                      <line x1="352" y1="92" x2="352" y2="138" stroke="#ef4444" strokeWidth="2.2" />
                    </g>

                    {/* LPT Stages */}
                    <g className="cursor-pointer" onClick={() => handleSelectEngineStation('st5')}>
                      {[368, 380, 392, 404].map((x, i) => {
                        const flare = i * 1.2;
                        return (
                          <g key={`lpt-${i}`}>
                            <line x1={x} y1={94 - flare} x2={x} y2={136 + flare} stroke="#38bdf8" strokeWidth="2" />
                            <line x1={x + 4} y1={95 - flare} x2={x + 4} y2={135 + flare} stroke="#52525b" strokeWidth="1" />
                          </g>
                        );
                      })}
                    </g>

                    {/* Shafts */}
                    <line x1="86" y1="113" x2="430" y2="113" stroke="#22d3ee" strokeWidth="2.5" opacity="0.95" />
                    <line x1="190" y1="117" x2="355" y2="117" stroke="#10b981" strokeWidth="3" opacity="0.95" />

                    {/* Precision FADEC Probes (Clean Architecture, Redundant Top STA Tags Removed) */}
                    {[
                      { id: 's8', label: 's8 (Nf)', px: 90, py: 31, targetX: 88, targetY: 115, isTop: true, stId: 'st1' },
                      { id: 's15', label: 's15 (BPR)', px: 180, py: 31, targetX: 180, targetY: 54, isTop: true, stId: 'st2' },
                      { id: 's7', label: 's7 (P30)', px: 260, py: 31, targetX: 278, targetY: 86, isTop: true, stId: 'st3' },
                      { id: 's11', label: 's11 (Ps30)', px: 312, py: 31, targetX: 288, targetY: 90, isTop: true, stId: 'st3' },
                      { id: 's20', label: 's20 (W31)', px: 366, py: 31, targetX: 352, targetY: 90, isTop: true, stId: 'st45' },
                      { id: 's21', label: 's21 (W32)', px: 422, py: 31, targetX: 388, targetY: 92, isTop: true, stId: 'st45' },
                      { id: 's2', label: 's2 (T24)', px: 155, py: 202, targetX: 172, targetY: 148, isTop: false, stId: 'st25' },
                      { id: 's9', label: 's9 (Nc)', px: 220, py: 202, targetX: 236, targetY: 115, isTop: false, stId: 'st3' },
                      { id: 's3', label: 's3 (T30)', px: 275, py: 202, targetX: 278, targetY: 144, isTop: false, stId: 'st3' },
                      { id: 's12', label: 's12 (phi)', px: 332, py: 202, targetX: 302, targetY: 126, isTop: false, stId: 'st4' },
                      { id: 's4', label: 's4 (T50)', px: 412, py: 202, targetX: 422, targetY: 140, isTop: false, stId: 'st5' },
                    ].map((sensor) => {
                      const isSelected = selectedSensor === sensor.id;
                      const isFaultTarget =
                        (activeFault === 'fault_tbc' && (sensor.id === 's4' || sensor.id === 's20')) ||
                        (activeFault === 'fault_tip_rub' && (sensor.id === 's7' || sensor.id === 's11')) ||
                        (activeFault === 'fault_nozzle_coking' && sensor.id === 's12') ||
                        (activeFault === 'fault_bearing_breakdown' && sensor.id === 's4') ||
                        (activeFault === 'fault_bird_fod' && sensor.id === 's8');

                      const nodeStroke = isSelected ? '#22d3ee' : isFaultTarget ? '#ef4444' : '#3f3f46';
                      const nodeFill = isSelected ? '#082f49' : isFaultTarget ? '#450a0a' : '#18181b';
                      const textFill = isSelected ? '#38bdf8' : isFaultTarget ? '#f87171' : '#a1a1aa';

                      return (
                        <g
                          key={sensor.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedSensor(sensor.id);
                            setSelectedStationId(sensor.stId);
                          }}
                        >
                          <rect x={sensor.px - 26} y={sensor.py - 10} width="52" height="20" fill="transparent" />
                          <line
                            x1={sensor.px}
                            y1={sensor.isTop ? sensor.py + 7 : sensor.py - 7}
                            x2={sensor.targetX}
                            y2={sensor.targetY}
                            stroke={nodeStroke}
                            strokeWidth={isSelected || isFaultTarget ? 1.5 : 0.8}
                            strokeDasharray={isSelected ? 'none' : '2 2'}
                            pointerEvents="none"
                          />
                          <circle cx={sensor.targetX} cy={sensor.targetY} r={isSelected ? 4.5 : 2.5} fill={nodeStroke} stroke="#0b0e17" strokeWidth="1" pointerEvents="none" />
                          <rect x={sensor.px - 23} y={sensor.py - 7} width="46" height="14" rx="7" fill={nodeFill} stroke={nodeStroke} strokeWidth={isSelected ? 1.8 : 1} pointerEvents="none" />
                          <text x={sensor.px} y={sensor.py + 3} textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="bold" fill={textFill} pointerEvents="none">
                            {sensor.label.toUpperCase()}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Right: Engineering Inspector Sidebar (Deep Metallurgy, Sensor Telemetry, Airworthiness) */}
          <div className="bg-[#060910] border border-white/[0.07] rounded-xl flex flex-col overflow-y-auto p-3.5 gap-3">
            {mode === '3d-plane' ? (
              <>
                <div className="border-b border-white/[0.08] pb-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      {currentB737Part.code}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">{currentB737Part.ata}</span>
                  </div>
                  <div className="text-sm font-bold text-white">{currentB737Part.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{currentB737Part.sub}</div>
                </div>

                <div className="bg-[#090e18] border border-white/[0.07] rounded-lg p-3 space-y-1.5">
                  <div className="text-[10.5px] font-mono font-bold text-cyan-400 uppercase">
                    Materials &amp; Structural Metallurgy
                  </div>
                  <div className="text-[11.5px] text-zinc-200 font-semibold">{currentB737Part.materials}</div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-500">Aeroelastic Mechanics:</strong> {currentB737Part.behavior}
                  </div>
                </div>

                <div className="bg-[#090e18] border border-white/[0.07] rounded-lg p-3 space-y-2">
                  <div className="text-[10.5px] font-mono font-bold text-amber-400 uppercase">
                    Operational Environment &amp; Flight Envelope
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-zinc-500 text-[9.5px]">TEMP ENVELOPE:</span>
                      <div className="text-cyan-300 font-bold">{currentB737Part.thermo.temp}</div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[9.5px]">LOAD ENVELOPE:</span>
                      <div className="text-cyan-300 font-bold">{currentB737Part.thermo.cycle}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-300 leading-snug">
                    <strong className="text-rose-400">Degradation Mechanism:</strong> {currentB737Part.thermo.degradation}
                  </div>
                </div>

                <div className="bg-[#090e18] border border-cyan-500/30 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                      AVIONICS TELEMETRY: {currentB737Part.sensor.id.toUpperCase()}
                    </span>
                    <span className="text-[9.5px] font-mono font-bold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>BITE OK</span>
                    </span>
                  </div>
                  <div className="text-[12px] font-bold text-white">{currentB737Part.sensor.label}</div>
                  <div className="text-[11px] text-zinc-400 leading-snug">{currentB737Part.sensor.description}</div>
                  <div className="text-[10px] font-mono text-cyan-300 pt-1">
                    Nominal Range: <strong>{currentB737Part.sensor.nominal}</strong>
                  </div>
                </div>

                <div className="bg-[#090e18] border border-amber-500/30 rounded-lg p-3 space-y-1">
                  <div className="text-[10.5px] font-mono font-bold text-amber-400 uppercase flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Airworthiness &amp; NDT Mandate</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 leading-relaxed">{currentB737Part.inspection}</div>
                </div>
              </>
            ) : (
              <>
                <div className="border-b border-white/[0.08] pb-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      {selectedStationId.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">ATA 72-00 POWERPLANT</span>
                  </div>
                  <div className="text-sm font-bold text-white">Dual-Spool Turbofan Core Assembly</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">High-bypass ratio aerothermal cycle</div>
                </div>

                <div className="bg-[#090e18] border border-white/[0.07] rounded-lg p-3 space-y-1.5">
                  <div className="text-[10.5px] font-mono font-bold text-cyan-400 uppercase">
                    Metallurgy &amp; Superalloys
                  </div>
                  <div className="text-[11.5px] text-zinc-200 font-semibold">
                    CMSX-4 Single Crystal Superalloy / Inconel 718
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-500">Microstructural Physics:</strong> High dislocation creep resistance under cyclic thermal fatigue.
                  </div>
                </div>

                <div className="bg-[#090e18] border border-white/[0.07] rounded-lg p-3 space-y-2">
                  <div className="text-[10.5px] font-mono font-bold text-amber-400 uppercase">
                    Thermodynamics &amp; Aerodynamics
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-zinc-500 text-[9.5px]">GAS TEMP:</span>
                      <div className="text-cyan-300 font-bold">{Math.round(480 + throttle * 1.8)} °C</div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[9.5px]">CYCLE RATIO:</span>
                      <div className="text-cyan-300 font-bold">OPR {opr} : 1</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#090e18] border border-cyan-500/30 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                      TAP SENSOR: {selectedSensor.toUpperCase()}
                    </span>
                    <span className="text-[9.5px] font-mono font-bold text-emerald-400">NOMINAL OK</span>
                  </div>
                  <div className="text-[12px] font-bold text-white">
                    {currentEngineMeta.label} ({currentEngineMeta.station})
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-snug">{currentEngineMeta.description}</div>
                  <div className="text-[10px] font-mono text-cyan-300 pt-1">
                    Nominal Range: <strong>{currentEngineMeta.nominal}</strong>
                  </div>
                </div>

                {/* Real-Time Fault Injection Triggers */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10.5px] font-mono font-bold text-zinc-400 uppercase">
                    Real-Time Fault Injection Triggers
                  </div>
                  <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                    <button
                      onClick={() => {
                        setActiveFault(activeFault === 'fault_tip_rub' ? null : 'fault_tip_rub');
                        setSelectedSensor('s7');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                        activeFault === 'fault_tip_rub'
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 font-bold'
                          : 'border-white/[0.06] bg-[#0c101a] text-zinc-400 hover:text-white hover:border-white/[0.12]'
                      }`}
                    >
                      <span>HPC Blade Tip Rub</span>
                      <span className="text-[9px] opacity-75">STA 3.0</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveFault(activeFault === 'fault_tbc' ? null : 'fault_tbc');
                        setSelectedSensor('s4');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                        activeFault === 'fault_tbc'
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 font-bold'
                          : 'border-white/[0.06] bg-[#0c101a] text-zinc-400 hover:text-white hover:border-white/[0.12]'
                      }`}
                    >
                      <span>TBC Ceramic Spallation</span>
                      <span className="text-[9px] opacity-75">STA 4.5</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveFault(activeFault === 'fault_nozzle_coking' ? null : 'fault_nozzle_coking');
                        setSelectedSensor('s12');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                        activeFault === 'fault_nozzle_coking'
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 font-bold'
                          : 'border-white/[0.06] bg-[#0c101a] text-zinc-400 hover:text-white hover:border-white/[0.12]'
                      }`}
                    >
                      <span>Fuel Nozzle Coke Caking</span>
                      <span className="text-[9px] opacity-75">STA 3.5</span>
                    </button>

                    <button
                      onClick={() => setActiveFault(null)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                        !activeFault
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                          : 'border-white/[0.06] bg-[#0c101a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Clear Faults / Nominal</span>
                      <span className="text-[9px] opacity-75">RESET</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
