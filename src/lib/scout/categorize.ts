// 決定論的な分類・除外ルールエンジン（APIキー不要）
import type {
  Categorization,
  Category,
  CardIdentity,
  DistributionType,
  RarityTier,
} from "./types";

/** 人気キャラ辞書（小文字キー → 人気度 0..100）。AI補助で上書き可。 */
export const CHARACTER_POPULARITY: Record<string, number> = {
  luffy: 92,
  zoro: 88,
  nami: 82,
  sanji: 80,
  ace: 86,
  shanks: 85,
  law: 80,
  yamato: 78,
  robin: 78,
  chopper: 74,
  sabo: 72,
  kid: 70,
  doflamingo: 70,
  crocodile: 68,
  katakuri: 74,
  rebecca: 66,
  hancock: 76,
  uta: 72,
  bonney: 66,
  bonney_jewelry: 66,
  kaido: 72,
  "big mom": 68,
  whitebeard: 80,
  roger: 80,
  reiju: 60,
  perona: 62,
  vivi: 64,
  enel: 64,
  bellamy: 55,
  garp: 70,
  kuzan: 66,
  smoker: 58,
  tashigi: 56,
};

const CHARACTER_NAMES = Object.keys(CHARACTER_POPULARITY).filter(
  (k) => !k.includes(" ") && !k.includes("_"),
);

/** 優先カテゴリ（大会配布・限定配布・イベント配布・プロモ系） */
interface CategoryRule {
  category: Category;
  re: RegExp;
  distribution: DistributionType;
}

const PRIORITY_RULES: CategoryRule[] = [
  { category: "store_champion", re: /store\s*champ(ion(ship)?)?/i, distribution: "tournament" },
  { category: "pre_release", re: /pre[\s-]?release/i, distribution: "event" },
  { category: "regional", re: /\bregional?s?\b/i, distribution: "tournament" },
  { category: "championship", re: /\bchampionship\b/i, distribution: "tournament" },
  { category: "winner", re: /\bwinner\b/i, distribution: "tournament" },
  { category: "top_player", re: /top\s*player/i, distribution: "tournament" },
  { category: "finalist", re: /\bfinalist\b/i, distribution: "tournament" },
  { category: "event_pack", re: /\bevent\s*pack\b/i, distribution: "event" },
  { category: "participation_pack", re: /\bparticipation\s*pack\b/i, distribution: "event" },
  { category: "sealed_promo", re: /\b(sealed|unopened)\b.*\bpromo/i, distribution: "promo" },
  { category: "sealed_promo", re: /未開封プロモ/, distribution: "promo" },
  { category: "promo", re: /\bpromo(tion(al)?)?\b/i, distribution: "promo" },
  { category: "promo", re: /英語版限定|大会配布|イベント配布/, distribution: "promo" },
];

/** 除外カテゴリ */
interface ExclusionRule {
  category: Category;
  re: RegExp;
  reason: string;
}

const EXCLUSION_RULES: ExclusionRule[] = [
  { category: "leader_parallel", re: /\bleader\s*parallel\b/i, reason: "リーダーパラレル" },
  { category: "comic_parallel", re: /\b(comic|manga)\s*(art|parallel)\b/i, reason: "コミパラ" },
  { category: "comic_parallel", re: /コミパラ/, reason: "コミパラ" },
  { category: "secret_rare", re: /\bsecret\s*rare\b/i, reason: "シークレットレア" },
  { category: "secret_rare", re: /\bSEC\b/, reason: "シークレットレア(SEC)" },
  { category: "sp", re: /\bspecial\s*(card|parallel|rare)\b/i, reason: "SP(スペシャル)" },
  { category: "sp", re: /\bSP\b/, reason: "SP" },
  { category: "normal_parallel", re: /\bparallel\b/i, reason: "通常パラレル" },
  { category: "booster", re: /\bbooster\b/i, reason: "ブースター封入" },
];

const RARITY_HINT_RE = /\b(stamped|gold\s*stamp|champ\s*stamp|1\s*of\s*\d+|serial)\b/i;
const SECRET_RARITY_RE = /\b(secret\s*rare|SEC)\b/i;
const CARD_NUMBER_RE = /\b(OP|ST|EB|PRB|P)\s?-?\s?(\d{2,3})\s?-?\s?(\d{2,3})\b/i;
const ONE_PIECE_RE = /one\s*piece/i;
const GENERIC_ONLY_RE =
  /^(?:\s*(?:one\s*piece|card|tcg|english|trading|game|holo|foil|mint|nm)\s*)+$/i;

function distributionRank(d: DistributionType): number {
  switch (d) {
    case "tournament":
      return 4;
    case "event":
      return 3;
    case "promo":
      return 2;
    case "booster":
      return 1;
    default:
      return 0;
  }
}

