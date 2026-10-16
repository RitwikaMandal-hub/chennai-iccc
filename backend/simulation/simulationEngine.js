const pool = require("../config/db");

const {
  updateVehicles
} = require("./vehicleSimulation");

const {
  updateSignals
} = require("./signalSimulation");

const {
  updateEWastePoints
} = require("./eWasteSimulation");


// --------------------------------------------------
// INCIDENT CONFIGURATION
// --------------------------------------------------

const MAX_ACTIVE_INCIDENTS = 5;

const INCIDENT_LIFETIME_SECONDS = 60;


// --------------------------------------------------
// UTILITY FUNCTIONS
// --------------------------------------------------

// Generate a small random change
function randomChange(value, minChange, maxChange) {

  const change =
    Math.random() *
    (maxChange - minChange) +
    minChange;

  return value + change;
}


// Keep values inside a reasonable range
function limit(value, minimum, maximum) {

  return Math.max(
    minimum,
    Math.min(maximum, value)
  );
}


// --------------------------------------------------
// INCIDENT CLEANUP
// --------------------------------------------------

// Resolve old incidents instead of deleting them.
// Historical records remain permanently in PostgreSQL.

async function cleanupOldIncidents() {

  try {

    await pool.query(`
      UPDATE incidents
      SET
        status = 'RESOLVED',
        resolved_at = NOW()
      WHERE status = 'ACTIVE'
        AND reported_at <
            NOW() - INTERVAL '${INCIDENT_LIFETIME_SECONDS} seconds'
    `);

  }
  catch (error) {

    console.error(
      "[INCIDENT CLEANUP ERROR]",
      error
    );

  }

}


// --------------------------------------------------
// GENERATE RANDOM LIVE INCIDENT
// --------------------------------------------------

async function generateIncident(junctions) {

  try {

    // Check how many incidents are currently active
    const activeCountResult =
      await pool.query(`
        SELECT COUNT(*) AS count
        FROM incidents
        WHERE status = 'ACTIVE'
      `);

    const activeCount =
      Number(
        activeCountResult.rows[0].count
      );


    // Do not allow too many incidents on the live map
    if (
      activeCount >= MAX_ACTIVE_INCIDENTS
    ) {

      return null;

    }


    // 20% chance of creating an incident
    const shouldCreateIncident =
      Math.random() < 0.20;


    if (!shouldCreateIncident) {

      return null;

    }


    // Possible incident types
    const incidentTypes = [

      "ACCIDENT",

      "FIRE",

      "MEDICAL_EMERGENCY",

      "ROAD_BLOCKAGE"

    ];


    // Possible severity levels
    const severities = [

      "LOW",

      "MEDIUM",

      "HIGH",

      "CRITICAL"

    ];


    const incidentType =
      incidentTypes[
        Math.floor(
          Math.random() *
          incidentTypes.length
        )
      ];


    const severity =
      severities[
        Math.floor(
          Math.random() *
          severities.length
        )
      ];


    // Select a random junction
    const junction =
      junctions[
        Math.floor(
          Math.random() *
          junctions.length
        )
      ];


    if (!junction) {

      return null;

    }


    // Get actual junction coordinates
    const locationResult =
      await pool.query(
        `
        SELECT
          junction_id,
          junction_name,
          ST_X(geom) AS longitude,
          ST_Y(geom) AS latitude
        FROM junctions
        WHERE junction_id = $1
        `,
        [junction.junction_id]
      );


    if (
      locationResult.rows.length === 0
    ) {

      return null;

    }


    const location =
      locationResult.rows[0];


    // Default description
    let description =
      `${incidentType.replace(
        "_",
        " "
      )} reported near ${location.junction_name}.`;


    if (
      incidentType === "ACCIDENT"
    ) {

      description =
        `Traffic accident detected near ${location.junction_name}. Traffic disruption expected.`;

    }


    if (
      incidentType === "FIRE"
    ) {

      description =
        `Fire emergency reported near ${location.junction_name}. Emergency response required.`;

    }


    if (
      incidentType === "MEDICAL_EMERGENCY"
    ) {

      description =
        `Medical emergency reported near ${location.junction_name}. Ambulance response may be required.`;

    }


    if (
      incidentType === "ROAD_BLOCKAGE"
    ) {

      description =
        `Road blockage detected near ${location.junction_name}. Traffic rerouting may be required.`;

    }


    // Store incident permanently in PostgreSQL
    const result =
      await pool.query(
        `
        INSERT INTO incidents
        (
          incident_type,
          severity,
          description,
          status,
          geom
        )
        VALUES
        (
          $1,
          $2,
          $3,
          'ACTIVE',
          ST_SetSRID(
            ST_MakePoint($4, $5),
            4326
          )
        )
        RETURNING
          incident_id,
          incident_type,
          severity,
          description,
          status,
          reported_at,
          resolved_at,
          ST_AsGeoJSON(geom) AS geometry
        `,
        [
          incidentType,
          severity,
          description,
          Number(location.longitude),
          Number(location.latitude)
        ]
      );


    const incident =
      result.rows[0];


    console.log(
      `[INCIDENT] ${incident.incident_type} | ` +
      `${incident.severity} | ` +
      `${location.junction_name}`
    );


    return incident;

  }
  catch (error) {

    console.error(
      "[INCIDENT SIMULATION ERROR]",
      error
    );

    return null;

  }

}


