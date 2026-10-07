import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30),
  context: z.string().max(100000),
});

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const day = { type: "string", enum: DAYS };
const fn = (name: string, description: string, properties: Record<string, unknown>) => ({
  type: "function", name, description, strict: true,
  parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
});
const tools = [
  fn("replace_exercise", "Sustituye un ejercicio de un día por otro del catálogo.", { day, from_id: { type: "string" }, to_id: { type: "string" } }),
  fn("reorder_day", "Reordena los ejercicios de un día. order = lista completa de ids en el nuevo orden.", { day, order: { type: "array", items: { type: "string" } } }),
  fn("set_series", "Fija el número de series de un ejercicio (añadir o quitar series).", { day, ex_id: { type: "string" }, count: { type: "integer" } }),
  fn("add_exercise", "Añade un ejercicio del catálogo al final de un día.", { day, ex_id: { type: "string" } }),
  fn("remove_exercise", "Quita un ejercicio de un día.", { day, ex_id: { type: "string" } }),
  fn("generate_day", "Regenera por completo los ejercicios de un día (4-7 ejercicios, compuestos primero).", { day, ex_ids: { type: "array", items: { type: "string" } } }),
];

const SYSTEM = `Eres "Coach Forma", entrenador personal experto. Responde SIEMPRE en español, breve, cercano y motivador (máx. 4-5 frases).
Puedes modificar la rutina del usuario usando las herramientas; usa SOLO ids del catálogo proporcionado. Si el usuario pide un cambio, aplícalo con herramientas y luego explícalo.
Ten en cuenta el mapa de fatiga: si un músculo está en "alta" o "media", recomienda evitarlo hoy y sugiere grupos frescos.
Si hay molestias o lesión, propone alternativas seguras y recuerda consultar a un profesional si persiste el dolor.`;

type Item = { type: string; name?: string; arguments?: string; call_id?: string; content?: { type: string; text?: string }[] };

async function respond(input: unknown[], key: string, runId?: string): Promise<{ output: Item[]; runId?: string | undefined }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" };
  if (runId) headers["X-Lovable-AIG-Run-ID"] = runId;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST", headers,
    body: JSON.stringify({
      model: "openai/gpt-6-astra", instructions: SYSTEM, input, tools, stream: true, store: false,
      reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
    }),
  });
  if (res.status === 429) throw new Error("Demasiadas peticiones, espera un momento.");
  if (res.status === 402) throw new Error("Sin créditos de IA disponibles.");
  if (!res.ok || !res.body) { console.error("coach", res.status, await res.text().catch(() => "")); throw new Error("El coach no está disponible ahora mismo."); }
  const rid = res.headers.get("X-Lovable-AIG-Run-ID") ?? runId;
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let output: Item[] = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim(); if (!p || p === "[DONE]") continue;
      try { const ev = JSON.parse(p); if (ev.type === "response.completed") output = ev.response?.output ?? []; if (ev.type === "response.failed" || ev.type === "error") throw new Error("fail"); } catch (e) { if ((e as Error).message === "fail") throw new Error("El coach no pudo responder."); }
    }
  }
  return { output, runId: rid };
}
const textOf = (out: Item[]) => out.filter((o) => o.type === "message").flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("").trim();

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const input: unknown[] = [
      { role: "developer", content: [{ type: "input_text", text: "CONTEXTO DEL USUARIO:\n" + data.context }] },
      ...data.messages.map((m) => ({ role: m.role, content: [{ type: m.role === "user" ? "input_text" : "output_text", text: m.content }] })),
    ];
    const first = await respond(input, key);
    const calls = first.output.filter((o) => o.type === "function_call");
    const actions = calls.map((c) => { return { name: c.name ?? "", args: c.arguments || "{}" }; });
    let text = textOf(first.output);
    if (calls.length) {
      const second = await respond([...input, ...first.output, ...calls.map((c) => ({ type: "function_call_output", call_id: c.call_id, output: "ok, aplicado" }))], key, first.runId);
      text = textOf(second.output) || text || "Listo, he actualizado tu rutina.";
    }
    return { text: text || "¿En qué te ayudo?", actions };
  });
