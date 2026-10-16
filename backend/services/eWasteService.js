const pool = require("../config/db");

const getAllEWastePoints = async () => {
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

  return result.rows;
};

module.exports = {
  getAllEWastePoints
};