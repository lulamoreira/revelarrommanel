/**
 * Câmera compartilhada: um único MediaStream por visita, reaproveitado entre
 * Provador → Resultado → "Tirar outra" para o iOS não perguntar de novo.
 * Só é desligada de verdade por liberarCamera() (saída, segundo plano, inatividade).
 */
import { CAMERA_DESLIGAR_OCULTA_MS } from "@/config/visual";

let stream: MediaStream | null = null;
let pendente: Promise<MediaStream> | null = null;

/** Verdadeiro se há stream e todas as video tracks estão "live" e sem mute. */
export function cameraViva(s: MediaStream | null = stream): s is MediaStream {
  if (!s) return false;
  const tracks = s.getVideoTracks();
  return tracks.length > 0 && tracks.every((t) => t.readyState === "live" && !t.muted);
}

export function obterCamera(): Promise<MediaStream> {
  if (stream && stream.getVideoTracks().length > 0 &&
      stream.getVideoTracks().every((t) => t.readyState === "live")) return Promise.resolve(stream);
  if (pendente) return pendente;
  if (!navigator.mediaDevices?.getUserMedia)
    return Promise.reject(new DOMException("sem câmera", "NotFoundError"));
  if (stream) liberarCamera();
  instalarCiclo();
  pendente = navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    .then((s) => {
      stream = s;
      return s;
    })
    .finally(() => {
      pendente = null;
    });
  return pendente;
}

export function liberarCamera(): void {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

let instalado = false;
let timerOculta: ReturnType<typeof setTimeout> | undefined;
/** pagehide e segundo plano prolongado desligam a câmera (indicador verde do iPhone). */
function instalarCiclo(): void {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  window.addEventListener("pagehide", liberarCamera);
  document.addEventListener("visibilitychange", () => {
    clearTimeout(timerOculta);
    if (document.visibilityState === "hidden")
      timerOculta = setTimeout(liberarCamera, CAMERA_DESLIGAR_OCULTA_MS);
  });
}

/** Desliga a câmera após `ms` sem toque/tecla. Retorna a limpeza. */
export function desligarAposInatividade(ms: number): () => void {
  let timer = setTimeout(liberarCamera, ms);
  const reiniciar = () => {
    clearTimeout(timer);
    timer = setTimeout(liberarCamera, ms);
  };
  const eventos = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
  eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
  return () => {
    clearTimeout(timer);
    eventos.forEach((e) => window.removeEventListener(e, reiniciar));
  };
}

/** Só para testes. */
export function _resetarCamera(): void {
  liberarCamera();
  pendente = null;
}
