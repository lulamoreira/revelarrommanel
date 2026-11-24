/** Cores usadas só no desenho em canvas (fora do CSS). Mantenha em sintonia com src/styles.css. */
export const VISUAL_CANVAS = {
  moldura: "#FFFFFF",
  texto: "#3D2C52",
  primaria: "#6B4E8C",
  fonteManuscrita: "Allura",
  fonteTexto: "Inter",
  fraseMoldura: "Seu estilo é Revelar!",
} as const;

/**
 * Layout da base branca da polaroid. Todos os valores são frações da altura
 * dessa base: 0 é o topo (logo abaixo da foto) e 1 é a borda inferior.
 */
export const POLAROID = {
  /** Centro vertical da frase manuscrita. */
  frasePosicao: 0.36,
  /** Tamanho da fonte da frase, em fração da altura da base. */
  fraseTamanho: 0.4,
  /** Centro vertical da marca. */
  logoPosicao: 0.76,
  /** Altura da marca, em fração da altura da base. */
  logoAltura: 0.26,
  /** A marca nunca passa dessa fração da largura da moldura. */
  logoLarguraMax: 0.86,
} as const;
