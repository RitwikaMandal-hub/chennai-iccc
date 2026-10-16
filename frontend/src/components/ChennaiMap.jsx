import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  Circle,
  CircleMarker,
  Tooltip,
} from "react-leaflet";

import { useEffect, useState } from "react";
import { io } from "../lib/socket";
import { API_URL, SOCKET_URL } from "../lib/config";
import L from "leaflet";

import "leaflet/dist/leaflet.css";



/* =========================================================
   2.5D VISUAL SYSTEM
   ========================================================= */

const mapStyles = `
  .digital-twin-map {
    filter: saturate(1.12) contrast(1.06) brightness(0.92);
  }

  .digital-twin-map .leaflet-tile-pane {
    filter: brightness(1.35) contrast(1.1) sepia(0.25) hue-rotate(170deg) saturate(1.6);
  }

  .leaflet-overlay-pane { filter: saturate(1.12) contrast(1.04); }

  .road-depth { filter: drop-shadow(0 5px 4px rgba(0,0,0,0.72)); }
  .road-glow { filter: drop-shadow(0 0 5px currentColor) drop-shadow(0 0 12px currentColor); }
  .map-scanline { animation: scanSweep 7s linear infinite; }
  .map-hud-pulse { animation: hudPulse 2.8s ease-in-out infinite; }

  .traffic-flow-line {
    animation: trafficFlow 2.8s linear infinite;
  }

  .zone-boundary-glow {
    filter: drop-shadow(0 0 7px currentColor);
  }

  .zone-label {
    background: rgba(2, 6, 23, 0.78);
    border: 1px solid rgba(148, 163, 184, 0.22);
    color: #e2e8f0;
    border-radius: 999px;
    padding: 3px 7px;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.12em;
    box-shadow: 0 0 16px rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(6px);
  }

  @keyframes scanSweep {
    0% { transform: translateY(-35%); opacity: 0; }
    12% { opacity: 0.22; }
    50% { opacity: 0.08; }
    88% { opacity: 0.18; }
    100% { transform: translateY(560%); opacity: 0; }
  }

  @keyframes hudPulse { 0%,100% { opacity: .72; } 50% { opacity: 1; } }

  @keyframes trafficFlow {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: -80; }
  }

  .leaflet-container {
    background: #020617 !important;
    font-family: Inter, system-ui, sans-serif;
  }

  .leaflet-control-zoom {
    border: 1px solid rgba(56,189,248,0.25) !important;
    box-shadow: 0 0 20px rgba(14,165,233,0.12) !important;
  }

  .leaflet-control-zoom a {
    background: rgba(2,6,23,0.92) !important;
    color: #bae6fd !important;
    border-color: rgba(56,189,248,0.18) !important;
  }

  .leaflet-control-zoom a:hover {
    background: rgba(8,47,73,0.95) !important;
    color: white !important;
  }

  .leaflet-popup-content-wrapper,
  .leaflet-popup-tip {
    background: rgba(2,6,23,0.96) !important;
    color: #e2e8f0 !important;
    border: 1px solid rgba(56,189,248,0.25);
    box-shadow:
      0 0 25px rgba(14,165,233,0.14),
      0 12px 30px rgba(0,0,0,0.45);
  }

  .leaflet-popup-content {
    margin: 14px !important;
  }

  .leaflet-popup-close-button {
    color: #94a3b8 !important;
  }

  .vehicle-marker,
  .junction-marker,
  .signal-marker,
  .incident-marker,
  .sensor-marker,
  .ewaste-marker {
    background: transparent !important;
    border: none !important;
  }

  .vehicle-2d {
    transition: transform 0.35s ease;
  }

  .vehicle-2d:hover {
    transform: scale(1.2);
  }

  .vehicle-trail {
  animation: vehicleTrail 1.15s ease-in-out infinite;
  transform-origin: right center;
}

  .sensor-pulse {
    animation: sensorPulse 2s ease-out infinite;
  }

  .incident-ripple {
    animation: incidentRipple 1.7s ease-out infinite;
  }

  .incident-core {
    animation: incidentCore 1.1s ease-in-out infinite;
  }

  .signal-glow {
    animation: signalGlow 1.6s ease-in-out infinite;
  }

  .ewaste-pulse {
    animation: ewastePulse 2.2s ease-in-out infinite;
  }

  .junction-ring {
    animation: junctionRing 2.4s ease-out infinite;
  }

  .floating-label {
    animation: floatingLabel 2.8s ease-in-out infinite;
  }

  @keyframes vehicleTrail {
  0% {
    opacity: 0.35;
    transform: translateX(8px) scaleX(0.55);
  }

  50% {
    opacity: 0.9;
    transform: translateX(-2px) scaleX(1);
  }

  100% {
    opacity: 0.35;
    transform: translateX(8px) scaleX(0.55);
  }
}

  @keyframes sensorPulse {
    0% {
      transform: scale(0.65);
      opacity: 0.75;
    }
    70% {
      transform: scale(1.35);
      opacity: 0;
    }
    100% {
      transform: scale(1.35);
      opacity: 0;
    }
  }

  @keyframes incidentRipple {
    0% {
      transform: scale(0.55);
      opacity: 0.8;
    }
    75% {
      transform: scale(1.65);
      opacity: 0;
    }
    100% {
      transform: scale(1.65);
      opacity: 0;
    }
  }

  @keyframes incidentCore {
    0%, 100% {
      transform: scale(1);
      box-shadow:
        0 0 10px rgba(239,68,68,0.8),
        0 0 25px rgba(239,68,68,0.45);
    }
    50% {
      transform: scale(1.12);
      box-shadow:
        0 0 15px rgba(239,68,68,1),
        0 0 38px rgba(239,68,68,0.7);
    }
  }

  @keyframes signalGlow {
    0%, 100% {
      box-shadow:
        0 0 8px rgba(0,0,0,0.9),
        0 0 12px currentColor;
    }
    50% {
      box-shadow:
        0 0 12px rgba(0,0,0,0.9),
        0 0 25px currentColor;
    }
  }

  @keyframes ewastePulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.9;
    }
    50% {
      transform: scale(1.08);
      opacity: 1;
    }
  }

  @keyframes junctionRing {
    0% {
      transform: scale(0.7);
      opacity: 0.65;
    }
    70% {
      transform: scale(1.4);
      opacity: 0;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  @keyframes floatingLabel {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .vehicle-trail,
    .sensor-pulse,
    .incident-ripple,
    .incident-core,
    .signal-glow,
    .ewaste-pulse,
    .junction-ring,
    .floating-label {
      animation: none !important;
    }
  }
`;


