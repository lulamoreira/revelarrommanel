import logoMoldura from "@/assets/logo_rommanel_roxo.png.asset.json";
import { POLAROID, VISUAL_CANVAS } from "@/config/visual";

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

/** Copia a cena sem espelhar, no espaço original da câmera, limitada a 1280 px. */
export function fotoNaoEspelhada(cena: HTMLCanvasElement): HTMLCanvasElement {
  const escala = Math.min(1, LADO_MAX / Math.max(cena.width, cena.height));
  const c = document.createElement("canvas");
  c.width = Math.round(cena.width * escala);
  c.height = Math.round(cena.height * escala);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
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
let logoDaMolduraCache: Promise<HTMLImageElement | null> | null = null;

/**
 * Carrega uma única vez a marca desenhada na base da polaroid.
 * Falha de rede devolve null: a foto sai sem a marca, nunca quebra a captura.
 */
export function prepararLogoDaMoldura(): Promise<HTMLImageElement | null> {
  if (!logoDaMolduraCache) {
    logoDaMolduraCache = carregarImagem(logoMoldura.url).catch(() => null);
  }
  return logoDaMolduraCache;
}

export function desenharPolaroid(
  ctx: CanvasRenderingContext2D,
  fonte: CanvasImageSource,
  w: number,
  h: number,
  logo?: HTMLImageElement | null,
): void {
  const m = medidasPolaroid(w, h);
  ctx.fillStyle = VISUAL_CANVAS.moldura;
  ctx.fillRect(0, 0, m.largura, m.altura);
  ctx.drawImage(fonte, m.borda, m.borda, w, h);
  const baseTopo = m.borda + h;
  ctx.fillStyle = VISUAL_CANVAS.texto;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(m.base * POLAROID.fraseTamanho)}px "${VISUAL_CANVAS.fonteManuscrita}", cursive`;
  ctx.fillText(
    VISUAL_CANVAS.fraseMoldura,
    m.largura / 2,
    baseTopo + m.base * POLAROID.frasePosicao,
  );

  if (logo && logo.naturalWidth > 0 && logo.naturalHeight > 0) {
    const proporcao = logo.naturalWidth / logo.naturalHeight;
    const alturaLimite = (m.largura * POLAROID.logoLarguraMax) / proporcao;
    const escala = Math.min(1, alturaLimite / (m.base * POLAROID.logoAltura));
    const alt = Math.round(m.base * POLAROID.logoAltura * escala);
    const larg = Math.round(alt * proporcao);
    ctx.drawImage(
      logo,
      (m.largura - larg) / 2,
      baseTopo + m.base * POLAROID.logoPosicao - alt / 2,
      larg,
      alt,
    );
  }
}

export function canvasParaBlob(
  c: HTMLCanvasElement,
  tipo = "image/jpeg",
  qualidade = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), tipo, qualidade),
  );
}

export async function polaroidDeImagem(
  fonte: CanvasImageSource,
  w: number,
  h: number,
): Promise<Blob> {
  await fontesProntas();
  const logo = await prepararLogoDaMoldura();
  const escala = Math.min(1, LADO_MAX / Math.max(w, h));
  const iw = Math.round(w * escala);
  const ih = Math.round(h * escala);
  const m = medidasPolaroid(iw, ih);
  const c = document.createElement("canvas");
  c.width = m.largura;
  c.height = m.altura;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  desenharPolaroid(ctx, fonte, iw, ih, logo);
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
