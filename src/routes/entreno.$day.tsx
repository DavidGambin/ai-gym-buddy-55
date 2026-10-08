import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronLeft, Clock, Minus, Plus, Repeat, Trash2, Users } from "lucide-react";
import { GroupedList, SearchFilters } from "@/components/ExercisePicker";
import type { Group } from "@/lib/exercises";
import { useEffect, useState } from "react";
import { AnimatedNumber, ExRow } from "@/components/ui-forma";
import { EX_BY_ID, GROUP_LABEL, alternativeFor, demand, eqLabel, muscleLabel } from "@/lib/exercises";
import { SpotifyPlayer } from "@/components/SpotifyPlayer";
import { DAYS, DAY_LABEL, defaultSets, getState, setState, type Day, type SetLog } from "@/lib/store";

const LIVE_KEY = (d: string) => `forma.live.${d}`;

export const Route = createFileRoute("/entreno/$day")({
  loader: ({ params }) => { if (!DAYS.includes(params.day as Day)) throw notFound(); return { day: params.day as Day }; },
  head: () => ({ meta: [{ title: "Entreno en vivo — Forma" }, { name: "description", content: "Registra series, peso y repeticiones en tiempo real." }, { property: "og:title", content: "Entreno en vivo — Forma" }, { property: "og:description", content: "Registra tu entreno en directo." }] }),
  notFoundComponent: () => <p className="p-10 text-center">Día no válido.</p>,
  errorComponent: () => <p className="p-10 text-center">No se pudo cargar el entreno.</p>,
  component: Live,
});

type LSet = { kg: number; reps: number; done: boolean };
type LEx = { exId: string; sets: LSet[] };

