/** Detecções de ambiente (puras, testáveis). */

const PADROES_APP = [/Instagram/i, /FBAN/, /FBAV/, /\bLine\//i, /; wv\)/];

export function ehNavegadorDeApp(userAgent: string): boolean {
  return PADROES_APP.some((r) => r.test(userAgent));
}

export function ehIOS(userAgent: string, maxTouchPoints = 0): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

export const ORDEM_MIME_VIDEO = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm",
] as const;

export function escolherMimeVideo(suporta: (mime: string) => boolean): string | null {
  for (const m of ORDEM_MIME_VIDEO) if (suporta(m)) return m;
  return null;
}

export function nomeArquivo(data: Date, extensao: "jpg" | "mp4" | "webm"): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const carimbo = `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}-${p(data.getHours())}${p(data.getMinutes())}${p(data.getSeconds())}`;
  return `revelar-${carimbo}.${extensao}`;
}

/** Normaliza o código da loja vindo de ?loja= (só letras, números, - e _; máx. 32). */
export function lerLoja(valor: string | null): string | null {
  if (!valor) return null;
  const limpo = valor.trim().slice(0, 32);
  return /^[A-Za-z0-9_-]+$/.test(limpo) ? limpo : null;
}
