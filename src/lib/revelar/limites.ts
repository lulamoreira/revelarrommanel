import { LIMITE_DIARIO_GLOBAL, LIMITE_POR_PESSOA_24H, MENSAGENS } from "@/config/custos";

export type ResultadoLimite = { ok: true } | { ok: false; mensagem: string };

/** Decide se uma nova geração pode acontecer. Limite individual tem prioridade na mensagem. */
export function avaliarLimites(usosPessoa24h: number, usosGlobaisHoje: number): ResultadoLimite {
  if (usosPessoa24h >= LIMITE_POR_PESSOA_24H) return { ok: false, mensagem: MENSAGENS.limitePessoal };
  if (usosGlobaisHoje >= LIMITE_DIARIO_GLOBAL) return { ok: false, mensagem: MENSAGENS.ocupado };
  return { ok: true };
}

/** Início do dia em São Paulo (UTC-3, sem horário de verão) como ISO UTC. */
export function inicioDoDiaSaoPaulo(agora: Date): string {
  const OFFSET = 3 * 60 * 60 * 1000;
  const local = new Date(agora.getTime() - OFFSET);
  const meiaNoite = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(meiaNoite + OFFSET).toISOString();
}
