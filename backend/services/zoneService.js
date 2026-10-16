const pool = require("../config/db");

const getAllZones = async () => {
  const result = await pool.query(`
    SELECT
      zone_id,
      zone_name,
      zone_type,
      risk_level,
      ST_AsGeoJSON(geom) AS geometry
    FROM city_zones
    ORDER BY zone_id;
  `);

  return result.rows;
};

module.exports = {
  getAllZones
};