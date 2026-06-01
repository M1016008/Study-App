import {
  addPsa10Price,
  getCandidateDetail,
  recomputeCardScore,
  resolveScore,
  setGradeOverride,
} from "@/lib/scout/store";
import type { BuyGrade } from "@/lib/scout/types";

export const runtime = "nodejs";

const VALID_GRADES = new Set<BuyGrade>(["S", "A", "B", "PASS"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getCandidateDetail(id);
  if (!detail) {
    return Response.json({ error: "候補が見つかりません" }, { status: 404 });
  }
  return Response.json(detail);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resolved = await resolveScore(id);
  if (!resolved) {
    return Response.json({ error: "候補が見つかりません" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON body が不正です" }, { status: 400 });
  }

  // PSA10 価格の手動入力
  if (body.psa10Price != null) {
    const price = Number(body.psa10Price);
    if (!Number.isFinite(price) || price <= 0) {
      return Response.json(
        { error: "psa10Price は正の数で指定してください" },
        { status: 400 },
      );
    }
    const popRaw = Number(body.psa10Pop);
    await addPsa10Price({
      cardId: resolved.cardId,
      priceValue: price,
      popCount: Number.isFinite(popRaw) ? popRaw : null,
      source: "manual",
      note: typeof body.note === "string" ? body.note : null,
    });
  }

  // 判定の手動オーバーライド
  if ("gradeOverride" in body) {
    const g = body.gradeOverride;
    if (g === null) {
      await setGradeOverride(id, null);
    } else if (typeof g === "string" && VALID_GRADES.has(g as BuyGrade)) {
      await setGradeOverride(id, g as BuyGrade);
    } else {
      return Response.json({ error: "gradeOverride が不正です" }, { status: 400 });
    }
  }

  // PSA10 反映のためスコア再計算
  await recomputeCardScore(resolved.runId, resolved.cardId);

  const detail = await getCandidateDetail(id);
  return Response.json(detail);
}
