import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Music2, Pause, Play, SkipBack, SkipForward, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

type Track = { title: string; url: string };
type AudioState = { tracks: Track[]; index: number; playing: boolean; progress: number; duration: number; error: string; load: (files: FileList) => void; toggle: () => void; skip: (delta: number) => void; seek: (value: number) => void };
const AudioContext = createContext<AudioState | null>(null);

export function LocalAudioProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const allUrls = useRef<string[]>([]);
  useEffect(() => () => allUrls.current.forEach(URL.revokeObjectURL), []);
  async function play() {
    try { await audio.current?.play(); setError(""); } catch { setError("No se pudo reproducir este archivo."); }
  }
  function skip(delta: number) { if (tracks.length) { setIndex((i) => (i + delta + tracks.length) % tracks.length); } }
  function toggle() { if (audio.current?.paused) void play(); else audio.current?.pause(); }
  function load(files: FileList) {
    audio.current?.pause();
    const next = Array.from(files).filter((f) => f.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(f.name)).map((f) => ({ title: f.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(f) }));
    if (!next.length) { setError("Selecciona un archivo de audio."); return; }
    allUrls.current.forEach(URL.revokeObjectURL); allUrls.current = next.map((t) => t.url);
    setTracks(next); setIndex(0); setProgress(0); setDuration(0); setError("");
  }
  const track = tracks[index];
  useEffect(() => {
    setProgress(0); setDuration(0);
    if (!track || !navigator.mediaSession) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: "SpotterBro.ai" });
    navigator.mediaSession.setActionHandler("play", () => { void play(); });
    navigator.mediaSession.setActionHandler("pause", () => audio.current?.pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => skip(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => skip(-1));
    return () => { for (const action of ["play", "pause", "nexttrack", "previoustrack"] as const) navigator.mediaSession.setActionHandler(action, null); };
  }, [track, tracks.length]);
  return <AudioContext.Provider value={{ tracks, index, playing, progress, duration, error, load, toggle, skip, seek: (v) => { if (audio.current) audio.current.currentTime = v; } }}>
    {children}
    <audio ref={audio} src={track?.url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={() => setProgress(audio.current?.currentTime ?? 0)} onLoadedMetadata={() => setDuration(Number.isFinite(audio.current?.duration) ? audio.current?.duration ?? 0 : 0)} onEnded={() => { skip(1); if (tracks.length === 1 && audio.current) { audio.current.currentTime = 0; void play(); } }} onError={() => setError("Este formato de audio no se puede reproducir.")} />
  </AudioContext.Provider>;
}

export function LocalAudioControls() {
  const a = useContext(AudioContext);
  const picker = useRef<HTMLInputElement>(null);
  if (!a) return null;
  const track = a.tracks[a.index];
  return <div>
    <input ref={picker} type="file" accept="audio/*,.mp3,.m4a,.wav" multiple hidden onChange={(e) => { if (e.target.files) a.load(e.target.files); e.target.value = ""; }} />
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <div className="flex min-w-0 items-center gap-2"><Music2 className="h-5 w-5 shrink-0 text-primary" /><p className="truncate text-sm font-semibold">{track?.title ?? "Tu música"}</p></div>
      <div className="flex shrink-0 items-center gap-1">
        {track && <><Button variant="ghost" size="icon" onClick={() => a.skip(-1)} aria-label="Pista anterior" title="Pista anterior"><SkipBack /></Button><Button size="icon" onClick={a.toggle} aria-label={a.playing ? "Pausar audio" : "Reproducir audio"}>{a.playing ? <Pause /> : <Play />}</Button><Button variant="ghost" size="icon" onClick={() => a.skip(1)} aria-label="Pista siguiente" title="Pista siguiente"><SkipForward /></Button></>}
        <Button variant="ghost" size="icon" onClick={() => picker.current?.click()} aria-label="Elegir música" title="Elegir música"><FolderOpen /></Button>
      </div>
    </div>
    {track && <input aria-label="Posición del audio" type="range" min={0} max={a.duration || 1} value={a.progress} step={0.1} onChange={(e) => a.seek(Number(e.target.value))} className="mt-2 w-full accent-primary" />}
    {a.error && <p role="status" className="mt-2 text-xs text-muted-foreground">{a.error}</p>}
  </div>;
}