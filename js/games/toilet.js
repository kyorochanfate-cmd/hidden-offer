// =========================================================================
// toilet.js — トイレ逃避タイム
// 個室にこもって極限までサボる。経過秒数がそのまま給料。
// ランダムに「ノック」「上司接近」「上司からチャット」「本物の腹痛」など
// の侵入イベントが来るので、正しいボタン4種で凌ぐ。
// 警戒値が0になるとバレてゲームオーバー。
// =========================================================================

import { el, clear, loop, clamp, pick, rand } from "../dom.js?v=1.1.8";
import { Router } from "../app.js?v=1.1.8";
import { finishGame } from "./result.js?v=1.1.8";
import { SVG_WORKER } from "../art.js?v=1.1.8";

// 侵入イベント定義
const INTRUSIONS = [
  {
    type: "knock",
    label: "コンコン！「中、入ってますか？」",
    action: "quiet",
    color: "#5be8ff",
    desc: "誰か別の人がトイレを使いたがってる",
  },
  {
    type: "boss",
    label: "👤 上司の足音が近づく…",
    action: "hide",
    color: "#ff5cb4",
    desc: "上司が通路を歩いている",
  },
  {
    type: "chat",
    label: "📱 上司「会議始まるよ」",
    action: "reply",
    color: "#ffd24a",
    desc: "上司から呼び出しチャット",
  },
  {
    type: "stomach",
    label: "💥 本物の便意が来た！",
    action: "hold",
    color: "#d2483f",
    desc: "下手な動きをすると…",
  },
];

const ACTION_LABELS = {
  quiet: "🤫 静かにする",
  hide:  "🫥 息を潜める",
  reply: "💬 即レス返信",
  hold:  "💪 ふんばる",
};

