import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export interface AjusteCalibracaoProps {
  nome: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  aoAlterar: (valor: number) => void;
}

export function AjusteCalibracao({ nome, valor, min, max, passo, aoAlterar }: AjusteCalibracaoProps) {
  const alterar = (n: number) => aoAlterar(Number(Math.min(max, Math.max(min, n)).toFixed(3)));
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span>{nome}</span>
        <output className="w-16 text-right font-mono tabular-nums">{valor.toFixed(passo === 1 ? 0 : 3)}</output>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="size-9 shrink-0 rounded-md" aria-label={`Diminuir ${nome}`} disabled={valor <= min} onClick={() => alterar(valor - passo)}>
          <Minus size={14} aria-hidden />
        </Button>
        <Slider className="min-w-0 flex-1" aria-label={nome} value={[valor]} min={min} max={max} step={passo} onValueChange={([n]) => { if (n !== undefined) alterar(n); }} />
        <Button variant="outline" size="icon" className="size-9 shrink-0 rounded-md" aria-label={`Aumentar ${nome}`} disabled={valor >= max} onClick={() => alterar(valor + passo)}>
          <Plus size={14} aria-hidden />
        </Button>
      </div>
    </div>
  );
}