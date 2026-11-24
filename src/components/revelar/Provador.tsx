import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Peca, TipoPeca } from "@/config/catalogo";
import { MotorProvador, type Selecao } from "@/lib/revelar/motor";
import { canvasParaBlob, fotoEspelhada, fontesProntas, polaroidDeImagem } from "@/lib/revelar/captura";
import { useGravacao } from "@/hooks/use-gravacao";
import { BotoesCaptura } from "./BotoesCaptura";
import { Catalogo } from "./Catalogo";
import { Logo } from "./Logo";

export type Captura =
  | { tipo: "foto"; base: Blob; polaroid: Blob; pecas: Peca[] }
  | { tipo: "video"; blob: Blob; mime: string; pecas: Peca[] };

export interface ProvadorProps {
  debug: boolean;
  selecaoInicial: Selecao;
  aoCapturar: (c: Captura, selecao: Selecao) => void;
  aoErroCamera: (motivo: "negada" | "indisponivel") => void;
}

type EstadoCarga = "pronto" | "carregando" | "erro";

export function Provador({ debug, selecaoInicial, aoCapturar, aoErroCamera }: ProvadorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cenaRef = useRef<HTMLCanvasElement>(null);
  const debugRef = useRef<HTMLCanvasElement>(null);
  const motorRef = useRef<MotorProvador | null>(null);
  const [selecao, setSelecao] = useState<Selecao>(selecaoInicial);
  const [aba, setAba] = useState<TipoPeca>("brinco");
  const [carga, setCarga] = useState<EstadoCarga>("pronto");
  const [dica, setDica] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [flash, setFlash] = useState(0);
  const [cameraPronta, setCameraPronta] = useState(false);
  const pecasAtuais = useCallback(() => Object.values(selecao).filter((p): p is Peca => Boolean(p)), [selecao]);

  const gravacao = useGravacao(cenaRef, (blob, mime) => aoCapturar({ tipo: "video", blob, mime, pecas: pecasAtuais() }, selecao));

  // Câmera + motor. As tracks são paradas ao sair do provador.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;
    const video = videoRef.current;
    const cena = cenaRef.current;
    if (!video || !cena) return;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("sem câmera", "NotFoundError");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelado) return;
        video.srcObject = stream;
        await video.play();
        const motor = new MotorProvador(video, cena, debug ? debugRef.current : null, {
          aoDica: setDica,
          ...(debug ? { aoFps: setFps } : {}),
          aoDesenhar: () => gravacao.desenharQuadro(),
        });
        motorRef.current = motor;
        motor.iniciar();
        setCameraPronta(true);
      } catch (e) {
        if (cancelado) return;
        const nome = e instanceof DOMException ? e.name : "";
        aoErroCamera(nome === "NotAllowedError" || nome === "SecurityError" ? "negada" : "indisponivel");
      }
    })();
    return () => {
      cancelado = true;
      motorRef.current?.parar();
      motorRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega sob demanda o necessário para a seleção atual.
  const aplicarSelecao = useCallback(async (sel: Selecao) => {
    const motor = motorRef.current;
    if (!motor) return;
    setCarga("carregando");
    try {
      await motor.definirSelecao(sel);
      setCarga("pronto");
    } catch (e) {
      console.error(e);
      setCarga("erro");
    }
  }, []);

  useEffect(() => {
    if (cameraPronta) void aplicarSelecao(selecao);
  }, [cameraPronta, selecao, aplicarSelecao]);

  const alternar = (p: Peca) =>
    setSelecao((s) => {
      const nova = { ...s };
      if (nova[p.tipo]?.id === p.id) delete nova[p.tipo];
      else nova[p.tipo] = p;
      return nova;
    });

  const tirarFoto = async () => {
    const cena = cenaRef.current;
    if (!cena || !cena.width) return;
    setFlash((f) => f + 1);
    await fontesProntas();
    const foto = fotoEspelhada(cena);
    const base = await canvasParaBlob(foto);
    const polaroid = await polaroidDeImagem(foto, foto.width, foto.height);
    aoCapturar({ tipo: "foto", base, polaroid, pecas: pecasAtuais() }, selecao);
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-overlay">
      <video ref={videoRef} playsInline muted autoPlay className="pointer-events-none absolute h-px w-px opacity-0" />
      <canvas ref={cenaRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" aria-label="Pré-visualização da câmera com as joias" />
      {debug && <canvas ref={debugRef} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover" />}
      {flash > 0 && <div key={flash} className="animar-flash pointer-events-none absolute inset-0 bg-flash" />}

      <header className="absolute inset-x-0 top-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Logo claro />
        {debug && <p className="mt-2 text-center font-mono text-xs text-overlay-foreground">{fps} fps</p>}
      </header>

      {(carga !== "pronto" || !cameraPronta) && (
        <div className="absolute inset-x-6 top-1/3 mx-auto max-w-xs rounded-3xl bg-card p-5 text-center shadow-suave" role="status">
          {carga === "erro" ? (
            <>
              <p className="text-sm text-card-foreground">Não conseguimos preparar o provador. Verifique sua internet.</p>
              <Button className="mt-4 rounded-full" onClick={() => void aplicarSelecao(selecao)}>
                Tentar de novo
              </Button>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-card-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparando o provador…
            </p>
          )}
        </div>
      )}

      {dica && carga === "pronto" && (
        <p className="absolute inset-x-6 bottom-60 mx-auto max-w-xs rounded-full bg-overlay px-4 py-2 text-center text-sm text-overlay-foreground backdrop-blur" role="status">
          {dica}
        </p>
      )}

      <div className="absolute inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)]">
        <BotoesCaptura
          aoFoto={() => void tirarFoto()}
          videoDisponivel={gravacao.disponivel}
          gravando={gravacao.gravando}
          progresso={gravacao.progresso}
          aoIniciarVideo={gravacao.iniciar}
          aoPararVideo={gravacao.parar}
          desabilitado={!cameraPronta}
        />
        <Catalogo aba={aba} aoAba={setAba} selecao={selecao} aoAlternar={alternar} />
      </div>
    </main>
  );
}
