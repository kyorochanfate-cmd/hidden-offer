// =========================================================================
// jobs.js — 求人一覧（労働を選ぶ）
// 「労働」ボタンから遷移。ロックは灰色＋カギ表示。
// =========================================================================

import { el } from "../dom.js";
import { Store } from "../state.js";
import { GAMES, GAME_ORDER } from "../data.js";
import { Router } from "../app.js";
import { AVATARS } from "../art.js";

export function renderJobs(mount) {
  const screen = el("div.screen.retro", {}, [
    bgFxSimple(),
    el("div.retro-body", {}, [
      el("div.retro-appbar", {}, [
        el("button.retro-back", { text: "←", onclick: () => Router.menu() }),
        el("div.retro-page-title", { text: "求人一覧" }),
        el("div.spacer"),
        el("div.retro-chip", {}, [el("span.coin", { text: "$" }), el("span", { text: String(Store.coins) })]),
      ]),

      el("div.retro-section", { text: "本日の非公開求人" }),

      el("div.retro-scroll", {}, [
        el("div", { style: { padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: "10px" } },
          GAME_ORDER.map(buildRow)),
      ]),
    ]),
  ]);
  mount(screen);
  return {};
}

function buildRow(id) {
  const g = GAMES[id];
  const unlocked = Store.isUnlocked(id);
  if (!unlocked) {
    return el("div.retro-row.locked", {}, [
      el("div.av", { style: { display: "grid", placeItems: "center", color: "var(--r-mute)", fontSize: "22px" }, text: "🔒" }),
      el("div.t", {}, [
        el("div.tt", { text: "？？？" }),
        el("div.ss", { text: "未解放の非公開求人" }),
      ]),
      el("div.go", { text: "—" }),
    ]);
  }
  return el("div.retro-row", { onclick: () => Router.game(id) }, [
    el("div.av", { html: AVATARS[id] || "" }),
    el("div.t", {}, [
      el("div.tt", { text: g.jpTitle }),
      el("div.ss", { text: g.theme }),
    ]),
    el("div.go", { text: "▶" }),
  ]);
}

function bgFxSimple() {
  const items = [
    { e: "$", x: 86, y: 8, c: "coin", s: 24 },
    { e: "📄", x: 6, y: 14, c: "doc", s: 20 },
    { e: "☕", x: 8, y: 88, c: "coffee", s: 22 },
    { e: "🖱", x: 88, y: 86, c: "mouse", s: 20 },
  ];
  return el("div.retro-bg-fx", {},
    items.map((it) => el("div", {
      class: "fx " + it.c,
      style: { left: it.x + "%", top: it.y + "%", fontSize: it.s + "px" },
      text: it.e,
    })),
  );
}
