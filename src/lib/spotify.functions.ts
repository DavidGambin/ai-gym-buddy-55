import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NowPlaying =
  | { connected: false }
  | { connected: true; premium: boolean | null; playing: false; track: null; message?: string }
  | { connected: true; premium: boolean | null; playing: boolean; track: { title: string; artist: string; image: string | null; progressMs: number; durationMs: number; url: string | null } };

export const spotifyConnectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = await import("./spotify.server");
    const request = getRequest();
    return { url: s.authorizeUrl(request, await s.makeState(context.userId)) };
  });

export const spotifyNowPlaying = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NowPlaying> => {
    const s = await import("./spotify.server");
    const token = await s.accessTokenFor(context.userId);
    if (!token) return { connected: false };
    const profile = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } });
    const account = profile.ok ? await profile.json() as { product?: string } : null;
    const premium = account?.product ? account.product === "premium" : null;
    if (premium !== true) return { connected: true, premium, playing: false, track: null };
    const res = await fetch("https://api.spotify.com/v1/me/player?additional_types=track,episode", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 204) return { connected: true, premium, playing: false, track: null };
    if (res.status === 401) { await s.removeTokens(context.userId); return { connected: false }; }
    if (!res.ok) return { connected: true, premium, playing: false, track: null };
    const j = await res.json() as { is_playing: boolean; progress_ms: number; item: null | { name: string; duration_ms: number; external_urls?: { spotify?: string }; artists?: { name: string }[]; album?: { images?: { url: string }[] }; show?: { name: string; images?: { url: string }[] } } };
    if (!j.item) return { connected: true, premium, playing: false, track: null };
    const it = j.item;
    return {
      connected: true, premium, playing: j.is_playing,
      track: {
        title: it.name,
        artist: it.artists?.map((a) => a.name).join(", ") ?? it.show?.name ?? "",
        image: it.album?.images?.[1]?.url ?? it.album?.images?.[0]?.url ?? it.show?.images?.[0]?.url ?? null,
        progressMs: j.progress_ms ?? 0, durationMs: it.duration_ms, url: it.external_urls?.spotify ?? null,
      },
    };
  });

export const spotifyControl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { action: "next" | "previous" | "play" | "pause" }) => {
    if (!["next", "previous", "play", "pause"].includes(input.action)) throw new Error("Acción no válida");
    return input;
  })
  .handler(async ({ data, context }) => {
    const s = await import("./spotify.server");
    const token = await s.accessTokenFor(context.userId);
    if (!token) return { ok: false, error: "Conecta Spotify primero" };
    const method = data.action === "next" || data.action === "previous" ? "POST" : "PUT";
    const res = await fetch(`https://api.spotify.com/v1/me/player/${data.action}`, { method, headers: { Authorization: `Bearer ${token}` } });
    if (res.ok || res.status === 204) return { ok: true };
    const t = await res.text(); console.error(`Spotify control [${res.status}]: ${t}`);
    if (res.status === 403) return { ok: false, error: "Necesitas Spotify Premium para controlar la música" };
    if (res.status === 404) return { ok: false, error: "Abre Spotify en algún dispositivo y pon algo" };
    return { ok: false, error: "Spotify no respondió" };
  });

export const spotifyDisconnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = await import("./spotify.server");
    await s.removeTokens(context.userId);
    return { ok: true };
  });
