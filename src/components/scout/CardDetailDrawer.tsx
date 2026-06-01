"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiProvider } from "@/lib/ai/types";
import type {
  BuyGrade,
  Psa10Price,
  ScoutCard,
  SoldRecord,
} from "@/lib/scout/types";
import GradeBadge, { GRADE_LABEL } from "./GradeBadge";
import Psa10PriceForm from "./Psa10PriceForm";
import ScoreBar from "./ScoreBar";
import { DISTRIBUTION_LABEL, money, multiplierText } from "./format";

interface Detail {
  card: ScoutCard;
  psa10Prices: Psa10Price[];
  soldRecords: SoldRecord[];
}

const SUB_SCORES: Array<{ key: keyof ScoutCard["breakdown"]; label: string }> = [
  { key: "psa10Multiplier", label: "PSA10倍率" },
  { key: "rawValue", label: "Raw割安度" },
  { key: "distribution", label: "大会配布" },
  { key: "rarity", label: "希少性" },
  { key: "supply", label: "現在出品数" },
  { key: "titleWeakness", label: "タイトル弱さ" },
  { key: "charPopularity", label: "キャラ人気" },
  { key: "liquidity", label: "流動性" },
  { key: "risk", label: "リスク(安全度)" },
];

const OVERRIDES: BuyGrade[] = ["S", "A", "B", "PASS"];

export default function CardDetailDrawer({
  scoreId,
  provider,
  onClose,
  onUpdated,
}: {
  scoreId: string;
  provider: AiProvider;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scout/candidates/${scoreId}`);
      if (res.ok) setDetail(await res.json());
    } finally {
      setLoading(false);
    }
  }, [scoreId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    onUpdated();
  };

  const overrideGrade = async (g: BuyGrade | null) => {
    await fetch(`/api/scout/candidates/${scoreId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gradeOverride: g }),
    });
    refresh();
  };

  const generateComment = async () => {
    if (!detail) return;
    setEnriching(true);
    setNote(null);
    try {
      const res = await fetch("/api/scout/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runId: detail.card.runId,
          provider,
          cardIds: [scoreId],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.reason === "no_ai_key") {
        setNote(`${provider} の API キーが未設定です。.env.local に設定すると生成できます。`);
      } else if (data.enriched === 0) {
        setNote("コメント生成に失敗しました。");
      } else {
        await load();
      }
    } finally {
      setEnriching(false);
    }
  };

  const card = detail?.card;
  const grade = card ? card.gradeOverride ?? card.grade : "PASS";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full overflow-y-auto bg-white shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl"
        >
          ✕
        </button>

        {loading && <p className="text-sm text-slate-400">読み込み中…</p>}

        {card && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GradeBadge grade={grade} />
                <span className="text-xs text-slate-500">
                  {DISTRIBUTION_LABEL[card.distributionType]} / 総合 {card.totalScore.toFixed(0)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{card.cardName}</h2>
              {card.cardNumber && (
                <p className="text-xs text-slate-400">{card.cardNumber}</p>
              )}
            </div>

            {/* 主要指標 */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Field label="現在出品価格" value={money(card.currentPrice, card.currency)} />
              <Field label="現在出品数" value={String(card.listingCount)} />
              <Field label="推定Raw相場" value={money(card.estRawPrice, card.currency)} />
              <Field label="PSA10参考価格" value={money(card.psa10Price, card.currency)} />
              <Field label="PSA10化倍率" value={multiplierText(card.psa10Multiplier)} />
              <Field
                label="過去販売実績"
                value={detail.soldRecords.length ? `${detail.soldRecords.length} 件` : "—"}
              />
            </dl>

            {card.representativeListingUrl && (
              <a
                href={card.representativeListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-600 hover:text-teal-800"
              >
                出品ページを開く ↗
              </a>
            )}

            {/* 割安理由 / リスク / コメント */}
            <div className="flex flex-col gap-2 text-sm">
              <InfoLine label="割安理由" value={card.undervalueReason} tone="good" />
              <InfoLine label="リスク" value={card.risk} tone="warn" />
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">一言コメント</span>
                  <button
                    onClick={generateComment}
                    disabled={enriching}
                    className="text-xs px-2 py-1 rounded-md border border-teal-300 text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                  >
                    {enriching ? "生成中…" : "AIコメント生成"}
                  </button>
                </div>
                <p className="text-sm text-slate-700">
                  {card.comment ?? "（未生成）"}
                </p>
                {note && <p className="mt-1 text-[11px] text-amber-600">{note}</p>}
              </div>
            </div>

            {/* スコア内訳 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">スコア内訳</span>
              {SUB_SCORES.map((s) => (
                <ScoreBar key={s.key} label={s.label} value={card.breakdown[s.key]} />
              ))}
            </div>

            {/* PSA10 入力 */}
            <Psa10PriceForm scoreId={scoreId} onUpdated={refresh} />

            {/* 判定オーバーライド */}
            <div>
              <span className="text-xs font-semibold text-slate-500">買い判定を手動変更</span>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {OVERRIDES.map((g) => (
                  <button
                    key={g}
                    onClick={() => overrideGrade(g)}
                    className={`px-2.5 py-1 text-xs rounded-md border ${
                      card.gradeOverride === g
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {GRADE_LABEL[g]}
                  </button>
                ))}
                {card.gradeOverride && (
                  <button
                    onClick={() => overrideGrade(null)}
                    className="px-2.5 py-1 text-xs rounded-md border border-slate-300 text-slate-400 hover:bg-slate-50"
                  >
                    自動に戻す
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800 tabular-nums">{value}</dd>
    </div>
  );
}

function InfoLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone: "good" | "warn";
}) {
  if (!value) return null;
  const cls = tone === "good" ? "text-emerald-700" : "text-amber-700";
  return (
    <p className="text-sm">
      <span className="text-xs font-semibold text-slate-500">{label}: </span>
      <span className={cls}>{value}</span>
    </p>
  );
}
