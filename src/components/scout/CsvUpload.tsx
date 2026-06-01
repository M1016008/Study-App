"use client";

import { useState } from "react";

function UploadBox({
  title,
  hint,
  endpoint,
  onDone,
}: {
  title: string;
  hint: string;
  endpoint: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "取込に失敗しました");
      setMessage(
        data.error
          ? data.error
          : `取込 ${data.imported ?? 0} 件 / 紐付け ${data.linked ?? 0} 件`,
      );
      onDone();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 min-w-[240px]">
      <p className="text-xs font-semibold text-slate-700">{title}</p>
      <p className="text-[11px] text-slate-400 mb-1.5">{hint}</p>
      <input
        type="file"
        accept=".csv"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
        className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-semibold hover:file:bg-slate-700"
      />
      {message && <p className="mt-1.5 text-[11px] text-slate-600">{message}</p>}
    </div>
  );
}

export default function CsvUpload({ onDone }: { onDone: () => void }) {
  return (
    <section className="bg-white/92 rounded-2xl border border-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <h2 className="text-sm font-bold text-slate-800 mb-3">CSV 取込（過去販売 / PSA10）</h2>
      <div className="flex gap-4 flex-wrap">
        <UploadBox
          title="過去販売（Sold）CSV"
          hint="列: title, sold_price, grade, sold_at"
          endpoint="/api/scout/import/sold"
          onDone={onDone}
        />
        <UploadBox
          title="PSA10 価格 CSV"
          hint="列: card_name, card_number, psa10_price, pop"
          endpoint="/api/scout/import/psa10"
          onDone={onDone}
        />
      </div>
    </section>
  );
}
