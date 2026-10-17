const request = require("supertest");
const jwt     = require("jsonwebtoken");
const app     = require("../src/app");

describe("POST /api/auth/login", () => {
  it("retorna token com usuário/senha corretos", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: process.env.APP_USER, password: process.env.APP_PASS });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
  });

  it("rejeita usuário/senha incorretos", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "errado", password: "errado" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

describe("GET /api/auth/verify", () => {
  it("rejeita sem token", async () => {
    const res = await request(app).get("/api/auth/verify");
    expect(res.status).toBe(401);
  });

  it("aceita token válido", async () => {
    const token = jwt.sign({ username: "test-user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const res = await request(app)
      .get("/api/auth/verify")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it("rejeita token com assinatura inválida", async () => {
    const token = jwt.sign({ username: "test-user" }, "chave-errada", { expiresIn: "1h" });
    const res = await request(app)
      .get("/api/auth/verify")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  // Esta é a rota que o ChatGPT apontou como ausente (authRoutes.js só
  // registrava /login e /verify). Confirma que agora existe e funciona.

  it("rejeita sem token", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("renova um token ainda válido", async () => {
    const token = jwt.sign({ username: "test-user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    // O novo token deve ser válido e preservar o payload original.
    // (Não comparamos string: se emitido no mesmo segundo, `iat`/`exp`
    // têm resolução de segundos e o JWT pode sair byte-idêntico — isso
    // é uma característica normal do JWT, não um bug.)
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.username).toBe("test-user");
  });

  it("renova um token expirado há pouco tempo (dentro da janela de graça)", async () => {
    // exp no passado recente (1 hora atrás)
    const token = jwt.sign(
      { username: "test-user", exp: Math.floor(Date.now() / 1000) - 60 * 60 },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("REJEITA um token expirado há mais de 7 dias (fora da janela de graça)", async () => {
    // Esta é a correção de segurança: antes, `ignoreExpiration: true`
    // sozinho permitia renovar um token expirado há MESES/ANOS
    // indefinidamente, bastando a assinatura ser válida.
    const eightDaysAgo = Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60;
    const token = jwt.sign(
      { username: "test-user", exp: eightDaysAgo },
      process.env.JWT_SECRET
    );
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it("rejeita token com assinatura inválida mesmo no fluxo de refresh", async () => {
    const token = jwt.sign({ username: "test-user" }, "chave-errada", { expiresIn: "1h" });
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
