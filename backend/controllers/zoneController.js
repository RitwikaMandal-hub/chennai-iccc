const zoneService = require("../services/zoneService");

const getZones = async (req, res) => {
  try {
    const zones = await zoneService.getAllZones();

    res.json(zones);
  } catch (error) {
    console.error("Error fetching zones:", error);

    res.status(500).json({
      error: "Failed to fetch city zones"
    });
  }
};

module.exports = {
  getZones
};