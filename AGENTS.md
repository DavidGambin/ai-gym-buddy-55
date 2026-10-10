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

- Active workouts belong to the per-user JSON document with an account-scoped device cache; why: preserve sessions across navigation and immediate reloads while isolating accounts.
- Preserve entered load and store effective load separately on new set logs; why: volume uses equipment multipliers without rewriting historical records when profile weight changes.
- Workout date changes go through the shared updateWorkout mutation that shifts associated set timestamps; why: history and fatigue must agree.
- Local audio is owned by a root-level provider; why: navigating between workout screens must not stop playback.
- Brand images are imported through CDN asset pointers while install icons remain public files; why: keep image delivery lightweight and install icons compatible.
