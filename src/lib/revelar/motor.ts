/**
 * Motor do provador: detecção (≤18 fps), suavização e desenho (30 fps) num canvas
 * no espaço da câmera (não espelhado). A pré-visualização é espelhada via CSS.
 * Não aloca objetos pesados por quadro.
 */
import { CALIBRACAO } from "@/config/calibracao";
import type { Peca, TipoPeca } from "@/config/catalogo";
import { OneEuroFilter, desenrolarAngulo } from "./one-euro";
import {
  posesBrincos,
  poseColar,
  posePulseira,
  pxPorMmMao,
  pxPorMmRosto,
  dist,
  type Ponto,
  type PosePeca,
} from "./geometria";
import { carregarMao, carregarPose, carregarRosto } from "./rastreamento";
import type { FaceLandmarker, HandLandmarker, PoseLandmarker } from "./rastreamento";

export type Selecao = Partial<Record<TipoPeca, Peca>>;

type Lm = { x: number; y: number };

class Slot {
  readonly fx = new OneEuroFilter(CALIBRACAO.suavizacao);
  readonly fy = new OneEuroFilter(CALIBRACAO.suavizacao);
  readonly fs = new OneEuroFilter(CALIBRACAO.suavizacao);
  readonly fa = new OneEuroFilter(CALIBRACAO.suavizacao);
  pose: PosePeca = { x: 0, y: 0, tamanho: 0, angulo: 0, opacidade: 0 };
  ultimoVisto = -Infinity;
  ultimoAngulo: number | null = null;
  opacidadeAlvo = 0;
  opacidade = 0;
  tem = false;

  atualizar(alvo: PosePeca, t: number): void {
    if (t - this.ultimoVisto > CALIBRACAO.rastreamento.segurarMs + CALIBRACAO.rastreamento.fadeMs) {
      this.fx.reset();
      this.fy.reset();
      this.fs.reset();
      this.fa.reset();
      this.ultimoAngulo = null;
    }
    const ang = desenrolarAngulo(this.ultimoAngulo, alvo.angulo);
    this.ultimoAngulo = ang;
    this.pose.x = this.fx.filter(alvo.x, t);
    this.pose.y = this.fy.filter(alvo.y, t);
    this.pose.tamanho = this.fs.filter(alvo.tamanho, t);
    this.pose.angulo = this.fa.filter(ang, t);
    this.opacidadeAlvo = alvo.opacidade;
    this.ultimoVisto = t;
    this.tem = true;
  }

  passo(t: number): void {
    const { segurarMs, fadeMs } = CALIBRACAO.rastreamento;
    const desde = t - this.ultimoVisto;
    const alvo = desde <= segurarMs ? this.opacidadeAlvo : this.opacidadeAlvo * Math.max(0, 1 - (desde - segurarMs) / fadeMs);
    this.opacidade += (alvo - this.opacidade) * 0.35;
    if (this.opacidade < 0.01 && desde > segurarMs) this.opacidade = 0;
  }
}

export interface CallbacksMotor {
  aoDica?: (dica: string | null) => void;
  aoFps?: (fps: number) => void;
  aoDesenhar?: () => void;
}

const DICA_OMBROS = "Afaste um pouco o celular para mostrar o colo";
const DICA_PULSO = "Mostre o pulso da outra mão para a câmera";