export function startToilet(mount, gameId) {
  const state = {
    active: true,
    elapsed: 0,
    earnings: 0,            // サボった秒数（=円）
    intrusion: null,        // 現在の侵入 {type, action, until, color}
    nextIntrusionAt: rand(3.5, 6.0),
    alert: 100,             // 警戒値（0でバレる）
    combo: 0,
    maxCombo: 0,
  };

  const screen = el("div.toilet-game", {}, [
    // タイトルバー
    el("div.toilet-titlebar", {}, [
      el("button.pbtn.outline", {
        style: { padding: "4px 8px", fontSize: "11px", minWidth: "auto" },
        onclick: () => quit(false),
      }, [el("span", { text: "← メニュー" })]),
      el("div.toilet-room-name", { text: "🚪 男子トイレ 個室 [使用中]" }),
      el("button.pbtn.green.toilet-exit-btn", {
        style: { padding: "4px 10px", fontSize: "11px", minWidth: "auto" },
        onclick: () => quit(false),
      }, [el("span", { text: "退出" })]),
    ]),

    // ステータスバー
    el("div.toilet-statusbar", {}, [
      el("div.toilet-stat-block", {}, [
        el("div.toilet-stat-label", { text: "サボり時間" }),
        el("div.toilet-stat-val#toilet-elapsed", { text: "0秒" }),
      ]),
      el("div.toilet-stat-block", {}, [
        el("div.toilet-stat-label", { text: "貯金" }),
        el("div.toilet-stat-val gold#toilet-earnings", { text: "0円" }),
      ]),
      el("div.toilet-alert-wrap", {}, [
        el("div.toilet-stat-label", { text: "警戒度" }),
        el("div.toilet-alert-track", {}, [
          el("div.toilet-alert-fill#toilet-alert", { style: { width: "100%" } })
        ]),
      ]),
    ]),

    // ステージ：個室
    el("div.toilet-stage#toilet-stage", {}, [
      // 個室壁とドア
      el("div.toilet-wall"),
      el("div.toilet-door", {}, [
        el("div.toilet-door-knob"),
        el("div.toilet-door-lock", { text: "🔒" }),
        el("div.toilet-door-sign", { text: "使用中" }),
      ]),
      // タイル床
      el("div.toilet-floor"),
      // 便器
      el("div.toilet-bowl", {}, [
        el("div.toilet-tank"),
        el("div.toilet-seat"),
      ]),
      // プレイヤー（座ってる）
      el("div.toilet-player#toilet-player", {}, [
        el("div.toilet-character", { html: SVG_WORKER }),
      ]),
      // 侵入アラート
      el("div.toilet-intrusion#toilet-intrusion"),
    ]),

    // 4ボタン
    el("div.toilet-controls", {}, [
      buildActionBtn("quiet"),
      buildActionBtn("hide"),
      buildActionBtn("reply"),
      buildActionBtn("hold"),
    ]),
  ]);

  mount(screen);

  const refs = {
    elapsed: screen.querySelector("#toilet-elapsed"),
    earnings: screen.querySelector("#toilet-earnings"),
    alert: screen.querySelector("#toilet-alert"),
    stage: screen.querySelector("#toilet-stage"),
    intrusion: screen.querySelector("#toilet-intrusion"),
    player: screen.querySelector("#toilet-player"),
  };

  function buildActionBtn(action) {
    return el("button.pbtn.toilet-btn", {
      onclick: (e) => { e.preventDefault(); doAction(action); },
      ontouchstart: (e) => { e.preventDefault(); doAction(action); },
      "data-action": action,
    }, [el("span", { text: ACTION_LABELS[action] })]);
  }

  // --- 侵入イベント -------------------------------------------------------

  function spawnIntrusion() {
    const ins = pick(INTRUSIONS);
    const reactTime = Math.max(1.2, 2.5 - state.elapsed * 0.015);
    state.intrusion = {
      type: ins.type,
      action: ins.action,
      label: ins.label,
      color: ins.color,
      until: state.elapsed + reactTime,
    };

    refs.intrusion.textContent = ins.label;
    refs.intrusion.style.color = ins.color;
    refs.intrusion.style.borderColor = ins.color;
    refs.intrusion.classList.remove("show");
    void refs.intrusion.offsetWidth;
    refs.intrusion.classList.add("show");

    // 個室全体の警告効果
    refs.stage.classList.add("alarmed");
  }

  function clearIntrusion() {
    state.intrusion = null;
    refs.intrusion.classList.remove("show");
    refs.stage.classList.remove("alarmed");
  }

  function doAction(action) {
    if (!state.active) return;
    const ins = state.intrusion;
    if (!ins) {
      // 何も来てない時：軽くペナルティ（無駄動作）
      spawnPop("…（特に何も）", "ng");
      state.alert = clamp(state.alert - 3, 0, 100);
      updateStatus();
      return;
    }
    if (action === ins.action) {
      // 成功
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.alert = clamp(state.alert + 8, 0, 100);
      spawnPop("セーフ！", "ok");
      bumpPlayer("ok");
      clearIntrusion();
      state.nextIntrusionAt = state.elapsed + rand(3.0, 5.5);
    } else {
      // 失敗
      state.combo = 0;
      state.alert = clamp(state.alert - 18, 0, 100);
      spawnPop("バレかけ！", "ng");
      bumpPlayer("ng");
      clearIntrusion();
      state.nextIntrusionAt = state.elapsed + rand(2.5, 4.5);
    }
    updateStatus();
  }

  function bumpPlayer(kind) {
    refs.player.classList.add(kind === "ok" ? "relieved" : "panicked");
    setTimeout(() => {
      refs.player.classList.remove("relieved", "panicked");
    }, 350);
  }

  function spawnPop(text, type) {
    const p = el("div", { class: "toilet-pop " + type, text });
    refs.stage.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }

  function updateStatus() {
    refs.elapsed.textContent = Math.floor(state.elapsed) + "秒";
    refs.earnings.textContent = state.earnings + "円";
    refs.alert.style.width = state.alert + "%";
    refs.alert.classList.remove("warning", "critical");
    if (state.alert < 30)      refs.alert.classList.add("critical");
    else if (state.alert < 60) refs.alert.classList.add("warning");
  }

  // --- メインループ -------------------------------------------------------

  const game = loop((dt) => {
    if (!state.active) return;
    state.elapsed += dt;
    // 1秒ごとに+1円のサボり給
    state.earnings = Math.floor(state.elapsed);

    if (state.alert <= 0) { quit(true, "caught"); return; }

    if (!state.intrusion) {
      if (state.elapsed >= state.nextIntrusionAt) {
        spawnIntrusion();
      }
    } else {
      // タイムアウト：見逃しでバレかけ
      if (state.elapsed > state.intrusion.until) {
        state.combo = 0;
        state.alert = clamp(state.alert - 20, 0, 100);
        spawnPop("見逃した…！", "ng");
        bumpPlayer("ng");
        clearIntrusion();
        state.nextIntrusionAt = state.elapsed + rand(2.5, 4.5);
      }
    }
    updateStatus();
  });

  function quit(forced, reason) {
    state.active = false;
    game.stop();

    const seconds = Math.floor(state.elapsed);
    let earned = seconds;          // 1秒 = 1円
    const deductionVal = 0;
    let coins = Math.max(0, earned - deductionVal);
    const score = seconds * 10 + state.maxCombo * 20 + Math.floor(state.alert);

    let comment, msg;
    if (reason === "caught") {
      msg = `${seconds}秒で発見されてバレた。`;
      comment = "佐藤部長「君、トイレ長すぎないか？体調悪いなら早退するか？」";
      // バレた場合は半額
      coins = Math.floor(coins / 2);
      earned = coins;
    } else if (seconds < 10) {
      msg = `${seconds}秒で退出。これじゃサボりにならない。`;
      comment = "佐藤部長「早かったね、よかった元気で。」";
    } else if (seconds >= 90) {
      msg = `${seconds}秒も個室に潜伏！レジェンド級のサボり。`;
      comment = "佐藤部長「君のトイレ、もはや出張だな。」";
    } else if (seconds >= 45) {
      msg = `${seconds}秒の個室サバイバル成功。`;
      comment = "佐藤部長「君、最近トイレ長くないか？まあ、人間だしな。」";
    } else {
      msg = `${seconds}秒で自主退出。`;
      comment = "佐藤部長「お疲れさま、戻ったら例の件、頼むよ。」";
    }

    finishGame(gameId, score, coins, msg, {
      isWin: true,
      allowances: [{ name: `個室潜伏 ${seconds}秒`, value: earned }],
      deductions: [],
      bossComment: comment,
    });
  }

  return { dispose() { game.stop(); } };
}
