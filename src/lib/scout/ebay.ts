// eBay Browse API クライアント（client_credentials）。
// キー未設定 / エラー時は同梱モックへフォールバックする。
import { MOCK_LISTINGS } from "./mock-listings";
import type { Listing } from "./types";

const OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const SCOPE = "https://api.ebay.com/oauth/api_scope";

let tokenCache: { token: string; expiresAt: number } | null = null;

export function hasEbayCredentials(): boolean {
  return Boolean(process.env.EBAY_APP_ID && process.env.EBAY_CERT_ID);
}

function marketplace(): string {
  return process.env.EBAY_MARKETPLACE ?? "EBAY_US";
}

async function getEbayToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.token;
  }
  const appId = process.env.EBAY_APP_ID ?? "";
  const certId = process.env.EBAY_CERT_ID ?? "";
  const basic = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: SCOPE }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eBay OAuth エラー: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

interface EbayItemSummary {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  condition?: string;
  buyingOptions?: string[];
  seller?: { username?: string };
}

function normalize(item: EbayItemSummary): Listing {
  return {
    ebayItemId: item.itemId ?? null,
    title: item.title ?? "",
    price: {
      value: item.price?.value != null ? Number(item.price.value) : null,
      currency: item.price?.currency ?? "USD",
    },
    listingUrl: item.itemWebUrl ?? null,
    imageUrl: item.image?.imageUrl ?? null,
    condition: item.condition ?? null,
    buyingOptions: item.buyingOptions ?? [],
    seller: item.seller?.username ?? null,
  };
}

/** Browse API で現在出品を検索（キーが必要） */
export async function searchEbay(
  q: string,
  opts: { limit?: number; sort?: string } = {},
): Promise<Listing[]> {
  const token = await getEbayToken();
  const params = new URLSearchParams({
    q,
    limit: String(opts.limit ?? 50),
  });
  if (opts.sort) params.set("sort", opts.sort);

  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplace(),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eBay 検索エラー: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { itemSummaries?: EbayItemSummary[] };
  return (data.itemSummaries ?? []).map(normalize);
}

/** モック出品を返す（クエリで簡易フィルタ） */
export function mockSearch(q: string, limit = 50): Listing[] {
  const terms = q
    .toLowerCase()
    .replace(/one\s*piece|card\s*game|english|tcg/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return MOCK_LISTINGS.slice(0, limit);
  const matched = MOCK_LISTINGS.filter((listing) => {
    const lower = listing.title.toLowerCase();
    return terms.some((t) => lower.includes(t));
  });
  return (matched.length ? matched : MOCK_LISTINGS).slice(0, limit);
}
