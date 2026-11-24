import { useEffect, useState } from "react";
import { progressoEstimado, tempoEstimado } from "@/lib/revelar/espera-realista";
export function useEsperaRealista(inicio: number, concluido: boolean) {
  const [estado, setEstado] = useState({ segundos: 0, progresso: 0 });
  useEffect(() => {
    const estimado = tempoEstimado();
    const atualizar = () =>
      setEstado((v) => {
        const segundos = Math.max(0, (performance.now() - inicio) / 1000);
        return {
          segundos,
          progresso: progressoEstimado(segundos, estimado, v.progresso, concluido),
        };
      });
    atualizar();
    const timer = window.setInterval(atualizar, 100);
    return () => window.clearInterval(timer);
  }, [inicio, concluido]);
  return estado;
}
