import { CALIBRACAO } from "@/config/calibracao";

export interface Ponto {
  x: number;
  y: number;
}

/** Pose 2D de uma peça no espaço da imagem da câmera (não espelhado). */
export interface PosePeca {
  x: number;
  y: number;
  /** Tamanho principal em px: altura (brinco) ou largura (colar/pulseira). */
  tamanho: number;
  angulo: number;
  opacidade: number;
}

export const dist = (a: Ponto, b: Ponto): number => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Fator px/mm a partir da largura do rosto (234 ↔ 454). */
export function pxPorMmRosto(l234: Ponto, l454: Ponto): number {
  return dist(l234, l454) / CALIBRACAO.larguraRostoMm;
}

/** Fator px/mm a partir da palma (0 → 9). */
export function pxPorMmMao(p0: Ponto, p9: Ponto): number {
  return dist(p0, p9) / CALIBRACAO.palmaMm;
}

/**
 * Yaw normalizado: posição do nariz entre 234 (0) e 454 (1). 0.5 = de frente.
 */
export function yawNariz(nariz: Ponto, l234: Ponto, l454: Ponto): number {
  const dx = l454.x - l234.x;
  if (Math.abs(dx) < 1e-6) return 0.5;
  return clamp((nariz.x - l234.x) / dx, 0, 1);
}

/** Opacidade do brinco de um lado, dado quanto o nariz se aproximou desse lado (0..0.5). */
export function opacidadeLado(proximidade: number): number {
  const { yawInicioSumir, yawSumido } = CALIBRACAO.brinco;
  return clamp((proximidade - yawSumido) / (yawInicioSumir - yawSumido), 0, 1);
}

export interface PontosRosto {
  l234: Ponto;
  l454: Ponto;
  l177: Ponto;
  l401: Ponto;
  l33: Ponto;
  l263: Ponto;
  nariz: Ponto;
  queixo: Ponto;
}

/** Calcula as duas posições de brinco (lado 234/177 e lado 454/401). */
export function posesBrincos(r: PontosRosto, medidaMm: number): [PosePeca, PosePeca] {
  const larg = dist(r.l234, r.l454);
  const pxmm = larg / CALIBRACAO.larguraRostoMm;
  const angulo = Math.atan2(r.l263.y - r.l33.y, r.l263.x - r.l33.x);
  const yaw = yawNariz(r.nariz, r.l234, r.l454);
  const { paraFora, paraBaixo, deslocVisivel } = CALIBRACAO.brinco;
  const cos = Math.cos(angulo);
  const sin = Math.sin(angulo);
  const tamanho = medidaMm * pxmm;

  const lado = (jaw: Ponto, sinal: -1 | 1, proximidade: number, giro: number): PosePeca => {
    const fora = (paraFora + Math.max(0, giro) * deslocVisivel) * larg * sinal;
    const baixo = paraBaixo * larg;
    return {
      x: jaw.x + fora * cos - baixo * sin,
      y: jaw.y + fora * sin + baixo * cos,
      tamanho,
      angulo,
      opacidade: opacidadeLado(proximidade),
    };
  };
  // Lado 234: some quando o nariz se aproxima de 234 (yaw → 0).
  const a = lado(r.l177, -1, yaw, 0.5 - (1 - yaw));
  const b = lado(r.l401, 1, 1 - yaw, 0.5 - yaw);
  return [a, b];
}

/** Base do pescoço e pose do colar. */
export function poseColar(
  ombroEsq: Ponto,
  ombroDir: Ponto,
  queixo: Ponto | null,
  pxmm: number | null,
  medidaMm: number,
): PosePeca {
  const meio = { x: (ombroEsq.x + ombroDir.x) / 2, y: (ombroEsq.y + ombroDir.y) / 2 };
  const t = CALIBRACAO.colar.interpolacaoQueixo;
  const base = queixo ? { x: meio.x + (queixo.x - meio.x) * t, y: meio.y + (queixo.y - meio.y) * t } : meio;
  const ombros = dist(ombroEsq, ombroDir);
  const fator = pxmm ?? ombros / CALIBRACAO.ombrosMm;
  const largura = clamp(
    medidaMm * fator,
    ombros * CALIBRACAO.colar.larguraMinOmbros,
    ombros * CALIBRACAO.colar.larguraMaxOmbros,
  );
  // Ombro "esquerdo" da pessoa aparece à direita na imagem não espelhada.
  const esq = ombroEsq.x < ombroDir.x ? ombroEsq : ombroDir;
  const dir = esq === ombroEsq ? ombroDir : ombroEsq;
  return { x: base.x, y: base.y, tamanho: largura, angulo: Math.atan2(dir.y - esq.y, dir.x - esq.x), opacidade: 1 };
}

/** Pose da pulseira a partir de pulso (0) e base do dedo médio (9). */
export function posePulseira(p0: Ponto, p9: Ponto, pxmm: number | null, medidaMm: number): PosePeca {
  const d = dist(p0, p9) || 1;
  const ux = (p0.x - p9.x) / d;
  const uy = (p0.y - p9.y) / d;
  const k = CALIBRACAO.pulseira.paraAntebraco * d;
  const fator = pxmm ?? d / CALIBRACAO.palmaMm;
  return {
    x: p0.x + ux * k,
    y: p0.y + uy * k,
    tamanho: medidaMm * fator,
    // Perpendicular ao eixo 0→9: o eixo aponta para os dedos (-u).
    angulo: Math.atan2(-uy, -ux) + Math.PI / 2,
    opacidade: 1,
  };
}
