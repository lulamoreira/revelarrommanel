/**
 * Versão realista por IA. Rota pública (QR na loja), então protege custo no servidor:
 * origem do próprio app, tamanho máximo, 3 gerações por aparelho (hash), 40 por IP em 24 h e teto diário global.
 * A imagem nunca é salva nem registrada.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MENSAGENS, MODELO_VERSAO_REALISTA, TAMANHO_MAX_FOTO } from "@/config/custos";
import { EntradaRealista, mensagemEntrada } from "@/lib/revelar/entrada-realista";
import { aparelhoDeTeste, avaliarLimites, inicioDoDiaSaoPaulo } from "@/lib/revelar/limites";

const PROMPT =
  "Esta foto já mostra a pessoa usando as joias nas posições corretas. Torne o resultado fotorrealista: integre iluminação, reflexos metálicos e sombras de contato das joias na pele; quando houver cabelo sobre a orelha, faça o cabelo passar naturalmente na frente do brinco. NÃO altere o rosto, a identidade, a expressão, o tom de pele, as roupas, o fundo ou o enquadramento. NÃO altere o desenho, a cor, o tamanho ou a posição das joias — elas devem permanecer idênticas às imagens de referência anexadas. Não adicione nenhuma outra joia, texto ou elemento. Exceção: se algum brinco estiver desenhado sobre o rosto, sobre a mão ou em um lugar onde a orelha não está visível, remova esse brinco e reconstrua naturalmente a pele/fundo naquele ponto. Não remova nem altere nenhuma outra joia.";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function hostsPermitidos(request: Request): Set<string> {
  const s = new Set<string>([new URL(request.url).host]);
  const fwd = request.headers.get("x-forwarded-host");
  if (fwd) for (const h of fwd.split(",")) s.add(h.trim());
  const host = request.headers.get("host");
  if (host) s.add(host);
  return s;
}

function origemValida(request: Request): boolean {
  const bruto = request.headers.get("origin") ?? request.headers.get("referer");
  if (!bruto) return false;
  try {
    return hostsPermitidos(request).has(new URL(bruto).host);
  } catch {
    return false;
  }
}

function ipDoCliente(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "desconhecido"
  );
}

async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function base64ParaBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const Route = createFileRoute("/api/public/versao-realista")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!origemValida(request)) return json({ erro: "Origem não permitida" }, 403);
        const tamanhoDeclarado = Number(request.headers.get("content-length") ?? "0");
        if (tamanhoDeclarado > TAMANHO_MAX_FOTO * 2.2)
          return json({ erro: "Imagem acima de 2 MB" }, 400);

        let bruto: unknown;
        try {
          bruto = await request.json();
        } catch {
          return json({ erro: "Dados inválidos" }, 400);
        }
        const parsed = EntradaRealista.safeParse(bruto);
        if (!parsed.success) {
          console.warn(
            "Validação realista",
            parsed.error.issues.map((i) => i.path),
          );
          return json({ erro: mensagemEntrada(parsed.error.issues) }, 400);
        }
        const entrada = parsed.data;
        let foto: Uint8Array<ArrayBuffer>;
        try {
          foto = base64ParaBytes(entrada.foto);
        } catch {
          return json({ erro: "Dados inválidos" }, 400);
        }
        if (foto.byteLength > TAMANHO_MAX_FOTO) return json({ erro: "Imagem acima de 2 MB" }, 400);

        const apiKey = process.env["LOVABLE_API_KEY"];
        const sal = process.env["IP_HASH_SALT"];
        if (!apiKey || !sal) return json({ erro: MENSAGENS.indisponivel }, 503);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ipHash = await sha256Hex(`${sal}:${ipDoCliente(request)}`);
        const aparelhoHash = await sha256Hex(`${sal}:aparelho:${entrada.aparelho}`);
        // Aparelhos de teste (secret APARELHOS_TESTE): sem limite por aparelho/IP, mas com teto global.
        const teste = aparelhoDeTeste(entrada.aparelho, process.env["APARELHOS_TESTE"]);
        const agora = new Date();
        const ha24h = new Date(agora.getTime() - 24 * 3600 * 1000).toISOString();
        const ha3min = new Date(agora.getTime() - 3 * 60 * 1000).toISOString();

        // Conta sem trazer linhas. Pedidos em andamento (últimos 3 min) contam para evitar rajadas paralelas.
        const [aparelho, ip, global] = await Promise.all([
          supabaseAdmin
            .from("uso_versao_realista")
            .select("id", { count: "exact", head: true })
            .eq("aparelho_hash", aparelhoHash)
            .gte("criado_em", ha24h)
            .or(`sucesso.eq.true,criado_em.gte.${ha3min}`),
          supabaseAdmin
            .from("uso_versao_realista")
            .select("id", { count: "exact", head: true })
            .eq("ip_hash", ipHash)
            .gte("criado_em", ha24h)
            .or(`sucesso.eq.true,criado_em.gte.${ha3min}`),
          supabaseAdmin
            .from("uso_versao_realista")
            .select("id", { count: "exact", head: true })
            .eq("teste", false)
            .gte("criado_em", inicioDoDiaSaoPaulo(agora))
            .or(`sucesso.eq.true,criado_em.gte.${ha3min}`),
        ]);
        if (aparelho.error || ip.error || global.error) {
          console.error(
            "Falha ao verificar limites",
            aparelho.error?.message ?? ip.error?.message ?? global.error?.message,
          );
          return json({ erro: MENSAGENS.indisponivel }, 503);
        }
        const limite = teste
          ? avaliarLimites(0, 0, global.count ?? 0)
          : avaliarLimites(aparelho.count ?? 0, ip.count ?? 0, global.count ?? 0);
        if (!limite.ok) return json({ erro: limite.mensagem }, 429);

        const { data: registro, error: erroRegistro } = await supabaseAdmin
          .from("uso_versao_realista")
          .insert({
            ip_hash: ipHash,
            aparelho_hash: aparelhoHash,
            loja: entrada.loja ?? null,
            sucesso: false,
            teste,
          })
          .select("id")
          .single();
        if (erroRegistro || !registro) {
          console.error("Falha ao registrar uso", erroRegistro?.message);
          return json({ erro: MENSAGENS.indisponivel }, 503);
        }

        const tipos = entrada.pecas.map((p, i) => `imagem ${i + 2}: ${p.tipo}`).join("; ");
        const form = new FormData();
        form.set("model", MODELO_VERSAO_REALISTA);
        form.set(
          "prompt",
          `${PROMPT}\n\nA imagem 1 é a foto a ser editada. As demais são as referências originais das joias (${tipos}).`,
        );
        form.append("image[]", new Blob([foto], { type: "image/jpeg" }), "foto.jpg");
        entrada.pecas.forEach((p, i) => {
          form.append(
            "image[]",
            new Blob([base64ParaBytes(p.imagem)], { type: "image/png" }),
            `peca-${i + 1}.png`,
          );
        });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });

        if (!upstream.ok) {
          // Só status e tamanho: nunca o conteúdo da imagem.
          console.error("Gateway de imagem respondeu", upstream.status);
          if (upstream.status === 429) return json({ erro: MENSAGENS.ocupado }, 429);
          if (upstream.status === 402 || upstream.status === 403)
            return json({ erro: MENSAGENS.indisponivel }, upstream.status);
          return json({ erro: MENSAGENS.generico }, 502);
        }
        const corpo = (await upstream.json()) as { data?: { b64_json?: string }[] };
        const b64 = corpo.data?.[0]?.b64_json;
        if (!b64) return json({ erro: MENSAGENS.generico }, 502);

        await supabaseAdmin
          .from("uso_versao_realista")
          .update({ sucesso: true })
          .eq("id", registro.id);
        return json(teste ? { imagem: `data:image/png;base64,${b64}`, teste: true } : { imagem: `data:image/png;base64,${b64}` });
      },
    },
  },
});
