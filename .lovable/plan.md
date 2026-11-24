# Revelar — provador virtual de joias (WebAR)

App mobile-first em português, sem login, acessado por QR code. Tudo roda no celular, exceto a "Versão realista".

## Telas
1. **Abertura** — LOGO, "Revelar!" (Allura), "Seu estilo é Revelar!", "Experimente as joias da coleção em você", botão "Começar" (a câmera só é pedida após o toque), rodapé "Sua imagem é processada no seu celular." Lê `?loja=` e guarda na sessão.
2. **Avisos** — navegador interno (Instagram, FBAN, FBAV, Line, "; wv)") → "Abra no Safari ou Chrome" + "Copiar link". Câmera negada/indisponível → instruções iPhone/Android + "Tentar de novo".
3. **Provador** — câmera frontal em tela cheia (espelhada), abas Brincos/Colares/Pulseiras com miniaturas, 1 de cada tipo combinável, tocar de novo remove. FOTO (toque + flash) e VÍDEO (segurar, máx. 10 s, anel de progresso; escondido se não houver formato suportado). "Preparando o provador…", erro amigável + "Tentar de novo", dicas de ombros/pulso.
4. **Resultado** — polaroid com "Seu estilo é Revelar!", nomes das peças, Baixar / Compartilhar / Tirar outra; em foto, destaque "✨ Gerar versão realista".
5. **Versão realista** — consentimento com checkbox obrigatório → animação "Gerando sua versão realista… (até 30 s)" → alternador Original | Realista → baixar/compartilhar a escolhida. Limite 3 por sessão. Foto original nunca se perde.

## Visual
Fundo #EDE7F3, primária #6B4E8C, texto #3D2C52, cartões brancos, cantos arredondados, sombras suaves — tudo como tokens do tema. Allura + Inter.

## Catálogo e calibração
- `src/config/catalogo.ts` no formato pedido (id, nome, tipo, imagem, medida_mm, ancora, ajuste).
- 6 peças douradas de exemplo (2 por tipo) desenhadas em SVG e convertidas em PNG transparente em `/public/pecas`.
- `src/config/calibracao.ts` (deslocamentos do lóbulo, 140 mm rosto, 95 mm mão, 35% pescoço, tempos 300 ms / 1 s etc.).
- `src/config/modelos.ts` com URLs do wasm (jsdelivr, mesma versão fixa do pacote) e dos modelos `.task` com versão no caminho.

## Rastreamento (MediaPipe no celular)
- Face/Pose lite/Hand (2 mãos) carregados sob demanda conforme as peças escolhidas; GPU com fallback para CPU.
- Escala px/mm pelos pontos 234–454 (ou 0→9 da mão). Brinco pelos pontos 177/401 + deslocamento, rotação 33→263, yaw pelo nariz (esconde o lado que some), espelhado do único PNG. Colar pelo meio dos ombros puxado para o queixo (152). Pulseira no pulso deslocado para o antebraço, mão mais visível.
- Filtro One Euro em posição/escala/rotação; mantém 300 ms ao perder e depois some suavemente; sombra leve sob cada peça.
- Vídeo 720p, detecção ~15–20 fps, desenho 30 fps via requestAnimationFrame, sem alocações por quadro.
- `?debug=1` desenha os pontos usados e mostra fps.

## Captura
Canvas próprio não espelhado com textos legíveis após `document.fonts.ready`; JPG 0.92, máx. 1280 px; vídeo com captureStream(30) + MediaRecorder na ordem de formatos pedida, sem áudio. Compartilhar com arquivos quando possível, senão download; no iOS, se falhar, abre em nova aba com "toque e segure para salvar". Nomes `revelar-<data>.jpg/.mp4`. Câmera desligada ao sair do provador e religada em "Tirar outra".

## Ajustes em relação ao pedido (para sua confirmação)
- **Sem "edge function":** esta plataforma usa uma rota de servidor do próprio app (`/api/public/versao-realista`) com o mesmo papel. Não precisa de banco nem login, então não é necessário ligar o Lovable Cloud; a chave de IA fica só no servidor.
- **Modelo:** o exemplo citado é antigo; uso o modelo de edição de imagem padrão e atual do seu espaço (`openai/gpt-image-2.5-sunburst`), com a instrução exata que você escreveu, a foto sem moldura e os PNGs das peças como referência.
- **60 s:** não corto a geração no meio (pagaria pela imagem descartada). Após 60 s a tela oferece "Continuar sem a versão realista", mantendo a original. 429/402 mostram suas mensagens; nada é salvo nem registrado.
- Validação de tamanho na rota (rejeita imagens grandes demais) para evitar abuso, já que é pública.

## Detalhes técnicos
- TanStack Start; rotas `/` (abertura) e `/provador` (provador + resultado em estados, para manter a câmera e a captura em memória); MediaPipe importado dinamicamente só no navegador.
- `@mediapipe/tasks-vision` com versão fixa sem `^`.
- Rota de servidor envia multipart (foto + referências) ao gateway e devolve a imagem; contador de 3 em sessionStorage.
- Testes Vitest para regras: One Euro, conversão px/mm, escolha de mimeType, detecção de navegador interno, limite de 3 gerações.
- Verificação final com Playwright (câmera falsa) nas telas; teste real em iPhone/Android fica com você.
