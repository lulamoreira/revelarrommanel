import { TEMPO_ESTIMADO_REALISTA_S } from "@/config/custos";
const chave = "revelar:duracoes-realista";
export function duracoesValidas(raw: string | null): number[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(v)
      ? v.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0).slice(-5)
      : [];
  } catch {
    return [];
  }
}
export function estimativa(duracoes: number[]): number {
  if (!duracoes.length) return TEMPO_ESTIMADO_REALISTA_S;
  return Math.min(60, Math.max(15, duracoes.reduce((a, b) => a + b, 0) / duracoes.length));
}
export function tempoEstimado(): number {
  try {
    return estimativa(duracoesValidas(localStorage.getItem(chave)));
  } catch {
    return TEMPO_ESTIMADO_REALISTA_S;
  }
}
export function registrarDuracao(segundos: number): void {
  if (!Number.isFinite(segundos) || segundos <= 0) return;
  try {
    const v = duracoesValidas(localStorage.getItem(chave));
    localStorage.setItem(chave, JSON.stringify([...v, segundos].slice(-5)));
  } catch {
    /* não interrompe o resultado */
  }
}
/** Estimativa monotônica, nunca representa progresso real da IA. */
export function progressoEstimado(
  segundos: number,
  tempo: number,
  anterior = 0,
  concluido = false,
): number {
  if (concluido) return 100;
  const t = Math.max(0, segundos),
    e = Math.max(1, tempo);
  const p = t <= e ? 90 * (1 - Math.pow(1 - t / e, 2)) : 90 + 7 * (1 - Math.exp(-(t - e) / 90));
  return Math.min(97, Math.max(anterior, p));
}
export function mensagemEspera(s: number): string {
  if (s > 45) return "Está demorando um pouco mais que o normal…";
  if (s > 25) return "Quase lá, finalizando os detalhes…";
  if (s >= 15) return "Criando os reflexos do metal…";
  if (s >= 5) return "Ajustando luz e brilho das joias…";
  return "Preparando sua foto…";
}
