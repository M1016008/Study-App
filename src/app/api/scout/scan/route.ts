import { NextRequest } from "next/server";
import { runScan } from "@/lib/scout/scan";
import { enrichRun } from "@/lib/scout/enrich";
import type { AiProvider } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_PROVIDERS = new Set<AiProvider>(["anthropic", "openai", "gemini"]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // 空ボディ許容（既定値で実行）
  }

  const seedQuery = typeof body.seedQuery === "string" ? body.seedQuery : undefined;
  const limitRaw = Number(body.limit);
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
  const useAi = body.useAi === true;
  const provider = (body.provider as AiProvider) ?? "gemini";

  try {
    const result = await runScan({ seedQuery, limit });

    let aiEnriched = 0;
    if (useAi && VALID_PROVIDERS.has(provider)) {
      const enrich = await enrichRun({ runId: result.runId, provider });
      aiEnriched = enrich.enriched;
    }

    return Response.json({ run: { ...result, aiEnriched } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
