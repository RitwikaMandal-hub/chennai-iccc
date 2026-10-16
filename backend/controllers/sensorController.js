const sensorService = require("../services/sensorService");

const getSensors = async (req, res) => {
  try {
    const sensors = await sensorService.getAllSensors();

    res.json(sensors);
  } catch (error) {
    console.error("Error fetching sensors:", error);

    res.status(500).json({
      error: "Failed to fetch sensors"
    });
  }
};

module.exports = {
  getSensors
};