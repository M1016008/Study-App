import { NextRequest } from "next/server";
import { enrichRun } from "@/lib/scout/enrich";
import type { AiProvider } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_PROVIDERS = new Set<AiProvider>(["anthropic", "openai", "gemini"]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON body が不正です" }, { status: 400 });
  }

  const runId = typeof body.runId === "string" ? body.runId : "";
  if (!runId) {
    return Response.json({ error: "runId が必要です" }, { status: 400 });
  }
  const provider = (body.provider as AiProvider) ?? "gemini";
  if (!VALID_PROVIDERS.has(provider)) {
    return Response.json({ error: "provider が不正です" }, { status: 400 });
  }
  const cardIds = Array.isArray(body.cardIds)
    ? (body.cardIds.filter((x) => typeof x === "string") as string[])
    : undefined;

  try {
    const result = await enrichRun({ runId, provider, cardIds });
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
