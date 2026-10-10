import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarIcon, Camera, Share2, Trophy, X } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";
import { BodyMap } from "@/components/BodyMap";
import { EX_BY_ID, MUSCLE_LABEL, toMuscle, type Muscle } from "@/lib/exercises";
import { bestKg, fmt, updateWorkout as updWorkout, formatDuration, useStore, type Level } from "@/lib/store";

async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
  const k = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("No se pudo preparar la foto");
  ctx.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.75);
}

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/completado")({
  validateSearch: z.object({ w: z.string().optional() }),
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "¡Entreno completado! — SpotterBro.ai" }, { name: "description", content: "Resumen del entreno: músculos trabajados, volumen y récords." }, { property: "og:title", content: "¡Entreno completado! — SpotterBro.ai" }, { property: "og:description", content: "Músculos trabajados, volumen total y nuevos récords." }] }),
  component: Done,
});

function Done() {
  const { w } = Route.useSearch();
  const s = useStore((x) => x);
  const nav = useNavigate();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!s.loaded) return <div className="min-h-screen" />;
  const wk = s.workouts.find((x) => x.id === w) ?? s.workouts[s.workouts.length - 1];
  if (!wk) return <p className="p-10 text-center">Sin entrenos todavía.</p>;
  const logs = s.sets.filter((l) => l.workoutId === wk.id);
  const levels: Partial<Record<Muscle, Level>> = {};
  for (const l of logs) { const e = EX_BY_ID[l.exId]; if (!e) continue; const m = toMuscle(e.t); if (m) levels[m] = "high"; e.s.forEach((x) => { const sm = toMuscle(x); if (sm && !levels[sm]) levels[sm] = "mid"; }); }
  const prs = [...new Set(logs.map((l) => l.exId))].map((id) => {
    const prev = bestKg(s, id, wk.ts); const now = Math.max(...logs.filter((l) => l.exId === id).map((l) => l.kg));
    return { id, prev, now };
  }).filter((p) => p.now > p.prev && p.prev > 0);

  async function share(p: { id: string; now: number; prev: number }) {
    const text = `¡Nuevo récord en ${EX_BY_ID[p.id].n}: ${p.now} kg (antes ${p.prev} kg)! 💪 #SpotterBro.ai`;
    try { if (navigator.share) await navigator.share({ text }); else await navigator.clipboard.writeText(text); } catch { /* cancelado */ }
  }

  async function sharePost() {
    if (!wk) return;
    const text = `${wk.note ? wk.note + "\n\n" : ""}💪 ${formatDuration(wk.durationSec)} · ${fmt(wk.volume)} kg de volumen #SpotterBro.ai`;
    try {
      const files = wk.photo ? [new File([await (await fetch(wk.photo)).blob()], "entreno.jpg", { type: "image/jpeg" })] : [];
      if (files.length && navigator.canShare?.({ files })) await navigator.share({ text, files });
      else if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch { /* cancelado */ }
  }

  return (
    <div className="min-h-screen bg-hero px-5 pb-10 pt-[max(env(safe-area-inset-top),2rem)]">
      <h1 className="text-center text-3xl font-extrabold">¡Entreno completado!</h1>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-muted-foreground">
        <label className="text-xs">Horas<input type="number" inputMode="numeric" min={0} max={99} value={Math.floor(wk.durationSec / 3600)} onChange={(e) => updWorkout(wk.id, { durationSec: Math.min(99, Math.max(0, Number(e.target.value))) * 3600 + wk.durationSec % 3600 })} className="ml-2 h-10 w-14 rounded-lg bg-card text-center font-bold text-foreground" aria-label="Horas de entreno" /></label>
        <label className="text-xs">Min<input type="number" inputMode="numeric" min={0} max={59} value={Math.floor(wk.durationSec / 60) % 60} onChange={(e) => updWorkout(wk.id, { durationSec: Math.floor(wk.durationSec / 3600) * 3600 + Math.min(59, Math.max(0, Number(e.target.value))) * 60 })} className="ml-2 h-10 w-14 rounded-lg bg-card text-center font-bold text-foreground" aria-label="Minutos de entreno" /></label>
        <span className="text-xs">· {logs.length} series</span>
      </div>
      <div className="mt-3 flex justify-center">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild><Button variant="outline" aria-label="Cambiar fecha del entreno"><CalendarIcon />{new Date(wk.ts).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</Button></PopoverTrigger>
          <PopoverContent align="center" className="w-auto p-0 pointer-events-auto"><Calendar mode="single" locale={es} selected={new Date(wk.ts)} disabled={{ after: new Date() }} onSelect={(date) => { if (!date) return; const old = new Date(wk.ts); date.setHours(old.getHours(), old.getMinutes(), old.getSeconds(), old.getMilliseconds()); updWorkout(wk.id, { ts: Math.min(Date.now(), date.getTime()) }); setCalendarOpen(false); }} className="pointer-events-auto" /></PopoverContent>
        </Popover>
      </div>
      <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
        {wk.photo ? (
          <div className="relative"><img src={wk.photo} alt="Foto del entreno" className="max-h-96 w-full object-cover" />
            <Button variant="ghost" onClick={() => updWorkout(wk.id, { photo: undefined })} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/80" aria-label="Quitar foto"><X className="h-4 w-4" /></Button></div>
        ) : (
          <Button variant="ghost" onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 font-semibold text-muted-foreground"><Camera className="h-5 w-5" />Añadir foto</Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) updWorkout(wk.id, { photo: await compress(f) }); }} />
        <textarea value={wk.note ?? ""} onChange={(e) => updWorkout(wk.id, { note: e.target.value.slice(0, 500) })} placeholder="Escribe algo sobre tu entreno…" rows={2} className="w-full resize-none border-t border-border bg-transparent p-4 outline-none" />
        <Button variant="ghost" onClick={sharePost} className="flex h-11 w-full items-center justify-center gap-2 border-t border-border font-semibold text-primary"><Share2 className="h-4 w-4" />Publicar / compartir</Button>
      </div>
      <div className="mt-6 rounded-3xl border border-border bg-card py-5"><BodyMap levels={levels} showLabels size={220} /></div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {(Object.keys(levels) as Muscle[]).filter((m) => levels[m] === "high").map((m) => <span key={m} className="rounded-full bg-fatigue-high/20 px-3 py-1.5 text-sm font-semibold text-fatigue-high">{MUSCLE_LABEL[m]}</span>)}
      </div>
      <div className="mt-4 rounded-2xl border border-primary/40 bg-card p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volumen del entreno</p>
        <p className="text-5xl font-extrabold text-primary">{fmt(wk.volume)} <span className="text-2xl">kg</span></p>
      </div>
      {prs.map((p) => (
        <div key={p.id} className="mt-4 rounded-2xl border border-primary bg-primary/10 p-5">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Trophy /></div><div><p className="text-xs font-bold uppercase text-primary">Nuevo récord</p><p className="font-bold capitalize">{EX_BY_ID[p.id].n}</p></div></div>
          <div className="mt-3 flex items-end gap-3"><span className="text-4xl font-extrabold text-primary">{p.now} kg</span><span className="pb-1 text-sm text-muted-foreground">antes {p.prev} kg</span></div>
          <Button variant="ghost" onClick={() => share(p)} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-card font-semibold"><Share2 className="h-4 w-4" />Compartir logro</Button>
        </div>
      ))}
      <Button variant="ghost" onClick={() => nav({ to: "/" })} className="mt-6 h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground glow">Finalizar y guardar</Button>
    </div>
  );
}
