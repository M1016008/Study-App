"use client";

import type { BuyGrade, SortKey } from "@/lib/scout/types";

export interface FilterState {
  grade: BuyGrade | "ALL";
  sort: SortKey;
  dir: "asc" | "desc";
  tournamentOnly: boolean;
  sealedPromoOnly: boolean;
  winnerOnly: boolean;
  storeChampOnly: boolean;
  regionalOnly: boolean;
  hideExcluded: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  grade: "ALL",
  sort: "total",
  dir: "desc",
  tournamentOnly: false,
  sealedPromoOnly: false,
  winnerOnly: false,
  storeChampOnly: false,
  regionalOnly: false,
  hideExcluded: true,
};

const GRADES: Array<BuyGrade | "ALL"> = ["ALL", "S", "A", "B", "PASS"];
const GRADE_TEXT: Record<string, string> = { ALL: "全て", S: "S", A: "A", B: "B", PASS: "見送り" };

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "total", label: "総合スコア" },
  { key: "multiplier", label: "PSA10倍率" },
  { key: "price", label: "現在価格" },
  { key: "raw", label: "推定Raw相場" },
  { key: "supply", label: "現在出品数" },
];

const TOGGLES: Array<{ key: keyof FilterState; label: string }> = [
  { key: "tournamentOnly", label: "大会配布系のみ" },
  { key: "sealedPromoOnly", label: "未開封プロモのみ" },
  { key: "winnerOnly", label: "Winner系のみ" },
  { key: "storeChampOnly", label: "Store Champion系のみ" },
  { key: "regionalOnly", label: "Regional系のみ" },
  { key: "hideExcluded", label: "除外候補を非表示" },
];

export default function FilterBar({
  filters,
  setFilters,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
}) {
  const update = (patch: Partial<FilterState>) => setFilters({ ...filters, ...patch });

  return (
    <section className="bg-white/92 rounded-2xl border border-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] flex flex-col gap-3">
      {/* 買い判定 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500">買い判定</span>
        <div className="flex gap-1 text-xs bg-zinc-100 rounded-md p-0.5">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => update({ grade: g })}
              className={`px-2.5 py-1 rounded ${
                filters.grade === g
                  ? "bg-white shadow-sm font-semibold text-slate-950"
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {GRADE_TEXT[g]}
            </button>
          ))}
        </div>
      </div>

      {/* 並び替え */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500">並び替え</span>
        <select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as SortKey })}
          className="px-2 py-1 text-xs rounded-md border border-slate-300"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => update({ dir: filters.dir === "desc" ? "asc" : "desc" })}
          className="px-2 py-1 text-xs rounded-md border border-slate-300 hover:bg-slate-50"
        >
          {filters.dir === "desc" ? "降順 ↓" : "昇順 ↑"}
        </button>
      </div>

      {/* 絞り込みトグル */}
      <div className="flex items-center gap-3 flex-wrap border-t border-slate-100 pt-3">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(filters[t.key])}
              onChange={(e) => update({ [t.key]: e.target.checked } as Partial<FilterState>)}
            />
            {t.label}
          </label>
        ))}
      </div>
    </section>
  );
}
