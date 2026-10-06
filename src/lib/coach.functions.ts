import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30),
  context: z.string().max(40000),
});

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const tools = [
  { type: "function", function: { name: "replace_exercise", description: "Sustituye un ejercicio de un día por otro del catálogo.", parameters: { type: "object", properties: { day: { type: "string", enum: DAYS }, from_id: { type: "string" }, to_id: { type: "string" } }, required: ["day", "from_id", "to_id"] } } },
  { type: "function", function: { name: "reorder_day", description: "Reordena los ejercicios de un día. order = lista completa de ids en el nuevo orden.", parameters: { type: "object", properties: { day: { type: "string", enum: DAYS }, order: { type: "array", items: { type: "string" } } }, required: ["day", "order"] } } },
  { type: "function", function: { name: "set_series", description: "Fija el número de series de un ejercicio (añadir o quitar series).", parameters: { type: "object", properties: { day: { type: "string", enum: DAYS }, ex_id: { type: "string" }, count: { type: "integer", minimum: 1, maximum: 10 } }, required: ["day", "ex_id", "count"] } } },
  { type: "function", function: { name: "add_exercise", description: "Añade un ejercicio del catálogo al final de un día.", parameters: { type: "object", properties: { day: { type: "string", enum: DAYS }, ex_id: { type: "string" } }, required: ["day", "ex_id"] } } },
  { type: "function", function: { name: "remove_exercise", description: "Quita un ejercicio de un día.", parameters: { type: "object", properties: { day: { type: "string", enum: DAYS }, ex_id: { type: "string" } }, required: ["day", "ex_id"] } } },
  { type: "function", function: { name: "generate_day", description: "Regenera por completo los ejercicios de un día (4-7 ejercicios, compuestos primero).", parameters: { type: "object", properties: { day: { type: "string", enum: DAYS }, ex_ids: { type: "array", items: { type: "string" } } }, required: ["day", "ex_ids"] } } },
];

const SYSTEM = `Eres "Coach Forma", entrenador personal experto. Responde SIEMPRE en español, breve, cercano y motivador (máx. 4-5 frases).
Puedes modificar la rutina del usuario usando las herramientas; usa SOLO ids del catálogo proporcionado. Si el usuario pide un cambio, aplícalo con herramientas y luego explícalo.
Ten en cuenta el mapa de fatiga: si un músculo está en "alta" o "media", recomienda evitarlo hoy y sugiere grupos frescos.
Si hay molestias o lesión, propone alternativas seguras y recuerda consultar a un profesional si persiste el dolor.`;

async function call(body: unknown, key: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Demasiadas peticiones, espera un momento.");
  if (res.status === 402) throw new Error("Sin créditos de IA disponibles.");
  if (!res.ok) throw new Error("El coach no está disponible ahora mismo.");
  return res.json();
}

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const messages: unknown[] = [
      { role: "system", content: SYSTEM + "\n\nCONTEXTO DEL USUARIO:\n" + data.context },
      ...data.messages,
    ];
    const model = "google/gemini-3-flash-preview";
    const first = await call({ model, messages, tools }, key);
    const msg = first.choices?.[0]?.message ?? {};
    const toolCalls: { id: string; function: { name: string; arguments: string } }[] = msg.tool_calls ?? [];
    const actions = toolCalls.map((t) => { let args = {}; try { args = JSON.parse(t.function.arguments || "{}"); } catch { /* */ } return { name: t.function.name, args }; });
    let text: string = msg.content ?? "";
    if (toolCalls.length) {
      const second = await call({
        model,
        messages: [...messages, { role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls }, ...toolCalls.map((t) => ({ role: "tool", tool_call_id: t.id, content: "ok, aplicado" }))],
      }, key);
      text = second.choices?.[0]?.message?.content || text || "Listo, he actualizado tu rutina.";
    }
    return { text, actions: actions as { name: string; args: Record<string, unknown> }[] };
  });
