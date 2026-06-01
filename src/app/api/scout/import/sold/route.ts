import { parseCardIdentity } from "@/lib/scout/categorize";
import { mapSoldRows } from "@/lib/scout/csv";
import {
  addSoldRecords,
  findCardByIdentity,
  recomputeCardEverywhere,
} from "@/lib/scout/store";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "CSV ファイルを選択してください" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "CSV は 5MB までです" }, { status: 413 });
  }

  const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
  const rows = mapSoldRows(text);
  if (rows.length === 0) {
    return Response.json({ imported: 0, skipped: 0, error: "有効な行がありません" });
  }

  const affected = new Set<string>();
  const records = await Promise.all(
    rows.map(async (r) => {
      const cardId = await findCardByIdentity(parseCardIdentity(r.title));
      if (cardId) affected.add(cardId);
      return {
        cardId,
        title: r.title,
        soldPrice: r.soldPrice,
        currency: r.currency,
        grade: r.grade,
        soldAt: r.soldAt,
        source: "csv",
        rawRow: r.raw,
      };
    }),
  );

  const imported = await addSoldRecords(records);
  for (const cardId of affected) await recomputeCardEverywhere(cardId);

  return Response.json({ imported, linked: affected.size, skipped: rows.length - imported });
}
