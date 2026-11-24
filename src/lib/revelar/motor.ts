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
  poseColar3D,
  posePulseira,
  eixosAnel,
  aberturaAnel,
  alfaAnel,
  maoConfiavel,
  type Braco,
  type MaoPulso,
  pixels3D,
  baseCabeca,
  basePescoço,
  projetar,
  dist,
  ombrosValidos,
  type BaseCabeca,
  type Ombros,
  type Ponto,
  type PosePeca,
} from "./geometria";
import { Pendulo } from "./pendulo";
import { FACE_OVAL, avaliarOclusao, cascoConvexo, expandir } from "./oclusao";
import { padraoDebug, ajusteDaPeca, type AjustesDebug } from "./calibracao-debug";
import { carregarMao, carregarPose, carregarRosto } from "./rastreamento";
import type { FaceLandmarker, HandLandmarker, PoseLandmarker } from "./rastreamento";

export type Selecao = Partial<Record<TipoPeca, Peca>>;

type Lm = { x: number; y: number; z: number; visibility?: number };

export class Slot {
  readonly fx: OneEuroFilter;
  readonly fy: OneEuroFilter;
  readonly fs: OneEuroFilter;
  readonly fa: OneEuroFilter;
  constructor(minCutoff = CALIBRACAO.suavizacao.minCutoff) {
    const params = { ...CALIBRACAO.suavizacao, minCutoff };
    this.fx = new OneEuroFilter(params);
    this.fy = new OneEuroFilter(params);
    this.fs = new OneEuroFilter(params);
    this.fa = new OneEuroFilter(params);
  }
  pose: PosePeca = { x: 0, y: 0, tamanho: 0, angulo: 0, opacidade: 0 };
  ultimoVisto = -Infinity;
  ultimoAngulo: number | null = null;
  opacidadeAlvo = 0;
  opacidade = 0;
  tem = false;
  ultimoPasso = 0;
  tauMs = 70;

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
    const alvo =
      desde <= segurarMs
        ? this.opacidadeAlvo
        : this.opacidadeAlvo * Math.max(0, 1 - (desde - segurarMs) / fadeMs);
    const dt = this.ultimoPasso ? Math.max(0, t - this.ultimoPasso) : 33;
    this.ultimoPasso = t;
    this.opacidade += (alvo - this.opacidade) * (1 - Math.exp(-dt / this.tauMs));
    if (this.opacidade < 0.01 && desde > segurarMs) this.opacidade = 0;
  }
}

export interface CallbacksMotor {
  aoDica?: (dica: string | null) => void;
  aoFps?: (fps: number) => void;
  aoDesenhar?: () => void;
}

