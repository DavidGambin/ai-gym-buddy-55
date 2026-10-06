import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, Home, LineChart, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EX_BY_ID, eqLabel, gifUrl, muscleLabel } from "@/lib/exercises";
import { fmt } from "@/lib/store";

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/onboarding") || path.startsWith("/entreno") || path.startsWith("/completado")) return null;
  const items = [
    { to: "/", label: "Inicio", Icon: Home },
    { to: "/rutina", label: "Rutina", Icon: Dumbbell },
    { to: "/progreso", label: "Progreso", Icon: LineChart },
    { to: "/coach", label: "Coach IA", Icon: Sparkles },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-md justify-around py-2">
        {items.map(({ to, label, Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link key={to} to={to} className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />{label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Thumb({ id, size = 56 }: { id: string; size?: number }) {
  const e = EX_BY_ID[id];
  return (
    <div className="shrink-0 overflow-hidden rounded-xl bg-foreground" style={{ width: size, height: size }}>
      {e && <img src={gifUrl(e)} alt={e.n} loading="lazy" className="h-full w-full object-cover" />}
    </div>
  );
}

export function ExRow({ id, right }: { id: string; right?: React.ReactNode }) {
  const e = EX_BY_ID[id]; if (!e) return null;
  return (
    <div className="flex items-center gap-3">
      <Thumb id={id} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold capitalize">{e.n}</p>
        <p className="text-xs text-muted-foreground">{eqLabel(e.eq)} · {muscleLabel(e.t)}</p>
      </div>
      {right}
    </div>
  );
}

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(); const a = from.current; let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 500); const v = a + (value - a) * (1 - Math.pow(1 - p, 3));
      setShown(v); if (p < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{fmt(shown)}</span>;
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between px-5 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}<h1 className="text-3xl font-bold tracking-tight">{title}</h1></div>
      {right}
    </header>
  );
}
