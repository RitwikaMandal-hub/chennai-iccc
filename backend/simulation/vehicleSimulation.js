const pool = require("../config/db");

let roads = [];
let vehicles = [];
let initialized = false;

const vehicleTypes = [
  "CAR",
  "CAR",
  "BUS",
  "CAR",
  "AMBULANCE",
  "CAR"
];

async function loadRoads() {
  const result = await pool.query(`
    SELECT
      road_id,
      road_name,
      speed_limit,
      traffic_level,
      ST_AsGeoJSON(geom) AS geometry
    FROM roads
    ORDER BY road_id;
  `);

  roads = result.rows.map((road) => ({
    ...road,
    coordinates: JSON.parse(road.geometry).coordinates
  }));

  vehicles = vehicleTypes.map((type, index) => ({
    vehicle_id: index + 1,
    vehicle_type: type,
    road_index: index % roads.length,
    progress: Math.random(),
    direction: index % 2 === 0 ? 1 : -1
  }));

  initialized = true;

  console.log(
    `[VEHICLES] Loaded ${vehicles.length} vehicles on ${roads.length} roads`
  );
}

function getPointOnRoad(coordinates, progress) {
  if (coordinates.length < 2) {
    return {
      latitude: coordinates[0][1],
      longitude: coordinates[0][0]
    };
  }

  const totalSegments = coordinates.length - 1;

  const scaledProgress = progress * totalSegments;

  let segmentIndex = Math.floor(scaledProgress);

  if (segmentIndex >= totalSegments) {
    segmentIndex = totalSegments - 1;
  }

  const segmentProgress =
    scaledProgress - segmentIndex;

  const start = coordinates[segmentIndex];
  const end = coordinates[segmentIndex + 1];

  const longitude =
    start[0] +
    (end[0] - start[0]) *
      segmentProgress;

  const latitude =
    start[1] +
    (end[1] - start[1]) *
      segmentProgress;

  return {
    latitude,
    longitude
  };
}

function getMovementRate(vehicle, trafficLevel) {
  let baseRate = 0.012;

  if (vehicle.vehicle_type === "BUS") {
    baseRate = 0.009;
  }

  if (vehicle.vehicle_type === "AMBULANCE") {
    baseRate = 0.018;
  }

  const trafficFactor =
    Math.max(
      0.25,
      1 - Number(trafficLevel) / 120
    );

  return baseRate * trafficFactor;
}

async function updateVehicles() {
  try {
    if (!initialized) {
      await loadRoads();
    }

    for (const vehicle of vehicles) {
      const road = roads[vehicle.road_index];

      const trafficLevel =
        Number(road.traffic_level) || 50;

      const movementRate =
        getMovementRate(
          vehicle,
          trafficLevel
        );

      vehicle.progress +=
        movementRate * vehicle.direction;

      if (vehicle.progress >= 1) {
        vehicle.progress = 0;

        vehicle.road_index =
          (vehicle.road_index + 1) %
          roads.length;
      }

      if (vehicle.progress <= 0) {
        vehicle.progress = 1;

        vehicle.road_index =
          (vehicle.road_index - 1 + roads.length) %
          roads.length;
      }
    }

    const vehicleData = vehicles.map(
      (vehicle) => {
        const road =
          roads[vehicle.road_index];

        const position =
          getPointOnRoad(
            road.coordinates,
            vehicle.progress
          );

        return {
          vehicle_id:
            vehicle.vehicle_id,

          vehicle_type:
            vehicle.vehicle_type,

          road_id:
            road.road_id,

          road_name:
            road.road_name,

          latitude:
            Number(
              position.latitude.toFixed(6)
            ),

          longitude:
            Number(
              position.longitude.toFixed(6)
            ),

          traffic_level:
            Number(road.traffic_level),

          status:
            vehicle.vehicle_type ===
            "AMBULANCE"
              ? "EMERGENCY"
              : "MOVING"
        };
      }
    );

    return vehicleData;
  }
  catch (error) {
    console.error(
      "[VEHICLE SIMULATION ERROR]",
      error
    );

    return [];
  }
}

module.exports = {
  updateVehicles
};