// --------------------------------------------------
// GET ACTIVE INCIDENTS
// --------------------------------------------------

async function getActiveIncidents() {

  try {

    const result =
      await pool.query(
        `
        SELECT
          incident_id,
          incident_type,
          severity,
          description,
          status,
          reported_at,
          resolved_at,
          ST_AsGeoJSON(geom) AS geometry
        FROM incidents
        WHERE status = 'ACTIVE'
        ORDER BY incident_id DESC
        `
      );


    return result.rows;

  }
  catch (error) {

    console.error(
      "[ACTIVE INCIDENT ERROR]",
      error
    );

    return [];

  }

}


// --------------------------------------------------
// MAIN CITY SIMULATION
// --------------------------------------------------

async function generateSimulation() {

  try {

    // ------------------------------------------------
    // CLEANUP OLD INCIDENTS
    // ------------------------------------------------

    await cleanupOldIncidents();


    // ------------------------------------------------
    // SENSOR VALUES
    // ------------------------------------------------

    // TRAFFIC SENSOR 1
    const traffic1 =
      limit(
        randomChange(
          78,
          -8,
          8
        ),
        20,
        100
      );


    // TRAFFIC SENSOR 4
    const traffic2 =
      limit(
        randomChange(
          61,
          -7,
          7
        ),
        20,
        100
      );


    // FLOOD / WATER SENSOR
    const waterLevel =
      limit(
        randomChange(
          62,
          -4,
          6
        ),
        20,
        120
      );


    // AIR QUALITY SENSOR
    const airQuality =
      limit(
        randomChange(
          86,
          -6,
          6
        ),
        20,
        200
      );


    // ENVIRONMENT SENSOR
    const temperature =
      limit(
        randomChange(
          31,
          -1.5,
          1.5
        ),
        20,
        45
      );


    // ------------------------------------------------
    // STORE SENSOR READINGS
    // ------------------------------------------------

    await pool.query(
      `
      INSERT INTO sensor_readings
      (
        sensor_id,
        reading_value,
        unit,
        recorded_at
      )
      VALUES
      ($1, $2, $3, NOW()),
      ($4, $5, $6, NOW()),
      ($7, $8, $9, NOW()),
      ($10, $11, $12, NOW()),
      ($13, $14, $15, NOW())
      `,
      [

        1,
        traffic1.toFixed(2),
        "traffic_index",

        4,
        traffic2.toFixed(2),
        "traffic_index",

        2,
        waterLevel.toFixed(2),
        "cm",

        3,
        airQuality.toFixed(2),
        "AQI",

        5,
        temperature.toFixed(2),
        "C"

      ]
    );


    // ------------------------------------------------
    // UPDATE JUNCTION CONDITIONS
    // ------------------------------------------------

    const junctionResult =
      await pool.query(
        `
        SELECT
          junction_id,
          traffic_level,
          congestion_level
        FROM junctions
        ORDER BY junction_id;
        `
      );


    const junctionUpdates = [];


    for (
      const junction
      of junctionResult.rows
    ) {

      const trafficLevel =
        limit(
          randomChange(
            Number(
              junction.traffic_level
            ),
            -8,
            8
          ),
          20,
          100
        );


      const congestionLevel =
        limit(
          randomChange(
            Number(
              junction.congestion_level
            ),
            -10,
            10
          ),
          10,
          100
        );


      let status =
        "NORMAL";


      if (
        congestionLevel >= 75
      ) {

        status =
          "CRITICAL";

      }
      else if (
        congestionLevel >= 55
      ) {

        status =
          "CONGESTED";

      }


      await pool.query(
        `
        UPDATE junctions
        SET
          traffic_level = $1,
          congestion_level = $2,
          status = $3
        WHERE junction_id = $4
        `,
        [

          Math.round(
            trafficLevel
          ),

          Math.round(
            congestionLevel
          ),

          status,

          junction.junction_id

        ]
      );


      junctionUpdates.push({

        junction_id:
          junction.junction_id,

        traffic_level:
          Math.round(
            trafficLevel
          ),

        congestion_level:
          Math.round(
            congestionLevel
          ),

        status

      });

    }


    // ------------------------------------------------
    // MOVING VEHICLES
    // ------------------------------------------------

    const vehicles =
      await updateVehicles();


    // ------------------------------------------------
    // TRAFFIC SIGNALS
    // ------------------------------------------------

    const signals =
      await updateSignals(
        junctionUpdates
      );


    // ------------------------------------------------
    // LIVE E-WASTE SIMULATION
    // ------------------------------------------------

    const eWastePoints =
      await updateEWastePoints();


    // ------------------------------------------------
    // GENERATE NEW INCIDENT
    // ------------------------------------------------

    const newIncident =
      await generateIncident(
        junctionUpdates
      );


    // ------------------------------------------------
    // GET CURRENT ACTIVE INCIDENTS
    // ------------------------------------------------

    const activeIncidents =
      await getActiveIncidents();


    // ------------------------------------------------
    // SIMULATION LOG
    // ------------------------------------------------

    console.log(
      `[SIMULATION] ` +
      `Traffic: ${traffic1.toFixed(1)} | ` +
      `Water: ${waterLevel.toFixed(1)} cm | ` +
      `AQI: ${airQuality.toFixed(1)} | ` +
      `Temperature: ${temperature.toFixed(1)}°C | ` +
      `Vehicles: ${vehicles.length} | ` +
      `Active Incidents: ${activeIncidents.length} | ` +
      `E-Waste Points: ${eWastePoints.length}`
    );


    // ------------------------------------------------
    // RETURN LIVE DATA TO SOCKET.IO
    // ------------------------------------------------

    return {

      traffic_1:
        Number(
          traffic1.toFixed(1)
        ),

      traffic_2:
        Number(
          traffic2.toFixed(1)
        ),

      water_level:
        Number(
          waterLevel.toFixed(1)
        ),

      air_quality:
        Number(
          airQuality.toFixed(1)
        ),

      temperature:
        Number(
          temperature.toFixed(1)
        ),

      junctions:
        junctionUpdates,

      vehicles:
        vehicles,

      signals:
        signals,

      incidents:
        activeIncidents,

      new_incident:
        newIncident,

      e_waste:
        eWastePoints

    };

  }
  catch (error) {

    console.error(
      "[SIMULATION ERROR]",
      error
    );

  }

}


module.exports = {
  generateSimulation
};