const DICA_OMBROS = "Afaste um pouco o celular para mostrar o colo";
const DICA_MAO = "Para ver os brincos, afaste a mão do rosto";
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
  private slots = {
    brincoA: Object.assign(new Slot(), { tauMs: CALIBRACAO.oclusao.suavizarMs }),
    brincoB: Object.assign(new Slot(), { tauMs: CALIBRACAO.oclusao.suavizarMs }),
    colar: new Slot(CALIBRACAO.colar.minCutoff),
    pulseira: new Slot(),
  };
  private ultimoOmbro = 0;
  private ultimaMao = 0;
  private dicaAtual: string | null = null;
  private quadros = 0;
  private inicioFps = 0;
  private pontosDebug: Ponto[] = [];
  private baseDebug: BaseCabeca | null = null;
  private ovalDebug: Ponto[] = [];
  private cascosMaos: Ponto[][] = [];
  private maoNoRosto = false;
  private larguraPulsoAnterior: number | null = null;
  private pulseiraDebug: MaoPulso | null = null;
  private aux: HTMLCanvasElement | null = null;
  private valores = padraoDebug();
  private debugAtivo = false;
  private pendulos = [new Pendulo(), new Pendulo()] as const;

  definirCalibracao(valores: AjustesDebug): void {
    this.valores = valores;
  }
  /** Só altera a camada de diagnóstico, nunca a cena usada nas capturas. */
  definirDebug(ativo: boolean): void {
    this.debugAtivo = ativo;
    if (!ativo && this.dbg) this.dbg.clearRect(0, 0, this.dbg.canvas.width, this.dbg.canvas.height);
  }
  private pecaAjustada(p: Peca): Peca {
    return { ...p, ajuste: ajusteDaPeca(p, this.valores) };
  }

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
    this.debugAtivo = Boolean(debug);
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

    const c = this.valores.calibracao;
    let cabeca: BaseCabeca | null = null;
    this.baseDebug = null;
    this.ovalDebug = [];
    this.maoNoRosto = false;
    if (!sel.pulseira) this.cascosMaos = [];
    if ((sel.brinco || sel.colar) && this.rosto) {
      const lm = this.rosto.detectForVideo(this.video, ts).faceLandmarks[0];
      if (lm) {
        const g = (i: number) => {
          const l = lm[i];
          return l ? pixels3D(l, w, h) : null;
        };
        const l234 = g(234),
          l454 = g(454),
          l33 = g(33),
          l263 = g(263),
          nariz = g(1),
          queixo = g(152);
        if (l234 && l454 && l33 && l263 && nariz && queixo) {
          cabeca = baseCabeca({ l234, l454, l33, l263, nariz, queixo });
          this.baseDebug = cabeca;
          if (cabeca && sel.brinco) {
            const p = this.pecaAjustada(sel.brinco);
            const [a, b] = posesBrincos(cabeca, p.medida_mm * (p.ajuste?.escala ?? 1), c);
            const oval: Ponto[] = [];
            for (const i of FACE_OVAL) {
              const l = lm[i];
              if (l) oval.push({ x: l.x * w, y: l.y * h });
            }
            this.ovalDebug = oval;
            // Cascos da mão vêm da última detecção (≤1 ciclo de atraso).
            const oc = avaliarOclusao([a, b], oval, this.cascosMaos, cabeca.largura, c);
            this.maoNoRosto = oc.maoNoRosto;
            a.opacidade = Math.min(a.opacidade, oc.opacidades[0]);
            b.opacidade = Math.min(b.opacidade, oc.opacidades[1]);
            a.angulo = this.pendulos[0].atualizar(a.x, t, cabeca.largura, c.brinco.pendulo);
            b.angulo = this.pendulos[1].atualizar(b.x, t, cabeca.largura, c.brinco.pendulo);
            this.slots.brincoA.atualizar(a, t);
            this.slots.brincoB.atualizar(b, t);
          }
          dbg?.push(l234, l454, l33, l263, nariz, queixo);
        }
      }
    }

    // Pose detectado uma vez por ciclo e compartilhado entre colar e pulseira.
    const poseLm: Lm[] | undefined =
      this.pose && (sel.colar || sel.pulseira)
        ? this.pose.detectForVideo(this.video, ts).landmarks[0]
        : undefined;
    if (sel.colar) {
      let ombros: Ombros | null = null;
      if (poseLm) {
        const lm = poseLm;
        const a = lm?.[11],
          b = lm?.[12];
        if (a && b)
          ombros = {
            a: { x: a.x * w, y: a.y * h, visibility: a.visibility ?? 0 },
            b: { x: b.x * w, y: b.y * h, visibility: b.visibility ?? 0 },
            larguraVideo: w,
            alturaVideo: h,
          };
      }
      const p = this.pecaAjustada(sel.colar);
      const alvo = poseColar3D(cabeca, ombros, p.medida_mm * (p.ajuste?.escala ?? 1), c);
      if (alvo) {
        this.slots.colar.atualizar(alvo, t);
        this.ultimoOmbro = t;
      }
      if (ombrosValidos(ombros, c)) dbg?.push(ombros.a, ombros.b);
    }

    if (sel.pulseira && this.mao) {
      const res = this.mao.detectForVideo(this.video, ts);
      let melhor: (MaoPulso & { d: number; score: number }) | null = null;
      this.cascosMaos = res.landmarks.map((mao) =>
        expandir(cascoConvexo(mao.map((l) => ({ x: l.x * w, y: l.y * h }))), c.oclusao.expandirMao),
      );
      res.landmarks.forEach((mao, i) => {
        const p0 = px(mao[0]), p5 = px(mao[5]), p9 = px(mao[9]), p17 = px(mao[17]);
        if (!p0 || !p5 || !p9 || !p17) return;
        const d = dist(p0, p9);
        const score = res.handedness[i]?.[0]?.score ?? 0;
        if (!melhor || d > melhor.d) melhor = { p0, p5, p9, p17, d, score };
      });
      this.pulseiraDebug = null;
      const m = melhor as (MaoPulso & { d: number; score: number }) | null;
      if (m) {
        this.ultimaMao = t;
        const largura = dist(m.p5, m.p17);
        const confiavel = maoConfiavel(m.score, largura, this.larguraPulsoAnterior, c);
        this.larguraPulsoAnterior = largura;
        // Duvidosa: não atualiza; o Slot segura 300 ms e depois apaga.
        if (confiavel) {
          const p = this.pecaAjustada(sel.pulseira);
          const alvo = posePulseira(m, this.bracoDaMao(poseLm, m, w, h), c);
          alvo.tamanho *= p.ajuste?.escala ?? 1;
          this.slots.pulseira.atualizar(alvo, t);
          this.pulseiraDebug = m;
          dbg?.push(m.p0, m.p5, m.p9, m.p17);
        }
      }
    }

    let dica: string | null = null;
    if (sel.brinco && this.maoNoRosto) dica = DICA_MAO;
    else if (sel.colar && t - this.ultimoOmbro > CALIBRACAO.colar.dicaAposMs) dica = DICA_OMBROS;
    else if (sel.pulseira && t - this.ultimaMao > CALIBRACAO.colar.dicaAposMs) dica = DICA_PULSO;
    if (dica !== this.dicaAtual) {
      this.dicaAtual = dica;
      this.cb.aoDica?.(dica);
    }
  }

  /** Cotovelo→pulso do lado cujo pulso do Pose está perto do P0 da mão. */
  private bracoDaMao(lm: Lm[] | undefined, m: MaoPulso, w: number, h: number): Braco | null {
    if (!lm) return null;
    const vis = this.valores.calibracao.pulseira.visibilidadeBraco;
    let melhor: Braco | null = null;
    let menor = 2 * dist(m.p0, m.p9);
    for (const [ic, ip] of [[13, 15], [14, 16]] as const) {
      const co = lm[ic], pu = lm[ip];
      if (!co || !pu || (co.visibility ?? 0) < vis || (pu.visibility ?? 0) < vis) continue;
      const pulso = { x: pu.x * w, y: pu.y * h };
      const d = dist(pulso, m.p0);
      if (d < menor) {
        menor = d;
        melhor = { cotovelo: { x: co.x * w, y: co.y * h }, pulso };
      }
    }
    return melhor;
  }

  private desenhar(t: number): void {
    const ctx = this.ctx;
    ctx.drawImage(this.video, 0, 0, this.cena.width, this.cena.height);
    const sel = this.selecao;
    if (sel.colar) this.desenharPeca(this.slots.colar, sel.colar, t);
    if (sel.brinco) {
      this.desenharPeca(this.slots.brincoA, sel.brinco, t);
      this.desenharPeca(this.slots.brincoB, sel.brinco, t);
    }
    if (sel.pulseira) this.desenharPulseira(this.slots.pulseira, sel.pulseira, t);

    if (this.dbg && this.debugAtivo) {
      const d = this.dbg;
      d.clearRect(0, 0, d.canvas.width, d.canvas.height);
      d.fillStyle = this.valores.calibracao.debug.pontos;
      for (const p of this.pontosDebug) {
        d.beginPath();
        d.arc(p.x, p.y, 5, 0, Math.PI * 2);
        d.fill();
      }
      const oval = this.ovalDebug;
      if (oval.length > 2) {
        d.strokeStyle = this.valores.calibracao.debug.oval;
        d.lineWidth = 1.5;
        d.beginPath();
        oval.forEach((p, i) => (i ? d.lineTo(p.x, p.y) : d.moveTo(p.x, p.y)));
        d.closePath();
        d.stroke();
      }
      const pd = this.pulseiraDebug;
      const sp = this.slots.pulseira;
      if (sel.pulseira && sp.tem) {
        const cp = this.valores.calibracao;
        const { x, y, tamanho: R, angulo } = sp.pose;
        const { n } = eixosAnel(angulo);
        d.strokeStyle = cp.debug.pulseira;
        d.fillStyle = cp.debug.pulseira;
        d.lineWidth = 1.5;
        d.beginPath();
        d.ellipse(x, y, R, R * aberturaAnel(cp), angulo, 0, Math.PI * 2);
        d.stroke();
        d.beginPath();
        d.moveTo(x - n.x * R * 1.15, y - n.y * R * 1.15);
        d.lineTo(x + n.x * R * 1.15, y + n.y * R * 1.15);
        d.stroke();
        d.beginPath();
        d.arc(x, y, 4, 0, Math.PI * 2);
        d.fill();
        if (pd)
          for (const p of [pd.p0, pd.p5, pd.p9, pd.p17]) {
            d.beginPath();
            d.arc(p.x, p.y, 6, 0, Math.PI * 2);
            d.stroke();
          }
      }
      const base = this.baseDebug;
      if (base) {
        const c = this.valores.calibracao;
        const origem = base.centro;
        for (const [p, cor] of [
          [projetar(base, { a: 0.4, b: 0, c: 0 }), c.debug.eixoX],
          [projetar(base, { a: 0, b: 0.4, c: 0 }), c.debug.eixoY],
          [projetar(base, { a: 0, b: 0, c: 0.4 }), c.debug.eixoZ],
        ] as const) {
          d.strokeStyle = cor;
          d.lineWidth = 3;
          d.beginPath();
          d.moveTo(origem.x, origem.y);
          d.lineTo(p.x, p.y);
          d.stroke();
        }
        d.strokeStyle = c.debug.pontos;
        for (const p of posesBrincos(base, 1, c)) {
          d.beginPath();
          d.arc(p.x, p.y, 9, 0, Math.PI * 2);
          d.stroke();
        }
        const pescoço = basePescoço(base, c);
        d.beginPath();
        d.moveTo(pescoço.x - 10, pescoço.y);
        d.lineTo(pescoço.x + 10, pescoço.y);
        d.moveTo(pescoço.x, pescoço.y - 10);
        d.lineTo(pescoço.x, pescoço.y + 10);
        d.stroke();
      }
    }
  }

  private desenharPeca(slot: Slot, original: Peca, t: number): void {
    const peca = this.pecaAjustada(original);
    slot.passo(t);
    if (!slot.tem || slot.opacidade <= 0) return;
    const img = this.imagens.get(peca.id);
    if (!img) return;
    const { x, y, tamanho, angulo } = slot.pose;
    const proporcao = img.naturalWidth / img.naturalHeight;
    const brinco = peca.tipo === "brinco";
    const h = brinco ? tamanho : tamanho / proporcao;
    const w = brinco ? tamanho * proporcao : tamanho;
    const pxmm = tamanho / Math.max(peca.medida_mm * (peca.ajuste?.escala ?? 1), 1);
    const dx = (peca.ajuste?.dx ?? 0) * pxmm;
    const dy = (peca.ajuste?.dy ?? 0) * pxmm;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = slot.opacidade;
    ctx.translate(x, y);
    ctx.rotate(angulo);
    ctx.shadowColor = CALIBRACAO.sombra.cor;
    ctx.shadowBlur = Math.max(2, h * CALIBRACAO.sombra.desfoque);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(1, h * CALIBRACAO.sombra.deslocY);
    ctx.drawImage(img, -peca.ancora.x * w + dx, -peca.ancora.y * h + dy, w, h);
    ctx.restore();
  }

  /**
   * Pulseira "vestida": o PNG (círculo visto de frente) vira um oval por transformação afim;
   * uma máscara em degradê ao longo do antebraço mostra o arco da frente (cotovelo)
   * e esconde o arco de trás (mão), que fica atrás do pulso.
   */
  private desenharPulseira(slot: Slot, peca: Peca, t: number): void {
    slot.passo(t);
    if (!slot.tem || slot.opacidade <= 0) return;
    const img = this.imagens.get(peca.id);
    if (!img) return;
    const c = this.valores.calibracao;
    const W = this.cena.width, H = this.cena.height;
    if (!this.aux) this.aux = document.createElement("canvas");
    if (this.aux.width !== W || this.aux.height !== H) {
      this.aux.width = W;
      this.aux.height = H;
    }
    const ax = this.aux.getContext("2d");
    if (!ax) return;
    const { x, y, tamanho: R, angulo } = slot.pose;
    const r = R * aberturaAnel(c);
    const { n, a } = eixosAnel(angulo);
    ax.setTransform(1, 0, 0, 1, 0, 0);
    ax.globalCompositeOperation = "source-over";
    ax.clearRect(0, 0, W, H);
    ax.setTransform(n.x * R, n.y * R, a.x * r, a.y * r, x, y);
    ax.drawImage(img, -1, -1, 2, 2);
    ax.setTransform(1, 0, 0, 1, 0, 0);
    // Máscara: v vai de −1 (lado da mão) a +1 (lado do cotovelo) em raios menores.
    const g = ax.createLinearGradient(x - a.x * r, y - a.y * r, x + a.x * r, y + a.y * r);
    const corte = Math.min(0.99, Math.max(0.001, c.pulseira.degradeCorte));
    for (const v of [-1, -corte, 0, corte, 1]) g.addColorStop((v + 1) / 2, `rgba(0,0,0,${alfaAnel(v, c)})`);
    ax.globalCompositeOperation = "destination-in";
    ax.fillStyle = g;
    ax.fillRect(0, 0, W, H);
    ax.globalCompositeOperation = "source-over";
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = slot.opacidade;
    ctx.shadowColor = CALIBRACAO.sombra.cor;
    ctx.shadowBlur = Math.max(2, r * CALIBRACAO.sombra.desfoque * 2);
    ctx.shadowOffsetY = Math.max(1, r * CALIBRACAO.sombra.deslocY);
    ctx.drawImage(this.aux, 0, 0);
    ctx.restore();
  }
}
