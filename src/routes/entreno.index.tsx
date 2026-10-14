import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import { PageHeader } from "@/components/ui-forma";
import { GROUP_LABEL } from "@/lib/exercises";
import { DAYS, DAY_LABEL, todayKey, useStore } from "@/lib/store";

export const Route = createFileRoute("/entreno/")({
  head: () => ({ meta: [{ title: "Elige tu rutina — SpotterBro.ai" }, { name: "description", content: "Elige qué rutina entrenar hoy." }, { property: "og:title", content: "Elige tu rutina — SpotterBro.ai" }, { property: "og:description", content: "Elige qué rutina entrenar hoy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Pick,
});

function Pick() {
  const active = useStore((s) => s.activeWorkout);
  const routine = useStore((s) => s.routine);
  const plan = useStore((s) => s.plan);
  if (active) return <Navigate to="/entreno/$day" params={{ day: active.day }} replace />;
  const days = DAYS.filter((d) => routine[d].length > 0);
  const today = todayKey();
  return (
    <div className="pb-28">
      <PageHeader sub="Nuevo entreno" title="¿Qué entrenas hoy?" />
      <div className="space-y-3 px-4">
        {days.length === 0 && <p className="rounded-2xl border border-border bg-card p-5 text-center text-muted-foreground">Aún no tienes rutinas. <Link to="/rutina" className="font-semibold text-primary">Crea una</Link>.</p>}
        {days.map((d) => (
          <Link key={d} to="/entreno/$day" params={{ day: d }} className={`flex items-center gap-3 rounded-2xl border bg-card p-4 ${d === today ? "border-primary" : "border-border"}`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="h-5 w-5 fill-current" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{DAY_LABEL[d]}{d === today && <span className="ml-2 text-xs text-primary">HOY</span>}</p>
              <p className="truncate text-sm text-muted-foreground">{plan[d].map((g) => GROUP_LABEL[g]).join(" · ") || "Libre"} · {routine[d].length} ejercicios</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
