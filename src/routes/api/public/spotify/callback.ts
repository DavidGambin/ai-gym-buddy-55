import { createFileRoute } from "@tanstack/react-router";

const page = (ok: boolean, msg: string) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="background:#0E0F13;color:#fff;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0"><p>${msg}</p><script>
try{window.opener&&window.opener.postMessage({type:"forma-spotify",ok:${ok}},location.origin)}catch(e){}
setTimeout(function(){window.close();if(!window.opener)location.href="/"},${ok ? 600 : 2500});
</script></body>`,
  { headers: { "content-type": "text/html; charset=utf-8" } },
);

export const Route = createFileRoute("/api/public/spotify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
        if (url.searchParams.get("error") || !code || !state) return page(false, "Conexión con Spotify cancelada.");
        const s = await import("@/lib/spotify.server");
        const userId = await s.readState(state);
        if (!userId) return page(false, "El enlace ha caducado. Inténtalo de nuevo.");
        try { await s.exchangeCode(request, code, userId); }
        catch (e) { console.error(e); return page(false, "No se pudo conectar con Spotify."); }
        return page(true, "¡Spotify conectado! Ya puedes volver a SpotterBro.ai.");
      },
    },
  },
});
