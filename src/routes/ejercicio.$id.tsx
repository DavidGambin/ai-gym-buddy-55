import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Trophy } from "lucide-react";
import { EX_BY_ID, eqLabel, gifUrl, muscleLabel } from "@/lib/exercises";
import { bestKg, useStore } from "@/lib/store";

export const Route = createFileRoute("/ejercicio/$id")({
  loader: ({ params }) => { const e = EX_BY_ID[params.id]; if (!e) throw notFound(); return { e }; },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Ejercicio no encontrado — Forma" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.e.n} — Forma`; const d = `Cómo hacer ${loaderData.e.n}: músculos, equipamiento y pasos de ejecución.`;
    const img = gifUrl(loaderData.e);
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:image", content: img }, { name: "twitter:image", content: img }] };
  },
  notFoundComponent: () => <p className="p-10 text-center">Ejercicio no encontrado.</p>,
  errorComponent: () => <p className="p-10 text-center">No se pudo cargar el ejercicio.</p>,
  component: Detail,
});

function Detail() {
  const { e } = Route.useLoaderData();
  const router = useRouter();
  const pr = useStore((s) => bestKg(s, e.id));
  return (
    <div className="pb-safe">
      <div className="relative bg-foreground">
        <img src={gifUrl(e)} alt={e.n} className="mx-auto aspect-square w-full max-w-md object-contain" />
        <button onClick={() => router.history.back()} className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-background/80 backdrop-blur" aria-label="Volver"><ChevronLeft /></button>
      </div>
      <div className="space-y-5 px-5 pt-5">
        <h1 className="text-3xl font-bold capitalize">{e.n}</h1>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-navy px-3 py-1.5 text-sm font-semibold">{eqLabel(e.eq)}</span>
          <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">{muscleLabel(e.t)}</span>
          {e.s.map((m) => <span key={m} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">{muscleLabel(m)}</span>)}
        </div>
        {pr > 0 && <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><Trophy className="text-primary" /><span className="text-muted-foreground">Tu récord</span><span className="ml-auto text-xl font-bold text-primary">{pr} kg</span></div>}
        <div>
          <h2 className="mb-3 text-lg font-bold">Cómo se hace</h2>
          <ol className="space-y-3">
            {e.st.map((s, i) => (
              <li key={i} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-sm font-bold text-primary">{i + 1}</span><p className="pt-0.5 text-[15px] leading-relaxed text-muted-foreground">{s}</p></li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-muted-foreground">© Gym visual</p>
      </div>
    </div>
  );
}
