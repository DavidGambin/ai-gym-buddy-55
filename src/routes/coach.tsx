import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { CoachChat } from "@/components/CoachChat";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Coach IA — Forma" },
      { name: "description", content: "Habla con tu entrenador personal con IA: resuelve dudas y ajusta tu rutina al momento." },
      { property: "og:title", content: "Coach IA — Forma" },
      { property: "og:description", content: "Tu entrenador personal con IA que ajusta tu rutina en directo." },
    ],
  }),
  component: () => (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center gap-2 px-5 pb-2 pt-6"><Sparkles className="text-primary" /><h1 className="text-2xl font-bold">Coach IA</h1></header>
      <div className="min-h-0 flex-1"><CoachChat /></div>
    </div>
  ),
});
