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
  b: P.hair,        // 黒髪
  s: "#f0c89a",     // 肌
  S: "#d09e6a",     // 肌の影
  e: P.eye,
  n: "#c89364",     // 鼻
  m: "#5a2618",     // 口（普通）
  M: "#3a1a0e",     // 口の影
  w: "#ffffff",     // 襟
  N: "#1f3a5f",     // スーツ
  R: "#c0392b",     // ネクタイ
  Z: "#5be8ff",     // 汗
};
const BOSS_PAL_RAGE = {
  ...BOSS_PAL,
  s: "#e88070",     // 顔が赤い
  S: "#b04030",
  e: "#d2483f",
  m: "#3a0e08",
  M: "#1a0604",
};
const BOSS_PAL_HAPPY = {
  ...BOSS_PAL,
  s: "#f5d4a8",
  e: "#1a1a1a",
  m: "#7a3022",
};

// 普通：眉まっすぐ・口への字
const BOSS_NORMAL = [
  "..............",
  "...bbbbbbbb...",
  "..bbbbbbbbbb..",   // 髪
  "..bsssssssSb..",
  "..ssssssssss..",
  "..sbbsssssbbS.",   // 眉
  "..sessoosess..",   // 目
  "..sssssnnssss.",   // 鼻
  "..sssMmmmMsss.",   // 口（小さくへの字）
  "..ssssMMssssS.",
  "...nNNNNNNn...",   // 首
  "..NNwNNNNwNN..",   // スーツ襟
  ".NNNwRRRRwNNN.",   // ネクタイ
  "..NNNRRRRNNN..",
];

// 満足：少し目を細めて口角上がる
const BOSS_HAPPY = [
  "..............",
  "...bbbbbbbb...",
  "..bbbbbbbbbb..",
  "..bsssssssSb..",
  "..ssssssssss..",
  "..sbbsssssbbS.",
  "..ssMMooMMsss.",   // 目を細める（横線）
  "..sssssnnssss.",
  "..sMmmmmmmMss.",   // 微笑
  "..sssmmmmsssS.",
  "...nNNNNNNn...",
  "..NNwNNNNwNN..",
  ".NNNwRRRRwNNN.",
  "..NNNRRRRNNN..",
];

// イライラ：眉八の字、口がへの字
const BOSS_IRRITATED = [
  "..............",
  "...bbbbbbbb...",
  "..bbbbbbbbbb..",
  "..bsssssssSb..",
  "..ssssssssss..",
  "..sbBssssbbsS.",   // 眉八の字
  "..sBessoseBss.",   // 目を鋭く
  "..sssssnnssss.",
  "..sMMmmmmMMss.",   // への字さらに
  "..sssMMMMsssS.",
  "...nNNNNNNn...",
  "..NNwNNNNwNN..",
  ".NNNwRRRRwNNN.",
  "..NNNRRRRNNN..",
];

// 激怒：顔赤・眉吊り上げ・口開いて怒鳴る・汗
const BOSS_RAGE = [
  "..............",
  "...bbbbbbbb...",
  "..bbbbbbbbbb..",
  "..bsssssssSb..",
  "..ssssssssssZ.",   // 汗
  "..sBBsssssBBsZ",   // 眉吊上
  "..sezessoseessZ",  // 目鋭く
  "..sssssnnssss.",
  "..sMMMMMMMMss.",   // 大きな口
  "..sMmmmmmmmMss",   // 怒鳴る
  "...nNNNNNNn...",
  "..NNwNNNNwNN..",
  ".NNNwRRRRwNNN.",
  "..NNNRRRRNNN..",
];

export function generateBossSVG(mood) {
  const m = mood || "normal";
  if (m === "rage")      return buildPixel(BOSS_RAGE, BOSS_PAL_RAGE, 6);
  if (m === "irritated") return buildPixel(BOSS_IRRITATED, BOSS_PAL, 6);
  if (m === "happy")     return buildPixel(BOSS_HAPPY, BOSS_PAL_HAPPY, 6);
  return buildPixel(BOSS_NORMAL, BOSS_PAL, 6);
}

export const AVATARS = {
  powerpotter: SVG_AVATAR_SLIDE,
  chatrally:   SVG_AVATAR_CHAT,
  jiggler:     SVG_AVATAR_JIGGLER,
  exchange:    SVG_AVATAR_CARD,
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
