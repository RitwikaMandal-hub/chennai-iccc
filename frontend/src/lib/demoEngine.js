// In-browser replica of the backend + AI service, used when the site is
// deployed without servers (DEMO_MODE). It mirrors the response shapes of
// backend/simulation/simulationEngine.js and ai-service/main.py so every
// page works unchanged against it.

const point = (lng, lat) =>
  JSON.stringify({ type: "Point", coordinates: [lng, lat] });

const line = (coords) =>
  JSON.stringify({ type: "LineString", coordinates: coords });

const polygon = (coords) =>
  JSON.stringify({ type: "Polygon", coordinates: [coords] });

const rand = (min, max) => Math.random() * (max - min) + min;
const limit = (value, min, max) => Math.max(min, Math.min(max, value));
const pick = (items) => items[Math.floor(Math.random() * items.length)];

/* ---------------------------------------------------------------
   STATIC CITY DATA (from database/seed.sql)
   --------------------------------------------------------------- */

const zones = [
  { zone_id: 1, zone_name: "Central Chennai", zone_type: "Urban Core", risk_level: "NORMAL",
    geometry: polygon([[80.25, 13.09], [80.29, 13.09], [80.29, 13.06], [80.25, 13.06], [80.25, 13.09]]) },
  { zone_id: 2, zone_name: "Adyar", zone_type: "Mobility Zone", risk_level: "MODERATE",
    geometry: polygon([[80.24, 13.02], [80.28, 13.02], [80.28, 12.99], [80.24, 12.99], [80.24, 13.02]]) },
  { zone_id: 3, zone_name: "Velachery", zone_type: "Flood Zone", risk_level: "HIGH",
    geometry: polygon([[80.2, 13.0], [80.24, 13.0], [80.24, 12.96], [80.2, 12.96], [80.2, 13.0]]) },
  { zone_id: 4, zone_name: "Anna Nagar", zone_type: "Residential Zone", risk_level: "NORMAL",
    geometry: polygon([[80.19, 13.1], [80.23, 13.1], [80.23, 13.07], [80.19, 13.07], [80.19, 13.1]]) },
  { zone_id: 5, zone_name: "T. Nagar", zone_type: "Commercial Zone", risk_level: "HIGH",
    geometry: polygon([[80.22, 13.06], [80.25, 13.06], [80.25, 13.03], [80.22, 13.03], [80.22, 13.06]]) },
];

const roadSeed = [
  [1, "Anna Salai", "Arterial", 50, 72, [[80.255, 13.055], [80.27, 13.07], [80.285, 13.085]]],
  [2, "OMR", "Arterial", 60, 58, [[80.225, 12.965], [80.235, 12.985], [80.25, 13.01]]],
  [3, "GST Road", "Highway", 70, 65, [[80.17, 12.95], [80.19, 12.98], [80.215, 13.02]]],
  [4, "Poonamallee High Road", "Arterial", 50, 81, [[80.18, 13.085], [80.205, 13.095], [80.23, 13.09]]],
  [5, "Sardar Patel Road", "Arterial", 50, 69, [[80.245, 13.025], [80.255, 13.045], [80.265, 13.065]]],
  [6, "Kamarajar Salai", "Arterial", 50, 54, [[80.283, 13.08], [80.279, 13.05], [80.27, 13.02]]],
  [7, "Inner Ring Road", "Arterial", 60, 63, [[80.205, 13.075], [80.2, 13.04], [80.207, 13.008]]],
];

const roads = roadSeed.map(([road_id, road_name, road_type, speed_limit, traffic_level, coords]) => ({
  road_id, road_name, road_type, speed_limit, traffic_level, coordinates: coords, geometry: line(coords),
}));

