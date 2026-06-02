// =========================================================================
// toilet.js — 個室争奪戦
// 操作：自分のキャラをドラッグ／スワイプで左右移動。ドアの真下に立つと
// 自動ノック。空きなら入室＝フロアクリア。使用中なら弾かれる。
// 腹痛ゲージが時間経過で上昇。他のサラリーマンNPCも空きを狙ってくる。
// 100%で大惨事ゲームオーバー。
// =========================================================================

import { el, clear, loop, clamp, pick, rand } from "../dom.js?v=1.1.9";
import { Router } from "../app.js?v=1.1.9";
import { finishGame } from "./result.js?v=1.1.9";
import { SVG_WORKER, SVG_BOSS, SVG_AGENT, SVG_OL, SVG_FEMALE_EXEC } from "../art.js?v=1.1.9";

const NPC_SVGS = [SVG_BOSS, SVG_AGENT, SVG_OL, SVG_FEMALE_EXEC];
const OCCUPIED_VOICES = [
  "入ってます！", "ちょっと待って…", "（ゴホン）", "使用中ですよ",
  "あ、すいません！", "……（無言）",
];

// ステージ寸法（プレイヤー X 座標は 0〜100 の正規化）
const DOOR_SLOTS = 5;
const PLAYER_SPEED = 0.55;    // ドラッグ追従ではなく、絞り込み速度

