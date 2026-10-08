import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30),
  context: z.string().max(100000),
});

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const day = { type: "string", enum: DAYS };
const fn = (name: string, description: string, properties: Record<string, unknown>) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required: Object.keys(properties) } },
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

type Call = { id: string; type: "function"; function: { name: string; arguments: string } };
type ChatMsg = { role: string; content: string | null; tool_calls?: Call[]; tool_call_id?: string };

async function chat(messages: ChatMsg[], key: string, withTools: boolean) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, ...(withTools ? { tools } : {}) }),
  });
  if (res.status === 429) throw new Error("Demasiadas peticiones, espera un momento.");
  if (res.status === 402) throw new Error("Sin créditos de IA disponibles.");
  if (!res.ok) { console.error("coach", res.status, await res.text().catch(() => "")); throw new Error("El coach no está disponible ahora mismo."); }
  const j = await res.json();
  return j.choices?.[0]?.message as ChatMsg;
}

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM + "\n\nCONTEXTO DEL USUARIO:\n" + data.context },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    const first = await chat(messages, key, true);
    const calls = first?.tool_calls ?? [];
    const actions = calls.map((c) => ({ name: c.function.name, args: c.function.arguments || "{}" }));
    let text = first?.content ?? "";
    if (calls.length) {
      const second = await chat([...messages, { role: "assistant", content: first.content ?? "", tool_calls: calls }, ...calls.map((c) => ({ role: "tool", tool_call_id: c.id, content: "ok, aplicado" }))], key, false);
      text = second?.content || text || "Listo, he actualizado tu rutina.";
    }
    return { text: text || "¿En qué te ayudo?", actions };
  });
