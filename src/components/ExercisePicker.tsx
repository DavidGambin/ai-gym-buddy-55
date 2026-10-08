import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EXERCISES, GROUPS, GROUP_LABEL, GROUP_TARGETS, eqLabel, groupOf, muscleLabel, type Exercise, type Group } from "@/lib/exercises";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Busca por nombre, músculo, grupo o equipamiento y agrupa por grupo muscular. */
export function useExerciseSearch(q: string, groups: Group[]) {
  return useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const list = EXERCISES.filter((e) => {
      if (groups.length && !groups.some((g) => GROUP_TARGETS[g].includes(e.t))) return false;
      if (!words.length) return true;
      const hay = norm(`${e.n} ${muscleLabel(e.t)} ${e.t} ${GROUP_LABEL[groupOf(e)]} ${eqLabel(e.eq)} ${e.s.join(" ")}`);
      return words.every((w) => hay.includes(w));
    });
    const by = new Map<Group, Exercise[]>();
    for (const e of list) { const g = groupOf(e); if (!by.has(g)) by.set(g, []); by.get(g)!.push(e); }
    return { total: list.length, sections: GROUPS.filter((g) => by.has(g)).map((g) => ({ g, items: by.get(g)! })) };
  }, [q, groups]);
}

export function SearchFilters({ q, setQ, groups, setGroups }: { q: string; setQ: (v: string) => void; groups: Group[]; setGroups: (g: Group[]) => void }) {
  return (
    <>
      <div className="flex items-center gap-2 rounded-xl bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, músculo o material" className="h-12 flex-1 bg-transparent outline-none" /></div>
      <div className="flex gap-2 overflow-x-auto py-3">
        <button onClick={() => setGroups([])} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!groups.length ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>Todos</button>
        {GROUPS.map((x) => {
          const on = groups.includes(x);
          return <button key={x} onClick={() => setGroups(on ? groups.filter((g) => g !== x) : [...groups, x])} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{GROUP_LABEL[x]}</button>;
        })}
      </div>
    </>
  );
}

export function GroupedList({ q, groups, render }: { q: string; groups: Group[]; render: (e: Exercise) => React.ReactNode }) {
  const { total, sections } = useExerciseSearch(q, groups);
  const [limit, setLimit] = useState(60);
  let shown = 0;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{total} ejercicios</p>
      {sections.map(({ g, items }) => {
        if (shown >= limit) return null;
        const slice = items.slice(0, limit - shown); shown += slice.length;
        return (
          <div key={g} className="space-y-2">
            <p className="sticky top-0 z-10 bg-background/95 py-2 text-sm font-bold uppercase tracking-wider text-primary">{GROUP_LABEL[g]} · {items.length}</p>
            {slice.map(render)}
          </div>
        );
      })}
      {total > limit && <button onClick={() => setLimit(limit + 80)} className="h-11 w-full rounded-xl bg-card font-semibold">Ver más</button>}
    </div>
  );
}
