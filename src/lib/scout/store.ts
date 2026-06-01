// scout_* テーブルへのアクセス層（library.ts 相当）
import { randomUUID } from "node:crypto";
import type { InValue } from "@libsql/client";
import { initDb } from "@/lib/db";
import { categorize, characterPopularity } from "./categorize";
import { buildRisk, buildUndervalueReason, score } from "./scoring";
import type {
  BuyGrade,
  CandidateFilters,
  Category,
  CardIdentity,
  DistributionType,
  Listing,
  Psa10Price,
  ScanRun,
  ScoreBreakdown,
  ScoreInput,
  ScoutCard,
  SoldRecord,
} from "./types";

// ---------- ラン ----------

export async function insertRun(input: {
  seedQuery: string;
  source: "ebay" | "mock" | "csv";
  discoveredTerms: string[];
  listingCount: number;
  candidateCount: number;
}): Promise<string> {
  const db = await initDb();
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO scout_runs
      (id, seed_query, source, discovered_terms_json, listing_count, candidate_count, ai_enriched, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [
      id,
      input.seedQuery,
      input.source,
      JSON.stringify(input.discoveredTerms),
      input.listingCount,
      input.candidateCount,
      Date.now(),
    ],
  });
  return id;
}

export async function listRuns(): Promise<ScanRun[]> {
  const db = await initDb();
  const res = await db.execute(
    "SELECT * FROM scout_runs ORDER BY created_at DESC LIMIT 50",
  );
  return res.rows.map(rowToRun);
}

export async function latestRunId(): Promise<string | null> {
  const db = await initDb();
  const res = await db.execute(
    "SELECT id FROM scout_runs ORDER BY created_at DESC LIMIT 1",
  );
  return res.rows[0] ? (res.rows[0].id as string) : null;
}

export async function markRunEnriched(runId: string): Promise<void> {
  const db = await initDb();
  await db.execute({
    sql: "UPDATE scout_runs SET ai_enriched = 1 WHERE id = ?",
    args: [runId],
  });
}

function rowToRun(r: Record<string, unknown>): ScanRun {
  return {
    id: r.id as string,
    seedQuery: r.seed_query as string,
    source: r.source as ScanRun["source"],
    discoveredTerms: r.discovered_terms_json
      ? (JSON.parse(r.discovered_terms_json as string) as string[])
      : [],
    listingCount: Number(r.listing_count),
    candidateCount: Number(r.candidate_count),
    aiEnriched: Number(r.ai_enriched) === 1,
    createdAt: Number(r.created_at),
  };
}

// ---------- カード ----------

export async function upsertCard(identity: CardIdentity): Promise<string> {
  const db = await initDb();
  const now = Date.now();

  // カード番号があれば番号で、無ければ正規化名で既存を探す
  const existing = identity.cardNumber
    ? await db.execute({
        sql: "SELECT id FROM scout_cards WHERE card_number = ? LIMIT 1",
        args: [identity.cardNumber],
      })
    : await db.execute({
        sql: "SELECT id FROM scout_cards WHERE card_number IS NULL AND card_name = ? LIMIT 1",
        args: [identity.cardName],
      });

  if (existing.rows[0]) {
    const id = existing.rows[0].id as string;
    await db.execute({
      sql: "UPDATE scout_cards SET character = COALESCE(?, character), updated_at = ? WHERE id = ?",
      args: [identity.character, now, id],
    });
    return id;
  }

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO scout_cards (id, card_name, card_number, set_code, character, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      identity.cardName,
      identity.cardNumber,
      identity.setCode,
      identity.character,
      now,
      now,
    ],
  });
  return id;
}

// ---------- 出品 ----------

