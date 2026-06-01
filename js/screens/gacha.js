// =========================================================================
// gacha.js — キャリアコンサルティング（ガチャ）レトロ版
// 怪しい転職エージェント（ピクセルアート）が封筒を差し出す演出。
// =========================================================================

import { el, clear, toast } from "../dom.js";
import { Store } from "../state.js";
import { GACHA_COST, rollGacha, GAMES } from "../data.js";
import { Router } from "../app.js";
import { SVG_AGENT } from "../art.js";

export function renderGacha(mount) {
  const screen = el("div.screen.retro", {}, [
    bgFx(),
    el("div.retro-body", {}, [
      el("div.retro-appbar", {}, [
        el("button.retro-back", { text: "←", onclick: () => Router.menu() }),
        el("div.retro-page-title", { text: "キャリアコンサル" }),
        el("div.spacer"),
        el("div.retro-chip#g-coins", {}, [el("span.coin", { text: "$" }), el("span", { text: String(Store.coins) })]),
      ]),
      el("div.retro-scroll", {}, [
        el("div#g-body", { style: { padding: "0 16px 16px" } }),
      ]),
    ]),
  ]);
  mount(screen);
  intro(screen.querySelector("#g-body"));
  return {};
}

function refreshCoinChip() {
  const c = document.querySelector("#g-coins span:last-child");
  if (c) c.textContent = String(Store.coins);
}

function intro(body) {
  clear(body);
  const canDraw = Store.coins >= GACHA_COST;
  body.append(
    // エージェント紹介カード
    el("div.retro-card", { style: { display: "flex", gap: "12px", alignItems: "center" } }, [
      el("div", { html: SVG_AGENT, style: { width: "72px", flex: "none", filter: "drop-shadow(0 0 8px rgba(194,103,255,.5))" } }),
      el("div", { style: { flex: "1", minWidth: "0" } }, [
        el("div.label", { text: "AGENT" }),
        el("div.h", { text: "転職エージェント 田所" }),
        el("div.body", { text: "シニア・キャリアコンサルタント\n認定 / 非公開求人" }),
      ]),
    ]),

    // 怪しいセリフ
    el("div", { style: { padding: "14px 4px", color: "var(--r-sub)", fontSize: "14px", lineHeight: "1.7" } }, [
      "「あなた様の市場価値を最大化する、選ばれし非公開求人をご用意しました。",
      el("br"), "こちらの封筒、どうぞお手に取ってご確認ください……」",
    ]),

    // 封筒イラスト
    el("div", { style: { textAlign: "center", padding: "8px 0 22px" } }, [
      el("div", {
        style: {
          display: "inline-block", fontSize: "84px",
          filter: "drop-shadow(0 0 12px rgba(255,210,74,.7))",
          animation: "floaty 3s ease-in-out infinite",
        },
        text: "✉",
      }),
    ]),

    // CTA
    el("button.pbtn.yellow.block", {
      disabled: !canDraw,
      onclick: () => draw(body),
    }, [
      el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", lineHeight: "1.1" } }, [
        el("span", { text: "封筒を開ける" }),
        el("span.sub", { text: `${GACHA_COST} コイン消費` }),
      ]),
    ]),

    !canDraw ? el("div", { style: { textAlign: "center", color: "var(--r-red)", marginTop: "12px", fontSize: "13px" }, text: "コインが不足しています。まずは労働を。" }) : null,
  );
}

async function draw(body) {
  if (!Store.spendCoins(GACHA_COST)) return;
  refreshCoinChip();
  clear(body);

  body.append(
    el("div", { style: { textAlign: "center", padding: "60px 20px" } }, [
      el("div", {
        style: { fontSize: "140px", filter: "drop-shadow(0 0 20px rgba(255,210,74,.9))", animation: "wiggle .2s ease-in-out infinite" },
        text: "✉",
      }),
      el("div", { style: { marginTop: "16px", fontFamily: "var(--r-font-en)", fontSize: "14px", color: "var(--r-yellow)", letterSpacing: ".15em" }, text: "OPENING…" }),
    ]),
  );

  await wait(900);
  const result = rollGacha(Store.unlockedGames);
  reveal(body, result);
}

