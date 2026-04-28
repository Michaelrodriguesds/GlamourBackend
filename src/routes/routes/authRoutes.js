const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { protect } = require("../../src/middlewares/auth");

router.post("/login", ctrl.login); // POST /api/auth/login  (pública)
router.get("/verify", protect, ctrl.verifyToken); // GET  /api/auth/verify (protegida)

module.exports = router;
