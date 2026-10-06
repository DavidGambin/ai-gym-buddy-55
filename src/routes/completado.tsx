import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Share2, Trophy } from "lucide-react";
import { z } from "zod";
import { BodyMap } from "@/components/BodyMap";
import { EX_BY_ID, MUSCLE_LABEL, toMuscle, type Muscle } from "@/lib/exercises";
import { bestKg, fmt, useStore, type Level } from "@/lib/store";

export const Route = createFileRoute("/completado")({
  validateSearch: z.object({ w: z.string().optional() }),
  head: () => ({ meta: [{ title: "¡Entreno completado! — Forma" }, { name: "description", content: "Resumen del entreno: músculos trabajados, volumen y récords." }, { property: "og:title", content: "¡Entreno completado! — Forma" }, { property: "og:description", content: "Músculos trabajados, volumen total y nuevos récords." }] }),
  component: Done,
});

function Done() {
  const { w } = Route.useSearch();
  const s = useStore((x) => x);
  const nav = useNavigate();
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

  return (
    <div className="min-h-screen bg-hero px-5 pb-10 pt-10">
      <h1 className="text-center text-3xl font-extrabold">¡Entreno completado!</h1>
      <p className="mt-1 text-center text-muted-foreground">{Math.round(wk.durationSec / 60)} min · {logs.length} series</p>
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
