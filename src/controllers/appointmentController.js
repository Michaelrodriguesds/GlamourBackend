const Appointment = require("../models/Appointment");

// ── Máximo de agendamentos simultâneos por slot ──────────────────
const MAX_PER_SLOT = 2;

// ── Helpers ──────────────────────────────────────────────────────

const buildFilters = (query) => {
  const filters = {};

  if (query.date) {
    const start = new Date(query.date + "T00:00:00.000Z");
    const end   = new Date(query.date + "T23:59:59.999Z");
    filters.date = { $gte: start, $lte: end };
  }

  if (query.month && query.year) {
    const m        = parseInt(query.month);
    const y        = parseInt(query.year);
    const firstDay = new Date(Date.UTC(y, m - 1, 1,  0,  0,  0,   0));
    const lastDay  = new Date(Date.UTC(y, m,     0, 23, 59, 59, 999));
    filters.date   = { $gte: firstDay, $lte: lastDay };
  }

  if (query.location) filters.location = query.location;

  if (query.procedure) {
    filters.$or = [
      { procedures: { $regex: query.procedure, $options: "i" } },
      { procedure:  { $regex: query.procedure, $options: "i" } },
    ];
  }

  if (query.paid      !== undefined) filters.paid      = query.paid      === "true";
  if (query.confirmed !== undefined) filters.confirmed = query.confirmed === "true";

  if (query.client) {
    filters.clientName = { $regex: query.client, $options: "i" };
  }

  return filters;
};

const normalizeProcedures = (body) => {
  const data = { ...body };

  const hasArray  = Array.isArray(data.procedures) && data.procedures.length > 0;
  const hasString = typeof data.procedure === "string" && data.procedure.trim().length > 0;

  if (hasArray) {
    data.procedure  = data.procedures.join(" + ");
    data.procedures = data.procedures.map((p) => p.trim()).filter(Boolean);
  } else if (hasString) {
    data.procedures = data.procedure.split(" + ").map((s) => s.trim()).filter(Boolean);
  }

  return data;
};

// ────────────────────────────────────────────────────────────────
// LISTAR agendamentos
// GET /api/appointments
// ────────────────────────────────────────────────────────────────
exports.getAppointments = async (req, res) => {
  try {
    const filters      = buildFilters(req.query);
    const appointments = await Appointment.find(filters).sort({ date: 1, time: 1 });
    res.json({ count: appointments.length, data: appointments });
  } catch (error) {
    console.error("getAppointments:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// BUSCAR por ID
// ────────────────────────────────────────────────────────────────
exports.getAppointmentById = async (req, res) => {
  try {
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: "Agendamento não encontrado" });
    res.json(apt);
  } catch (error) {
    console.error("getAppointmentById:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// CRIAR agendamento
// POST /api/appointments
//
// ✅ NOVO: permite até MAX_PER_SLOT (2) agendamentos no mesmo horário/local.
//   - Atendimentos de 30 min cabem 2 no mesmo slot.
//   - Só bloqueia quando já há MAX_PER_SLOT agendamentos.
// ────────────────────────────────────────────────────────────────
exports.createAppointment = async (req, res) => {
  try {
    const data = normalizeProcedures(req.body);

    const slotCount = await countSlotOccupancy(data.date, data.time, data.location);
    if (slotCount >= MAX_PER_SLOT) {
      return res.status(409).json({
        error:   "Horário lotado",
        message: `Já existem ${MAX_PER_SLOT} agendamentos às ${data.time} no ${data.location} nesta data. Escolha outro horário.`,
        currentOccupancy: slotCount,
        maxCapacity: MAX_PER_SLOT,
      });
    }

    const appointment = await Appointment.create(data);
    res.status(201).json(appointment);
  } catch (error) {
    console.error("createAppointment:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: "Dados inválidos", messages });
    }
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// ATUALIZAR agendamento
// ────────────────────────────────────────────────────────────────
exports.updateAppointment = async (req, res) => {
  try {
    const data = normalizeProcedures(req.body);

    const apt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { returnDocument: 'after', runValidators: false }
    );
    if (!apt) return res.status(404).json({ error: "Agendamento não encontrado" });
    res.json(apt);
  } catch (error) {
    console.error("updateAppointment:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: "Dados inválidos", messages });
    }
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// DELETAR agendamento
// ────────────────────────────────────────────────────────────────
exports.deleteAppointment = async (req, res) => {
  try {
    const apt = await Appointment.findByIdAndDelete(req.params.id);
    if (!apt) return res.status(404).json({ error: "Agendamento não encontrado" });
    res.json({ message: "Agendamento removido com sucesso" });
  } catch (error) {
    console.error("deleteAppointment:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// MARCAR COMO PAGO
// ────────────────────────────────────────────────────────────────
exports.markAsPaid = async (req, res) => {
  try {
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: "Agendamento não encontrado" });
    await apt.markAsPaid(req.body.paymentMethod);
    res.json({ message: "Pagamento registrado com sucesso", data: apt });
  } catch (error) {
    console.error("markAsPaid:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────
// CONFIRMAR CLIENTE
// ────────────────────────────────────────────────────────────────
exports.confirmAppointment = async (req, res) => {
  try {
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: "Agendamento não encontrado" });
    await apt.confirm();
    res.json({ message: "Agendamento confirmado com sucesso", data: apt });
  } catch (error) {
    console.error("confirmAppointment:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── Auxiliar: conta quantos agendamentos há no slot ──────────────
// Retorna o número atual de agendamentos no horário+local+data.
// Permite excluir um ID (para edições — não contar o próprio registro).
async function countSlotOccupancy(date, time, location, excludeId = null) {
  let dateStr;
  if (typeof date === "string") {
    dateStr = date.split("T")[0];
  } else {
    dateStr = new Date(date).toISOString().split("T")[0];
  }

  const start = new Date(dateStr + "T00:00:00.000Z");
  const end   = new Date(dateStr + "T23:59:59.999Z");

  const query = { date: { $gte: start, $lte: end }, time, location };
  if (excludeId) query._id = { $ne: excludeId };

  return await Appointment.countDocuments(query);
}
