const express = require("express");
const router = express.Router();

const roadController = require("../controllers/roadController");

router.get("/", roadController.getRoads);

module.exports = router;