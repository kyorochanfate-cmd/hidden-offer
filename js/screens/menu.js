// =========================================================================
// menu.js — タイトル/ホーム（ピクセル・ネオン路線）
// 構成：ロゴ／キャラ3体／3ボタン／設定／TAP TO START／背景散らしアイコン
// =========================================================================

import { el } from "../dom.js?v=1.2.2";
import { Store } from "../state.js?v=1.2.2";
import { GAMES, GAME_ORDER } from "../data.js?v=1.2.2";
import { Router } from "../app.js?v=1.2.2";

export function renderMenu(mount) {
  const screen = el("div.screen.retro", {}, [
    bgFx(),
    el("div.retro-body", {}, [
      // ロゴ
      el("div", { style: { padding: "calc(16px + var(--safe-top)) 16px 4px", textAlign: "center" } }, [
        el("div.neon-sparks", {}, [
          el("div.neon-logo-jp", { text: "非公開", style: { lineHeight: "0.95" } }),
          el("div.neon-logo-jp", { text: "求人", style: { lineHeight: "0.95" } }),
        ]),
      ]),

      // 佐藤部長＆吹き出し
      el("div.boss-showcase", {}, [
        el("img", { src: "assets/img/boss.png", alt: "佐藤部長" }),
        el("div.boss-speech-bubble", { text: getRandomBossQuote() }),
      ]),

      el("div.spacer"),

      // ステータス（残高チップ）
      el("div", { style: { display: "flex", justifyContent: "center", gap: "8px", padding: "0 16px 8px" } }, [
        el("div.retro-chip", {}, [el("span.coin", { text: "¥" }), el("span", { text: `${Store.coins} 円` })]),
        el("div.retro-chip", { style: { color: "var(--r-cyan)", boxShadow: "inset 0 0 0 2px var(--r-cyan), 0 2px 0 rgba(0,0,0,.5)", textShadow: "0 0 6px rgba(91,232,255,.7)" } },
          [el("span", { text: `${Store.unlockedCount()}/${GAME_ORDER.length} 求人解放` })]),
      ]),

      // メインボタン
      el("div", { style: { padding: "8px 22px 18px", display: "flex", flexDirection: "column", gap: "12px" } }, [
        bigButton("労働する", "", "green", () => Router.go("jobs")),
        bigButton("求人を探す", "", "yellow", () => Router.gacha()),
        bigButton("コレクション", "", "purple", () => Router.collection()),
        bigButton("設定", "", "outline", () => Router.go("settings")),
      ]),

      // TAP TO START（点滅・装飾）
      el("div.tap-start", { text: "TAP TO START", style: { paddingBottom: "calc(14px + var(--safe-bottom))" } }),
    ]),
  ]);

  mount(screen);
  return {};
}

function bigButton(label, sub, variant, onclick) {
  return el("button", {
    class: "pbtn block " + variant,
    onclick,
  }, [
    el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", lineHeight: "1.1" } }, [
      el("span", { text: label, style: { fontSize: "22px" } }),
      sub ? el("span.sub", { text: sub }) : null,
    ]),
  ]);
}

// 背景の散らしアイコン
function bgFx() {
  const items = [
    { e: "☕", c: "coffee", x: 8,  y: 5,  s: 26, rot: -8, d: 0 },
    { e: "📄", c: "doc",    x: 80, y: 6,  s: 24, rot: 12, d: .3 },
    { e: "¥",  c: "coin",   x: 88, y: 14, s: 22, rot: 0,  d: .6 },
    { e: "🖱", c: "mouse",  x: 4,  y: 22, s: 22, rot: -6, d: .9 },
    { e: "¥",  c: "coin",   x: 78, y: 32, s: 30, rot: 6,  d: .2 },
    { e: "+",  c: "spark",  x: 12, y: 38, s: 18, rot: 0,  d: .4 },
    { e: "🖱", c: "mouse",  x: 84, y: 50, s: 22, rot: 14, d: 1.2 },
    { e: "¥",  c: "coin",   x: 6,  y: 62, s: 24, rot: -10, d: .8 },
    { e: "+",  c: "spark",  x: 86, y: 68, s: 16, rot: 0,  d: 1.5 },
    { e: "☕", c: "coffee", x: 80, y: 88, s: 26, rot: -10, d: .5 },
    { e: "📄", c: "doc",    x: 6,  y: 86, s: 22, rot: 8, d: 1.0 },
  ];
  return el("div.retro-bg-fx", {},
    items.map((it) => el("div", {
      class: "fx " + it.c,
      style: {
        left: it.x + "%", top: it.y + "%",
        fontSize: it.s + "px",
        "--rot": it.rot + "deg",
        animationDelay: it.d + "s",
        transform: `rotate(${it.rot}deg)`,
      },
      text: it.e,
    })),
  );
}

function getRandomBossQuote() {
  const quotes = [
    "この求人は極秘だ、口外するなよ…",
    "しっかり労働したまえ！",
    "残業代？ 弊社はやりがいを支給している。",
    "また仕様変更だと？ すぐに修正しろ！",
    "定時退社などという都市伝説を信じるな。",
    "労働は…素晴らしいことだぞ…フフ…",
    "結果を出せば、非公開求人が待っているぞ。",
    "有給休暇？ 君は何を言っているんだね？",
    "求人は自分の手で勝ち取るものだ。"
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}
