import { describe, expect, it, vi } from "vitest";
import {
  baseCabeca,
  basePescoço,
  dist,
  dot3,
  pixels3D,
  poseColar3D,
  posePulseira,
  posesBrincos,
  type PontosRosto,
  type Ponto3D,
  type Ombros,
} from "@/lib/revelar/geometria";
import { CALIBRACAO } from "@/config/calibracao";
import { Pendulo } from "@/lib/revelar/pendulo";
import {
  decodificarDebug,
  padraoDebug,
  alterarCampo,
  valoresParaCopiar,
  carregarDebug,
  CHAVE_CALIBRACAO,
} from "@/lib/revelar/calibracao-debug";
import { CAMPOS_CALIBRACAO } from "@/config/calibracao";

function rosto(graus = 0, roll = 0): PontosRosto {
  const a = (graus * Math.PI) / 180,
    r = (roll * Math.PI) / 180;
  const p = (x: number, y: number, z: number): Ponto3D => {
    const xx = x * Math.cos(a) + z * Math.sin(a);
    return {
      x: 400 + xx * Math.cos(r) - y * Math.sin(r),
      y: 240 + xx * Math.sin(r) + y * Math.cos(r),
      z: -x * Math.sin(a) + z * Math.cos(a),
    };
  };
  return {
    l234: p(-70, 0, 0),
    l454: p(70, 0, 0),
    l33: p(-30, -30, -35),
    l263: p(30, -30, -35),
    nariz: p(0, 0, -60),
    queixo: p(0, 100, -35),
  };
}
function base(graus = 0, roll = 0) {
  const b = baseCabeca(rosto(graus, roll));
  if (!b) throw new Error("Base sintética inválida");
  return b;
}
const ombros: Ombros = {
  a: { x: 200, y: 550, visibility: 0.9 },
  b: { x: 600, y: 600, visibility: 0.9 },
  larguraVideo: 800,
  alturaVideo: 700,
};

