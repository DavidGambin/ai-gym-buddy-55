import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Plus, Sparkles, Trash2, X, Search } from "lucide-react";
import { useState } from "react";
import { Card, ExRow, PageHeader } from "@/components/ui-forma";
import { EXERCISES, GROUP_LABEL, GROUP_TARGETS, eqLabel, muscleLabel } from "@/lib/exercises";
import { DAYS, DAY_LABEL, buildDay, defaultSets, mutateRoutine, todayKey, useStore, type Day } from "@/lib/store";

export const Route = createFileRoute("/rutina")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Mi rutina — SpotterBro.ai" },
      { name: "description", content: "Tu plan semanal de entreno día a día, editable a mano o con IA." },
      { property: "og:title", content: "Mi rutina semanal — SpotterBro.ai" },
      { property: "og:description", content: "Plan semanal editable con ejercicios por grupo muscular." },
    ],
  }),
  component: Rutina,
});

function Rutina() {
  const plan = useStore((s) => s.plan); const routine = useStore((s) => s.routine); const loaded = useStore((s) => s.loaded);
  const [day, setDay] = useState<Day>(todayKey());
  const [picker, setPicker] = useState(false);
  if (!loaded) return null;
  const list = routine[day];
  return (
    <div className="pb-safe">
      <PageHeader title="Rutina" sub="Tu semana" />
      <div className="flex gap-2 overflow-x-auto px-5 pb-2">
        {DAYS.map((d) => (
          <button key={d} onClick={() => setDay(d)} className={`shrink-0 rounded-2xl px-4 py-2.5 text-left ${d === day ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            <p className="text-xs font-bold">{DAY_LABEL[d].slice(0, 3)}</p>
            <p className={`text-[11px] ${d === day ? "" : "text-muted-foreground"}`}>{plan[d].length ? plan[d].map((g) => GROUP_LABEL[g].slice(0, 4)).join("/") : "Desc."}</p>
          </button>
        ))}
      </div>
      <div className="space-y-3 px-5 pt-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{DAY_LABEL[day]} · {plan[day].map((g) => GROUP_LABEL[g]).join(", ") || "Descanso"}</h2>
        </div>
        {list.map((r, i) => (
          <Card key={r.exId + i} className="p-3">
            <Link to="/ejercicio/$id" params={{ id: r.exId }}>
              <ExRow id={r.exId} right={
                <button onClick={(e) => { e.preventDefault(); mutateRoutine((x) => { x[day].splice(i, 1); return x; }); }} className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground" aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>
              } />
            </Link>
            <p className="mt-2 pl-[68px] text-xs text-muted-foreground">{r.sets.length} series · {r.sets[0]?.kg ?? 0} kg × {r.sets[0]?.reps ?? 0}</p>
          </Card>
        ))}
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Sin ejercicios todavía.</p>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setPicker(true)} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card font-semibold"><Plus className="h-4 w-4" />Añadir</button>
          <button disabled={!plan[day].length} onClick={() => mutateRoutine((x) => { x[day] = buildDay(plan[day]); return x; })} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet bg-violet/20 font-semibold disabled:opacity-40"><Sparkles className="h-4 w-4" />Generar</button>
        </div>
        {list.length > 0 && <Link to="/entreno/$day" params={{ day }} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground"><Play className="h-5 w-5 fill-current" />Entrenar {DAY_LABEL[day]}</Link>}
      </div>
      {picker && <Picker day={day} onClose={() => setPicker(false)} groups={plan[day]} />}
    </div>
  );
}

function Picker({ day, onClose, groups }: { day: Day; onClose: () => void; groups: string[] }) {
  const [q, setQ] = useState("");
  const targets = groups.flatMap((g) => GROUP_TARGETS[g as keyof typeof GROUP_TARGETS] ?? []);
  const list = EXERCISES.filter((e) => e.n.toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(targets.includes(b.t)) - Number(targets.includes(a.t))).slice(0, 60);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 p-4">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio" className="h-11 flex-1 bg-transparent outline-none" /></div>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl bg-card" aria-label="Cerrar"><X /></button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-10">
        {list.map((e) => (
          <button key={e.id} onClick={() => { mutateRoutine((x) => { x[day].push({ exId: e.id, sets: defaultSets() }); return x; }); onClose(); }} className="block w-full rounded-xl bg-card p-3 text-left">
            <ExRow id={e.id} right={<span className="text-[11px] text-muted-foreground">{eqLabel(e.eq)}<br />{muscleLabel(e.t)}</span>} />
          </button>
        ))}
      </div>
    </div>
  );
}
