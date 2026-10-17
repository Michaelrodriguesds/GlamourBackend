require("dotenv").config();

const app       = require("./src/app");
const connectDB = require("./src/config/database");

// ── Banco de dados ───────────────────────────────────────────────
connectDB();

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌸 Glamour Agenda API na porta ${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
});
