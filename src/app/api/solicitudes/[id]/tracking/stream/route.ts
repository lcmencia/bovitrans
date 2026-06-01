import { requireAuth } from "@/lib/auth";
import { parseBigIntId } from "@/lib/params";
import { ultimoPunto, puedeVerSolicitud } from "@/services/tracking";

// SSE requiere runtime Node (Prisma) y respuesta dinámica.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/solicitudes/:id/tracking/stream — Server-Sent Events.
 * Emite el último punto GPS cuando cambia (polling cada 3s) + un ping
 * periódico para mantener viva la conexión. Sin polling del lado del cliente.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await requireAuth().catch(() => null);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const id = parseBigIntId((await params).id);
  if (!id) return new Response("Bad request", { status: 400 });
  if (!(await puedeVerSolicitud(session, id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;
  let ultimaMarca: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      // Envía el último punto conocido al conectar.
      const inicial = await ultimoPunto(id);
      if (inicial) {
        ultimaMarca = inicial.registrado_en;
        send("punto", inicial);
      } else {
        send("ping", { ts: Date.now() });
      }

      timer = setInterval(async () => {
        try {
          const p = await ultimoPunto(id);
          if (p && p.registrado_en !== ultimaMarca) {
            ultimaMarca = p.registrado_en;
            send("punto", p);
          } else {
            // Comentario keep-alive (no dispara onmessage).
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch {
          // ignora errores transitorios de DB
        }
      }, 3000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
