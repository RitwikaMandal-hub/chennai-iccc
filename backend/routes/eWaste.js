const express = require("express");

const router = express.Router();

const eWasteController =
  require("../controllers/eWasteController");

router.get(
  "/",
  eWasteController.getEWastePoints
);

module.exports = router;