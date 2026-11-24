import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { createRef, useRef } from "react";

vi.mock("@/lib/revelar/motor", () => ({
  MotorProvador: class {
    definirCalibracao() {}
    definirDebug() {}
    iniciar() {}
    parar() {}
  },
}));

import { useCameraProvador } from "@/hooks/use-camera-provador";
import { _resetarCamera, obterCamera } from "@/lib/revelar/camera";
import { padraoDebug } from "@/lib/revelar/calibracao-debug";

class TrackFalsa extends EventTarget {
  readyState: "live" | "ended" = "live";
  muted = false;
  stop = vi.fn(() => { this.readyState = "ended"; });
}
const criarStream = () => {
  const t = new TrackFalsa();
  return { getTracks: () => [t], getVideoTracks: () => [t], track: t } as unknown as MediaStream & { track: TrackFalsa };
};
let gum: ReturnType<typeof vi.fn>;

function Provador() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cenaRef = useRef<HTMLCanvasElement>(null);
  const valoresRef = useRef(padraoDebug());
  useCameraProvador({
    videoRef, cenaRef, debugRef: createRef(), motorRef: createRef(), valoresRef, debug: false,
    aoDica: () => {}, aoFps: () => {}, aoDesenhar: () => {}, aoErro: () => {},
  });
  return <><video ref={videoRef} /><canvas ref={cenaRef} /></>;
}

beforeEach(() => {
  _resetarCamera();
  gum = vi.fn(async () => criarStream());
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: gum } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});
afterEach(() => vi.restoreAllMocks());

describe("câmera compartilhada", () => {
  it("provador → resultado → tirar outra pede a câmera uma vez só", async () => {
    const a = render(<Provador />);
    await vi.waitFor(() => expect(gum).toHaveBeenCalledTimes(1));
    a.unmount(); // vai para o resultado
    const s = (await obterCamera()) as MediaStream & { track: TrackFalsa };
    expect(s.track.stop).not.toHaveBeenCalled();
    render(<Provador />); // "Tirar outra"
    await new Promise((r) => setTimeout(r, 10));
    expect(gum).toHaveBeenCalledTimes(1);
  });
  it("track encerrada faz pedir a câmera de novo", async () => {
    const s = (await obterCamera()) as MediaStream & { track: TrackFalsa };
    s.track.readyState = "ended";
    await obterCamera();
    expect(gum).toHaveBeenCalledTimes(2);
  });
  it("pagehide para as tracks", async () => {
    const s = (await obterCamera()) as MediaStream & { track: TrackFalsa };
    window.dispatchEvent(new Event("pagehide"));
    expect(s.track.stop).toHaveBeenCalled();
  });
});
