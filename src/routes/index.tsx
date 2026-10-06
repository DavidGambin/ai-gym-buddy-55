import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Flame, Play, Library } from "lucide-react";
import { useEffect, useMemo } from "react";
import { BodyMap } from "@/components/BodyMap";
import { Card, ExRow, PageHeader } from "@/components/ui-forma";
import { GROUP_LABEL, MUSCLE_LABEL, type Muscle } from "@/lib/exercises";
import { DAY_LABEL, computeFatigue, fmt, levelOf, todayKey, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Forma" },
      { name: "description", content: "Tu entreno de hoy y el mapa de fatiga muscular de las últimas 48 horas." },
      { property: "og:title", content: "Forma — Tu gimnasio con coach IA" },
      { property: "og:description", content: "Entreno de hoy, mapa de fatiga y coach IA en tu bolsillo." },
    ],
  }),
  component: Index,
});

function Index() {
  const s = useStore((x) => x);
  const nav = useNavigate();
  useEffect(() => { if (s.loaded && !s.onboarded) nav({ to: "/onboarding" }); }, [s.loaded, s.onboarded, nav]);
  const fatigue = useMemo(() => computeFatigue(s), [s]);
  if (!s.loaded) return <div className="min-h-screen" />;
  const day = todayKey(); const groups = s.plan[day]; const list = s.routine[day];
  const levels = Object.fromEntries(Object.entries(fatigue).map(([m, v]) => [m, levelOf(v)])) as Record<Muscle, ReturnType<typeof levelOf>>;
  const hot = (Object.keys(levels) as Muscle[]).filter((m) => levels[m] === "high");
  const warm = (Object.keys(levels) as Muscle[]).filter((m) => levels[m] && levels[m] !== "high");
  const lastW = s.workouts[s.workouts.length - 1];

  return (
    <div className="pb-safe bg-hero">
      <PageHeader sub={new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} title="Hola 👋" right={<Link to="/biblioteca" className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card" aria-label="Biblioteca"><Library className="h-5 w-5" /></Link>} />
      <div className="space-y-4 px-5">
        <Card className="border-primary/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Hoy · {DAY_LABEL[day]}</p>
          <h2 className="mt-1 text-2xl font-bold">{groups.length ? groups.map((g) => GROUP_LABEL[g]).join(" · ") : "Descanso"}</h2>
          {groups.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{list.length} ejercicios · {list.reduce((a, r) => a + r.sets.length, 0)} series</p>
              <div className="mt-4 space-y-3">{list.slice(0, 3).map((r) => <ExRow key={r.exId} id={r.exId} />)}</div>
              <Link to="/entreno/$day" params={{ day }} className="mt-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground glow"><Play className="h-5 w-5 fill-current" />Empezar entreno</Link>
            </>
          ) : <p className="mt-2 text-sm text-muted-foreground">Recupera, estira y vuelve más fuerte mañana.</p>}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Mapa de fatiga</h3>
            <div className="flex gap-1.5 text-[10px] font-bold">
              <span className="rounded-full bg-fatigue-high/20 px-2 py-0.5 text-fatigue-high">HOY</span>
              <span className="rounded-full bg-fatigue-low/20 px-2 py-0.5 text-fatigue-low">AYER</span>
            </div>
          </div>
          <div className="mt-3"><BodyMap levels={levels} size={200} showLabels tags /></div>
          {(hot.length > 0 || warm.length > 0) && (
            <p className="mt-4 flex gap-2 rounded-xl bg-background p-3 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 shrink-0 text-coral" />
              {hot.length ? <>Aún cansado: <b className="text-foreground">{hot.map((m) => MUSCLE_LABEL[m]).join(", ")}</b>. </> : null}
              {warm.length ? <>Recuperando: {warm.map((m) => MUSCLE_LABEL[m]).join(", ")}.</> : null}
            </p>
          )}
        </Card>

        {lastW && (
          <Link to="/progreso" className="block">
            <Card className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Último entreno · {DAY_LABEL[lastW.day]}</p><p className="text-xl font-bold text-primary">{fmt(lastW.volume)} kg</p></div>
              <ChevronRight className="text-muted-foreground" />
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
