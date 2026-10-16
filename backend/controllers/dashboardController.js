const dashboardService = require("../services/dashboardService");

const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await dashboardService.getDashboardMetrics();

    res.json(metrics);
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);

    res.status(500).json({
      error: "Failed to fetch dashboard metrics"
    });
  }
};

module.exports = {
  getDashboardMetrics
};