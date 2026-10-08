import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { askCoach } from "@/lib/coach.functions";
import { EXERCISES, EX_BY_ID, GROUP_TARGETS, MUSCLE_LABEL, eqLabel, type Muscle } from "@/lib/exercises";
import { DAYS, DAY_LABEL, computeFatigue, defaultSets, getState, levelOf, mutateRoutine, todayKey, undoAi, useStore, type Day } from "@/lib/store";
import { ExRow } from "./ui-forma";

type Msg = { role: "user" | "assistant"; content: string; exIds?: string[]; changes?: number };
const CHAT_KEY = "forma.chat";
const LV: Record<string, string> = { high: "alta", mid: "media", low: "baja" };

function buildContext() {
  const s = getState();
  const f = computeFatigue(s);
  const routine = DAYS.map(
    (d) =>
      `${DAY_LABEL[d]} (${d}) [${s.plan[d].join(", ") || "descanso"}]: ${s.routine[d].map((r) => `${r.exId} ${EX_BY_ID[r.exId]?.n} x${r.sets.length}`).join("; ") || "—"}`
  ).join("\n");
  const fat =
    (Object.keys(f) as Muscle[])
      .filter((m) => levelOf(f[m]))
      .map((m) => `${MUSCLE_LABEL[m]}: ${LV[levelOf(f[m])!]} (${f[m].toFixed(1)})`)
      .join(", ") || "ninguna";

  // Identificar IDs de la rutina actual
  const routineIds = new Set(DAYS.flatMap((d) => s.routine[d].map((r) => r.exId)));
  const todayTargets = new Set((s.plan[todayKey()] || []).flatMap((g) => GROUP_TARGETS[g]));

  // Catálogo optimizado: ejercicios en la rutina + ejercicios de los grupos de hoy
  const relevant = EXERCISES.filter(
    (e) => routineIds.has(e.id) || todayTargets.has(e.t)
  ).slice(0, 150);

  const cat = relevant.map((e) => `${e.id}|${e.n}|${e.t}|${e.eq}`).join("\n");

  return `Hoy es ${DAY_LABEL[todayKey()]} (${todayKey()}).\nPerfil: ${JSON.stringify(s.profile)}\nRUTINA:\n${routine}\nFATIGA ACTUAL: ${fat}\nCATÁLOGO DISPONIBLE (id|nombre|músculo|equipamiento):\n${cat}`;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apply(actions: { name: string; args: any }[]) {
  const touched: string[] = []; let n = 0;
  const descr: string[] = [];
  mutateRoutine((r) => {
    for (const { name, args } of actions) {
      const day = args.day as Day; if (!r[day]) continue;
      const list = r[day];
      if (name === "replace_exercise") {
        const i = list.findIndex((x) => x.exId === args.from_id); const to = String(args.to_id);
        if (i >= 0 && EX_BY_ID[to]) { list[i] = { ...list[i]!, exId: to }; touched.push(to); n++; descr.push(`${DAY_LABEL[day]}: cambio de ejercicio`); }
      } else if (name === "reorder_day") {
        const order = (args.order as string[]).filter((id) => list.some((x) => x.exId === id));
        const rest = list.filter((x) => !order.includes(x.exId));
        r[day] = [...order.map((id) => list.find((x) => x.exId === id)!), ...rest]; n++; descr.push(`${DAY_LABEL[day]}: reordenado`);
      } else if (name === "set_series") {
        const ex = list.find((x) => x.exId === args.ex_id); const c = Math.max(1, Math.min(10, Number(args.count)));
        if (ex) { const last = ex.sets[ex.sets.length - 1] ?? { kg: 20, reps: 10 }; ex.sets = Array.from({ length: c }, (_, k) => ex.sets[k] ?? { ...last }); touched.push(ex.exId); n++; descr.push(`${DAY_LABEL[day]}: ${c} series`); }
      } else if (name === "add_exercise") {
        const id = String(args.ex_id); if (EX_BY_ID[id]) { list.push({ exId: id, sets: defaultSets() }); touched.push(id); n++; descr.push(`${DAY_LABEL[day]}: ejercicio añadido`); }
      } else if (name === "remove_exercise") {
        r[day] = list.filter((x) => x.exId !== args.ex_id); n++; descr.push(`${DAY_LABEL[day]}: ejercicio quitado`);
      } else if (name === "generate_day") {
        const ids = (args.ex_ids as string[]).filter((id) => EX_BY_ID[id]);
        if (ids.length) { r[day] = ids.map((exId) => ({ exId, sets: defaultSets() })); touched.push(...ids.slice(0, 3)); n++; descr.push(`${DAY_LABEL[day]}: día regenerado`); }
      }
    }
    return r;
  }, actions.length ? "IA: " + actions.map((a) => a.name).join(", ") : undefined);
  return { n, touched: [...new Set(touched)] };
}

export function CoachChat({ compact = false }: { compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const ask = useServerFn(askCoach);
  const snaps = useStore((s) => s.snapshots.length);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { try { setMsgs(JSON.parse(localStorage.getItem(CHAT_KEY) || "[]")); } catch { /* */ } }, []);
  useEffect(() => { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-40))); end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(q: string) {
    if (!q.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const res: { text: string; actions: { name: string; args: string }[] } = await ask({ data: { messages: next.slice(-12).map(({ role, content }) => ({ role, content })), context: buildContext() } });
      const { n, touched } = res.actions.length ? apply(res.actions.map((a) => ({ name: a.name, args: JSON.parse(a.args || "{}") }))) : { n: 0, touched: [] };
      setMsgs([...next, { role: "assistant", content: res.text, exIds: touched, changes: n }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: (e as Error).message || "No he podido responder." }]);
    } finally { setBusy(false); }
  }

  const chips = ["¿Qué entreno hoy según mi fatiga?", "Me molesta el hombro, cambia el press militar", "Añade una serie al primer ejercicio de hoy", "Regenera el día de pierna"];
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <div className="pt-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground glow"><Sparkles /></div>
            <p className="text-lg font-bold">Tu entrenador personal</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Pregúntame lo que quieras o pídeme cambios en tu rutina.</p>
            <div className="mt-5 flex flex-col gap-2">
              {chips.map((c) => <button key={c} onClick={() => send(c)} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm">{c}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>{m.content}</div>
            {!!m.changes && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                <span className="font-semibold text-primary">{m.changes} {m.changes === 1 ? "cambio" : "cambios"} en tu rutina</span>
                {snaps > 0 && <button onClick={undoAi} className="flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 font-semibold"><RotateCcw className="h-3.5 w-3.5" />Deshacer</button>}
              </div>
            )}
            {m.exIds?.map((id) => (
              <Link key={id} to="/ejercicio/$id" params={{ id }} className="mt-2 block rounded-xl border border-border bg-card p-3">
                <ExRow id={id} right={<span className="text-xs text-muted-foreground">{EX_BY_ID[id] ? eqLabel(EX_BY_ID[id].eq) : ""}</span>} />
              </Link>
            ))}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />El coach está pensando…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className={`flex gap-2 border-t border-border bg-background p-3 ${compact ? "" : "mb-20"}`}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe a tu coach…" className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-[15px] outline-none focus:border-primary" />
        <button disabled={busy || !text.trim()} className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><ArrowUp /></button>
      </form>
    </div>
  );
}

export function CoachFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Abrir coach IA" className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground glow">
        <Sparkles />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="mt-auto flex h-[85vh] flex-col rounded-t-3xl border-t border-border bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" />Coach IA</p>
              <button onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Cerrar</button>
            </div>
            <CoachChat compact />
          </div>
        </div>
      )}
    </>
  );
}
