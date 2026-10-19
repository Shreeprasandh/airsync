"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { PlaneData, EngineData, HUB_COORDINATES } from "@/app/page";
import { ZoomIn, ZoomOut, Maximize2, LocateFixed } from "lucide-react";

// Aerospace Geodesic Math: Great Circle Interpolation & Bearing
function calculateGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPoints: number = 30
): [number, number][] {
  const points: [number, number][] = [];
  const φ1 = (lat1 * Math.PI) / 180;
  const λ1 = (lon1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const λ2 = (lon2 * Math.PI) / 180;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((φ2 - φ1) / 2), 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ2 - λ1) / 2), 2)
    )
  );

  if (d < 1e-6) {
    return [[lat1, lon1], [lat2, lon2]];
  }

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    points.push([(lat * 180) / Math.PI, (lon * 180) / Math.PI]);
  }

  return points;
}

function interpolateLatLonAndHeading(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  t: number
): { lat: number; lon: number; heading: number } {
  const φ1 = (lat1 * Math.PI) / 180;
  const λ1 = (lon1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const λ2 = (lon2 * Math.PI) / 180;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((φ2 - φ1) / 2), 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ2 - λ1) / 2), 2)
    )
  );

  if (d < 1e-6) {
    return { lat: lat1, lon: lon1, heading: 0 };
  }

  const clampedT = Math.max(0, Math.min(1, t));
  const A = Math.sin((1 - clampedT) * d) / Math.sin(d);
  const B = Math.sin(clampedT * d) / Math.sin(d);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ = Math.atan2(y, x);

  // Bearing calculation towards destination
  const yB = Math.sin(λ2 - λ) * Math.cos(φ2);
  const xB = Math.cos(φ) * Math.sin(φ2) - Math.sin(φ) * Math.cos(φ2) * Math.cos(λ2 - λ);
  const bearing = (Math.atan2(yB, xB) * 180 / Math.PI + 360) % 360;

  return {
    lat: (φ * 180) / Math.PI,
    lon: (λ * 180) / Math.PI,
    heading: Math.round(bearing)
  };
}

export interface TacticalAirspaceMapProps {
  selectedHangar: string | null;
  planes: Record<string, PlaneData>;
  engines: Record<string, EngineData>;
  hoveredPlaneId: string | null;
  setHoveredPlaneId: (id: string | null) => void;
  lastHoveredPlaneId: string;
  setLastHoveredPlaneId: (id: string) => void;
  setSelectedPlaneId: (id: string | null) => void;
  setViewState: (v: 'login' | 'hangar-select' | 'dashboard' | 'asset-detail' | 'sentinel-gate') => void;
  activeHudPlaneId: string;
}

