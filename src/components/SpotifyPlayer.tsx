import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, SkipBack, SkipForward, Music2, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { spotifyConnectUrl, spotifyControl, spotifyDisconnect, spotifyNowPlaying } from "@/lib/spotify.functions";

const KEY = ["spotify", "now"];

export function SpotifyPlayer({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const now = useServerFn(spotifyNowPlaying);
  const ctl = useServerFn(spotifyControl);
  const connect = useServerFn(spotifyConnectUrl);
  const disconnect = useServerFn(spotifyDisconnect);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: KEY, queryFn: () => now(), refetchInterval: 4000, refetchOnWindowFocus: true });

  // Progreso suave entre sondeos
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setTick(0); }, [q.dataUpdatedAt]);

  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "forma-spotify") void qc.invalidateQueries({ queryKey: KEY }); };
    window.addEventListener("message", on); return () => window.removeEventListener("message", on);
  }, [qc]);

  async function onConnect() {
    setErr(null);
    const popup = window.open("", "forma-spotify", "width=480,height=720");
    try {
      const { url } = await connect();
      if (popup) popup.location.href = url; else window.location.href = url;
    } catch (e) { popup?.close(); setErr("No se pudo iniciar la conexión con Spotify"); console.error(e); }
  }
  async function act(action: "next" | "previous" | "play" | "pause") {
    setBusy(true); setErr(null);
    try {
      const r = await ctl({ data: { action } });
      if (!r.ok) setErr(r.error ?? "Error");
      setTimeout(() => qc.invalidateQueries({ queryKey: KEY }), 350);
    } finally { setBusy(false); }
  }

  const d = q.data;
  const shell = compact ? "rounded-2xl border border-border bg-navy p-3 shadow-2xl" : "rounded-2xl border border-border bg-card p-4";

  if (!d) return <div className={`${shell} h-[72px] animate-pulse`} />;

  if (!d.connected) return (
    <div className={shell}>
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#1DB954]/15 text-[#1DB954]"><Music2 className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">Música para entrenar</p><p className="text-xs text-muted-foreground">Conecta tu Spotify y contrólalo desde aquí</p></div>
        <button onClick={onConnect} className="rounded-full bg-[#1DB954] px-4 py-2 text-sm font-bold text-black">Conectar</button>
      </div>
      {err && <p className="mt-2 text-xs text-coral">{err}</p>}
    </div>
  );

  const t = d.track;
  const prog = t ? Math.min(t.durationMs, t.progressMs + (d.playing ? tick * 1000 : 0)) : 0;
  return (
    <div className={shell}>
      <div className="flex items-center gap-3">
        {t?.image ? <img src={t.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-background text-[#1DB954]"><Music2 className="h-5 w-5" /></div>}
        <div className="min-w-0 flex-1">
          {t ? <>
            <a href={t.url ?? undefined} target="_blank" rel="noreferrer" className="block truncate text-sm font-bold">{t.title}</a>
            <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
          </> : <>
            <p className="text-sm font-bold">Nada sonando</p>
            <p className="truncate text-xs text-muted-foreground">{d.message ?? "Abre Spotify en tu móvil y dale al play"}</p>
          </>}
        </div>
        <button disabled={busy} onClick={() => act("previous")} aria-label="Anterior" className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-50"><SkipBack className="h-5 w-5 fill-current" /></button>
        <button disabled={busy} onClick={() => act(d.playing ? "pause" : "play")} aria-label={d.playing ? "Pausar" : "Reproducir"} className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background disabled:opacity-50">
          {d.playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
        <button disabled={busy} onClick={() => act("next")} aria-label="Siguiente" className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-50"><SkipForward className="h-5 w-5 fill-current" /></button>
      </div>
      {t && <div className="mt-2 h-1 rounded-full bg-background/60"><div className="h-full rounded-full bg-[#1DB954] transition-[width] duration-1000 ease-linear" style={{ width: `${(prog / Math.max(1, t.durationMs)) * 100}%` }} /></div>}
      {err && <p className="mt-2 text-xs text-coral">{err}</p>}
      {!compact && <button onClick={async () => { await disconnect(); void qc.invalidateQueries({ queryKey: KEY }); }} className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Unplug className="h-3 w-3" />Desconectar Spotify</button>}
    </div>
  );
}
