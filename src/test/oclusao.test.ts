import { describe, expect, it } from "vitest";
import {
  avaliarOclusao, cascoConvexo, distanciaComSinal, expandir, opacidadePorDistancia, pontoNoPoligono,
} from "@/lib/revelar/oclusao";

const quadrado = (x: number, y: number, l: number) => [
  { x, y }, { x: x + l, y }, { x: x + l, y: y + l }, { x, y: y + l },
];
const rosto = quadrado(0, 0, 100); // largura 100

describe("oclusão dos brincos", () => {
  it("ponto dentro/fora do polígono e distância com sinal", () => {
    expect(pontoNoPoligono({ x: 50, y: 50 }, rosto)).toBe(true);
    expect(pontoNoPoligono({ x: 110, y: 50 }, rosto)).toBe(false);
    expect(distanciaComSinal({ x: 110, y: 50 }, rosto)).toBeCloseTo(10);
    expect(distanciaComSinal({ x: 97, y: 50 }, rosto)).toBeCloseTo(-3);
  });
  it("fade: 1 a 4% para fora, 0 a 2% para dentro, interpola no meio", () => {
    expect(opacidadePorDistancia(4, 100)).toBe(1);
    expect(opacidadePorDistancia(-2, 100)).toBe(0);
    expect(opacidadePorDistancia(1, 100)).toBeCloseTo(0.5);
  });
  it("lóbulo dentro do casco da mão → opacidade 0", () => {
    const mao = expandir(cascoConvexo(quadrado(150, 0, 40)), 0.08);
    const r = avaliarOclusao([{ x: -10, y: 50 }, { x: 170, y: 20 }], rosto, [mao], 100);
    expect(r.opacidades).toEqual([1, 0]);
    expect(r.maoNoRosto).toBe(false);
  });
  it("mão cobrindo mais de 20% do rosto esconde os dois brincos", () => {
    const mao = cascoConvexo(quadrado(40, 40, 50)); // 25% do rosto
    const r = avaliarOclusao([{ x: -10, y: 50 }, { x: 110, y: 50 }], rosto, [mao], 100);
    expect(r.maoNoRosto).toBe(true);
    expect(r.opacidades).toEqual([0, 0]);
  });
});
