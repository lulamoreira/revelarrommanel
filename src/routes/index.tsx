import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TelaAbertura } from "@/components/revelar/TelaAbertura";
import { TelaCamera, TelaNavegadorApp } from "@/components/revelar/TelasAviso";
import { Provador, type Captura } from "@/components/revelar/Provador";
import { Resultado } from "@/components/revelar/Resultado";
import { ehNavegadorDeApp, lerLoja } from "@/lib/revelar/ambiente";
import { guardarLoja, lerLojaSessao } from "@/lib/revelar/sessao";
import type { Selecao } from "@/lib/revelar/motor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Revelar — experimente as joias em você" },
      { name: "description", content: "Provador virtual de joias: veja brincos, colares e pulseiras em você ao vivo, tire uma foto e compartilhe." },
      { property: "og:title", content: "Revelar — provador virtual de joias" },
      { property: "og:description", content: "Experimente as joias da coleção em você, ao vivo pela câmera do celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Revelar,
});

type Tela =
  | { nome: "abertura" }
  | { nome: "app" }
  | { nome: "provador" }
  | { nome: "camera"; motivo: "negada" | "indisponivel" }
  | { nome: "resultado"; captura: Captura };

function Revelar() {
  const [tela, setTela] = useState<Tela>({ nome: "abertura" });
  const [loja, setLoja] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [selecao, setSelecao] = useState<Selecao>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const daUrl = lerLoja(params.get("loja"));
    if (daUrl) guardarLoja(daUrl);
    setLoja(daUrl ?? lerLojaSessao());
    setDebug(params.get("debug") === "1");
    if (ehNavegadorDeApp(navigator.userAgent)) setTela({ nome: "app" });
  }, []);

  return (
    <>
      {tela.nome === "abertura" && <TelaAbertura aoComecar={() => setTela({ nome: "provador" })} />}
      {tela.nome === "app" && <TelaNavegadorApp />}
      {tela.nome === "camera" && <TelaCamera motivo={tela.motivo} aoTentar={() => setTela({ nome: "provador" })} />}
      {tela.nome === "provador" && (
        <Provador
          debug={debug}
          selecaoInicial={selecao}
          aoErroCamera={(motivo) => setTela({ nome: "camera", motivo })}
          aoCapturar={(captura, sel) => {
            setSelecao(sel);
            setTela({ nome: "resultado", captura });
          }}
        />
      )}
      {tela.nome === "resultado" && (
        <Resultado captura={tela.captura} loja={loja} aoTirarOutra={() => setTela({ nome: "provador" })} />
      )}
      <Toaster position="top-center" />
    </>
  );
}
