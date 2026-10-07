<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Per-user app state is one JSONB document in `public.user_data` (synced from `src/lib/store.ts`); why: keeps the existing local store shape with minimal migration.
- Spotify uses custom per-user OAuth (no Lovable app-user connector exists); tokens live in `spotify_tokens`, accessed only server-side via service role.
- Sign-in gating is the inline `AuthGate` in the root layout, not an `_authenticated` route; why: every screen requires an account.
