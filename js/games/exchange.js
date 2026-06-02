// =========================================================================
// exchange.js — 名刺交換タクティカル（タイミングゲーム）
// プレイヤーは画面左、右向き固定。
// 取引先(人間)＋たまに犬・猫が画面右から歩いてくる。
// スイートスポット（プレイヤーから80〜140px）内で正しいアクションを実行：
//   人間 → 「名刺を出す」
//   犬 / 猫 → 「なでなで」
// 早すぎ/遅すぎ/間違いアクション/無視はマナー値減少。
// マナー値0で出禁。
// =========================================================================

import { el, clear, loop, clamp, pick, rand } from "../dom.js?v=1.1.2";
import { Router } from "../app.js?v=1.1.2";
import { finishGame } from "./result.js?v=1.1.2";
import { SVG_WORKER, SVG_BOSS, SVG_AGENT, SVG_DOG, SVG_CAT } from "../art.js?v=1.1.2";

// 取引先プリセット（人間）
const HUMANS = [
  { name: "山田部長",   company: "テクノA社",        svg: SVG_BOSS,   color: "#ec6a3c" },
  { name: "田中様",     company: "Bシステムズ",       svg: SVG_AGENT,  color: "#6264a7" },
  { name: "鈴木課長",   company: "C商事HD",           svg: SVG_WORKER, color: "#2fae8f" },
  { name: "佐々木さん", company: "D製作所",          svg: SVG_AGENT,  color: "#d23b8a" },
  { name: "高橋様",     company: "Eインダストリー",   svg: SVG_BOSS,   color: "#b8860b" },
];

// 動物（紛れ込み）
const ANIMALS = [
  { name: "ポチ",  company: "迷い犬", svg: SVG_DOG, color: "#c89060", kind: "dog" },
  { name: "クロ",  company: "社猫",   svg: SVG_CAT, color: "#1f1f1f", kind: "cat" },
];

const PHRASES_HUMAN = [
  "お世話になっております！",
  "本日はお時間頂きありがとうございます",
  "弊社の◯◯と申します",
  "どうぞよろしくお願いいたします",
  "貴重なお時間を頂きまして",
];
const PHRASES_DOG = ["わんっ！", "ハッハッハッ……", "シッポふりふり", "クンクン……"];
const PHRASES_CAT = ["……ニャア", "（しっぽぴん）", "なで待ち", "ゴロゴロ"];

const PLAYER_CENTER = 70;
const SWEET_MIN_DIST = 80;
const SWEET_MAX_DIST = 140;
const VISITOR_WIDTH = 64;

