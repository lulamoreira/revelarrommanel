import { cn } from "@/lib/utils";
import logoRoxo from "@/assets/logo_rommanel_roxo.png.asset.json";
import logoBranco from "@/assets/logo_rommanel_branco.png.asset.json";

export interface LogoProps {
  className?: string;
  /** Versão branca, para usar sobre a câmera ou fundos escuros. */
  claro?: boolean;
}

/** Marca da loja. O arquivo vive no CDN; os ponteiros estão em src/assets/. */
export function Logo({ className, claro = false }: LogoProps) {
  return (
    <img
      src={claro ? logoBranco.url : logoRoxo.url}
      alt="Rommanel"
      width={1408}
      height={491}
      draggable={false}
      className={cn(
        "mx-auto h-8 w-auto object-contain",
        claro && "logo-sobre-camara",
        className,
      )}
    />
  );
}
