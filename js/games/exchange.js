// =========================================================================
// exchange.js — 名刺おぼえ会議 v2
// 取引先が1人ずつ自己紹介しながら名刺を渡してくる
// 全員と交換した後、佐藤部長が「○○会社の方のお名前は？」と質問
// 4択から名前を選ぶ
// =========================================================================

import { el, clear } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { finishGame } from "./result.js?v=1.2.5";

const CONTACTS = [
  { name: "山田太郎",   title: "部長",      company: "テクノA社",         color: "#ec6a3c" },
  { name: "鈴木花子",   title: "課長",      company: "Bシステムズ",        color: "#d23b8a" },
  { name: "佐藤健一",   title: "主任",      company: "C商事HD",            color: "#2fae8f" },
  { name: "高橋美奈",   title: "係長",      company: "D製作所",            color: "#6264a7" },
  { name: "田中誠",     title: "次長",      company: "Eインダストリー",    color: "#b8860b" },
  { name: "伊藤あゆみ", title: "課長代理",  company: "Fクリエイティブ",    color: "#ff8ade" },
  { name: "中村隆",     title: "支店長",    company: "G法律事務所",        color: "#5b9bd5" },
  { name: "渡辺結衣",   title: "リーダー",  company: "Hホールディングス",  color: "#c267ff" },
  { name: "小林大輔",   title: "本部長",    company: "Iソリューションズ",  color: "#34c759" },
  { name: "加藤さくら", title: "マネージャー", company: "Jテクノロジー",   color: "#ff5b6e" },
  { name: "斎藤明",     title: "シニア",    company: "Kインターナショナル", color: "#ffd24a" },
  { name: "山本智子",   title: "プランナー", company: "Lパートナーズ",     color: "#8a4dff" },
];

// 自己紹介台詞
const INTRO_LINES = [
  (c) => `はじめまして、${c.company}の${c.name}と申します。どうぞよろしくお願いいたします。`,
  (c) => `${c.company}で${c.title}を務めております${c.name}です。お見知りおきを。`,
  (c) => `${c.name}と申します。${c.company}の${c.title}です。本日はよろしくお願いします。`,
];

const MAX_ROUNDS = 10;
const MAX_LIVES  = 3;

