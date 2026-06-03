// =========================================================================
// exchange.js — 名刺おぼえゲーム
// 名刺を一瞬だけ見せる → 伏せる → 佐藤部長が「○○さんは何番？」と聞いてくる
// 制限時間内に正しい名刺をタップ。ラウンドが進むほど人数増・記憶時間短縮。
// =========================================================================

import { el, clear, loop, pick } from "../dom.js?v=1.2.4";
import { Router } from "../app.js?v=1.2.4";
import { finishGame } from "./result.js?v=1.2.4";

// 取引先プール（出るたび顔・色変える）
const CONTACTS = [
  { name: "山田太郎", title: "部長", company: "テクノA社", color: "#ec6a3c" },
  { name: "鈴木花子", title: "課長", company: "Bシステムズ", color: "#d23b8a" },
  { name: "佐藤健一", title: "主任", company: "C商事HD", color: "#2fae8f" },
  { name: "高橋美奈", title: "係長", company: "D製作所", color: "#6264a7" },
  { name: "田中誠", title: "次長", company: "Eインダストリー", color: "#b8860b" },
  { name: "伊藤あゆみ", title: "課長代理", company: "Fクリエイティブ", color: "#ff8ade" },
  { name: "中村隆", title: "支店長", company: "G法律事務所", color: "#5b9bd5" },
  { name: "渡辺結衣", title: "リーダー", company: "Hホールディングス", color: "#c267ff" },
  { name: "小林大輔", title: "本部長", company: "Iソリューションズ", color: "#34c759" },
  { name: "加藤さくら", title: "マネージャー", company: "Jテクノロジー", color: "#ff5b6e" },
  { name: "斎藤明", title: "シニア", company: "Kインターナショナル", color: "#ffd24a" },
  { name: "山本智子", title: "プランナー", company: "Lパートナーズ", color: "#8a4dff" },
];

const MAX_ROUNDS = 10;
const MAX_LIVES = 3;