export function startExchange(mount, gameId) {
  const state = {
    active: true,
    elapsed: 0,
    mood: 80,
    successCount: 0,
    failCount: 0,
    combo: 0,
    maxCombo: 0,
    visitors: [],        // 同時に複数いる
    nextSpawnDelay: 0.3,
    spawnId: 0,
  };

  const screen = el("div.ex-game", {}, [
    el("div.ex-titlebar", {}, [
      el("button.pbtn.outline", {
        style: { padding: "4px 8px", fontSize: "11px", minWidth: "auto" },
        onclick: () => quit(false),
      }, [el("span", { text: "← メニュー" })]),
      el("div.ex-room-name", { text: "応接室 ロビー" }),
      el("div.ex-clock#ex-clock", { text: "0:00" }),
    ]),

    el("div.ex-statusbar", {}, [
      el("div.ex-status-mood", {}, [
        el("span.ex-status-label", { text: "マナー値" }),
        el("div.ex-track", {}, [
          el("div.ex-fill#ex-mood-fill", { style: { width: "80%" } })
        ]),
        el("span.ex-status-val#ex-mood-val", { text: "80%" }),
      ]),
      el("div.ex-status-item", {}, [
        el("span.ex-status-label", { text: "成功" }),
        el("span.ex-status-val#ex-count", { text: "0" }),
      ]),
      el("div.ex-status-item", {}, [
        el("span.ex-status-label", { text: "コンボ" }),
        el("span.ex-status-val.combo#ex-combo", { text: "0" }),
      ]),
    ]),

    el("div.ex-stage#ex-stage", {}, [
      el("div.ex-wall"),
      el("div.ex-wall-logo", { text: "WELCOME" }),
      el("div.ex-floor"),
      el("div.ex-sweet-spot", { style: {
        left: (PLAYER_CENTER + SWEET_MIN_DIST) + "px",
        width: (SWEET_MAX_DIST - SWEET_MIN_DIST) + "px",
      }}),
      el("div.ex-dialog#ex-dialog"),
      el("div.ex-player#ex-player", { style: { left: (PLAYER_CENTER - VISITOR_WIDTH/2) + "px" } }, [
        el("div.ex-character", { html: SVG_WORKER }),
        el("div.ex-name-tag", { text: "あなた" }),
      ]),
    ]),

    // 2 ボタン：名刺を出す（人間用）／なでなで（動物用）
    el("div.ex-action-bar", {}, [
      el("button.pbtn.green.ex-action-btn#ex-card-btn", {
        onclick: (e) => { e.preventDefault(); doAction("card"); },
        ontouchstart: (e) => { e.preventDefault(); doAction("card"); },
      }, [el("span", { text: "名刺を出す" })]),
      el("button.pbtn.yellow.ex-action-btn#ex-pet-btn", {
        onclick: (e) => { e.preventDefault(); doAction("pet"); },
        ontouchstart: (e) => { e.preventDefault(); doAction("pet"); },
      }, [el("span", { text: "なでなで" })]),
    ]),
  ]);

  mount(screen);

  const refs = {
    clock: screen.querySelector("#ex-clock"),
    moodFill: screen.querySelector("#ex-mood-fill"),
    moodVal: screen.querySelector("#ex-mood-val"),
    count: screen.querySelector("#ex-count"),
    combo: screen.querySelector("#ex-combo"),
    stage: screen.querySelector("#ex-stage"),
    dialog: screen.querySelector("#ex-dialog"),
    player: screen.querySelector("#ex-player"),
  };

  // --- visitor 管理 ---------------------------------------------------------

  function spawnVisitor() {
    // 動物の混入率（経過時間と共に少し上がる）
    const animalChance = 0.18 + state.elapsed * 0.002;
    const isAnimal = Math.random() < animalChance;
    const def = isAnimal ? pick(ANIMALS) : pick(HUMANS);
    const kind = isAnimal ? def.kind : "human";

    // 速度：基本さらに速く、徐々に加速。動物は少し速め。
    const baseSpeed = 165;
    const speedMul = 1 + state.elapsed * 0.020;
    const animalBoost = isAnimal ? 1.15 : 1.0;
    const speed = baseSpeed * speedMul * animalBoost;

    const stageWidth = refs.stage.clientWidth || 380;
    const startX = stageWidth + 40;
    const id = ++state.spawnId;

    const dom = el("div", {
      class: "ex-visitor" + (isAnimal ? " is-animal" : ""),
      style: { left: (startX - VISITOR_WIDTH/2) + "px" }
    }, [
      el("div.ex-character", { style: { transform: "scaleX(-1)" }, html: def.svg }),
      el("div.ex-name-tag", { style: { background: def.color }, text: def.name }),
    ]);
    refs.stage.appendChild(dom);

    const visitor = { id, def, kind, x: startX, speed, dom, action: isAnimal ? "pet" : "card" };
    state.visitors.push(visitor);

    // セリフは最も手前の visitor のものを表示
    setTimeout(() => {
      const front = getFrontVisitor();
      if (!front) return;
      const phr = front.kind === "human" ? PHRASES_HUMAN
                : front.kind === "dog"   ? PHRASES_DOG
                :                          PHRASES_CAT;
      refs.dialog.textContent = front.kind === "human"
        ? `${front.def.company} ${front.def.name}：${pick(phr)}`
        : `${front.def.name}「${pick(phr)}」`;
      refs.dialog.classList.add("visible");
    }, 220);
  }

  function getFrontVisitor() {
    // 最も x の小さい（プレイヤーに近い）visitor
    if (state.visitors.length === 0) return null;
    return state.visitors.reduce((a, b) => a.x < b.x ? a : b);
  }

  function removeVisitor(v) {
    const idx = state.visitors.indexOf(v);
    if (idx >= 0) state.visitors.splice(idx, 1);
    if (v.dom && v.dom.parentNode) {
      v.dom.style.transition = "opacity 0.25s";
      v.dom.style.opacity = "0";
      setTimeout(() => v.dom.remove(), 250);
    }
    // 次のセリフ更新
    const next = getFrontVisitor();
    if (next) {
      const phr = next.kind === "human" ? PHRASES_HUMAN
                : next.kind === "dog"   ? PHRASES_DOG
                :                          PHRASES_CAT;
      refs.dialog.textContent = next.kind === "human"
        ? `${next.def.company} ${next.def.name}：${pick(phr)}`
        : `${next.def.name}「${pick(phr)}」`;
      refs.dialog.classList.add("visible");
    } else {
      refs.dialog.classList.remove("visible");
    }
  }

  // --- 判定 ----------------------------------------------------------------

  function doAction(action) {
    if (!state.active) return;
    const v = getFrontVisitor();
    if (!v) {
      spawnPop("誰もいません…", "ng");
      state.mood = clamp(state.mood - 2, 0, 100);
      state.combo = 0;
      updateStatus();
      return;
    }
    const dist = v.x - PLAYER_CENTER;

    // タイミング判定
    let timing;
    if (dist > SWEET_MAX_DIST)      timing = "early";
    else if (dist < SWEET_MIN_DIST) timing = "late";
    else                             timing = "perfect";

    // アクション判定
    const correctAction = v.action === action;

    if (timing === "perfect" && correctAction) {
      // 成功
      state.successCount++;
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.mood = clamp(state.mood + 4, 0, 100);
      const animalBonus = v.kind !== "human" ? "（社内マスコット +10円）" : "";
      spawnPop(`成功！ +10円${animalBonus}`, "ok");
      if (action === "card") bowAnimation(v);
      else                   petAnimation(v);
      v.speed = 240;
      setTimeout(() => removeVisitor(v), 500);
    } else if (timing === "perfect" && !correctAction) {
      // 距離はOK、アクション間違い
      state.failCount++;
      state.combo = 0;
      state.mood = clamp(state.mood - 10, 0, 100);
      const msg = v.kind === "human" ? "犬じゃないよ！名刺！" : "名刺じゃない！なでて！";
      spawnPop(msg, "ng");
      shakeVisitor(v);
    } else if (timing === "early") {
      state.failCount++;
      state.combo = 0;
      state.mood = clamp(state.mood - 6, 0, 100);
      spawnPop("早すぎ！", "ng");
      shakeVisitor(v);
    } else {
      // late
      state.failCount++;
      state.combo = 0;
      state.mood = clamp(state.mood - 10, 0, 100);
      spawnPop("遅い！失礼です", "ng");
      shakeVisitor(v);
      setTimeout(() => removeVisitor(v), 400);
    }
    updateStatus();
  }

  // --- 演出 ----------------------------------------------------------------

  function spawnPop(text, type) {
    const p = el("div", { class: "ex-pop " + type, text });
    refs.stage.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }

  function bowAnimation(v) {
    refs.player.classList.add("bowing");
    v.dom.classList.add("bowing");
    setTimeout(() => {
      refs.player.classList.remove("bowing");
      v.dom?.classList.remove("bowing");
    }, 500);
  }

  function petAnimation(v) {
    refs.player.classList.add("petting");
    v.dom.classList.add("petted");
    setTimeout(() => {
      refs.player.classList.remove("petting");
      v.dom?.classList.remove("petted");
    }, 500);
  }

  function shakeVisitor(v) {
    v.dom.classList.add("shake");
    setTimeout(() => v.dom?.classList.remove("shake"), 350);
  }

  function updateStatus() {
    refs.moodFill.style.width = state.mood + "%";
    refs.moodVal.textContent = Math.floor(state.mood) + "%";
    refs.count.textContent = String(state.successCount);
    refs.combo.textContent = String(state.combo);
    refs.moodFill.classList.remove("warning", "critical");
    if (state.mood < 30)      refs.moodFill.classList.add("critical");
    else if (state.mood < 60) refs.moodFill.classList.add("warning");
  }

  // --- メインループ --------------------------------------------------------

  const game = loop((dt) => {
    if (!state.active) return;
    state.elapsed += dt;

    const m = Math.floor(state.elapsed / 60);
    const s = Math.floor(state.elapsed % 60);
    refs.clock.textContent = `${m}:${String(s).padStart(2, "0")}`;

    state.mood = clamp(state.mood - 0.4 * dt, 0, 100);
    if (state.mood <= 0) { quit(true, "fired"); return; }

    // 複数 visitor の同時管理 — 既に1人いても次々追加
    state.nextSpawnDelay -= dt;
    if (state.nextSpawnDelay <= 0) {
      // 同時に画面上にいてもOK、ただし最大3体まで
      if (state.visitors.length < 3) {
        spawnVisitor();
      }
      // 次のスポーンまでの間隔（時間経過で更に短く）
      const base = Math.max(0.4, 1.0 - state.elapsed * 0.015);
      state.nextSpawnDelay = base + rand(0, 0.4);
    }

    // 各 visitor を移動
    for (const v of state.visitors.slice()) {
      v.x -= v.speed * dt;
      v.dom.style.left = (v.x - VISITOR_WIDTH/2) + "px";
      // 通り過ぎ
      if (v.x < PLAYER_CENTER - 30) {
        spawnPop("無視した！", "ng");
        state.mood = clamp(state.mood - 12, 0, 100);
        state.combo = 0;
        state.failCount++;
        removeVisitor(v);
      }
    }

    updateStatus();
  });

  function quit(forced, reason) {
    state.active = false;
    game.stop();

    const unitPrice = 10;
    const earned = state.successCount * unitPrice;
    const deductionVal = state.successCount > 0 ? 5 : 0;
    const coins = Math.max(0, earned - deductionVal);
    const score = state.successCount * 100 + state.maxCombo * 20 + Math.floor(state.mood);

    let comment, msg;
    if (reason === "fired") {
      msg = `マナー値0で出禁（${state.successCount}件成功）。`;
      comment = "取引先一同「失礼な方ですね…」 / 犬「ワン……」";
    } else if (state.successCount === 0) {
      msg = "1件も成立せず帰社。";
      comment = "佐藤部長「君、本当に営業マンなのかね？マナー研修からやり直しだ。」";
    } else if (state.successCount >= 20) {
      msg = `${state.successCount}件成功！最大コンボ ${state.maxCombo}。社内マスコットも安心。`;
      comment = "佐藤部長「素晴らしい！君は名刺交換の達人、しかも動物にも好かれるとは。」";
    } else if (state.successCount >= 10) {
      msg = `${state.successCount}件の応対に成功。`;
      comment = "佐藤部長「まあまあだな。次は20件超を狙いたまえ。」";
    } else {
      msg = `${state.successCount}件のみ成立。`;
      comment = "佐藤部長「もう少し気合いを入れて取引先と向き合いたまえ。」";
    }

    finishGame(gameId, score, coins, msg, {
      isWin: true,
      allowances: [{ name: `応対成功 × ${state.successCount}`, value: earned }],
      deductions: deductionVal > 0 ? [{ name: "名刺印刷代", value: deductionVal }] : [],
      bossComment: comment,
    });
  }

  return { dispose() { game.stop(); } };
}
