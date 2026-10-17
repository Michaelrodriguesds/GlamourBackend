const express   = require("express");
const cors      = require("cors");
const rateLimit = require("express-rate-limit");
const mongoose  = require("mongoose");

// ── App Express configurado, SEM efeitos colaterais ────────────────
// Não conecta ao Mongo nem chama listen() aqui — isso é feito só em
// server.js (produção) ou mockado em testes. Isso permite usar
// supertest contra `app` sem precisar de um Mongo real nem abrir porta.
const app = express();

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
app.use("/api/appointments",  require("./routes/appointmentRoutes"));
app.use("/api/stats",         require("./routes/statsRoutes"));
app.use("/api/availability",  require("./routes/availabilityRoutes"));
app.use("/api/auth",          require("./routes/authRoutes"));
app.use("/api/notes",         require("./routes/noteRoutes"));
app.use("/api/clients",       require("./routes/clientRoutes"));

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

module.exports = app;
