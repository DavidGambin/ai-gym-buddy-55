import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, SkipBack, SkipForward, Music2, Unplug, ExternalLink, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { spotifyConnectUrl, spotifyControl, spotifyDisconnect, spotifyNowPlaying } from "@/lib/spotify.functions";
import { useStore, setState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LocalAudioControls } from "./LocalAudio";

const KEY = ["spotify", "now"];
export function SpotifyPlayer({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const now = useServerFn(spotifyNowPlaying);
  const ctl = useServerFn(spotifyControl);
  const connect = useServerFn(spotifyConnectUrl);
  const disconnect = useServerFn(spotifyDisconnect);
  const mode = useStore((s) => s.musicMode ?? "spotify");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [remoteBlocked, setRemoteBlocked] = useState(false);
  const q = useQuery({ queryKey: KEY, queryFn: () => now(), enabled: mode === "spotify", refetchInterval: 10000, retry: false });
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setTick(0); }, [q.dataUpdatedAt]);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "forma-spotify") { setRemoteBlocked(false); void qc.invalidateQueries({ queryKey: KEY }); } };
    window.addEventListener("message", on); return () => window.removeEventListener("message", on);
  }, [qc]);
  async function onConnect() {
    setErr(""); setBusy(true);
    const popup = window.open("", "forma-spotify", "width=480,height=720");
    try { const { url } = await connect(); if (popup) popup.location.href = url; else window.location.href = url; }
    catch { popup?.close(); setErr("Puedes abrir Spotify directamente."); }
    finally { setBusy(false); }
  }
  async function act(action: "next" | "previous" | "play" | "pause") {
    setBusy(true); setErr("");
    try { const r = await ctl({ data: { action } }); if (!r.ok) { setRemoteBlocked(true); } else { await qc.invalidateQueries({ queryKey: KEY }); } }
    catch { setRemoteBlocked(true); }
    finally { setBusy(false); }
  }
  const d = q.data;
  const t = d?.connected ? d.track : null;
  const controls = d?.connected && d.premium === true && t && !remoteBlocked;
  const prog = t ? Math.min(t.durationMs, t.progressMs + (d?.connected && d.playing ? tick * 1000 : 0)) : 0;
  return <section aria-label="Música" className={`rounded-2xl border border-border ${compact ? "bg-navy p-3" : "bg-card p-4"}`}>
    <div className="mb-3 flex gap-1 border-b border-border pb-2">
      <Button variant="ghost" size="sm" aria-pressed={mode === "spotify"} className={mode === "spotify" ? "bg-accent text-foreground" : "text-muted-foreground"} onClick={() => setState(() => ({ musicMode: "spotify" }))}>Spotify</Button>
      <Button variant="ghost" size="sm" aria-pressed={mode === "local"} className={mode === "local" ? "bg-accent text-foreground" : "text-muted-foreground"} onClick={() => setState(() => ({ musicMode: "local" }))}>Mi música</Button>
    </div>
    {mode === "local" ? <LocalAudioControls /> : <>
      {controls ? <>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">{t.image ? <img src={t.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <Music2 className="h-5 w-5 shrink-0 text-spotify" />}<div className="min-w-0"><p className="truncate text-sm font-bold">{t.title}</p><p className="truncate text-xs text-muted-foreground">{t.artist}</p></div></div>
          <div className="flex shrink-0"><Button variant="ghost" size="icon" disabled={busy} onClick={() => act("previous")} aria-label="Anterior"><SkipBack /></Button><Button size="icon" disabled={busy} onClick={() => act(d.playing ? "pause" : "play")} aria-label={d.playing ? "Pausar" : "Reproducir"}>{d.playing ? <Pause /> : <Play />}</Button><Button variant="ghost" size="icon" disabled={busy} onClick={() => act("next")} aria-label="Siguiente"><SkipForward /></Button></div>
        </div>
        <progress aria-label="Progreso de Spotify" value={prog} max={t.durationMs || 1} className="spotify-progress mt-2 h-1 w-full" />
      </> : <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><div className="flex min-w-0 items-center gap-2"><Music2 className="h-5 w-5 shrink-0 text-spotify" /><p className="truncate text-sm font-bold">Spotify</p></div><Button asChild variant="secondary" size="sm"><a href="https://open.spotify.com" target="_blank" rel="noreferrer"><ExternalLink />Abrir Spotify</a></Button></div>}
      {!compact && <div className="mt-3 flex items-center justify-between"><Button variant="ghost" size="sm" disabled={busy} onClick={d?.connected ? async () => { setBusy(true); try { await disconnect(); setRemoteBlocked(false); await qc.invalidateQueries({ queryKey: KEY }); } catch { setErr("No se pudo desconectar. Inténtalo de nuevo."); } finally { setBusy(false); } } : onConnect}>{d?.connected ? <Unplug /> : <Link2 />}{d?.connected ? "Desconectar" : "Vincular cuenta"}</Button>{d?.connected && d.premium === null && <span className="text-xs text-muted-foreground">Vuelve a vincular para activar controles</span>}</div>}
      {err && <p role="status" className="mt-2 text-xs text-muted-foreground">{err}</p>}
    </>}
  </section>;
}