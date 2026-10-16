const pool = require("../config/db");

const getAllRoads = async () => {
  const result = await pool.query(`
    SELECT
      road_id,
      road_name,
      road_type,
      speed_limit,
      traffic_level,
      ST_AsGeoJSON(geom) AS geometry
    FROM roads
    ORDER BY road_id;
  `);

  return result.rows;
};

module.exports = {
  getAllRoads
};
