import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEsperaRealista } from "@/hooks/use-espera-realista";
import { mensagemEspera } from "@/lib/revelar/espera-realista";
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
        <Checkbox
          checked={aceito}
          onCheckedChange={(v) => setAceito(v === true)}
          className="mt-0.5"
        />
        <span>
          Concordo em enviar minha foto para gerar a versão realista. A imagem não é armazenada.
        </span>
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
  inicio: number;
  concluido: boolean;
}

/** Progresso estimado, não informado pela IA; 100% somente após a resposta. */
export function Gerando({ aoContinuarSem, inicio, concluido }: GerandoProps) {
  const { segundos, progresso } = useEsperaRealista(inicio, concluido);
  const mensagem = mensagemEspera(segundos);
  return (
    <div className="rounded-3xl bg-card p-6 text-center shadow-suave">
      <Sparkles className="animar-brilho mx-auto h-10 w-10 text-primary" aria-hidden />
      <p className="mt-3 text-sm font-medium text-card-foreground">Gerando sua versão realista…</p>
      <p
        className="my-3 text-4xl font-semibold tabular-nums text-primary"
        aria-label="Tempo decorrido"
      >
        {Math.floor(segundos)} s
      </p>
      <progress
        className="progresso-realista block h-2 w-full"
        max={100}
        value={progresso}
        aria-label="Progresso estimado"
      />
      <p
        key={mensagem}
        className="mensagem-realista mt-3 min-h-10 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {mensagem}
      </p>
      {segundos >= 60 && !concluido && (
        <Button variant="outline" className="mt-4 rounded-full" onClick={aoContinuarSem}>
          Continuar sem a versão realista
        </Button>
      )}
    </div>
  );
}
