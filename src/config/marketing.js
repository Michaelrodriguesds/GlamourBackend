// ── Regras da aba "Clientes & Marketing" ─────────────────────────
// Todos os prazos ficam aqui, num lugar só. Para mudar um prazo, altere
// o número e publique o backend de novo.

// Dias até "hora de refazer", por procedimento.
const RETURN_DAYS = {
  "Cílios Tufinho":        15,
  "Sobrancelha com Henna": 20,
  "Sobrancelha sem Henna": 20,
  "Spa dos Lábios":        30,
  "Depilação":             30,
  "Limpeza de Pele":       30,
};

module.exports = {
  TIMEZONE:            "America/Sao_Paulo",
  RETURN_DAYS,
  DEFAULT_RETURN_DAYS: 30,  // procedimento sem prazo cadastrado acima
  RETURN_WINDOW_DAYS:  14,  // depois do prazo, aparece por até 14 dias; depois vira "sumida"
  INACTIVE_DAYS:       60,  // "sumida": última visita há mais de 60 dias e nada marcado
  NEW_DAYS:            30,  // "nova": primeira visita nos últimos 30 dias
  LOYAL_DAYS:          180, // "fiéis": visitas nos últimos 6 meses
  LOYAL_MIN_VISITS:    2,   // precisa de pelo menos 2 visitas no período
  LOYAL_TOP:           10,  // mostra as 10 melhores
  MOVEMENT_DAYS:       90,  // gráfico de movimento: últimos 90 dias
};
