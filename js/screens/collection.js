// =========================================================================
// collection.js — コレクション（レトロ版）
// =========================================================================

import { el } from "../dom.js?v=1.2.5";
import { Store } from "../state.js?v=1.2.5";
import { REJECTION_MAILS, TITLES } from "../data.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";

export function renderCollection(mount) {
  const counts = {};
  for (const id of Store.collections) counts[id] = (counts[id] || 0) + 1;
  const uniques = Object.keys(counts).length;

  const mails = REJECTION_MAILS.filter((m) => counts[m.id]);
  const titles = TITLES.filter((t) => counts[t.id]);

  const sections = [];
  if (uniques === 0) {
    sections.push(el("div.retro-card", { style: { margin: "16px", textAlign: "center" } }, [
      el("div.h", { text: "まだ何も獲得していません" }),
      el("div.body", { text: "エージェントに会い、非公開求人の封筒を受け取ってください。" }),
      el("div", { style: { marginTop: "14px" } }, [
        el("button.pbtn.yellow", { onclick: () => Router.gacha() }, [el("span", { text: "エージェントへ" })]),
      ]),
    ]));
  } else {
    if (mails.length) {
      sections.push(el("div.retro-section", { text: "お祈りメール" }));
      sections.push(el("div", { style: { padding: "0 14px", display: "flex", flexDirection: "column", gap: "10px" } },
        mails.map((m) => el("div.retro-row", { onclick: () => showDetail(mailDetail(m)) }, [
          el("div.av", { style: { display: "grid", placeItems: "center", background: "#3a1818", color: "var(--r-red)", fontSize: "20px" }, text: "💌" }),
          el("div.t", {}, [el("div.tt", { text: m.from }), el("div.ss", { text: `お祈り ×${counts[m.id]}` })]),
          el("div.go", { text: "▶" }),
        ]))));
    }
    if (titles.length) {
      sections.push(el("div.retro-section", { text: "市場価値診断", style: { marginTop: "4px" } }));
      sections.push(el("div", { style: { padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: "10px" } },
        titles.map((t) => el("div.retro-row", { onclick: () => showDetail(titleDetail(t)) }, [
          el("div.av", { style: { display: "grid", placeItems: "center", background: "#142a40", color: "var(--r-cyan)", fontSize: "20px" }, text: "📊" }),
          el("div.t", {}, [el("div.tt", { text: t.name }), el("div.ss", { text: `戦闘力 ${t.power} ×${counts[t.id]}` })]),
          el("div.go", { text: "▶" }),
        ]))));
    }
  }

  const screen = el("div.screen.retro", {}, [
    el("div.retro-bg-fx", {}, [
      el("div.fx.coin", { style: { left: "86%", top: "10%", fontSize: "22px" }, text: "¥" }),
      el("div.fx.doc",  { style: { left: "6%",  top: "84%", fontSize: "20px" }, text: "📄" }),
    ]),
    el("div.retro-body", {}, [
      el("div.retro-appbar", {}, [
        el("button.retro-back", { text: "←", onclick: () => Router.menu() }),
        el("div.retro-page-title", { text: "コレクション" }),
        el("div.spacer"),
        el("div.retro-chip", {}, [el("span", { text: `${uniques}種 / ${Store.collections.length}通` })]),
      ]),
      el("div.retro-scroll", {}, sections),
    ]),
  ]);
  mount(screen);
  return {};
}

function mailDetail(m) {
  return el("div.retro-card", { style: { maxWidth: "320px", boxShadow: "inset 0 0 0 2px var(--r-red), 0 6px 0 rgba(0,0,0,.4)" } }, [
    el("div.label", { style: { color: "var(--r-red)" }, text: "FROM: " + m.from }),
    el("div.h", { text: "選考結果のお知らせ" }),
    el("div.body", { text: m.body }),
  ]);
}

function titleDetail(t) {
  return el("div.retro-card", { style: { maxWidth: "320px", boxShadow: "inset 0 0 0 2px var(--r-cyan), 0 6px 0 rgba(0,0,0,.4)" } }, [
    el("div.label", { style: { color: "var(--r-cyan)" }, text: "DIAGNOSIS" }),
    el("div.h", { text: t.name }),
    el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "30px", color: "var(--r-yellow)", textShadow: "0 0 8px rgba(255,210,74,.6)", margin: "6px 0" }, text: `戦闘力 ${t.power}` }),
    el("div.body", { text: t.desc }),
  ]);
}

function showDetail(node) {
  const mask = el("div.retro-modal-mask", { onclick: (e) => { if (e.target === mask) mask.remove(); } }, [
    el("div", {}, [
      node,
      el("div", { style: { marginTop: "14px", textAlign: "center" } }, [
        el("button.pbtn.outline", { onclick: () => mask.remove() }, [el("span", { text: "閉じる" })]),
      ]),
    ]),
  ]);
  document.getElementById("app").appendChild(mask);
}
