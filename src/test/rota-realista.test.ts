import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  counts: [0, 0, 0],
  queries: [] as { eq?: [string, string]; or?: string; select?: unknown }[],
  inserts: [] as unknown[],
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: (_col: string, options: unknown) => {
        const index = mocks.queries.length;
        const q: { eq?: [string, string]; or?: string; select?: unknown } = { select: options };
        mocks.queries.push(q);
        const chain = {
          eq: (k: string, v: string) => {
            q.eq = [k, v];
            return chain;
          },
          gte: () => chain,
          or: (v: string) => {
            q.or = v;
            return Promise.resolve({ count: mocks.counts[index], error: null });
          },
        };
        return chain;
      },
      insert: (row: unknown) => {
        mocks.inserts.push(row);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: "registro" }, error: null }),
          }),
        };
      },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));
import { Route } from "@/routes/api/public/versao-realista";
// Invoke the actual handler with a Request; mock only database and paid gateway.
const handlers = Route.options.server?.handlers;
function handler() {
  if (!handlers || typeof handlers === "function" || typeof handlers.POST !== "function")
    throw new Error("POST ausente");
  return handlers.POST;
}
const body = {
  foto: "YQ==",
  pecas: [{ tipo: "brinco", imagem: "YQ==" }],
  aparelho: "e924c538-2a99-4a51-baea-918d2c3caa33",
};
async function chamar(v: unknown = body): Promise<Response> {
  const r = await handler()({
    request: new Request("http://localhost:8080/api/public/versao-realista", {
      method: "POST",
      headers: { origin: "http://localhost:8080", "Content-Type": "application/json" },
      body: JSON.stringify(v),
    }),
  } as Parameters<ReturnType<typeof handler>>[0]);
  if (!(r instanceof Response)) throw new Error("Resposta HTTP ausente");
  return r;
}
beforeEach(() => {
  mocks.counts = [0, 0, 0];
  mocks.queries = [];
  mocks.inserts = [];
  vi.stubEnv("LOVABLE_API_KEY", "test-key");
  vi.stubEnv("IP_HASH_SALT", "test-salt");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ data: [{ b64_json: "YQ==" }] })),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("rota realista e contagem", () => {
  it.each([
    [3, 3, 3, "Você já gerou suas 3 versões realistas hoje"],
    [0, 40, 40, "Muitas pessoas usando agora, tente em instantes"],
    [0, 0, 300, "Muitas pessoas usando agora, tente em instantes"],
  ])("bloqueia aparelho/IP/global antes do gateway", async (a, i, g, m) => {
    mocks.counts = [Number(a), Number(i), Number(g)];
    const r = await chamar();
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: m });
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.inserts).toHaveLength(0);
  });
  it("permite outra cliente na mesma rede e guarda só hashes", async () => {
    mocks.counts = [0, 4, 4];
    const r = await chamar();
    expect(r.status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
    for (const q of mocks.queries) {
      expect(q.select).toEqual({ count: "exact", head: true });
      expect(q.or).toMatch(/^sucesso.eq.true,criado_em.gte\./);
    }
    expect(mocks.queries[0]?.eq?.[0]).toBe("aparelho_hash");
    expect(mocks.queries[1]?.eq?.[0]).toBe("ip_hash");
    expect(mocks.inserts[0]).toEqual(
      expect.objectContaining({
        aparelho_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        ip_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(JSON.stringify(mocks.inserts)).not.toContain(body.aparelho);
  });
  it("safeParse devolve mensagem sem peças antes de acessar o banco", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await chamar({ ...body, pecas: [] });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: "Escolha ao menos uma joia" });
    expect(mocks.queries).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Validação realista", [["pecas"]]);
    log.mockRestore();
  });
});
