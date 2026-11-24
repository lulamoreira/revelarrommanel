import {
  LIMITE_DIARIO_GLOBAL,
  LIMITE_POR_APARELHO_24H,
  LIMITE_POR_IP_24H,
  MENSAGENS,
} from "@/config/custos";

export type ResultadoLimite = { ok: true } | { ok: false; mensagem: string };

/** Decide se uma nova geração pode acontecer. Limite individual tem prioridade na mensagem. */
export function avaliarLimites(
  usosAparelho24h: number,
  usosIp24h: number,
  usosGlobaisHoje: number,
): ResultadoLimite {
  if (usosAparelho24h >= LIMITE_POR_APARELHO_24H)
    return { ok: false, mensagem: MENSAGENS.limitePessoal };
  if (usosIp24h >= LIMITE_POR_IP_24H) return { ok: false, mensagem: MENSAGENS.ocupado };
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

/** true se o UUID do aparelho está na lista (separada por vírgula) do secret APARELHOS_TESTE. */
export function aparelhoDeTeste(aparelho: string, lista: string | undefined): boolean {
  if (!lista) return false;
  const alvo = aparelho.trim().toLowerCase();
  return lista.split(",").some((id) => id.trim().toLowerCase() === alvo && alvo.length > 0);
}
