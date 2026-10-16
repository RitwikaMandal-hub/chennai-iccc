const pool = require("../config/db");

const getAllSensors = async () => {
  const result = await pool.query(`
    SELECT
      sensor_id,
      sensor_code,
      sensor_type,
      location_name,
      status,
      installation_date,
      ST_AsGeoJSON(geom) AS geometry
    FROM sensors
    ORDER BY sensor_id;
  `);

  return result.rows;
};

module.exports = {
  getAllSensors
};