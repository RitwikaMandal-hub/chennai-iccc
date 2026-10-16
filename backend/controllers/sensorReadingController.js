const sensorReadingService = require("../services/sensorReadingService");

const getReadings = async (req, res) => {
  try {
    const readings = await sensorReadingService.getLatestReadings();

    res.json(readings);
  } catch (error) {
    console.error("Error fetching sensor readings:", error);

    res.status(500).json({
      error: "Failed to fetch sensor readings"
    });
  }
};

module.exports = {
  getReadings
};