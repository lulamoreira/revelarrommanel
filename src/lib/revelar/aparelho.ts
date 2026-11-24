import { z } from "zod";
const chave = "revelar:aparelho";
const uuid = z.string().uuid();
let daSessao: string | null = null;
/** Identidade anônima, não uma credencial; só seu hash sai do servidor para o banco. */
export function identificadorAparelho(): string {
  try {
    const salvo = localStorage.getItem(chave);
    if (uuid.safeParse(salvo).success && salvo) {
      daSessao = salvo;
      return salvo;
    }
  } catch {
    /* Safari privado/bloqueio de armazenamento: usa a sessão. */
  }
  if (!daSessao) daSessao = crypto.randomUUID();
  try {
    localStorage.setItem(chave, daSessao);
  } catch {
    /* mantém em memória nesta sessão */
  }
  return daSessao;
}
