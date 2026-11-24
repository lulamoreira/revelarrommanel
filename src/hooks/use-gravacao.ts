import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { escolherMimeVideo } from "@/lib/revelar/ambiente";
import {
  desenharPolaroid,
  fontesProntas,
  medidasPolaroid,
  prepararLogoDaMoldura,
} from "@/lib/revelar/captura";

const DURACAO_MAX_MS = 10_000;
const LADO_MAX_VIDEO = 720;

/** Grava vídeo da cena dentro da polaroid (canvas próprio, texto não espelhado). */
export function useGravacao(
  cenaRef: RefObject<HTMLCanvasElement | null>,
  aoTerminar: (blob: Blob, mime: string) => void,
) {
  const [mime, setMime] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dimRef = useRef({ w: 0, h: 0 });
  const logoRef = useRef<HTMLImageElement | null>(null);
  const inicioRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const terminarRef = useRef(aoTerminar);
  terminarRef.current = aoTerminar;

  useEffect(() => {
    if (
      typeof MediaRecorder === "undefined" ||
      typeof HTMLCanvasElement.prototype.captureStream !== "function"
    )
      return;
    setMime(escolherMimeVideo((m) => MediaRecorder.isTypeSupported(m)));
    void fontesProntas();
    void prepararLogoDaMoldura().then((l) => {
      logoRef.current = l;
    });
  }, []);

  const desenharQuadro = useCallback(() => {
    const ctx = ctxRef.current;
    const cena = cenaRef.current;
    if (!ctx || !cena) return;
    desenharPolaroid(ctx, cena, dimRef.current.w, dimRef.current.h, logoRef.current);
  }, [cenaRef]);

  const parar = useCallback(() => {
    window.clearInterval(timerRef.current);
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const iniciar = useCallback(() => {
    const cena = cenaRef.current;
    if (!mime || !cena || !cena.width || recRef.current) return;
    const escala = Math.min(1, LADO_MAX_VIDEO / Math.max(cena.width, cena.height));
    // Dimensões pares (exigência de alguns codificadores).
    const w = Math.round((cena.width * escala) / 2) * 2;
    const h = Math.round((cena.height * escala) / 2) * 2;
    const m = medidasPolaroid(w, h);
    const c = document.createElement("canvas");
    c.width = m.largura + (m.largura % 2);
    c.height = m.altura + (m.altura % 2);
    dimRef.current = { w, h };
    canvasRef.current = c;
    ctxRef.current = c.getContext("2d");
    desenharQuadro();
    const stream = c.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const partes: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      ctxRef.current = null;
      setGravando(false);
      setProgresso(0);
      if (Date.now() - inicioRef.current < 400 || partes.length === 0) return; // toque curto: ignora
      const tipo = mime.split(";")[0] ?? "video/webm";
      terminarRef.current(new Blob(partes, { type: tipo }), tipo);
    };
    recRef.current = rec;
    inicioRef.current = Date.now();
    rec.start(250);
    setGravando(true);
    timerRef.current = window.setInterval(() => {
      const p = (Date.now() - inicioRef.current) / DURACAO_MAX_MS;
      setProgresso(Math.min(1, p));
      if (p >= 1) parar();
    }, 100);
  }, [cenaRef, mime, desenharQuadro, parar]);

  useEffect(() => () => parar(), [parar]);

  return { disponivel: mime !== null, gravando, progresso, iniciar, parar, desenharQuadro };
}
