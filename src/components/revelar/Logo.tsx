import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
  claro?: boolean;
}

/** Placeholder do logo. Troque por <img src="/logo.png" /> quando o arquivo existir. */
export function Logo({ className, claro = false }: LogoProps) {
  return (
    <div
      role="img"
      aria-label="Logo da loja"
      className={cn(
        "mx-auto flex h-10 w-28 items-center justify-center rounded-full border text-xs font-semibold tracking-[0.3em]",
        claro ? "border-overlay-foreground/60 text-overlay-foreground" : "border-primary/40 text-primary",
        className,
      )}
    >
      LOGO
    </div>
  );
}
