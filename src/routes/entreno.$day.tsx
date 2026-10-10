import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronLeft, Clock, Minus, Plus, Repeat, Trash2, Users } from "lucide-react";
import { GroupedList, SearchFilters } from "@/components/ExercisePicker";
import type { Group } from "@/lib/exercises";
import { useEffect, useState } from "react";
import { AnimatedNumber, ExRow } from "@/components/ui-forma";
import { EX_BY_ID, GROUP_LABEL, alternativeFor, demand, eqLabel, muscleLabel } from "@/lib/exercises";
import { SpotifyPlayer } from "@/components/SpotifyPlayer";
import { DAYS, DAY_LABEL, defaultSets, getState, setState, useStore, effectiveLoad, formatDuration, type Day, type SetLog } from "@/lib/store";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/entreno/$day")({
  loader: ({ params }) => { if (!DAYS.includes(params.day as Day)) throw notFound(); return { day: params.day as Day }; },
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Entreno en vivo — SpotterBro.ai" }, { name: "description", content: "Registra series, peso y repeticiones en tiempo real." }, { property: "og:title", content: "Entreno en vivo — SpotterBro.ai" }, { property: "og:description", content: "Registra tu entreno en directo." }] }),
  notFoundComponent: () => <p className="p-10 text-center">Día no válido.</p>,
  errorComponent: () => <p className="p-10 text-center">No se pudo cargar el entreno.</p>,
  component: Live,
});

type LSet = { kg: number; reps: number; done: boolean };
type LEx = { exId: string; sets: LSet[] };

