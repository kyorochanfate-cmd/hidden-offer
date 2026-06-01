// =========================================================================
// result.js — 全ミニゲーム共通の終了処理＆結果オーバーレイ（レトロ版）
// =========================================================================

import { el } from "../dom.js";
import { Store } from "../state.js";
import { Router } from "../app.js";
import { GAMES } from "../data.js";

export function finishGame(gameId, score, coins, message, details = {}) {
  Store.addCoins(coins);
  const g = GAMES[gameId];

  const allowances = details.allowances || [];
  const deductions = details.deductions || [];
  const bossComment = details.bossComment || message;

  // Calculate total allowances and deductions
  const totalAllowances = allowances.reduce((sum, item) => sum + item.value, 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.value, 0);
  const netPay = Math.max(0, totalAllowances - totalDeductions);

  // Build table rows
  const tableRows = [
    el("tr", {}, [
      el("th", { text: "項目" }),
      el("th", { text: "金額" })
    ])
  ];

  allowances.forEach(a => {
    tableRows.push(el("tr", {}, [
      el("td", { text: a.name }),
      el("td", { text: `＝ ${a.value}円` })
    ]));
  });

  deductions.forEach(d => {
    tableRows.push(el("tr", {}, [
      el("td", { text: d.name }),
      el("td", { text: `-${d.value}円` })
    ]));
  });

  tableRows.push(el("tr.pay-total", {}, [
    el("td", { text: "差引支給額" }),
    el("td", { text: `${netPay}円` })
  ]));

  const slipTitle = "給与支払明細書";
  const labelText = "MISSION COMPLETED";
  const labelColor = "var(--r-yellow)";

  const hankoClass = "pay-hanko";
  const hankoText = "佐藤";

  const mask = el("div.retro-modal-mask", {}, [
    el("div", { style: { display: "flex", flexDirection: "column", alignItems: "stretch", gap: "12px", width: "100%", maxWidth: "340px" } }, [
      // ヘッダ
      el("div", { style: { textAlign: "center" } }, [
        el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "11px", letterSpacing: ".18em", color: labelColor, marginBottom: "4px" }, text: labelText }),
        el("div", { style: { fontSize: "24px", fontWeight: "700", color: "#fff", textShadow: "2px 2px 0 #1a1230, 0 0 12px rgba(194,103,255,.5)" }, text: "退勤しました" }),
      ]),

      // 給与明細カード
      el("div.pay-slip", {}, [
        el("div.pay-title", { text: slipTitle }),
        
        el("div.pay-meta", {}, [
          el("span", { text: "支給日: 当月度末" }),
          el("span", { text: `求人: ${g.jpTitle}` }),
        ]),

        el("table.pay-table", {}, tableRows),

        el("div.pay-footer", {}, [
          el("div", { style: { fontWeight: "700", marginBottom: "4px", color: "#1a1230" }, text: "■ 上司査定コメント" }),
          el("div.pay-boss-comment", { text: bossComment })
        ]),

        // 佐藤部長のハンコ
        el(`div.${hankoClass}`, { text: hankoText })
      ]),

      // 統計情報 (スコア表示)
      el("div.retro-card", { style: { padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" } }, [
        el("span", { style: { fontSize: "12px", color: "var(--r-sub)" }, text: "最終スコア" }),
        el("span", { style: { fontFamily: "var(--r-font-en)", fontSize: "18px", color: "#fff" }, text: String(score) })
      ]),

      // アクション
      el("div", { style: { display: "flex", gap: "10px" } }, [
        el("button.pbtn.green", { style: { flex: "1" }, onclick: () => { mask.remove(); Router.game(gameId); } }, [el("span", { text: "もう一度" })]),
        el("button.pbtn.yellow", { style: { flex: "1" }, onclick: () => { mask.remove(); Router.gacha(); } }, [el("span", { text: "エージェント" })]),
      ]),
      el("button.pbtn.outline.block", { onclick: () => { mask.remove(); Router.menu(); } }, [el("span", { text: "メニューへ" })]),
    ]),
  ]);
  document.getElementById("app").appendChild(mask);
}

function statBlock(label, value, color) {
  return el("div", { style: { flex: "1" } }, [
    el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "10px", letterSpacing: ".14em", color: "var(--r-mute)" }, text: label }),
    el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "30px", color, marginTop: "4px", textShadow: "2px 2px 0 #1a1230" }, text: value }),
  ]);
}