export function startExchange(mount, gameId) {
  const state = {
    active: true,
    round: 1,
    lives: MAX_LIVES,
    score: 0,
    correctCount: 0,
    cards: [],          // 当ラウンドの名刺配列
    targetIdx: -1,      // 正解インデックス
    phase: "intro",     // intro | memorize | quiz | result
    timer: 0,
  };

  // --- DOM ---
  const root = el("div.exch-game", {}, [
    el("div.exch-titlebar", {}, [
      el("button.pbtn.outline", {
        style: { padding: "4px 10px", fontSize: "12px", minWidth: "auto" },
        onclick: () => quit(false)
      }, [el("span", { text: "← メニュー" })]),
      el("div.exch-title", { text: "名刺おぼえ会議" }),
      el("div.exch-stats#exch-stats", { text: `ROUND 1 / ${MAX_ROUNDS}` }),
    ]),

    el("div.exch-bosswrap", {}, [
      el("img.exch-boss#exch-boss", { src: "assets/img/normal.png", alt: "佐藤部長" }),
      el("div.exch-bubble#exch-bubble", { text: "今日交換した名刺、覚えておけよ。" }),
    ]),

    el("div.exch-meta", {}, [
      el("div.exch-lives#exch-lives", { text: "❤".repeat(MAX_LIVES) }),
      el("div.exch-timer-wrap", {}, [
        el("div.exch-timer-fill#exch-timer-fill", { style: { width: "0%" } }),
      ]),
      el("div.exch-score#exch-score", { text: "0円" }),
    ]),

    el("div.exch-grid#exch-grid", {}),

    el("div.exch-toast#exch-toast"),
  ]);

  mount(root);

  const refs = {
    bubble: root.querySelector("#exch-bubble"),
    bossImg: root.querySelector("#exch-boss"),
    grid: root.querySelector("#exch-grid"),
    lives: root.querySelector("#exch-lives"),
    score: root.querySelector("#exch-score"),
    stats: root.querySelector("#exch-stats"),
    timerFill: root.querySelector("#exch-timer-fill"),
    toast: root.querySelector("#exch-toast"),
  };

  function setBossImg(name) { refs.bossImg.src = `assets/img/${name}.png`; }

  // --- ラウンド進行 ---
  function startRound() {
    if (!state.active) return;
    if (state.round > MAX_ROUNDS) { finish(true); return; }

    // 名刺数: ROUND1=3, +0.5ずつ加算（最大8）
    const cardCount = Math.min(8, 3 + Math.floor((state.round - 1) * 0.6));
    // 記憶時間: 基本4秒, ラウンド毎に0.25減（最低1.5秒）
    const memorizeSec = Math.max(1.5, 4 - (state.round - 1) * 0.25);
    // 回答制限時間: 6秒
    const quizSec = 6;

    state.cards = pickN(CONTACTS, cardCount);
    state.targetIdx = Math.floor(Math.random() * cardCount);

    refs.stats.textContent = `ROUND ${state.round} / ${MAX_ROUNDS}`;
    refs.bubble.textContent = `今から${cardCount}名と名刺交換。よく覚えておけよ。`;
    setBossImg("normal");

    renderCards(true);  // 表向き
    state.phase = "memorize";
    runTimer(memorizeSec, () => askQuestion(quizSec));
  }

  function askQuestion(quizSec) {
    if (!state.active) return;
    state.phase = "quiz";

    // 問題タイプ: name(60%) / company(40%)
    const target = state.cards[state.targetIdx];
    const useCompany = Math.random() < 0.4;
    const q = useCompany
      ? `${target.company}の方は何番だったかね？`
      : `${target.name}${target.title}は何番だったかね？`;
    refs.bubble.textContent = q;

    renderCards(false); // 伏せる→番号のみ
    runTimer(quizSec, () => handleAnswer(-1)); // 時間切れ
  }

  function handleAnswer(pickedIdx) {
    if (state.phase !== "quiz") return;
    state.phase = "result";
    stopTimer();

    const correct = pickedIdx === state.targetIdx;
    revealCards(pickedIdx);

    if (correct) {
      const gain = 10 + state.round * 3;
      state.score += gain;
      state.correctCount++;
      refs.score.textContent = `${state.score}円`;
      toast(`正解！ +${gain}円`, "ok");
      refs.bubble.textContent = "うむ、よく覚えていたな。";
      setBossImg("bigsmile");
    } else {
      state.lives--;
      refs.lives.textContent = "❤".repeat(Math.max(0, state.lives)) + "🖤".repeat(Math.max(0, MAX_LIVES - state.lives));
      const target = state.cards[state.targetIdx];
      toast(`不正解… 正解は ${state.targetIdx + 1} 番`, "ng");
      refs.bubble.textContent = pickedIdx < 0
        ? `おい、答えないとは何事か！${target.name}${target.title}だぞ！`
        : `違う！${target.name}${target.title}は ${state.targetIdx + 1} 番だ！`;
      setBossImg(pickedIdx < 0 ? "angry2" : "angry");
    }

    setTimeout(() => {
      if (!state.active) return;
      if (state.lives <= 0) { finish(false); return; }
      state.round++;
      startRound();
    }, 1800);
  }

  // --- カード描画 ---
  function renderCards(faceUp) {
    clear(refs.grid);
    state.cards.forEach((c, i) => {
      const card = el("div.exch-card", {
        class: faceUp ? "face-up" : "face-down",
        onclick: () => { if (state.phase === "quiz") handleAnswer(i); },
      }, faceUp ? [
        el("div.exch-card-num", { text: String(i + 1) }),
        el("div.exch-card-avatar", { style: { background: c.color }, text: c.name[0] }),
        el("div.exch-card-name", { text: c.name }),
        el("div.exch-card-title", { text: c.title }),
        el("div.exch-card-company", { text: c.company }),
      ] : [
        el("div.exch-card-back-num", { text: String(i + 1) }),
        el("div.exch-card-back-label", { text: "名刺" }),
      ]);
      refs.grid.appendChild(card);
    });
  }

  function revealCards(pickedIdx) {
    [...refs.grid.children].forEach((cardEl, i) => {
      cardEl.classList.remove("face-down");
      cardEl.classList.add("face-up");
      const c = state.cards[i];
      clear(cardEl);
      cardEl.appendChild(el("div.exch-card-num", { text: String(i + 1) }));
      cardEl.appendChild(el("div.exch-card-avatar", { style: { background: c.color }, text: c.name[0] }));
      cardEl.appendChild(el("div.exch-card-name", { text: c.name }));
      cardEl.appendChild(el("div.exch-card-title", { text: c.title }));
      cardEl.appendChild(el("div.exch-card-company", { text: c.company }));
      if (i === state.targetIdx) cardEl.classList.add("correct");
      if (i === pickedIdx && pickedIdx !== state.targetIdx) cardEl.classList.add("wrong");
    });
  }

  // --- タイマー ---
  let timerHandle = null;
  function runTimer(totalSec, onEnd) {
    stopTimer();
    state.timer = totalSec;
    const total = totalSec;
    refs.timerFill.style.width = "100%";
    timerHandle = setInterval(() => {
      state.timer -= 0.05;
      const pct = Math.max(0, (state.timer / total) * 100);
      refs.timerFill.style.width = pct + "%";
      if (state.timer <= 0) {
        stopTimer();
        onEnd();
      }
    }, 50);
  }
  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  // --- トースト ---
  function toast(msg, kind) {
    refs.toast.textContent = msg;
    refs.toast.className = "exch-toast show " + (kind || "");
    setTimeout(() => { refs.toast.className = "exch-toast"; }, 1400);
  }

  // --- 終了 ---
  function quit(forced) {
    state.active = false;
    stopTimer();
    if (forced === false) Router.menu();
  }

  function finish(cleared) {
    state.active = false;
    stopTimer();
    const coins = Math.floor(state.score / 5);
    const score = state.score;
    let msg, comment;
    if (cleared) {
      msg = `全${MAX_ROUNDS}ラウンド完遂！正解 ${state.correctCount}件、最終 ${state.score}円。`;
      comment = "佐藤部長「素晴らしい記憶力だ。次の役員会も任せたぞ。」";
    } else if (state.correctCount === 0) {
      msg = "全問不正解で帰社。";
      comment = "佐藤部長「君、本当に名刺を見ていたのかね？社会人失格だ。」";
    } else {
      msg = `${state.round - 1}ラウンドで脱落（正解 ${state.correctCount}件）。`;
      comment = "佐藤部長「もう少し集中して相手の名刺を見たまえ。」";
    }
    finishGame(gameId, score, coins, msg, {
      isWin: cleared,
      allowances: [{ name: `正答ボーナス × ${state.correctCount}`, value: state.score }],
      deductions: [],
      bossComment: comment,
    });
  }

  // --- 開始: 最初のラウンド ---
  startRound();

  return { dispose() { state.active = false; stopTimer(); } };
}

function pickN(arr, n) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
