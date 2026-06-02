// =========================================================================
// exchange.js — 名刺交換タクティカル（タイミングゲーム）
// プレイヤーは画面左、右向き固定。
// 取引先が画面右から歩いてやってくる。
// 距離がスイートスポット（プレイヤーから80〜140px）内に来た瞬間に
// 「名刺を出す」ボタンを押すと成功＝+10円。
// 早すぎ・遅すぎ・通り過ぎはマナー違反でマナー値減少。
// マナー値0で出禁。
// =========================================================================

import { el, clear, loop, clamp, pick, rand } from "../dom.js?v=1.1.1";
import { Router } from "../app.js?v=1.1.1";
import { finishGame } from "./result.js?v=1.1.1";
import { SVG_WORKER, SVG_BOSS, SVG_AGENT } from "../art.js?v=1.1.1";

// 取引先プリセット（次々来る人）
const VISITORS = [
  { name: "山田部長",   company: "テクノA社",         svg: SVG_BOSS,   color: "#ec6a3c" },
  { name: "田中様",     company: "Bシステムズ",        svg: SVG_AGENT,  color: "#6264a7" },
  { name: "鈴木課長",   company: "C商事HD",            svg: SVG_WORKER, color: "#2fae8f" },
  { name: "佐々木さん", company: "D製作所",           svg: SVG_AGENT,  color: "#d23b8a" },
  { name: "高橋様",     company: "Eインダストリー",    svg: SVG_BOSS,   color: "#b8860b" },
];

const PHRASES = [
  "お世話になっております！",
  "本日はお時間頂きありがとうございます",
  "弊社の◯◯と申します",
  "どうぞよろしくお願いいたします",
  "貴重なお時間を頂きまして",
];