const junctions = [
  [1, "Guindy Junction", 78, 72, "CONGESTED", 80.2209, 13.0067],
  [2, "Teynampet Junction", 74, 68, "CONGESTED", 80.2496, 13.0418],
  [3, "Adyar Signal", 61, 48, "NORMAL", 80.2572, 13.0067],
  [4, "Anna Nagar Roundabout", 52, 35, "NORMAL", 80.21, 13.085],
  [5, "Velachery Junction", 83, 76, "CONGESTED", 80.218, 12.9815],
].map(([junction_id, junction_name, traffic_level, congestion_level, status, lng, lat]) => ({
  junction_id, junction_name, traffic_level, congestion_level, status, lng, lat, geometry: point(lng, lat),
}));

const sensors = [
  [1, "TRF-GND-001", "TRAFFIC", "Guindy Junction", 80.2209, 13.0067],
  [2, "FLD-VEL-001", "FLOOD_LEVEL", "Velachery", 80.218, 12.9815],
  [3, "AIR-TNG-001", "AIR_QUALITY", "T. Nagar", 80.2341, 13.0418],
  [4, "TRF-ADY-001", "TRAFFIC", "Adyar", 80.2572, 13.0067],
  [5, "ENV-ANN-001", "ENVIRONMENT", "Anna Nagar", 80.21, 13.085],
  [6, "WSM-VEL-001", "WATER_LEVEL", "Velachery", 80.218, 12.9815],
].map(([sensor_id, sensor_code, sensor_type, location_name, lng, lat]) => ({
  sensor_id, sensor_code, sensor_type, location_name, status: "ACTIVE",
  installation_date: "2026-01-15", geometry: point(lng, lat),
}));

const eWaste = [
  [1, "EW-ANN-01", "Anna Nagar", 500, 210, 80.2085, 13.0878],
  [2, "EW-TNG-01", "T. Nagar", 650, 455, 80.2338, 13.0405],
  [3, "EW-ADY-01", "Adyar", 400, 150, 80.2565, 13.0012],
  [4, "EW-VEL-01", "Velachery", 450, 370, 80.2205, 12.9788],
  [5, "EW-GND-01", "Guindy Industrial Estate", 800, 520, 80.2125, 13.0115],
].map(([point_id, point_name, location_name, capacity_kg, current_load_kg, lng, lat]) => ({
  point_id, point_name, location_name, capacity_kg, current_load_kg,
  status: "NORMAL", last_collection: new Date(Date.now() - 36e5 * 5).toISOString(),
  geometry: point(lng, lat),
}));

const signals = [
  [1, 1, "GREEN", 45, 35], [2, 2, "RED", 30, 45], [3, 3, "GREEN", 40, 30],
  [4, 4, "GREEN", 35, 25], [5, 5, "RED", 25, 50],
].map(([signal_id, junction_id, signal_status, green_duration, red_duration]) => ({
  signal_id, junction_id, signal_status, green_duration, red_duration, elapsed: 0,
}));

const vehicleTypes = ["CAR", "CAR", "BUS", "CAR", "AMBULANCE", "CAR", "BUS", "CAR", "AMBULANCE", "CAR"];

const vehicles = vehicleTypes.map((vehicle_type, index) => ({
  vehicle_id: index + 1,
  vehicle_type,
  road_index: index % roads.length,
  progress: Math.random(),
  direction: index % 2 === 0 ? 1 : -1,
}));

let nextIncidentId = 4;
const now = Date.now();

let incidents = [
  { incident_id: 1, incident_type: "ACCIDENT", severity: "HIGH",
    description: "Two-vehicle collision near Guindy Junction", status: "ACTIVE",
    reported_at: new Date(now - 4 * 60e3).toISOString(), resolved_at: null, geometry: point(80.2209, 13.0067) },
  { incident_id: 2, incident_type: "FLOOD_ALERT", severity: "MEDIUM",
    description: "Rising water level detected in Velachery", status: "ACTIVE",
    reported_at: new Date(now - 9 * 60e3).toISOString(), resolved_at: null, geometry: point(80.218, 12.9815) },
  { incident_id: 3, incident_type: "TRAFFIC_CONGESTION", severity: "MEDIUM",
    description: "Heavy traffic detected on Anna Salai", status: "ACTIVE",
    reported_at: new Date(now - 14 * 60e3).toISOString(), resolved_at: null, geometry: point(80.255, 13.055) },
];

