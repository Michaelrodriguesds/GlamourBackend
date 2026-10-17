const jwt     = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../src/models/Appointment");
const Appointment = require("../src/models/Appointment");

const app = require("../src/app");

function authHeader() {
  const token = jwt.sign({ username: "test-user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/clients", () => {
  // Endpoint novo: antes a tela de clientes dependia de GET /appointments
  // sem filtro (que agora tem limite de segurança de 500), o que podia
  // deixar a lista de clientes incompleta. Este endpoint agrega direto
  // no Mongo, então nunca é truncado por volume de agendamentos.

  it("rejeita sem token", async () => {
    const res = await request(app).get("/api/clients");
    expect(res.status).toBe(401);
  });

  it("retorna clientes agregados a partir do $group", async () => {
    Appointment.aggregate.mockResolvedValue([
      {
        _id: "Maria",
        count: 3,
        totalRevenue: 300,
        receivedRevenue: 200,
        pendingCount: 1,
        unconfirmedCount: 0,
        lastAppointment: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    const res = await request(app)
      .get("/api/clients")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0]).toMatchObject({
      clientName:      "Maria",
      count:            3,
      totalRevenue:     300,
      receivedRevenue:  200,
      pendingRevenue:   100,
      pendingCount:     1,
      unconfirmedCount: 0,
    });
  });

  it("usa uma única aggregation (não N+1 por cliente)", async () => {
    Appointment.aggregate.mockResolvedValue([]);

    await request(app)
      .get("/api/clients")
      .set("Authorization", authHeader());

    expect(Appointment.aggregate).toHaveBeenCalledTimes(1);
  });

  it("aplica busca por nome quando 'search' é informado", async () => {
    Appointment.aggregate.mockResolvedValue([]);

    await request(app)
      .get("/api/clients")
      .query({ search: "mar" })
      .set("Authorization", authHeader());

    const pipeline = Appointment.aggregate.mock.calls[0][0];
    expect(pipeline[0].$match.clientName).toEqual({ $regex: "mar", $options: "i" });
  });
});
