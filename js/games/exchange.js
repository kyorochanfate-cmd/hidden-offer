// =========================================================================
// exchange.js — 名刺おぼえ会議 v3
// 取引先が1人ずつ名刺を渡しながら自己紹介
// 全員と交換後、お別れシーンで名前を4択選択
// =========================================================================

import { el, clear } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { finishGame } from "./result.js?v=1.2.5";

const CONTACTS = [
  { name: "山田太郎",   title: "部長",       company: "テクノA社",          color: "#ec6a3c", img: null },
  { name: "鈴木花子",   title: "課長",       company: "Bシステムズ",         color: "#d23b8a", img: null },
  { name: "佐藤健一",   title: "主任",       company: "C商事HD",             color: "#2fae8f", img: null },
  { name: "高橋美奈",   title: "係長",       company: "D製作所",             color: "#6264a7", img: null },
  { name: "田中誠",     title: "次長",       company: "Eインダストリー",     color: "#b8860b", img: null },
  { name: "伊藤あゆみ", title: "課長代理",   company: "Fクリエイティブ",     color: "#ff8ade", img: null },
  { name: "中村隆",     title: "支店長",     company: "G法律事務所",         color: "#5b9bd5", img: null },
  { name: "渡辺結衣",   title: "リーダー",   company: "Hホールディングス",   color: "#c267ff", img: null },
  { name: "小林大輔",   title: "本部長",     company: "Iソリューションズ",   color: "#34c759", img: null },
  { name: "加藤さくら", title: "マネージャー", company: "Jテクノロジー",    color: "#ff5b6e", img: null },
  { name: "斎藤明",     title: "シニア",     company: "Kインターナショナル", color: "#ffd24a", img: null },
  { name: "山本智子",   title: "プランナー", company: "Lパートナーズ",       color: "#8a4dff", img: null },
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
    phase:        "meet",
    quizQueue:    [],
    target:       null,
    timer:        0,
  };

  const root = el("div.exch-game", {}, [
    el("div.exch-titlebar", {}, [
      el("button.pbtn.outline", {
        style: { padding: "4px 10px", fontSize: "12px", minWidth: "auto", whiteSpace: "nowrap" },
        onclick: () => quit()
      }, [el("span", { text: "← メニュー" })]),
      el("div.exch-title", { text: "名刺おぼえ会議" }),
      el("div.exch-stats#exch-stats", { text: "ROUND 1 / " + MAX_ROUNDS }),
    ]),
    el("div.exch-scene#exch-scene"),
    el("div.exch-dialogue#exch-dialogue"),
    el("div.exch-action#exch-action"),
    el("div.exch-meta", {}, [
      el("div.exch-lives#exch-lives", { text: "❤❤❤" }),
      el("div.exch-timer-wrap", {}, [el("div.exch-timer-fill#exch-timer-fill")]),
      el("div.exch-score#exch-score", { text: "0円" }),
    ]),
    el("div.exch-toast#exch-toast"),
  ]);

  mount(root);

  const refs = {
    scene:     root.querySelector("#exch-scene"),
    dialogue:  root.querySelector("#exch-dialogue"),
    action:    root.querySelector("#exch-action"),
    lives:     root.querySelector("#exch-lives"),
    score:     root.querySelector("#exch-score"),
    stats:     root.querySelector("#exch-stats"),
    timerFill: root.querySelector("#exch-timer-fill"),
    toast:     root.querySelector("#exch-toast"),
  };

  // ── ラウンド開始 ──────────────────────────────────────────────────
  function startRound() {
    if (!state.active) return;
    if (state.round > MAX_ROUNDS) { finish(true); return; }

    const cardCount = Math.min(6, 2 + Math.floor((state.round - 1) * 0.5));
    state.meetSec   = Math.max(2.0, 3.5 - (state.round - 1) * 0.15);
    state.cards     = pickN(CONTACTS, cardCount);
    state.metCount  = 0;
    state.phase     = "meet";
    state.quizQueue = [];

    refs.stats.textContent = "ROUND " + state.round + " / " + MAX_ROUNDS;
    showNextMeet();
  }

  // ── 自己紹介 ──────────────────────────────────────────────────────
  function showNextMeet() {
    if (!state.active) return;
    const char  = state.cards[state.metCount];
    const total = state.cards.length;

    renderScene(char, "meet");
    renderDialogue("meet", char, total);
    renderTap(() => { stopTimer(); advanceMeet(); });
    runTimer(state.meetSec, () => advanceMeet());
  }

  function advanceMeet() {
    state.metCount++;
    if (state.metCount < state.cards.length) {
      showNextMeet();
    } else {
      state.quizQueue = shuffle(state.cards.slice());
      nextGoodbye();
    }
  }

  // ── お別れ（クイズ）────────────────────────────────────────────────
  function nextGoodbye() {
    if (!state.active) return;
    if (state.quizQueue.length === 0) {
      state.round++;
      startRound();
      return;
    }

    state.phase  = "goodbye";
    state.target = state.quizQueue.shift();

    renderScene(state.target, "goodbye");
    renderDialogue("goodbye-player");

    const pool    = CONTACTS.filter(c => c.name !== state.target.name);
    const choices = shuffle([state.target, ...pickN(pool, 3)]);
    renderChoices(choices);
    runTimer(8, () => handleAnswer(null));
  }

  function handleAnswer(picked) {
    if (state.phase !== "goodbye") return;
    state.phase = "answer";
    stopTimer();

    const correct = picked && picked.name === state.target.name;
    const t       = state.target;

    if (correct) {
      const gain = 10 + state.round * 3;
      state.score += gain;
      state.correctCount++;
      refs.score.textContent = state.score + "円";
      toast("正解！ +" + gain + "円", "ok");
      renderScene(t, "happy");
      renderDialogue("correct", t);
    } else {
      state.lives--;
      refs.lives.textContent =
        "❤".repeat(Math.max(0, state.lives)) +
        "🖤".repeat(Math.max(0, MAX_LIVES - state.lives));
      toast("不正解…", "ng");
      renderScene(t, "awkward");
      renderDialogue("wrong", t, picked);
    }

    let advanced = false;
    const doNext = () => {
      if (advanced || !state.active) return;
      advanced = true;
      if (state.lives <= 0) { finish(false); return; }
      nextGoodbye();
    };

    renderTap(doNext);
    setTimeout(doNext, 3000);
  }

  // ── 描画 ──────────────────────────────────────────────────────────
  function renderScene(char, mode) {
    clear(refs.scene);

    const sprite = char.img
      ? el("img.exch-sprite", { src: char.img, alt: char.name })
      : el("div.exch-sprite-ph", { style: { background: char.color } }, [
          el("div.exch-sprite-initial", { text: char.name[0] }),
        ]);

    const cardEl = (mode === "meet") ? el("div.exch-namecard-prop", {}, [
      el("div.exch-nc-name",    { text: char.name }),
      el("div.exch-nc-title",   { text: char.title }),
      el("div.exch-nc-company", { text: char.company }),
    ]) : null;

    refs.scene.appendChild(
      el("div.exch-char-wrap" + (mode === "meet" ? ".with-card" : ""), {}, [
        sprite,
        ...(cardEl ? [cardEl] : []),
      ])
    );
  }

  function renderDialogue(type, char, extra) {
    clear(refs.dialogue);
    let text = "", cls = "exch-bubble-char";

    if (type === "meet") {
      const total = extra;
      const lines = [
        "はじめまして、" + char.company + "の" + char.name + "と申します。",
        char.name + "と申します。" + char.company + "の" + char.title + "でございます。",
        char.company + "で" + char.title + "を務めております、" + char.name + "です。",
      ];
      text = lines[state.metCount % lines.length];
      cls  = "exch-bubble-char";
    } else if (type === "goodbye-player") {
      text = "本日はありがとうございました。";
      cls  = "exch-bubble-player";
    } else if (type === "correct") {
      text = "こちらこそ、ありがとうございました！またよろしくお願いいたします。";
      cls  = "exch-bubble-char";
    } else if (type === "wrong") {
      text = extra
        ? "あの…、" + char.name + "ですが…。"
        : "…" + char.name + "と申しますが…。";
      cls = "exch-bubble-char";
    }

    refs.dialogue.appendChild(el("div." + cls, { text }));
  }

  function renderTap(cb) {
    clear(refs.action);
    refs.action.appendChild(el("div.exch-tap-hint", { text: "タップで次へ →", onclick: cb }));
  }

  function renderChoices(choices) {
    clear(refs.action);
    refs.action.appendChild(
      el("div.exch-choice-grid", {},
        choices.map(c =>
          el("button.exch-choice-btn", { onclick: () => handleAnswer(c) }, [
            el("span", { text: c.name + "さん" })
          ])
        )
      )
    );
  }

  // ── タイマー ──────────────────────────────────────────────────────
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

  function toast(msg, kind) {
    refs.toast.textContent = msg;
    refs.toast.className = "exch-toast show " + (kind || "");
    setTimeout(() => { refs.toast.className = "exch-toast"; }, 1400);
  }

  function quit() { state.active = false; stopTimer(); Router.menu(); }

  function finish(cleared) {
    state.active = false;
    stopTimer();
    const score = state.score;
    const coins = Math.floor(score / 5);
    let msg, comment;
    if (cleared) {
      msg     = "全" + MAX_ROUNDS + "ラウンド完遂！正解 " + state.correctCount + "件、最終 " + score + "円。";
      comment = "佐藤部長「素晴らしい記憶力だ。次の役員会も任せたぞ。」";
    } else if (state.correctCount === 0) {
      msg     = "全問不正解で帰社。";
      comment = "佐藤部長「君、本当に名刺を見ていたのかね？社会人失格だ。」";
    } else {
      msg     = (state.round - 1) + "ラウンドで脱落（正解 " + state.correctCount + "件）。";
      comment = "佐藤部長「もう少し集中して相手の名刺を見たまえ。」";
    }
    finishGame(gameId, score, coins, msg, {
      isWin: cleared,
      allowances: [{ name: "正答ボーナス × " + state.correctCount, value: score }],
      deductions: [],
      bossComment: comment,
    });
  }

  startRound();
  return { dispose() { state.active = false; stopTimer(); } };
}

function pickN(arr, n) {
  const copy = arr.slice(), out = [];
  for (let i = 0; i < n && copy.length > 0; i++)
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
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