const metrics = {
  traffic_1: 76,
  traffic_2: 61,
  water_level: 62,
  air_quality: 86,
  temperature: 31,
};

/* ---------------------------------------------------------------
   SIMULATION TICK (port of backend/simulation/*)
   --------------------------------------------------------------- */

const MAX_ACTIVE_INCIDENTS = 5;
const INCIDENT_LIFETIME_MS = 90e3;
const SEED_INCIDENT_IDS = new Set([1, 2, 3]);

function pointOnRoad(coords, progress) {
  const segments = coords.length - 1;
  const scaled = progress * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const t = scaled - index;
  const [x1, y1] = coords[index];
  const [x2, y2] = coords[index + 1];
  return { longitude: x1 + (x2 - x1) * t, latitude: y1 + (y2 - y1) * t };
}

function updateVehicles() {
  return vehicles.map((vehicle) => {
    const road = roads[vehicle.road_index];
    let rate = vehicle.vehicle_type === "BUS" ? 0.03 : vehicle.vehicle_type === "AMBULANCE" ? 0.06 : 0.04;
    rate *= Math.max(0.25, 1 - road.traffic_level / 120);
    vehicle.progress += rate * vehicle.direction;

    if (vehicle.progress >= 1) {
      vehicle.progress = 0;
      vehicle.road_index = (vehicle.road_index + 1) % roads.length;
    }
    if (vehicle.progress <= 0) {
      vehicle.progress = 1;
      vehicle.road_index = (vehicle.road_index - 1 + roads.length) % roads.length;
    }

    const current = roads[vehicle.road_index];
    const position = pointOnRoad(current.coordinates, vehicle.progress);

    return {
      vehicle_id: vehicle.vehicle_id,
      vehicle_type: vehicle.vehicle_type,
      road_id: current.road_id,
      road_name: current.road_name,
      latitude: Number(position.latitude.toFixed(6)),
      longitude: Number(position.longitude.toFixed(6)),
      traffic_level: current.traffic_level,
      status: vehicle.vehicle_type === "AMBULANCE" ? "EMERGENCY" : "MOVING",
    };
  });
}

function updateJunctions() {
  return junctions.map((junction) => {
    junction.traffic_level = Math.round(limit(junction.traffic_level + rand(-8, 8), 20, 100));
    junction.congestion_level = Math.round(limit(junction.congestion_level + rand(-10, 10), 10, 100));
    junction.status =
      junction.congestion_level >= 75 ? "CRITICAL" : junction.congestion_level >= 55 ? "CONGESTED" : "NORMAL";
    return {
      junction_id: junction.junction_id,
      traffic_level: junction.traffic_level,
      congestion_level: junction.congestion_level,
      status: junction.status,
    };
  });
}

function updateSignals() {
  return signals.map((signal) => {
    const junction = junctions.find((item) => item.junction_id === signal.junction_id);
    signal.elapsed += 5;
    const green = signal.green_duration + (junction.congestion_level >= 75 ? 10 : 0);
    const limitFor = signal.signal_status === "GREEN" ? green : signal.red_duration;
    if (signal.elapsed >= limitFor) {
      signal.signal_status = signal.signal_status === "GREEN" ? "RED" : "GREEN";
      signal.elapsed = 0;
    }
    return {
      signal_id: signal.signal_id,
      junction_id: signal.junction_id,
      signal_status: signal.signal_status,
      green_duration: signal.green_duration,
      red_duration: signal.red_duration,
      congestion_level: junction.congestion_level,
    };
  });
}

