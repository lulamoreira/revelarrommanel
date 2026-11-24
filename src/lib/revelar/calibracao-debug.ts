import { z } from "zod";
import { CALIBRACAO, CAMPOS_CALIBRACAO, CAMPOS_AJUSTE, type Calibracao } from "@/config/calibracao";
import type { Peca } from "@/config/catalogo";
export type CampoCalibracao = (typeof CAMPOS_CALIBRACAO)[number];
export interface AjusteDebug {
  escala: number;
  dx: number;
  dy: number;
}
export interface AjustesDebug {
  calibracao: Calibracao;
  pecas: Record<string, AjusteDebug>;
}
export const CHAVE_CALIBRACAO = "revelar-calibracao-3d-v2";
export const padraoDebug = (): AjustesDebug => ({
  calibracao: structuredClone(CALIBRACAO),
  pecas: {},
});
export function alterarCampo(c: Calibracao, f: CampoCalibracao, v: number): void {
  const valor = Math.min(f.max, Math.max(f.min, v));
  if (f.grupo === "brinco") c.brinco[f.chave] = valor;
  else c.colar[f.chave] = valor;
  if (c.brinco.yawSomeFim <= c.brinco.yawSomeInicio)
    c.brinco.yawSomeFim = c.brinco.yawSomeInicio + 1;
}
const schema = z.object({
  calibracao: z.object({
    brinco: z.record(z.string(), z.unknown()),
    colar: z.record(z.string(), z.unknown()),
  }),
  pecas: z.record(
    z.string(),
    z.object({
      escala: z.number().min(0.3).max(2),
      dx: z.number().min(-30).max(30),
      dy: z.number().min(-30).max(30),
    }),
  ),
});
export function decodificarDebug(raw: string | null): AjustesDebug {
  const valor = padraoDebug();
  try {
    const resultado = schema.safeParse(JSON.parse(raw ?? "null"));
    if (!resultado.success) return valor;
    for (const f of CAMPOS_CALIBRACAO) {
      const n = resultado.data.calibracao[f.grupo][f.chave];
      if (typeof n === "number" && Number.isFinite(n)) alterarCampo(valor.calibracao, f, n);
    }
    valor.pecas = resultado.data.pecas;
  } catch {
    /* JSON inválido não impede usar a câmera. */
  }
  return valor;
}
export function carregarDebug(): AjustesDebug {
  try {
    return decodificarDebug(localStorage.getItem(CHAVE_CALIBRACAO));
  } catch {
    return padraoDebug();
  }
}
export function salvarDebug(v: AjustesDebug): boolean {
  try {
    localStorage.setItem(CHAVE_CALIBRACAO, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
export function ajusteDaPeca(p: Peca, v: AjustesDebug): AjusteDebug {
  return (
    v.pecas[p.id] ?? { escala: p.ajuste?.escala ?? 1, dx: p.ajuste?.dx ?? 0, dy: p.ajuste?.dy ?? 0 }
  );
}
export function valoresParaCopiar(v: AjustesDebug): string {
  const brinco = Object.fromEntries(
    CAMPOS_CALIBRACAO.filter((f) => f.grupo === "brinco").map((f) => [
      f.chave,
      v.calibracao.brinco[f.chave as keyof Calibracao["brinco"]],
    ]),
  );
  const colar = {
    colarBaixo: v.calibracao.colar.colarBaixo,
    colarTras: v.calibracao.colar.colarTras,
  };
  return JSON.stringify(
    {
      calibracao: { brinco, colar },
      catalogo: Object.entries(v.pecas).map(([id, ajuste]) => ({ id, ajuste })),
    },
    null,
    2,
  );
}
export { CAMPOS_AJUSTE };
