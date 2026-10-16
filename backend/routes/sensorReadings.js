const express = require("express");
const router = express.Router();

const sensorReadingController = require("../controllers/sensorReadingController");

router.get("/", sensorReadingController.getReadings);

module.exports = router;