function updateEWaste() {
  for (const p of eWaste) {
    p.current_load_kg = limit(p.current_load_kg + rand(-2, 6), 0, p.capacity_kg);
    if (p.current_load_kg >= p.capacity_kg * 0.9 && Math.random() < 0.25) {
      p.current_load_kg = p.capacity_kg * 0.2;
      p.last_collection = new Date().toISOString();
    }
    const utilization = (p.current_load_kg / p.capacity_kg) * 100;
    p.status = utilization >= 75 ? "HIGH" : utilization >= 50 ? "FILLING" : "NORMAL";
  }
  return eWaste.map((p) => ({ ...p, current_load_kg: Number(p.current_load_kg.toFixed(2)) }));
}

const incidentText = {
  ACCIDENT: (name) => `Traffic accident detected near ${name}. Traffic disruption expected.`,
  FIRE: (name) => `Fire emergency reported near ${name}. Emergency response required.`,
  MEDICAL_EMERGENCY: (name) => `Medical emergency reported near ${name}. Ambulance response may be required.`,
  ROAD_BLOCKAGE: (name) => `Road blockage detected near ${name}. Traffic rerouting may be required.`,
};

function updateIncidents() {
  const cutoff = Date.now() - INCIDENT_LIFETIME_MS;
  // Seed incidents stay so the dashboard never looks empty.
  incidents = incidents.filter(
    (incident) => SEED_INCIDENT_IDS.has(incident.incident_id) || Date.parse(incident.reported_at) > cutoff
  );

  let newIncident = null;
  if (incidents.length < MAX_ACTIVE_INCIDENTS && Math.random() < 0.3) {
    const type = pick(Object.keys(incidentText));
    const junction = pick(junctions);
    newIncident = {
      incident_id: nextIncidentId++,
      incident_type: type,
      severity: pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      description: incidentText[type](junction.junction_name),
      status: "ACTIVE",
      reported_at: new Date().toISOString(),
      resolved_at: null,
      geometry: point(junction.lng + rand(-0.003, 0.003), junction.lat + rand(-0.003, 0.003)),
    };
    incidents = [newIncident, ...incidents];
  }
  return newIncident;
}

function tick() {
  metrics.traffic_1 = limit(metrics.traffic_1 + rand(-4, 4), 40, 95);
  metrics.traffic_2 = limit(metrics.traffic_2 + rand(-4, 4), 30, 90);
  metrics.water_level = limit(metrics.water_level + rand(-3, 3.4), 30, 110);
  metrics.air_quality = limit(metrics.air_quality + rand(-5, 5), 30, 180);
  metrics.temperature = limit(metrics.temperature + rand(-0.4, 0.4), 26, 38);

  for (const road of roads) {
    road.traffic_level = Math.round(limit(road.traffic_level + rand(-5, 5), 25, 95));
  }

  const junctionUpdates = updateJunctions();
  const newIncident = updateIncidents();

  return {
    traffic_1: Number(metrics.traffic_1.toFixed(1)),
    traffic_2: Number(metrics.traffic_2.toFixed(1)),
    water_level: Number(metrics.water_level.toFixed(1)),
    air_quality: Number(metrics.air_quality.toFixed(1)),
    temperature: Number(metrics.temperature.toFixed(1)),
    junctions: junctionUpdates,
    vehicles: updateVehicles(),
    signals: updateSignals(),
    incidents,
    new_incident: newIncident,
    e_waste: updateEWaste(),
  };
}

/* ---------------------------------------------------------------
   SHARED TICKER — every page subscribes to the same stream
   --------------------------------------------------------------- */

const TICK_MS = 3000;
const listeners = new Set();
let lastUpdate = tick();
let timer = null;

export function subscribe(listener) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      lastUpdate = tick();
      listeners.forEach((fn) => fn(lastUpdate));
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function getLatest() {
  return lastUpdate;
}

/* ---------------------------------------------------------------
   AI SERVICE (rule-based stand-in for Gemini + RAG)
   --------------------------------------------------------------- */

