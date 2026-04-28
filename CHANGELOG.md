# Changelog — Glamour Agenda Backend

## Versão atual — Mudanças aplicadas

### Novas funcionalidades

#### Agendamento duplo no mesmo horário
- `appointmentController.js` — `checkConflict` substituído por `countSlotOccupancy`
  - Slot só é bloqueado quando já tem **2** agendamentos (antes bloqueava com 1)
  - Retorna erro 409 com `currentOccupancy` e `maxCapacity` no body
- `availabilityController.js` — cada slot agora retorna `appointments[]` (array)
  - Campo `available: true` mesmo com 1 agendamento (ainda tem vaga para 1 mais)
  - `occupancy` e `maxCapacity: 2` em cada slot
  - Resposta do mês diferencia `partialSlots` (1/2) de `bookedSlots` (2/2)

#### Endpoint de tendência anual
- `statsController.js` — novo método `getTrendStats`
  - `GET /api/stats/trend?year=2025`
  - Retorna agendamentos + receita mês a mês até o mês atual
  - Identifica automaticamente mês de pico e mês de baixa demanda

#### Endpoint de refresh token
- `authController.js` — novo método `refreshToken`
  - `POST /api/auth/refresh` com `Bearer <token_atual>` (mesmo expirado)
  - Emite novo token sem pedir login novamente

### Infraestrutura

#### Health check real
- `server.js` — `GET /health` verifica `mongoose.connection.readyState`
  - Retorna HTTP 503 se MongoDB desconectado
  - Body com `status`, `uptime`, `db.status`, `version`
  - Configurado no `render.yaml` como `healthCheckPath: /health`

#### Rate limiting com express-rate-limit
- `server.js` — 120 req/min por IP usando `express-rate-limit` (não mais in-memory)
- Skipa `/` e `/health` para não penalizar o próprio Render

#### Limite de conexões MongoDB
- `database.js` — `maxPoolSize: 5` (seguro para Atlas M0 gratuito)
- + `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`
- Listeners de `disconnected` e `reconnected`

#### Logs de erro com timestamp
- `server.js` — middleware global com `[timestamp] METHOD /path: stack`

### Arquivos novos/modificados
| Arquivo | O que mudou |
|---|---|
| `server.js` | Health check, rate limit real, erro global com timestamp |
| `src/config/database.js` | maxPoolSize, listeners de conexão |
| `src/controllers/appointmentController.js` | Duplo agendamento (max 2) |
| `src/controllers/availabilityController.js` | Slot retorna array de agendamentos |
| `src/controllers/statsController.js` | +getTrendStats |
| `src/controllers/authController.js` | +refreshToken |
| `src/routes/statsRoutes.js` | +rota /trend |
| `src/routes/authRoutes.js` | +rota /refresh |
| `render.yaml` | Novo — configuração Render com healthCheckPath |
| `.env.example` | Novo — template de variáveis de ambiente |
