// =========================================================================
// gacha.js — キャリアコンサルティング（ガチャ）レトロ版
// 怪しい転職エージェント（ピクセルアート）が封筒を差し出す演出。
// =========================================================================

import { el, clear, toast } from "../dom.js?v=1.1.1";
import { Store } from "../state.js?v=1.1.1";
import { GACHA_COST, rollGacha, GAMES } from "../data.js?v=1.1.1";
import { Router } from "../app.js?v=1.1.1";

export function renderGacha(mount) {
  const screen = el("div.screen.retro", {}, [
    bgFx(),
    el("div.retro-body", {}, [
      el("div.retro-appbar", {}, [
        el("button.retro-back", { text: "←", onclick: () => Router.menu() }),
        el("div.retro-page-title", { text: "キャリアコンサル" }),
        el("div.spacer"),
        el("div.retro-chip#g-coins", {}, [el("span.coin", { text: "¥" }), el("span", { text: String(Store.coins) + " 円" })]),
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
  const canDrawSingle = Store.coins >= GACHA_COST;
  const canDrawTen = Store.coins >= GACHA_COST * 10;

  const elements = [
    // エージェント紹介カード
    el("div.retro-card", { style: { display: "flex", gap: "12px", alignItems: "center" } }, [
      el("img", { src: "assets/img/agent.png", style: { width: "72px", height: "auto", flex: "none", filter: "drop-shadow(0 0 8px rgba(194,103,255,.5))" } }),
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
    el("div", { style: { textAlign: "center", padding: "8px 0 16px" } }, [
      el("div", {
        style: {
          display: "inline-block", fontSize: "84px",
          filter: "drop-shadow(0 0 12px rgba(255,210,74,.7))",
          animation: "floaty 3s ease-in-out infinite",
        },
        text: "✉",
      }),
    ]),

    // CTA (単発)
    el("button.pbtn.yellow.block", {
      disabled: !canDrawSingle,
      onclick: () => draw(body, 1),
    }, [
      el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", lineHeight: "1.1" } }, [
        el("span", { text: "封筒を開ける" }),
        el("span.sub", { text: `${GACHA_COST} 円消費` }),
      ]),
    ]),

    // CTA (10連)
    el("button.pbtn.yellow.block", {
      disabled: !canDrawTen,
      style: { marginTop: "10px" },
      onclick: () => draw(body, 10),
    }, [
      el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", lineHeight: "1.1" } }, [
        el("span", { text: "10回連続で開ける" }),
        el("span.sub", { text: `${GACHA_COST * 10} 円消費` }),
      ]),
    ]),
  ];

  if (!canDrawSingle) {
    elements.push(
      el("div", { style: { textAlign: "center", color: "var(--r-red)", marginTop: "12px", fontSize: "13px" }, text: "お金が不足しています。まずは労働を。" })
    );
  }

  body.append(...elements);
}

async function draw(body, count) {
  const cost = GACHA_COST * count;
  if (!Store.spendCoins(cost)) return;
  refreshCoinChip();
  clear(body);

  const envelopeText = count === 10 ? "✉×10" : "✉";
  const envelopeContainer = el("div", { style: { position: "relative", display: "inline-block", width: "100%", height: "240px", margin: "20px 0" } }, [
    el("div.gacha-burst"),
    el("div.gacha-rays"),
    el("div", {
      style: {
        fontSize: count === 10 ? "100px" : "140px",
        filter: "drop-shadow(0 0 24px rgba(255,210,74,.95))",
        animation: "wiggle .18s ease-in-out infinite",
        position: "absolute",
        left: "50%",
        top: "40%",
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        cursor: "default",
        userSelect: "none"
      },
      text: envelopeText,
    })
  ]);

  body.append(
    el("div", { style: { textAlign: "center", padding: "10px 0", position: "relative", overflow: "hidden" } }, [
      envelopeContainer,
      el("div", { style: { marginTop: "10px", fontFamily: "var(--r-font-en)", fontSize: "14px", color: "var(--r-yellow)", letterSpacing: ".15em" }, text: "OPENING…" }),
    ]),
  );

  await wait(1200);

  const results = [];
  const tempUnlocked = [...Store.unlockedGames]; // 重複解除防止のため一時管理
  for (let i = 0; i < count; i++) {
    const res = rollGacha(tempUnlocked);
    if (res.type === "unlock") {
      tempUnlocked.push(res.gameId);
    }
    results.push(res);
  }

  reveal(body, results);
}

function reveal(body, results) {
  clear(body);
  spawnConfetti(document.getElementById("app") || body);

  const list = Array.isArray(results) ? results : [results];

  const cards = list.map((result) => {
    if (result.type === "unlock") {
      Store.unlockGame(result.gameId);
      const g = GAMES[result.gameId];
      return el("div.retro-card", { style: { borderColor: g.color, boxShadow: `inset 0 0 0 2px ${g.color}, 0 4px 0 rgba(0,0,0,.4)`, margin: "6px 0", padding: "10px 12px" } }, [
        el("div.label", { text: "POSITION", style: { color: g.color } }),
        el("div.h", { text: "【急募】" + g.posting, style: { fontSize: "16px", lineHeight: "1.3" } }),
        el("div.body", { text: `${g.jpTitle} / 待遇: ${g.salary}`, style: { fontSize: "12px", marginTop: "2px" } }),
      ]);
    } else if (result.type === "mail") {
      Store.addCollection(result.entry.id);
      return el("div.retro-card", { style: { borderColor: "var(--r-red)", boxShadow: "inset 0 0 0 2px var(--r-red), 0 4px 0 rgba(0,0,0,.4)", margin: "6px 0", padding: "10px 12px" } }, [
        el("div.label", { style: { color: "var(--r-red)" }, text: "FROM: " + result.entry.from }),
        el("div.h", { text: "選考結果（お祈りメール）", style: { fontSize: "16px" } }),
        el("div.body", { text: result.entry.body.split("\n")[0] + "…", style: { fontSize: "12px", marginTop: "2px" } }),
      ]);
    } else {
      Store.addCollection(result.entry.id);
      return el("div.retro-card", { style: { borderColor: "var(--r-cyan)", boxShadow: "inset 0 0 0 2px var(--r-cyan), 0 4px 0 rgba(0,0,0,.4)", margin: "6px 0", padding: "10px 12px" } }, [
        el("div.label", { style: { color: "var(--r-cyan)" }, text: "DIAGNOSIS" }),
        el("div.h", { text: entryTitleText(result.entry), style: { fontSize: "16px" } }),
        el("div.body", { text: `戦闘力 ${result.entry.power} / ${result.entry.desc}`, style: { fontSize: "12px", marginTop: "2px" } }),
      ]);
    }
  });

  refreshCoinChip();

  const isMulti = list.length > 1;
  const headerText = isMulti ? "キャリアコンサル結果（10連）" : "キャリアコンサル結果";

  body.append(
    el("div", { style: { paddingTop: "8px" } }, [
      el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "11px", letterSpacing: ".15em", color: "var(--r-yellow)" }, text: "CONSULTING RESULT" }),
      el("div", { style: { fontSize: "20px", fontWeight: "700", margin: "6px 0 14px", textShadow: "2px 2px 0 #1a1230" }, text: headerText }),
    ]),
    el("div", { style: isMulti ? { maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "4px" } : {} }, cards),
    el("div", { style: { display: "flex", gap: "10px", marginTop: "16px" } }, [
      el("button.pbtn.outline", { style: { flex: "1" }, onclick: () => intro(body), disabled: Store.coins < GACHA_COST }, [el("span", { text: "戻る" })]),
      el("button.pbtn.purple", { style: { flex: "1" }, onclick: () => Router.menu() }, [el("span", { text: "メニュー" })]),
    ]),
  );
}

function entryTitleText(e) { return e.name; }

function bgFx() {
  return el("div.retro-bg-fx", {},
    [
      { e: "¥", x: 88, y: 12, c: "coin", s: 22 },
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

function spawnConfetti(parent) {
  const colors = ["#ff5cb4", "#c267ff", "#5be8ff", "#6cf06e", "#ffd24a", "#ff5b6e"];
  const count = 45;
  const container = el("div", { style: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 120 } });
  parent.appendChild(container);

  const rect = parent.getBoundingClientRect();
  const startX = rect.width / 2;
  const startY = rect.height * 0.35; // 封筒があった位置付近

  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 160;
    const startOffsetDist = 15; // explode offset
    const startOffsetX = Math.cos(angle) * startOffsetDist;
    const startOffsetY = Math.sin(angle) * startOffsetDist;
    const endX = startX + Math.cos(angle) * distance;
    const endY = startY + Math.sin(angle) * distance + 80; // 重力落下を加味
    const duration = 0.7 + Math.random() * 0.9;
    const delay = Math.random() * 0.12;
    const rotEnd = (Math.random() * 360 - 180) + "deg";

    const p = el("div.confetti", {
      style: {
        "--color": color,
        "--x-start": (startX + startOffsetX) + "px",
        "--y-start": (startY + startOffsetY) + "px",
        "--x-end": endX + "px",
        "--y-end": endY + "px",
        "--rot-end": rotEnd,
        "--duration": duration + "s",
        "--delay": delay + "s",
        left: 0, top: 0
      }
    });
    container.appendChild(p);
  }

  setTimeout(() => container.remove(), 2500);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
