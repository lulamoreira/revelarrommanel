import { VISUAL_CANVAS } from "@/config/visual";

export const LADO_MAX = 1280;

/** Garante que as fontes estejam prontas antes de desenhar textos no canvas. */
export async function fontesProntas(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`64px "${VISUAL_CANVAS.fonteManuscrita}"`),
      document.fonts.load(`500 24px "${VISUAL_CANVAS.fonteTexto}"`),
    ]);
    await document.fonts.ready;
  } catch {
    /* segue com fonte padrão */
  }
}

/** Copia a cena (espaço da câmera) espelhada, como a cliente via, limitada a 1280 px. */
export function fotoEspelhada(cena: HTMLCanvasElement): HTMLCanvasElement {
  const escala = Math.min(1, LADO_MAX / Math.max(cena.width, cena.height));
  const c = document.createElement("canvas");
  c.width = Math.round(cena.width * escala);
  c.height = Math.round(cena.height * escala);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(cena, 0, 0, c.width, c.height);
  return c;
}

export interface MedidasPolaroid {
  largura: number;
  altura: number;
  borda: number;
  base: number;
}

export function medidasPolaroid(w: number, h: number): MedidasPolaroid {
  const borda = Math.round(Math.min(w, h) * 0.05);
  const base = Math.round(Math.min(w, h) * 0.2);
  return { largura: w + borda * 2, altura: h + borda + base, borda, base };
}

/** Desenha a moldura polaroid com a imagem (texto legível, não espelhado). */
export function desenharPolaroid(
  ctx: CanvasRenderingContext2D,
  fonte: CanvasImageSource,
  w: number,
  h: number,
  espelhar = false,
): void {
  const m = medidasPolaroid(w, h);
  ctx.fillStyle = VISUAL_CANVAS.moldura;
  ctx.fillRect(0, 0, m.largura, m.altura);
  if (espelhar) {
    ctx.save();
    ctx.translate(m.borda + w, m.borda);
    ctx.scale(-1, 1);
    ctx.drawImage(fonte, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(fonte, m.borda, m.borda, w, h);
  }
  ctx.fillStyle = VISUAL_CANVAS.texto;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(m.base * 0.45)}px "${VISUAL_CANVAS.fonteManuscrita}", cursive`;
  ctx.fillText(VISUAL_CANVAS.fraseMoldura, m.largura / 2, m.borda + h + m.base / 2);
}

export function canvasParaBlob(c: HTMLCanvasElement, tipo = "image/jpeg", qualidade = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), tipo, qualidade),
  );
}

export async function polaroidDeImagem(fonte: CanvasImageSource, w: number, h: number): Promise<Blob> {
  await fontesProntas();
  const escala = Math.min(1, LADO_MAX / Math.max(w, h));
  const iw = Math.round(w * escala);
  const ih = Math.round(h * escala);
  const m = medidasPolaroid(iw, ih);
  const c = document.createElement("canvas");
  c.width = m.largura;
  c.height = m.altura;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  desenharPolaroid(ctx, fonte, iw, ih);
  return canvasParaBlob(c);
}

export function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    img.src = src;
  });
}

export function blobParaBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}
