const roadService = require("../services/roadService");

const getRoads = async (req, res) => {
  try {
    const roads = await roadService.getAllRoads();

    res.json(roads);
  } catch (error) {
    console.error("Error fetching roads:", error);

    res.status(500).json({
      error: "Failed to fetch roads"
    });
  }
};

module.exports = {
  getRoads
};