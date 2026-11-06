# Aba "Clientes & Marketing" — guia

Versão: outubro/2026. Vale para o frontend (Flutter) e o backend (Node).

## O que é

Uma aba nova dentro de **Estatísticas**, ao lado de **Financeiro** (a tela de
sempre). Ajuda a dona a lembrar clientes e a encher os dias fracos, **sem custo**:
o app **não envia mensagens**. Ele mostra quem precisa de lembrete, monta o texto
e copia; a dona cola no WhatsApp da cliente.

## As 4 seções

| Seção | O que mostra | Regra |
| --- | --- | --- |
| Para enviar hoje — Agendadas para amanhã | Clientes com horário amanhã | Dia seguinte no fuso de Brasília |
| Para enviar hoje — Hora de refazer | Clientes no prazo de retorno | Último atendimento já passado daquele procedimento + prazo; aparece por até 14 dias; some se a cliente tiver qualquer horário de hoje em diante |
| Movimento da semana | Média de atendimentos por dia da semana e % por período | Últimos 90 dias até ontem. Manhã < 12h, Tarde 12h–16h59, Fim de tarde ≥ 17h. Dia sem nenhum atendimento (ex.: domingo fechado) não conta como "mais fraco" |
| Suas clientes | Fiéis, Sumidas, Novas | Fiéis: 10 com mais visitas nos últimos 6 meses (mín. 2). Sumidas: última visita há mais de 60 dias e nada marcado. Novas: 1ª visita nos últimos 30 dias |
| Campanha sugerida | Convite das sumidas para o dia mais fraco | Aparece quando há clientes sumidas |

### Prazos de retorno

| Procedimento | Dias |
| --- | --- |
| Cílios Tufinho | 15 |
| Sobrancelha com Henna | 20 |
| Sobrancelha sem Henna | 20 |
| Spa dos Lábios | 30 |
| Depilação | 30 |
| Limpeza de Pele | 30 |
| Qualquer outro | 30 |

**Para mudar prazos e regras:** backend, arquivo `src/config/marketing.js`.
**Para mudar os textos das mensagens:** frontend, arquivo `lib/core/utils/marketing_messages.dart`.

## Botões

- **Copiar mensagem**: copia o texto pronto com o primeiro nome da cliente e mostra
  o texto na tela (se o navegador bloquear a cópia, dá para selecionar e copiar).
- **Enviei**: risca a cliente da lista. **Desfazer** volta atrás. Fica guardado no
  servidor por 120 dias.
- **Ficha da cliente (aba Clientes)**: duas chaves — "Recebe lembrete do agendamento"
  e "Recebe lembrete de retorno". Desligada, a cliente some da lista. Padrão: ligadas.

## Cuidados

- A cliente é identificada pelo **nome**: "Maria" e "Maria Silva" contam como duas.
  Escreva os nomes sempre do mesmo jeito.
- O app não tem o telefone das clientes: a dona cola a mensagem no contato dela.
- Os gráficos melhoram com o tempo: com pouco histórico, as conclusões são fracas.

## Como funciona por dentro

### Backend (`/api/marketing`, todas exigem login)

| Rota | Função |
| --- | --- |
| `GET /reminders` | `{ today, tomorrow, appointments[], returns[] }` |
| `POST /reminders/sent` | Marca "Enviei": `{ key, type, clientName }` (não duplica) |
| `DELETE /reminders/sent?key=` | Desfaz "Enviei" |
| `GET /movement` | `{ days, total, weekdays[], weakest, strongest, differencePercent, periods[] }` |
| `GET /segments` | `{ today, loyal[], inactive[], newClients[] }` |
| `GET /prefs/:clientName` | Chaves da cliente (padrão: as duas ligadas) |
| `PUT /prefs/:clientName` | `{ remindAppointment?, remindReturn? }` (booleanos) |

Arquivos: `src/config/marketing.js` (regras), `src/services/marketing.js` (cálculos,
funções puras), `src/controllers/marketingController.js`, `src/routes/marketingRoutes.js`,
`src/models/ClientPreference.js` (chaves por cliente), `src/models/ReminderLog.js`
("Enviei", apaga sozinho após 120 dias).

Coleções novas no MongoDB: `clientpreferences` e `reminderlogs`. Os agendamentos
existentes **não são alterados**.

### Frontend

`lib/presentation/screens/stats/marketing_tab.dart` (a aba),
`stats_screen.dart` (abas internas; a de marketing só carrega na 1ª visita),
`clients_screen.dart` (chaves na ficha), `lib/data/models/marketing_model.dart`,
`lib/data/services/marketing_service.dart`, `lib/core/utils/marketing_messages.dart`,
`lib/core/constants/api_endpoints.dart`.

## Testes

- Backend: `npm test` → 60 testes (28 antigos + 32 novos: `test/marketing.service.test.js`
  e `test/marketing.routes.test.js`). Banco simulado, sem dados reais.
- Frontend: `flutter test` → inclui `test/marketing_test.dart` (textos e leitura dos dados).
  Rode também `flutter analyze` (fora de pastas com acento, como "Área de Trabalho").

## Próximos passos possíveis

- Cadastrar telefone da cliente → botão abre o WhatsApp direto (continua grátis).
- Envio automático pela API oficial do WhatsApp (custo por mensagem).
- Resumo diário da dona por Telegram (grátis).
