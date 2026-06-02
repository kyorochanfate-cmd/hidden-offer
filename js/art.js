// =========================================================================
// art.js — ピクセルアート（SVGで矩形を並べる）
// 各キャラは 16×20 グリッド、1セル=4px、最終サイズ 64×80 で出力。
// =========================================================================

// パレット
const P = {
  skin: "#f0c89a", skinSh: "#d09e6a", skinHl: "#ffe0b6",
  hair: "#1a0e08", hair2: "#2a1a10",
  eye: "#1a1a1a", eyeRed: "#d2483f",
  white: "#ffffff", grey: "#cccccc",
  navy: "#1f3a5f", navyHl: "#2c5384", navyLo: "#13243d",
  purple: "#5b2a8a", purpleHl: "#7a3fb6", purpleLo: "#3d1b5f",
  red: "#c0392b", redHl: "#e2483a", redLo: "#8a261c",
  green: "#2f855a", brown: "#5a3a1a",
  tan: "#e8c39a", sweat: "#5be8ff",
  shadow: "#00000040",
};

// ドット絵をピクセル文字列で受け取り SVG を返す。`.`/` ` は透明。
// 行の長さが揃っていなくても、最長行に合わせて自動パディング。
function buildPixel(rows, palette, scale = 4) {
  const W = Math.max(...rows.map((r) => r.length));
  const H = rows.length;
  const cells = [];
  for (let y = 0; y < H; y++) {
    const row = rows[y].padEnd(W, ".");
    for (let x = 0; x < W; x++) {
      const c = row[x];
      if (c === "." || c === " ") continue;
      const color = palette[c];
      if (!color) continue;
      cells.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${color}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W * scale} ${H * scale}" shape-rendering="crispEdges">${cells.join("")}</svg>`;
}

// =========================================================================
// 部下（汗かきの気弱なサラリーマン）— 「労働」担当
// =========================================================================
export const SVG_WORKER = buildPixel([
  "................",
  "....HHHHHHHH....",
  "...HhhhhhhhhH...",
  "..HhhhhhhhhhhH..",
  "..HsssssssssH...",   // 額
  "..sseessoeessZ..",   // 目+汗
  "..ssssssssssZZ..",
  "..ssMMmmMMssZZ..",   // 口（への字）
  "..ssssssssss....",
  "...nnnNNNnnn....",   // 首
  "..NNwNNNNwNN....",   // スーツ襟
  ".NNNwRRRRwNNN...",   // ネクタイ
  ".NNNwRRRRwNNN...",
  "NNNNNwwwwNNNNN..",
  "NNNNNNNNNNNNNN..",
  "NNNNNNNNNNNNNN..",
  "NNNN.NN.NN.NNN..",
  "NNN..NN..NN.NN..",
  "................",
  "................",
], {
  H: P.hair, h: P.hair, s: P.skin, S: P.skinSh, e: P.eye, o: P.skin,
  M: P.skinSh, m: P.skinSh, n: P.skin,
  N: P.navy, w: P.white, R: P.red,
  Z: P.sweat,
});

// =========================================================================
// 転職エージェント（黒髪・怪しい笑み・紫スーツ）— 「ガチャ」担当
// =========================================================================
export const SVG_AGENT = buildPixel([
  "................",
  "...HHHHHHHHHH...",
  "..HhhhhhhhhhhH..",
  "..HhhhhhhhhhhH..",
  "..HSssssssssSH..",
  "..ssseesseessH..",   // 目
  "..ssssssssssss..",
  "..ssMMMMMMMMss..",   // ニヤつき
  "..sssssssssss...",
  "...nnnNNNnnn....",
  "..PPwPPPPwPP....",
  ".PPPwRRRRwPPP...",
  ".PPPwRRRRwPPP...",
  "PPPPwwwwwwPPPP..",
  "PPPPPPPPPPPPPP..",
  "PPPPPPPPPPPPPP..",
  "PPP..PP..PP.PP..",
  "PP...PP...PP.P..",
  "................",
  "................",
], {
  H: P.hair, h: P.hair2, s: P.skin, S: P.skinSh, e: P.eye,
  M: "#8a3624",
  n: P.skin,
  P: P.purple, w: P.white, R: P.red,
});

// =========================================================================
// 部長（バーコードヘア・年配・赤ら顔気味）— 「上司」担当
// =========================================================================
export const SVG_BOSS = buildPixel([
  "................",
  "....bbbbbbbb....",
  "..bb.bbbbbb.bb..",   // バーコード
  "..bbssssssssbb..",
  ".bsssssssssss.b.",
  ".sseessoeesss.b.",
  ".ssssNNssssss.b.",   // 鼻の影
  ".sMMmmmmMMMss...",   // への字口
  "..ssssssssss....",
  "..ssss^^ssss....",   // 髭(へ-)
  "...nnnNNNnnn....",
  "..NNwNNNNwNN....",
  ".NNNwRRRRwNNN...",
  ".NNNwRRRRwNNN...",
  "NNNNwwwwwwNNNN..",
  "NNNNNNNNNNNNNN..",
  "NNNNNNNNNNNNNN..",
  "NNN.NNNNNN.NNN..",
  "................",
  "................",
], {
  b: P.hair, s: "#e8a872", S: P.skinSh, e: P.eye, o: P.skin,
  N: P.navy, w: P.white, R: P.red, n: P.skin,
  M: "#8a3624", m: "#8a3624", "^": P.hair2,
});

// =========================================================================
// 犬（茶色の柴犬っぽいキャラ）— 名刺交換ロビーにたまに紛れ込む
// =========================================================================
export const SVG_DOG = buildPixel([
  "................",
  "................",
  "..d............d",
  ".dDd..........dDd",
  "dDDDdddddddddDDDd",  // 耳と頭
  "dDDDDDDDDDDDDDDDd",
  ".dDDoeoeDDDDDDDd.",  // 目
  "..dDDDDpDDDDDDd..",  // 鼻
  "..dDDDDDDDDDDDd..",
  "..dDDDDDDDDDDDd..",  // 体
  "..ddDDDDDDDDDd...",
  "...dDDDDDDDDdt...",  // しっぽ t
  "...ll...l..l.....",  // 足
  "...ll...l..l.....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], {
  d: "#5a3a1c",    // 茶色の輪郭
  D: "#c89060",    // 茶色の体
  o: "#1a1a1a",    // 目
  e: "#ffffff",    // 目の白
  p: "#1a1a1a",    // 鼻
  l: "#3a2410",    // 足
  t: "#5a3a1c",    // しっぽ
}, 4);

// =========================================================================
// 猫（黒猫）— 同じくロビーに迷い込む
// =========================================================================
export const SVG_CAT = buildPixel([
  "................",
  "................",
  "..k............k",
  ".kKk..........kKk",
  "..kKKKKKKKKKKKk..",
  "..kKKKKKKKKKKKk..",
  "..kKKgygyKKKKKk..",  // 目（緑）
  "...kKKKKpKKKKk...",
  "...kKKKKKKKKKkt..",
  "...kKKKKKKKKKkt..",
  "...kkKKKKKKKkk...",
  "....ll..l..l.....",
  "....ll..l..l.....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], {
  k: "#0a0a0a",    // 輪郭
  K: "#1f1f1f",    // 体
  g: "#1a1a1a",    // 目（瞳孔）
  y: "#6cf06e",    // 目（緑）
  p: "#ff8ade",    // 鼻（ピンク）
  l: "#0a0a0a",    // 足
  t: "#0a0a0a",    // しっぽ
}, 4);

// =========================================================================
// 怪しいキャッチセールス（黒スーツ＋サングラス＋ニカッ笑顔）
// プレイヤーに名刺を押し付けようとしてくる → シカトが正解
// =========================================================================
export const SVG_SALESMAN = buildPixel([
  "................",
  "...HHHHHHHHHH...",
  "..HhhhhhhhhhhH..",   // 黒髪
  "..HhhhhhhhhhhH..",
  "..HsssssssssH...",   // 顔
  "..sGGGGsGGGGss..",   // サングラス
  "..sGGGGsGGGGss..",
  "..ssssssssssss..",
  "..sssWWWWWWsss..",   // ニカッと白い歯
  "..ssssCCCCssss..",   // 紙(名刺)を顎の下
  "..ssssssssssss..",
  "...nnnBBBnnn....",   // 首
  "..BBwBBBBwBB....",   // 黒スーツ襟
  ".BBBwYYYYwBBB...",   // 金ピカネクタイ
  ".BBBwYYYYwBBB...",
  "BBBBwwwwwwBBBB..",
  "BBBBBBBBBBBBBB..",
  "BBBBBBBBBBBBBB..",
  "BBB..BB..BB.BB..",
  "................",
], {
  H: "#1a1a1a",     // 髪輪郭
  h: "#2a1a10",     // 髪
  s: "#f0c89a",     // 肌
  G: "#000000",     // サングラス
  W: "#ffffff",     // 白い歯
  C: "#ffffff",     // 名刺
  n: "#f0c89a",
  B: "#0a0a0a",     // 黒スーツ
  w: "#ffffff",
  Y: "#ffd24a",     // 金ピカネクタイ
});

// =========================================================================
// 若手OL（茶髪ロング・ベージュブラウス・ピンクリップ）— 取引先・同僚など
// =========================================================================
export const SVG_OL = buildPixel([
  "................",
  "....HHHHHHHH....",
  "...HhhhhhhhhH...",
  "..HhhhhhhhhhhH..",
  "..HhhhhhhhhhhH..",   // 髪：茶色のロング
  "..HsssssssssH...",
  "..sseessoeesss..",   // 目
  "..ssssssnnssss..",   // 鼻
  "..ssssmmmmssss..",   // ピンクリップ
  "..ssssssssss....",
  "..HHHnnnNNnnnH..",   // 髪が肩にかかる
  ".HHHwBBBBBBwHHH.",   // ベージュブラウス
  ".HHHwBBBBBBwHHH.",
  ".HHHwwwwwwwwHHH.",
  "FFFFFFFFFFFFFFF.",   // 紺スカート
  "FFFFFFFFFFFFFFF.",
  "FFFFFFFFFFFFFFF.",
  "FFF..FF..FF.FFF.",
  "................",
  "................",
], {
  H: "#6b4423",   // 茶髪輪郭
  h: "#4a2f18",   // 茶髪
  s: "#f5d4a8",   // 肌
  e: "#1a1a1a",   // 目
  n: "#d8a878",   // 鼻ベース
  N: "#c89364",   // 鼻影
  m: "#d23b8a",   // ピンクリップ
  w: "#ffffff",   // ブラウスのインナー
  B: "#e8c89a",   // ベージュブラウス
  F: "#1f3a5f",   // 紺スカート
});

// =========================================================================
// 女性管理職（黒髪ボブ・紺スーツ・赤スカーフ）— 部長クラス
// =========================================================================
export const SVG_FEMALE_EXEC = buildPixel([
  "................",
  "....HHHHHHHH....",
  "...HhhhhhhhhH...",
  "..HhhhhhhhhhhH..",   // 黒髪ボブ
  "..HhhhhhhhhhhH..",
  "..HsssssssssHP..",   // P=ピアス
  "..ssBeessoeBss..",   // 鋭い眉
  "..sseessoeesss..",   // 目
  "..sssssnnsssss..",
  "..ssssMMMMssss..",   // 赤リップ
  "..ssssssssss....",
  "...nnnNNNnnn....",
  "..NNwRRRRRRwNN..",   // 赤スカーフ
  ".NNNwRRRRRRwNNN.",
  ".NNNwwwwwwwwNNN.",
  "NNNNNNNNNNNNNNN.",
  "NNNNNNNNNNNNNNN.",
  "NNN..NN..NN.NN..",
  "................",
  "................",
], {
  H: "#1a0e08",   // 黒髪輪郭
  h: "#2a1a10",   // 黒髪
  s: "#f0c89a",   // 肌
  e: "#1a1a1a",   // 目
  B: "#1a1a1a",   // 眉（鋭い）
  P: "#ffd24a",   // ピアス
  n: "#f0c89a",
  N: "#1f3a5f",   // 紺スーツ
  w: "#ffffff",   // インナー
  R: "#c0392b",   // 赤スカーフ
  M: "#c0392b",   // 赤リップ
});

// =========================================================================
// 求人リスト用の小さなアイコン（44x44想定。再利用）
// =========================================================================
export const SVG_AVATAR_SLIDE = buildPixel([
  "................",
  "................",
  "..wwwwwwwwww....",
  "..wwwwwwwwww....",
  "..wTTTTTwwww....",
  "..wwwwwwwwww....",
  "..wcccwwccccc...",
  "..wwwwwwwwww....",
  "..wccccwccwww...",
  "..wwwwwwwwww....",
  "..wcwccwwwccc...",
  "..wwwwwwwwww....",
  "..wwwbwwBwwww...",  // チャートバー
  "..wwwbwwBwwww...",
  "..wwwbBBBwwww...",
  "................",
  "................",
  "................",
  "................",
  "................",
], { w: "#f0e6c8", T: P.red, c: "#999", b: P.red, B: "#5b9bd5" }, 3);

export const SVG_AVATAR_CHAT = buildPixel([
  "................",
  "................",
  "..PPPPPPPPPP....",
  "..PPPPPPPPPP....",
  "..PwwwwwwwwP....",
  "..PwccccccwP....",
  "..PwwwwwwwwP....",
  "..PwccccwwwP....",
  "..PwwwwwwwwP....",
  "..PwccccccwP....",
  "..PPPPPPPPPP....",
  "...PPPP.........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { P: P.purple, w: "#f0e6c8", c: "#666" }, 3);

export const SVG_AVATAR_JIGGLER = buildPixel([
  "................",
  "................",
  "....MMMMMM......",
  "...MwwwwwwM.....",
  "...MwbbbbwM.....",   // 緑ステータス
  "...MwwwwwwM.....",
  "...MMwwwwMM.....",
  "....MMMMMM......",
  "....M.MMM.M.....",   // ケーブル
  ".....MMMMMM.....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { M: "#666", w: "#fff", b: P.green }, 3);

export const SVG_AVATAR_CARD = buildPixel([
  "................",
  "................",
  "..wwwwwwwwww....",
  "..wcccccccww....",
  "..wwwwwwwwww....",
  "..wcccwwwwww....",
  "..wwwwwwwwww....",
  "..wRRRwcccww....",
  "..wwwwwwwwww....",
  "..wRwRRwcccw....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { w: "#f0e6c8", c: "#888", R: P.red }, 3);

// =========================================================================
// 部長（PowerPotter用・顔アップ・表情4種）
// 14×14 グリッド、scale 6 = 84×84 で表示
// =========================================================================

// パレット
const BOSS_PAL = {
  b: "#1a0e08",     // 輪郭・メガネ・暗い部分
  s: "#fbc59e",     // 肌
  S: "#d89c72",     // 肌の影
  H: "#ffe0c8",     // 肌のハイライト
  e: P.eye,         // 目
  g: "#a0a0a0",     // 白髪・グレーの横髪
  y: "#d9a441",     // 金の指輪
  n: "#1c3254",     // スーツの影・首元
  w: "#ffffff",     // 白（シャツ・レンズ）
  N: "#2d4875",     // スーツ紺
  R: "#b03020",     // ネクタイ赤
  Z: "#5be8ff",     // 汗
};
const BOSS_PAL_RAGE = {
  ...BOSS_PAL,
  s: "#e88070",     // 顔が赤い
  S: "#b04030",
  H: "#f5a898",
  e: "#d2483f",
};
const BOSS_PAL_HAPPY = {
  ...BOSS_PAL,
  s: "#f5d4a8",
  S: "#d2a075",
  H: "#ffe8d0",
  e: "#1a1a1a",
};

// 普通：眉まっすぐ・口への字、手でメガネを触る
const BOSS_NORMAL = [
  "........................",
  "........bbbbbbbb........",
  "......bbHHssssSSbb......",
  ".....bHHssssssssSSb.....",
  "....bHHssssssssssSSb....",
  "....bHssssssssssssSb....",
  "..g.bssssssssssssSbg.g..",
  "..ggbsssbbssssbbssSbg...",
  "..g.bsssBssssssBssSb.g..",
  "...ssybweewbweewbS......", // メガネの中に目を配置 (bweewbweewb)
  "...sS.bbbbbbbbbbbS......",
  "......ssssSSssssS.......", // 鼻の影をSに変更
  ".......sssmMsssS........",
  "........bssssSb.........",
  ".........bSSSb..........",
  "........nNNNNNn.........",
  ".......NNwNNNNwNN.......",
  "......NNNwRRRRwNNN......",
  ".....NNNNwRRRRwNNNN.....",
  "....NNNNNNwwwwNNNNNN....",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "....NNNNNNNNNNNNNNNN....",
];

// 満足：目を細める、口角が上がる
const BOSS_HAPPY = [
  "........................",
  "........bbbbbbbb........",
  "......bbHHssssSSbb......",
  ".....bHHssssssssSSb.....",
  "....bHHssssssssssSSb....",
  "....bHssssssssssssSb....",
  "..g.bssssssssssssSbg.g..",
  "..ggbsssbbssssbbssSbg...",
  "..g.bsssBssssssBssSb.g..",
  "...ssybwMMwbwMMwbS......", // 目を細める
  "...sS.bbbbbbbbbbbS......",
  "......ssssSSssssS.......",
  ".......ssMmmmmMssS......", // 微笑み口
  "........bssssSb.........",
  ".........bSSSb..........",
  "........nNNNNNn.........",
  ".......NNwNNNNwNN.......",
  "......NNNwRRRRwNNN......",
  ".....NNNNwRRRRwNNNN.....",
  "....NNNNNNwwwwNNNNNN....",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "....NNNNNNNNNNNNNNNN....",
];

// イライラ：眉八の字、目を鋭く
const BOSS_IRRITATED = [
  "........................",
  "........bbbbbbbb........",
  "......bbHHssssSSbb......",
  ".....bHHssssssssSSb.....",
  "....bHHssssssssssSSb....",
  "....bHssssssssssssSb....",
  "..g.bssssssssssssSbg.g..",
  "..ggbsssBbssssBbsSbg...", // イライラ眉
  "..g.bsssBssssssBssSb.g..",
  "...ssybweewbweewbS......",
  "...sS.bbbbbbbbbbbS......",
  "......ssssSSssssS.......",
  ".......sssmMsssS........",
  "........bssssSb.........",
  ".........bSSSb..........",
  "........nNNNNNn.........",
  ".......NNwNNNNwNN.......",
  "......NNNwRRRRwNNN......",
  ".....NNNNwRRRRwNNNN.....",
  "....NNNNNNwwwwNNNNNN....",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "....NNNNNNNNNNNNNNNN....",
];

// 激怒：顔赤・眉吊り上げ・口開いて怒鳴る・汗
const BOSS_RAGE = [
  "........................",
  "........bbbbbbbb........",
  "......bbHHssssSSbb......",
  ".....bHHssssssssSSb.....",
  "....bHHssssssssssSSb....",
  "....bHssssssssssssSb....",
  "..g.bssssssssssssSbg.gZ.", // 汗
  "..ggbsssbbssssbbssSbg.Z.",
  "..g.bsssBssssssBssSb.g..",
  "...ssybweewbweewbS......",
  "...sS.bbbbbbbbbbbS......",
  "......ssssSSssssS.......",
  ".......ssmRRmssS........", // 口を開けて怒鳴る
  "........bssssSb.........",
  ".........bSSSb..........",
  "........nNNNNNn.........",
  ".......NNwNNNNwNN.......",
  "......NNNwRRRRwNNN......",
  ".....NNNNwRRRRwNNNN.....",
  "....NNNNNNwwwwNNNNNN....",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "...NNNNNNNNNNNNNNNNNN...",
  "....NNNNNNNNNNNNNNNN....",
];

export function generateBossSVG(mood) {
  const m = mood || "normal";
  if (m === "rage")      return buildPixel(BOSS_RAGE, BOSS_PAL_RAGE, 6);
  if (m === "irritated") return buildPixel(BOSS_IRRITATED, BOSS_PAL, 6);
  if (m === "happy")     return buildPixel(BOSS_HAPPY, BOSS_PAL_HAPPY, 6);
  return buildPixel(BOSS_NORMAL, BOSS_PAL, 6);
}

// トイレ逃避タイム用アイコン（個室ドア＋使用中）
// =========================================================================
// 俯瞰用キャラクター（頭＋肩を真上から見た絵）— 個室争奪戦の俯瞰ビュー
// =========================================================================
export const SVG_TOP_PLAYER = buildPixel([
  "................",
  "................",
  ".....HHHHHH.....",
  "....HhhhhhhH....",
  "...HhhhhhhhhH...",  // 黒髪頭頂部
  "...HhhhhhhhhH...",
  "...HhhhhhhhhH...",
  "....HsssssssH...",  // 額が少し見える
  ".NNNNNNNNNNNNNN.",  // スーツの肩
  "NNNNwwwwwwwwNNNN",
  "NNNwRRRRRRRRwNNN",  // ネクタイ
  "NNNwRRRRRRRRwNNN",
  ".NNNNNNNNNNNNNN.",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { H: "#1a0e08", h: "#2a1a10", s: "#f0c89a", N: "#1f3a5f", w: "#ffffff", R: "#c0392b" }, 3);

export const SVG_TOP_NPC_BOSS = buildPixel([
  "................",
  "................",
  "....bbbbbbbb....",
  "...bgbgbgbgbg...",  // バーコードヘア
  "...bsssssssssb..",
  "...bsssssssssb..",
  "....bsssssssb...",
  "................",
  "..NNNNNNNNNNNN..",
  ".NNNwwwwwwwwwNN.",
  ".NNwRRRRRRRRwNN.",
  ".NNwRRRRRRRRwNN.",
  "..NNNNNNNNNNNN..",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { b: "#1a0e08", g: "#cccccc", s: "#e8a872", N: "#1f3a5f", w: "#ffffff", R: "#c0392b" }, 3);

export const SVG_TOP_NPC_OL = buildPixel([
  "................",
  "................",
  "...HHHHHHHHHH...",
  "..HhhhhhhhhhhhH.",
  "..HhhhhhhhhhhhH.",  // ロングヘア
  "..HhhhsssshhhhH.",
  "..HhhsssssshhhH.",  // 顔
  "..HhhssssssshhH.",
  ".BBBBBBBBBBBBBB.",  // ブラウス
  "BBBBwwwwwwwwBBBB",
  "BBBwwwwwwwwwwBBB",
  "BBBwwwwwwwwwwBBB",
  ".BBBBBBBBBBBBBB.",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { H: "#6b4423", h: "#4a2f18", s: "#f5d4a8", B: "#e8c89a", w: "#ffffff" }, 3);

export const SVG_AVATAR_TOILET = buildPixel([
  "................",
  "................",
  "..wwwwwwwwwwww..",  // 個室の外枠
  "..wddddddddddw..",  // ドア
  "..wddddddddddw..",
  "..wdRdRdddRdRw..",  // 使用中の赤ランプ
  "..wddddddddddw..",
  "..wddddkdddddw..",  // ドアノブ
  "..wddddddddddw..",
  "..wddddddddddw..",
  "..wddddddddddw..",
  "..wddddddddddw..",
  "..wwwwwwwwwwww..",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { w: "#666", d: "#c89060", R: "#d2483f", k: "#ffd24a" }, 3);

export const AVATARS = {
  powerpotter: SVG_AVATAR_SLIDE,
  chatrally:   SVG_AVATAR_CHAT,
  jiggler:     SVG_AVATAR_JIGGLER,
  exchange:    SVG_AVATAR_CARD,
  toilet:      SVG_AVATAR_TOILET,
};

// 散らし装飾アイコン（emoji の代替 — SVGでドット絵風コイン・書類・マウス・コーヒー）
export const SVG_FX_COIN = buildPixel([
  "..yyyy..",
  ".yYYYYy.",
  "yYYzzYYy",
  "yYzZZzYy",
  "yYzZZzYy",
  "yYYzzYYy",
  ".yYYYYy.",
  "..yyyy..",
], { y: P.gold || "#c98a16", Y: "#ffd24a", z: "#8a5a0a", Z: "#ffe88a" }, 3);

export const SVG_FX_DOC = buildPixel([
  "wwwwwwww",
  "wkkkkkkw",
  "wwwwwwww",
  "wkkkwwww",
  "wwwwwwww",
  "wkkkkkww",
  "wwwwwwww",
  "wwwwwwww",
], { w: "#f3edd6", k: "#7a6b3a" }, 3);
