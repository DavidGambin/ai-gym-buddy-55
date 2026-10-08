import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { ExRow } from "@/components/ui-forma";
import { GroupedList, SearchFilters } from "@/components/ExercisePicker";
import type { Group } from "@/lib/exercises";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de ejercicios — Forma" },
      { name: "description", content: "Más de 1.300 ejercicios con animación, músculos trabajados y guía de ejecución." },
      { property: "og:title", content: "Biblioteca de ejercicios — Forma" },
      { property: "og:description", content: "Ejercicios con GIF, músculos y pasos de ejecución." },
    ],
  }),
  component: Biblioteca,
});

function Biblioteca() {
  const [q, setQ] = useState(""); const [groups, setGroups] = useState<Group[]>([]);
  return (
    <div className="pb-safe">
      <header className="flex items-center gap-3 px-5 pb-3 pt-6">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-card" aria-label="Volver"><ChevronLeft /></Link>
        <h1 className="text-2xl font-bold">Biblioteca</h1>
      </header>
      <div className="px-5">
        <SearchFilters q={q} setQ={setQ} groups={groups} setGroups={setGroups} />
        <GroupedList q={q} groups={groups} render={(e) => <Link key={e.id} to="/ejercicio/$id" params={{ id: e.id }} className="block rounded-2xl bg-card p-3"><ExRow id={e.id} /></Link>} />
      </div>
    </div>
  );
}
