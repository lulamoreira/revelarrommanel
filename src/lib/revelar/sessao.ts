/** Estado de sessão no navegador (só aviso visual; o servidor é quem limita). Chamar apenas no cliente. */
import { LIMITE_POR_APARELHO_24H } from "@/config/custos";

const CHAVE_LOJA = "revelar:loja";
const CHAVE_GERACOES = "revelar:geracoes";

function seguro<T>(fn: () => T, padrao: T): T {
  try {
    return fn();
  } catch {
    return padrao;
  }
}

export const guardarLoja = (loja: string): void =>
  seguro(() => sessionStorage.setItem(CHAVE_LOJA, loja), undefined);
export const lerLojaSessao = (): string | null =>
  seguro(() => sessionStorage.getItem(CHAVE_LOJA), null);
export const geracoesUsadas = (): number =>
  seguro(() => Number(sessionStorage.getItem(CHAVE_GERACOES) ?? "0") || 0, 0);
export const registrarGeracao = (): void =>
  seguro(() => sessionStorage.setItem(CHAVE_GERACOES, String(geracoesUsadas() + 1)), undefined);
export const geracoesRestantes = (): number =>
  aparelhoTesteSessao() ? Infinity : Math.max(0, LIMITE_POR_APARELHO_24H - geracoesUsadas());
const CHAVE_TESTE = "revelar:aparelho-teste";
/** Só aviso visual: o servidor confirmou que este aparelho é de teste. */
export const marcarAparelhoTeste = (): void =>
  seguro(() => sessionStorage.setItem(CHAVE_TESTE, "1"), undefined);
export const aparelhoTesteSessao = (): boolean =>
  seguro(() => sessionStorage.getItem(CHAVE_TESTE) === "1", false);
