// =========================================================================
// commute.js — 通勤ラッシュサバイバル
// 満員電車内。プレイヤーは中央でつり革を握る。
// 電車が揺れたり、酔っぱらいが近づいたりするので、適切なボタンで耐える。
// ストレス0で発狂退社、30秒生き延びると会社到着。
// =========================================================================

import { el, clear, loop, clamp, pick, rand } from "../dom.js?v=1.1.7";
import { Router } from "../app.js?v=1.1.7";
import { finishGame } from "./result.js?v=1.1.7";
import { SVG_WORKER, SVG_BOSS, SVG_AGENT, SVG_SALESMAN, SVG_OL, SVG_FEMALE_EXEC } from "../art.js?v=1.1.7";

// 満員電車の他の乗客（男女ミックス）
const NPC_SVGS = [SVG_BOSS, SVG_OL, SVG_AGENT, SVG_FEMALE_EXEC];

// シグナル種別
const SIGNALS = [
  { type: "left",  label: "← 左へ揺れる！",  action: "left",  color: "#5be8ff" },
  { type: "right", label: "右へ揺れる！ →", action: "right", color: "#5be8ff" },
  { type: "stop",  label: "！ 急停車 ！",    action: "both",  color: "#ff5cb4" },
  { type: "drunk", label: "🍶 酔っぱらい接近！", action: "dodge", color: "#ffd24a" },
];

// 1日（駅）あたりの目標生存時間
const SHIFT_LENGTH = 35;

