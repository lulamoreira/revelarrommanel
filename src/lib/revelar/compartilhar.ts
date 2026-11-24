import { ehIOS } from "./ambiente";

/** Baixa um arquivo; no iOS sem suporte, abre em nova aba com instrução. Chamar dentro de um toque. */
export function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  if (ehIOS(navigator.userAgent, navigator.maxTouchPoints) && blob.type.startsWith("image/")) {
    const aba = window.open("", "_blank");
    if (aba) {
      aba.document.title = "Revelar";
      const corpo = aba.document.body;
      corpo.style.cssText = "margin:0;padding:16px;font-family:sans-serif;text-align:center;background:#EDE7F3;color:#3D2C52";
      const p = aba.document.createElement("p");
      p.textContent = "Toque e segure na imagem para salvar.";
      const img = aba.document.createElement("img");
      img.src = url;
      img.style.cssText = "max-width:100%;border-radius:12px";
      corpo.append(p, img);
      return;
    }
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Compartilha com arquivos quando possível; senão, baixa. */
export async function compartilhar(blob: Blob, nome: string): Promise<void> {
  const arquivo = new File([blob], nome, { type: blob.type });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: "Revelar", text: "Seu estilo é Revelar!" });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  baixar(blob, nome);
}
