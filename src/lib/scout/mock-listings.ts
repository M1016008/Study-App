// 同梱サンプル出品データ（eBay API キー無しでも end-to-end 動作させるため）
// 全カテゴリ（大会配布/イベント/プロモ）+ 除外対象（パラレル/SEC/ブースター）を網羅
import type { Listing } from "./types";

function l(
  id: string,
  title: string,
  value: number,
  buyingOptions: string[] = ["FIXED_PRICE"],
  condition = "Near Mint",
): Listing {
  return {
    ebayItemId: id,
    title,
    price: { value, currency: "USD" },
    listingUrl: `https://www.ebay.com/itm/${id}`,
    imageUrl: null,
    condition,
    buyingOptions,
    seller: `seller_${id.slice(-3)}`,
  };
}

export const MOCK_LISTINGS: Listing[] = [
  // --- 大会配布系（tournament） ---
  l("3001", "One Piece Card Game Monkey D Luffy Winner OP01 Promo English", 145),
  l("3002", "one piece luffy winner card english", 96), // タイトル弱め
  l("3003", "One Piece TCG Zoro Regional Winner Trophy English Promo", 220),
  l("3004", "One Piece Card Regional Finalist Sanji English", 70),
  l("3005", "One Piece Store Champion Nami Stamped Promo English", 180),
  l("3006", "OnePiece Championship Shanks Top Player English card", 410),
  l("3007", "One Piece Finalist Law Promo English NM", 65),
  l("3008", "One Piece Card Game Ace Store Championship Winner English", 260),
  l("3009", "luffy regional english", 58), // 非常に弱いタイトル
  l("3010", "One Piece Top Player Yamato Promo English Tournament", 150),

  // --- イベント配布系（event） ---
  l("3020", "One Piece Card Game Event Pack Vol 1 Sealed English", 40, ["FIXED_PRICE"], "Brand New"),
  l("3021", "One Piece Participation Pack Promo English Robin", 28),
  l("3022", "One Piece Pre Release Pack Chopper English Promo", 35),
  l("3023", "One Piece Card Pre-Release Winner Hancock English", 130),

  // --- プロモ・未開封プロモ（promo） ---
  l("3030", "One Piece English Exclusive Promo Sabo Sealed unopened promo", 48, ["FIXED_PRICE"], "Brand New"),
  l("3031", "One Piece Promo Card Uta English limited", 33),
  l("3032", "One Piece Promotional Card Vivi English", 22),
  l("3033", "one piece english promo enel", 19),

  // --- 紛らわしい誤字タイトル（弱さ高） ---
  l("3040", "one piece luffi winner promo english", 75), // luffi=誤字
  l("3041", "one piece zorro regional english card", 60), // zorro=誤字

  // --- 除外対象（heavily deprioritize） ---
  l("3050", "One Piece Card Game Luffy Leader Parallel OP05-119 SR English", 95),
  l("3051", "One Piece Nami Comic Art Parallel OP06-080 English", 140),
  l("3052", "One Piece Zoro Secret Rare SEC OP01-120 English Manga", 320),
  l("3053", "One Piece Shanks Parallel SR OP02-013 English", 88),
  l("3054", "One Piece Booster Box Romance Dawn OP01 SR English Sealed", 210, ["FIXED_PRICE"], "Brand New"),
  l("3055", "One Piece Special SP Card Doflamingo English", 45),
  l("3056", "One Piece Sanji Comic Parallel OP07-070 English", 110),

  // --- 通常レア（booster相当、unknown寄り） ---
  l("3060", "One Piece Card Game Crocodile R OP03-021 English", 6),
  l("3061", "One Piece Card Katakuri SR OP04-097 English", 14),
];