export async function insertListing(
  runId: string,
  cardId: string,
  listing: Listing,
): Promise<string> {
  const db = await initDb();
  const id = randomUUID();
  const cat = categorize(listing.title);
  await db.execute({
    sql: `INSERT INTO scout_listings
      (id, run_id, card_id, ebay_item_id, title, price_value, price_currency, listing_url,
       image_url, condition, buying_options, seller, categories_json, distribution_type,
       is_excluded, exclusion_reasons_json, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      runId,
      cardId,
      listing.ebayItemId,
      listing.title,
      listing.price.value,
      listing.price.currency,
      listing.listingUrl,
      listing.imageUrl,
      listing.condition,
      JSON.stringify(listing.buyingOptions),
      listing.seller,
      JSON.stringify(cat.categories),
      cat.distributionType,
      cat.isExcluded ? 1 : 0,
      JSON.stringify(cat.exclusionReasons),
      Date.now(),
    ],
  });
  return id;
}

// ---------- PSA10 / 過去販売 ----------

export async function addPsa10Price(input: {
  cardId: string;
  priceValue: number;
  currency?: string;
  popCount?: number | null;
  source: Psa10Price["source"];
  note?: string | null;
}): Promise<void> {
  const db = await initDb();
  await db.execute({
    sql: `INSERT INTO scout_psa10_prices (id, card_id, price_value, currency, pop_count, source, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      input.cardId,
      input.priceValue,
      input.currency ?? "USD",
      input.popCount ?? null,
      input.source,
      input.note ?? null,
      Date.now(),
    ],
  });
}

