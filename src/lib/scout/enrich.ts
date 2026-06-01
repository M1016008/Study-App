// 任意の AI エンリッチ。キーが無ければ何もしない（ルール値を維持）。
import type { AiProvider } from "@/lib/ai/types";
import {
  COMMENT_SYSTEM_PROMPT,
  POPULARITY_SYSTEM_PROMPT,
} from "./ai/prompts";
import { generateJson, isAiAvailable } from "./ai/enrich-provider";
import { markRunEnriched, queryCandidates, setComment } from "./store";
import type { ScoutCard } from "./types";

export interface EnrichResult {
  enriched: number;
  reason?: string;
}

function cardSummary(card: ScoutCard): string {
  return JSON.stringify({
    カード名: card.cardName,
    配布種別: card.distributionType,
    現在価格: card.currentPrice,
    推定Raw相場: card.estRawPrice,
    PSA10参考価格: card.psa10Price,
    PSA10化倍率: card.psa10Multiplier,
    買い判定: card.gradeOverride ?? card.grade,
    総合スコア: card.totalScore,
    割安理由: card.undervalueReason,
    リスク: card.risk,
  });
}

/** ラン内の候補（任意で cardIds 限定）にコメント等を付与 */
export async function enrichRun(input: {
  runId: string;
  provider: AiProvider;
  cardIds?: string[];
}): Promise<EnrichResult> {
  if (!isAiAvailable(input.provider)) {
    return { enriched: 0, reason: "no_ai_key" };
  }

  const { items } = await queryCandidates({ runId: input.runId });
  const targets = input.cardIds?.length
    ? items.filter((c) => input.cardIds!.includes(c.id))
    : items.filter((c) => !c.isExcluded).slice(0, 30); // コスト上限

  let enriched = 0;
  for (const card of targets) {
    try {
      const { comment } = await generateJson<{ comment: string }>(
        input.provider,
        COMMENT_SYSTEM_PROMPT,
        `次のカード候補に一言コメントを付けてください。\n${cardSummary(card)}`,
      );
      if (comment) {
        await setComment(input.runId, card.cardId, comment.trim());
        enriched++;
      }
    } catch (err) {
      console.error("[scout] AIコメント生成失敗:", err);
    }
  }

  if (enriched > 0) await markRunEnriched(input.runId);
  return { enriched };
}

/** 単一テキストのキャラ人気推定（0..100）。失敗時は null。 */
export async function estimateCharPopularity(
  provider: AiProvider,
  name: string,
): Promise<number | null> {
  if (!isAiAvailable(provider)) return null;
  try {
    const { popularity } = await generateJson<{ popularity: number }>(
      provider,
      POPULARITY_SYSTEM_PROMPT,
      `キャラクター/カード名: ${name}`,
    );
    if (Number.isFinite(popularity)) {
      return Math.max(0, Math.min(100, Math.round(popularity)));
    }
  } catch (err) {
    console.error("[scout] キャラ人気推定失敗:", err);
  }
  return null;
}
