const jwt = require("jsonwebtoken");

// ─── Login ───────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username !== process.env.APP_USER || password !== process.env.APP_PASS) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || "30d";
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn });

    res.json({ message: "Login realizado com sucesso", token, expiresIn });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Verificar token ─────────────────────────────────────────────
exports.verifyToken = (req, res) => {
  res.json({ valid: true, user: req.user });
};

// ─── Refresh token silencioso ─────────────────────────────────────
// POST /api/auth/refresh  — Bearer <token_atual>
// Não exige token válido (pode estar expirado); verifica com ignoreExpiration.
// Só recusa se o token for totalmente inválido (assinatura errada).
exports.refreshToken = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const oldToken = authHeader.split(" ")[1];

    // Decodifica sem checar expiração
    let decoded;
    try {
      decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch (err) {
      // Assinatura inválida — token adulterado
      return res.status(401).json({ error: "Token inválido" });
    }

    // Emite novo token com o mesmo payload
    const expiresIn = process.env.JWT_EXPIRES_IN || "30d";
    const newToken  = jwt.sign({ username: decoded.username }, process.env.JWT_SECRET, { expiresIn });

    res.json({ token: newToken, expiresIn });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
