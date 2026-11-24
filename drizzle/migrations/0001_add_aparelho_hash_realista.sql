ALTER TABLE public.uso_versao_realista ADD COLUMN aparelho_hash text CHECK (aparelho_hash IS NULL OR aparelho_hash ~ '^[0-9a-f]{64}$');
CREATE INDEX uso_versao_realista_aparelho_criado_idx ON public.uso_versao_realista (aparelho_hash, criado_em);
COMMENT ON COLUMN public.uso_versao_realista.aparelho_hash IS 'Salted SHA-256 of anonymous device UUID; never store the raw identifier.';