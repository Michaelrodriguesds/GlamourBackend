const mongoose = require("mongoose");

// Preferências de lembrete por cliente (aba "Clientes & Marketing").
// Sem registro para a cliente = recebe os dois lembretes (padrão).
// A dona desmarca na ficha da cliente, na aba Clientes.
const clientPreferenceSchema = new mongoose.Schema(
  {
    clientName: {
      type:     String,
      required: [true, "Nome da cliente é obrigatório"],
      trim:     true,
      unique:   true,
    },
    remindAppointment: { type: Boolean, default: true }, // lembrete do agendamento
    remindReturn:      { type: Boolean, default: true }, // lembrete de "hora de refazer"
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientPreference", clientPreferenceSchema);
