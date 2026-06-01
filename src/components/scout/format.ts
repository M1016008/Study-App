import type { DistributionType } from "@/lib/scout/types";

export function money(value: number | null, currency = "USD"): string {
  if (value == null) return "—";
  const symbol = currency === "USD" ? "$" : currency === "JPY" ? "¥" : "";
  return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function multiplierText(m: number | null): string {
  return m == null ? "—" : `${m.toFixed(1)}x`;
}

export const DISTRIBUTION_LABEL: Record<DistributionType, string> = {
  tournament: "大会配布",
  event: "イベント配布",
  promo: "限定プロモ",
  booster: "ブースター",
  unknown: "不明",
};