export function startCommute(mount, gameId) {
  const state = {
    active: true,
    elapsed: 0,
    stress: 85,            // メンタル値（0で発狂退社、高いほど平静）
    survived: 0,           // 耐え抜いた揺れの数
    combo: 0,
    maxCombo: 0,
    signal: null,          // 現在のシグナル {type, action, until, dom}
    leftPressed: false,
    rightPressed: false,
    nextSignalDelay: 1.8,
    busy: false,
  };

  const screen = el("div.commute-game", {}, [
    // タイトルバー
    el("div.commute-titlebar", {}, [
      el("button.pbtn.outline", {
        style: { padding: "4px 8px", fontSize: "11px", minWidth: "auto" },
        onclick: () => quit(false),
      }, [el("span", { text: "← メニュー" })]),
      el("div.commute-route", {}, [
        el("span", { text: "次は " }),
        el("span.commute-station#commute-station", { text: "新宿" }),
        el("span", { text: " 到着まで" }),
        el("span.commute-time#commute-time", { text: " 0:35" }),
      ]),
    ]),

    // ストレスバー
    el("div.commute-stress-bar", {}, [
      el("div.commute-stress-label", { text: "通勤メンタル" }),
      el("div.commute-stress-track", {}, [
        el("div.commute-stress-fill#commute-stress", { style: { width: "85%" } })
      ]),
      el("div.commute-stress-val#commute-stress-val", { text: "85%" }),
    ]),

    // ステージ（車内）
    el("div.commute-stage#commute-stage", {}, [
      // 窓
      el("div.commute-window.left"),
      el("div.commute-window.right"),
      // つり革列
      el("div.commute-strap-row", {}, Array.from({length: 5}, () => el("div.commute-strap"))),
      // 他の乗客（背景）
      el("div.commute-passengers", {}, [
        npcSprite(NPC_SVGS[0], "5%",  "near"),
        npcSprite(NPC_SVGS[1], "20%", "near"),
        npcSprite(NPC_SVGS[2], "78%", "near"),
        npcSprite(NPC_SVGS[3], "92%", "near"),
      ]),
      // プレイヤー
      el("div.commute-player#commute-player", {}, [
        el("div.commute-strap-hand"),
        el("div.commute-character", { html: SVG_WORKER }),
        el("div.commute-name-tag", { text: "あなた" }),
      ]),
      // シグナル表示エリア
      el("div.commute-signal#commute-signal"),
    ]),

    // 操作ボタン
    el("div.commute-controls", {}, [
      el("button.pbtn.green.commute-btn", {
        onclick: (e) => { e.preventDefault(); pressDirection("left"); },
        ontouchstart: (e) => { e.preventDefault(); pressDirection("left"); },
      }, [el("span", { text: "◀ 左へふんばる" })]),
      el("button.pbtn.yellow.commute-btn", {
        onclick: (e) => { e.preventDefault(); pressDirection("dodge"); },
        ontouchstart: (e) => { e.preventDefault(); pressDirection("dodge"); },
      }, [el("span", { text: "💢 やり過ごす" })]),
      el("button.pbtn.green.commute-btn", {
        onclick: (e) => { e.preventDefault(); pressDirection("right"); },
        ontouchstart: (e) => { e.preventDefault(); pressDirection("right"); },
      }, [el("span", { text: "右へふんばる ▶" })]),
    ]),
  ]);

  mount(screen);

  const refs = {
    time: screen.querySelector("#commute-time"),
    station: screen.querySelector("#commute-station"),
    stressFill: screen.querySelector("#commute-stress"),
    stressVal: screen.querySelector("#commute-stress-val"),
    stage: screen.querySelector("#commute-stage"),
    signal: screen.querySelector("#commute-signal"),
    player: screen.querySelector("#commute-player"),
  };

  function npcSprite(svg, left, lane) {
    const dom = el("div.commute-npc", { style: { left } }, [
      el("div.commute-character", { html: svg }),
    ]);
    return dom;
  }

  // --- シグナル管理 --------------------------------------------------------

  function spawnSignal() {
    const sig = pick(SIGNALS);
    // 経過時間で反応猶予を短く
    const reactTime = Math.max(0.9, 1.7 - state.elapsed * 0.02);
    state.signal = {
      type: sig.type,
      action: sig.action,
      until: state.elapsed + reactTime,
      reactTime,
    };

    // 視覚的なアラート表示
    refs.signal.textContent = sig.label;
    refs.signal.style.color = sig.color;
    refs.signal.classList.remove("warn");
    void refs.signal.offsetWidth;
    refs.signal.classList.add("warn");

    // ステージを傾ける
    if (sig.type === "left")       refs.stage.classList.add("lean-left");
    else if (sig.type === "right") refs.stage.classList.add("lean-right");
    else if (sig.type === "stop")  refs.stage.classList.add("brake");
    else if (sig.type === "drunk") refs.stage.classList.add("drunk-incoming");
  }

  function clearSignal() {
    state.signal = null;
    refs.signal.textContent = "";
    refs.signal.classList.remove("warn");
    refs.stage.classList.remove("lean-left", "lean-right", "brake", "drunk-incoming");
  }

  function pressDirection(dir) {
    if (!state.active) return;
    if (!state.signal) {
      // 何もないところで押した：軽いストレス
      spawnPop("……（独り言）", "ng");
      return;
    }
    const sig = state.signal;
    let correct = false;
    if (sig.action === "left"  && dir === "left")  correct = true;
    if (sig.action === "right" && dir === "right") correct = true;
    if (sig.action === "dodge" && dir === "dodge") correct = true;
    if (sig.action === "both") {
      // 急停車：左右ボタンを 0.5秒以内に連続で押す（簡略化：どちらかで成功）
      correct = (dir === "left" || dir === "right");
    }

    if (correct) {
      state.survived++;
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.stress = clamp(state.stress + 4, 0, 100);
      spawnPop("耐えた！ +5円", "ok");
      // 反対方向に体を傾けるアニメ
      if (dir === "left")       refs.player.classList.add("brace-left");
      else if (dir === "right") refs.player.classList.add("brace-right");
      else                       refs.player.classList.add("brace-dodge");
      setTimeout(() => {
        refs.player.classList.remove("brace-left", "brace-right", "brace-dodge");
      }, 350);
      clearSignal();
      state.nextSignalDelay = rand(0.5, 1.4);
    } else {
      // 間違ったボタン：大ストレス
      state.combo = 0;
      state.stress = clamp(state.stress - 12, 0, 100);
      spawnPop("ぶつかった…！", "ng");
      refs.player.classList.add("bumped");
      setTimeout(() => refs.player.classList.remove("bumped"), 300);
      clearSignal();
      state.nextSignalDelay = rand(0.7, 1.5);
    }
  }

  function spawnPop(text, type) {
    const p = el("div", { class: "commute-pop " + type, text });
    refs.stage.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }

  // --- メインループ --------------------------------------------------------

  const game = loop((dt) => {
    if (!state.active) return;
    state.elapsed += dt;

    const remain = Math.max(0, SHIFT_LENGTH - state.elapsed);
    const mm = Math.floor(remain / 60);
    const ss = Math.floor(remain % 60);
    refs.time.textContent = ` ${mm}:${String(ss).padStart(2, "0")}`;

    // ストレスの自然回復（押されてない時のみ、ゆっくり）
    if (!state.signal) {
      state.stress = clamp(state.stress + 0.5 * dt, 0, 100);
    }
    // ストレスバー
    refs.stressFill.style.width = state.stress + "%";
    refs.stressVal.textContent = Math.floor(state.stress) + "%";
    refs.stressFill.classList.remove("warning", "critical");
    if (state.stress < 30)      refs.stressFill.classList.add("critical");
    else if (state.stress < 60) refs.stressFill.classList.add("warning");

    if (state.stress <= 0) { quit(true, "burst"); return; }
    if (remain <= 0) { quit(false, "arrived"); return; }

    // シグナル発生＆タイムアウト
    if (!state.signal) {
      state.nextSignalDelay -= dt;
      if (state.nextSignalDelay <= 0) spawnSignal();
    } else if (state.elapsed > state.signal.until) {
      // 反応できず → 体勢崩す
      state.combo = 0;
      state.stress = clamp(state.stress - 15, 0, 100);
      spawnPop("ぐらっ…", "ng");
      refs.player.classList.add("bumped");
      setTimeout(() => refs.player.classList.remove("bumped"), 300);
      clearSignal();
      state.nextSignalDelay = rand(0.8, 1.6);
    }
  });

  function quit(forced, reason) {
    state.active = false;
    game.stop();

    const unitPrice = 5;
    const earned = state.survived * unitPrice;
    const deductionVal = state.survived > 0 ? 3 : 0;
    const coins = Math.max(0, earned - deductionVal);
    const score = state.survived * 100 + state.maxCombo * 30 + Math.floor(state.stress);

    let comment, msg;
    if (reason === "burst") {
      msg = `ストレス限界で発狂退社（${state.survived}回耐えた）。`;
      comment = "佐藤部長「君、出社時に大声で『すいません』連呼してたぞ。少し休みなさい。」";
    } else if (reason === "arrived") {
      msg = `${SHIFT_LENGTH}秒生き残って会社到着！ 耐えた揺れ ${state.survived}回。`;
      if (state.maxCombo >= 8) {
        comment = "佐藤部長「君、満員電車の達人だな。出社しても元気そうだ。」";
      } else if (state.survived >= 5) {
        comment = "佐藤部長「無事到着で何より。今日もよろしく頼むよ。」";
      } else {
        comment = "佐藤部長「顔色悪いな…大丈夫か？まあ働けるならいいか。」";
      }
    } else {
      msg = `${state.survived}回耐えて自主退勤。`;
      comment = "佐藤部長「途中で電車降りるとは何事かね？」";
    }

    finishGame(gameId, score, coins, msg, {
      isWin: true,
      allowances: [{ name: `踏ん張り成功 × ${state.survived}`, value: earned }],
      deductions: deductionVal > 0 ? [{ name: "電車代", value: deductionVal }] : [],
      bossComment: comment,
    });
  }

  return { dispose() { game.stop(); } };
}