// プレイヤー中心のX位置（px）。スイートスポットの基準。
const PLAYER_CENTER = 70;
const SWEET_MIN_DIST = 80;    // 早すぎ判定の境界
const SWEET_MAX_DIST = 140;   // 遅すぎ判定の境界
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
    visitor: null,
    nextSpawnDelay: 0.4,   // 初回スポーンまでの待機
    busy: false,
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

    el("div.ex-action-bar", {}, [
      el("button.pbtn.green.ex-submit-btn#ex-submit", {
        onclick: (e) => { e.preventDefault(); submitCard(); },
        ontouchstart: (e) => { e.preventDefault(); submitCard(); },
      }, [el("span", { text: "名刺を出す！" })]),
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
    submit: screen.querySelector("#ex-submit"),
  };

  // --- visitor 管理 ---------------------------------------------------------

  function spawnVisitor() {
    const def = pick(VISITORS);
    // 初速を大幅アップ、加速カーブも急に
    const baseSpeed = 140;
    const speed = baseSpeed * (1 + state.elapsed * 0.015);
    const stageWidth = refs.stage.clientWidth || 380;
    const startX = stageWidth + 40;

    const dom = el("div.ex-visitor", { style: { left: (startX - VISITOR_WIDTH/2) + "px" } }, [
      el("div.ex-character", { style: { transform: "scaleX(-1)" }, html: def.svg }),
      el("div.ex-name-tag", { style: { background: def.color }, text: def.name }),
    ]);
    refs.stage.appendChild(dom);
    state.visitor = { def, x: startX, speed, dom };

    setTimeout(() => {
      if (!state.visitor || state.visitor.dom !== dom) return;
      refs.dialog.textContent = `${def.company} ${def.name}：${pick(PHRASES)}`;
      refs.dialog.classList.add("visible");
    }, 350);
  }

  function despawnVisitor() {
    if (!state.visitor) return;
    const v = state.visitor;
    state.visitor = null;
    refs.dialog.classList.remove("visible");
    if (v.dom && v.dom.parentNode) {
      v.dom.style.transition = "opacity 0.3s";
      v.dom.style.opacity = "0";
      setTimeout(() => v.dom.remove(), 300);
    }
  }

  // --- 判定 ----------------------------------------------------------------

  function submitCard() {
    if (!state.active || state.busy) return;
    if (!state.visitor) {
      spawnPop("誰もいません…", "ng");
      state.mood = clamp(state.mood - 3, 0, 100);
      state.combo = 0;
      updateStatus();
      return;
    }
    const v = state.visitor;
    const dist = v.x - PLAYER_CENTER;
    let result;
    if (dist > SWEET_MAX_DIST)      result = "early";
    else if (dist < SWEET_MIN_DIST) result = "late";
    else                             result = "perfect";
    applyResult(result, v);
  }

  function applyResult(result, v) {
    if (result === "perfect") {
      state.successCount++;
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.mood = clamp(state.mood + 4, 0, 100);
      spawnPop("成功！ +10円", "ok");
      bowAnimation(v);
      state.busy = true;
      v.speed = 200; // 会釈してすぐ去る
      setTimeout(() => {
        despawnVisitor();
        state.nextSpawnDelay = rand(0.4, 0.9);
        state.busy = false;
      }, 700);
    } else if (result === "early") {
      state.failCount++;
      state.combo = 0;
      state.mood = clamp(state.mood - 8, 0, 100);
      spawnPop("早すぎ！マナー違反", "ng");
      shakeVisitor(v);
    } else if (result === "late") {
      state.failCount++;
      state.combo = 0;
      state.mood = clamp(state.mood - 12, 0, 100);
      spawnPop("遅い！失礼です", "ng");
      shakeVisitor(v);
      state.busy = true;
      setTimeout(() => {
        despawnVisitor();
        state.nextSpawnDelay = rand(0.4, 0.9);
        state.busy = false;
      }, 600);
    }
    updateStatus();
  }

  // --- 演出 ----------------------------------------------------------------

  function spawnPop(text, type) {
    const p = el("div", { class: "ex-pop " + type, text });
    refs.stage.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }

  function bowAnimation(v) {
    refs.player.classList.add("bowing");
    v.dom.classList.add("bowing");
    setTimeout(() => {
      refs.player.classList.remove("bowing");
      v.dom?.classList.remove("bowing");
    }, 600);
  }

  function shakeVisitor(v) {
    v.dom.classList.add("shake");
    setTimeout(() => v.dom?.classList.remove("shake"), 400);
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

    // マナー値の自然減衰（ゆるやか）
    state.mood = clamp(state.mood - 0.4 * dt, 0, 100);

    if (state.mood <= 0) { quit(true, "fired"); return; }

    if (!state.visitor && !state.busy) {
      state.nextSpawnDelay -= dt;
      if (state.nextSpawnDelay <= 0) spawnVisitor();
    } else if (state.visitor) {
      const v = state.visitor;
      v.x -= v.speed * dt;
      v.dom.style.left = (v.x - VISITOR_WIDTH/2) + "px";

      // 通り過ぎたら自動失敗
      if (v.x < PLAYER_CENTER - 30 && !state.busy) {
        spawnPop("無視した！失礼", "ng");
        state.mood = clamp(state.mood - 15, 0, 100);
        state.combo = 0;
        state.failCount++;
        despawnVisitor();
        state.nextSpawnDelay = rand(0.3, 0.7);
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
      msg = `マナー値0で取引先全社から出禁（${state.successCount}件成功）。`;
      comment = "取引先一同「失礼な方ですね…二度とお会いしないでしょう。」";
    } else if (state.successCount === 0) {
      msg = "1件も成立せず帰社。";
      comment = "佐藤部長「君、本当に営業マンなのかね？マナー研修からやり直しだ。」";
    } else if (state.successCount >= 15) {
      msg = `${state.successCount}件の名刺交換に成功！最大コンボ ${state.maxCombo}。`;
      comment = "佐藤部長「素晴らしい！名刺交換の達人だな。」";
    } else if (state.successCount >= 8) {
      msg = `${state.successCount}件の名刺交換に成功。`;
      comment = "佐藤部長「まあまあだな。次は10件超を目指してほしい。」";
    } else {
      msg = `${state.successCount}件のみ成立。`;
      comment = "佐藤部長「もう少し気合いを入れて取引先と向き合いたまえ。」";
    }

    finishGame(gameId, score, coins, msg, {
      isWin: true,
      allowances: [{ name: `名刺交換成功 × ${state.successCount}`, value: earned }],
      deductions: deductionVal > 0 ? [{ name: "名刺印刷代", value: deductionVal }] : [],
      bossComment: comment,
    });
  }

  return { dispose() { game.stop(); } };
}
