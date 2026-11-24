import { describe, expect, it } from "vitest";
import { aparelhoDeTeste, avaliarLimites } from "@/lib/revelar/limites";

const meu = "3f2b8c1e-4d5a-4b6c-9d7e-8f9a0b1c2d3e";
describe("aparelhos de teste", () => {
  it("reconhece o UUID na lista separada por vírgula", () => {
    expect(aparelhoDeTeste(meu, ` outro , ${meu.toUpperCase()} `)).toBe(true);
    expect(aparelhoDeTeste(meu, "outro")).toBe(false);
    expect(aparelhoDeTeste(meu, undefined)).toBe(false);
  });
  it("teste ignora limites por aparelho/IP mas respeita o teto global de 300", () => {
    expect(avaliarLimites(0, 0, 299).ok).toBe(true);
    expect(avaliarLimites(0, 0, 300).ok).toBe(false);
  });
});
