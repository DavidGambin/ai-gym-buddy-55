import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Hand, Sparkles } from "lucide-react";
import { useState } from "react";
import { GROUPS, GROUP_LABEL, type Group } from "@/lib/exercises";
import { DAYS, DAY_LABEL, buildDay, getState, setState, type Day, type Profile } from "@/lib/store";

import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Empieza — Forma" },
      { name: "description", content: "Configura tus datos y tu semana de entreno en Forma." },
      { property: "og:title", content: "Empieza con Forma" },
      { property: "og:description", content: "Configura tu semana de entreno en un minuto." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(() => getState().profile);
  const [plan, setPlan] = useState<Record<Day, Group[]>>(() => getState().plan);
  const nav = useNavigate();

  const toggle = (d: Day, g: Group | "descanso") => setPlan((x) => {
    if (g === "descanso") return { ...x, [d]: [] };
    const cur = x[d]; return { ...x, [d]: cur.includes(g) ? cur.filter((y) => y !== g) : [...cur, g] };
  });

  function finish(mode: "manual" | "ia") {
    setState((s) => ({
      onboarded: true, profile: p, plan,
      routine: Object.fromEntries(DAYS.map((d) => [d, mode === "ia" ? buildDay(plan[d]) : s.routine[d].length && JSON.stringify(s.plan[d]) === JSON.stringify(plan[d]) ? s.routine[d] : []])) as typeof s.routine,
    }));
    nav({ to: mode === "ia" ? "/" : "/rutina" });
  }

  if (step === 0) return (
    <div className="flex min-h-screen flex-col bg-hero px-6 pb-10 pt-24">
      <div className="flex-1">
        <h1><BrandLogo stacked className="mx-auto w-full max-w-sm" /></h1>
        <p className="mt-3 max-w-xs text-lg text-muted-foreground">Tu rutina, tu progreso y un entrenador personal con IA. Todo en un sitio.</p>
      </div>
      <button onClick={() => setStep(1)} className="h-14 rounded-2xl bg-primary text-lg font-bold text-primary-foreground glow">Empezar</button>
    </div>
  );

  return (
    <div className="min-h-screen px-5 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(step - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-card" aria-label="Atrás"><ChevronLeft /></button>
        <div className="flex flex-1 gap-1.5">{[1, 2, 3].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-card"}`} />)}</div>
      </div>

      {step === 1 && (
        <>
          <h2 className="mt-8 text-3xl font-bold">Tus datos</h2>
          <p className="mt-1 text-muted-foreground">Para ajustar cargas y seguir tu evolución.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {([["weight", "Peso", "kg"], ["height", "Altura", "cm"], ["chest", "Pecho", "cm"], ["waist", "Cintura", "cm"], ["arm", "Brazo", "cm"]] as const).map(([k, l, u]) => (
              <label key={k} className={`rounded-2xl border border-border bg-card p-4 ${k === "weight" || k === "height" ? "" : ""}`}>
                <span className="text-xs text-muted-foreground">{l}</span>
                <div className="flex items-baseline gap-1"><input inputMode="decimal" type="number" value={p[k]} onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })} className="w-full bg-transparent text-2xl font-bold outline-none" /><span className="text-sm text-muted-foreground">{u}</span></div>
              </label>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="mt-8 h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground">Continuar</button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="mt-8 text-3xl font-bold">Tu semana</h2>
          <p className="mt-1 text-muted-foreground">Elige qué toca cada día.</p>
          <div className="mt-6 space-y-3">
            {DAYS.map((d) => (
              <div key={d} className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-2 font-semibold">{DAY_LABEL[d]}</p>
                <div className="flex flex-wrap gap-2">
                  {GROUPS.map((g) => <Chip key={g} on={plan[d].includes(g)} onClick={() => toggle(d, g)}>{GROUP_LABEL[g]}</Chip>)}
                  <Chip on={plan[d].length === 0} onClick={() => toggle(d, "descanso")} rest>Descanso</Chip>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setStep(3)} className="mt-6 h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground">Continuar</button>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="mt-8 text-3xl font-bold">¿Cómo armamos tus días?</h2>
          <div className="mt-6 space-y-3">
            <button onClick={() => finish("manual")} className="flex w-full gap-4 rounded-2xl border border-border bg-card p-5 text-left">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy"><Hand /></div>
              <div><p className="text-lg font-bold">Manual</p><p className="text-sm text-muted-foreground">Eliges tú los ejercicios de cada día.</p></div>
            </button>
            <button onClick={() => finish("ia")} className="flex w-full gap-4 rounded-2xl border border-primary bg-primary/10 p-5 text-left">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles /></div>
              <div><p className="text-lg font-bold">Con IA</p><p className="text-sm text-muted-foreground">Soy nuevo: crea los ejercicios según lo que toca cada día.</p></div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ on, onClick, children, rest }: { on: boolean; onClick: () => void; children: React.ReactNode; rest?: boolean }) {
  return <button onClick={onClick} className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${on ? (rest ? "border-violet bg-violet text-foreground" : "border-primary bg-primary text-primary-foreground") : "border-border text-muted-foreground"}`}>{children}</button>;
}
