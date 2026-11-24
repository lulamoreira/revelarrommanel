import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TelaCartao } from "./TelaCartao";

export function TelaNavegadorApp() {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
    } catch {
      window.prompt("Copie o link:", window.location.href);
    }
  };
  return (
    <TelaCartao
      titulo="Abra no Safari ou Chrome"
      acoes={
        <Button size="lg" className="rounded-full" onClick={copiar}>
          {copiado ? "Link copiado!" : "Copiar link"}
        </Button>
      }
    >
      <p>O navegador deste aplicativo não libera a câmera para o provador.</p>
      <p>Copie o link e cole no Safari (iPhone) ou no Chrome (Android). Ou toque no menu “⋯” e escolha “Abrir no navegador”.</p>
    </TelaCartao>
  );
}

export interface TelaCameraProps {
  motivo: "negada" | "indisponivel";
  aoTentar: () => void;
}

export function TelaCamera({ motivo, aoTentar }: TelaCameraProps) {
  return (
    <TelaCartao
      titulo={motivo === "negada" ? "Precisamos da sua câmera" : "Câmera indisponível"}
      acoes={
        <Button size="lg" className="rounded-full" onClick={aoTentar}>
          Tentar de novo
        </Button>
      }
    >
      <p>
        {motivo === "negada"
          ? "O acesso à câmera foi bloqueado. Sua imagem fica só no seu celular."
          : "Não encontramos uma câmera disponível. Feche outros apps que estejam usando a câmera."}
      </p>
      <div>
        <p className="font-semibold text-card-foreground">iPhone</p>
        <p>Toque em “aA” na barra de endereço → Ajustes do Site → Câmera → Permitir. Ou Ajustes → Safari → Câmera.</p>
      </div>
      <div>
        <p className="font-semibold text-card-foreground">Android</p>
        <p>Toque no cadeado ao lado do endereço → Permissões → Câmera → Permitir.</p>
      </div>
    </TelaCartao>
  );
}
