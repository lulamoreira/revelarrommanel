CREATE TABLE public.uso_versao_realista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT NOT NULL CHECK (char_length(ip_hash) = 64),
  loja TEXT CHECK (loja IS NULL OR char_length(loja) <= 64),
  sucesso BOOLEAN NOT NULL DEFAULT false
);
GRANT ALL ON public.uso_versao_realista TO service_role;
ALTER TABLE public.uso_versao_realista ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_uso_vr_ip_criado ON public.uso_versao_realista (ip_hash, criado_em);
CREATE INDEX idx_uso_vr_criado ON public.uso_versao_realista (criado_em);