/* =========================================================
   VEHICLE ICON
   ========================================================= */

function getVehicleIcon(vehicleType) {
  let emoji = "🚗";
  let glow = "#38bdf8";
  let label = "CAR";

  if (vehicleType === "BUS") {
    emoji = "🚌";
    glow = "#facc15";
    label = "BUS";
  }

  if (vehicleType === "AMBULANCE") {
    emoji = "🚑";
    glow = "#fb7185";
    label = "EMS";
  }

  return L.divIcon({
    className: "vehicle-marker",

    html: `
      <div
        style="
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >

        <div
  class="vehicle-trail"
  style="
    position: absolute;
    left: -14px;
    width: 48px;
    height: 9px;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${glow}33 30%,
      ${glow}99 70%,
      ${glow} 100%
    );
    filter: blur(4px);
    opacity: 0.75;
    transform: skewX(-18deg);
  "
></div>

        <div
          class="vehicle-2d"
          style="
            position: relative;
            z-index: 2;
            width: 34px;
            height: 34px;
            border-radius: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(2,6,23,0.92);
            border: 1px solid ${glow};
            box-shadow:
              0 0 8px ${glow},
              0 0 20px ${glow}66,
              0 5px 12px rgba(0,0,0,0.7);
            font-size: 20px;
          "
        >
          ${emoji}
        </div>

        <div
          style="
            position: absolute;
            bottom: -7px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(2,6,23,0.9);
            border: 1px solid ${glow}55;
            color: #cbd5e1;
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.08em;
          "
        >
          ${label}
        </div>

      </div>
    `,

    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}


/* =========================================================
   JUNCTION ICON
   ========================================================= */

function getJunctionIcon(status) {
  let background = "#22c55e";
  let border = "#86efac";

  if (status === "CONGESTED") {
    background = "#f59e0b";
    border = "#fde68a";
  }

  if (status === "CRITICAL") {
    background = "#ef4444";
    border = "#fecaca";
  }

  return L.divIcon({
    className: "junction-marker",

    html: `
      <div
        style="
          position: relative;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >

        <div
          class="junction-ring"
          style="
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 2px solid ${background};
            opacity: 0.6;
          "
        ></div>

        <div
          style="
            position: relative;
            z-index: 2;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: ${background};
            border: 3px solid ${border};
            box-shadow:
              0 0 10px ${background},
              0 0 22px ${background},
              0 4px 9px rgba(0,0,0,0.8);
          "
        ></div>

      </div>
    `,

    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}


/* =========================================================
   TRAFFIC SIGNAL ICON
   ========================================================= */

function getSignalIcon(signalStatus) {
  let lightColor = "#22c55e";

  if (signalStatus === "RED") {
    lightColor = "#ef4444";
  }

  if (signalStatus === "YELLOW") {
    lightColor = "#f59e0b";
  }

  return L.divIcon({
    className: "signal-marker",

    html: `
      <div
        style="
          position: relative;
          width: 40px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >

        <div
          class="signal-glow"
          style="
            position: absolute;
            width: 34px;
            height: 45px;
            border-radius: 10px;
            color: ${lightColor};
          "
        ></div>

        <div
          style="
            position: relative;
            z-index: 2;
            width: 27px;
            height: 39px;
            border-radius: 8px;
            background: #020617;
            border: 2px solid #64748b;
            display: flex;
            align-items: center;
            justify-content: center;
          "
        >

          <div
            style="
              width: 13px;
              height: 13px;
              border-radius: 50%;
              background: ${lightColor};
              box-shadow:
                0 0 8px ${lightColor},
                0 0 18px ${lightColor},
                0 0 30px ${lightColor};
            "
          ></div>

        </div>

      </div>
    `,

    iconSize: [40, 55],
    iconAnchor: [20, 55],
  });
}


/* =========================================================
   INCIDENT ICON
   ========================================================= */

function getIncidentIcon(severity) {
  let color = "#facc15";

  if (severity === "MEDIUM") {
    color = "#fb923c";
  }

  if (severity === "HIGH") {
    color = "#f97316";
  }

  if (severity === "CRITICAL") {
    color = "#ef4444";
  }

  return L.divIcon({
    className: "incident-marker",

    html: `
      <div
        style="
          position: relative;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >

        <div
          class="incident-ripple"
          style="
            position: absolute;
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: 2px solid ${color};
          "
        ></div>

        <div
          class="incident-core"
          style="
            position: relative;
            z-index: 2;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: rgba(127,29,29,0.95);
            border: 2px solid ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 17px;
          "
        >
          🚨
        </div>

        <div
          style="
            position: absolute;
            bottom: -3px;
            white-space: nowrap;
            padding: 3px 7px;
            border-radius: 5px;
            background: rgba(2,6,23,0.94);
            border: 1px solid ${color}66;
            color: ${color};
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0.06em;
          "
        >
          ${severity || "ALERT"}
        </div>

      </div>
    `,

    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });
}


/* =========================================================
   SENSOR ICON
   ========================================================= */

function getSensorIcon(sensorType) {
  let color = "#38bdf8";
  let symbol = "●";

  const type = String(sensorType || "").toUpperCase();

  if (
    type.includes("FLOOD") ||
    type.includes("WATER")
  ) {
    color = "#22d3ee";
    symbol = "≈";
  } else if (
    type.includes("AIR") ||
    type.includes("AQI")
  ) {
    color = "#a78bfa";
    symbol = "◈";
  } else if (
    type.includes("TRAFFIC")
  ) {
    color = "#facc15";
    symbol = "◆";
  }

  return L.divIcon({
    className: "sensor-marker",

    html: `
      <div
        style="
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >

        <div
          class="sensor-pulse"
          style="
            position: absolute;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 2px solid ${color};
            box-shadow: 0 0 14px ${color};
          "
        ></div>

        <div
          style="
            position: relative;
            z-index: 2;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${color};
            color: #020617;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 900;
            box-shadow:
              0 0 8px ${color},
              0 0 18px ${color};
          "
        >
          ${symbol}
        </div>

      </div>
    `,

    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}


/* =========================================================
   E-WASTE ICON
   ========================================================= */

function getEWasteIcon(status, utilization) {
  let color = "#22c55e";

  if (status === "FILLING") {
    color = "#f59e0b";
  }

  if (
    status === "HIGH" ||
    utilization >= 90
  ) {
    color = "#ef4444";
  }

  return L.divIcon({
    className: "ewaste-marker",

    html: `
      <div
        style="
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >

        <div
          class="ewaste-pulse"
          style="
            position: absolute;
            width: 43px;
            height: 43px;
            border-radius: 50%;
            border: 2px solid ${color};
            box-shadow: 0 0 14px ${color};
            opacity: 0.55;
          "
        ></div>

        <div
          style="
            position: relative;
            z-index: 2;
            width: 31px;
            height: 31px;
            border-radius: 50%;
            background: rgba(2,6,23,0.95);
            border: 2px solid ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow:
              0 0 10px ${color},
              0 0 22px ${color}77;
          "
        >
          ♻️
        </div>

      </div>
    `,

    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}


/* =========================================================
   ZONE STYLES
   ========================================================= */

function getZoneStyle(zone) {
  const risk =
    String(zone.risk_level || "").toUpperCase();

  if (
    risk === "HIGH" ||
    risk === "CRITICAL"
  ) {
    return {
      color: "#ff4d5e",
      fillColor: "#ef4444",
      weight: 2.5,
      opacity: 0.92,
      fillOpacity: 0.28,
      dashArray: "6 8",
    };
  }

  if (risk === "MEDIUM") {
    return {
      color: "#ffb020",
      fillColor: "#f59e0b",
      weight: 2.5,
      opacity: 0.88,
      fillOpacity: 0.23,
      dashArray: "6 8",
    };
  }

  return {
    color: "#35e58a",
    fillColor: "#22c55e",
    weight: 2.5,
    opacity: 0.82,
    fillOpacity: 0.19,
    dashArray: "6 8",
  };
}


/* =========================================================
   ROAD COLOR
   ========================================================= */

function getRoadColor(trafficLevel) {
  const traffic = Number(trafficLevel);

  if (traffic >= 75) {
    return "#ef4444";
  }

  if (traffic >= 55) {
    return "#f59e0b";
  }

  return "#22c55e";
}


/* =========================================================
   FLOOD SENSOR CHECK
   ========================================================= */

function isFloodSensor(sensor) {
  const type = String(
    sensor.sensor_type || ""
  ).toUpperCase();

  return (
    type.includes("FLOOD") ||
    type.includes("WATER")
  );
}


/* =========================================================
   MAP COMPONENT
   ========================================================= */

function ChennaiMap({ showHud = true }) {
  const [zones, setZones] = useState([]);
  const [roads, setRoads] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [eWastePoints, setEWastePoints] =
    useState([]);

  const [liveVehicles, setLiveVehicles] =
    useState([]);

  const [liveSignals, setLiveSignals] =
    useState([]);

  const [liveIncidents, setLiveIncidents] =
    useState([]);

  /* =======================================================
     LOAD STATIC DATA
     ======================================================= */

  useEffect(() => {
    fetch(`${API_URL}/api/zones`)
      .then((response) => response.json())
      .then((data) => setZones(data))
      .catch((error) =>
        console.error(
          "Zones API error:",
          error
        )
      );

    fetch(`${API_URL}/api/roads`)
      .then((response) => response.json())
      .then((data) => setRoads(data))
      .catch((error) =>
        console.error(
          "Roads API error:",
          error
        )
      );

    fetch(`${API_URL}/api/junctions`)
      .then((response) => response.json())
      .then((data) => setJunctions(data))
      .catch((error) =>
        console.error(
          "Junctions API error:",
          error
        )
      );

    fetch(`${API_URL}/api/sensors`)
      .then((response) => response.json())
      .then((data) => setSensors(data))
      .catch((error) =>
        console.error(
          "Sensors API error:",
          error
        )
      );

    fetch(`${API_URL}/api/e-waste`)
      .then((response) => response.json())
      .then((data) => {
        setEWastePoints(data);
      })
      .catch((error) =>
        console.error(
          "E-waste API error:",
          error
        )
      );
  }, []);


  /* =======================================================
     SOCKET.IO LIVE DATA
     ======================================================= */

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on(
      "simulation-update",
      (data) => {

        if (data.e_waste) {
          setEWastePoints(
            data.e_waste
          );
        }

        if (data.vehicles) {
          setLiveVehicles(
            data.vehicles
          );
        }

        if (data.signals) {
          setLiveSignals(
            data.signals
          );
        }

        if (data.incidents) {
          setLiveIncidents(
            data.incidents
          );
        }

        if (data.junctions) {
          setJunctions(
            (previous) =>
              previous.map(
                (junction) => {

                  const live =
                    data.junctions.find(
                      (item) =>
                        item.junction_id ===
                        junction.junction_id
                    );

                  if (!live) {
                    return junction;
                  }

                  return {
                    ...junction,
                    traffic_level:
                      live.traffic_level,
                    congestion_level:
                      live.congestion_level,
                    status:
                      live.status,
                  };
                }
              )
          );
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);


  return (
    <div
      className="
        relative
        h-full
        w-full
        overflow-hidden
      "
    >

      <style>{mapStyles}</style>

      {/* ==================================================
          DIGITAL TWIN ATMOSPHERE
          ================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-[500]
          bg-[radial-gradient(circle_at_center,transparent_28%,rgba(2,6,23,0.30)_72%,rgba(2,6,23,0.58)_100%)]
        "
      />

      <div
        className="pointer-events-none absolute inset-0 z-[501] opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.10) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(circle at center, black 20%, transparent 88%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 20%, transparent 88%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[502] opacity-[0.07]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.12) 4px)",
        }}
      />

      <div className="map-scanline pointer-events-none absolute left-0 right-0 top-0 z-[503] h-24 bg-gradient-to-b from-transparent via-cyan-300/10 to-transparent blur-sm" />
      <div className="pointer-events-none absolute left-3 top-3 z-[504] h-14 w-14 border-l border-t border-cyan-300/30" />
      <div className="pointer-events-none absolute right-3 top-3 z-[504] h-14 w-14 border-r border-t border-cyan-300/30" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[504] h-14 w-14 border-b border-l border-cyan-300/20" />
      <div className="pointer-events-none absolute bottom-3 right-3 z-[504] h-14 w-14 border-b border-r border-cyan-300/20" />

      <MapContainer
        center={[
          13.035,
          80.236,
        ]}
        zoom={12}
        scrollWheelZoom={true}
        className="
          digital-twin-map
          h-full
          w-full
        "
      >

        {/* ==================================================
            MAP TILES
            ================================================== */}

        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />


        {/* ==================================================
            CITY ZONES
            ================================================== */}

        {zones.map((zone) => {

          const geometry =
            typeof zone.geometry ===
            "string"
              ? JSON.parse(
                  zone.geometry
                )
              : zone.geometry;

          if (
            !geometry ||
            !geometry.coordinates
          ) {
            return null;
          }

          const coordinates =
            geometry.coordinates[0].map(
              (point) => [
                point[1],
                point[0],
              ]
            );

          const zoneStyle = getZoneStyle(zone);

          const zoneColor = zoneStyle.color;

          const center = coordinates.reduce(
            (sum, point) => [
              sum[0] + point[0],
              sum[1] + point[1],
            ],
            [0, 0]
          );

          center[0] /= coordinates.length;
          center[1] /= coordinates.length;

          return (
            <div key={`zone-group-${zone.zone_id}`}>
              <Polygon
                positions={coordinates}
                pathOptions={{
                  ...zoneStyle,
                  color: zoneColor,
                  weight: 9,
                  opacity: 0.30,
                  fillOpacity: 0,
                  className: "zone-boundary-glow",
                }}
              />

              <Polygon
                key={`zone-${zone.zone_id}`}
                positions={coordinates}
                pathOptions={zoneStyle}
              >
                <Tooltip
                  direction="center"
                  permanent
                  className="zone-label"
                  opacity={0.9}
                >
                  {String(zone.zone_name || "ZONE").toUpperCase()}
                </Tooltip>

                <Popup>

                <strong>
                  {zone.zone_name}
                </strong>

                <br />

                Type:{" "}
                {zone.zone_type}

                <br />

                Risk:{" "}
                {zone.risk_level}

                </Popup>
              </Polygon>
            </div>
          );
        })}


        {/* ==================================================
    ROADS — CINEMATIC 2.5D NETWORK
    ================================================== */}

{roads.map((road) => {

  const geometry =
    typeof road.geometry === "string"
      ? JSON.parse(road.geometry)
      : road.geometry;

  if (
    !geometry ||
    !geometry.coordinates
  ) {
    return null;
  }

  const coordinates =
    geometry.coordinates.map(
      (point) => [
        point[1],
        point[0],
      ]
    );

  const traffic =
    Number(road.traffic_level) || 0;

  const roadColor =
    getRoadColor(traffic);

  /*
   * Higher traffic = brighter / thicker
   * visual corridor.
   */
  const glowOpacity =
    traffic >= 75
      ? 0.42
      : traffic >= 55
        ? 0.32
        : 0.24;

  return (
    <div
      key={`road-group-${road.road_id}`}
    >

      {/* ==========================================
          1. DEEP ROAD SHADOW
          Creates physical separation from map
          ========================================== */}

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: "#000000",
          weight: 16,
          opacity: 0.85,
          lineCap: "round",
          lineJoin: "round",
        }}
      />


      {/* ==========================================
          2. WIDE AMBIENT GLOW
          ========================================== */}

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: roadColor,
          weight: 15,
          opacity: glowOpacity,
          lineCap: "round",
          lineJoin: "round",
          className: "road-glow",
        }}
      />


      {/* ==========================================
          3. DARK ROAD BODY
          ========================================== */}

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: "#0f172a",
          weight: 9,
          opacity: 0.98,
          lineCap: "round",
          lineJoin: "round",
        }}
      />


      {/* ==========================================
          4. TRAFFIC-COLORED ROAD CORE
          ========================================== */}

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: roadColor,
          weight:
            traffic >= 75
              ? 5
              : traffic >= 55
                ? 4.5
                : 4,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }}
      />


      {/* ==========================================
          5. FUTURISTIC CENTER REFLECTION
          ========================================== */}

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: "#ffffff",
          weight: 1,
          opacity: 0.22,
          lineCap: "round",
          dashArray: "2 14",
        }}
      />


      {/* ==========================================
          6. MOVING TRAFFIC FLOW
          ========================================== */}

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: "#ffffff",
          weight: 1.8,
          opacity: 0.85,
          lineCap: "round",
          dashArray: "2 18",
          className: "traffic-flow-line",
        }}
      >

        <Popup>

          <div style={{ minWidth: "190px" }}>

            <strong
              style={{
                color: roadColor,
                fontSize: "14px",
              }}
            >
              🛣️ {road.road_name}
            </strong>

            <br />
            <br />

            Type:{" "}
            {road.road_type}

            <br />

            Speed Limit:{" "}
            {road.speed_limit}

            <br />

            Traffic Level:{" "}
            <strong
              style={{
                color: roadColor,
              }}
            >
              {traffic}%
            </strong>

            <br />

            Status:{" "}
            <strong>
              {traffic >= 75
                ? "CRITICAL"
                : traffic >= 55
                  ? "CONGESTED"
                  : "NORMAL"}
            </strong>

          </div>

        </Popup>

      </Polyline>

    </div>
  );
})}


        {/* ==================================================
            JUNCTIONS — GLOWING CITY NODES
            ================================================== */}

        {junctions.map((junction) => {

          const geometry =
            typeof junction.geometry ===
            "string"
              ? JSON.parse(
                  junction.geometry
                )
              : junction.geometry;

          if (
            !geometry ||
            !geometry.coordinates
          ) {
            return null;
          }

          const latitude =
            geometry.coordinates[1];

          const longitude =
            geometry.coordinates[0];

          let nodeColor = "#22c55e";

          if (
            junction.status ===
            "CONGESTED"
          ) {
            nodeColor = "#f59e0b";
          }

          if (
            junction.status ===
            "CRITICAL"
          ) {
            nodeColor = "#ef4444";
          }

          return (
            <div
              key={`junction-visual-${junction.junction_id}`}
            >

              <CircleMarker
                center={[
                  latitude,
                  longitude,
                ]}
                radius={22}
                pathOptions={{
                  color: nodeColor,
                  fillColor: nodeColor,
                  fillOpacity: 0.04,
                  opacity: 0.25,
                  weight: 1,
                }}
              />

              <Marker
                key={`junction-${junction.junction_id}`}
                position={[
                  latitude,
                  longitude,
                ]}
                icon={
                  getJunctionIcon(
                    junction.status
                  )
                }
                zIndexOffset={500}
              >

                <Popup>

                  <strong>
                    📍{" "}
                    {junction.junction_name}
                  </strong>

                  <br />

                  Traffic:{" "}
                  {junction.traffic_level}%

                  <br />

                  Congestion:{" "}
                  {junction.congestion_level}%

                  <br />

                  Status:{" "}
                  <strong>
                    {junction.status}
                  </strong>

                </Popup>

              </Marker>

            </div>
          );
        })}


        {/* ==================================================
            SENSORS
            ================================================== */}

        {sensors.map((sensor) => {

          const geometry =
            typeof sensor.geometry ===
            "string"
              ? JSON.parse(
                  sensor.geometry
                )
              : sensor.geometry;

          if (
            !geometry ||
            !geometry.coordinates
          ) {
            return null;
          }

          const latitude =
            geometry.coordinates[1];

          const longitude =
            geometry.coordinates[0];

          const flood =
            isFloodSensor(sensor);

          return (
            <div
              key={`sensor-layer-${sensor.sensor_id}`}
            >

              {flood && (
                <Circle
                  center={[
                    latitude,
                    longitude,
                  ]}
                  radius={250}
                  pathOptions={{
                    color: "#22d3ee",
                    fillColor: "#22d3ee",
                    fillOpacity: 0.035,
                    opacity: 0.25,
                    weight: 1,
                    dashArray: "5 10",
                  }}
                />
              )}

              <Marker
                key={`sensor-${sensor.sensor_id}`}
                position={[
                  latitude,
                  longitude,
                ]}
                icon={getSensorIcon(
                  sensor.sensor_type
                )}
                zIndexOffset={200}
              >

                <Popup>

                  <strong>
                    📡 Smart Sensor
                  </strong>

                  <br />

                  Type:{" "}
                  {sensor.sensor_type}

                  <br />

                  Location:{" "}
                  {sensor.location_name}

                  <br />

                  Status:{" "}
                  {sensor.status}

                </Popup>

              </Marker>

            </div>
          );
        })}


        {/* ==================================================
            E-WASTE
            ================================================== */}

        {eWastePoints.map((point) => {

          const geometry =
            typeof point.geometry ===
            "string"
              ? JSON.parse(
                  point.geometry
                )
              : point.geometry;

          if (
            !geometry ||
            !geometry.coordinates
          ) {
            return null;
          }

          const latitude =
            geometry.coordinates[1];

          const longitude =
            geometry.coordinates[0];

          const capacity =
            Number(
              point.capacity_kg
            );

          const currentLoad =
            Number(
              point.current_load_kg
            );

          const utilization =
            capacity > 0
              ? (currentLoad / capacity) *
                100
              : 0;

          return (
            <Marker
              key={`e-waste-${point.point_id}`}
              position={[
                latitude,
                longitude,
              ]}
              icon={getEWasteIcon(
                point.status,
                utilization
              )}
              zIndexOffset={900}
            >

              <Popup>

                <div
                  style={{
                    minWidth: "210px",
                  }}
                >

                  <strong>
                    ♻️{" "}
                    {point.point_name}
                  </strong>

                  <br />

                  Location:{" "}
                  {point.location_name}

                  <br />

                  Current Load:{" "}
                  {currentLoad.toFixed(0)}
                  {" "}kg

                  <br />

                  Capacity:{" "}
                  {capacity.toFixed(0)}
                  {" "}kg

                  <br />

                  Utilization:{" "}
                  {utilization.toFixed(0)}
                  %

                  <br />

                  Status:{" "}
                  <strong>
                    {point.status}
                  </strong>

                </div>

              </Popup>

            </Marker>
          );
        })}


        {/* ==================================================
            MOVING VEHICLES
            ================================================== */}

        {liveVehicles.map((vehicle) => (

          <Marker
            key={`vehicle-${vehicle.vehicle_id}`}
            position={[
              vehicle.latitude,
              vehicle.longitude,
            ]}
            icon={getVehicleIcon(
              vehicle.vehicle_type
            )}
            zIndexOffset={
              vehicle.vehicle_type ===
              "AMBULANCE"
                ? 1500
                : 700
            }
          >

            <Popup>

              <strong>
                {vehicle.vehicle_type}
              </strong>

              <br />

              Road:{" "}
              {vehicle.road_name}

              <br />

              Traffic:{" "}
              {vehicle.traffic_level}%

              <br />

              Status:{" "}
              {vehicle.status}

            </Popup>

          </Marker>

        ))}


        {/* ==================================================
            TRAFFIC SIGNALS
            ================================================== */}

        {junctions.map((junction) => {

          const geometry =
            typeof junction.geometry ===
            "string"
              ? JSON.parse(
                  junction.geometry
                )
              : junction.geometry;

          if (
            !geometry ||
            !geometry.coordinates
          ) {
            return null;
          }

          const latitude =
            geometry.coordinates[1];

          const longitude =
            geometry.coordinates[0];

          const signal =
            liveSignals.find(
              (item) =>
                item.junction_id ===
                junction.junction_id
            );

          if (!signal) {
            return null;
          }

          return (
            <Marker
              key={`signal-${signal.signal_id}`}
              position={[
                latitude + 0.00045,
                longitude + 0.00045,
              ]}
              icon={getSignalIcon(
                signal.signal_status
              )}
              zIndexOffset={1000}
            >

              <Popup>

                <strong>
                  🚦 Traffic Signal
                </strong>

                <br />

                Junction:{" "}
                {junction.junction_name}

                <br />

                Signal ID:{" "}
                {signal.signal_id}

                <br />

                Status:{" "}
                <strong>
                  {signal.signal_status}
                </strong>

                <br />

                Green Duration:{" "}
                {signal.green_duration}
                {" "}seconds

                <br />

                Red Duration:{" "}
                {signal.red_duration}
                {" "}seconds

                <br />

                Congestion:{" "}
                {signal.congestion_level}%

              </Popup>

            </Marker>
          );
        })}


        {/* ==================================================
            LIVE INCIDENTS
            ================================================== */}

        {liveIncidents.map((incident) => {

          const geometry =
            typeof incident.geometry ===
            "string"
              ? JSON.parse(
                  incident.geometry
                )
              : incident.geometry;

          if (
            !geometry ||
            !geometry.coordinates
          ) {
            return null;
          }

          const longitude =
            geometry.coordinates[0];

          const latitude =
            geometry.coordinates[1];

          let radius = 180;

          if (
            incident.severity ===
            "HIGH"
          ) {
            radius = 260;
          }

          if (
            incident.severity ===
            "CRITICAL"
          ) {
            radius = 380;
          }

          return (
            <div
              key={`incident-layer-${incident.incident_id}`}
            >

              <Circle
                center={[
                  latitude,
                  longitude,
                ]}
                radius={radius}
                pathOptions={{
                  color:
                    incident.severity ===
                    "CRITICAL"
                      ? "#ef4444"
                      : "#f97316",
                  fillColor:
                    incident.severity ===
                    "CRITICAL"
                      ? "#ef4444"
                      : "#f97316",
                  fillOpacity: 0.055,
                  opacity: 0.35,
                  weight: 1.5,
                  dashArray: "5 8",
                }}
              />

              <Marker
                position={[
                  latitude - 0.00045,
                  longitude - 0.00045,
                ]}
                icon={getIncidentIcon(
                  incident.severity
                )}
                zIndexOffset={1200}
              >

                <Popup>

                  <strong>
                    🚨{" "}
                    {incident.incident_type}
                  </strong>

                  <br />

                  Severity:{" "}
                  <strong>
                    {incident.severity}
                  </strong>

                  <br />

                  Status:{" "}
                  {incident.status}

                  <br />

                  Description:
                  <br />

                  {incident.description}

                  <br />

                  Reported:{" "}
                  {incident.reported_at}

                </Popup>

              </Marker>

            </div>
          );
        })}

      </MapContainer>


      {/* ==================================================
          TOP STATUS HUD
          ================================================== */}

      {showHud && <div
        className="
          pointer-events-none
          absolute
          left-4
          top-4
          z-[1000]
        "
      >

        <div
          className="
            rounded-xl
            border
            border-cyan-400/20
            bg-slate-950/85
            px-4
            py-3
            shadow-[0_0_30px_rgba(6,182,212,0.12)]
            backdrop-blur-md
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              text-[10px]
              font-bold
              tracking-[0.18em]
              text-cyan-300
            "
          >

            <span
              className="
                h-2
                w-2
                animate-pulse
                rounded-full
                bg-emerald-400
                shadow-[0_0_10px_#34d399]
              "
            />

            CHENNAI DIGITAL TWIN

          </div>

          <div className="mt-1 text-[9px] text-slate-500">
            LIVE SIMULATION • POSTGIS • SOCKET.IO
          </div>

        </div>

      </div>}


      {/* ==================================================
          INCIDENT HUD
          ================================================== */}

      <div
        className="
          absolute
          hidden
          sm:block
          right-4
          top-4
          z-[1000]
          min-w-[125px]
          rounded-xl
          border
          border-red-500/30
          bg-slate-950/90
          px-4
          py-3
          text-white
          shadow-[0_0_30px_rgba(239,68,68,0.12)]
          backdrop-blur-md
        "
      >

        <div className="text-[9px] font-bold tracking-[0.16em] text-slate-500">
          ACTIVE INCIDENTS
        </div>

        <div className="mt-1 flex items-end gap-2">

          <div className="text-2xl font-bold text-red-400">
            {liveIncidents.length}
          </div>

          <div className="pb-1 text-[9px] text-red-300">
            LIVE
          </div>

        </div>

      </div>


      <div className={`pointer-events-none absolute right-4 bottom-20 z-[1000] hidden w-44 rounded-xl border border-cyan-400/15 bg-slate-950/75 p-3 text-white shadow-[0_0_30px_rgba(6,182,212,0.10)] backdrop-blur-md ${showHud ? "lg:block" : ""}`}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-[0.16em] text-cyan-300">CITY NETWORK</span>
          <span className="map-hud-pulse h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-[9px] text-slate-400"><span>ROADS</span><span className="font-mono text-slate-200">{roads.length.toString().padStart(2, "0")}</span></div>
          <div className="flex items-center justify-between text-[9px] text-slate-400"><span>JUNCTIONS</span><span className="font-mono text-slate-200">{junctions.length.toString().padStart(2, "0")}</span></div>
          <div className="flex items-center justify-between text-[9px] text-slate-400"><span>SENSORS</span><span className="font-mono text-slate-200">{sensors.length.toString().padStart(2, "0")}</span></div>
          <div className="flex items-center justify-between text-[9px] text-slate-400"><span>VEHICLES</span><span className="font-mono text-emerald-300">{liveVehicles.length.toString().padStart(2, "0")}</span></div>
        </div>
      </div>

      {/* ==================================================
          BOTTOM DIGITAL TWIN LEGEND
          ================================================== */}

      <div
        className="
          absolute
          hidden
          sm:block
          bottom-4
          left-1/2
          z-[1000]
          -translate-x-1/2
          rounded-2xl
          border
          border-cyan-400/20
          bg-slate-950/90
          px-4
          py-3
          shadow-[0_0_30px_rgba(6,182,212,0.10)]
          backdrop-blur-md
        "
      >

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-slate-300">

          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            Normal
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            Congested
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            Critical
          </span>

          <span>
            🚗 Vehicles
          </span>

          <span>
            🚑 Emergency
          </span>

          <span>
            📡 Sensors
          </span>

          <span>
            🚨 Incidents
          </span>

          <span>
            ♻️ E-Waste
          </span>

        </div>

      </div>

    </div>
  );
}

export default ChennaiMap;