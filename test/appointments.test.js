const jwt     = require("jsonwebtoken");
const request = require("supertest");

// ── Mock do model Appointment ──────────────────────────────────────
// Não conectamos a nenhum MongoDB real (nem de teste): simulamos o
// que o Mongoose devolveria, para testar a LÓGICA do controller
// (filtros, limite de segurança, status code) isoladamente.
jest.mock("../src/models/Appointment");
const Appointment = require("../src/models/Appointment");

// Helper: simula um Query do Mongoose (find().select().sort().limit())
// que também é "thenable" (pode ser usado com await diretamente).
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

describe("GET /api/appointments", () => {
  it("rejeita sem token (rota protegida)", async () => {
    const res = await request(app).get("/api/appointments");
    expect(res.status).toBe(401);
  });

  it("com filtro de data (month/year), não aplica limite de segurança", async () => {
    const fakeData = [{ _id: "1", clientName: "Ana" }];
    Appointment.find.mockReturnValue(makeQuery(fakeData));

    const res = await request(app)
      .get("/api/appointments")
      .query({ month: 3, year: 2026 })
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(fakeData);
    expect(res.body.truncated).toBe(false);

    // Confere que o filtro de data foi realmente passado ao Mongoose
    const filtersUsed = Appointment.find.mock.calls[0][0];
    expect(filtersUsed.date).toBeDefined();
  });

  it("SEM nenhum filtro, aplica o limite de segurança (500) e ordena do mais recente", async () => {
    const fakeData = Array.from({ length: 500 }, (_, i) => ({ _id: String(i) }));
    const query = makeQuery(fakeData);
    Appointment.find.mockReturnValue(query);

    const res = await request(app)
      .get("/api/appointments")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(query.limit).toHaveBeenCalledWith(500);
    expect(query.sort).toHaveBeenCalledWith({ date: -1, time: -1 });
    expect(res.body.truncated).toBe(true); // bateu exatamente no limite
  });

  it("filtro clientExact=true usa igualdade exata, não regex", async () => {
    Appointment.find.mockReturnValue(makeQuery([]));

    await request(app)
      .get("/api/appointments")
      .query({ client: "Ana", clientExact: "true" })
      .set("Authorization", authHeader());

    const filtersUsed = Appointment.find.mock.calls[0][0];
    expect(filtersUsed.clientName).toBe("Ana"); // string direta, não { $regex }
  });

  it("filtro client sem clientExact usa regex (busca parcial, como antes)", async () => {
    Appointment.find.mockReturnValue(makeQuery([]));

    await request(app)
      .get("/api/appointments")
      .query({ client: "Ana" })
      .set("Authorization", authHeader());

    const filtersUsed = Appointment.find.mock.calls[0][0];
    expect(filtersUsed.clientName).toEqual({ $regex: "Ana", $options: "i" });
  });
});
