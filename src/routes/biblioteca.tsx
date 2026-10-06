import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Search } from "lucide-react";
import { useState } from "react";
import { ExRow } from "@/components/ui-forma";
import { EXERCISES, GROUPS, GROUP_LABEL, GROUP_TARGETS, type Group } from "@/lib/exercises";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de ejercicios — Forma" },
      { name: "description", content: "Cerca de 200 ejercicios con animación, músculos trabajados y guía de ejecución." },
      { property: "og:title", content: "Biblioteca de ejercicios — Forma" },
      { property: "og:description", content: "Ejercicios con GIF, músculos y pasos de ejecución." },
    ],
  }),
  component: Biblioteca,
});

function Biblioteca() {
  const [q, setQ] = useState(""); const [g, setG] = useState<Group | null>(null);
  const list = EXERCISES.filter((e) => e.n.toLowerCase().includes(q.toLowerCase()) && (!g || GROUP_TARGETS[g].includes(e.t)));
  return (
    <div className="pb-safe">
      <header className="flex items-center gap-3 px-5 pb-3 pt-6">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-card" aria-label="Volver"><ChevronLeft /></Link>
        <h1 className="text-2xl font-bold">Biblioteca</h1>
      </header>
      <div className="px-5">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio" className="h-12 flex-1 bg-transparent outline-none" /></div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-5 py-3">
        <button onClick={() => setG(null)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!g ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>Todos</button>
        {GROUPS.map((x) => <button key={x} onClick={() => setG(x)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${g === x ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{GROUP_LABEL[x]}</button>)}
      </div>
      <div className="space-y-2 px-5">
        <p className="text-xs text-muted-foreground">{list.length} ejercicios</p>
        {list.map((e) => <Link key={e.id} to="/ejercicio/$id" params={{ id: e.id }} className="block rounded-2xl bg-card p-3"><ExRow id={e.id} /></Link>)}
      </div>
    </div>
  );
}