describe("geometria tridimensional", () => {
  it("converte Z pela largura do vídeo, mesmo em vídeo vertical", () => {
    expect(pixels3D({ x: 0.5, y: 0.5, z: -0.1 }, 720, 1280)).toEqual({ x: 360, y: 640, z: -72 });
  });
  it.each([-40, 40])("escala 3D varia menos de 5%% com yaw %s°", (g) => {
    expect(Math.abs(base(g).pxmm / base().pxmm - 1)).toBeLessThan(0.05);
    expect(base(g).pxmm).toBeCloseTo(1, 8);
  });
  it("orienta Z ao nariz, mantém Y para baixo e eixos ortogonais", () => {
    const b = base();
    expect(b.eixoZ.z).toBeLessThan(0);
    expect(b.eixoY.y).toBeGreaterThan(0);
    expect(dot3(b.eixoX, b.eixoY)).toBeCloseTo(0);
    expect(dot3(b.eixoX, b.eixoZ)).toBeCloseTo(0);
    expect(dot3(b.eixoY, b.eixoZ)).toBeCloseTo(0);
  });
  it("lóbulos ficam para fora das laterais e abaixo delas", () => {
    const r = rosto(),
      [a, b] = posesBrincos(base(), 32);
    expect(a.x).toBeLessThan(r.l234.x);
    expect(b.x).toBeGreaterThan(r.l454.x);
    expect(a.y).toBeGreaterThan(r.l234.y);
    expect(b.y).toBeGreaterThan(r.l454.y);
    expect(a.y - r.l234.y).toBeCloseTo(7);
    expect(b.y - r.l454.y).toBeCloseTo(7);
    expect(CALIBRACAO.brinco.lobuloBaixo).toBe(0.05);
    expect(CALIBRACAO.brinco.lobuloFora).toBe(0.02);
    expect(CALIBRACAO.brinco.lobuloTras).toBe(-0.12);
    expect(a.tamanho).toBeCloseTo(32);
  });
  it.each([-40, 40])("oculta só o lóbulo que recua ao virar %s°", (g) => {
    const [a, b] = posesBrincos(base(g), 32);
    expect(g > 0 ? a.opacidade : b.opacidade).toBe(0);
    expect(g > 0 ? b.opacidade : a.opacidade).toBe(1);
  });
  it("transição de visibilidade tem 15 graus", () => {
    expect(CALIBRACAO.brinco.yawSomeFim - CALIBRACAO.brinco.yawSomeInicio).toBe(15);
    const [a] = posesBrincos(base(22.5), 32);
    expect(a.opacidade).toBeCloseTo(0.5);
  });
  it("brinco não copia roll da cabeça", () => {
    expect(posesBrincos(base(0, 25), 32)[0].angulo).toBe(0);
  });
  it.each([-40, 40])("base do colar se move menos de 25%% do queixo com yaw %s°", (g) => {
    const movimento = dist(basePescoço(base()), basePescoço(base(g)));
    expect(movimento).toBeLessThan(dist(rosto().queixo, rosto(g).queixo) * 0.25);
  });
  it("ombros abaixo de 0.7 não alteram a pose", () => {
    const ruins = { ...ombros, a: { ...ombros.a, visibility: 0.69 } };
    expect(poseColar3D(base(40), ruins, 130)).toEqual(poseColar3D(base(40), null, 130));
    expect(poseColar3D(null, ruins, 130)).toBeNull();
  });
  it("ombros fora do quadro não alteram a pose", () => {
    const fora = { ...ombros, b: { ...ombros.b, x: 801 } };
    expect(poseColar3D(base(), fora, 130)).toEqual(poseColar3D(base(), null, 130));
  });
  it("ombros com 0.7 refinam só altura em 30% e rotação em até 15°", () => {
    const bons = {
      ...ombros,
      a: { ...ombros.a, visibility: 0.7 },
      b: { ...ombros.b, visibility: 0.7 },
    };
    const p = poseColar3D(base(), bons, 130);
    expect(p?.x).toBe(400);
    const meio = 575 - dist(bons.a, bons.b) * 0.18;
    expect(p?.y).toBeCloseTo((240 + 140 * 0.95) * 0.7 + meio * 0.3);
    const inclinado = { ...bons, b: { ...bons.b, y: 690 } };
    expect(Math.abs(poseColar3D(base(), inclinado, 130)?.angulo ?? 999)).toBeLessThanOrEqual(
      Math.PI / 12,
    );
  });
  it("largura do colar fica entre 0.6 e 1.4 larguras do rosto", () => {
    expect(poseColar3D(base(), null, 1)?.tamanho).toBeCloseTo(84);
    expect(poseColar3D(base(), null, 1000)?.tamanho).toBeCloseTo(196);
  });
  it("usa ombros válidos sem rosto e ignora ombros coincidentes", () => {
    expect(poseColar3D(null, ombros, 130)?.opacidade).toBe(1);
    expect(poseColar3D(null, { ...ombros, b: ombros.a }, 130)).toBeNull();
  });
  it("pulseira usa sempre a mão, independentemente da escala facial", () => {
    expect(posePulseira({ x: 0, y: 190 }, { x: 0, y: 0 }, 100, 70).tamanho).toBe(140);
  });
  it("base degenerada não produz NaN", () => {
    const r = rosto();
    expect(baseCabeca({ ...r, l454: r.l234 })).toBeNull();
  });
});
describe("pêndulo", () => {
  it("reage ao movimento e volta à gravidade quando parado", () => {
    const p = new Pendulo();
    p.atualizar(0, 0, 140);
    expect(Math.abs(p.atualizar(30, 60, 140))).toBeGreaterThan(0);
    let final = 0;
    for (let t = 120; t < 4000; t += 60) final = p.atualizar(30, t, 140);
    expect(Math.abs(final)).toBeLessThan(0.001);
  });
  it("permanece limitado e reinicia depois de perda do rastreamento", () => {
    const p = new Pendulo();
    p.atualizar(0, 0, 140);
    expect(Math.abs(p.atualizar(10000, 60, 140))).toBeLessThanOrEqual((12 * Math.PI) / 180);
    expect(p.atualizar(0, 2000, 140)).toBe(0);
  });
});
describe("calibração local", () => {
  it("ignora a calibração v1 dos aparelhos já testados", () => {
    const antigo = padraoDebug();
    antigo.calibracao.brinco.lobuloBaixo = 0.3;
    const leitura = vi.spyOn(Storage.prototype, "getItem").mockImplementation((chave) =>
      chave === "revelar-calibracao-3d-v1" ? JSON.stringify(antigo) : null,
    );
    try {
      expect(CHAVE_CALIBRACAO).toBe("revelar-calibracao-3d-v2");
      expect(carregarDebug().calibracao.brinco.lobuloBaixo).toBe(0.05);
    } finally {
      leitura.mockRestore();
    }
  });
  it("permite ajustar o lóbulo de -0.1 até 0.3 em passos de 0.005", () => {
    const f = CAMPOS_CALIBRACAO.find((f) => f.chave === "lobuloBaixo");
    if (!f) throw new Error("Campo ausente");
    expect(f).toMatchObject({ min: -0.1, max: 0.3, passo: 0.005 });
    const c = padraoDebug().calibracao;
    alterarCampo(c, f, -1);
    expect(c.brinco.lobuloBaixo).toBe(-0.1);
    alterarCampo(c, f, 1);
    expect(c.brinco.lobuloBaixo).toBe(0.3);
  });
  it("JSON inválido não derruba o provador", () => {
    expect(decodificarDebug("{")).toEqual(padraoDebug());
  });
  it("preserva valores e ajustes no objeto para copiar", () => {
    const v = padraoDebug();
    v.calibracao.brinco.lobuloBaixo = 0.2;
    v.pecas["teste"] = { escala: 1.2, dx: 2, dy: -3 };
    expect(decodificarDebug(JSON.stringify(v))).toEqual(v);
    const copia = JSON.parse(valoresParaCopiar(v));
    expect(copia.calibracao.brinco.lobuloBaixo).toBe(0.2);
    expect(copia.catalogo).toEqual([{ id: "teste", ajuste: { escala: 1.2, dx: 2, dy: -3 } }]);
  });
  it("impede intervalo de ocultação invertido", () => {
    const v = padraoDebug(),
      f = CAMPOS_CALIBRACAO.find((f) => f.chave === "yawSomeInicio");
    if (!f) throw new Error("Campo ausente");
    alterarCampo(v.calibracao, f, 40);
    expect(v.calibracao.brinco.yawSomeFim).toBeGreaterThan(v.calibracao.brinco.yawSomeInicio);
  });
});
