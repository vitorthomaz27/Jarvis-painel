/** Regras do painel, num lugar só para ficarem iguais na API e nos testes. */
export const RULES = {
  /** Lead NOVO sem resposta há mais que isso aparece em "Sem resposta". */
  semRespostaHoras: 2,
  /** Cliente sem contato há mais que isso aparece em "Reativar". */
  reativarDias: 60,
  /** Período padrão da visão geral. */
  periodoDias: 30,
};
