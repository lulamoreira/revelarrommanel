import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CAMPOS_CALIBRACAO } from "@/config/calibracao";
import type { Peca } from "@/config/catalogo";
import { cn } from "@/lib/utils";
import {
  ajusteDaPeca,
  alterarCampo,
  CAMPOS_AJUSTE,
  padraoDebug,
  valoresParaCopiar,
  type AjustesDebug,
} from "@/lib/revelar/calibracao-debug";
export interface PainelCalibracaoProps {
  valores: AjustesDebug;
  pecas: Peca[];
  aoAlterar: (v: AjustesDebug) => void;
}
export function PainelCalibracao({ valores, pecas, aoAlterar }: PainelCalibracaoProps) {
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const peca = pecas.find((p) => p.id === id) ?? pecas[0];
  const ajuste = peca ? ajusteDaPeca(peca, valores) : null;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valoresParaCopiar(valores));
      setMensagem("Valores copiados");
    } catch {
      setMensagem("Não foi possível copiar. Tente novamente.");
    }
  };
  return (
    <aside
      className={cn(
        "absolute left-3 right-3 top-24 z-20 mx-auto max-w-sm rounded-lg border border-border bg-card text-card-foreground shadow-suave",
      )}
      aria-label="Calibração 3D"
    >
      <Button
        variant="ghost"
        className="flex w-full justify-between"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} /> Calibração 3D
        </span>
        {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </Button>
      {aberto && (
        <div className="max-h-[38dvh] space-y-4 overflow-y-auto px-4 pb-4">
          {CAMPOS_CALIBRACAO.map((f) => {
            const n =
              f.grupo === "brinco"
                ? valores.calibracao.brinco[f.chave]
                : valores.calibracao.colar[f.chave];
            return (
              <label key={f.chave} className="block space-y-2 text-xs">
                <span className="flex justify-between">
                  <span>{f.chave}</span>
                  <output>{n.toFixed(f.passo === 1 ? 0 : 3)}</output>
                </span>
                <Slider
                  aria-label={f.chave}
                  value={[n]}
                  min={f.min}
                  max={f.max}
                  step={f.passo}
                  onValueChange={([v]) => {
                    if (v === undefined) return;
                    const novo = structuredClone(valores);
                    alterarCampo(novo.calibracao, f, v);
                    aoAlterar(novo);
                  }}
                />
              </label>
            );
          })}
          {pecas.length > 0 && (
            <label className="block text-xs">
              Peça
              <select
                aria-label="Peça para ajustar"
                className="mt-1 w-full rounded-md border border-input bg-background p-2"
                value={peca?.id ?? ""}
                onChange={(e) => setId(e.target.value)}
              >
                {pecas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          {peca &&
            ajuste &&
            CAMPOS_AJUSTE.map((f) => (
              <label key={f.chave} className="block space-y-2 text-xs">
                <span className="flex justify-between">
                  <span>ajuste.{f.chave}</span>
                  <output>{ajuste[f.chave].toFixed(2)}</output>
                </span>
                <Slider
                  aria-label={`ajuste.${f.chave}`}
                  value={[ajuste[f.chave]]}
                  min={f.min}
                  max={f.max}
                  step={f.passo}
                  onValueChange={([v]) => {
                    if (v === undefined) return;
                    aoAlterar({
                      ...valores,
                      pecas: { ...valores.pecas, [peca.id]: { ...ajuste, [f.chave]: v } },
                    });
                  }}
                />
              </label>
            ))}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void copiar()}>
              <Copy size={14} />
              Copiar valores
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                aoAlterar(padraoDebug());
                setMensagem("Padrão restaurado");
              }}
            >
              <RotateCcw size={14} />
              Restaurar padrão
            </Button>
          </div>
          {mensagem && (
            <p role="status" className="text-xs">
              {mensagem}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
