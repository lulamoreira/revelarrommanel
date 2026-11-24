import { useRef, useState } from "react";
import { Download, RotateCcw, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { nomeArquivo } from "@/lib/revelar/ambiente";
import { baixar, compartilhar } from "@/lib/revelar/compartilhar";
import { geracoesRestantes, registrarGeracao } from "@/lib/revelar/sessao";
import { gerarVersaoRealista } from "@/lib/revelar/versao-realista";
import { useObjectUrl } from "@/hooks/use-object-url";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { Consentimento, Gerando } from "./PainelRealista";
import type { Captura } from "./Provador";

export interface ResultadoProps {
  captura: Captura;
  loja: string | null;
  aoTirarOutra: () => void;
}

type Etapa = "inicio" | "consentimento" | "gerando";

export function Resultado({ captura, loja, aoTirarOutra }: ResultadoProps) {
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [realista, setRealista] = useState<Blob | null>(null);
  const [verRealista, setVerRealista] = useState(false);
  const [restantes, setRestantes] = useState(() => (typeof window === "undefined" ? 3 : geracoesRestantes()));
  const pedido = useRef(0);

  const original = captura.tipo === "foto" ? captura.polaroid : captura.blob;
  const atual = verRealista && realista ? realista : original;
  const url = useObjectUrl(atual);
  const ext = captura.tipo === "foto" ? "jpg" : captura.mime.includes("mp4") ? "mp4" : "webm";

  const gerar = async () => {
    if (captura.tipo !== "foto") return;
    const id = ++pedido.current;
    setEtapa("gerando");
    const r = await gerarVersaoRealista(captura.base, captura.pecas, loja);
    if (id !== pedido.current) return; // a cliente seguiu sem esperar
    setEtapa("inicio");
    if (r.ok) {
      registrarGeracao();
      setRestantes(geracoesRestantes());
      setRealista(r.polaroid);
      setVerRealista(true);
    } else {
      toast.error(r.mensagem);
    }
  };

  const continuarSem = () => {
    pedido.current++;
    setEtapa("inicio");
  };

  return (
    <main className="min-h-dvh bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Logo />
      <div className="mx-auto mt-5 w-full max-w-sm">
        {realista && (
          <div role="radiogroup" aria-label="Versão" className="mb-3 grid grid-cols-2 rounded-full bg-card p-1 shadow-suave">
            {(["Original", "Realista"] as const).map((r) => {
              const ativo = (r === "Realista") === verRealista;
              return (
                <button
                  key={r}
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setVerRealista(r === "Realista")}
                  className={cn("rounded-full py-2 text-sm font-medium transition-colors", ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {r}
                </button>
              );
            })}
          </div>
        )}
        <div className="-rotate-1 overflow-hidden rounded-md shadow-suave">
          {url &&
            (captura.tipo === "video" ? (
              <video src={url} className="block w-full" autoPlay loop muted playsInline controls />
            ) : (
              <img src={url} alt="Sua foto com as joias" className="block w-full" />
            ))}
        </div>
        {captura.pecas.length > 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Peças: <span className="font-medium text-foreground">{captura.pecas.map((p) => p.nome).join(" · ")}</span>
          </p>
        )}

        <div className="mt-5 space-y-3">
          {captura.tipo === "foto" && etapa === "inicio" && !realista && (
            <Button size="lg" className="h-14 w-full rounded-full text-base shadow-suave" disabled={restantes <= 0} onClick={() => setEtapa("consentimento")}>
              <Sparkles className="h-5 w-5" aria-hidden /> Gerar versão realista
            </Button>
          )}
          {captura.tipo === "foto" && restantes <= 0 && !realista && (
            <p className="text-center text-xs text-muted-foreground">Você já gerou suas 3 versões realistas hoje</p>
          )}
          {etapa === "consentimento" && <Consentimento aoGerar={() => void gerar()} aoCancelar={() => setEtapa("inicio")} />}
          {etapa === "gerando" && <Gerando aoContinuarSem={continuarSem} />}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="rounded-full" onClick={() => baixar(atual, nomeArquivo(new Date(), ext))}>
              <Download className="h-4 w-4" aria-hidden /> Baixar
            </Button>
            <Button variant="secondary" className="rounded-full" onClick={() => void compartilhar(atual, nomeArquivo(new Date(), ext))}>
              <Share2 className="h-4 w-4" aria-hidden /> Compartilhar
            </Button>
          </div>
          <Button variant="outline" className="w-full rounded-full" onClick={aoTirarOutra}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Tirar outra
          </Button>
        </div>
      </div>
    </main>
  );
}
