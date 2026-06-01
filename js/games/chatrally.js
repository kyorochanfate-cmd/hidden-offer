// =========================================================================
// chatrally.js — 実装予定プレースホルダー（レトロ版）
// =========================================================================

import { el } from "../dom.js";
import { Router } from "../app.js";

export function startChatRally(mount, gameId) {
  mount(placeholder("チャット・レスポンス・ラリー", "💬", "ビジネスチャット忖度シミュレーター"));
  return {};
}

function placeholder(title, emoji, sub) {
  return el("div.screen.retro", {}, [
    el("div.retro-body", {}, [
      el("div.retro-appbar", {}, [
        el("button.retro-back", { text: "←", onclick: () => Router.menu() }),
        el("div.retro-page-title", { text: title }),
      ]),
      el("div", { style: { padding: "40px 24px", textAlign: "center" } }, [
        el("div", { style: { fontSize: "80px", filter: "drop-shadow(0 0 16px rgba(194,103,255,.6))" }, text: emoji }),
        el("div", { style: { marginTop: "20px", fontFamily: "var(--r-font-en)", fontSize: "12px", letterSpacing: ".18em", color: "var(--r-yellow)" }, text: "COMING SOON" }),
        el("div", { style: { marginTop: "8px", fontSize: "16px", fontWeight: "700", color: "#fff", textShadow: "2px 2px 0 #1a1230" }, text: "実装予定" }),
        el("div", { style: { marginTop: "12px", fontSize: "13px", color: "var(--r-sub)", lineHeight: "1.7" }, text: sub + "\nPowerPotter の方向性が固まったら順次作り込みます。" }),
        el("div", { style: { marginTop: "24px" } }, [
          el("button.pbtn.purple", { onclick: () => Router.menu() }, [el("span", { text: "メニューに戻る" })]),
        ]),
      ]),
    ]),
  ]);
}
