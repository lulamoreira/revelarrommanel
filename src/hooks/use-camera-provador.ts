import { useEffect, useRef, useState, type RefObject } from "react";
import { MotorProvador } from "@/lib/revelar/motor";
import { cameraViva, obterCamera } from "@/lib/revelar/camera";
import type { AjustesDebug } from "@/lib/revelar/calibracao-debug";
export interface CameraProvadorOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  cenaRef: RefObject<HTMLCanvasElement | null>;
  debugRef: RefObject<HTMLCanvasElement | null>;
  motorRef: RefObject<MotorProvador | null>;
  valoresRef: RefObject<AjustesDebug>;
  debug: boolean;
  aoDica: (v: string | null) => void;
  aoFps: (v: number) => void;
  aoDesenhar: () => void;
  aoErro: (motivo: "negada" | "indisponivel") => void;
}
/** Mantém o motor com callbacks atuais sem reiniciar a câmera a cada ajuste. */
export function useCameraProvador(options: CameraProvadorOptions): boolean {
  const atuais = useRef(options);
  const [pronta, setPronta] = useState(false);
  useEffect(() => {
    atuais.current = options;
  });
  useEffect(() => {
    options.motorRef.current?.definirDebug(options.debug);
  }, [options.debug, options.motorRef]);
  useEffect(() => {
    const { videoRef, cenaRef, debugRef, motorRef, valoresRef } = atuais.current;
    const video = videoRef.current,
      cena = cenaRef.current;
    if (!video || !cena) return;
    let cancelado = false;
    let stream: MediaStream | null = null;
    // A câmera é compartilhada: aqui nunca damos stop nas tracks, só soltamos o vídeo.
    const aoTerminar = () => void reconectar();
    const vincular = (s: MediaStream) => {
      stream?.getVideoTracks().forEach((t) => t.removeEventListener("ended", aoTerminar));
      stream = s;
      s.getVideoTracks().forEach((t) => t.addEventListener("ended", aoTerminar));
    };
    let reconectando = false;
    /** iOS encerra a câmera em segundo plano: pega de novo sem recriar o motor (seleção preservada). */
    async function reconectar(): Promise<void> {
      if (cancelado || reconectando || document.visibilityState !== "visible" || cameraViva(stream)) return;
      reconectando = true;
      try {
        const s = await obterCamera();
        if (cancelado || !video) return;
        vincular(s);
        video.srcObject = s;
        await video.play();
      } catch (e) {
        if (!cancelado) console.warn("Falha ao religar a câmera", e);
      } finally {
        reconectando = false;
      }
    }
    const aoVisivel = () => {
      if (document.visibilityState === "visible") void reconectar();
    };
    document.addEventListener("visibilitychange", aoVisivel);
    void (async () => {
      try {
        const s = await obterCamera();
        if (cancelado) return;
        vincular(s);
        video.srcObject = s;
        await video.play();
        if (cancelado) return;
        const motor = new MotorProvador(video, cena, debugRef.current, {
          aoDica: (v) => atuais.current.aoDica(v),
          aoFps: (v) => { if (atuais.current.debug) atuais.current.aoFps(v); },
          aoDesenhar: () => atuais.current.aoDesenhar(),
        });
        motor.definirCalibracao(valoresRef.current);
        motor.definirDebug(atuais.current.debug);
        motorRef.current = motor;
        motor.iniciar();
        setPronta(true);
      } catch (e) {
        if (cancelado) return;
        const nome = e instanceof DOMException ? e.name : "";
        atuais.current.aoErro(
          nome === "NotAllowedError" || nome === "SecurityError" ? "negada" : "indisponivel",
        );
      }
    })();
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVisivel);
      stream?.getVideoTracks().forEach((t) => t.removeEventListener("ended", aoTerminar));
      motorRef.current?.parar();
      motorRef.current = null;
      video.srcObject = null;
    };
  }, []);
  return pronta;
}
