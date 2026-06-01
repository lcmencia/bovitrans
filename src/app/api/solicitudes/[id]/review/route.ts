import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handle, created, badRequest, fromZodError } from "@/lib/http";
import { parseBigIntId } from "@/lib/params";
import { crearReview } from "@/services/reviews";

type Ctx = { params: Promise<{ id: string }> };

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comentario: z.string().trim().max(500).optional(),
});

// POST /api/solicitudes/:id/review — califica al otro participante (v2).
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth();
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");

    const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fromZodError(parsed.error);

    const r = await crearReview({
      solicitudId: id,
      autorId: BigInt(session.id),
      rating: parsed.data.rating,
      comentario: parsed.data.comentario,
    });
    return created(r);
  });
}
