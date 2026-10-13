import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, SkipBack, SkipForward, Music2, Unplug, ExternalLink, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { spotifyConnectUrl, spotifyControl, spotifyDisconnect, spotifyNowPlaying } from "@/lib/spotify.functions";
import { Button } from "@/components/ui/button";

const KEY = ["spotify", "now"];
export function useSpotifyStatus() {
  const now = useServerFn(spotifyNowPlaying);
  return useQuery({ queryKey: KEY, queryFn: () => now(), refetchInterval: 10000, retry: false });
}

export function SpotifyAccount() {
  const qc = useQueryClient();
  const connect = useServerFn(spotifyConnectUrl);
  const disconnect = useServerFn(spotifyDisconnect);
  const q = useSpotifyStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "forma-spotify") void qc.invalidateQueries({ queryKey: KEY });
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [qc]);
  async function changeAccount() {
    setBusy(true); setError("");
    const popup = q.data?.connected ? null : window.open("", "forma-spotify", "width=480,height=720");
    try {
      if (q.data?.connected) {
        await disconnect(); await qc.invalidateQueries({ queryKey: KEY });
      } else {
        const { url } = await connect();
        if (popup) popup.location.href = url; else window.location.href = url;
      }
    } catch {
      popup?.close(); setError("No se pudo actualizar tu conexión con Spotify. Inténtalo de nuevo.");
    } finally { setBusy(false); }
  }
  return <section className="mt-8 border-t border-border pt-5" aria-label="Cuenta de Spotify">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><h2 className="flex items-center gap-2 font-bold"><Music2 className="h-5 w-5 text-spotify" />Spotify</h2>
        <p className="mt-1 text-sm text-muted-foreground">{q.data?.connected ? q.data.premium === true ? "Premium conectado" : q.data.premium === false ? "Cuenta gratuita conectada" : "Cuenta conectada" : "Sin vincular"}</p></div>
      <Button variant="secondary" disabled={busy || q.isPending} onClick={changeAccount}>{q.data?.connected ? <Unplug /> : <Link2 />}{q.data?.connected ? "Desconectar" : "Vincular"}</Button>
    </div>
    {error && <p role="status" className="mt-2 text-sm text-muted-foreground">{error}</p>}
  </section>;
}

export function SpotifyPlayer({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const ctl = useServerFn(spotifyControl);
  const q = useSpotifyStatus();
  const [busy, setBusy] = useState(false);
  const [remoteBlocked, setRemoteBlocked] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setTick(0); }, [q.dataUpdatedAt]);
  async function act(action: "next" | "previous" | "play" | "pause") {
    setBusy(true);
    try { const r = await ctl({ data: { action } }); if (!r.ok) setRemoteBlocked(true); else await qc.invalidateQueries({ queryKey: KEY }); }
    catch { setRemoteBlocked(true); }
    finally { setBusy(false); }
  }
  const d = q.data;
  // Unknown and free accounts render nothing, including no reserved player space.
  if (q.isError || !d?.connected || d.premium !== true) return null;
  const t = d.track;
  const prog = t ? Math.min(t.durationMs, t.progressMs + (d.playing ? tick * 1000 : 0)) : 0;
  const player = <section aria-label="Reproductor de Spotify" className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
    {t && !remoteBlocked ? <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">{t.image ? <img src={t.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <Music2 className="h-5 w-5 shrink-0 text-spotify" />}<div className="min-w-0"><p className="truncate text-sm font-bold">{t.title}</p><p className="truncate text-xs text-muted-foreground">{t.artist}</p></div></div>
        <div className="flex shrink-0"><Button variant="ghost" size="icon" disabled={busy} onClick={() => act("previous")} aria-label="Anterior"><SkipBack /></Button><Button size="icon" disabled={busy} onClick={() => act(d.playing ? "pause" : "play")} aria-label={d.playing ? "Pausar" : "Reproducir"}>{d.playing ? <Pause /> : <Play />}</Button><Button variant="ghost" size="icon" disabled={busy} onClick={() => act("next")} aria-label="Siguiente"><SkipForward /></Button></div>
      </div>
      <progress aria-label="Progreso de Spotify" value={prog} max={t.durationMs || 1} className="spotify-progress mt-2 h-1 w-full" />
    </> : <div className="flex items-center justify-between gap-2"><Music2 className="h-5 w-5 text-spotify" /><Button asChild variant="secondary" size="sm"><a href="https://open.spotify.com" target="_blank" rel="noreferrer"><ExternalLink />Abrir Spotify</a></Button></div>}
  </section>;
  return compact ? <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 mx-auto w-full max-w-2xl p-3">{player}</div> : player;
}
