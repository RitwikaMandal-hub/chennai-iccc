const pool = require("../config/db");

const getLatestReadings = async () => {
  const result = await pool.query(`
    SELECT
      reading_id,
      sensor_id,
      reading_value,
      unit,
      recorded_at
    FROM sensor_readings
    ORDER BY recorded_at DESC;
  `);

  return result.rows;
};

module.exports = {
  getLatestReadings
};