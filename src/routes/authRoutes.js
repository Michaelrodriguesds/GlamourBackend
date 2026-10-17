const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { protect } = require("../../src/middlewares/auth");

router.post("/login", ctrl.login); // POST /api/auth/login  (pública)
router.get("/verify", protect, ctrl.verifyToken); // GET  /api/auth/verify (protegida)

// POST /api/auth/refresh (pública): o frontend chama isso quando recebe 401
// com um token já expirado. NÃO pode usar `protect` aqui, pois `protect`
// rejeitaria o token expirado antes mesmo de chegar ao controller — a
// validação de expiração (com janela de graça) é feita dentro do próprio
// authController.refreshToken.
router.post("/refresh", ctrl.refreshToken);

module.exports = router;
