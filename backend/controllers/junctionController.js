const junctionService = require("../services/junctionService");

const getJunctions = async (req, res) => {
  try {
    const junctions = await junctionService.getAllJunctions();

    res.json(junctions);
  } catch (error) {
    console.error("Error fetching junctions:", error);

    res.status(500).json({
      error: "Failed to fetch junctions"
    });
  }
};

module.exports = {
  getJunctions
};
