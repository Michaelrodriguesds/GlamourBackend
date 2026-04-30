const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/statsController");
const { protect } = require("../../src/middlewares/auth");

router.use(protect);

router.get("/monthly", ctrl.getMonthlyStats); // GET /api/stats/monthly?month=&year=

module.exports = router;
