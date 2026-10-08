import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Share2, Trophy, X } from "lucide-react";
import { useRef } from "react";
import { z } from "zod";
import { BodyMap } from "@/components/BodyMap";
import { EX_BY_ID, MUSCLE_LABEL, toMuscle, type Muscle } from "@/lib/exercises";
import { bestKg, fmt, setState, useStore, type Level, type Workout } from "@/lib/store";

function updWorkout(id: string, patch: Partial<Workout>) {
  setState((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
}
async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
  const k = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.75);
}

export const Route = createFileRoute("/completado")({
  validateSearch: z.object({ w: z.string().optional() }),
  head: () => ({ meta: [{ title: "¡Entreno completado! — Forma" }, { name: "description", content: "Resumen del entreno: músculos trabajados, volumen y récords." }, { property: "og:title", content: "¡Entreno completado! — Forma" }, { property: "og:description", content: "Músculos trabajados, volumen total y nuevos récords." }] }),
  component: Done,
});

function Done() {
  const { w } = Route.useSearch();
  const s = useStore((x) => x);
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!s.loaded) return <div className="min-h-screen" />;
  const wk = s.workouts.find((x) => x.id === w) ?? s.workouts[s.workouts.length - 1];
  if (!wk) return <p className="p-10 text-center">Sin entrenos todavía.</p>;
  const logs = s.sets.filter((l) => l.workoutId === wk.id);
  const levels: Partial<Record<Muscle, Level>> = {};
  for (const l of logs) { const e = EX_BY_ID[l.exId]; const m = toMuscle(e.t); if (m) levels[m] = "high"; e.s.forEach((x) => { const sm = toMuscle(x); if (sm && !levels[sm]) levels[sm] = "mid"; }); }
  const prs = [...new Set(logs.map((l) => l.exId))].map((id) => {
    const prev = bestKg(s, id, wk.ts); const now = Math.max(...logs.filter((l) => l.exId === id).map((l) => l.kg));
    return { id, prev, now };
  }).filter((p) => p.now > p.prev && p.prev > 0);

  async function share(p: { id: string; now: number; prev: number }) {
    const text = `¡Nuevo récord en ${EX_BY_ID[p.id].n}: ${p.now} kg (antes ${p.prev} kg)! 💪 #Forma`;
    try { if (navigator.share) await navigator.share({ text }); else await navigator.clipboard.writeText(text); } catch { /* cancelado */ }
  }

  async function sharePost() {
    const text = `${wk!.note ? wk!.note + "\n\n" : ""}💪 ${Math.round(wk!.durationSec / 60)} min · ${fmt(wk!.volume)} kg de volumen #Forma`;
    try {
      const files = wk!.photo ? [new File([await (await fetch(wk!.photo)).blob()], "entreno.jpg", { type: "image/jpeg" })] : [];
      if (files.length && navigator.canShare?.({ files })) await navigator.share({ text, files });
      else if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch { /* cancelado */ }
  }

  return (
    <div className="min-h-screen bg-hero px-5 pb-10 pt-10">
      <h1 className="text-center text-3xl font-extrabold">¡Entreno completado!</h1>
      <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground">
        <input type="number" inputMode="numeric" min={1} value={Math.round(wk.durationSec / 60)} onChange={(e) => updWorkout(wk.id, { durationSec: Math.max(0, Number(e.target.value)) * 60 })} className="h-9 w-16 rounded-lg bg-card text-center font-bold text-foreground outline-none focus:ring-2 focus:ring-primary" aria-label="Minutos de entreno" />
        <span>min · {logs.length} series</span>
      </div>
      <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
        {wk.photo ? (
          <div className="relative"><img src={wk.photo} alt="Foto del entreno" className="max-h-96 w-full object-cover" />
            <button onClick={() => updWorkout(wk.id, { photo: undefined })} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/80" aria-label="Quitar foto"><X className="h-4 w-4" /></button></div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 font-semibold text-muted-foreground"><Camera className="h-5 w-5" />Añadir foto</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) updWorkout(wk.id, { photo: await compress(f) }); }} />
        <textarea value={wk.note ?? ""} onChange={(e) => updWorkout(wk.id, { note: e.target.value.slice(0, 500) })} placeholder="Escribe algo sobre tu entreno…" rows={2} className="w-full resize-none border-t border-border bg-transparent p-4 outline-none" />
        <button onClick={sharePost} className="flex h-11 w-full items-center justify-center gap-2 border-t border-border font-semibold text-primary"><Share2 className="h-4 w-4" />Publicar / compartir</button>
      </div>
      <div className="mt-6 rounded-3xl border border-border bg-card py-5"><BodyMap levels={levels} showLabels size={220} /></div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {(Object.keys(levels) as Muscle[]).filter((m) => levels[m] === "high").map((m) => <span key={m} className="rounded-full bg-fatigue-high/20 px-3 py-1.5 text-sm font-semibold text-fatigue-high">{MUSCLE_LABEL[m]}</span>)}
      </div>
      <div className="mt-4 rounded-2xl border border-primary/40 bg-card p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volumen total de hoy</p>
        <p className="text-5xl font-extrabold text-primary">{fmt(wk.volume)} <span className="text-2xl">kg</span></p>
      </div>
      {prs.map((p) => (
        <div key={p.id} className="mt-4 rounded-2xl border border-primary bg-primary/10 p-5">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Trophy /></div><div><p className="text-xs font-bold uppercase text-primary">Nuevo récord</p><p className="font-bold capitalize">{EX_BY_ID[p.id].n}</p></div></div>
          <div className="mt-3 flex items-end gap-3"><span className="text-4xl font-extrabold text-primary">{p.now} kg</span><span className="pb-1 text-sm text-muted-foreground">antes {p.prev} kg</span></div>
          <button onClick={() => share(p)} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-card font-semibold"><Share2 className="h-4 w-4" />Compartir logro</button>
        </div>
      ))}
      <button onClick={() => nav({ to: "/" })} className="mt-6 h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground glow">Finalizar y guardar</button>
    </div>
  );
}
