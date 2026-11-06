const Appointment      = require("../models/Appointment");
const ClientPreference = require("../models/ClientPreference");
const ReminderLog      = require("../models/ReminderLog");
const cfg              = require("../config/marketing");
const svc              = require("../services/marketing");

// Campos usados pela aba — nunca o documento inteiro.
const FIELDS = "clientName procedures procedure date time location price";

const today = () => svc.todayLocal(svc.clock.now(), cfg.TIMEZONE);

const isValidName = (name) => typeof name === "string" && name.trim().length > 0 && name.length <= 120;

// ── GET /api/marketing/reminders ─────────────────────────────────
// Agendadas para amanhã + clientes na hora de refazer.
exports.getReminders = async (_req, res) => {
  try {
    const t        = today();
    const tomorrow = svc.addDays(t, 1);

    const [tomorrowApts, allApts, prefs, logs] = await Promise.all([
      Appointment.find({
        date: { $gte: svc.toUtcMidnight(tomorrow), $lt: svc.toUtcMidnight(svc.addDays(tomorrow, 1)) },
      }).select(FIELDS).lean(),
      Appointment.find({}).select(FIELDS).lean(),
      ClientPreference.find({}).lean(),
      ReminderLog.find({}).select("key").lean(),
    ]);

    const prefsMap = svc.prefsToMap(prefs);
    const sentKeys = new Set((logs || []).map((l) => l.key));

    res.json({
      today:        t,
      tomorrow,
      appointments: svc.buildTomorrowList(tomorrowApts, prefsMap, sentKeys),
      returns:      svc.buildReturnList(allApts, t, prefsMap, sentKeys, cfg),
    });
  } catch (error) {
    console.error("marketingController.getReminders:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── POST /api/marketing/reminders/sent ───────────────────────────
// Body: { key, type, clientName }. Idempotente: marcar 2x não duplica.
exports.markSent = async (req, res) => {
  try {
    const { key, type, clientName } = req.body || {};
    if (typeof key !== "string" || !key.trim() || key.length > 300) {
      return res.status(400).json({ error: "Campo 'key' inválido" });
    }
    if (!["appointment", "return", "campaign"].includes(type)) {
      return res.status(400).json({ error: "Campo 'type' inválido" });
    }

    await ReminderLog.updateOne(
      { key },
      { $setOnInsert: { key, type, clientName: typeof clientName === "string" ? clientName.trim() : "", sentAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, key });
  } catch (error) {
    console.error("marketingController.markSent:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE /api/marketing/reminders/sent?key=... ─────────────────
// Desfaz um "Enviei" tocado por engano.
exports.unmarkSent = async (req, res) => {
  try {
    const key = req.query.key;
    if (typeof key !== "string" || !key.trim() || key.length > 300) {
      return res.status(400).json({ error: "Parâmetro 'key' inválido" });
    }
    await ReminderLog.deleteOne({ key });
    res.json({ ok: true, key });
  } catch (error) {
    console.error("marketingController.unmarkSent:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/marketing/movement ──────────────────────────────────
// Atendimentos por dia da semana e por período, últimos 90 dias.
exports.getMovement = async (_req, res) => {
  try {
    const t     = today();
    const start = svc.addDays(t, -cfg.MOVEMENT_DAYS);
    const apts  = await Appointment.find({
      date: { $gte: svc.toUtcMidnight(start), $lt: svc.toUtcMidnight(t) },
    }).select("date time").lean();

    res.json(svc.buildMovement(apts, t, cfg.MOVEMENT_DAYS));
  } catch (error) {
    console.error("marketingController.getMovement:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/marketing/segments ──────────────────────────────────
// Fiéis, sumidas e novas.
exports.getSegments = async (_req, res) => {
  try {
    const t    = today();
    const apts = await Appointment.find({}).select(FIELDS).lean();
    res.json({ today: t, ...svc.buildSegments(apts, t, cfg) });
  } catch (error) {
    console.error("marketingController.getSegments:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/marketing/prefs/:clientName ─────────────────────────
exports.getPreference = async (req, res) => {
  try {
    const clientName = (req.params.clientName || "").trim();
    if (!isValidName(clientName)) return res.status(400).json({ error: "Nome inválido" });

    const pref = await ClientPreference.findOne({ clientName }).lean();
    res.json({
      clientName,
      remindAppointment: pref ? pref.remindAppointment !== false : true,
      remindReturn:      pref ? pref.remindReturn !== false : true,
    });
  } catch (error) {
    console.error("marketingController.getPreference:", error);
    res.status(500).json({ error: error.message });
  }
};

// ── PUT /api/marketing/prefs/:clientName ─────────────────────────
// Body: { remindAppointment?: boolean, remindReturn?: boolean }
exports.updatePreference = async (req, res) => {
  try {
    const clientName = (req.params.clientName || "").trim();
    if (!isValidName(clientName)) return res.status(400).json({ error: "Nome inválido" });

    const body = req.body || {};
    const update = {};
    for (const field of ["remindAppointment", "remindReturn"]) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== "boolean") {
        return res.status(400).json({ error: `Campo '${field}' deve ser verdadeiro ou falso` });
      }
      update[field] = body[field];
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nada para atualizar" });
    }

    const pref = await ClientPreference.findOneAndUpdate(
      { clientName },
      { $set: update }, // no upsert, o nome vem do filtro
      { upsert: true, returnDocument: "after", runValidators: true }
    ).lean();

    res.json({
      clientName,
      remindAppointment: pref ? pref.remindAppointment !== false : true,
      remindReturn:      pref ? pref.remindReturn !== false : true,
    });
  } catch (error) {
    console.error("marketingController.updatePreference:", error);
    res.status(500).json({ error: error.message });
  }
};
