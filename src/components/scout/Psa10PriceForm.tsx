"use client";

import { useState } from "react";

export default function Psa10PriceForm({
  scoreId,
  onUpdated,
}: {
  scoreId: string;
  onUpdated: () => void;
}) {
  const [price, setPrice] = useState("");
  const [pop, setPop] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
      setError("正の数を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/scout/candidates/${scoreId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          psa10Price: value,
          psa10Pop: pop ? Number(pop) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "保存に失敗しました");
      }
      setPrice("");
      setPop("");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-xs font-semibold text-slate-600 mb-2">PSA10 参考価格を入力</p>
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">価格 (USD)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-28 px-2 py-1.5 text-sm rounded-md border border-slate-300"
            placeholder="例: 320"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">PSA POP（任意）</label>
          <input
            type="number"
            value={pop}
            onChange={(e) => setPop(e.target.value)}
            className="w-24 px-2 py-1.5 text-sm rounded-md border border-slate-300"
            placeholder="例: 45"
          />
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="px-3 py-1.5 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存して再計算"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
