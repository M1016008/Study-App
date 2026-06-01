import { NextRequest } from "next/server";
import { queryCandidates } from "@/lib/scout/store";
import type { BuyGrade, CandidateFilters, SortKey } from "@/lib/scout/types";

export const runtime = "nodejs";

const VALID_GRADES = new Set<BuyGrade>(["S", "A", "B", "PASS"]);
const VALID_SORTS = new Set<SortKey>(["total", "multiplier", "price", "raw", "supply"]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const gradeParam = sp.get("grade") as BuyGrade | null;
  const sortParam = sp.get("sort") as SortKey | null;

  const filters: CandidateFilters = {
    runId: sp.get("runId") ?? undefined,
    grade: gradeParam && VALID_GRADES.has(gradeParam) ? gradeParam : undefined,
    sort: sortParam && VALID_SORTS.has(sortParam) ? sortParam : "total",
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
    tournamentOnly: sp.get("tournamentOnly") === "true",
    sealedPromoOnly: sp.get("sealedPromoOnly") === "true",
    winnerOnly: sp.get("winnerOnly") === "true",
    storeChampOnly: sp.get("storeChampOnly") === "true",
    regionalOnly: sp.get("regionalOnly") === "true",
    hideExcluded: sp.get("hideExcluded") === "true",
  };

  try {
    const { items, runId } = await queryCandidates(filters);
    return Response.json({ items, total: items.length, runId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
