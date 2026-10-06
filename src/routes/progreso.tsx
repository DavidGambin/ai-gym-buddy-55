import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from "recharts";
import { useMemo, useState } from "react";
import { Card, PageHeader, Thumb } from "@/components/ui-forma";
import { EX_BY_ID } from "@/lib/exercises";
import { DAY_LABEL, fmt, useStore } from "@/lib/store";

export const Route = createFileRoute("/progreso")({
  head: () => ({ meta: [{ title: "Progreso — Forma" }, { name: "description", content: "Récords por ejercicio, evolución de pesos e historial de entrenos." }, { property: "og:title", content: "Mi progreso — Forma" }, { property: "og:description", content: "Récords, gráficas de evolución e historial de entrenos." }] }),
  component: Progreso,
});

function Progreso() {
  const s = useStore((x) => x);
  const [tab, setTab] = useState<"rec" | "hist">("rec");
  const data = useMemo(() => {
    const by: Record<string, { ts: number; kg: number }[]> = {};
    for (const l of s.sets) { const arr = (by[l.exId] ??= []); const last = arr[arr.length - 1]; if (last && last.ts === l.ts) last.kg = Math.max(last.kg, l.kg); else arr.push({ ts: l.ts, kg: l.kg }); }
    const week = Date.now() - 7 * 864e5;
    return Object.entries(by).map(([id, h]) => {
      const max = Math.max(...h.map((x) => x.kg)); const prIdx = h.findIndex((x) => x.kg === max);
      const recent = h[prIdx].ts > week && h.slice(0, prIdx).some((x) => x.kg < max);
      return { id, h: h.slice(-8), max, recent };
    }).sort((a, b) => Number(b.recent) - Number(a.recent));
  }, [s.sets]);
  if (!s.loaded) return null;

  return (
    <div className="pb-safe">
      <PageHeader title="Progreso" sub={`${s.workouts.length} entrenos`} />
      <div className="mx-5 mb-4 flex rounded-full bg-card p-1 text-sm font-semibold">
        {([["rec", "Récords"], ["hist", "Historial"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}
      </div>
      <div className="space-y-3 px-5">
        {tab === "rec" && data.map((d) => (
          <Card key={d.id}>
            <Link to="/ejercicio/$id" params={{ id: d.id }} className="flex items-center gap-3">
              <Thumb id={d.id} size={44} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold capitalize">{EX_BY_ID[d.id]?.n}</p><p className="text-sm"><span className="font-bold text-primary">{d.max} kg</span> <span className="text-muted-foreground">récord</span></p></div>
              {d.recent ? <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground">PR</span> : <span className="text-xs text-muted-foreground">sin récord</span>}
            </Link>
            <div className="mt-3 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.h.map((x) => ({ ...x, l: new Date(x.ts).toLocaleDateString("es-ES", { day: "numeric", month: "numeric" }) }))}>
                  <XAxis dataKey="l" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="kg" radius={[6, 6, 6, 6]}>{d.h.map((_, i) => <Cell key={i} fill={i === d.h.length - 1 ? "var(--primary)" : "var(--accent)"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
        {tab === "hist" && [...s.workouts].reverse().map((w) => (
          <Link key={w.id} to="/completado" search={{ w: w.id }} className="block">
            <Card className="flex items-center justify-between">
              <div><p className="font-bold">{DAY_LABEL[w.day]}</p><p className="text-xs text-muted-foreground">{new Date(w.ts).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })} · {Math.round(w.durationSec / 60)} min · {w.exIds.length} ejercicios</p></div>
              <p className="text-lg font-bold text-primary">{fmt(w.volume)} kg</p>
            </Card>
          </Link>
        ))}
        {data.length === 0 && <p className="text-center text-muted-foreground">Completa tu primer entreno para ver tu progreso.</p>}
      </div>
    </div>
  );
}
