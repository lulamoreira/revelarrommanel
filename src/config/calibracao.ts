/** Constantes de posicionamento. Ajuste com ?debug=1 na URL. */
export const CALIBRACAO = {
  /** Distância real entre landmarks 234 e 454 do rosto (mm). */
  larguraRostoMm: 140,
  /** Distância real pulso(0) → base do dedo médio(9) (mm). */
  palmaMm: 95,
  /** Largura de ombro a ombro aproximada (mm), usada só sem rosto visível. */
  ombrosMm: 380,
  brinco: {
    /** Deslocamento do lóbulo para fora do rosto, em fração da largura do rosto. */
    paraFora: 0.045,
    /** Deslocamento para baixo, em fração da largura do rosto. */
    paraBaixo: 0.035,
    /** Yaw (0..0.5) a partir do qual o brinco do lado que some começa a apagar. */
    yawInicioSumir: 0.32,
    /** Yaw em que o brinco do lado que some fica invisível. */
    yawSumido: 0.2,
    /** Deslocamento extra do brinco visível quando a cabeça vira (fração da largura do rosto). */
    deslocVisivel: 0.05,
  },
  colar: {
    /** Fração do caminho entre o meio dos ombros e o queixo (152). */
    interpolacaoQueixo: 0.35,
    /** Limites da largura do colar em fração da distância entre ombros. */
    larguraMinOmbros: 0.3,
    larguraMaxOmbros: 0.75,
    /** Tempo sem ombros visíveis antes da dica (ms). */
    dicaAposMs: 1000,
  },
  pulseira: {
    /** Deslocamento do pulso em direção ao antebraço, em fração da distância 0→9. */
    paraAntebraco: 0.18,
  },
  rastreamento: {
    /** Mantém a última posição ao perder o rastreamento (ms). */
    segurarMs: 300,
    /** Duração do fade-out depois disso (ms). */
    fadeMs: 250,
    /** Frequência máxima de detecção. */
    detecaoFps: 18,
    /** Frequência de desenho. */
    desenhoFps: 30,
  },
  /** Filtro One Euro. */
  suavizacao: { minCutoff: 1.2, beta: 0.02, dCutoff: 1.0 },
  sombra: { cor: "rgba(40, 20, 50, 0.35)", desfoque: 0.08, deslocY: 0.06 },
} as const;
