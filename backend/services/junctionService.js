const pool = require("../config/db");

const getAllJunctions = async () => {
  const result = await pool.query(`
    SELECT
      junction_id,
      junction_name,
      traffic_level,
      congestion_level,
      status,
      ST_AsGeoJSON(geom) AS geometry
    FROM junctions
    ORDER BY junction_id;
  `);

  return result.rows;
};

module.exports = {
  getAllJunctions
};