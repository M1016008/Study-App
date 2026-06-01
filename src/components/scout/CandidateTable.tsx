"use client";

import type { ScoutCard } from "@/lib/scout/types";
import GradeBadge from "./GradeBadge";
import { DISTRIBUTION_LABEL, money, multiplierText } from "./format";

export default function CandidateTable({
  items,
  onSelect,
}: {
  items: ScoutCard[];
  onSelect: (card: ScoutCard) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white/92 rounded-2xl border border-white p-10 text-center text-sm text-slate-400 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        候補がありません。「スキャン実行」で eBay 出品（またはサンプルデータ）を取得してください。
      </div>
    );
  }

  return (
    <div className="bg-white/92 rounded-2xl border border-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 bg-slate-50/80 border-b border-slate-100">
              <th className="px-3 py-2.5 font-semibold">判定</th>
              <th className="px-3 py-2.5 font-semibold">カード名</th>
              <th className="px-3 py-2.5 font-semibold">配布</th>
              <th className="px-3 py-2.5 font-semibold text-right">現在価格</th>
              <th className="px-3 py-2.5 font-semibold text-right">推定Raw</th>
              <th className="px-3 py-2.5 font-semibold text-right">PSA10</th>
              <th className="px-3 py-2.5 font-semibold text-right">倍率</th>
              <th className="px-3 py-2.5 font-semibold text-right">出品数</th>
              <th className="px-3 py-2.5 font-semibold text-right">総合</th>
              <th className="px-3 py-2.5 font-semibold">URL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const grade = c.gradeOverride ?? c.grade;
              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={`border-b border-slate-50 cursor-pointer hover:bg-teal-50/40 ${
                    c.isExcluded ? "opacity-55" : ""
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <GradeBadge grade={grade} />
                  </td>
                  <td className="px-3 py-2.5 max-w-[22rem]">
                    <div className="font-medium text-slate-800 truncate">{c.cardName}</div>
                    {c.cardNumber && (
                      <div className="text-[11px] text-slate-400">{c.cardNumber}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">
                    {DISTRIBUTION_LABEL[c.distributionType]}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {money(c.currentPrice, c.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                    {money(c.estRawPrice, c.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                    {money(c.psa10Price, c.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-700">
                    {multiplierText(c.psa10Multiplier)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.listingCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">
                    {c.totalScore.toFixed(0)}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.representativeListingUrl && (
                      <a
                        href={c.representativeListingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-teal-600 hover:text-teal-800"
                      >
                        ↗
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
