import { CALIBRACAO, type Calibracao } from "@/config/calibracao";
export interface Ponto {
  x: number;
  y: number;
}
export interface Ponto3D extends Ponto {
  z: number;
}
/** Pose de desenho em pixels NÃO espelhados. */
export interface PosePeca {
  x: number;
  y: number;
  tamanho: number;
  angulo: number;
  opacidade: number;
}
export const dist = (a: Ponto, b: Ponto): number => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));
export const pxPorMmRosto = (a: Ponto, b: Ponto): number => dist(a, b) / CALIBRACAO.larguraRostoMm;
export const pxPorMmMao = (a: Ponto, b: Ponto): number => dist(a, b) / CALIBRACAO.palmaMm;
export function yawNariz(n: Ponto, a: Ponto, b: Ponto): number {
  return Math.abs(b.x - a.x) < 1e-6 ? 0.5 : clamp((n.x - a.x) / (b.x - a.x), 0, 1);
}
export const sub3 = (a: Ponto3D, b: Ponto3D): Ponto3D => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const dot3 = (a: Ponto3D, b: Ponto3D): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cruz = (a: Ponto3D, b: Ponto3D): Ponto3D => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const meio3 = (a: Ponto3D, b: Ponto3D): Ponto3D => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
});
const normalizar = (p: Ponto3D): Ponto3D | null => {
  const d = Math.hypot(p.x, p.y, p.z);
  return !Number.isFinite(d) || d < 1e-6 ? null : { x: p.x / d, y: p.y / d, z: p.z / d };
};
/** MediaPipe Z usa a largura, não a altura do vídeo. */
export const pixels3D = (p: Ponto3D, w: number, h: number): Ponto3D => ({
  x: p.x * w,
  y: p.y * h,
  z: p.z * w,
});
export interface PontosRosto {
  l234: Ponto3D;
  l454: Ponto3D;
  l33: Ponto3D;
  l263: Ponto3D;
  nariz: Ponto3D;
  queixo: Ponto3D;
}
export interface BaseCabeca {
  centro: Ponto3D;
  eixoX: Ponto3D;
  eixoY: Ponto3D;
  eixoZ: Ponto3D;
  largura: number;
  pxmm: number;
}
export function baseCabeca(r: PontosRosto): BaseCabeca | null {
  const delta = sub3(r.l454, r.l234);
  const eixoX = normalizar(delta);
  const y = normalizar(sub3(r.queixo, meio3(r.l33, r.l263)));
  if (!eixoX || !y) return null;
  let eixoZ = normalizar(cruz(eixoX, y));
  if (!eixoZ) return null;
  const centro = meio3(r.l234, r.l454);
  // MediaPipe: nariz tem Z menor (mais próximo da câmera). Normal orientada ao nariz.
  if (dot3(sub3(r.nariz, centro), eixoZ) < 0) eixoZ = { x: -eixoZ.x, y: -eixoZ.y, z: -eixoZ.z };
  let eixoY = cruz(eixoZ, eixoX);
  // A correção do sinal de Z muda a handedness: preservar Y para baixo é essencial.
  if (dot3(eixoY, y) < 0) eixoY = { x: -eixoY.x, y: -eixoY.y, z: -eixoY.z };
  const largura = Math.hypot(delta.x, delta.y, delta.z);
  return { centro, eixoX, eixoY, eixoZ, largura, pxmm: largura / CALIBRACAO.larguraRostoMm };
}
export function projetar(b: BaseCabeca, p: { a: number; b: number; c: number }): Ponto {
  return {
    x: b.centro.x + b.largura * (b.eixoX.x * p.a + b.eixoY.x * p.b + b.eixoZ.x * p.c),
    y: b.centro.y + b.largura * (b.eixoX.y * p.a + b.eixoY.y * p.b + b.eixoZ.y * p.c),
  };
}
/** Direção da câmera = (0,0,-1); normal lateral afastada da câmera é ocultada. */
export function opacidadeOrelha(b: BaseCabeca, lado: -1 | 1, c: Calibracao = CALIBRACAO): number {
  const afastamento = (Math.asin(clamp(lado * b.eixoX.z, -1, 1)) * 180) / Math.PI;
  const inicio = c.brinco.yawSomeInicio;
  const fim = Math.max(inicio + 0.01, c.brinco.yawSomeFim);
  const t = clamp((afastamento - inicio) / (fim - inicio), 0, 1);
  return 1 - t * t * (3 - 2 * t);
}
export function posesBrincos(
  b: BaseCabeca,
  mm: number,
  c: Calibracao = CALIBRACAO,
): [PosePeca, PosePeca] {
  const lado = (s: -1 | 1): PosePeca => ({
    ...projetar(b, {
      a: s * (0.5 + c.brinco.lobuloFora),
      b: c.brinco.lobuloBaixo,
      c: c.brinco.lobuloTras,
    }),
    tamanho: mm * b.pxmm,
    angulo: 0,
    opacidade: opacidadeOrelha(b, s, c),
  });
  return [lado(-1), lado(1)];
}
export interface Ombro extends Ponto {
  visibility: number;
}
export interface Ombros {
  a: Ombro;
  b: Ombro;
  larguraVideo: number;
  alturaVideo: number;
}
export function ombrosValidos(o: Ombros | null, c: Calibracao = CALIBRACAO): o is Ombros {
  return Boolean(
    o &&
    [o.a, o.b].every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.visibility >= c.colar.visibilidadeOmbros &&
        p.x >= 0 &&
        p.x <= o.larguraVideo &&
        p.y >= 0 &&
        p.y <= o.alturaVideo,
    ) &&
    dist(o.a, o.b) > 1,
  );
}
export function basePescoço(b: BaseCabeca, c: Calibracao = CALIBRACAO): Ponto {
  const p = projetar(b, { a: 0, b: c.colar.colarBaixo, c: c.colar.colarTras });
  // O pescoço pertence ao tronco: cancelar o deslocamento lateral de yaw/roll,
  // manter translação, escala 3D e profundidade de pitch, sem seguir o queixo.
  return { x: b.centro.x, y: p.y + b.largura * c.colar.colarBaixo * (1 - b.eixoY.y) };
}
export function poseColar3D(
  b: BaseCabeca | null,
  o: Ombros | null,
  mm: number,
  c: Calibracao = CALIBRACAO,
): PosePeca | null {
  const valido = ombrosValidos(o, c);
  if (!b && !valido) return null;
  let angulo = 0;
  let larguraOmbros = 0;
  let centroOmbros: Ponto = { x: 0, y: 0 };
  if (valido) {
    const esq = o.a.x < o.b.x ? o.a : o.b,
      dir = esq === o.a ? o.b : o.a;
    larguraOmbros = dist(esq, dir);
    centroOmbros = {
      x: (esq.x + dir.x) / 2,
      y: (esq.y + dir.y) / 2 - larguraOmbros * c.colar.subirOmbros,
    };
    const max = (c.colar.rotacaoMaxGraus * Math.PI) / 180;
    angulo = clamp(Math.atan2(dir.y - esq.y, dir.x - esq.x), -max, max);
  }
  const ponto = b ? basePescoço(b, c) : centroOmbros;
  if (b && valido)
    ponto.y = ponto.y * (1 - c.colar.misturaOmbros) + centroOmbros.y * c.colar.misturaOmbros;
  const tamanho = b
    ? clamp(mm * b.pxmm, b.largura * c.colar.larguraMinRosto, b.largura * c.colar.larguraMaxRosto)
    : clamp(
        (mm * larguraOmbros) / c.ombrosMm,
        larguraOmbros * c.colar.larguraMinOmbros,
        larguraOmbros * c.colar.larguraMaxOmbros,
      );
  return { ...ponto, tamanho, angulo, opacidade: 1 };
}
export function posePulseira(p0: Ponto, p9: Ponto, _pxmm: number | null, mm: number): PosePeca {
  const d = dist(p0, p9) || 1,
    ux = (p0.x - p9.x) / d,
    uy = (p0.y - p9.y) / d;
  return {
    x: p0.x + ux * CALIBRACAO.pulseira.paraAntebraco * d,
    y: p0.y + uy * CALIBRACAO.pulseira.paraAntebraco * d,
    tamanho: mm * pxPorMmMao(p0, p9),
    angulo: Math.atan2(-uy, -ux) + Math.PI / 2,
    opacidade: 1,
  };
}
