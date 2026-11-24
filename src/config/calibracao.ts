/** Constantes de posicionamento. O painel ?debug=1 sobrepõe estes valores só no navegador. */
export const CALIBRACAO = {
  larguraRostoMm: 140,
  palmaMm: 95,
  ombrosMm: 380,
  brinco: {
    /** Afasta o furo para fora da lateral da cabeça (fração da largura 3D). */
    lobuloFora: 0.02,
    /** Desce o furo em relação ao centro 234↔454; positivo = para baixo. */
    lobuloBaixo: 0.3,
    /** Recua o furo em direção à orelha; negativo = atrás do rosto. */
    lobuloTras: -0.12,
    /** O lado afastado da câmera apaga suavemente entre estes ângulos de yaw. */
    yawSomeInicio: 15,
    yawSomeFim: 30,
    pendulo: { rigidez: 38, amortecimento: 12, resposta: 0.012, limiteGraus: 12 },
  },
  colar: {
    /** Distância abaixo do centro da cabeça em larguras 3D do rosto. */
    colarBaixo: 0.95,
    /** Recuo do pescoço, atrás do queixo. */
    colarTras: -0.3,
    larguraMinRosto: 0.6,
    larguraMaxRosto: 1.4,
    visibilidadeOmbros: 0.7,
    misturaOmbros: 0.3,
    /** Sobe o meio dos ombros para estimar a base do pescoço. */
    subirOmbros: 0.18,
    rotacaoMaxGraus: 15,
    larguraMinOmbros: 0.3,
    larguraMaxOmbros: 0.75,
    dicaAposMs: 1000,
    minCutoff: 0.65,
  },
  pulseira: { paraAntebraco: 0.18 },
  rastreamento: { segurarMs: 300, fadeMs: 250, detecaoFps: 18, desenhoFps: 30 },
  suavizacao: { minCutoff: 1.2, beta: 0.02, dCutoff: 1.0 },
  sombra: { cor: "rgba(40, 20, 50, 0.35)", desfoque: 0.08, deslocY: 0.06 },
  debug: { eixoX: "#ff4545", eixoY: "#26d978", eixoZ: "#448aff", pontos: "#26d978" },
};
export type Calibracao = typeof CALIBRACAO;
export const CAMPOS_CALIBRACAO = [
  { grupo: "brinco", chave: "lobuloFora", min: -0.1, max: 0.2, passo: 0.005 },
  { grupo: "brinco", chave: "lobuloBaixo", min: 0, max: 0.6, passo: 0.005 },
  { grupo: "brinco", chave: "lobuloTras", min: -0.4, max: 0.2, passo: 0.005 },
  { grupo: "brinco", chave: "yawSomeInicio", min: 0, max: 45, passo: 1 },
  { grupo: "brinco", chave: "yawSomeFim", min: 1, max: 60, passo: 1 },
  { grupo: "colar", chave: "colarBaixo", min: 0.3, max: 1.5, passo: 0.005 },
  { grupo: "colar", chave: "colarTras", min: -0.6, max: 0.2, passo: 0.005 },
] as const;
export const CAMPOS_AJUSTE = [
  { chave: "escala", min: 0.3, max: 2, passo: 0.01, padrao: 1 },
  { chave: "dx", min: -30, max: 30, passo: 0.5, padrao: 0 },
  { chave: "dy", min: -30, max: 30, passo: 0.5, padrao: 0 },
] as const;