export async function addSoldRecords(
  records: Array<{
    cardId: string | null;
    title: string;
    soldPrice: number;
    currency?: string;
    grade?: string | null;
    soldAt?: string | null;
    source: string;
    rawRow?: unknown;
  }>,
): Promise<number> {
  if (records.length === 0) return 0;
  const db = await initDb();
  const now = Date.now();
  await db.batch(
    records.map((r) => ({
      sql: `INSERT INTO scout_sold_records
        (id, card_id, title, sold_price, currency, grade, sold_at, source, raw_row_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        r.cardId,
        r.title,
        r.soldPrice,
        r.currency ?? "USD",
        r.grade ?? null,
        r.soldAt ?? null,
        r.source,
        r.rawRow ? JSON.stringify(r.rawRow) : null,
        now,
      ] as InValue[],
    })),
    "write",
  );
  return records.length;
}

/** タイトルから既存カードを推定（sold/PSA10 CSV の名寄せ用） */
export async function findCardByIdentity(
  identity: CardIdentity,
): Promise<string | null> {
  const db = await initDb();
  if (identity.cardNumber) {
    const res = await db.execute({
      sql: "SELECT id FROM scout_cards WHERE card_number = ? LIMIT 1",
      args: [identity.cardNumber],
    });
    if (res.rows[0]) return res.rows[0].id as string;
  }
  const res = await db.execute({
    sql: "SELECT id FROM scout_cards WHERE lower(card_name) = lower(?) LIMIT 1",
    args: [identity.cardName],
  });
  return res.rows[0] ? (res.rows[0].id as string) : null;
}

// ---------- スコア再計算（scan と PATCH で共有） ----------

interface ListingRow {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  buyingOptions: string[];
  isExcluded: boolean;
  imageUrl: string | null;
  listingUrl: string | null;
}

export async function recomputeCardScore(
  runId: string,
  cardId: string,
): Promise<void> {
  const db = await initDb();

  const listingsRes = await db.execute({
    sql: `SELECT id, title, price_value, price_currency, buying_options, is_excluded, image_url, listing_url
          FROM scout_listings WHERE run_id = ? AND card_id = ?`,
    args: [runId, cardId],
  });
  if (listingsRes.rows.length === 0) return;

  const listings: ListingRow[] = listingsRes.rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    price: r.price_value != null ? Number(r.price_value) : null,
    currency: (r.price_currency as string) ?? "USD",
    buyingOptions: r.buying_options ? (JSON.parse(r.buying_options as string) as string[]) : [],
    isExcluded: Number(r.is_excluded) === 1,
    imageUrl: (r.image_url as string) ?? null,
    listingUrl: (r.listing_url as string) ?? null,
  }));

  // 代表出品: 非除外の最安、無ければ全体の最安
  const withPrice = listings.filter((l) => l.price != null);
  const nonExcluded = withPrice.filter((l) => !l.isExcluded);
  const pool = nonExcluded.length ? nonExcluded : withPrice.length ? withPrice : listings;
  const representative = pool.reduce((best, cur) =>
    (cur.price ?? Infinity) < (best.price ?? Infinity) ? cur : best,
  );

  const cat = categorize(representative.title);
  const currentPrice = representative.price;
  const auctionOnly =
    representative.buyingOptions.includes("AUCTION") &&
    !representative.buyingOptions.includes("FIXED_PRICE");

  // 過去販売（raw）からの推定相場、無ければ非除外の最安
  const soldRes = await db.execute({
    sql: "SELECT sold_price, grade FROM scout_sold_records WHERE card_id = ?",
    args: [cardId],
  });
  const soldRows = soldRes.rows.map((r) => ({
    price: Number(r.sold_price),
    grade: ((r.grade as string) ?? "").toLowerCase(),
  }));
  const rawSold = soldRows.filter((s) => !s.grade || s.grade === "raw");
  let estRawPrice: number | null = null;
  if (rawSold.length) {
    estRawPrice = rawSold.reduce((s, r) => s + r.price, 0) / rawSold.length;
  } else if (nonExcluded.length) {
    estRawPrice = Math.min(...nonExcluded.map((l) => l.price as number));
  } else {
    estRawPrice = currentPrice;
  }

  // PSA10 参考価格（最新）
  const psaRes = await db.execute({
    sql: "SELECT price_value, pop_count FROM scout_psa10_prices WHERE card_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [cardId],
  });
  const psa10Price = psaRes.rows[0] ? Number(psaRes.rows[0].price_value) : null;
  const popCount =
    psaRes.rows[0] && psaRes.rows[0].pop_count != null
      ? Number(psaRes.rows[0].pop_count)
      : null;

  const cardRes = await db.execute({
    sql: "SELECT character FROM scout_cards WHERE id = ?",
    args: [cardId],
  });
  const character = cardRes.rows[0] ? (cardRes.rows[0].character as string | null) : null;

  const multiplier =
    psa10Price != null && estRawPrice != null && estRawPrice > 0
      ? psa10Price / estRawPrice
      : null;

  const input: ScoreInput = {
    multiplier,
    currentPrice,
    estRawPrice,
    psa10Price,
    popCount,
    listingCount: listings.length,
    distributionType: cat.distributionType,
    categories: cat.categories,
    isExcluded: cat.isExcluded,
    titleWeakness: cat.titleWeakness,
    rarityTier: cat.rarityTier,
    charPopularity: characterPopularity(character),
    hasSold: soldRows.length > 0,
    soldCount: soldRows.length,
    auctionOnly,
  };

  const result = score(input);
  const undervalueReason = buildUndervalueReason(input, result.breakdown);
  const risk = buildRisk(input);
  const now = Date.now();

  // 既存スコア行があれば comment / grade_override を保持して UPDATE
  const existing = await db.execute({
    sql: "SELECT id FROM scout_scores WHERE run_id = ? AND card_id = ?",
    args: [runId, cardId],
  });

  const baseArgs: InValue[] = [
    representative.id,
    currentPrice,
    estRawPrice,
    psa10Price,
    multiplier,
    listings.length,
    JSON.stringify(result.breakdown),
    result.total,
    result.grade,
    undervalueReason,
    risk,
  ];

  if (existing.rows[0]) {
    await db.execute({
      sql: `UPDATE scout_scores SET
        representative_listing_id = ?, current_price = ?, est_raw_price = ?, psa10_price = ?,
        psa10_multiplier = ?, listing_count = ?, breakdown_json = ?, total_score = ?, grade = ?,
        undervalue_reason = ?, risk = ?
        WHERE run_id = ? AND card_id = ?`,
      args: [...baseArgs, runId, cardId],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO scout_scores
        (id, run_id, card_id, representative_listing_id, current_price, est_raw_price, psa10_price,
         psa10_multiplier, listing_count, breakdown_json, total_score, grade, undervalue_reason, risk, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), runId, cardId, ...baseArgs, now],
    });
  }
}

/** あるカードを含む全ランのスコアを再計算（sold/PSA10 取込後に使用） */
export async function recomputeCardEverywhere(cardId: string): Promise<void> {
  const db = await initDb();
  const res = await db.execute({
    sql: "SELECT DISTINCT run_id FROM scout_listings WHERE card_id = ?",
    args: [cardId],
  });
  for (const row of res.rows) {
    await recomputeCardScore(row.run_id as string, cardId);
  }
}

// ---------- 候補クエリ ----------

const SORT_COLUMN: Record<string, string> = {
  total: "s.total_score",
  multiplier: "s.psa10_multiplier",
  price: "s.current_price",
  raw: "s.est_raw_price",
  supply: "s.listing_count",
};

export async function queryCandidates(
  filters: CandidateFilters,
): Promise<{ items: ScoutCard[]; runId: string | null }> {
  const db = await initDb();
  const runId = filters.runId ?? (await latestRunId());
  if (!runId) return { items: [], runId: null };

  const where: string[] = ["s.run_id = ?"];
  const args: InValue[] = [runId];

  if (filters.grade) {
    where.push("COALESCE(s.grade_override, s.grade) = ?");
    args.push(filters.grade);
  }
  if (filters.tournamentOnly) where.push("rep.distribution_type = 'tournament'");
  if (filters.sealedPromoOnly) where.push("rep.categories_json LIKE '%sealed_promo%'");
  if (filters.winnerOnly) where.push("rep.categories_json LIKE '%winner%'");
  if (filters.storeChampOnly) where.push("rep.categories_json LIKE '%store_champion%'");
  if (filters.regionalOnly) where.push("rep.categories_json LIKE '%regional%'");
  if (filters.hideExcluded) where.push("rep.is_excluded = 0");

  const sortCol = SORT_COLUMN[filters.sort ?? "total"] ?? "s.total_score";
  const dir = filters.dir === "asc" ? "ASC" : "DESC";

  const sql = `
    SELECT s.*, c.card_name, c.card_number, c.character,
           rep.listing_url AS rep_url, rep.image_url AS rep_image,
           rep.distribution_type AS rep_dist, rep.categories_json AS rep_cats,
           rep.is_excluded AS rep_excluded, rep.price_currency AS rep_currency
    FROM scout_scores s
    JOIN scout_cards c ON c.id = s.card_id
    LEFT JOIN scout_listings rep ON rep.id = s.representative_listing_id
    WHERE ${where.join(" AND ")}
    ORDER BY ${sortCol} ${dir} NULLS LAST`;

  const res = await db.execute({ sql, args });
  return { items: res.rows.map(rowToCandidate), runId };
}

export async function getCandidateDetail(scoreId: string): Promise<{
  card: ScoutCard;
  psa10Prices: Psa10Price[];
  soldRecords: SoldRecord[];
} | null> {
  const db = await initDb();
  const res = await db.execute({
    sql: `
      SELECT s.*, c.card_name, c.card_number, c.character,
             rep.listing_url AS rep_url, rep.image_url AS rep_image,
             rep.distribution_type AS rep_dist, rep.categories_json AS rep_cats,
             rep.is_excluded AS rep_excluded, rep.price_currency AS rep_currency
      FROM scout_scores s
      JOIN scout_cards c ON c.id = s.card_id
      LEFT JOIN scout_listings rep ON rep.id = s.representative_listing_id
      WHERE s.id = ?`,
    args: [scoreId],
  });
  const row = res.rows[0];
  if (!row) return null;
  const card = rowToCandidate(row);

  const psaRes = await db.execute({
    sql: "SELECT * FROM scout_psa10_prices WHERE card_id = ? ORDER BY created_at DESC",
    args: [card.cardId],
  });
  const soldRes = await db.execute({
    sql: "SELECT * FROM scout_sold_records WHERE card_id = ? ORDER BY created_at DESC LIMIT 50",
    args: [card.cardId],
  });

  return {
    card,
    psa10Prices: psaRes.rows.map((r) => ({
      id: r.id as string,
      cardId: r.card_id as string,
      priceValue: Number(r.price_value),
      currency: r.currency as string,
      popCount: r.pop_count != null ? Number(r.pop_count) : null,
      source: r.source as Psa10Price["source"],
      note: (r.note as string) ?? null,
      createdAt: Number(r.created_at),
    })),
    soldRecords: soldRes.rows.map((r) => ({
      id: r.id as string,
      cardId: (r.card_id as string) ?? null,
      title: r.title as string,
      soldPrice: Number(r.sold_price),
      currency: r.currency as string,
      grade: (r.grade as string) ?? null,
      soldAt: (r.sold_at as string) ?? null,
      source: r.source as string,
      createdAt: Number(r.created_at),
    })),
  };
}

/** scoreId からカード/ラン ID を引く（PATCH 用） */
export async function resolveScore(
  scoreId: string,
): Promise<{ runId: string; cardId: string } | null> {
  const db = await initDb();
  const res = await db.execute({
    sql: "SELECT run_id, card_id FROM scout_scores WHERE id = ?",
    args: [scoreId],
  });
  const row = res.rows[0];
  if (!row) return null;
  return { runId: row.run_id as string, cardId: row.card_id as string };
}

export async function setGradeOverride(
  scoreId: string,
  grade: BuyGrade | null,
): Promise<void> {
  const db = await initDb();
  await db.execute({
    sql: "UPDATE scout_scores SET grade_override = ? WHERE id = ?",
    args: [grade, scoreId],
  });
}

export async function setComment(
  runId: string,
  cardId: string,
  comment: string,
): Promise<void> {
  const db = await initDb();
  await db.execute({
    sql: "UPDATE scout_scores SET comment = ? WHERE run_id = ? AND card_id = ?",
    args: [comment, runId, cardId],
  });
}

function rowToCandidate(r: Record<string, unknown>): ScoutCard {
  const breakdown = JSON.parse(r.breakdown_json as string) as ScoreBreakdown;
  const categories = r.rep_cats
    ? (JSON.parse(r.rep_cats as string) as Category[])
    : [];
  return {
    id: r.id as string,
    runId: r.run_id as string,
    cardId: r.card_id as string,
    cardName: r.card_name as string,
    cardNumber: (r.card_number as string) ?? null,
    character: (r.character as string) ?? null,
    representativeListingUrl: (r.rep_url as string) ?? null,
    imageUrl: (r.rep_image as string) ?? null,
    currentPrice: r.current_price != null ? Number(r.current_price) : null,
    currency: (r.rep_currency as string) ?? "USD",
    estRawPrice: r.est_raw_price != null ? Number(r.est_raw_price) : null,
    psa10Price: r.psa10_price != null ? Number(r.psa10_price) : null,
    psa10Multiplier: r.psa10_multiplier != null ? Number(r.psa10_multiplier) : null,
    listingCount: Number(r.listing_count),
    distributionType: ((r.rep_dist as string) ?? "unknown") as DistributionType,
    categories,
    isExcluded: Number(r.rep_excluded) === 1,
    breakdown,
    totalScore: Number(r.total_score),
    grade: r.grade as BuyGrade,
    gradeOverride: (r.grade_override as BuyGrade) ?? null,
    undervalueReason: (r.undervalue_reason as string) ?? null,
    risk: (r.risk as string) ?? null,
    comment: (r.comment as string) ?? null,
    createdAt: Number(r.created_at),
  };
}
