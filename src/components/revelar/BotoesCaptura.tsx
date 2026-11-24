import { Camera, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BotoesCapturaProps {
  aoFoto: () => void;
  videoDisponivel: boolean;
  gravando: boolean;
  /** 0..1 */
  progresso: number;
  aoIniciarVideo: () => void;
  aoPararVideo: () => void;
  desabilitado: boolean;
}

const R = 34;
const C = 2 * Math.PI * R;

export function BotoesCaptura(p: BotoesCapturaProps) {
  return (
    <div className="flex items-center justify-center gap-8 py-3">
      <button
        onClick={p.aoFoto}
        disabled={p.desabilitado || p.gravando}
        aria-label="Tirar foto"
        className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-overlay-foreground bg-card text-primary shadow-suave transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
      >
        <Camera className="h-7 w-7" aria-hidden />
      </button>
      {p.videoDisponivel && (
        <button
          aria-label="Segure para gravar vídeo (até 10 segundos)"
          disabled={p.desabilitado}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            p.aoIniciarVideo();
          }}
          onPointerUp={p.aoPararVideo}
          onPointerCancel={p.aoPararVideo}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "relative flex h-[72px] w-[72px] touch-none select-none items-center justify-center rounded-full bg-card text-primary shadow-suave transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
            p.gravando && "scale-110 text-gravando",
          )}
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 76 76" aria-hidden>
            <circle cx="38" cy="38" r={R} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="4" />
            <circle
              cx="38"
              cy="38"
              r={R}
              fill="none"
              className="stroke-gravando"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - p.progresso)}
            />
          </svg>
          <Video className="h-7 w-7" aria-hidden />
        </button>
      )}
    </div>
  );
}
