// スキャンのオーケストレータ: 取得 → 分類 → グルーピング → スコア → 永続化
import { dedupKey, parseCardIdentity } from "./categorize";
import { discoverFeatureWords } from "./discover";
import { hasEbayCredentials, mockSearch, searchEbay } from "./ebay";
import {
  insertListing,
  insertRun,
  recomputeCardScore,
  upsertCard,
} from "./store";
import type { Listing } from "./types";

const DEFAULT_SEED = "ONE PIECE CARD GAME English";
const MAX_RESEARCH_CALLS = 8;

export interface ScanResult {
  runId: string;
  source: "ebay" | "mock";
  listingCount: number;
  candidateCount: number;
  discoveredTerms: string[];
}

async function gather(
  seedQuery: string,
  limit: number,
): Promise<{ listings: Listing[]; source: "ebay" | "mock"; discoveredTerms: string[] }> {
  const live = hasEbayCredentials();
  const byId = new Map<string, Listing>();
  const seen = new Set<string>();

  const addAll = (items: Listing[]) => {
    for (const item of items) {
      const key = item.ebayItemId ?? `${item.title}|${item.price.value}`;
      if (!byId.has(key)) byId.set(key, item);
    }
  };

  const runSearch = async (q: string): Promise<Listing[]> => {
    if (!live) return mockSearch(q, limit);
    return searchEbay(q, { limit });
  };

  let source: "ebay" | "mock" = live ? "ebay" : "mock";

  // パス1: broad search
  try {
    addAll(await runSearch(seedQuery));
  } catch (err) {
    // ライブ失敗時はモックへフォールバック
    console.error("[scout] eBay 検索失敗、モックへフォールバック:", err);
    source = "mock";
    addAll(mockSearch(seedQuery, limit));
  }

  // 特徴語の抽出 → パス2: 再検索
  const discoveredTerms = discoverFeatureWords([...byId.values()]);
  if (source === "ebay") {
    for (const term of discoveredTerms.slice(0, MAX_RESEARCH_CALLS)) {
      if (seen.has(term)) continue;
      seen.add(term);
      try {
        addAll(await searchEbay(`ONE PIECE ${term} English`, { limit }));
      } catch (err) {
        console.error(`[scout] 再検索失敗 (${term}):`, err);
      }
    }
  } else {
    for (const term of discoveredTerms.slice(0, MAX_RESEARCH_CALLS)) {
      addAll(mockSearch(`ONE PIECE ${term} English`, limit));
    }
  }

  return { listings: [...byId.values()], source, discoveredTerms };
}

export async function runScan(options: {
  seedQuery?: string;
  limit?: number;
}): Promise<ScanResult> {
  const seedQuery = options.seedQuery?.trim() || DEFAULT_SEED;
  const limit = Math.max(1, Math.min(200, options.limit ?? 50));

  const { listings, source, discoveredTerms } = await gather(seedQuery, limit);

  // 出品をカードにグルーピング
  const keyToCard = new Map<string, string>();
  const cardIds = new Set<string>();
  const assignments: Array<{ cardId: string; listing: Listing }> = [];

  for (const listing of listings) {
    const identity = parseCardIdentity(listing.title);
    const key = dedupKey(identity);
    let cardId = keyToCard.get(key);
    if (!cardId) {
      cardId = await upsertCard(identity);
      keyToCard.set(key, cardId);
    }
    cardIds.add(cardId);
    assignments.push({ cardId, listing });
  }

  const runId = await insertRun({
    seedQuery,
    source,
    discoveredTerms,
    listingCount: listings.length,
    candidateCount: cardIds.size,
  });

  for (const { cardId, listing } of assignments) {
    await insertListing(runId, cardId, listing);
  }

  for (const cardId of cardIds) {
    await recomputeCardScore(runId, cardId);
  }

  return {
    runId,
    source,
    listingCount: listings.length,
    candidateCount: cardIds.size,
    discoveredTerms,
  };
}
