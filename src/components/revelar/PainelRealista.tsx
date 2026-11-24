import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface ConsentimentoProps {
  aoGerar: () => void;
  aoCancelar: () => void;
}

export function Consentimento({ aoGerar, aoCancelar }: ConsentimentoProps) {
  const [aceito, setAceito] = useState(false);
  return (
    <div className="rounded-3xl bg-card p-5 shadow-suave">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden /> Versão realista
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Sua foto é enviada para uma inteligência artificial deixar as joias com aparência real.
      </p>
      <label className="mt-4 flex items-start gap-3 text-sm text-card-foreground">
        <Checkbox checked={aceito} onCheckedChange={(v) => setAceito(v === true)} className="mt-0.5" />
        <span>Concordo em enviar minha foto para gerar a versão realista. A imagem não é armazenada.</span>
      </label>
      <div className="mt-5 flex gap-3">
        <Button variant="outline" className="flex-1 rounded-full" onClick={aoCancelar}>
          Voltar
        </Button>
        <Button className="flex-1 rounded-full" disabled={!aceito} onClick={aoGerar}>
          Gerar
        </Button>
      </div>
    </div>
  );
}

export interface GerandoProps {
  aoContinuarSem: () => void;
}

/** Espera da geração. Após 60 s oferece seguir sem a versão realista (a geração não é cortada). */
export function Gerando({ aoContinuarSem }: GerandoProps) {
  const [demorou, setDemorou] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDemorou(true), 60_000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="rounded-3xl bg-card p-6 text-center shadow-suave" role="status" aria-live="polite">
      <Sparkles className="animar-brilho mx-auto h-10 w-10 text-primary" aria-hidden />
      <p className="mt-3 text-sm font-medium text-card-foreground">Gerando sua versão realista… (até 30 s)</p>
      {demorou && (
        <Button variant="outline" className="mt-4 rounded-full" onClick={aoContinuarSem}>
          Continuar sem a versão realista
        </Button>
      )}
    </div>
  );
}
