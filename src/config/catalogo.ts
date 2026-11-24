/**
 * Catálogo de peças do provador. Edite livremente.
 * - imagem: PNG transparente, vista frontal, em /public/pecas.
 * - medida_mm: brinco = altura total; colar = largura visível ponta a ponta; pulseira = largura visível.
 * - ancora: ponto (fração 0–1 da imagem) que encosta no corpo.
 *   brinco = furo; colar = centro do topo da curva; pulseira = centro.
 * - ajuste: calibração fina opcional (dx/dy em mm, escala multiplicadora).
 * Brinco: cadastre só UM — o app espelha para a outra orelha.
 */
export type TipoPeca = "brinco" | "colar" | "pulseira";

export interface Peca {
  id: string;
  nome: string;
  tipo: TipoPeca;
  imagem: string;
  medida_mm: number;
  ancora: { x: number; y: number };
  ajuste?: { dx?: number; dy?: number; escala?: number };
}

export const CATALOGO: readonly Peca[] = [
  { id: "brinco-argola", nome: "Argola Lua", tipo: "brinco", imagem: "/pecas/brinco-argola.png", medida_mm: 32, ancora: { x: 0.5, y: 0.03 } },
  { id: "brinco-gota", nome: "Gota Dourada", tipo: "brinco", imagem: "/pecas/brinco-gota.png", medida_mm: 38, ancora: { x: 0.5, y: 0.04 } },
  { id: "colar-coracao", nome: "Colar Coração", tipo: "colar", imagem: "/pecas/colar-coracao.png", medida_mm: 130, ancora: { x: 0.5, y: 0.1 } },
  { id: "colar-perolas", nome: "Colar Esferas", tipo: "colar", imagem: "/pecas/colar-perolas.png", medida_mm: 140, ancora: { x: 0.5, y: 0.1 } },
  { id: "pulseira-bracelete", nome: "Bracelete Liso", tipo: "pulseira", imagem: "/pecas/pulseira-bracelete.png", medida_mm: 68, ancora: { x: 0.5, y: 0.5 } },
  { id: "pulseira-elos", nome: "Pulseira Elos", tipo: "pulseira", imagem: "/pecas/pulseira-elos.png", medida_mm: 70, ancora: { x: 0.5, y: 0.5 } },
];

export const ROTULO_TIPO: Record<TipoPeca, string> = {
  brinco: "Brincos",
  colar: "Colares",
  pulseira: "Pulseiras",
};