export class MotorProvador {
  private ctx: CanvasRenderingContext2D;
  private dbg: CanvasRenderingContext2D | null;
  private raf = 0;
  private rodando = false;
  private selecao: Selecao = {};
  private imagens = new Map<string, HTMLImageElement>();
  private rosto: FaceLandmarker | null = null;
  private pose: PoseLandmarker | null = null;
  private mao: HandLandmarker | null = null;
  private ultimoDesenho = 0;
  private ultimaDeteccao = 0;
  private ultimoTs = 0;
  private slots = { brincoA: new Slot(), brincoB: new Slot(), colar: new Slot(), pulseira: new Slot() };
  private ultimoOmbro = 0;
  private ultimaMao = 0;
  private dicaAtual: string | null = null;
  private quadros = 0;
  private inicioFps = 0;
  private pontosDebug: Ponto[] = [];

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly cena: HTMLCanvasElement,
    debug: HTMLCanvasElement | null,
    private readonly cb: CallbacksMotor = {},
  ) {
    const ctx = cena.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    this.ctx = ctx;
    this.dbg = debug?.getContext("2d") ?? null;
  }

  /** Carrega imagens e só os detectores necessários. Rejeita se algum falhar. */
  async definirSelecao(sel: Selecao): Promise<void> {
    this.selecao = sel;
    const tarefas: Promise<unknown>[] = [];
    for (const p of Object.values(sel)) {
      if (p && !this.imagens.has(p.id)) {
        tarefas.push(
          new Promise<void>((res, rej) => {
            const img = new Image();
            img.onload = () => {
              this.imagens.set(p.id, img);
              res();
            };
            img.onerror = () => rej(new Error(`Imagem ${p.imagem}`));
            img.src = p.imagem;
          }),
        );
      }
    }
    if (sel.brinco || sel.colar) tarefas.push(carregarRosto().then((r) => (this.rosto = r)));
    if (sel.colar) tarefas.push(carregarPose().then((r) => (this.pose = r)));
    if (sel.pulseira) tarefas.push(carregarMao().then((r) => (this.mao = r)));
    const agora = performance.now();
    this.ultimoOmbro = agora;
    this.ultimaMao = agora;
    await Promise.all(tarefas);
  }

  iniciar(): void {
    if (this.rodando) return;
    this.rodando = true;
    this.inicioFps = performance.now();
    const laco = (t: number) => {
      if (!this.rodando) return;
      this.raf = requestAnimationFrame(laco);
      this.quadro(t);
    };
    this.raf = requestAnimationFrame(laco);
  }

  parar(): void {
    this.rodando = false;
    cancelAnimationFrame(this.raf);
  }

  private quadro(t: number): void {
    const v = this.video;
    if (v.readyState < 2 || !v.videoWidth) return;
    const { desenhoFps, detecaoFps } = CALIBRACAO.rastreamento;
    if (t - this.ultimoDesenho < 1000 / desenhoFps - 3) return;
    this.ultimoDesenho = t;
    if (this.cena.width !== v.videoWidth || this.cena.height !== v.videoHeight) {
      this.cena.width = v.videoWidth;
      this.cena.height = v.videoHeight;
      if (this.dbg) {
        this.dbg.canvas.width = v.videoWidth;
        this.dbg.canvas.height = v.videoHeight;
      }
    }
    if (t - this.ultimaDeteccao >= 1000 / detecaoFps) {
      this.ultimaDeteccao = t;
      try {
        this.detectar(t);
      } catch (e) {
        console.warn("Falha na detecção", e);
      }
    }
    this.desenhar(t);
    this.cb.aoDesenhar?.();
    this.quadros++;
    if (t - this.inicioFps >= 1000) {
      this.cb.aoFps?.(Math.round((this.quadros * 1000) / (t - this.inicioFps)));
      this.quadros = 0;
      this.inicioFps = t;
    }
  }

  private detectar(t: number): void {
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    const ts = Math.max(t, this.ultimoTs + 1);
    this.ultimoTs = ts;
    const px = (l: Lm | undefined): Ponto | null => (l ? { x: l.x * w, y: l.y * h } : null);
    const dbg: Ponto[] | null = this.dbg ? (this.pontosDebug = []) : null;
    const sel = this.selecao;

    let pxmmRosto: number | null = null;
    let queixo: Ponto | null = null;
    if ((sel.brinco || sel.colar) && this.rosto) {
      const lm = this.rosto.detectForVideo(this.video, ts).faceLandmarks[0];
      if (lm) {
        const g = (i: number) => px(lm[i]);
        const r = {
          l234: g(234), l454: g(454), l177: g(177), l401: g(401),
          l33: g(33), l263: g(263), nariz: g(1), queixo: g(152),
        };
        if (Object.values(r).every(Boolean)) {
          const rr = r as Record<keyof typeof r, Ponto>;
          pxmmRosto = pxPorMmRosto(rr.l234, rr.l454);
          queixo = rr.queixo;
          if (sel.brinco) {
            const [a, b] = posesBrincos(rr, sel.brinco.medida_mm * (sel.brinco.ajuste?.escala ?? 1));
            this.slots.brincoA.atualizar(a, t);
            this.slots.brincoB.atualizar(b, t);
          }
          dbg?.push(rr.l234, rr.l454, rr.l177, rr.l401, rr.l33, rr.l263, rr.nariz, rr.queixo);
        }
      }
    }

    if (sel.colar && this.pose) {
      const lm = this.pose.detectForVideo(this.video, ts).landmarks[0];
      const o11 = px(lm?.[11]);
      const o12 = px(lm?.[12]);
      const vis = (i: number) => (lm?.[i] as { visibility?: number } | undefined)?.visibility ?? 1;
      if (o11 && o12 && vis(11) > 0.5 && vis(12) > 0.5) {
        this.ultimoOmbro = t;
        const alvo = poseColar(o11, o12, queixo, pxmmRosto, sel.colar.medida_mm * (sel.colar.ajuste?.escala ?? 1));
        this.slots.colar.atualizar(alvo, t);
        dbg?.push(o11, o12);
      }
    }

    if (sel.pulseira && this.mao) {
      const res = this.mao.detectForVideo(this.video, ts);
      let melhor: { p0: Ponto; p9: Ponto; d: number } | null = null;
      for (const mao of res.landmarks) {
        const p0 = px(mao[0]);
        const p9 = px(mao[9]);
        if (!p0 || !p9) continue;
        const d = dist(p0, p9);
        if (!melhor || d > melhor.d) melhor = { p0, p9, d };
      }
      if (melhor) {
        this.ultimaMao = t;
        const fator = pxmmRosto ?? pxPorMmMao(melhor.p0, melhor.p9);
        const alvo = posePulseira(melhor.p0, melhor.p9, fator, sel.pulseira.medida_mm * (sel.pulseira.ajuste?.escala ?? 1));
        this.slots.pulseira.atualizar(alvo, t);
        dbg?.push(melhor.p0, melhor.p9);
      }
    }

    let dica: string | null = null;
    if (sel.colar && t - this.ultimoOmbro > CALIBRACAO.colar.dicaAposMs) dica = DICA_OMBROS;
    else if (sel.pulseira && t - this.ultimaMao > CALIBRACAO.colar.dicaAposMs) dica = DICA_PULSO;
    if (dica !== this.dicaAtual) {
      this.dicaAtual = dica;
      this.cb.aoDica?.(dica);
    }
  }

  private desenhar(t: number): void {
    const ctx = this.ctx;
    ctx.drawImage(this.video, 0, 0, this.cena.width, this.cena.height);
    const sel = this.selecao;
    if (sel.colar) this.desenharPeca(this.slots.colar, sel.colar, false, t);
    if (sel.brinco) {
      this.desenharPeca(this.slots.brincoA, sel.brinco, false, t);
      this.desenharPeca(this.slots.brincoB, sel.brinco, true, t);
    }
    if (sel.pulseira) this.desenharPeca(this.slots.pulseira, sel.pulseira, false, t);

    if (this.dbg) {
      const d = this.dbg;
      d.clearRect(0, 0, d.canvas.width, d.canvas.height);
      d.fillStyle = "rgba(0,255,120,0.9)";
      for (const p of this.pontosDebug) {
        d.beginPath();
        d.arc(p.x, p.y, 5, 0, Math.PI * 2);
        d.fill();
      }
    }
  }

  private desenharPeca(slot: Slot, peca: Peca, espelhar: boolean, t: number): void {
    slot.passo(t);
    if (!slot.tem || slot.opacidade <= 0) return;
    const img = this.imagens.get(peca.id);
    if (!img) return;
    const { x, y, tamanho, angulo } = slot.pose;
    const proporcao = img.naturalWidth / img.naturalHeight;
    const brinco = peca.tipo === "brinco";
    const h = brinco ? tamanho : tamanho / proporcao;
    const w = brinco ? tamanho * proporcao : tamanho;
    const pxmm = tamanho / Math.max(peca.medida_mm, 1);
    const dx = (peca.ajuste?.dx ?? 0) * pxmm;
    const dy = (peca.ajuste?.dy ?? 0) * pxmm;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = slot.opacidade;
    ctx.translate(x, y);
    ctx.rotate(angulo);
    if (espelhar) ctx.scale(-1, 1);
    ctx.shadowColor = CALIBRACAO.sombra.cor;
    ctx.shadowBlur = Math.max(2, h * CALIBRACAO.sombra.desfoque);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(1, h * CALIBRACAO.sombra.deslocY);
    ctx.drawImage(img, -peca.ancora.x * w + dx, -peca.ancora.y * h + dy, w, h);
    ctx.restore();
  }
}
