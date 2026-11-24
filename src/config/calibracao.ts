/** Constantes de posicionamento. O painel ?debug=1 sobrepõe estes valores só no navegador. */
export const CALIBRACAO = {
  larguraRostoMm: 140,
  palmaMm: 95,
  ombrosMm: 380,
  brinco: {
    /** Afasta o furo para fora da lateral da cabeça (fração da largura 3D). */
    lobuloFora: -0.025,
    /** Desce o furo em relação ao centro 234↔454; positivo = para baixo. */
    lobuloBaixo: 0.13,
    /** Recua o furo em direção à orelha; negativo = atrás do rosto. */
    lobuloTras: -0.12,
    /** O lado afastado da câmera apaga suavemente entre estes ângulos de yaw. */
    yawSomeInicio: 25,
    yawSomeFim: 40,
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
  oclusao: {
    /** Lóbulo ≥ esta fração da largura do rosto para FORA do contorno: brinco visível. */
    foraRosto: 0.04,
    /** Lóbulo ≥ esta fração para DENTRO do contorno (ou da mão): brinco escondido. */
    dentroRosto: 0.02,
    /** Expansão do casco convexo da mão. */
    expandirMao: 0.08,
    /** Mão cobrindo mais que esta fração do rosto esconde os dois brincos. */
    limiteMaoRosto: 0.2,
    /** Suavização temporal da opacidade dos brincos. */
    suavizarMs: 120,
  },
  pulseira: {
    /** Centro do anel: avança do pulso (P0) em direção ao cotovelo, em frações de dist(P0,P9). */
    paraAntebraco: 0.18,
    /** Largura do pulso na tela = dist(P5,P17) × este fator. */
    larguraPulsoFator: 0.8,
    /** Raio maior = largura do pulso / 2 × folga (a pulseira fica um pouco solta). */
    folga: 1.06,
    /** Raio menor (ao longo do antebraço) = raio maior × abertura. Fixo: o z da mão não é confiável. */
    abertura: 0.32,
    /** Opacidade do arco de trás (lado da mão), escondido atrás do pulso. */
    opacidadeTras: 0,
    /** Troca qual arco fica na frente (lado da mão em vez do cotovelo). */
    inverterFrente: false,
    /** Degradê na linha de corte, em frações do raio. */
    degradeCorte: 0.06,
    /** Abaixo deste score de mão, a pose é considerada duvidosa. */
    scoreMin: 0.6,
    /** Variação máxima de dist(P5,P17) entre detecções seguidas. */
    variacaoMax: 0.35,
    /** Visibilidade mínima de cotovelo e pulso do Pose para usar o eixo do braço. */
    visibilidadeBraco: 0.6,
  },
  rastreamento: { segurarMs: 300, fadeMs: 250, detecaoFps: 18, desenhoFps: 30 },
  suavizacao: { minCutoff: 1.2, beta: 0.02, dCutoff: 1.0 },
  sombra: { cor: "rgba(40, 20, 50, 0.35)", desfoque: 0.08, deslocY: 0.06 },
  debug: { eixoX: "#ff4545", eixoY: "#26d978", eixoZ: "#448aff", pontos: "#26d978", oval: "#22d3ee", pulseira: "#ffd166" },
};
export type Calibracao = typeof CALIBRACAO;
export const CAMPOS_CALIBRACAO = [
  { grupo: "brinco", chave: "lobuloFora", min: -0.1, max: 0.2, passo: 0.005 },
  { grupo: "brinco", chave: "lobuloBaixo", min: -0.1, max: 0.3, passo: 0.005 },
  { grupo: "brinco", chave: "lobuloTras", min: -0.4, max: 0.2, passo: 0.005 },
  { grupo: "brinco", chave: "yawSomeInicio", min: 0, max: 45, passo: 1 },
  { grupo: "brinco", chave: "yawSomeFim", min: 1, max: 60, passo: 1 },
  { grupo: "colar", chave: "colarBaixo", min: 0.3, max: 1.5, passo: 0.005 },
  { grupo: "colar", chave: "colarTras", min: -0.6, max: 0.2, passo: 0.005 },
  { grupo: "pulseira", chave: "larguraPulsoFator", min: 0.5, max: 1.2, passo: 0.01 },
  { grupo: "pulseira", chave: "folga", min: 1, max: 1.2, passo: 0.01 },
  { grupo: "pulseira", chave: "abertura", min: 0.15, max: 0.5, passo: 0.01 },
  { grupo: "pulseira", chave: "opacidadeTras", min: 0, max: 0.6, passo: 0.01 },
  { grupo: "pulseira", chave: "paraAntebraco", min: 0, max: 0.5, passo: 0.01 },
] as const;
export const CAMPOS_AJUSTE = [
  { chave: "escala", min: 0.3, max: 2, passo: 0.01, padrao: 1 },
  { chave: "dx", min: -30, max: 30, passo: 0.5, padrao: 0 },
  { chave: "dy", min: -30, max: 30, passo: 0.5, padrao: 0 },
] as const;
