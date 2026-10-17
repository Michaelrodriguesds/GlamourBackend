// Variáveis de ambiente usadas pelos testes. Nunca aponta para um banco
// real nem usa segredos de produção — os testes mockam o Mongoose e
// nunca abrem conexão nenhuma com o MongoDB Atlas real.
process.env.JWT_SECRET      = "test-secret-not-used-in-production";
process.env.JWT_EXPIRES_IN  = "1h";
process.env.APP_USER        = "test-user";
process.env.APP_PASS        = "test-pass";
process.env.NODE_ENV        = "test";