function aiResponse(prompt) {
  const text = prompt.toLowerCase();
  const worstJunction = [...junctions].sort((a, b) => b.congestion_level - a.congestion_level)[0];
  const active = incidents.length;
  const water = metrics.water_level.toFixed(1);
  const aqi = metrics.air_quality.toFixed(0);
  const traffic = metrics.traffic_1.toFixed(1);

  const header =
    "CHENNAI ICCC — AI OPERATIONS ASSESSMENT (simulation)\n" +
    `Live context: traffic index ${traffic}, Velachery water level ${water} cm, AQI ${aqi}, ${active} active incidents.\n\n`;

  const footer =
    "\n\nAll recommendations are simulated. Operational actions require human approval in the control room.";

  if (/flood|rain|water|velachery|drain/.test(text)) {
    const risk = metrics.water_level >= 80 ? "HIGH" : metrics.water_level >= 60 ? "ELEVATED" : "LOW";
    return header +
      `1. Situation: Flood risk in Velachery is ${risk}. Water level ${water} cm against a 80 cm alert threshold.\n` +
      "2. Pre-position 2 dewatering pumps and 1 rescue boat at Velachery Junction.\n" +
      "3. Divert traffic from Velachery Main Road to the Inner Ring Road; push advisories to commuters.\n" +
      "4. Alert GCC storm-water drain teams and open the Pallikaranai marsh outflow.\n" +
      "5. Keep shelters at Velachery and Taramani schools on standby." + footer;
  }

  if (/accident|ambulance|emergency|medical|fire|injur/.test(text)) {
    return header +
      "1. Incident assessment: road-traffic collision; probable injuries, lane blockage likely.\n" +
      "2. Dispatch nearest ambulance AMB-07 (ETA ~11 min) and notify Government General Hospital trauma ward.\n" +
      "3. Activate a green corridor: Anna Nagar → Poonamallee High Road → Egmore → GGH; hold cross-traffic signals.\n" +
      `4. Traffic police to manage diversion around ${worstJunction.junction_name} (congestion ${worstJunction.congestion_level}%).\n` +
      "5. Push public alert and keep CCTV operator on the incident camera until clearance." + footer;
  }

  if (/waste|e-waste|ewaste|garbage|collection|recycl/.test(text)) {
    const full = [...eWaste].sort((a, b) => b.current_load_kg / b.capacity_kg - a.current_load_kg / a.capacity_kg);
    return header +
      `1. Highest utilisation: ${full[0].location_name} (${Math.round((full[0].current_load_kg / full[0].capacity_kg) * 100)}%), ${full[1].location_name} (${Math.round((full[1].current_load_kg / full[1].capacity_kg) * 100)}%).\n` +
      `2. Schedule a pickup route: ${full.slice(0, 3).map((p) => p.location_name).join(" → ")}.\n` +
      "3. Send hazardous components (batteries, CRT glass) to the authorised recycler at Guindy Industrial Estate.\n" +
      "4. Run citizen drop-off awareness in the two fullest wards." + footer;
  }

  if (/air|aqi|pollution|smog/.test(text)) {
    return header +
      `1. AQI at T. Nagar is ${aqi} (${metrics.air_quality >= 150 ? "Poor" : metrics.air_quality >= 100 ? "Moderate" : "Satisfactory"}).\n` +
      "2. Increase signal green time on arterial roads to cut idling.\n" +
      "3. Deploy water sprinklers on construction sites in the commercial zone.\n" +
      "4. Issue a health advisory for sensitive groups if AQI exceeds 150." + footer;
  }

  return header +
    `1. Traffic: highest congestion at ${worstJunction.junction_name} (${worstJunction.congestion_level}%). Adaptive signals are extending green phases.\n` +
    `2. Flood: Velachery water level ${water} cm — ${metrics.water_level >= 60 ? "monitor closely" : "normal"}.\n` +
    `3. Environment: AQI ${aqi}, temperature ${metrics.temperature.toFixed(1)}°C.\n` +
    `4. Incidents: ${active} active. ${incidents[0] ? `Latest — ${incidents[0].description}` : ""}\n` +
    "5. Recommended: keep 2 ambulances staged near Guindy and T. Nagar during peak hours." + footer;
}

