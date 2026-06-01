"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiProvider } from "@/lib/ai/types";
import type { ScoutCard } from "@/lib/scout/types";
import CandidateTable from "./CandidateTable";
import CardDetailDrawer from "./CardDetailDrawer";
import CsvUpload from "./CsvUpload";
import FilterBar, { DEFAULT_FILTERS, type FilterState } from "./FilterBar";
import ScanControls, { type LastRunInfo } from "./ScanControls";

function buildQuery(filters: FilterState, runId: string | null): string {
  const sp = new URLSearchParams();
  if (runId) sp.set("runId", runId);
  if (filters.grade !== "ALL") sp.set("grade", filters.grade);
  sp.set("sort", filters.sort);
  sp.set("dir", filters.dir);
  for (const key of [
    "tournamentOnly",
    "sealedPromoOnly",
    "winnerOnly",
    "storeChampOnly",
    "regionalOnly",
    "hideExcluded",
  ] as const) {
    if (filters[key]) sp.set(key, "true");
  }
  return sp.toString();
}

export default function ScoutDashboard() {
  const [seedQuery, setSeedQuery] = useState("ONE PIECE CARD GAME English");
  const [provider, setProvider] = useState<AiProvider>("gemini");
  const [useAi, setUseAi] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastRun, setLastRun] = useState<LastRunInfo | null>(null);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [runId, setRunId] = useState<string | null>(null);
  const [items, setItems] = useState<ScoutCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scout/candidates?${buildQuery(filters, runId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取得に失敗しました");
      setItems(data.items);
      if (data.runId && !runId) setRunId(data.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filters, runId]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/scout/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seedQuery, useAi, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "スキャンに失敗しました");
      const run = data.run;
      setLastRun({
        source: run.source,
        listingCount: run.listingCount,
        candidateCount: run.candidateCount,
        discoveredTerms: run.discoveredTerms ?? [],
        aiEnriched: run.aiEnriched ?? 0,
      });
      setRunId(run.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1fr)] gap-5">
        <ScanControls
          seedQuery={seedQuery}
          setSeedQuery={setSeedQuery}
          provider={provider}
          setProvider={setProvider}
          useAi={useAi}
          setUseAi={setUseAi}
          onScan={runScan}
          scanning={scanning}
          lastRun={lastRun}
        />
        <CsvUpload onDone={loadCandidates} />
      </div>

      <FilterBar filters={filters} setFilters={setFilters} />

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{loading ? "読み込み中…" : `${items.length} 件の候補`}</span>
        <span className="text-slate-400">
          ※ 本ツールは探索補助であり投資助言ではありません
        </span>
      </div>

      <CandidateTable items={items} onSelect={(c) => setSelected(c.id)} />

      {selected && (
        <CardDetailDrawer
          scoreId={selected}
          provider={provider}
          onClose={() => setSelected(null)}
          onUpdated={loadCandidates}
        />
      )}
    </div>
  );
}
