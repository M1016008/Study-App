// broad search 結果から「再検索すべき特徴語」を抽出する（決定論的）
import { categorize, parseCardIdentity } from "./categorize";
import type { Listing } from "./types";

const SIGNAL_TERMS: Array<{ term: string; re: RegExp; weight: number }> = [
  { term: "winner", re: /\bwinner\b/i, weight: 5 },
  { term: "regional", re: /\bregional?s?\b/i, weight: 5 },
  { term: "store champion", re: /store\s*champ/i, weight: 5 },
  { term: "championship", re: /\bchampionship\b/i, weight: 4 },
  { term: "finalist", re: /\bfinalist\b/i, weight: 4 },
  { term: "top player", re: /top\s*player/i, weight: 4 },
  { term: "pre release", re: /pre[\s-]?release/i, weight: 3 },
  { term: "event pack", re: /event\s*pack/i, weight: 3 },
  { term: "participation pack", re: /participation\s*pack/i, weight: 3 },
  { term: "promo", re: /\bpromo/i, weight: 2 },
];

/**
 * 出品群を分析し、再検索に使う特徴語を頻度×シグナル重みでランキングして返す。
 * 上位 maxTerms 件（既定8）を返す。
 */
export function discoverFeatureWords(listings: Listing[], maxTerms = 8): string[] {
  const scores = new Map<string, number>();

  for (const listing of listings) {
    const title = listing.title;

    // シグナル語の出現
    for (const s of SIGNAL_TERMS) {
      if (s.re.test(title)) {
        scores.set(s.term, (scores.get(s.term) ?? 0) + s.weight);
      }
    }

    // キャラ名（大会配布系出品に限り再検索価値が高い）
    const cat = categorize(title);
    if (!cat.isExcluded && cat.distributionType !== "unknown") {
      const ident = parseCardIdentity(title);
      if (ident.character) {
        const key = ident.character;
        scores.set(key, (scores.get(key) ?? 0) + 2);
      }
      if (ident.setCode) {
        scores.set(ident.setCode.toLowerCase(), (scores.get(ident.setCode.toLowerCase()) ?? 0) + 1);
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term]) => term);
}
