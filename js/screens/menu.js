// =========================================================================
// menu.js — タイトル/ホーム（ピクセル・ネオン路線）
// 構成：ロゴ／キャラ3体／3ボタン／設定／TAP TO START／背景散らしアイコン
// =========================================================================

import { el } from "../dom.js";
import { Store } from "../state.js";
import { GAMES, GAME_ORDER } from "../data.js";
import { Router } from "../app.js";
import { SVG_WORKER, SVG_AGENT, SVG_BOSS, AVATARS } from "../art.js";

export function renderMenu(mount) {
  const screen = el("div.screen.retro", {}, [
    bgFx(),
    el("div.retro-body", {}, [
      // ロゴ
      el("div", { style: { padding: "calc(16px + var(--safe-top)) 16px 4px", textAlign: "center" } }, [
        el("div.neon-sparks", {}, [
          el("div.neon-logo.lg", { text: "THE" }),
          el("div.neon-logo.lg", { text: "HIDDEN" }),
          el("div.neon-logo.lg", { text: "OFFER" }),
        ]),
        el("div.neon-sub", { text: "非公開求人", style: { marginTop: "6px" } }),
      ]),

      // キャラ3体
      el("div.char-strip", {}, [
        character("部下求人", SVG_WORKER),
        character("転職エージェント", SVG_AGENT),
        character("上司", SVG_BOSS),
      ]),

      // ステータス（残高チップ）
      el("div", { style: { display: "flex", justifyContent: "center", gap: "8px", padding: "0 16px 8px" } }, [
        el("div.retro-chip", {}, [el("span.coin", { text: "$" }), el("span", { text: `${Store.coins} コイン` })]),
        el("div.retro-chip", { style: { color: "var(--r-cyan)", boxShadow: "inset 0 0 0 2px var(--r-cyan), 0 2px 0 rgba(0,0,0,.5)", textShadow: "0 0 6px rgba(91,232,255,.7)" } },
          [el("span", { text: `${Store.unlockedCount()}/${GAME_ORDER.length} 求人解放` })]),
      ]),

      // メインボタン
      el("div", { style: { padding: "8px 22px 4px", display: "flex", flexDirection: "column", gap: "12px" } }, [
        bigButton("労働", "（ミニゲーム）", "green", () => Router.go("jobs")),
        bigButton("エージェント", "（ガチャ）", "yellow", () => Router.gacha()),
        bigButton("コレクション", "", "outline", () => Router.collection()),
      ]),

      // 設定リンク
      el("div", { style: { textAlign: "center", paddingTop: "4px" } }, [
        el("button.retro-link", { text: "設定", onclick: () => Router.go("settings") }),
      ]),

      el("div.spacer"),

      // TAP TO START（点滅・装飾）
      el("div.tap-start", { text: "TAP TO START", style: { paddingBottom: "calc(14px + var(--safe-bottom))" } }),
    ]),
  ]);

  mount(screen);
  return {};
}

function character(name, svg) {
  return el("div.char", {}, [
    el("div.char-art", { html: svg }),
    el("div.char-name", { text: name }),
  ]);
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
    { e: "$",  c: "coin",   x: 88, y: 14, s: 22, rot: 0,  d: .6 },
    { e: "🖱", c: "mouse",  x: 4,  y: 22, s: 22, rot: -6, d: .9 },
    { e: "$",  c: "coin",   x: 78, y: 32, s: 30, rot: 6,  d: .2 },
    { e: "+",  c: "spark",  x: 12, y: 38, s: 18, rot: 0,  d: .4 },
    { e: "🖱", c: "mouse",  x: 84, y: 50, s: 22, rot: 14, d: 1.2 },
    { e: "$",  c: "coin",   x: 6,  y: 62, s: 24, rot: -10, d: .8 },
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
