// Server-only Spotify helpers. Only import dynamically inside server handlers.
export const SPOTIFY_SCOPES = "user-read-private user-read-currently-playing user-read-playback-state user-modify-playback-state";

export function appOrigin(request: Request) {
  const url = new URL(request.url);
  const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return sandboxHost ? `https://${sandboxHost}` : url.origin;
}
export const redirectUri = (request: Request) => `${appOrigin(request)}/api/public/spotify/callback`;

function creds() {
  const id = process.env["SPOTIFY_CLIENT_ID"]; const secret = process.env["SPOTIFY_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("Faltan las claves de Spotify");
  return { id, secret };
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(creds().secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => (c === "+" ? "-" : c === "/" ? "_" : ""));
}
export async function makeState(userId: string) {
  const p = `${userId}.${Date.now()}`; return `${p}.${await hmac(p)}`;
}
export async function readState(state: string): Promise<string | null> {
  const [uid, ts, sig] = state.split(".");
  if (!uid || !ts || !sig) return null;
  if (Date.now() - Number(ts) > 15 * 60e3) return null;
  return (await hmac(`${uid}.${ts}`)) === sig ? uid : null;
}

export function authorizeUrl(request: Request, state: string) {
  const q = new URLSearchParams({ client_id: creds().id, response_type: "code", redirect_uri: redirectUri(request), scope: SPOTIFY_SCOPES, state, show_dialog: "true" });
  return `https://accounts.spotify.com/authorize?${q}`;
}

async function tokenRequest(body: Record<string, string>) {
  const { id, secret } = creds();
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${id}:${secret}`)}` },
    body: new URLSearchParams(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Spotify token [${res.status}]: ${text}`);
  return JSON.parse(text) as { access_token: string; refresh_token?: string; expires_in: number };
}

async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

export async function exchangeCode(request: Request, code: string, userId: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(request) });
  if (!t.refresh_token) throw new Error("Spotify no devolvió una autorización completa");
  const db = await admin();
  const { error } = await db.from("spotify_tokens").upsert({
    user_id: userId, refresh_token: t.refresh_token, access_token: t.access_token,
    expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(), updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function accessTokenFor(userId: string): Promise<string | null> {
  const db = await admin();
  const { data } = await db.from("spotify_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  if (data.access_token && data.expires_at && new Date(data.expires_at).getTime() > Date.now()) return data.access_token;
  try {
    const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: data.refresh_token });
    await db.from("spotify_tokens").update({
      access_token: t.access_token, refresh_token: t.refresh_token ?? data.refresh_token,
      expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(), updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return t.access_token;
  } catch (e) {
    console.error(e);
    await db.from("spotify_tokens").delete().eq("user_id", userId);
    return null;
  }
}

export async function removeTokens(userId: string) {
  const db = await admin(); await db.from("spotify_tokens").delete().eq("user_id", userId);
}
