import { useEffect, useRef, useState, type RefObject } from "react";
import { MotorProvador } from "@/lib/revelar/motor";
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
    const { videoRef, cenaRef, debugRef, motorRef, valoresRef, debug } = atuais.current;
    const video = videoRef.current,
      cena = cenaRef.current;
    if (!video || !cena) return;
    let stream: MediaStream | null = null;
    let cancelado = false;
    const parar = () => stream?.getTracks().forEach((t) => t.stop());
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new DOMException("sem câmera", "NotFoundError");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelado) {
          parar();
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (cancelado) {
          parar();
          return;
        }
        const motor = new MotorProvador(video, cena, debug ? debugRef.current : null, {
          aoDica: (v) => atuais.current.aoDica(v),
          ...(debug ? { aoFps: (v: number) => atuais.current.aoFps(v) } : {}),
          aoDesenhar: () => atuais.current.aoDesenhar(),
        });
        motor.definirCalibracao(valoresRef.current);
        motorRef.current = motor;
        motor.iniciar();
        setPronta(true);
      } catch (e) {
        parar();
        if (cancelado) return;
        const nome = e instanceof DOMException ? e.name : "";
        atuais.current.aoErro(
          nome === "NotAllowedError" || nome === "SecurityError" ? "negada" : "indisponivel",
        );
      }
    })();
    return () => {
      cancelado = true;
      motorRef.current?.parar();
      motorRef.current = null;
      parar();
      video.srcObject = null;
    };
  }, []);
  return pronta;
}
