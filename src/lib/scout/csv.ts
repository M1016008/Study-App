// 依存無しの小さな CSV パーサ（引用フィールド/カンマ/改行に対応）

/** CSV テキストを行配列（各セルは string）にパース */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/** ヘッダ付き CSV を、ヘッダ小文字キーのオブジェクト配列にする */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = (cells[idx] ?? "").trim();
    });
    return rec;
  });
}

function pick(rec: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (rec[k] != null && rec[k] !== "") return rec[k];
  }
  return "";
}

function toNumber(s: string): number | null {
  const n = Number(s.replace(/[$,¥\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export interface ParsedSoldRow {
  title: string;
  soldPrice: number;
  currency: string;
  grade: string | null;
  soldAt: string | null;
  raw: Record<string, string>;
}

/** sold CSV をマッピング。列名は柔軟に解決（title/price/grade/date 等） */
export function mapSoldRows(text: string): ParsedSoldRow[] {
  const records = parseCsvRecords(text);
  const out: ParsedSoldRow[] = [];
  for (const rec of records) {
    const title = pick(rec, ["title", "name", "card", "item", "card_name"]);
    const price = toNumber(pick(rec, ["sold_price", "price", "sold", "amount", "value"]));
    if (!title || price == null) continue;
    out.push({
      title,
      soldPrice: price,
      currency: pick(rec, ["currency"]) || "USD",
      grade: pick(rec, ["grade", "condition"]) || null,
      soldAt: pick(rec, ["sold_at", "date", "sold_date", "end_date"]) || null,
      raw: rec,
    });
  }
  return out;
}

export interface ParsedPsa10Row {
  title: string;
  cardNumber: string | null;
  priceValue: number;
  popCount: number | null;
}

/** PSA10 CSV をマッピング（card_name/number, psa10_price, pop） */
export function mapPsa10Rows(text: string): ParsedPsa10Row[] {
  const records = parseCsvRecords(text);
  const out: ParsedPsa10Row[] = [];
  for (const rec of records) {
    const title = pick(rec, ["card_name", "name", "title", "card"]);
    const price = toNumber(pick(rec, ["psa10_price", "psa10", "price", "value"]));
    if (!title || price == null) continue;
    const num = pick(rec, ["card_number", "number", "card_no"]);
    const pop = toNumber(pick(rec, ["pop", "pop_count", "psa10_pop", "population"]));
    out.push({
      title,
      cardNumber: num || null,
      priceValue: price,
      popCount: pop,
    });
  }
  return out;
}
