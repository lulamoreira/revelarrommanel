import { afterEach, describe, expect, it, vi } from "vitest";
import {
  estimativa,
  progressoEstimado,
  duracoesValidas,
  registrarDuracao,
  tempoEstimado,
  mensagemEspera,
} from "@/lib/revelar/espera-realista";
import { EntradaRealista, mensagemEntrada } from "@/lib/revelar/entrada-realista";
import { avaliarLimites } from "@/lib/revelar/limites";
import {
  LIMITE_POR_APARELHO_24H,
  LIMITE_POR_IP_24H,
  TEMPO_ESTIMADO_REALISTA_S,
  TAMANHO_MAX_FOTO,
} from "@/config/custos";
import { fotoNaoEspelhada, desenharPolaroid } from "@/lib/revelar/captura";
import { gerarVersaoRealista } from "@/lib/revelar/versao-realista";
import { identificadorAparelho } from "@/lib/revelar/aparelho";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("limites aparelho e rede", () => {
  it("bloqueia 4ª por aparelho, não a 4ª pessoa no Wi-Fi", () => {
    expect(LIMITE_POR_APARELHO_24H).toBe(3);
    expect(avaliarLimites(2, 39, 299).ok).toBe(true);
    expect(avaliarLimites(3, 3, 3)).toEqual({
      ok: false,
      mensagem: "Você já gerou suas 3 versões realistas hoje",
    });
    expect(avaliarLimites(0, 4, 4).ok).toBe(true);
  });
  it("bloqueia a 41ª da rede em 24h", () => {
    expect(LIMITE_POR_IP_24H).toBe(40);
    expect(avaliarLimites(0, 40, 40)).toEqual({
      ok: false,
      mensagem: "Muitas pessoas usando agora, tente em instantes",
    });
  });
  it("gera UUID persistente e tem fallback de sessão", () => {
    const a = identificadorAparelho();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(identificadorAparelho()).toBe(a);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(identificadorAparelho()).toBe(a);
  });
});
describe("espera estimada", () => {
  it("começa com 25s e usa média das últimas cinco limitada a 15–60s", () => {
    expect(TEMPO_ESTIMADO_REALISTA_S).toBe(25);
    expect(tempoEstimado()).toBe(25);
    for (const s of [100, 10, 20, 30, 40, 50]) registrarDuracao(s);
    expect(tempoEstimado()).toBe(30);
    expect(estimativa([1, 2])).toBe(15);
    expect(estimativa([90])).toBe(60);
  });
  it("chega a 90% em 25s e nunca regride nem passa 97% antes da imagem", () => {
    expect(progressoEstimado(25, 25)).toBe(90);
    let p = 0;
    for (let s = 0; s < 10000; s++) {
      const novo = progressoEstimado(s, 25, p);
      expect(novo).toBeGreaterThanOrEqual(p);
      expect(novo).toBeLessThanOrEqual(97);
      p = novo;
    }
    expect(progressoEstimado(1, 25, 90)).toBe(90);
    expect(progressoEstimado(10, 25, 20, true)).toBe(100);
  });
  it("usa os cinco períodos de mensagens", () => {
    expect(mensagemEspera(0)).toBe("Preparando sua foto…");
    expect(mensagemEspera(5)).toBe("Ajustando luz e brilho das joias…");
    expect(mensagemEspera(15)).toBe("Criando os reflexos do metal…");
    expect(mensagemEspera(26)).toBe("Quase lá, finalizando os detalhes…");
    expect(mensagemEspera(46)).toBe("Está demorando um pouco mais que o normal…");
  });
  it("tolera histórico inválido e armazenamento bloqueado", () => {
    expect(duracoesValidas("{")).toEqual([]);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(tempoEstimado()).toBe(25);
    expect(() => registrarDuracao(20)).not.toThrow();
  });
});
describe("captura sem espelho", () => {
  it("foto e polaroid do vídeo não invertem a cena", () => {
    const ctx = {
      drawImage: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const cena = document.createElement("canvas");
    cena.width = 2000;
    cena.height = 1000;
    const foto = fotoNaoEspelhada(cena);
    expect(foto.width).toBe(1280);
    expect(ctx.drawImage).toHaveBeenCalledWith(cena, 0, 0, 1280, 640);
    desenharPolaroid(ctx as unknown as CanvasRenderingContext2D, cena, 720, 360);
    expect(ctx.scale).not.toHaveBeenCalled();
    expect(ctx.translate).not.toHaveBeenCalled();
  });
});
describe("validação realista", () => {
  const valido = {
    foto: "YQ==",
    pecas: [{ tipo: "brinco", imagem: "YQ==" }],
    aparelho: "e924c538-2a99-4a51-baea-918d2c3caa33",
  };
  function erro(v: unknown) {
    const r = EntradaRealista.safeParse(v);
    if (r.success) throw new Error("Deveria rejeitar");
    return mensagemEntrada(r.error.issues);
  }
  it("sem peças nunca chama o servidor", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await gerarVersaoRealista(new Blob(["x"]), [], null)).toEqual({
      ok: false,
      mensagem: "Escolha uma joia no provador para gerar a versão realista.",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(erro({ ...valido, pecas: [] })).toBe("Escolha ao menos uma joia");
  });
  it("foto acima de 2 MB tem erro específico", () => {
    expect(erro({ ...valido, foto: "a".repeat(Math.ceil((TAMANHO_MAX_FOTO * 4) / 3) + 8) })).toBe(
      "Imagem acima de 2 MB",
    );
  });
  it("UUID inválido tem erro genérico", () => {
    expect(erro({ ...valido, aparelho: "invalido" })).toBe("Dados inválidos");
    expect(EntradaRealista.safeParse(valido).success).toBe(true);
  });
});
