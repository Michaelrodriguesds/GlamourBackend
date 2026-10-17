const Appointment = require("../models/Appointment");

// ────────────────────────────────────────────────────────────────
// LISTAR CLIENTES (agregado, não paginado por agendamento)
// GET /api/clients?search=maria
//
// Por quê este endpoint existe:
// A tela de clientes antes chamava GET /api/appointments sem filtro
// nenhum e montava a lista de clientes no próprio app, agrupando os
// agendamentos por nome. Isso tinha dois problemas:
//   1) Trazia TODOS os agendamentos (documentos inteiros) só para
//      calcular contagens e somas — caro conforme a base cresce.
//   2) Se o backend limitar essa rota (proteção de segurança contra
//      crescimento futuro), a lista de clientes passava a vir
//      incompleta sem ninguém perceber.
// Aqui o agrupamento é feito no próprio MongoDB via $group, que já
// devolve só um documento por cliente (nunca por agendamento) — então
// o resultado nunca é "truncado" por volume de agendamentos, só
// cresce com o número de clientes distintos (sempre bem menor).
// ────────────────────────────────────────────────────────────────
exports.getClients = async (req, res) => {
  try {
    const { search } = req.query;
    const match = {};
    if (search) {
      match.clientName = { $regex: search, $options: "i" };
    }

    const clients = await Appointment.aggregate([
      { $match: match },
      {
        $group: {
          _id:              "$clientName",
          count:            { $sum: 1 },
          totalRevenue:     { $sum: "$price" },
          receivedRevenue:  { $sum: { $cond: ["$paid", "$price", 0] } },
          pendingCount:     { $sum: { $cond: ["$paid", 0, 1] } },
          unconfirmedCount: { $sum: { $cond: ["$confirmed", 0, 1] } },
          lastAppointment:  { $max: "$date" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      count: clients.length,
      data: clients.map((c) => ({
        clientName:       c._id || "(sem nome)",
        count:             c.count,
        totalRevenue:      Math.round(c.totalRevenue * 100) / 100,
        receivedRevenue:   Math.round(c.receivedRevenue * 100) / 100,
        pendingRevenue:    Math.round((c.totalRevenue - c.receivedRevenue) * 100) / 100,
        pendingCount:      c.pendingCount,
        unconfirmedCount:  c.unconfirmedCount,
        lastAppointment:   c.lastAppointment,
      })),
    });
  } catch (error) {
    console.error("clientController.getClients:", error);
    res.status(500).json({ error: error.message });
  }
};
