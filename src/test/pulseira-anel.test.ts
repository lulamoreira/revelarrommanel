import { describe, expect, it } from "vitest";
import { CALIBRACAO } from "@/config/calibracao";
import { alfaAnel, eixosAnel, maoConfiavel, posePulseira } from "@/lib/revelar/geometria";
import { Slot } from "@/lib/revelar/motor";

// Mão inclinada: punho em (200,300), dedos para cima-direita.
const mao = (largura: number) => ({
  p0: { x: 200, y: 300 },
  p9: { x: 260, y: 220 },
  p5: { x: 230 - largura / 2, y: 240 },
  p17: { x: 230 + largura / 2, y: 240 },
});

describe("pulseira como anel", () => {
  it("eixo maior é perpendicular ao antebraço", () => {
    const p = posePulseira(mao(80), null);
    const { n, a } = eixosAnel(p.angulo);
    const antebraco = { x: (200 - 260) / 100, y: (300 - 220) / 100 };
    expect(n.x * antebraco.x + n.y * antebraco.y).toBeCloseTo(0);
    expect(a.x).toBeCloseTo(antebraco.x);
    expect(a.y).toBeCloseTo(antebraco.y);
  });
  it("raio proporcional a dist(5,17)", () => {
    expect(posePulseira(mao(80), null).tamanho).toBeCloseTo(40 * 0.8 * 1.06);
    expect(posePulseira(mao(160), null).tamanho).toBeCloseTo(2 * posePulseira(mao(80), null).tamanho);
  });
  it("usa o eixo cotovelo→pulso do Pose quando disponível", () => {
    const p = posePulseira(mao(80), { cotovelo: { x: 200, y: 500 }, pulso: { x: 200, y: 300 } });
    expect(eixosAnel(p.angulo).a.y).toBeCloseTo(1);
  });
  it("arco do cotovelo na frente; com opacidadeTras 0 o lado da mão não aparece", () => {
    expect(CALIBRACAO.pulseira.opacidadeTras).toBe(0);
    expect(alfaAnel(0.5)).toBe(1);
    expect(alfaAnel(-0.5)).toBe(0);
    expect(alfaAnel(0)).toBeCloseTo(0.5);
    const inv = structuredClone(CALIBRACAO);
    inv.pulseira.inverterFrente = true;
    expect(alfaAnel(-0.5, inv)).toBe(1);
  });
  it("mão com score baixo some depois de 300 ms", () => {
    expect(maoConfiavel(0.4, 80, 80)).toBe(false);
    expect(maoConfiavel(0.9, 80, 40)).toBe(false);
    expect(maoConfiavel(0.9, 80, 75)).toBe(true);
    const s = new Slot();
    s.atualizar(posePulseira(mao(80), null), 0);
    for (let t = 33; t <= 280; t += 33) s.passo(t);
    expect(s.opacidade).toBeGreaterThan(0.9);
    for (let t = 300; t <= 900; t += 33) s.passo(t); // sem novas poses confiáveis
    expect(s.opacidade).toBe(0);
  });
});
