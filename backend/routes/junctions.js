const express = require("express");
const router = express.Router();

const junctionController = require("../controllers/junctionController");

router.get("/", junctionController.getJunctions);

module.exports = router;