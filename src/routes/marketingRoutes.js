const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/marketingController");
const { protect } = require("../middlewares/auth");

// Aba "Clientes & Marketing" — todas as rotas exigem login.
router.use(protect);

router.get("/reminders",         ctrl.getReminders);     // amanhã + hora de refazer
router.post("/reminders/sent",   ctrl.markSent);         // marcar "Enviei"
router.delete("/reminders/sent", ctrl.unmarkSent);       // desfazer "Enviei" (?key=)
router.get("/movement",          ctrl.getMovement);      // dia da semana / período
router.get("/segments",          ctrl.getSegments);      // fiéis / sumidas / novas
router.get("/prefs/:clientName", ctrl.getPreference);    // caixinhas da cliente
router.put("/prefs/:clientName", ctrl.updatePreference);

module.exports = router;