function reveal(body, result) {
  clear(body);
  let title, sub, content, accent;
  if (result.type === "unlock") {
    Store.unlockGame(result.gameId);
    const g = GAMES[result.gameId];
    accent = g.color;
    title = "新しい非公開求人を獲得！";
    sub = "NEW POSITION";
    content = el("div.retro-card", { style: { borderColor: g.color, boxShadow: `inset 0 0 0 2px ${g.color}, 0 6px 0 rgba(0,0,0,.4)` } }, [
      el("div.label", { text: "POSITION", style: { color: g.color } }),
      el("div.h", { text: "【急募】" + g.posting }),
      el("div.body", { text: `${g.jpTitle} / ${g.subtitle}\n勤務時間: 10 PM DEADLINE!\n待遇: ${g.salary}` }),
    ]);
  } else if (result.type === "mail") {
    Store.addCollection(result.entry.id);
    accent = "var(--r-red)";
    title = "お祈りメールが届きました…";
    sub = "NO OFFER";
    content = el("div.retro-card", { style: { boxShadow: "inset 0 0 0 2px var(--r-red), 0 6px 0 rgba(0,0,0,.4)" } }, [
      el("div.label", { style: { color: "var(--r-red)" }, text: "FROM: " + result.entry.from }),
      el("div.h", { text: "選考結果のお知らせ" }),
      el("div.body", { text: result.entry.body }),
    ]);
  } else {
    Store.addCollection(result.entry.id);
    accent = "var(--r-cyan)";
    title = "市場価値が診断されました";
    sub = "MARKET VALUE";
    content = el("div.retro-card", { style: { boxShadow: "inset 0 0 0 2px var(--r-cyan), 0 6px 0 rgba(0,0,0,.4)" } }, [
      el("div.label", { style: { color: "var(--r-cyan)" }, text: "DIAGNOSIS" }),
      el("div.h", { text: entryTitleText(result.entry) }),
      el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "32px", color: "var(--r-yellow)", textShadow: "0 0 8px rgba(255,210,74,.6)", margin: "8px 0" }, text: `戦闘力 ${result.entry.power}` }),
      el("div.body", { text: result.entry.desc }),
    ]);
  }
  refreshCoinChip();

  body.append(
    el("div", { style: { paddingTop: "8px" } }, [
      el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "11px", letterSpacing: ".15em", color: "var(--r-yellow)" }, text: sub }),
      el("div", { style: { fontSize: "22px", fontWeight: "700", margin: "6px 0 14px", textShadow: "2px 2px 0 #1a1230" }, text: title }),
    ]),
    content,
    el("div", { style: { display: "flex", gap: "10px", marginTop: "16px" } }, [
      el("button.pbtn.outline", { style: { flex: "1" }, onclick: () => intro(body), disabled: Store.coins < GACHA_COST }, [el("span", { text: "もう一度引く" })]),
      el("button.pbtn.purple", { style: { flex: "1" }, onclick: () => Router.menu() }, [el("span", { text: "メニュー" })]),
    ]),
  );
}

function entryTitleText(e) { return e.name; }

function bgFx() {
  return el("div.retro-bg-fx", {},
    [
      { e: "$", x: 88, y: 12, c: "coin", s: 22 },
      { e: "📄", x: 6, y: 80, c: "doc", s: 22 },
      { e: "+", x: 12, y: 6, c: "spark", s: 16 },
      { e: "+", x: 86, y: 88, c: "spark", s: 16 },
    ].map((it) => el("div", {
      class: "fx " + it.c,
      style: { left: it.x + "%", top: it.y + "%", fontSize: it.s + "px" },
      text: it.e,
    })),
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
