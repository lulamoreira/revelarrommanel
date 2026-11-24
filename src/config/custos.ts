/** Controle de custo da versão realista (validado no servidor). */
export const LIMITE_POR_APARELHO_24H = 3;
export const LIMITE_POR_IP_24H = 40;
export const TEMPO_ESTIMADO_REALISTA_S = 25;
export const CONCLUSAO_REALISTA_MS = 350;
export const LIMITE_DIARIO_GLOBAL = 300;
/** Modelo de edição de imagem. Troque se ele alterar o rosto ou as joias nos testes. */
export const MODELO_VERSAO_REALISTA = "openai/gpt-image-2.5-sunburst";
/** Tamanho máximo da foto enviada (bytes). */
export const TAMANHO_MAX_FOTO = 2 * 1024 * 1024;
/** Tamanho máximo de cada imagem de referência (bytes). */
export const TAMANHO_MAX_REFERENCIA = 1024 * 1024;

export const MENSAGENS = {
  semJoias: "Escolha uma joia no provador para gerar a versão realista.",
  ocupado: "Muitas pessoas usando agora, tente em instantes",
  limitePessoal: "Você já gerou suas 3 versões realistas hoje",
  indisponivel: "Versão realista indisponível no momento",
  generico: "Não foi possível gerar a versão realista agora. Sua foto original continua salva.",
} as const;
