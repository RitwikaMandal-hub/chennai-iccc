const pool = require("../config/db");

const getDashboardMetrics = async () => {
  const trafficResult = await pool.query(`
    SELECT AVG(sr.reading_value) AS traffic_flow
    FROM sensor_readings sr
    JOIN sensors s ON sr.sensor_id = s.sensor_id
    WHERE s.sensor_type = 'TRAFFIC';
  `);

  const airResult = await pool.query(`
    SELECT AVG(sr.reading_value) AS air_quality
    FROM sensor_readings sr
    JOIN sensors s ON sr.sensor_id = s.sensor_id
    WHERE s.sensor_type = 'AIR_QUALITY';
  `);

  const incidentsResult = await pool.query(`
    SELECT COUNT(*) AS active_incidents
    FROM incidents
    WHERE status = 'ACTIVE';
  `);

  const floodResult = await pool.query(`
    SELECT AVG(sr.reading_value) AS water_level
    FROM sensor_readings sr
    JOIN sensors s ON sr.sensor_id = s.sensor_id
    WHERE s.sensor_type IN ('FLOOD_LEVEL', 'WATER_LEVEL');
  `);

  // The Emergency Response page lists these on first load, before the
  // first Socket.IO simulation update arrives.
  const incidentListResult = await pool.query(`
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
    ORDER BY incident_id DESC;
  `);

  return {
    incidents: incidentListResult.rows,

    traffic_flow: Number(
      parseFloat(trafficResult.rows[0].traffic_flow || 0).toFixed(1)
    ),

    air_quality: Number(
      parseFloat(airResult.rows[0].air_quality || 0).toFixed(1)
    ),

    active_incidents: Number(
      incidentsResult.rows[0].active_incidents
    ),

    average_water_level: Number(
      parseFloat(floodResult.rows[0].water_level || 0).toFixed(1)
    )
  };
};

module.exports = {
  getDashboardMetrics
};