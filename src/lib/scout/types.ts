// ONE PIECE CARD GAME (英語版) eBay 投資スカウトツール — 共有型定義

/** eBay / モック / CSV から取得した1出品を正規化したもの */
export interface Listing {
  ebayItemId: string | null;
  title: string;
  price: { value: number | null; currency: string };
  listingUrl: string | null;
  imageUrl: string | null;
  condition: string | null;
  buyingOptions: string[]; // ["FIXED_PRICE"] | ["AUCTION"] など
  seller: string | null;
}

/** 配布形態。優先度: tournament > event > promo > booster > unknown */
export type DistributionType =
  | "tournament"
  | "event"
  | "promo"
  | "booster"
  | "unknown";

/** 検出カテゴリ（複数該当しうる） */
export type Category =
  | "winner"
  | "regional"
  | "store_champion"
  | "championship"
  | "finalist"
  | "top_player"
  | "pre_release"
  | "event_pack"
  | "participation_pack"
  | "promo"
  | "sealed_promo"
  // 以下は除外系
  | "normal_parallel"
  | "leader_parallel"
  | "comic_parallel"
  | "sp"
  | "secret_rare"
  | "booster";

export type RarityTier = "ultra" | "high" | "mid" | "low";

export type BuyGrade = "S" | "A" | "B" | "PASS";

/** categorize() の結果 */
export interface Categorization {
  categories: Category[];
  isExcluded: boolean;
  exclusionReasons: string[];
  distributionType: DistributionType;
  titleWeakness: number; // 0..1
  rarityTier: RarityTier;
}

/** タイトルから抽出したカード同定情報 */
export interface CardIdentity {
  cardName: string;
  cardNumber: string | null; // 例 OP01-001
  setCode: string | null; // 例 OP01
  character: string | null;
}

/** 9つのサブスコア（各 0..100） */
export interface ScoreBreakdown {
  psa10Multiplier: number;
  rawValue: number;
  distribution: number;
  rarity: number;
  supply: number;
  titleWeakness: number;
  charPopularity: number;
  liquidity: number;
  risk: number;
}

/** スコア算出に必要な入力 */
export interface ScoreInput {
  multiplier: number | null; // psa10 / estRaw
  currentPrice: number | null;
  estRawPrice: number | null;
  psa10Price: number | null;
  popCount: number | null;
  listingCount: number;
  distributionType: DistributionType;
  categories: Category[];
  isExcluded: boolean;
  titleWeakness: number; // 0..1
  rarityTier: RarityTier;
  charPopularity: number; // 0..100
  hasSold: boolean;
  soldCount: number;
  auctionOnly: boolean;
}

export interface ScoreResult {
  breakdown: ScoreBreakdown;
  total: number;
  grade: BuyGrade;
}

/** PSA10 参考価格レコード */
export interface Psa10Price {
  id: string;
  cardId: string;
  priceValue: number;
  currency: string;
  popCount: number | null;
  source: "manual" | "csv" | "130point" | "ai";
  note: string | null;
  createdAt: number;
}

/** 過去販売（sold）レコード */
export interface SoldRecord {
  id: string;
  cardId: string | null;
  title: string;
  soldPrice: number;
  currency: string;
  grade: string | null;
  soldAt: string | null;
  source: string;
  createdAt: number;
}

export interface ScanRun {
  id: string;
  seedQuery: string;
  source: "ebay" | "mock" | "csv";
  discoveredTerms: string[];
  listingCount: number;
  candidateCount: number;
  aiEnriched: boolean;
  createdAt: number;
}

/** ダッシュボードの1候補（カード×ラン） */
export interface ScoutCard {
  id: string; // scout_scores.id
  runId: string;
  cardId: string;
  cardName: string;
  cardNumber: string | null;
  character: string | null;
  representativeListingUrl: string | null;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
  estRawPrice: number | null;
  psa10Price: number | null;
  psa10Multiplier: number | null;
  listingCount: number;
  distributionType: DistributionType;
  categories: Category[];
  isExcluded: boolean;
  breakdown: ScoreBreakdown;
  totalScore: number;
  grade: BuyGrade;
  gradeOverride: BuyGrade | null;
  undervalueReason: string | null;
  risk: string | null;
  comment: string | null;
  createdAt: number;
}

export type SortKey =
  | "total"
  | "multiplier"
  | "price"
  | "raw"
  | "supply";

export interface CandidateFilters {
  runId?: string;
  grade?: BuyGrade;
  sort?: SortKey;
  dir?: "asc" | "desc";
  tournamentOnly?: boolean;
  sealedPromoOnly?: boolean;
  winnerOnly?: boolean;
  storeChampOnly?: boolean;
  regionalOnly?: boolean;
  hideExcluded?: boolean;
}