export function startToilet(mount, gameId) {
  const state = {
    active: true,
    pain: 22,
    painRate: 4.5,
    floor: 1,
    cleared: 0,
    knocks: 0,
    locked: false,

    playerX: 50,             // 0〜100
    targetX: 50,             // ドラッグ目標位置
    doors: [],               // {slotX, truth, dom}
    npcs: [],                // {x, vx, dom, targetSlot}
    npcSpawnTimer: rand(1.5, 3.0),
    bumpCooldown: 0,         // 同じドアに連続でぶつからないように
  };

  const screen = el("div.stall-game", {}, [
    el("div.stall-titlebar", {}, [
      el("button.pbtn.outline", {
        style: { padding: "4px 8px", fontSize: "11px", minWidth: "auto" },
        onclick: () => quit(false),
      }, [el("span", { text: "← メニュー" })]),
      el("div.stall-floor-name", {}, [
        el("span", { text: "🚻 " }),
        el("span.stall-floor#stall-floor", { text: "3F トイレ" }),
      ]),
      el("div.stall-cleared#stall-cleared", { text: "踏破 0" }),
    ]),

    // 腹痛ゲージ
    el("div.stall-pain-bar", {}, [
      el("div.stall-pain-label", { text: "腹痛" }),
      el("div.stall-pain-track", {}, [
        el("div.stall-pain-fill#stall-pain", { style: { width: "22%" } })
      ]),
      el("div.stall-pain-val#stall-pain-val", { text: "22%" }),
    ]),

    // ヒント
    el("div.stall-hint#stall-hint", { text: "左右にドラッグして空き個室の前へ" }),

    // ステージ
    el("div.stall-stage#stall-stage", {}, [
      // 壁
      el("div.stall-wall"),
      // ドア列（JSで動的に追加）
      el("div.stall-door-row#stall-door-row"),
      // 床
      el("div.stall-floor-deck"),
      // プレイヤー
      el("div.stall-player#stall-player", {}, [
        el("div.stall-character", { html: SVG_WORKER }),
        el("div.stall-emote#stall-emote", { text: "💦" }),
      ]),
      // NPC レイヤー
      el("div.stall-npc-layer#stall-npc-layer"),
      // フィードバック
      el("div.stall-toast#stall-toast"),
    ]),
  ]);

  mount(screen);

  const refs = {
    floor: screen.querySelector("#stall-floor"),
    cleared: screen.querySelector("#stall-cleared"),
    painFill: screen.querySelector("#stall-pain"),
    painVal: screen.querySelector("#stall-pain-val"),
    stage: screen.querySelector("#stall-stage"),
    hint: screen.querySelector("#stall-hint"),
    doorRow: screen.querySelector("#stall-door-row"),
    player: screen.querySelector("#stall-player"),
    emote: screen.querySelector("#stall-emote"),
    npcLayer: screen.querySelector("#stall-npc-layer"),
    toast: screen.querySelector("#stall-toast"),
  };

  // --- ドラッグ／タップ操作 ----------------------------------------------

  let dragging = false;
  function getStageX(clientX) {
    const r = refs.stage.getBoundingClientRect();
    const pct = ((clientX - r.left) / r.width) * 100;
    return clamp(pct, 5, 95);
  }
  function startDrag(e) {
    if (!state.active || state.locked) return;
    dragging = true;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    state.targetX = getStageX(cx);
  }
  function moveDrag(e) {
    if (!dragging) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    state.targetX = getStageX(cx);
  }
  function endDrag() { dragging = false; }
  refs.stage.addEventListener("mousedown", startDrag);
  refs.stage.addEventListener("touchstart", startDrag, { passive: true });
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("touchmove", moveDrag, { passive: true });
  window.addEventListener("mouseup", endDrag);
  window.addEventListener("touchend", endDrag);

  // --- フロア生成 ---------------------------------------------------------

  function slotX(slot) {
    // 5スロット、左から右に等間隔 (10%, 30%, 50%, 70%, 90%)
    return 10 + slot * (80 / (DOOR_SLOTS - 1));
  }

  function buildFloor() {
    const floor = state.floor;
    const emptyCount = floor <= 2 ? 2 : 1;
    const brokenCount = floor >= 3 && Math.random() < 0.6 ? 1 : 0;

    const truths = [];
    for (let i = 0; i < emptyCount; i++) truths.push("empty");
    for (let i = 0; i < brokenCount; i++) truths.push("broken");
    while (truths.length < DOOR_SLOTS) truths.push("occupied");
    shuffle(truths);

    clear(refs.doorRow);
    state.doors = truths.map((t, i) => {
      const x = slotX(i);
      const dom = el("div.stall-door", {
        style: { left: x + "%" },
        "data-slot": i,
      }, [
        el("div.stall-door-frame"),
        el("div.stall-door-num", { text: String(i + 1) }),
        el("div.stall-door-knob"),
        el("div.stall-door-sign", { text: "？" }),
      ]);
      refs.doorRow.appendChild(dom);
      return { slot: i, x, truth: t, knocked: false, dom };
    });

    refs.floor.textContent = `${floor + 2}F トイレ`;
    refs.hint.textContent = emptyCount >= 2
      ? "左右ドラッグで空き個室の前へ！"
      : "空き個室は1つだけ。早く！";
    state.npcs.forEach(n => n.dom.remove());
    state.npcs = [];
    state.npcSpawnTimer = rand(1.5, 3.0);
    state.bumpCooldown = 0;
  }

  // --- NPC 管理 -----------------------------------------------------------

  function spawnNpc() {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -8 : 108;
    const targetSlot = (Math.random() * DOOR_SLOTS) | 0;
    const dom = el("div.stall-npc", {
      style: { left: x + "%", transform: fromLeft ? "scaleX(1)" : "scaleX(-1)" },
    }, [
      el("div.stall-character", { html: pick(NPC_SVGS) }),
    ]);
    refs.npcLayer.appendChild(dom);
    state.npcs.push({
      x, vx: fromLeft ? 8 : -8, targetSlot, dom,
      tried: false,
      cooldown: 0,
    });
  }

  function updateNpcs(dt) {
    for (const n of state.npcs.slice()) {
      // 目標スロットの X 座標へ向けて移動
      const tx = slotX(n.targetSlot);
      const dx = tx - n.x;
      const speed = 14 + state.floor * 0.6;
      if (Math.abs(dx) > 1) {
        n.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        n.vx = Math.sign(dx) * speed;
        n.dom.style.transform = `scaleX(${n.vx >= 0 ? 1 : -1})`;
      } else if (!n.tried) {
        // 到着、ノック
        n.tried = true;
        n.cooldown = 0.6;
        const door = state.doors[n.targetSlot];
        if (door && door.truth === "empty" && !door.knocked) {
          // 取られた！プレイヤーの目の前で奪われる演出
          door.knocked = true;
          markDoor(door, "occupied", "取られた");
          showToast("先に取られた…！", "ng");
          state.pain = clamp(state.pain + 4, 0, 100);
        }
      }
      n.cooldown -= dt;
      if (n.tried && n.cooldown <= 0) {
        // 退場：来た方向と逆へ歩き去る
        n.targetSlot = -1;
        n.x += (n.vx < 0 ? -1 : 1) * speed * dt;
        n.dom.style.left = n.x + "%";
        if (n.x < -10 || n.x > 110) {
          n.dom.remove();
          state.npcs.splice(state.npcs.indexOf(n), 1);
          continue;
        }
      } else {
        n.dom.style.left = n.x + "%";
      }
    }
  }

  // --- プレイヤー移動 & ドア判定 -----------------------------------------

  function updatePlayer(dt) {
    // targetX に向かって滑らかに移動
    const dx = state.targetX - state.playerX;
    state.playerX += dx * PLAYER_SPEED * Math.min(1, dt * 8);
    refs.player.style.left = state.playerX + "%";

    state.bumpCooldown = Math.max(0, state.bumpCooldown - dt);
    if (state.locked || state.bumpCooldown > 0) return;

    // 一番近いドアを判定
    let nearest = null;
    let bestDist = 999;
    for (const d of state.doors) {
      const dist = Math.abs(d.x - state.playerX);
      if (dist < bestDist) { bestDist = dist; nearest = d; }
    }
    if (!nearest) return;
    // しきい値 5%以内ならノック
    if (bestDist < 4 && !nearest.knocked) {
      attemptDoor(nearest);
    }
  }

  function attemptDoor(door) {
    state.knocks++;
    state.bumpCooldown = 0.7;

    if (door.truth === "empty") {
      door.knocked = true;
      state.locked = true;
      state.cleared++;
      state.floor++;
      state.pain = clamp(state.pain - 22, 0, 100);
      refs.cleared.textContent = `踏破 ${state.cleared}`;
      markDoor(door, "empty", "空き！");
      door.dom.classList.add("entering");
      refs.player.classList.add("entering");
      showToast("入れた…！ +" + floorReward(state.cleared) + "円", "ok");
      updatePain();
      setTimeout(() => {
        refs.player.classList.remove("entering");
        state.locked = false;
        buildFloor();
      }, 900);
    } else if (door.truth === "occupied") {
      door.knocked = true;
      state.pain = clamp(state.pain + 5, 0, 100);
      markDoor(door, "occupied", "使用中");
      showToast(pick(OCCUPIED_VOICES), "ng");
      bumpPlayer();
      updatePain();
    } else {
      // broken
      door.knocked = true;
      state.pain = clamp(state.pain + 2, 0, 100);
      markDoor(door, "broken", "故障");
      showToast("故障中…", "ng");
      bumpPlayer();
      updatePain();
    }
  }

  function bumpPlayer() {
    refs.player.classList.add("bumped");
    setTimeout(() => refs.player.classList.remove("bumped"), 300);
    // 少し弾く
    const direction = state.playerX < 50 ? -1 : 1;
    state.targetX = clamp(state.playerX + direction * 8, 5, 95);
  }

  function markDoor(door, truth, label) {
    door.dom.classList.add("knocked", truth);
    const sign = door.dom.querySelector(".stall-door-sign");
    if (sign) sign.textContent = label;
  }

  function floorReward(n) { return 10 + n * 2; }

  function showToast(text, type) {
    refs.toast.textContent = text;
    refs.toast.className = "stall-toast show " + type;
    void refs.toast.offsetWidth;
    refs.toast.classList.add("pop");
    clearTimeout(refs.toast._t);
    refs.toast._t = setTimeout(() => refs.toast.classList.remove("show", "pop"), 1100);
  }

  function updatePain() {
    refs.painFill.style.width = state.pain + "%";
    refs.painVal.textContent = Math.floor(state.pain) + "%";
    refs.painFill.classList.remove("warning", "critical");
    if (state.pain > 80)      refs.painFill.classList.add("critical");
    else if (state.pain > 55) refs.painFill.classList.add("warning");

    refs.emote.textContent = state.pain > 80 ? "😱"
                           : state.pain > 55 ? "😖"
                           : "💦";
  }

  // --- メインループ -------------------------------------------------------

  const game = loop((dt) => {
    if (!state.active) return;
    updatePlayer(dt);

    // 腹痛は時間で上昇
    if (!state.locked) {
      const rate = state.painRate + state.floor * 0.6;
      state.pain = clamp(state.pain + rate * dt, 0, 100);
      updatePain();
    }

    // NPC スポーン＆移動
    state.npcSpawnTimer -= dt;
    if (state.npcSpawnTimer <= 0 && state.npcs.length < 3 && !state.locked) {
      spawnNpc();
      state.npcSpawnTimer = Math.max(1.0, rand(1.4, 3.0) - state.floor * 0.15);
    }
    updateNpcs(dt);

    if (state.pain >= 100) { quit(true, "burst"); return; }
  });

  buildFloor();
  updatePain();

  function quit(forced, reason) {
    state.active = false;
    game.stop();

    let earned = 0;
    for (let i = 1; i <= state.cleared; i++) earned += floorReward(i);
    let coins = earned;
    const score = state.cleared * 200 + Math.max(0, 100 - Math.floor(state.pain)) * 2;

    let comment, msg;
    if (reason === "burst") {
      msg = `腹痛が限界に達し大惨事…（${state.cleared}フロア踏破）。`;
      comment = "佐藤部長「君、なぜ早退届に『不可抗力』と書いたんだね…？」";
      coins = Math.floor(coins / 2);
      earned = coins;
    } else if (state.cleared === 0) {
      msg = "1つも空き個室を見つけられず撤退。";
      comment = "佐藤部長「トイレで彷徨ってたのか？大丈夫か？」";
    } else if (state.cleared >= 8) {
      msg = `${state.cleared}フロア踏破！社内トイレ完全制覇。`;
      comment = "佐藤部長「君、社内のどのトイレが空いてるか完璧に把握してるな…？」";
    } else if (state.cleared >= 4) {
      msg = `${state.cleared}フロア踏破。空き個室ハンターの素質あり。`;
      comment = "佐藤部長「まあ、人間だからな。落ち着いて仕事に戻りなさい。」";
    } else {
      msg = `${state.cleared}フロア踏破で自主撤退。`;
      comment = "佐藤部長「無事で何より。戻ったら例の件、頼むよ。」";
    }

    finishGame(gameId, score, coins, msg, {
      isWin: true,
      allowances: [{ name: `空き個室発見 × ${state.cleared}`, value: earned }],
      deductions: [],
      bossComment: comment,
    });
  }

  return { dispose() {
    game.stop();
    window.removeEventListener("mousemove", moveDrag);
    window.removeEventListener("touchmove", moveDrag);
    window.removeEventListener("mouseup", endDrag);
    window.removeEventListener("touchend", endDrag);
  } };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
