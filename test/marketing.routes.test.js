// Testes das rotas /api/marketing (banco simulado, nenhum dado real).
const jwt     = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../src/models/Appointment");
jest.mock("../src/models/ClientPreference");
jest.mock("../src/models/ReminderLog");
const Appointment      = require("../src/models/Appointment");
const ClientPreference = require("../src/models/ClientPreference");
const ReminderLog      = require("../src/models/ReminderLog");
const svc              = require("../src/services/marketing");

const app = require("../src/app");

const auth = () => `Bearer ${jwt.sign({ username: "test-user" }, process.env.JWT_SECRET, { expiresIn: "1h" })}`;
const d = (str) => new Date(str + "T00:00:00.000Z");

// Simula o encadeamento do Mongoose: Model.find(...).select(...).lean()
const chain = (data) => {
  const q = { select: () => q, lean: () => Promise.resolve(data) };
  return q;
};

const realNow = svc.clock.now;
beforeEach(() => {
  jest.clearAllMocks();
  // "Hoje" = sexta, 30/10/2026, 12h em Brasília.
  svc.clock.now = () => new Date("2026-10-30T15:00:00Z");
});
afterAll(() => {
  svc.clock.now = realNow;
});

describe("proteção", () => {
  it.each([
    ["get", "/api/marketing/reminders"],
    ["get", "/api/marketing/movement"],
    ["get", "/api/marketing/segments"],
    ["post", "/api/marketing/reminders/sent"],
    ["get", "/api/marketing/prefs/Maria"],
  ])("%s %s exige login", async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/marketing/reminders", () => {
  it("devolve amanhã e hora de refazer, com 'enviado' e preferências", async () => {
    const tomorrow = [
      { _id: "a1", clientName: "Juliana", procedures: ["Cílios Tufinho"], date: d("2026-10-31"), time: "09:00", location: "Studio Manilha" },
    ];
    const all = [
      ...tomorrow,
      { _id: "a2", clientName: "Ana", procedures: ["Cílios Tufinho"], date: d("2026-10-15"), time: "10:00" },
      { _id: "a3", clientName: "Bia", procedures: ["Cílios Tufinho"], date: d("2026-10-15"), time: "10:00" },
    ];
    Appointment.find.mockReturnValueOnce(chain(tomorrow)).mockReturnValueOnce(chain(all));
    ClientPreference.find.mockReturnValue(chain([{ clientName: "Bia", remindReturn: false }]));
    ReminderLog.find.mockReturnValue(chain([{ key: "appt|a1" }]));

    const res = await request(app).get("/api/marketing/reminders").set("Authorization", auth());

    expect(res.status).toBe(200);
    expect(res.body.today).toBe("2026-10-30");
    expect(res.body.tomorrow).toBe("2026-10-31");
    expect(res.body.appointments).toHaveLength(1);
    expect(res.body.appointments[0]).toMatchObject({ clientName: "Juliana", sent: true });
    expect(res.body.returns.map((r) => r.clientName)).toEqual(["Ana"]);

    // A 1ª busca é só do dia de amanhã (31/10 00:00 até 01/11 00:00 UTC).
    const q = Appointment.find.mock.calls[0][0];
    expect(q.date.$gte.toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(q.date.$lt.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("erro do banco vira 500 com mensagem", async () => {
    Appointment.find.mockImplementation(() => { throw new Error("falhou"); });
    const res = await request(app).get("/api/marketing/reminders").set("Authorization", auth());
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("falhou");
  });
});

describe("POST/DELETE /api/marketing/reminders/sent", () => {
  it("marca como enviado sem duplicar (upsert)", async () => {
    ReminderLog.updateOne.mockResolvedValue({});
    const res = await request(app)
      .post("/api/marketing/reminders/sent")
      .set("Authorization", auth())
      .send({ key: "appt|a1", type: "appointment", clientName: "Juliana" });
    expect(res.status).toBe(200);
    const [filter, update, opts] = ReminderLog.updateOne.mock.calls[0];
    expect(filter).toEqual({ key: "appt|a1" });
    expect(update.$setOnInsert).toMatchObject({ key: "appt|a1", type: "appointment", clientName: "Juliana" });
    expect(opts).toEqual({ upsert: true });
  });

  it("recusa chave ou tipo inválidos", async () => {
    const bad1 = await request(app).post("/api/marketing/reminders/sent").set("Authorization", auth()).send({ type: "appointment" });
    const bad2 = await request(app).post("/api/marketing/reminders/sent").set("Authorization", auth()).send({ key: "x", type: "outro" });
    expect(bad1.status).toBe(400);
    expect(bad2.status).toBe(400);
    expect(ReminderLog.updateOne).not.toHaveBeenCalled();
  });

  it("desfaz um 'Enviei'", async () => {
    ReminderLog.deleteOne.mockResolvedValue({});
    const res = await request(app)
      .delete("/api/marketing/reminders/sent")
      .query({ key: "return|Ana|Cílios Tufinho|2026-10-15" })
      .set("Authorization", auth());
    expect(res.status).toBe(200);
    expect(ReminderLog.deleteOne).toHaveBeenCalledWith({ key: "return|Ana|Cílios Tufinho|2026-10-15" });
  });
});

describe("GET /api/marketing/movement e /segments", () => {
  it("movimento busca só os últimos 90 dias até ontem", async () => {
    Appointment.find.mockReturnValue(chain([{ date: d("2026-10-27"), time: "10:00" }]));
    const res = await request(app).get("/api/marketing/movement").set("Authorization", auth());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    const q = Appointment.find.mock.calls[0][0];
    expect(q.date.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(q.date.$lt.toISOString()).toBe("2026-10-30T00:00:00.000Z");
  });

  it("grupos devolvem as três listas", async () => {
    Appointment.find.mockReturnValue(chain([{ clientName: "Nova", procedures: ["Depilação"], date: d("2026-10-20"), price: 50 }]));
    const res = await request(app).get("/api/marketing/segments").set("Authorization", auth());
    expect(res.status).toBe(200);
    expect(res.body.newClients.map((c) => c.clientName)).toEqual(["Nova"]);
    expect(res.body.loyal).toEqual([]);
    expect(res.body.inactive).toEqual([]);
  });
});

describe("preferências da cliente", () => {
  it("sem registro: recebe os dois lembretes", async () => {
    ClientPreference.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const res = await request(app).get("/api/marketing/prefs/Maria%20Silva").set("Authorization", auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ clientName: "Maria Silva", remindAppointment: true, remindReturn: true });
    expect(ClientPreference.findOne).toHaveBeenCalledWith({ clientName: "Maria Silva" });
  });

  it("salva só os campos enviados (upsert)", async () => {
    ClientPreference.findOneAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ clientName: "Maria", remindAppointment: true, remindReturn: false }),
    });
    const res = await request(app)
      .put("/api/marketing/prefs/Maria")
      .set("Authorization", auth())
      .send({ remindReturn: false });
    expect(res.status).toBe(200);
    expect(res.body.remindReturn).toBe(false);
    const [filter, update, opts] = ClientPreference.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ clientName: "Maria" });
    expect(update.$set).toEqual({ remindReturn: false });
    expect(opts.upsert).toBe(true);
  });

  it("recusa valor que não é verdadeiro/falso e corpo vazio", async () => {
    const r1 = await request(app).put("/api/marketing/prefs/Maria").set("Authorization", auth()).send({ remindReturn: "nao" });
    const r2 = await request(app).put("/api/marketing/prefs/Maria").set("Authorization", auth()).send({});
    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
    expect(ClientPreference.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