function Live() {
  const { day } = Route.useLoaderData();
  const nav = useNavigate();
  const [items, setItems] = useState<LEx[] | null>(null);
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  const [adding, setAdding] = useState(false);
  const [aq, setAq] = useState(""); const [ag, setAg] = useState<Group[]>(() => getState().plan[day]);
  const [busy, setBusy] = useState<{ from: string[]; to: string[]; ex: string } | null>(null);
  const [swap, setSwap] = useState<{ i: number; to: string } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LIVE_KEY(day)) || "null") as { start: number; items: LEx[] } | null;
      if (saved && Date.now() - saved.start < 12 * 3600e3) { setStart(saved.start); setItems(saved.items); return; }
    } catch { /* */ }
    const st = Date.now(); setStart(st);
    setItems(getState().routine[day].map((r) => ({ exId: r.exId, sets: r.sets.map((s) => ({ ...s, done: false })) })));
  }, [day]);
  useEffect(() => { if (items) localStorage.setItem(LIVE_KEY(day), JSON.stringify({ start, items })); }, [items, start, day]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!items) return <div className="min-h-screen" />;

  const vol = items.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.done ? s.kg * s.reps : 0), 0), 0);
  const sec = Math.floor((now - start) / 1000);
  const time = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const upd = (i: number, f: (e: LEx) => LEx) => setItems(items.map((e, k) => (k === i ? f(structuredClone(e)) : e)));

  function move(i: number, d: number) {
    const n = [...items!]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x!); setItems(n);
  }

  function occupied(i: number) {
    const ids = items!.map((e) => e.exId);
    const done = items!.filter((e) => e.sets.every((s) => s.done)).map((e) => e.exId);
    const pending = ids.filter((id) => !done.includes(id) && id !== ids[i]).sort((a, b) => demand(EX_BY_ID[b]) - demand(EX_BY_ID[a]));
    const pos = Math.min(pending.length, Math.max(1, Math.ceil(pending.length / 2)));
    const to = [...done, ...pending.slice(0, pos), ids[i], ...pending.slice(pos)];
    setBusy({ from: ids, to, ex: ids[i] });
  }

  function finish() {
    const ts = Date.now(); const id = "w" + ts;
    const logs: SetLog[] = items!.flatMap((e) => e.sets.filter((s) => s.done).map((s) => ({ exId: e.exId, kg: s.kg, reps: s.reps, ts, workoutId: id })));
    setState((s) => ({
      sets: [...s.sets, ...logs],
      workouts: [...s.workouts, { id, day, ts, durationSec: sec, volume: vol, exIds: [...new Set(logs.map((l) => l.exId))] }],
      routine: { ...s.routine, [day]: items!.map((e) => ({ exId: e.exId, sets: e.sets.map(({ kg, reps }) => ({ kg, reps })) })) },
    }));
    localStorage.removeItem(LIVE_KEY(day));
    nav({ to: "/completado", search: { w: id } });
  }

  const groups = getState().plan[day];
  return (
    <div className="pb-48">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-5 pb-3 pt-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-card" aria-label="Salir"><ChevronLeft /></Link>
          <p className="font-bold">{DAY_LABEL[day]} · {groups.map((g) => GROUP_LABEL[g]).join(", ") || "Libre"}</p>
          <span className="flex items-center gap-1 font-mono text-lg font-bold text-primary"><Clock className="h-4 w-4" />{time}</span>
        </div>
        <div className="mt-3 rounded-2xl bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volumen total</p>
          <p className="text-4xl font-extrabold text-primary"><AnimatedNumber value={vol} /> <span className="text-xl">kg</span></p>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {items.map((e, i) => (
          <div key={e.exId + i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-2">
              <Link to="/ejercicio/$id" params={{ id: e.exId }} className="min-w-0 flex-1"><ExRow id={e.exId} /></Link>
              <div className="flex shrink-0 gap-1">
                <button disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
                <button disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30" aria-label="Bajar"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm("¿Quitar este ejercicio del entreno?")) setItems(items.filter((_, k) => k !== i)); }} className="grid h-8 w-8 place-items-center rounded-full bg-destructive/20 text-destructive" aria-label="Quitar ejercicio"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[32px_28px_1fr_16px_1fr_44px] items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <span /><span>Serie</span><span className="text-center">kg</span><span /><span className="text-center">Reps</span><span />
            </div>
            {e.sets.map((s, k) => (
              <div key={k} className={`mt-2 grid grid-cols-[32px_28px_1fr_16px_1fr_44px] items-center gap-2 rounded-xl ${s.done ? "bg-primary/10" : ""}`}>
                <button onClick={() => upd(i, (x) => { x.sets.splice(k, 1); return x; })} className="grid h-8 w-8 place-items-center rounded-full bg-destructive/20 text-destructive" aria-label="Quitar serie"><Minus className="h-4 w-4" /></button>
                <span className="text-center font-bold">{k + 1}</span>
                <input type="number" inputMode="decimal" value={s.kg} onChange={(ev) => upd(i, (x) => { x.sets[k].kg = Number(ev.target.value); return x; })} className="h-11 w-full rounded-xl bg-background text-center text-lg font-bold outline-none focus:ring-2 focus:ring-primary" />
                <span className="text-center text-muted-foreground">×</span>
                <input type="number" inputMode="numeric" value={s.reps} onChange={(ev) => upd(i, (x) => { x.sets[k].reps = Number(ev.target.value); return x; })} className="h-11 w-full rounded-xl bg-background text-center text-lg font-bold outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={() => upd(i, (x) => { x.sets[k].done = !x.sets[k].done; return x; })} className={`grid h-11 w-11 place-items-center rounded-full border-2 transition ${s.done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`} aria-label="Completar serie"><Check className="h-5 w-5" strokeWidth={3} /></button>
              </div>
            ))}
            <button onClick={() => upd(i, (x) => { const l = x.sets[x.sets.length - 1] ?? { kg: 20, reps: 10 }; x.sets.push({ kg: l.kg, reps: l.reps, done: false }); return x; })} className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-background font-semibold"><Plus className="h-4 w-4" />Añadir serie</button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => occupied(i)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-coral/50 font-semibold text-coral"><Users className="h-4 w-4" />Ocupada</button>
              <button onClick={() => { const a = alternativeFor(e.exId, items.map((x) => x.exId)); if (a) setSwap({ i, to: a.id }); }} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-violet/60 font-semibold"><Repeat className="h-4 w-4" />Cambiar</button>
            </div>
          </div>
        ))}
        <button onClick={() => setAdding(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/60 font-semibold text-primary"><Plus className="h-4 w-4" />Añadir ejercicio</button>
        <button onClick={finish} className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground glow">Terminar entreno</button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md p-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
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
          <button onClick={() => { setItems(busy.to.map((id) => items.find((x) => x.exId === id)!)); setBusy(null); }} className="mt-4 h-13 w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground">Aceptar orden</button>
        </Sheet>
      )}
      {adding && (
        <Sheet onClose={() => setAdding(false)} title="Añadir ejercicio">
          <SearchFilters q={aq} setQ={setAq} groups={ag} setGroups={setAg} />
          <div className="max-h-[55vh] overflow-y-auto">
            <GroupedList q={aq} groups={ag} render={(x) => (
              <button key={x.id} onClick={() => { setItems([...items, { exId: x.id, sets: defaultSets().map((s) => ({ ...s, done: false })) }]); setAdding(false); setAq(""); }} className="block w-full rounded-xl bg-background p-2.5 text-left"><ExRow id={x.id} /></button>
            )} />
          </div>
        </Sheet>
      )}
      {swap && (
        <Sheet onClose={() => setSwap(null)} title="Alternativa sugerida">
          <p className="mb-3 text-sm text-muted-foreground">Mismo músculo ({muscleLabel(EX_BY_ID[swap.to].t)}), distinto equipamiento: {eqLabel(EX_BY_ID[items[swap.i].exId].eq)} → <b className="text-foreground">{eqLabel(EX_BY_ID[swap.to].eq)}</b>.</p>
          <div className="rounded-xl bg-background p-3"><ExRow id={swap.to} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => { const a = alternativeFor(items[swap.i].exId, [...items.map((x) => x.exId), swap.to]); if (a) setSwap({ ...swap, to: a.id }); }} className="rounded-2xl border border-border py-3.5 font-semibold">Otra</button>
            <button onClick={() => { upd(swap.i, (x) => ({ ...x, exId: swap.to })); setSwap(null); }} className="rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground">Sustituir</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t border-border bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
