import { createFileRoute } from "@tanstack/react-router";
import { Save, Check } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/ui-forma";
import { Button } from "@/components/ui/button";
import { setState, useStore, type Profile } from "@/lib/store";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Mi perfil — SpotterBro.ai" }, { name: "description", content: "Actualiza tu peso y medidas corporales." }, { property: "og:title", content: "Mi perfil — SpotterBro.ai" }, { property: "og:description", content: "Tus medidas corporales y peso actual." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useStore((s) => s.profile);
  const loaded = useStore((s) => s.loaded);
  return loaded ? <ProfileForm initial={profile} /> : null;
}
function ProfileForm({ initial }: { initial: Profile }) {
  const [p, setP] = useState(initial);
  const [saved, setSaved] = useState(false);
  return <div className="pb-safe">
    <PageHeader title="Mi perfil" sub="Medidas corporales" />
    <form className="px-5" onSubmit={(e) => { e.preventDefault(); setState(() => ({ profile: p })); setSaved(true); }}>
      <div className="grid grid-cols-2 gap-3">
        {([["weight", "Peso", "kg"], ["height", "Altura", "cm"], ["chest", "Pecho", "cm"], ["waist", "Cintura", "cm"], ["arm", "Brazo", "cm"]] as const).map(([k, label, unit]) => <label key={k} className="min-w-0 rounded-2xl border border-border bg-card p-4">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="mt-2 flex items-baseline gap-2"><input aria-label={label} required type="number" inputMode="decimal" min="1" max={k === "weight" ? 500 : 300} step="0.1" value={p[k]} onChange={(e) => { setP({ ...p, [k]: Number(e.target.value) }); setSaved(false); }} className="w-full min-w-0 bg-transparent text-2xl font-bold outline-none focus:ring-2 focus:ring-primary" /><span className="text-xs text-muted-foreground">{unit}</span></div>
        </label>)}
      </div>
      <Button type="submit" className="mt-6 h-12 w-full rounded-xl text-base font-bold">{saved ? <Check /> : <Save />}{saved ? "Medidas guardadas" : "Guardar medidas"}</Button>
    </form>
  </div>;
}