/** タイトルを分類して配布形態・除外可否・タイトル弱さ・希少度を返す */
export function categorize(rawTitle: string): Categorization {
  const title = rawTitle ?? "";

  const categories = new Set<Category>();
  let distribution: DistributionType = "unknown";

  for (const rule of PRIORITY_RULES) {
    if (rule.re.test(title)) {
      // regional は winner/finalist と共起したときのみ大会扱いを強める（単独でも tournament 寄り）
      categories.add(rule.category);
      if (distributionRank(rule.distribution) > distributionRank(distribution)) {
        distribution = rule.distribution;
      }
    }
  }

  const hasPriority = categories.size > 0;

  // 除外判定（優先カテゴリが一切無い場合のみ実際に除外する）
  const exclusionReasons: string[] = [];
  for (const rule of EXCLUSION_RULES) {
    if (rule.re.test(title)) {
      categories.add(rule.category);
      exclusionReasons.push(rule.reason);
    }
  }

  // ブースター推定: OPxx-xxx の番号 + レアリティ語があり、優先カテゴリが無い
  if (!hasPriority && CARD_NUMBER_RE.test(title) && /\b(SR|SEC|R|UC|C|L)\b/.test(title)) {
    if (!categories.has("booster")) {
      categories.add("booster");
      exclusionReasons.push("ブースター封入(番号+レアリティ)");
    }
  }

  const isExcluded = !hasPriority && exclusionReasons.length > 0;
  if (isExcluded && distribution === "unknown") {
    distribution = "booster";
  }

  return {
    categories: [...categories],
    isExcluded,
    exclusionReasons: hasPriority ? [] : exclusionReasons,
    distributionType: distribution,
    titleWeakness: computeTitleWeakness(title),
    rarityTier: computeRarityTier(title, categories),
  };
}

/** タイトルの弱さ（市場が気付きにくい度合い） 0..1 */
export function computeTitleWeakness(title: string): number {
  let w = 0;
  const tokens = title.trim().split(/\s+/).filter(Boolean);

  if (!CARD_NUMBER_RE.test(title)) w += 0.3;
  if (tokens.length < 5) w += 0.2;
  if (title === title.toLowerCase() && /[a-z]/.test(title)) w += 0.1; // 全小文字
  if (!ONE_PIECE_RE.test(title)) w += 0.2;
  if (looksMisspelled(title)) w += 0.15;
  if (GENERIC_ONLY_RE.test(title.trim())) w += 0.15;

  return Math.max(0, Math.min(1, Number(w.toFixed(3))));
}

function computeRarityTier(title: string, categories: Set<Category>): RarityTier {
  if (RARITY_HINT_RE.test(title)) return "ultra";
  if (
    categories.has("winner") ||
    categories.has("championship") ||
    categories.has("store_champion") ||
    categories.has("top_player")
  ) {
    return "ultra";
  }
  if (SECRET_RARITY_RE.test(title)) return "high";
  if (
    categories.has("regional") ||
    categories.has("finalist") ||
    categories.has("event_pack") ||
    categories.has("pre_release")
  ) {
    return "high";
  }
  if (categories.has("promo") || categories.has("sealed_promo")) return "mid";
  return "low";
}

/** 簡易誤字検出: キャラ名に近いが一致しないトークンがある */
function looksMisspelled(title: string): boolean {
  const tokens = title.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  for (const t of tokens) {
    for (const name of CHARACTER_NAMES) {
      if (t === name) continue;
      if (Math.abs(t.length - name.length) > 1) continue;
      if (levenshtein(t, name) === 1) return true;
    }
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/** タイトルからカード同定情報を抽出 */
export function parseCardIdentity(rawTitle: string): CardIdentity {
  const title = rawTitle ?? "";
  let cardNumber: string | null = null;
  let setCode: string | null = null;

  const m = title.match(CARD_NUMBER_RE);
  if (m) {
    const prefix = m[1].toUpperCase();
    setCode = `${prefix}${m[2]}`;
    cardNumber = `${prefix}${m[2]}-${m[3]}`;
  }

  let character: string | null = null;
  const lower = title.toLowerCase();
  for (const name of Object.keys(CHARACTER_POPULARITY)) {
    if (lower.includes(name)) {
      character = name;
      break;
    }
  }

  return {
    cardName: normalizeCardName(title),
    cardNumber,
    setCode,
    character,
  };
}

/** グルーピング用の正規化名（カード番号があればそれ、無ければ整形タイトル） */
export function normalizeCardName(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .replace(/[|｜]/g, " ")
    .trim()
    .slice(0, 120);
}

/** 重複排除キー: カード番号優先、無ければ正規化名（小文字） */
export function dedupKey(identity: CardIdentity): string {
  if (identity.cardNumber) return `num:${identity.cardNumber.toLowerCase()}`;
  return `name:${identity.cardName.toLowerCase()}`;
}

export function characterPopularity(character: string | null): number {
  if (!character) return 50;
  return CHARACTER_POPULARITY[character.toLowerCase()] ?? 50;
}
