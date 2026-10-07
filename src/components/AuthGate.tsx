import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { clearUser, loadUser } from "@/lib/store";

type S = "loading" | "out" | "in";

export function AuthGate({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<S>("loading");
  const qc = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const apply = (uid: string | undefined) => {
      if (uid) { setSt("in"); void loadUser(uid); } else { setSt("out"); clearUser(); qc.clear(); }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") apply(session?.user.id);
      if (event === "SIGNED_OUT") router.navigate({ to: "/", replace: true });
    });
    supabase.auth.getUser().then(({ data }) => apply(data.user?.id));
    return () => sub.subscription.unsubscribe();
  }, [qc, router]);

  if (st === "loading") return <div className="min-h-screen" />;
  if (st === "out") return <Login />;
  return <>{children}</>;
}

function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function google() {
    setBusy(true); setErr(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { prompt: "select_account" } });
    if (r.error) { setErr("No se pudo iniciar sesión con Google. Inténtalo de nuevo."); setBusy(false); }
  }
  return (
    <div className="flex min-h-screen flex-col bg-hero px-6 pb-12 pt-24">
      <div className="flex-1">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-4xl font-black text-primary-foreground glow">F</div>
        <h1 className="mt-8 text-5xl font-extrabold tracking-tight">Forma</h1>
        <p className="mt-3 max-w-xs text-lg text-muted-foreground">Tu rutina, tu progreso y un entrenador personal con IA. Guardado en tu cuenta, en cualquier dispositivo.</p>
      </div>
      <button disabled={busy} onClick={google} className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-foreground text-lg font-bold text-background disabled:opacity-60">
        <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {busy ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      {err && <p className="mt-3 text-center text-sm text-coral">{err}</p>}
    </div>
  );
}

export async function signOut(qc: ReturnType<typeof useQueryClient>) {
  await qc.cancelQueries(); qc.clear();
  await supabase.auth.signOut();
}
