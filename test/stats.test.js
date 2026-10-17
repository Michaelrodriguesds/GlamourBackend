const jwt     = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../src/models/Appointment");
const Appointment = require("../src/models/Appointment");

function makeQuery(result) {
  const query = {
    select: jest.fn(() => query),
    sort:   jest.fn(() => query),
    limit:  jest.fn(() => query),
    lean:   jest.fn(() => query),
    then:   (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

const app = require("../src/app");

function authHeader() {
  const token = jwt.sign({ username: "test-user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/stats/monthly", () => {
  it("exige month e year", async () => {
    const res = await request(app)
      .get("/api/stats/monthly")
      .set("Authorization", authHeader());

    expect(res.status).toBe(400);
  });

  it("retorna estatísticas quando month/year são informados", async () => {
    Appointment.aggregate.mockResolvedValue([]);
    Appointment.find.mockReturnValue(makeQuery([]));
    Appointment.countDocuments.mockResolvedValue(0);

    const res = await request(app)
      .get("/api/stats/monthly")
      .query({ month: 3, year: 2026 })
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.period).toEqual({ month: 3, year: 2026 });
    expect(res.body.summary.totalAppointments).toBe(0);
  });

  it("usa .lean() nas listas de pendências/não confirmados (otimização)", async () => {
    Appointment.aggregate.mockResolvedValue([]);
    const pendingQuery = makeQuery([]);
    const unconfQuery  = makeQuery([]);
    Appointment.find
      .mockReturnValueOnce(pendingQuery)
      .mockReturnValueOnce(unconfQuery);
    Appointment.countDocuments.mockResolvedValue(0);

    await request(app)
      .get("/api/stats/monthly")
      .query({ month: 3, year: 2026 })
      .set("Authorization", authHeader());

    expect(pendingQuery.lean).toHaveBeenCalled();
    expect(unconfQuery.lean).toHaveBeenCalled();
  });
});

describe("GET /api/stats/trend", () => {
  // Esta é a rota que o ChatGPT apontou como ausente no statsRoutes.js.

  it("não existe mais 404 — a rota está registrada", async () => {
    Appointment.aggregate.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/stats/trend")
      .query({ year: 2026 })
      .set("Authorization", authHeader());

    expect(res.status).not.toBe(404);
  });

  it("exige year", async () => {
    const res = await request(app)
      .get("/api/stats/trend")
      .set("Authorization", authHeader());

    expect(res.status).toBe(400);
  });

  it("consolida em apenas 2 agregações (não 1 por mês)", async () => {
    Appointment.aggregate.mockResolvedValue([]);

    await request(app)
      .get("/api/stats/trend")
      .query({ year: 2020 }) // ano fechado: 12 meses inteiros
      .set("Authorization", authHeader());

    // Antes da correção, isso chamaria aggregate() até 12 vezes (uma
    // por mês) só para o procedimento mais popular, mais countDocuments
    // e outra aggregate por mês para receita. Agora são sempre 2 chamadas,
    // nunca mais, independente do número de meses.
    expect(Appointment.aggregate).toHaveBeenCalledTimes(2);
  });

  it("retorna o formato esperado pelo app (year, months, peak, low, totalYear, revenueYear)", async () => {
    Appointment.aggregate
      .mockResolvedValueOnce([
        { _id: 1, count: 5, total: 500, received: 300 },
        { _id: 2, count: 2, total: 100, received: 100 },
      ])
      .mockResolvedValueOnce([
        { _id: 1, topProcedure: "Depilação" },
        { _id: 2, topProcedure: "Spa dos Lábios" },
      ]);

    const res = await request(app)
      .get("/api/stats/trend")
      .query({ year: 2020 })
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("year");
    expect(res.body).toHaveProperty("months");
    expect(res.body).toHaveProperty("peak");
    expect(res.body).toHaveProperty("low");
    expect(res.body).toHaveProperty("totalYear");
    expect(res.body).toHaveProperty("revenueYear");
    expect(res.body.months).toHaveLength(12);
    expect(res.body.months[0].totalAppointments).toBe(5);
    expect(res.body.months[0].topProcedure).toBe("Depilação");
    expect(res.body.totalYear).toBe(7);
  });
});
