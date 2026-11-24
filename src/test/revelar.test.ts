import { describe, expect, it } from "vitest";
import { OneEuroFilter } from "@/lib/revelar/one-euro";
import { pxPorMmRosto, pxPorMmMao, yawNariz, posePulseira } from "@/lib/revelar/geometria";
import { ehNavegadorDeApp, escolherMimeVideo, nomeArquivo, lerLoja } from "@/lib/revelar/ambiente";
import { avaliarLimites, inicioDoDiaSaoPaulo } from "@/lib/revelar/limites";
import { LIMITE_DIARIO_GLOBAL } from "@/config/custos";

describe("escala real", () => {
  it("rosto 234↔454 = 140 mm", () => {
    expect(pxPorMmRosto({ x: 0, y: 0 }, { x: 280, y: 0 })).toBe(2);
  });
  it("mão 0→9 = 95 mm", () => {
    expect(pxPorMmMao({ x: 0, y: 0 }, { x: 0, y: 190 })).toBe(2);
  });
  it("yaw de frente = 0.5", () => {
    expect(yawNariz({ x: 50, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(0.5);
  });
  it("pulseira fica do lado do antebraço e horizontal com mão para cima", () => {
    const p = posePulseira({ x: 100, y: 200 }, { x: 100, y: 100 }, null, 70);
    expect(p.y).toBeGreaterThan(200);
    expect(Math.abs(p.angulo)).toBeLessThan(1e-9);
  });
});

describe("suavização One Euro", () => {
  it("reduz um salto brusco", () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0, dCutoff: 1 });
    f.filter(0, 0);
    const v = f.filter(100, 33);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
  });
});

describe("ambiente", () => {
  it("detecta navegador do Instagram e webview Android", () => {
    expect(ehNavegadorDeApp("Mozilla/5.0 (iPhone) Instagram 300.0")).toBe(true);
    expect(ehNavegadorDeApp("Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit")).toBe(true);
    expect(ehNavegadorDeApp("Mozilla/5.0 (iPhone) Version/17.0 Mobile Safari")).toBe(false);
  });
  it("escolhe mp4 antes de webm e nada quando não há suporte", () => {
    expect(escolherMimeVideo((m) => m === "video/mp4" || m === "video/webm")).toBe("video/mp4");
    expect(escolherMimeVideo(() => false)).toBeNull();
  });
  it("nomeia arquivos revelar-<data>", () => {
    expect(nomeArquivo(new Date(2026, 0, 5, 9, 8, 7), "jpg")).toBe("revelar-2026-01-05-090807.jpg");
  });
  it("aceita só códigos de loja válidos", () => {
    expect(lerLoja("SP01")).toBe("SP01");
    expect(lerLoja("<script>")).toBeNull();
  });
});

describe("limites da versão realista", () => {
  it("bloqueia a 4ª geração da mesma pessoa em 24 h", () => {
    expect(avaliarLimites(2, 0).ok).toBe(true);
    expect(avaliarLimites(3, 0)).toEqual({ ok: false, mensagem: "Você já gerou suas 3 versões realistas hoje" });
  });
  it("bloqueia ao atingir o teto global diário de 300", () => {
    expect(LIMITE_DIARIO_GLOBAL).toBe(300);
    expect(avaliarLimites(0, 300)).toEqual({ ok: false, mensagem: "Muitas pessoas usando agora, tente em instantes" });
  });
  it("dia começa à meia-noite de São Paulo", () => {
    expect(inicioDoDiaSaoPaulo(new Date("2026-03-10T02:00:00Z"))).toBe("2026-03-09T03:00:00.000Z");
  });
});
