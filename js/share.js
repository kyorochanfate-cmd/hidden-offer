// =========================================================================
// share.js — SNS共有用「1枚絵」を DOM で生成（紙の書類風）
// 仕様書 2: シュールな1枚絵を自動生成し撮れ高を自動化
// =========================================================================

import { el } from "./dom.js?v=1.2.3";
import { GAMES } from "./data.js?v=1.2.3";

function paper(brand, children) {
  return el("div.paper", {}, children);
}
function band(text, brand) {
  return el("div.band", { style: { background: brand } }, [el("span.dot"), text]);
}
function rule() { return el("div.rule"); }
function over(text) { return el("div.pover", { text }); }

// 求人票
export function jobPostingCard(gameId) {
  const g = GAMES[gameId];
  return paper(g.color, [
    band("非公開求人 / THE HIDDEN OFFER", g.color),
    el("div.pbody", {}, [
      over("POSITION"),
      el("h3", { text: "【急募】" + g.posting }),
      kv([
        ["業務内容", g.theme],
        ["求人名", `${g.jpTitle} / ${g.subtitle}`],
        ["勤務時間", "10 PM DEADLINE! / 裁量労働制（裁量なし）"],
        ["待遇", g.salary],
      ]),
      rule(),
      el("div.pfoot", { text: "確認のうえ、出社をご検討ください。" }),
    ]),
  ]);
}

// お祈りメール
export function rejectionMailCard(entry) {
  return paper("#c0392b", [
    band("お祈りメール / NO OFFER", "#c0392b"),
    el("div.pbody", {}, [
      kv([["差出人", entry.from], ["件名", "選考結果のお知らせ"]]),
      rule(),
      el("div.ptext", { text: entry.body }),
      rule(),
      el("div.pfoot", { text: "#非公開求人  #お祈りメール" }),
    ]),
  ]);
}

// 市場価値診断書
export function titleCard(entry) {
  return paper("#2f6fd0", [
    band("市場価値診断書 / MARKET VALUE", "#2f6fd0"),
    el("div.pbody", {}, [
      over("DIAGNOSIS"),
      el("h3", { text: entry.name }),
      el("div.big-power", { style: { color: "#c0392b" }, text: `戦闘力 ${entry.power}` }),
      rule(),
      el("div.ptext", { text: entry.desc }),
      el("div.pfoot", { text: "#市場価値診断  #非公開求人" }),
    ]),
  ]);
}

// 勤務報告書（ゲーム結果）
export function resultCard(gameId, score, coins, message) {
  const g = GAMES[gameId];
  return paper(g.color, [
    band("勤務報告書 / SHIFT REPORT", g.color),
    el("div.pbody", {}, [
      over("POSITION"),
      el("h3", { text: g.jpTitle }),
      rule(),
      el("div.stat-row", {}, [
        stat("SCORE", score, "#1a1813"),
        stat("SALARY", "+" + coins, g.color),
      ]),
      rule(),
      el("div.ptext", { text: message }),
      el("div.pfoot", { text: "#非公開求人  #今日も労働" }),
    ]),
  ]);
}

function kv(rows) {
  const node = el("div.kv");
  for (const [k, v] of rows) {
    node.appendChild(el("div.k", { text: k }));
    node.appendChild(el("div.v", { text: v }));
  }
  return node;
}
function stat(eyebrow, value, color) {
  return el("div.stat", {}, [
    el("div.e", { text: eyebrow }),
    el("div.n", { style: { color }, text: String(value) }),
  ]);
}

// --- 画像保存 / ネイティブ共有 ---
// DOM→PNG は依存を増やさないため、まずは「画面スクショ推奨」のトーストで代替。
// 配信時に html2canvas もしくは Capacitor Screenshot プラグインへ差し替え予定。
export async function captureAndShare(node, filename = "hidden-offer") {
  // Web Share API（対応端末）でテキスト共有。画像化は配信ビルドで実装。
  const text = "#非公開求人 で労働の証をシェア";
  if (navigator.share) {
    try { await navigator.share({ title: "非公開求人", text }); return "shared"; }
    catch { /* キャンセル */ }
  }
  return "fallback";
}
