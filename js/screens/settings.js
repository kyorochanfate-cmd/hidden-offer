// =========================================================================
// settings.js — 設定（音量・リセット）
// =========================================================================

import { el } from "../dom.js?v=1.1.3";
import { Store } from "../state.js?v=1.1.3";
import { Router } from "../app.js?v=1.1.3";

export function renderSettings(mount) {
  const screen = el("div.screen.retro", {}, [
    el("div.retro-body", {}, [
      el("div.retro-appbar", {}, [
        el("button.retro-back", { text: "←", onclick: () => Router.menu() }),
        el("div.retro-page-title", { text: "設定" }),
      ]),
      el("div", { style: { padding: "8px 16px", display: "flex", flexDirection: "column", gap: "12px" } }, [
        el("div.retro-card", {}, [
          el("div.label", { text: "ABOUT" }),
          el("div.h", { text: "非公開求人 — The Hidden Offer" }),
          el("div.body", { text: "現代サバイバル・社畜疑似体験ミニゲーム集。\nver. 0.1.0（プロトタイプ）" }),
        ]),
        el("div.retro-card", {}, [
          el("div.label", { text: "DATA" }),
          el("div.h", { text: "セーブデータ" }),
          el("div.body", { text: "コイン残高・解放求人・コレクションを初期化します。" }),
          el("div", { style: { marginTop: "12px" } }, [
            el("button.pbtn.red", { text: "全データを消去", onclick: () => {
              if (confirm("本当に消去しますか？")) { Store.reset(); Router.menu(); }
            } }),
          ]),
        ]),
      ]),
    ]),
  ]);
  mount(screen);
  return {};
}