export function startExchange(mount, gameId) {
  const state = {
    active:       true,
    round:        1,
    lives:        MAX_LIVES,
    score:        0,
    correctCount: 0,
    cards:        [],
    metCount:     0,
    meetSec:      3,
    phase:        "meet",   // meet | quiz | result
    target:       null,
    timer:        0,
  };

  // ─── DOM ───────────────────────────────────────────────────────────
  const root = el("div.exch-game", {}, [
    el("div.exch-titlebar", {}, [
      el("button.pbtn.outline", {
        style: { padding: "4px 10px", fontSize: "12px", minWidth: "auto", whiteSpace: "nowrap" },
        onclick: () => quit()
      }, [el("span", { text: "← メニュー" })]),
      el("div.exch-title", { text: "名刺おぼえ会議" }),
      el("div.exch-stats#exch-stats", { text: `ROUND 1 / ${MAX_ROUNDS}` }),
    ]),

    el("div.exch-bosswrap", {}, [
      el("img.exch-boss#exch-boss", { src: "assets/img/sato_normal.png", alt: "佐藤部長" }),
      el("div.exch-bubble#exch-bubble", { text: "今日交換した名刺、覚えておけよ。" }),
    ]),

    el("div.exch-meta", {}, [
      el("div.exch-lives#exch-lives", { text: "❤".repeat(MAX_LIVES) }),
      el("div.exch-timer-wrap", {}, [
        el("div.exch-timer-fill#exch-timer-fill"),
      ]),
      el("div.exch-score#exch-score", { text: "0円" }),
    ]),

    el("div.exch-stage#exch-stage"),

    el("div.exch-toast#exch-toast"),
  ]);

  mount(root);

  const refs = {
    bubble:    root.querySelector("#exch-bubble"),
    bossImg:   root.querySelector("#exch-boss"),
    stage:     root.querySelector("#exch-stage"),
    lives:     root.querySelector("#exch-lives"),
    score:     root.querySelector("#exch-score"),
    stats:     root.querySelector("#exch-stats"),
    timerFill: root.querySelector("#exch-timer-fill"),
    toast:     root.querySelector("#exch-toast"),
  };

  function setBossImg(name) { refs.bossImg.src = `assets/img/${name}.png`; }

  // ─── ラウンド進行 ──────────────────────────────────────────────────
  function startRound() {
    if (!state.active) return;
    if (state.round > MAX_ROUNDS) { finish(true); return; }

    const cardCount = Math.min(6, 2 + Math.floor((state.round - 1) * 0.5));
    state.meetSec   = Math.max(2.0, 3.5 - (state.round - 1) * 0.15);

    state.cards    = pickN(CONTACTS, cardCount);
    state.metCount = 0;
    state.phase    = "meet";

    refs.stats.textContent = `ROUND ${state.round} / ${MAX_ROUNDS}`;
    setBossImg("sato_normal");

    showNextCharacter();
  }

  function showNextCharacter() {
    if (!state.active) return;

    const char  = state.cards[state.metCount];
    const total = state.cards.length;
    const line  = INTRO_LINES[state.metCount % INTRO_LINES.length](char);

    refs.bubble.textContent = line;
    renderMeet(char, state.metCount + 1, total);

    runTimer(state.meetSec, () => advanceMeet());
  }

  function advanceMeet() {
    state.metCount++;
    if (state.metCount < state.cards.length) {
      showNextCharacter();
    } else {
      startQuiz();
    }
  }

  // ─── クイズ ────────────────────────────────────────────────────────
  function startQuiz() {
    if (!state.active) return;
    state.phase = "quiz";

    state.target = state.cards[Math.floor(Math.random() * state.cards.length)];
    const t = state.target;

    const useCompany = Math.random() < 0.5;
    const q = useCompany
      ? `${t.company}の方のお名前は？`
      : `${t.title}の方のお名前は？`;

    refs.bubble.textContent = q;
    setBossImg("sato_normal");

    // 4択：正解1 + 外れ3（このラウンド外のキャラから補充）
    const pool        = CONTACTS.filter(c => c.name !== t.name);
    const distractors = pickN(pool, 3);
    const choices     = shuffle([t, ...distractors]);

    renderQuiz(choices);
    runTimer(8, () => handleAnswer(null));
  }

  function handleAnswer(picked) {
    if (state.phase !== "quiz") return;
    state.phase = "result";
    stopTimer();

    const correct = picked && picked.name === state.target.name;
    const t       = state.target;

    if (correct) {
      const gain = 10 + state.round * 3;
      state.score += gain;
      state.correctCount++;
      refs.score.textContent = `${state.score}円`;
      toast(`正解！ +${gain}円`, "ok");
      refs.bubble.textContent = `そうだ！${t.name}${t.title}だ。よく覚えていたな。`;
      setBossImg("sato_smile");
      highlightChoice(picked, true);
    } else {
      state.lives--;
      refs.lives.textContent =
        "❤".repeat(Math.max(0, state.lives)) +
        "🖤".repeat(Math.max(0, MAX_LIVES - state.lives));
      toast(`不正解… ${t.name}${t.title}`, "ng");
      refs.bubble.textContent = picked
        ? `違う！${t.name}${t.title}だ！`
        : `答えないとは何事か！${t.name}${t.title}だぞ！`;
      setBossImg("sato_angry");
      if (picked) highlightChoice(picked, false);
      highlightCorrectChoice();
    }

    setTimeout(() => {
      if (!state.active) return;
      if (state.lives <= 0) { finish(false); return; }
      state.round++;
      startRound();
    }, 2000);
  }

  // ─── 描画 ──────────────────────────────────────────────────────────
  function renderMeet(char, num, total) {
    clear(refs.stage);

    const scene = el("div.exch-meet-scene", {
      onclick: () => { stopTimer(); advanceMeet(); }
    }, [
      el("div.exch-meet-counter", { text: `${num} / ${total}人目` }),
      el("div.exch-card-anim", {}, [
        // 仮キャラグラフィック（後で画像に差し替え）
        el("div.exch-char-avatar", {
          style: { background: char.color },
          text: char.name[0]
        }),
        el("div.exch-namecard", {}, [
          el("div.exch-namecard-name",    { text: char.name }),
          el("div.exch-namecard-title",   { text: char.title }),
          el("div.exch-namecard-company", { text: char.company }),
        ]),
      ]),
      el("div.exch-meet-tap", { text: "タップで次へ →" }),
    ]);

    refs.stage.appendChild(scene);
  }

  function renderQuiz(choices) {
    clear(refs.stage);

    const grid = el("div.exch-choice-grid", {},
      choices.map(c => {
        const btn = el("button.exch-choice-btn", {
          "data-name": c.name,
          onclick: () => handleAnswer(c),
        }, [
          el("div.exch-choice-icon", { style: { background: c.color }, text: c.name[0] }),
          el("div.exch-choice-name", { text: c.name }),
        ]);
        return btn;
      })
    );

    refs.stage.appendChild(el("div.exch-quiz-scene", {}, [grid]));
  }

  function highlightChoice(picked, isCorrect) {
    const btn = refs.stage.querySelector(`[data-name="${picked.name}"]`);
    if (btn) btn.classList.add(isCorrect ? "correct" : "wrong");
  }

  function highlightCorrectChoice() {
    const btn = refs.stage.querySelector(`[data-name="${state.target.name}"]`);
    if (btn) btn.classList.add("correct");
  }

  // ─── タイマー ──────────────────────────────────────────────────────
  let timerHandle = null;

  function runTimer(totalSec, onEnd) {
    stopTimer();
    state.timer = totalSec;
    refs.timerFill.style.width = "100%";
    timerHandle = setInterval(() => {
      state.timer -= 0.05;
      refs.timerFill.style.width = Math.max(0, (state.timer / totalSec) * 100) + "%";
      if (state.timer <= 0) { stopTimer(); onEnd(); }
    }, 50);
  }

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    refs.timerFill.style.width = "0%";
  }

  // ─── トースト ──────────────────────────────────────────────────────
  function toast(msg, kind) {
    refs.toast.textContent = msg;
    refs.toast.className = "exch-toast show " + (kind || "");
    setTimeout(() => { refs.toast.className = "exch-toast"; }, 1400);
  }

  // ─── 終了 ──────────────────────────────────────────────────────────
  function quit() {
    state.active = false;
    stopTimer();
    Router.menu();
  }

  function finish(cleared) {
    state.active = false;
    stopTimer();
    const score = state.score;
    const coins = Math.floor(score / 5);
    let msg, comment;
    if (cleared) {
      msg     = `全${MAX_ROUNDS}ラウンド完遂！正解 ${state.correctCount}件、最終 ${score}円。`;
      comment = "佐藤部長「素晴らしい記憶力だ。次の役員会も任せたぞ。」";
    } else if (state.correctCount === 0) {
      msg     = "全問不正解で帰社。";
      comment = "佐藤部長「君、本当に名刺を見ていたのかね？社会人失格だ。」";
    } else {
      msg     = `${state.round - 1}ラウンドで脱落（正解 ${state.correctCount}件）。`;
      comment = "佐藤部長「もう少し集中して相手の名刺を見たまえ。」";
    }
    finishGame(gameId, score, coins, msg, {
      isWin:      cleared,
      allowances: [{ name: `正答ボーナス × ${state.correctCount}`, value: score }],
      deductions: [],
      bossComment: comment,
    });
  }

  // ─── 開始 ──────────────────────────────────────────────────────────
  startRound();

  return { dispose() { state.active = false; stopTimer(); } };
}

// ─── ユーティリティ ────────────────────────────────────────────────────
function pickN(arr, n) {
  const copy = arr.slice();
  const out  = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