function Live() {
  const { day } = Route.useLoaderData();
  const nav = useNavigate();
  const profile = useStore((s) => s.profile);
  const loaded = useStore((s) => s.loaded);
  const [items, setItems] = useState<LEx[] | null>(null);
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  const [adding, setAdding] = useState(false);
  const [aq, setAq] = useState(""); const [ag, setAg] = useState<Group[]>(() => getState().plan[day]);
  const [busy, setBusy] = useState<{ from: string[]; to: string[]; ex: string } | null>(null);
  const [swap, setSwap] = useState<{ i: number; to: string } | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const active = getState().activeWorkout;
    if (active) {
      if (active.day !== day) { void nav({ to: "/entreno/$day", params: { day: active.day }, replace: true }); return; }
      setStart(active.start); setNow(Date.now()); setItems(active.items); return;
    }
    const st = Date.now(); setStart(st); setNow(st);
    setItems(getState().routine[day].map((r) => ({ exId: r.exId, sets: r.sets.map((s) => ({ ...s, done: false })) })));
  }, [day, nav, loaded]);
  useEffect(() => { if (items) setState(() => ({ activeWorkout: { day, start, items } })); }, [items, start, day]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!items) return <div className="min-h-screen" />;

  const vol = items.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.done ? effectiveLoad(e.exId, s.kg, profile.weight) * s.reps : 0), 0), 0);
  const sec = Math.max(0, Math.floor((now - start) / 1000));
  const time = formatDuration(sec);
  const upd = (i: number, f: (e: LEx) => LEx) => setItems(items.map((e, k) => (k === i ? f(structuredClone(e)) : e)));

  function move(i: number, d: number) {
    if (!items) return; const n = [...items]; const [x] = n.splice(i, 1); if (!x) return; n.splice(i + d, 0, x); setItems(n);
  }

  function occupied(i: number) {
    if (!items) return;
    const ids = items.map((e) => e.exId);
    const done = items.filter((e) => e.sets.every((s) => s.done)).map((e) => e.exId);
    const pending = ids.filter((id) => !done.includes(id) && id !== ids[i]).sort((a, b) => demand(EX_BY_ID[b]) - demand(EX_BY_ID[a]));
    const pos = Math.min(pending.length, Math.max(1, Math.ceil(pending.length / 2)));
    const to = [...done, ...pending.slice(0, pos), ids[i], ...pending.slice(pos)];
    setBusy({ from: ids, to, ex: ids[i] });
  }

  function finish() {
    if (!items) return;
    const ts = Date.now(); const id = "w" + ts;
    const logs: SetLog[] = items.flatMap((e) => e.sets.filter((s) => s.done).map((s) => ({ exId: e.exId, kg: EX_BY_ID[e.exId]?.eq === "body weight" ? profile.weight : s.kg, effectiveKg: effectiveLoad(e.exId, s.kg, profile.weight), reps: s.reps, ts, workoutId: id })));
    setState((s) => ({
      activeWorkout: undefined,
      sets: [...s.sets, ...logs],
      workouts: [...s.workouts, { id, day, ts, durationSec: sec, volume: vol, exIds: [...new Set(logs.map((l) => l.exId))] }],
      routine: { ...s.routine, [day]: items.map((e) => ({ exId: e.exId, sets: e.sets.map(({ kg, reps }) => ({ kg, reps })) })) },
    }));

    nav({ to: "/completado", search: { w: id } });
  }

  const groups = getState().plan[day];
  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+17rem)]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-xl">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2">
          <Link to="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card" aria-label="Salir"><ChevronLeft /></Link>
          <div className="min-w-0"><p className="font-bold">{DAY_LABEL[day]}</p><p className="truncate text-xs text-muted-foreground">{groups.map((g) => GROUP_LABEL[g]).join(" · ") || "Libre"}</p></div>
          <span className="shrink-0 font-mono text-base font-bold tabular-nums text-primary">{time}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2"><p className="text-xs text-muted-foreground">Volumen total</p><p className="text-2xl font-extrabold text-primary"><AnimatedNumber value={vol} /> <span className="text-sm">kg</span></p></div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {items.map((e, i) => (
          <div key={e.exId + i} className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Link to="/ejercicio/$id" params={{ id: e.exId }} className="min-w-0 flex-1"><ExRow id={e.exId} /></Link>
              <div className="flex shrink-0 justify-end gap-1">
                <Button variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30" aria-label="Bajar"><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" onClick={() => { if (confirm("¿Quitar este ejercicio del entreno?")) setItems(items.filter((_, k) => k !== i)); }} className="grid h-8 w-8 place-items-center rounded-full bg-destructive/20 text-destructive" aria-label="Quitar ejercicio"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[28px_24px_minmax(0,1fr)_12px_minmax(0,1fr)_40px] items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground">
              <span /><span>Serie</span><span className="text-center">{EX_BY_ID[e.exId]?.eq === "dumbbell" ? "kg / manc." : "kg"}</span><span /><span className="text-center">Reps</span><span />
            </div>
            {e.sets.map((s, k) => (
              <div key={k} className={`mt-2 grid grid-cols-[28px_24px_minmax(0,1fr)_12px_minmax(0,1fr)_40px] items-center gap-1 rounded-xl ${s.done ? "bg-primary/10" : ""}`}>
                <Button variant="ghost" onClick={() => upd(i, (x) => { x.sets.splice(k, 1); return x; })} className="grid h-8 w-8 place-items-center rounded-full bg-destructive/20 text-destructive" aria-label="Quitar serie"><Minus className="h-4 w-4" /></Button>
                <span className="text-center font-bold">{k + 1}</span>
                <input type="number" inputMode="decimal" min={0} step="0.5" aria-label="Peso de la serie" readOnly={EX_BY_ID[e.exId]?.eq === "body weight"} value={EX_BY_ID[e.exId]?.eq === "body weight" ? profile.weight : s.kg} onChange={(ev) => upd(i, (x) => { x.sets[k].kg = Math.max(0, Number(ev.target.value)); return x; })} className="h-11 w-full rounded-xl bg-background text-center text-lg font-bold outline-none focus:ring-2 focus:ring-primary" />
                <span className="text-center text-muted-foreground">×</span>
                <input type="number" inputMode="numeric" min={0} aria-label="Repeticiones de la serie" value={s.reps} onChange={(ev) => upd(i, (x) => { x.sets[k].reps = Math.max(0, Number(ev.target.value)); return x; })} className="h-11 w-full rounded-xl bg-background text-center text-lg font-bold outline-none focus:ring-2 focus:ring-primary" />
                <Button variant="ghost" onClick={() => upd(i, (x) => { x.sets[k].done = !x.sets[k].done; return x; })} className={`grid h-10 w-10 place-items-center rounded-full border-2 transition ${s.done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`} aria-label="Completar serie"><Check className="h-5 w-5" strokeWidth={3} /></Button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => upd(i, (x) => { const l = x.sets[x.sets.length - 1] ?? { kg: 20, reps: 10 }; x.sets.push({ kg: l.kg, reps: l.reps, done: false }); return x; })} className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-background font-semibold"><Plus className="h-4 w-4" />Añadir serie</Button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => occupied(i)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-coral/50 font-semibold text-coral"><Users className="h-4 w-4" />Ocupada</Button>
              <Button variant="ghost" onClick={() => { const a = alternativeFor(e.exId, items.map((x) => x.exId)); if (a) setSwap({ i, to: a.id }); }} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-violet/60 font-semibold"><Repeat className="h-4 w-4" />Cambiar</Button>
            </div>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setAdding(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/60 font-semibold text-primary"><Plus className="h-4 w-4" />Añadir ejercicio</Button>
        <Button variant="ghost" onClick={finish} className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground glow">Terminar entreno</Button>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 mx-auto w-full max-w-2xl p-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
        <SpotifyPlayer compact />
      </div>

      {busy && (
        <Sheet onClose={() => setBusy(null)} title="Nuevo orden propuesto">
          <p className="mb-3 text-sm text-muted-foreground">Compuestos primero; <b className="text-foreground capitalize">{EX_BY_ID[busy.ex].n}</b> pasa más abajo mientras se libera.</p>
          <div className="space-y-2">
            {busy.to.map((id, k) => {
              const old = busy.from.indexOf(id); const moved = old !== k;
              return (
                <div key={id} className={`flex items-center gap-3 rounded-xl p-2.5 ${id === busy.ex ? "bg-coral/15" : "bg-background"}`}>
                  <span className="w-12 text-center text-xs text-muted-foreground">{old + 1}<ArrowRight className="mx-0.5 inline h-3 w-3" /><b className={moved ? "text-primary" : "text-foreground"}>{k + 1}</b></span>
                  <span className="flex-1 truncate text-sm font-semibold capitalize">{EX_BY_ID[id].n}</span>
                  {moved && (k > old ? <ArrowDown className="h-4 w-4 text-coral" /> : <ArrowDown className="h-4 w-4 rotate-180 text-primary" />)}
                </div>
              );
            })}
          </div>
          <Button variant="ghost" onClick={() => { setItems(busy.to.flatMap((id) => { const found = items.find((x) => x.exId === id); return found ? [found] : []; })); setBusy(null); }} className="mt-4 h-13 w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground">Aceptar orden</Button>
        </Sheet>
      )}
      {adding && (
        <Sheet onClose={() => setAdding(false)} title="Añadir ejercicio">
          <SearchFilters q={aq} setQ={setAq} groups={ag} setGroups={setAg} />
          <div className="max-h-[55vh] overflow-y-auto">
            <GroupedList q={aq} groups={ag} render={(x) => (
              <Button variant="ghost" key={x.id} onClick={() => { setItems([...items, { exId: x.id, sets: defaultSets().map((s) => ({ ...s, done: false })) }]); setAdding(false); setAq(""); }} className="block w-full rounded-xl bg-background p-2.5 text-left"><ExRow id={x.id} /></Button>
            )} />
          </div>
        </Sheet>
      )}
      {swap && (
        <Sheet onClose={() => setSwap(null)} title="Alternativa sugerida">
          <p className="mb-3 text-sm text-muted-foreground">Mismo músculo ({muscleLabel(EX_BY_ID[swap.to].t)}), distinto equipamiento: {eqLabel(EX_BY_ID[items[swap.i].exId].eq)} → <b className="text-foreground">{eqLabel(EX_BY_ID[swap.to].eq)}</b>.</p>
          <div className="rounded-xl bg-background p-3"><ExRow id={swap.to} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => { const a = alternativeFor(items[swap.i].exId, [...items.map((x) => x.exId), swap.to]); if (a) setSwap({ ...swap, to: a.id }); }} className="rounded-2xl border border-border py-3.5 font-semibold">Otra</Button>
            <Button variant="ghost" onClick={() => { upd(swap.i, (x) => ({ ...x, exId: swap.to })); setSwap(null); }} className="rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground">Sustituir</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-2xl max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 pb-[max(env(safe-area-inset-bottom),2rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
