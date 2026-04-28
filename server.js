require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");
const mongoose   = require("mongoose");
const connectDB  = require("./src/config/database");

const app = express();

// ── Banco de dados ───────────────────────────────────────────────
connectDB();

// ── Rate limiting (express-rate-limit real, não in-memory manual) ─
const limiter = rateLimit({
  windowMs:         60 * 1000,  // janela de 1 minuto
  max:              120,         // máx 120 req por IP por janela
  standardHeaders:  true,
  legacyHeaders:    false,
  skip: (req) => req.path === "/" || req.path === "/health",
  message: {
    error:      "Muitas requisições",
    message:    "Limite atingido. Tente novamente em 1 minuto.",
    retryAfter: 60,
  },
});

// ── Middlewares globais ──────────────────────────────────────────
app.use(cors({
  origin:         true,
  methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials:    true,
}));

app.use(express.json());
app.use("/api/", limiter);   // rate limit só nas rotas de API

// ── Rotas ────────────────────────────────────────────────────────
app.use("/api/appointments",  require("./src/routes/appointmentRoutes"));
app.use("/api/stats",         require("./src/routes/statsRoutes"));
app.use("/api/availability",  require("./src/routes/availabilityRoutes"));
app.use("/api/auth",          require("./src/routes/authRoutes"));
app.use("/api/notes",         require("./src/routes/noteRoutes"));

// ── Health check (verifica MongoDB de verdade) ────────────────────
app.get("/health", (_req, res) => {
  const state  = mongoose.connection.readyState;
  // 0=desconectado 1=conectado 2=conectando 3=desconectando
  const dbOk   = state === 1;
  const status = dbOk ? "healthy" : "degraded";

  res.status(dbOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    db: {
      status:     dbOk ? "connected" : "disconnected",
      readyState: state,
    },
    version: "1.0.0",
  });
});

app.get("/", (_req, res) => {
  res.json({ status: "✅ Glamour Agenda API online", version: "1.0.0", health: "/health" });
});

// ── Erro global ───────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.stack);
  res.status(500).json({ error: "Erro interno do servidor", message: err.message });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌸 Glamour Agenda API na porta ${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
});
