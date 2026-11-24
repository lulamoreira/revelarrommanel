/** Filtro One Euro (Casiez et al.) — suaviza sem atrasar movimentos rápidos. */
export interface OneEuroParams {
  minCutoff: number;
  beta: number;
  dCutoff: number;
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private x: number | null = null;
  private dx = 0;
  private t = 0;

  constructor(private readonly p: OneEuroParams) {}

  reset(): void {
    this.x = null;
    this.dx = 0;
  }

  /** @param tMs instante em milissegundos */
  filter(value: number, tMs: number): number {
    if (this.x === null) {
      this.x = value;
      this.t = tMs;
      return value;
    }
    const dt = Math.max((tMs - this.t) / 1000, 1e-3);
    this.t = tMs;
    const rawDx = (value - this.x) / dt;
    this.dx = this.dx + alpha(this.p.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.p.minCutoff + this.p.beta * Math.abs(this.dx);
    this.x = this.x + alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}

/** Ajusta um ângulo para ficar contínuo em relação ao anterior (evita saltos de ±2π). */
export function desenrolarAngulo(anterior: number | null, atual: number): number {
  if (anterior === null) return atual;
  let a = atual;
  while (a - anterior > Math.PI) a -= 2 * Math.PI;
  while (a - anterior < -Math.PI) a += 2 * Math.PI;
  return a;
}
