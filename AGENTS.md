<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Revelar — project rules
- All try-on tracking runs in the browser (MediaPipe loaded on demand via dynamic import in `src/lib/revelar/rastreamento.ts`); never move it server-side. Why: zero per-use cost and the photo stays on the phone.
- Editable knobs live only in `src/config/` (catalogo, calibracao, modelos, custos, visual); code reads from there. Why: the owner edits these without touching logic.
- The scene canvas is drawn in un-mirrored camera space and mirrored only via CSS; exports re-mirror in their own canvas so text stays readable. Why: avoids mirrored text and misplaced jewels.
- The AI "versão realista" goes through the public server route `/api/public/versao-realista`, which enforces origin, size, per-IP-hash and global daily limits in the database before calling AI; client counters are cosmetic. Why: the QR is public and cost must be capped server-side.
- Never store photos or raw IPs; only salted SHA-256 IP hashes in `uso_versao_realista` (RLS on, no client policies). Why: privacy promise shown to customers.
