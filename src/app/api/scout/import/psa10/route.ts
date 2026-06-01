import { parseCardIdentity } from "@/lib/scout/categorize";
import { mapPsa10Rows } from "@/lib/scout/csv";
import {
  addPsa10Price,
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
  const rows = mapPsa10Rows(text);
  if (rows.length === 0) {
    return Response.json({ imported: 0, error: "有効な行がありません" });
  }

  const affected = new Set<string>();
  let imported = 0;
  for (const r of rows) {
    const identity = parseCardIdentity(r.cardNumber ? `${r.title} ${r.cardNumber}` : r.title);
    const cardId = await findCardByIdentity(identity);
    if (!cardId) continue; // スキャン済みカードのみ紐付け
    await addPsa10Price({
      cardId,
      priceValue: r.priceValue,
      popCount: r.popCount,
      source: "csv",
    });
    affected.add(cardId);
    imported++;
  }

  for (const cardId of affected) await recomputeCardEverywhere(cardId);

  return Response.json({ imported, linked: affected.size, skipped: rows.length - imported });
}
