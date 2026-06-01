// 決定論的スコアリングモデル（各サブスコア 0..100、総合は重み付け）
import type {
  BuyGrade,
  ScoreBreakdown,
  ScoreInput,
  ScoreResult,
} from "./types";

/** 総合スコアの重み（合計 1.0）。ユーザーが調整可能。 */
export const WEIGHTS = {
  psa10Multiplier: 0.22,
  rawValue: 0.16,
  distribution: 0.18,
  rarity: 0.1,
  supply: 0.08,
  titleWeakness: 0.08,
  charPopularity: 0.06,
  liquidity: 0.06,
  risk: 0.06,
} as const;

/** 買い判定のしきい値 */
export const GRADE_THRESHOLDS = {
  S: 78,
  A: 65,
  B: 50,
} as const;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function psa10MultiplierScore(multiplier: number | null): number {
  if (multiplier == null || !Number.isFinite(multiplier)) return 15;
  if (multiplier >= 8) return 100;
  if (multiplier >= 5) return 85;
  if (multiplier >= 3) return 70;
  if (multiplier >= 2) return 55;
  if (multiplier >= 1.5) return 35;
  return 15;
}

export function rawValueScore(
  currentPrice: number | null,
  estRawPrice: number | null,
): number {
  if (currentPrice == null || estRawPrice == null || estRawPrice <= 0) return 40;
  const r = currentPrice / estRawPrice;
  let score: number;
  if (r <= 0.6) score = 100;
  else if (r <= 0.8) score = 80;
  else if (r <= 1.0) score = 60;
  else if (r <= 1.2) score = 40;
  else score = 20;
  if (currentPrice < 30) score += 10;
  return clamp(score);
}

export function distributionScore(input: ScoreInput): number {
  if (input.isExcluded) return 0;
  switch (input.distributionType) {
    case "tournament":
      return 100;
    case "event":
      return 85;
    case "promo":
      return 75;
    case "booster":
      return 0;
    default:
      return 30;
  }
}

export function rarityScore(input: ScoreInput): number {
  let base: number;
  switch (input.rarityTier) {
    case "ultra":
      base = 100;
      break;
    case "high":
      base = 75;
      break;
    case "mid":
      base = 50;
      break;
    default:
      base = 25;
  }
  if (input.popCount != null) {
    if (input.popCount < 100) base += 15;
    else if (input.popCount > 1000) base -= 20;
  }
  return clamp(base);
}

export function supplyScore(listingCount: number): number {
  if (listingCount <= 1) return 100;
  if (listingCount <= 3) return 85;
  if (listingCount <= 6) return 65;
  if (listingCount <= 12) return 45;
  return 25;
}

export function titleWeaknessScore(titleWeakness: number): number {
  return clamp(titleWeakness * 100);
}

export function charPopularityScore(charPopularity: number): number {
  return clamp(charPopularity);
}

export function liquidityScore(input: ScoreInput): number {
  const hasPsa10 = input.psa10Price != null;
  if (input.hasSold && hasPsa10) return input.soldCount > 1 ? 80 : 65;
  if (hasPsa10) return 55;
  if (input.hasSold) return 50;
  return 30;
}

export function riskScore(input: ScoreInput): number {
  let penalty = 0;
  if (input.psa10Price == null) penalty += 25; // 参照価格なし
  if (input.auctionOnly) penalty += 15; // 価格が読みにくい
  if (
    input.currentPrice != null &&
    input.estRawPrice != null &&
    input.estRawPrice > 0 &&
    input.currentPrice / input.estRawPrice > 1.2
  ) {
    penalty += 20; // 既に割高
  }
  if (input.isExcluded) penalty += 30;
  return clamp(100 - penalty);
}

export function computeBreakdown(input: ScoreInput): ScoreBreakdown {
  return {
    psa10Multiplier: psa10MultiplierScore(input.multiplier),
    rawValue: rawValueScore(input.currentPrice, input.estRawPrice),
    distribution: distributionScore(input),
    rarity: rarityScore(input),
    supply: supplyScore(input.listingCount),
    titleWeakness: titleWeaknessScore(input.titleWeakness),
    charPopularity: charPopularityScore(input.charPopularity),
    liquidity: liquidityScore(input),
    risk: riskScore(input),
  };
}

export function computeTotalScore(b: ScoreBreakdown): number {
  const total =
    WEIGHTS.psa10Multiplier * b.psa10Multiplier +
    WEIGHTS.rawValue * b.rawValue +
    WEIGHTS.distribution * b.distribution +
    WEIGHTS.rarity * b.rarity +
    WEIGHTS.supply * b.supply +
    WEIGHTS.titleWeakness * b.titleWeakness +
    WEIGHTS.charPopularity * b.charPopularity +
    WEIGHTS.liquidity * b.liquidity +
    WEIGHTS.risk * b.risk;
  return Number(total.toFixed(1));
}

export function gradeFor(total: number): BuyGrade {
  if (total >= GRADE_THRESHOLDS.S) return "S";
  if (total >= GRADE_THRESHOLDS.A) return "A";
  if (total >= GRADE_THRESHOLDS.B) return "B";
  return "PASS";
}

/** 全サブスコア → 総合 → 判定。ハードルールを適用。 */
export function score(input: ScoreInput): ScoreResult {
  const breakdown = computeBreakdown(input);
  let total = computeTotalScore(breakdown);

  // ハードルール: 大会配布スコアが低くプロモでもない場合は総合を49で上限
  const isPromo =
    input.distributionType === "promo" ||
    input.categories.includes("promo") ||
    input.categories.includes("sealed_promo");
  if (breakdown.distribution < 30 && !isPromo) {
    total = Math.min(total, 49);
  }

  // 除外は強制「見送り」
  if (input.isExcluded) {
    return { breakdown, total, grade: "PASS" };
  }

  return { breakdown, total, grade: gradeFor(total) };
}

/** 割安理由を組み立て（ルールベース） */
export function buildUndervalueReason(input: ScoreInput, b: ScoreBreakdown): string {
  const parts: string[] = [];
  if (input.multiplier != null && input.multiplier >= 2) {
    parts.push(`PSA10倍率 約${input.multiplier.toFixed(1)}倍`);
  }
  if (b.rawValue >= 80) parts.push("推定Raw相場より明確に安い");
  if (b.titleWeakness >= 60) parts.push("出品タイトルが弱く検索に埋もれやすい");
  if (b.supply >= 85) parts.push("現在出品数が少なく希少");
  if (input.distributionType === "tournament") parts.push("大会配布系");
  else if (input.distributionType === "event") parts.push("イベント配布系");
  else if (input.distributionType === "promo") parts.push("限定プロモ");
  return parts.length ? parts.join(" / ") : "目立った割安要因は弱め";
}

/** リスクを組み立て（ルールベース） */
export function buildRisk(input: ScoreInput): string {
  const parts: string[] = [];
  if (input.psa10Price == null) parts.push("PSA10参考価格が未入力（倍率は推定不可）");
  if (input.auctionOnly) parts.push("オークションのみで落札価格が読みにくい");
  if (input.popCount != null && input.popCount > 1000) parts.push("PSA POPが多く希少性は低め");
  if (!input.hasSold) parts.push("過去販売実績が乏しく流動性が不明");
  if (input.isExcluded) parts.push("除外カテゴリ（大会配布系ではない）");
  return parts.length ? parts.join(" / ") : "目立ったリスクは小さい";
}
