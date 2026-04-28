const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/authController");
const { protect } = require("../middlewares/auth");

router.post("/login",   ctrl.login);                    // POST /api/auth/login
router.get("/verify",   protect, ctrl.verifyToken);     // GET  /api/auth/verify
router.post("/refresh", ctrl.refreshToken);             // POST /api/auth/refresh ← NOVO

module.exports = router;
