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
- Use a depth-aware, nose-facing head frame with screen-down Y for ear anchors; stabilize the neck against yaw/roll, validate shoulders, and scale bracelets from the hand. Why: jaw/chin anchors and guessed shoulders drift during head turns.
- Debug calibration overrides stay browser-local, validated and separate from catalog defaults; preserve PosePeca and One Euro smoothing. Why: live tuning must not change production configuration or export mechanics.
- Keep camera lifecycle in a browser hook with current callback refs and cleanup after async cancellation. Why: calibration renders must not reopen the camera or leak its tracks.
- The scene canvas uses unmirrored camera space; mirror only the live preview via CSS, never photo/video exports or AI input. Why: clothing text and jewelry positions must match the original camera image.
- The AI "versão realista" goes through `/api/public/versao-realista`, which validates origin, size and UUID, then counts salted device/IP hashes and global usage before AI; local counters are advisory. Why: shared store networks must not consume one customer's allowance.
- Never store photos, raw IPs or device UUIDs on the server; persist only salted SHA-256 hashes in locked usage records. Why: preserve the privacy promise.
- Keep estimated generation progress monotonic below completion and learn timings only from successful requests in browser storage. Why: the AI reports no intermediate progress.
