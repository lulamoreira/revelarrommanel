import { CALIBRACAO } from "@/config/calibracao";
/** Mola amortecida em torno da gravidade da tela. Integração em subpassos ≤8 ms. */
export class Pendulo {
  private x: number | null = null;
  private t = 0;
  private angulo = 0;
  private velocidade = 0;
  atualizar(x: number, t: number, largura: number, p = CALIBRACAO.brinco.pendulo): number {
    const dt = (t - this.t) / 1000;
    if (this.x === null || dt <= 0 || dt > 0.3) {
      this.x = x;
      this.t = t;
      this.angulo = 0;
      this.velocidade = 0;
      return 0;
    }
    const limite = (p.limiteGraus * Math.PI) / 180;
    const alvo = Math.max(
      -limite,
      Math.min(limite, (-(x - this.x) / dt / Math.max(largura, 1)) * p.resposta),
    );
    const passos = Math.ceil(dt / 0.008),
      h = dt / passos;
    for (let i = 0; i < passos; i++) {
      this.velocidade += (p.rigidez * (alvo - this.angulo) - p.amortecimento * this.velocidade) * h;
      this.angulo = Math.max(-limite, Math.min(limite, this.angulo + this.velocidade * h));
    }
    this.x = x;
    this.t = t;
    return this.angulo;
  }
}
