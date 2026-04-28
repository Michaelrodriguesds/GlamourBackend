const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/availabilityController");
const { protect } = require("../middlewares/auth");

router.use(protect);

router.get("/",      ctrl.getDayAvailability);   // GET /api/availability?date=2025-03-01&location=Studio+Aclimação
router.get("/month", ctrl.getMonthAvailability); // GET /api/availability/month?month=3&year=2025&location=...

module.exports = router;