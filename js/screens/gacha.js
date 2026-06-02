// =========================================================================
// gacha.js — キャリアコンサルティング（ガチャ）レトロ版
// 怪しい転職エージェント（ピクセルアート）が封筒を差し出す演出。
// =========================================================================

import { el, clear, toast } from "../dom.js?v=1.1.7";
import { Store } from "../state.js?v=1.1.7";
import { GACHA_COST, rollGacha, GAMES } from "../data.js?v=1.1.7";
import { Router } from "../app.js?v=1.1.7";

export function renderGacha(mount) {
  // body を retro-scroll の外に置き、自身を flex container 化することで
  // reveal 時にリスト=flex1+scroll／ボタン=固定 のレイアウトを実現する。
  const screen = el("div.screen.retro", {}, [
    bgFx(),
    el("div.retro-body", { style: { display: "flex", flexDirection: "column", height: "100%" } }, [
      el("div.retro-appbar", { style: { flex: "none" } }, [
        el("button.retro-back", { text: "←", onclick: () => Router.menu() }),
        el("div.retro-page-title", { text: "キャリアコンサル" }),
        el("div.spacer"),
        el("div.retro-chip#g-coins", {}, [el("span.coin", { text: "¥" }), el("span", { text: String(Store.coins) + " 円" })]),
      ]),
      el("div#g-body", { style: {
        flex: "1",
        display: "flex",
        flexDirection: "column",
        padding: "0 16px 16px",
        minHeight: 0,
        overflowY: "auto",
      } }),
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

  // 開封演出：放射光線＋封筒＋×N表示
  const envelopeStage = el("div.gacha-stage", {}, [
    el("div.gacha-rays"),
    el("div.gacha-burst"),
    el("div.gacha-envelope", { text: "✉" }),
    count > 1 ? el("div.gacha-count-badge", { text: `× ${count}` }) : null,
  ]);

  body.append(
    el("div", { style: { flex: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" } }, [
      envelopeStage,
      el("div.gacha-opening-label", { text: "OPENING…" }),
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
  // body は flex column コンテナ。reveal 時は overflow を切って、
  // 内部に「ヘッダ(固定) / リスト(flex1+scroll) / ボタン(固定)」を組む。
  clear(body);
  body.style.overflowY = "hidden";

  const list = Array.isArray(results) ? results : [results];
  const hasUnlock = list.some(r => r.type === "unlock");
  const appRoot = document.getElementById("app") || body;

  // unlock 含むなら派手なレアフラッシュ＋強化紙吹雪＋画面シェイク
  if (hasUnlock) {
    spawnRareFlash(appRoot);
    spawnConfetti(appRoot, true);
    const screen = document.querySelector(".screen.retro");
    if (screen) {
      screen.classList.add("gacha-shake");
      setTimeout(() => screen.classList.remove("gacha-shake"), 600);
    }
  } else {
    spawnConfetti(appRoot, false);
  }

  const cards = list.map((result) => {
    if (result.type === "unlock") {
      Store.unlockGame(result.gameId);
      const g = GAMES[result.gameId];
      return el("div.retro-card.unlock-card", {
        style: {
          borderColor: g.color,
          margin: "6px 0",
          padding: "12px 14px",
          "--glow-color": g.color,
        },
      }, [
        el("div.unlock-badge", { text: "★ NEW POSITION ★" }),
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
    // ヘッダ（固定）
    el("div", { style: { flex: "none", paddingTop: "8px" } }, [
      el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "11px", letterSpacing: ".15em", color: "var(--r-yellow)" }, text: "CONSULTING RESULT" }),
      el("div", { style: { fontSize: "20px", fontWeight: "700", margin: "6px 0 10px", textShadow: "2px 2px 0 #1a1230" }, text: headerText }),
    ]),
    // 結果リスト（flex1 + 縦スクロール）
    el("div", { style: {
      flex: "1",
      minHeight: 0,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      paddingRight: "4px",
    } }, cards),
    // ボタン（固定・下部）
    el("div", { style: {
      flex: "none",
      display: "flex",
      gap: "10px",
      marginTop: "10px",
      paddingTop: "10px",
      borderTop: "1px solid rgba(255,255,255,0.12)",
    } }, [
      el("button.pbtn.outline", { style: { flex: "1" }, onclick: () => { body.style.overflowY = "auto"; intro(body); }, disabled: Store.coins < GACHA_COST }, [el("span", { text: "戻る" })]),
      el("button.pbtn.purple", { style: { flex: "1" }, onclick: () => Router.menu() }, [el("span", { text: "メニュー" })]),
    ]),
  );
}

// レアフラッシュ：unlock出現時の派手な全画面エフェクト
function spawnRareFlash(parent) {
  const flash = el("div.rare-flash");
  parent.appendChild(flash);
  setTimeout(() => flash.remove(), 1600);

  // 中央に「★ RARE! ★」テキスト
  const rareText = el("div.rare-text", { text: "★ RARE! ★" });
  parent.appendChild(rareText);
  setTimeout(() => rareText.remove(), 1800);
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

function spawnConfetti(parent, rare = false) {
  // rare の時は金色多めで量も増やす
  const colors = rare
    ? ["#ffd24a", "#ffae2b", "#ff8ade", "#ff5cb4", "#c267ff", "#5be8ff", "#ffd24a", "#fffacd"]
    : ["#ff5cb4", "#c267ff", "#5be8ff", "#6cf06e", "#ffd24a", "#ff5b6e"];
  const count = rare ? 100 : 45;
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
