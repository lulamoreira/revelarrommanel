/** Cliente da versão realista: monta o envio e interpreta erros. Nunca descarta a foto original. */
import { MENSAGENS, TAMANHO_MAX_FOTO } from "@/config/custos";
import type { Peca } from "@/config/catalogo";
import { blobParaBase64, carregarImagem, polaroidDeImagem } from "./captura";

export type ResultadoRealista = { ok: true; polaroid: Blob } | { ok: false; mensagem: string };

export async function gerarVersaoRealista(base: Blob, pecas: Peca[], loja: string | null): Promise<ResultadoRealista> {
  if (base.size > TAMANHO_MAX_FOTO) return { ok: false, mensagem: "A foto ficou grande demais. Tire outra, por favor." };
  try {
    const referencias = await Promise.all(
      pecas.map(async (p) => {
        const r = await fetch(p.imagem);
        if (!r.ok) throw new Error(`Referência ${p.id}`);
        return { tipo: p.tipo, imagem: await blobParaBase64(await r.blob()) };
      }),
    );
    const resp = await fetch("/api/public/versao-realista", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto: await blobParaBase64(base), pecas: referencias, loja }),
    });
    const corpo = (await resp.json().catch(() => ({}))) as { imagem?: string; erro?: string };
    if (!resp.ok || !corpo.imagem) {
      if (resp.status === 402 || resp.status === 403) return { ok: false, mensagem: MENSAGENS.indisponivel };
      if (resp.status === 429) return { ok: false, mensagem: corpo.erro ?? MENSAGENS.ocupado };
      return { ok: false, mensagem: corpo.erro ?? MENSAGENS.generico };
    }
    const img = await carregarImagem(corpo.imagem);
    return { ok: true, polaroid: await polaroidDeImagem(img, img.naturalWidth, img.naturalHeight) };
  } catch (e) {
    console.error("Versão realista falhou", e);
    return { ok: false, mensagem: MENSAGENS.generico };
  }
}
