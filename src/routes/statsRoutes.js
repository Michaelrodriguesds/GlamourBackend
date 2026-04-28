const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/statsController");
const { protect } = require("../middlewares/auth");

router.use(protect);

router.get("/monthly", ctrl.getMonthlyStats); // GET /api/stats/monthly?month=&year=
router.get("/trend",   ctrl.getTrendStats);   // GET /api/stats/trend?year=  ← NOVO

module.exports = router;
