const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/appointmentController");
const { protect } = require("../middlewares/auth");

// Todas as rotas protegidas por JWT
router.use(protect);

router.get("/",           ctrl.getAppointments);       // GET  /api/appointments
router.post("/",          ctrl.createAppointment);      // POST /api/appointments
router.get("/:id",        ctrl.getAppointmentById);     // GET  /api/appointments/:id
router.put("/:id",        ctrl.updateAppointment);      // PUT  /api/appointments/:id
router.delete("/:id",     ctrl.deleteAppointment);      // DEL  /api/appointments/:id
router.patch("/:id/pay",  ctrl.markAsPaid);             // PATCH /api/appointments/:id/pay
router.patch("/:id/confirm", ctrl.confirmAppointment);  // PATCH /api/appointments/:id/confirm

module.exports = router;