export default function TacticalAirspaceMap({
  selectedHangar,
  planes,
  engines,
  hoveredPlaneId,
  setHoveredPlaneId,
  lastHoveredPlaneId,
  setLastHoveredPlaneId,
  setSelectedPlaneId,
  setViewState,
}: TacticalAirspaceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerGroupRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Resolve active hangar center coordinates
  const activeStationKey = selectedHangar === "hangar-02" ? "DEL" : selectedHangar === "hangar-03" ? "LHR" : "BLR";
  const activeHub = HUB_COORDINATES[activeStationKey] || HUB_COORDINATES["BLR"];

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import("leaflet");

      if (!isMounted || !mapContainerRef.current) return;

      // Create map centered on active station
      const map = L.map(mapContainerRef.current, {
        center: [activeHub.lat, activeHub.lon],
        zoom: 4,
        minZoom: 2,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // ESRI World Dark Gray Base (100% Free, Zero API Keys, Aerospace Dark Standard)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16
        }
      ).addTo(map);

      // ESRI World Dark Gray Reference Layer (Boundaries, Coastlines, Geographic Labels)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16,
          opacity: 0.85
        }
      ).addTo(map);

      // Layer group for dynamic operational overlays
      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
      setIsMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Center map when active selected hangar changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    mapInstanceRef.current.panTo([activeHub.lat, activeHub.lon], {
      animate: true,
      duration: 1.0
    });
  }, [activeStationKey, activeHub.lat, activeHub.lon, isMapReady]);

  // 3. Render Dynamic Aerospace Overlays (Airports, Range Rings, Flight Paths, Planes)
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !isMapReady) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let L: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      L = require("leaflet");
    } catch {
      return;
    }

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // A. Range Rings on Active Station (250 NM and 500 NM)
    // 1 NM = 1852 meters
    const range250m = 250 * 1852;
    const range500m = 500 * 1852;

    L.circle([activeHub.lat, activeHub.lon], {
      radius: range250m,
      color: "#06b6d4",
      weight: 1,
      dashArray: "4,6",
      fillColor: "#06b6d4",
      fillOpacity: 0.02
    }).addTo(layerGroup);

    L.circle([activeHub.lat, activeHub.lon], {
      radius: range500m,
      color: "#06b6d4",
      weight: 0.7,
      dashArray: "3,7",
      fillColor: "#06b6d4",
      fillOpacity: 0.01
    }).addTo(layerGroup);

    // B. Airport Waypoint Nodes
    Object.keys(HUB_COORDINATES).forEach(key => {
      const hub = HUB_COORDINATES[key];
      const isSelectedHub = key === activeStationKey;

      const airportHtml = `
        <div class="relative flex items-center justify-center w-4 h-4 cursor-pointer">
          <div class="flex items-center justify-center w-full h-full rounded-full ${
            isSelectedHub
              ? "bg-cyan-500/25 border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
              : "bg-zinc-800/90 border border-zinc-500"
          }">
            <div class="${
              isSelectedHub
                ? "w-2 h-2 rounded-full bg-cyan-400"
                : "w-1.5 h-1.5 rounded-full bg-zinc-300"
            }"></div>
          </div>
          <!-- Real Airport ICAO Tag anchored underneath -->
          <div class="absolute top-[18px] left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-950/95 border ${
            isSelectedHub ? "border-cyan-500/60 text-cyan-300 font-bold" : "border-zinc-800 text-zinc-400"
          } font-mono text-[8px] whitespace-nowrap shadow-lg pointer-events-none">
            ${hub.icao}
          </div>
        </div>
      `;

      const airportIcon = L.divIcon({
        className: "custom-airport-marker",
        html: airportHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([hub.lat, hub.lon], { icon: airportIcon });
      marker.bindTooltip(
        `<div class="font-mono text-[10px] text-zinc-200"><strong>${hub.name}</strong><br/><span class="text-zinc-400">${hub.lat.toFixed(4)}°N, ${hub.lon.toFixed(4)}°E</span></div>`,
        { className: "custom-leaflet-tooltip", direction: "top", offset: [0, -10] }
      );
      marker.addTo(layerGroup);
    });

    // C. Flight Corridors (High-Resolution Great Circle Geodesic Routes)
    Object.values(planes).forEach(plane => {
      const orig = HUB_COORDINATES[plane.origin];
      const dest = HUB_COORDINATES[plane.destination];
      if (!orig || !dest) return;

      const isHovered = hoveredPlaneId === plane.id || lastHoveredPlaneId === plane.id;
      const arcPoints = calculateGreatCircle(orig.lat, orig.lon, dest.lat, dest.lon, 60);

      const routePolyline = L.polyline(arcPoints, {
        color: isHovered ? "#10b981" : "#0284c7",
        weight: isHovered ? 2.5 : 1.2,
        dashArray: isHovered ? undefined : "5,6",
        opacity: isHovered ? 0.95 : 0.45
      });

      routePolyline.on("mouseover", () => {
        setHoveredPlaneId(plane.id);
        setLastHoveredPlaneId(plane.id);
      });
      routePolyline.on("mouseout", () => setHoveredPlaneId(null));
      routePolyline.addTo(layerGroup);
    });

    // D. Moving Airborne Aircraft (True GPS Geodesic Interpolation + True Bearing Rotation)
    Object.values(planes).forEach(plane => {
      if (plane.status !== "Airborne") return;
      const orig = HUB_COORDINATES[plane.origin];
      const dest = HUB_COORDINATES[plane.destination];
      if (!orig || !dest) return;

      const t = plane.progress / 100;
      const { lat, lon, heading } = interpolateLatLonAndHeading(
        orig.lat,
        orig.lon,
        dest.lat,
        dest.lon,
        t
      );

      const isHovered = hoveredPlaneId === plane.id || lastHoveredPlaneId === plane.id;
      const engineHealth = engines[plane.engines[0]]?.health ?? 1.0;

      let planeColor = "#34d399"; // emerald
      let badgeBorder = "border-emerald-500/40 text-emerald-300";
      if (engineHealth < 0.35) {
        planeColor = "#ef4444"; // red
        badgeBorder = "border-red-500/50 text-red-300";
      } else if (engineHealth < 0.75) {
        planeColor = "#f59e0b"; // amber
        badgeBorder = "border-amber-500/50 text-amber-300";
      } else if (isHovered) {
        planeColor = "#22d3ee"; // cyan
        badgeBorder = "border-cyan-400 text-cyan-200";
      }

      // Authentic Aircraft Silhouette SVG Icon - Anchored 100% on the Flight Path
      const planeHtml = `
        <div class="relative flex items-center justify-center w-[26px] h-[26px] cursor-pointer">
          <!-- Aircraft Heading SVG Centered on Coordinates -->
          <div style="transform: rotate(${heading}deg); transform-origin: 13px 13px;" class="flex items-center justify-center w-full h-full filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="${planeColor}" stroke="#090d16" stroke-width="1.2">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <!-- Callsign & Flight Level Badge Anchored Directly Underneath -->
          <div class="absolute top-[28px] left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-950/95 border ${badgeBorder} font-mono text-[8px] font-bold whitespace-nowrap shadow-xl pointer-events-none">
            ${plane.name.split(" - ")[1] || plane.id} • FL${Math.round(plane.altitude / 1000) * 10}
          </div>
        </div>
      `;

      const planeIcon = L.divIcon({
        className: "custom-plane-marker",
        html: planeHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const planeMarker = L.marker([lat, lon], { icon: planeIcon });

      planeMarker.on("mouseover", () => {
        setHoveredPlaneId(plane.id);
        setLastHoveredPlaneId(plane.id);
      });
      planeMarker.on("mouseout", () => setHoveredPlaneId(null));
      planeMarker.on("click", () => {
        setSelectedPlaneId(plane.id);
        setViewState("asset-detail");
      });

      planeMarker.addTo(layerGroup);
    });

  }, [
    isMapReady,
    activeHub,
    activeStationKey,
    planes,
    engines,
    hoveredPlaneId,
    lastHoveredPlaneId,
    setHoveredPlaneId,
    setLastHoveredPlaneId,
    setSelectedPlaneId,
    setViewState
  ]);

  // Map Controls Helpers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleFocusStation = () => {
    mapInstanceRef.current?.setView([activeHub.lat, activeHub.lon], 5, { animate: true });
  };
  const handleFitFleet = () => {
    if (!mapInstanceRef.current) return;
    const lats = Object.values(HUB_COORDINATES).map(h => h.lat);
    const lons = Object.values(HUB_COORDINATES).map(h => h.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    mapInstanceRef.current.fitBounds([
      [minLat - 4, minLon - 5],
      [maxLat + 4, maxLon + 5]
    ], { animate: true, padding: [30, 30] });
  };

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-[#070a13] border border-white/[0.08] select-none">
      {/* Map Container Target */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Tactical Map Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col space-y-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg bg-[#0c0f17]/90 hover:bg-[#141b2a] border border-white/[0.1] text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg bg-[#0c0f17]/90 hover:bg-[#141b2a] border border-white/[0.1] text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleFocusStation}
          title="Center on Station"
          className="p-1.5 rounded-lg bg-[#0c0f17]/90 hover:bg-[#141b2a] border border-white/[0.1] text-cyan-400 hover:text-cyan-300 transition-all shadow-lg cursor-pointer"
        >
          <LocateFixed className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleFitFleet}
          title="Fit All Fleet Routes"
          className="p-1.5 rounded-lg bg-[#0c0f17]/90 hover:bg-[#141b2a] border border-white/[0.1] text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Live Map Legend & Mode Banner */}
      <div className="absolute bottom-2 left-2 z-[400] px-2.5 py-1 rounded-md bg-[#080b12]/90 border border-white/[0.08] backdrop-blur-sm flex items-center space-x-3 text-[9px] font-mono text-zinc-400">
        <span className="flex items-center space-x-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span className="text-zinc-200 font-bold">{activeStationKey} HUB</span>
        </span>
        <span className="text-zinc-600">|</span>
        <span className="flex items-center space-x-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-zinc-300">ADS-B AIRBORNE</span>
        </span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-500">250/500 NM RADIALS</span>
      </div>

      {/* Permanently suppress any Leaflet attribution bar or watermark */}
      <style>{`
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
