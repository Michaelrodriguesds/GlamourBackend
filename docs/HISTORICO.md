# Histórico de atualizações — Glamour Agenda

Registro de todas as melhorias feitas no sistema (frontend Flutter + backend Node),
da mais recente para a mais antiga. Vale para os dois repositórios:
[GlamourFrontend](https://github.com/Michaelrodriguesds/GlamourFrontend) e
[GlamourBackend](https://github.com/Michaelrodriguesds/GlamourBackend).

A versão anterior a todas estas mudanças está guardada na tag Git
**`versao-antiga-lenta`** nos dois repositórios.

| Data | Versão | O que mudou | Onde |
| --- | --- | --- | --- |
| 06/11/2026 | v4 | Estilos do app (6 temas) | Frontend |
| 30/10/2026 | v3 | Aba Clientes & Marketing | Frontend + Backend |
| 28/10/2026 | v2 | Layout para PC/notebook e saudação com nome | Frontend + Backend |
| 17/10/2026 | v1 | Desempenho, correções de bugs e testes | Frontend + Backend |

---

## v4 — 06/11/2026 · Estilos do app (temas)

**Pedido:** a usuária estava enjoada da "cara" do app e queria poder mudar o visual.

- Botão de paleta (🎨) no Início abre 6 estilos: **Rosé** (o original, idêntico),
  **Lavanda**, **Oceano**, **Esmeralda**, **Champanhe** e **Claro** (fundo branco).
- Troca na hora; a escolha fica salva no aparelho.
- Como funciona: `AppColors` passou a ler a paleta ativa (`app_palette.dart`) em vez
  de cores fixas; 269 `const` que prendiam cor foram removidos com ajuda de um
  analisador de código; o app é redesenhado quando o estilo muda.
- Contraste conferido em todos os estilos novos (texto e botões legíveis).
- Testes: `test/theme_test.dart`. Guia: `docs/TEMAS.md` (frontend).

## v3 — 30/10/2026 · Aba Clientes & Marketing

**Pedido:** lembrar clientes do agendamento e da hora de refazer, e usar os dados para
marketing — **com custo zero** (sem API paga de WhatsApp).

- Estatísticas ganhou as abas **Financeiro** | **Clientes & Marketing**.
- **Para enviar hoje:** agendadas para amanhã e clientes na hora de refazer, com
  "Copiar mensagem" (texto pronto para colar no WhatsApp) e "Enviei".
- **Movimento da semana:** média de atendimentos por dia e período; destaca o dia mais fraco.
- **Suas clientes:** fiéis, sumidas (+60 dias) e novas (30 dias), com mensagens prontas.
- **Campanha sugerida:** convida as sumidas para o dia mais fraco.
- Ficha da cliente: chaves "Recebe lembrete do agendamento / de retorno".
- Backend: rotas `/api/marketing/*`, duas coleções novas (`clientpreferences`,
  `reminderlogs`); agendamentos existentes não foram alterados.
- Testes: backend de 28 para 60. Guia: `docs/MARKETING.md`.

## v2 — 28/10/2026 · Layout para PC/notebook e saudação com nome

- **PC/notebook:** largura máxima de 1100 px centralizada; menu lateral no lugar da barra
  de baixo (≥ 800 px); Início com os cards em uma linha; calendário e horários do dia lado
  a lado; login, formulários, notas e clientes com largura de cartão. Celular sem mudança.
- **Saudação:** "Bom dia / Boa tarde / Boa noite, Nome!" (madrugada passou a ser "Boa noite").
  O nome vem de `APP_DISPLAY_NAME` (Render) ou do usuário do login.
- Testes: `test/greeting_test.dart`; backend com 2 testes novos para o nome.

## v1 — 17/10/2026 · Desempenho, bugs e testes

**Problema:** lentidão no login e ao carregar as telas.

**Desempenho**
- App abre a tela antes de terminar as inicializações (em paralelo).
- Abas só são criadas na primeira visita.
- Cache unificado com atualização em segundo plano e invalidação central.
- Rota `/api/auth/refresh` (renovação de login com janela de 7 dias).
- Rota `/api/stats/trend` reescrita: de até 36 consultas para 2 agregações.
- Nova rota `/api/clients` (lista de clientes calculada no MongoDB).
- `.lean()` nas estatísticas, pool de conexões 5 → 10, limite de segurança de 500 registros.

**Bugs corrigidos**
- Calendário travava em loop de erro (cor e decoração juntas num `Container`) — bug antigo.
- Cards do Início estouravam 4 px na tela (proporção ajustada).
- Agendamento "sumia" do calendário: só 2 por horário eram desenhados; agora todos
  aparecem, e o formulário avisa (+N, em dourado) quando o horário tem agendamento no outro studio.
- Tela de clientes usava contexto de tela já fechada (aviso do Flutter).

**Organização e publicação**
- 26 testes automáticos no backend (Jest + Supertest, banco simulado).
- `node_modules` (2331 arquivos) e `build/` (45 arquivos) estavam no GitHub por engano: removidos.
- `.gitignore` com acento quebrou o build do Netlify: corrigido (arquivos de configuração sem acento).

**Resultado:** sistema no ar; a usuária relatou melhora significativa de desempenho
(relato, ainda sem medição em números — pendente com `bench.js`).

---

## Pendências e ideias

- Medir velocidade antes/depois com números (`bench.js`, somente leitura).
- Dividir telas de 800–1000 linhas em componentes menores.
- Contas por usuário com senha criptografada, CORS restrito ao domínio do Netlify.
- Testes rodando sozinhos a cada push (GitHub Actions).
- Cadastro de telefone da cliente (botão abriria o WhatsApp direto, ainda grátis).
