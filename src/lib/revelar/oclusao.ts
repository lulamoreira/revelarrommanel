/**
 * Oclusão dos brincos: orelha atrás da bochecha (contorno FACE_OVAL) ou atrás da mão.
 * Polígonos simples, sem bibliotecas; calculado só a cada detecção.
 */
import { CALIBRACAO, type Calibracao } from "@/config/calibracao";
import { clamp, type Ponto } from "./geometria";

export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

/** Ray casting: true se o ponto está dentro do polígono. */
export function pontoNoPoligono(p: Ponto, poli: readonly Ponto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const a = poli[i]!, b = poli[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      dentro = !dentro;
  }
  return dentro;
}

function distSegmento(p: Ponto, a: Ponto, b: Ponto): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 < 1e-9 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distância até a borda: positiva fora, negativa dentro. */
export function distanciaComSinal(p: Ponto, poli: readonly Ponto[]): number {
  if (poli.length < 3) return Infinity;
  let m = Infinity;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++)
    m = Math.min(m, distSegmento(p, poli[j]!, poli[i]!));
  return pontoNoPoligono(p, poli) ? -m : m;
}

/** 1 com ≥ foraRosto da largura para fora; 0 com ≥ dentroRosto para dentro. */
export function opacidadePorDistancia(d: number, largura: number, c: Calibracao = CALIBRACAO): number {
  if (!Number.isFinite(d)) return 1;
  const { foraRosto, dentroRosto } = c.oclusao;
  return clamp((d / Math.max(largura, 1e-6) + dentroRosto) / (foraRosto + dentroRosto), 0, 1);
}

/** Casco convexo (monotone chain), anti-horário em coordenadas de tela. */
export function cascoConvexo(pts: readonly Ponto[]): Ponto[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cr = (o: Ponto, a: Ponto, b: Ponto) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: Ponto[] = [], hi: Ponto[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop();
    lo.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (hi.length >= 2 && cr(hi[hi.length - 2]!, hi[hi.length - 1]!, q) <= 0) hi.pop();
    hi.push(q);
  }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

/** Expande o polígono a partir do centroide dos vértices. */
export function expandir(poli: readonly Ponto[], fracao: number): Ponto[] {
  if (!poli.length) return [];
  const cx = poli.reduce((s, p) => s + p.x, 0) / poli.length;
  const cy = poli.reduce((s, p) => s + p.y, 0) / poli.length;
  return poli.map((p) => ({ x: cx + (p.x - cx) * (1 + fracao), y: cy + (p.y - cy) * (1 + fracao) }));
}

export function areaPoligono(poli: readonly Ponto[]): number {
  let s = 0;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++)
    s += poli[j]!.x * poli[i]!.y - poli[i]!.x * poli[j]!.y;
  return Math.abs(s) / 2;
}

/** Sutherland–Hodgman: recorta `sujeito` pelo polígono convexo `recorte`. */
export function recortar(sujeito: readonly Ponto[], recorte: readonly Ponto[]): Ponto[] {
  if (recorte.length < 3) return [];
  // Orientação do recorte para saber o lado "dentro".
  let s = 0;
  for (let i = 0, j = recorte.length - 1; i < recorte.length; j = i++)
    s += recorte[j]!.x * recorte[i]!.y - recorte[i]!.x * recorte[j]!.y;
  const sinal = s >= 0 ? 1 : -1;
  let saida = [...sujeito];
  for (let i = 0; i < recorte.length && saida.length; i++) {
    const a = recorte[i]!, b = recorte[(i + 1) % recorte.length]!;
    const lado = (p: Ponto) => sinal * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
    const entrada = saida;
    saida = [];
    for (let k = 0; k < entrada.length; k++) {
      const p = entrada[k]!, q = entrada[(k + 1) % entrada.length]!;
      const lp = lado(p), lq = lado(q);
      if (lp >= 0) saida.push(p);
      if (lp >= 0 !== lq >= 0) {
        const t = lp / (lp - lq);
        saida.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
      }
    }
  }
  return saida;
}

export interface OclusaoBrincos {
  opacidades: [number, number];
  maoNoRosto: boolean;
}

/** `cascos` já expandidos. Retorna opacidade de oclusão por lóbulo (menor vence). */
export function avaliarOclusao(
  lobulos: readonly [Ponto, Ponto],
  oval: readonly Ponto[],
  cascos: readonly Ponto[][],
  largura: number,
  c: Calibracao = CALIBRACAO,
): OclusaoBrincos {
  const areaRosto = areaPoligono(oval);
  const maoNoRosto =
    areaRosto > 0 &&
    cascos.some((h) => areaPoligono(recortar(oval, h)) / areaRosto > c.oclusao.limiteMaoRosto);
  if (maoNoRosto) return { opacidades: [0, 0], maoNoRosto };
  const op = (p: Ponto) => {
    let o = opacidadePorDistancia(distanciaComSinal(p, oval), largura, c);
    for (const h of cascos) o = Math.min(o, opacidadePorDistancia(distanciaComSinal(p, h), largura, c));
    return o;
  };
  return { opacidades: [op(lobulos[0]), op(lobulos[1])], maoNoRosto };
}
