const pool = require("../config/db");

let points = [];
let initialized = false;


// --------------------------------------------------
// LOAD E-WASTE POINTS
// --------------------------------------------------

async function loadEWastePoints() {

  const result = await pool.query(`
    SELECT
      point_id,
      point_name,
      location_name,
      capacity_kg,
      current_load_kg,
      status,
      last_collection,
      ST_AsGeoJSON(geom) AS geometry
    FROM e_waste_points
    ORDER BY point_id;
  `);

  points = result.rows.map((point) => ({
    ...point,
    capacity_kg:
      Number(point.capacity_kg),
    current_load_kg:
      Number(point.current_load_kg)
  }));

  initialized = true;

  console.log(
    `[E-WASTE] Loaded ${points.length} collection points`
  );

}


// --------------------------------------------------
// UPDATE E-WASTE LOAD
// --------------------------------------------------

async function updateEWastePoints() {

  try {

    if (!initialized) {
      await loadEWastePoints();
    }


    for (const point of points) {

      // Simulate changing waste generation
      const change =
        Math.random() * 6 - 2;

      point.current_load_kg += change;
      // Simulated collection event
if (
  point.current_load_kg >= point.capacity_kg * 0.90 &&
  Math.random() < 0.25
) {

  console.log(
    `[E-WASTE COLLECTION] ${point.point_name}`
  );

  point.current_load_kg =
    point.capacity_kg * 0.20;

  point.last_collection =
    new Date();

}


      // Keep load inside realistic limits
      if (point.current_load_kg < 0) {
        point.current_load_kg = 0;
      }

      if (
        point.current_load_kg >
        point.capacity_kg
      ) {
        point.current_load_kg =
          point.capacity_kg;
      }


      // Calculate utilization
      const utilization =
        (
          point.current_load_kg /
          point.capacity_kg
        ) * 100;


      // Determine status
      let status = "NORMAL";

      if (utilization >= 75) {

        status = "HIGH";

      }
      else if (utilization >= 50) {

        status = "FILLING";

      }


      point.status = status;
      await pool.query(
  `
  INSERT INTO e_waste_readings
  (
    point_id,
    current_load_kg,
    recorded_at
  )
  VALUES
  ($1, $2, NOW())
  `,
  [
    point.point_id,
    point.current_load_kg.toFixed(2)
  ]
);

      // Store updated state
      await pool.query(
        `
        UPDATE e_waste_points
        SET
          current_load_kg = $1,
          status = $2
        WHERE point_id = $3
        `,
        [
          point.current_load_kg.toFixed(2),
          point.status,
          point.point_id
        ]
      );

    }


    return points.map((point) => ({

      point_id:
        point.point_id,

      point_name:
        point.point_name,

      location_name:
        point.location_name,

      capacity_kg:
        point.capacity_kg,

      current_load_kg:
        Number(
          point.current_load_kg.toFixed(2)
        ),

      status:
        point.status,

      last_collection:
        point.last_collection,

      geometry:
        point.geometry

    }));

  }
  catch (error) {

    console.error(
      "[E-WASTE SIMULATION ERROR]",
      error
    );

    return [];

  }

}


module.exports = {
  updateEWastePoints
};