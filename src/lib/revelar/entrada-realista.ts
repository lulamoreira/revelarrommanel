import { z } from "zod";
import { TAMANHO_MAX_FOTO, TAMANHO_MAX_REFERENCIA } from "@/config/custos";
const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);
export const EntradaRealista = z.object({
  foto: base64.max(Math.ceil((TAMANHO_MAX_FOTO * 4) / 3) + 4),
  pecas: z
    .array(
      z.object({
        tipo: z.enum(["brinco", "colar", "pulseira"]),
        imagem: base64.max(Math.ceil((TAMANHO_MAX_REFERENCIA * 4) / 3) + 4),
      }),
    )
    .min(1)
    .max(3),
  aparelho: z.string().uuid(),
  loja: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,32}$/)
    .nullish(),
});
export function mensagemEntrada(issues: readonly z.core.$ZodIssue[]): string {
  if (issues.some((i) => i.path[0] === "pecas" && i.path.length === 1 && i.code === "too_small"))
    return "Escolha ao menos uma joia";
  if (issues.some((i) => i.path[0] === "foto" && i.code === "too_big"))
    return "Imagem acima de 2 MB";
  return "Dados inválidos";
}
