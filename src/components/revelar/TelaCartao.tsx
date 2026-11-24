import type { ReactNode } from "react";
import { Logo } from "./Logo";

export interface TelaCartaoProps {
  titulo: string;
  children: ReactNode;
  acoes?: ReactNode;
}

/** Layout padrão de tela com logo e cartão central. */
export function TelaCartao({ titulo, children, acoes }: TelaCartaoProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-background px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Logo />
      <section className="mx-auto mt-8 w-full max-w-md rounded-3xl bg-card p-6 shadow-suave">
        <h1 className="text-xl font-semibold text-card-foreground">{titulo}</h1>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
        {acoes && <div className="mt-6 flex flex-col gap-3">{acoes}</div>}
      </section>
    </main>
  );
}
