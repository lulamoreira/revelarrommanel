import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

export interface TelaAberturaProps {
  aoComecar: () => void;
}

export function TelaAbertura({ aoComecar }: TelaAberturaProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-center">
      <Logo />
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">Seu estilo é</p>
        <h1 className="font-script text-7xl leading-tight text-primary">Revelar!</h1>
        <p className="mt-4 max-w-xs text-base text-foreground">Experimente as joias da coleção em você</p>
        <Button size="lg" className="mt-10 h-14 w-full max-w-xs rounded-full text-base shadow-suave" onClick={aoComecar}>
          Começar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Sua imagem é processada no seu celular.</p>
    </main>
  );
}
