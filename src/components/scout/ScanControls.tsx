"use client";

import type { AiProvider } from "@/lib/ai/types";

export interface LastRunInfo {
  source: "ebay" | "mock";
  listingCount: number;
  candidateCount: number;
  discoveredTerms: string[];
  aiEnriched: number;
}

export default function ScanControls({
  seedQuery,
  setSeedQuery,
  provider,
  setProvider,
  useAi,
  setUseAi,
  onScan,
  scanning,
  lastRun,
}: {
  seedQuery: string;
  setSeedQuery: (v: string) => void;
  provider: AiProvider;
  setProvider: (v: AiProvider) => void;
  useAi: boolean;
  setUseAi: (v: boolean) => void;
  onScan: () => void;
  scanning: boolean;
  lastRun: LastRunInfo | null;
}) {
  return (
    <section className="bg-white/92 rounded-2xl border border-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <h2 className="text-sm font-bold text-slate-800 mb-3">スキャン</h2>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-600">
            検索の起点キーワード
          </label>
          <input
            type="text"
            value={seedQuery}
            onChange={(e) => setSeedQuery(e.target.value)}
            placeholder="ONE PIECE CARD GAME English"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
            />
            AI補助を使う
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProvider)}
            disabled={!useAi}
            className="px-2 py-1 text-xs rounded-md border border-slate-300 disabled:opacity-50"
          >
            <option value="gemini">Gemini</option>
            <option value="anthropic">Claude</option>
            <option value="openai">OpenAI</option>
          </select>

          <button
            onClick={onScan}
            disabled={scanning}
            className="ml-auto px-4 py-2 text-sm font-semibold rounded-lg bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {scanning ? "スキャン中…" : "スキャン実行"}
          </button>
        </div>

        {lastRun && (
          <div className="text-xs text-slate-600 border-t border-slate-100 pt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md font-semibold ${
                  lastRun.source === "ebay"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {lastRun.source === "ebay" ? "eBayライブ" : "サンプルデータ"}
              </span>
              <span>
                出品 {lastRun.listingCount} 件 / 候補 {lastRun.candidateCount} 枚
              </span>
              {lastRun.aiEnriched > 0 && (
                <span className="text-teal-700">AIコメント {lastRun.aiEnriched} 件</span>
              )}
            </div>
            {lastRun.discoveredTerms.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">発見した特徴語:</span>
                {lastRun.discoveredTerms.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
