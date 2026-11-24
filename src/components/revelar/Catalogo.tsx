import { CATALOGO, ROTULO_TIPO, type Peca, type TipoPeca } from "@/config/catalogo";
import type { Selecao } from "@/lib/revelar/motor";
import { cn } from "@/lib/utils";

const TIPOS: readonly TipoPeca[] = ["brinco", "colar", "pulseira"];

export interface CatalogoProps {
  aba: TipoPeca;
  aoAba: (t: TipoPeca) => void;
  selecao: Selecao;
  aoAlternar: (p: Peca) => void;
}

export function Catalogo({ aba, aoAba, selecao, aoAlternar }: CatalogoProps) {
  return (
    <div className="rounded-t-3xl bg-overlay px-3 pb-2 pt-3 backdrop-blur-md">
      <div role="tablist" aria-label="Tipo de joia" className="flex justify-center gap-2">
        {TIPOS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={aba === t}
            onClick={() => aoAba(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              aba === t ? "bg-card text-primary" : "text-overlay-foreground/85",
            )}
          >
            {ROTULO_TIPO[t]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1" role="tabpanel">
        {CATALOGO.filter((p) => p.tipo === aba).map((p) => {
          const ativa = selecao[p.tipo]?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => aoAlternar(p)}
              aria-pressed={ativa}
              aria-label={`${p.nome}${ativa ? " (remover)" : ""}`}
              className={cn(
                "flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl bg-card p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ativa ? "ring-2 ring-primary" : "opacity-90",
              )}
            >
              <img src={p.imagem} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
              <span className="line-clamp-1 text-[11px] font-medium text-card-foreground">{p.nome}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