const actionPlan = [
  { action: "DISPATCH_AMBULANCE", allowed: true, requires_approval: true,
    reason: "Nearest ambulance can reach the incident fastest." },
  { action: "CREATE_GREEN_CORRIDOR", allowed: true, requires_approval: true,
    reason: "Signal priority reduces ambulance travel time to hospital." },
  { action: "SEND_EMERGENCY_NOTIFICATION", allowed: true, requires_approval: true,
    reason: "Hospital and traffic police must be informed in advance." },
];

function execution() {
  return {
    last_execution_id: `EXEC-${Date.now().toString(36).toUpperCase()}`,
    status: "SIMULATION_EXECUTED",
    timestamp: new Date().toISOString(),
    actions: [
      { action: "DISPATCH_AMBULANCE", status: "SIMULATED_EXECUTED",
        details: { ambulance_id: "AMB-07", location: "Anna Nagar", status: "DISPATCHED", estimated_arrival_minutes: 11 } },
      { action: "CREATE_GREEN_CORRIDOR", status: "SIMULATED_EXECUTED",
        details: { route: ["Anna Nagar", "Poonamallee High Road", "Egmore", "Government General Hospital"],
          signal_priority: "SIMULATED", duration_minutes: 15 } },
      { action: "SEND_EMERGENCY_NOTIFICATION", status: "SIMULATED_EXECUTED",
        details: { recipient: "Chennai ICCC Emergency Operations", notification_status: "SIMULATED_SENT",
          message: "Emergency response plan activated in simulation." } },
    ],
  };
}

/* ---------------------------------------------------------------
   REQUEST ROUTER
   --------------------------------------------------------------- */

// Drop engine-only fields so responses match the real API shape.
const INTERNAL = new Set(["coordinates", "lng", "lat", "elapsed"]);
const stripGeo = (items) =>
  items.map((item) => Object.fromEntries(Object.entries(item).filter(([field]) => !INTERNAL.has(field))));

export function handleRequest(path) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);

  switch (pathname) {
    case "/api/zones": return zones;
    case "/api/roads": return stripGeo(roads);
    case "/api/junctions": return stripGeo(junctions);
    case "/api/sensors": return sensors;
    case "/api/e-waste": return eWaste;
    case "/api/sensor-readings":
      return Object.entries({ 1: metrics.traffic_1, 2: metrics.water_level, 3: metrics.air_quality,
        4: metrics.traffic_2, 5: metrics.temperature }).map(([sensor_id, value], i) => ({
        reading_id: i + 1, sensor_id: Number(sensor_id), reading_value: value.toFixed(2), recorded_at: new Date().toISOString() }));
    case "/api/dashboard":
      return {
        traffic_flow: Number(metrics.traffic_1.toFixed(1)),
        air_quality: Number(metrics.air_quality.toFixed(1)),
        active_incidents: incidents.length,
        average_water_level: Number(metrics.water_level.toFixed(1)),
        incidents,
      };
    case "/api/health":
    case "/health":
      return { status: "online", system: "Chennai AI ICCC (demo)" };
    case "/agent":
    case "/ask": {
      const prompt = params.get("prompt") || "";
      return { prompt, status: "SIMULATION", response: aiResponse(prompt) };
    }
    case "/approval-plan":
      return { status: "PENDING_APPROVAL", actions: actionPlan };
    case "/approval/approve":
      return { status: "APPROVED", message: "Actions approved by operator and executed in simulation.",
        approved_actions: actionPlan, execution: execution() };
    case "/approval/reject":
      return { status: "REJECTED", message: "Operator rejected the proposed AI actions. No simulated execution was performed.",
        approved_actions: [], execution: null };
    case "/execution-state":
      return { status: "IDLE", last_execution_id: null, timestamp: null, actions: [] };
    default:
      return null;
  }
}
