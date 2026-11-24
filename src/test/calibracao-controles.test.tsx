import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PainelCalibracao } from "@/components/revelar/PainelCalibracao";
import { padraoDebug } from "@/lib/revelar/calibracao-debug";
import { CATALOGO } from "@/config/catalogo";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("ajustes finos da calibração", () => {
  it("soma e subtrai 0.005 no lóbulo e restaura o padrão 0.05", () => {
    const alterado = vi.fn();
    function Painel() {
      const [valores, setValores] = useState(padraoDebug);
      return <PainelCalibracao valores={valores} pecas={[]} aoFechar={() => {}} aoAlterar={(v) => { setValores(v); alterado(v); }} />;
    }
    render(<Painel />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar lobuloBaixo" }));
    expect(alterado.mock.lastCall?.[0].calibracao.brinco.lobuloBaixo).toBe(0.055);
    fireEvent.click(screen.getByRole("button", { name: "Diminuir lobuloBaixo" }));
    expect(alterado.mock.lastCall?.[0].calibracao.brinco.lobuloBaixo).toBe(0.05);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar lobuloBaixo" }));
    fireEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(alterado.mock.lastCall?.[0]).toEqual(padraoDebug());
  });
  it("altera somente a escala da peça selecionada em 0.01", () => {
    const peca = CATALOGO[0];
    if (!peca) throw new Error("Catálogo vazio");
    const alterado = vi.fn();
    render(<PainelCalibracao valores={padraoDebug()} pecas={[peca]} aoFechar={() => {}} aoAlterar={alterado} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar ajuste.escala" }));
    expect(alterado.mock.lastCall?.[0].pecas[peca.id]).toEqual({ escala: (peca.ajuste?.escala ?? 1) + 0.01, dx: peca.ajuste?.dx ?? 0, dy: peca.ajuste?.dy ?? 0 });
    expect(alterado.mock.lastCall?.[0].calibracao).toEqual(padraoDebug().calibracao);
  });
});