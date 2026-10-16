const eWasteService = require("../services/eWasteService");

const getEWastePoints = async (req, res) => {
  try {
    const points =
      await eWasteService.getAllEWastePoints();

    res.json(points);
  }
  catch (error) {
    console.error(
      "Error fetching e-waste points:",
      error
    );

    res.status(500).json({
      error: "Failed to fetch e-waste points"
    });
  }
};

module.exports = {
  getEWastePoints
};