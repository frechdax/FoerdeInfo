import { getVehicles } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (process.env.BUSRADAR_ENABLE_SSE !== "true") {
    return new Response(JSON.stringify({ error: "SSE disabled; use /api/vehicles polling" }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const close = () => { if (!closed) { closed = true; try { controller.close(); } catch {} } };
      request.signal.addEventListener("abort", close);
      const emit = async () => {
        if (closed) return;
        try {
          const vehicles = await getVehicles();
          controller.enqueue(encoder.encode(`event: vehicles\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString(), vehicles })}\n\n`));
        } catch (error) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "unknown" })}\n\n`));
        }
      };
      await emit();
      const timer = setInterval(emit, 10_000);
      setTimeout(() => { clearInterval(timer); close(); }, 55_000);
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
