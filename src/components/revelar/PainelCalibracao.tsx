import { useState } from "react";
import { Copy, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CAMPOS_CALIBRACAO } from "@/config/calibracao";
import type { Peca } from "@/config/catalogo";
import { AjusteCalibracao } from "./AjusteCalibracao";
import { identificadorAparelho } from "@/lib/revelar/aparelho";
import {
  ajusteDaPeca, alterarCampo, CAMPOS_AJUSTE, padraoDebug,
  valoresParaCopiar, type AjustesDebug,
} from "@/lib/revelar/calibracao-debug";

export interface PainelCalibracaoProps {
  valores: AjustesDebug;
  pecas: Peca[];
  aoAlterar: (v: AjustesDebug) => void;
  aoFechar: () => void;
}

export function PainelCalibracao({ valores, pecas, aoAlterar, aoFechar }: PainelCalibracaoProps) {
  const [id, setId] = useState("");
  const [mensagem, setMensagem] = useState("");
  const peca = pecas.find((p) => p.id === id) ?? pecas[0];
  const ajuste = peca ? ajusteDaPeca(peca, valores) : null;
  const [idAparelho] = useState(() => identificadorAparelho());
  const copiarId = async () => {
    try {
      await navigator.clipboard.writeText(idAparelho);
      setMensagem("ID do aparelho copiado");
    } catch {
      setMensagem("Não foi possível copiar. Tente novamente.");
    }
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valoresParaCopiar(valores));
      setMensagem("Valores copiados");
    } catch {
      setMensagem("Não foi possível copiar. Tente novamente.");
    }
  };
  return (
    <aside id="painel-calibracao" className="absolute inset-x-0 bottom-0 z-20 mx-auto flex h-[45dvh] max-h-[45dvh] max-w-lg flex-col rounded-t-lg border border-border bg-card text-card-foreground shadow-suave" aria-label="Calibração 3D" onKeyDown={(e) => { if (e.key === "Escape") aoFechar(); }}>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-1">
        <h2 className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal size={16} aria-hidden /> Calibração 3D</h2>
        <Button variant="ghost" size="icon" className="size-9" aria-label="Fechar calibração" onClick={aoFechar}><X size={16} aria-hidden /></Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {CAMPOS_CALIBRACAO.map((f) => {
          const n = f.grupo === "brinco" ? valores.calibracao.brinco[f.chave] : valores.calibracao.colar[f.chave];
          return <AjusteCalibracao key={f.chave} nome={f.chave} valor={n} min={f.min} max={f.max} passo={f.passo} aoAlterar={(v) => {
            const novo = structuredClone(valores);
            alterarCampo(novo.calibracao, f, v);
            aoAlterar(novo);
          }} />;
        })}
        {pecas.length > 0 && (
          <label className="block text-xs">Peça
            <select aria-label="Peça para ajustar" className="mt-1 w-full rounded-md border border-input bg-background p-2" value={peca?.id ?? ""} onChange={(e) => setId(e.target.value)}>
              {pecas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        )}
        {peca && ajuste && CAMPOS_AJUSTE.map((f) => (
          <AjusteCalibracao key={f.chave} nome={`ajuste.${f.chave}`} valor={ajuste[f.chave]} min={f.min} max={f.max} passo={f.passo} aoAlterar={(v) => aoAlterar({ ...valores, pecas: { ...valores.pecas, [peca.id]: { ...ajuste, [f.chave]: v } } })} />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void copiar()}><Copy size={14} aria-hidden /> Copiar valores</Button>
          <Button size="sm" variant="outline" onClick={() => { aoAlterar(padraoDebug()); setMensagem("Padrão restaurado"); }}><RotateCcw size={14} aria-hidden /> Restaurar padrão</Button>
        </div>
        {mensagem && <p role="status" className="text-xs">{mensagem}</p>}
        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
          <p>ID deste aparelho</p>
          <p className="mt-1 break-all font-mono text-foreground">{idAparelho}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => void copiarId()}><Copy size={14} aria-hidden /> Copiar ID do aparelho</Button>
        </div>
      </div>
    </aside>
  );
}
