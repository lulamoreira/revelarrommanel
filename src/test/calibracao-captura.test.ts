import { afterEach, describe, expect, it, vi } from "vitest";
import { MotorProvador } from "@/lib/revelar/motor";
import { fotoNaoEspelhada, desenharPolaroid } from "@/lib/revelar/captura";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("camada de calibração e captura", () => {
  it("desenha diagnóstico só no canvas separado e exporta somente a cena em foto/vídeo", () => {
    const cena = document.createElement("canvas");
    const debug = document.createElement("canvas");
    const saida = document.createElement("canvas");
    const contexto = (canvas: HTMLCanvasElement) => ({ canvas, drawImage: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() });
    const ctxCena = contexto(cena), ctxDebug = contexto(debug), ctxSaida = contexto(saida);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      return (this === cena ? ctxCena : this === debug ? ctxDebug : ctxSaida) as unknown as CanvasRenderingContext2D;
    });
    const video = document.createElement("video");
    Object.defineProperties(video, { readyState: { value: 2 }, videoWidth: { value: 720 }, videoHeight: { value: 1280 } });
    let quadro: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => { quadro = fn; return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const motor = new MotorProvador(video, cena, debug);
    motor.definirDebug(true);
    motor.iniciar();
    quadro?.(100);
    expect(ctxDebug.clearRect).toHaveBeenCalled();
    expect(ctxCena.drawImage).toHaveBeenCalledWith(video, 0, 0, 720, 1280);
    fotoNaoEspelhada(cena);
    desenharPolaroid(ctxSaida as unknown as CanvasRenderingContext2D, cena, 720, 1280);
    expect(ctxSaida.drawImage.mock.calls).toHaveLength(2);
    for (const chamada of ctxSaida.drawImage.mock.calls) expect(chamada[0]).toBe(cena);
    motor.definirDebug(false);
    ctxDebug.clearRect.mockClear();
    quadro?.(200);
    expect(ctxDebug.clearRect).not.toHaveBeenCalled();
    expect(ctxCena.drawImage).toHaveBeenCalledTimes(2);
    motor.parar();
  });
});