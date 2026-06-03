// =========================================================================
// toilet.js — 個室争奪戦（俯瞰ビュー版）
// 上から見下ろしたトイレフロア。プレイヤーは小さなキャラ。
// 各占有ドアには中の人の進行段階（silent → paper → flush → exit）が
// アイコンで予兆表示される。流したドアの前で待てば空きを取れる。
// =========================================================================

import { el, clear, loop, clamp, pick, rand } from "../dom.js?v=1.2.2";
import { Router } from "../app.js?v=1.2.2";
import { finishGame } from "./result.js?v=1.2.2";
import { SVG_TOP_PLAYER, SVG_TOP_NPC_BOSS, SVG_TOP_NPC_OL } from "../art.js?v=1.2.2";

const NPC_SVGS = [SVG_TOP_NPC_BOSS, SVG_TOP_NPC_OL];

// 中の人の進行段階。各 stage は「中の人がこの状態である残り時間」を持つ
// silent: しーん…（まだまだ。残り長い）
// paper:  🧻 紙を使い始めた（あと少しで出る）
// flush:  🚽 流した！（数秒で空く）
// exit:   🚪 出てきた！（即取らないと他人に取られる）
// empty:  完全に空き
const STAGE_INFO = {
  silent: { icon: "",         label: "",          hint: "" },
  paper:  { icon: "🧻",       label: "ペーパー",  hint: "そろそろかも" },
  flush:  { icon: "🚽",       label: "流した！",  hint: "もうすぐ空く！" },
  exit:   { icon: "🚪",       label: "出てくる！", hint: "今だ！" },
  empty:  { icon: "✨",       label: "空き！",    hint: "" },
};

const DOOR_SLOTS = 5;

export function startToilet(mount, gameId) {
  const state = {
    active: true,
    pain: 22,
    painRate: 4.5,
    floor: 1,
    cleared: 0,
    locked: false,
    playerX: 50,
    targetX: 50,
    doors: [],
    npcs: [],
    npcSpawnTimer: rand(2.5, 4.5),
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

    el("div.stall-pain-bar", {}, [
      el("div.stall-pain-label", { text: "腹痛" }),
      el("div.stall-pain-track", {}, [
        el("div.stall-pain-fill#stall-pain", { style: { width: "22%" } })
      ]),
      el("div.stall-pain-val#stall-pain-val", { text: "22%" }),
    ]),

    el("div.stall-hint#stall-hint", { text: "🧻流した個室の前で待て！" }),

    // 俯瞰ステージ
    el("div.stall-stage.top-view#stall-stage", {}, [
      el("div.stall-corridor"),
      el("div.stall-door-row#stall-door-row"),
      el("div.stall-player#stall-player", {}, [
        el("div.stall-character", { html: SVG_TOP_PLAYER }),
        el("div.stall-emote#stall-emote", { text: "💦" }),
      ]),
      el("div.stall-npc-layer#stall-npc-layer"),
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

  // --- ドラッグ操作 -------------------------------------------------------

  let dragging = false;
  function getStageX(clientX) {
    const r = refs.stage.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * 100, 6, 94);
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

  function slotX(slot) { return 10 + slot * (80 / (DOOR_SLOTS - 1)); }

  function buildFloor() {
    const floor = state.floor;
    const brokenCount = floor >= 3 && Math.random() < 0.6 ? 1 : 0;
    const truths = [];
    for (let i = 0; i < brokenCount; i++) truths.push("broken");
    while (truths.length < DOOR_SLOTS) truths.push("occupied");
    shuffle(truths);

    clear(refs.doorRow);
    state.doors = truths.map((t, i) => {
      const x = slotX(i);
      const dom = el("div.stall-door.top-view", {
        style: { left: x + "%" },
        "data-slot": i,
      }, [
        el("div.stall-door-frame"),
        el("div.stall-door-num", { text: String(i + 1) }),
        el("div.stall-sound-indicator", {}, [
          el("div.stall-sound-icon", { text: "" }),
          el("div.stall-sound-label", { text: "" }),
        ]),
        el("div.stall-door-sign", { text: "" }),
      ]);
      refs.doorRow.appendChild(dom);

      // 各 occupied ドアに進行段階＆残り時間を割り当てる
      let stage, stageTime;
      if (t === "broken") {
        stage = "broken";
        stageTime = 9999;
      } else {
        // 初期段階：silent / paper / flush をランダム配分
        const r = Math.random();
        if      (r < 0.5)  { stage = "silent"; stageTime = rand(4, 10); }
        else if (r < 0.85) { stage = "paper";  stageTime = rand(3, 6);  }
        else               { stage = "flush";  stageTime = rand(1.5, 3.5); }
      }
      return { slot: i, x, truth: t, stage, stageTime, dom, knockedDead: false };
    });

    refs.floor.textContent = `${floor + 2}F トイレ`;
    refs.hint.textContent = "🧻使用中→🚽流した→🚪空く の流れを観察";

    state.npcs.forEach(n => n.dom.remove());
    state.npcs = [];
    state.npcSpawnTimer = rand(2.0, 4.0);

    // 全ドアの予兆表示初期化
    state.doors.forEach((d) => paintDoor(d));
  }

  function paintDoor(door) {
    const sign = door.dom.querySelector(".stall-door-sign");
    const iconEl = door.dom.querySelector(".stall-sound-icon");
    const labelEl = door.dom.querySelector(".stall-sound-label");
    const info = STAGE_INFO[door.stage] || STAGE_INFO.silent;

    iconEl.textContent = info.icon;
    labelEl.textContent = info.label;

    // ドアの見た目
    door.dom.classList.remove("stage-silent", "stage-paper", "stage-flush", "stage-exit", "stage-empty", "stage-broken");
    door.dom.classList.add("stage-" + door.stage);

    if (door.stage === "broken") {
      sign.textContent = "故障";
    } else if (door.stage === "empty") {
      sign.textContent = "空き！";
    } else {
      sign.textContent = "";
    }
  }

  // --- ドアの段階遷移 -----------------------------------------------------

  function tickDoor(door, dt) {
    if (door.truth === "broken") return;
    if (door.stage === "empty") return;

    door.stageTime -= dt;
    if (door.stageTime > 0) return;

    // 段階遷移
    if (door.stage === "silent") {
      door.stage = "paper";
      door.stageTime = rand(2.5, 5.0);
      paintDoor(door);
    } else if (door.stage === "paper") {
      door.stage = "flush";
      door.stageTime = rand(1.5, 3.0);
      paintDoor(door);
    } else if (door.stage === "flush") {
      door.stage = "exit";
      door.stageTime = rand(1.8, 2.8);  // 「出てくる」が表示される時間
      paintDoor(door);
    } else if (door.stage === "exit") {
      door.stage = "empty";
      door.stageTime = 9999;
      paintDoor(door);
    }
  }

  // --- プレイヤー判定 -----------------------------------------------------

  function updatePlayer(dt) {
    const dx = state.targetX - state.playerX;
    state.playerX += dx * 0.55 * Math.min(1, dt * 8);
    refs.player.style.left = state.playerX + "%";

    if (state.locked) return;

    // 一番近いドアを判定
    let nearest = null;
    let bestDist = 999;
    for (const d of state.doors) {
      const dist = Math.abs(d.x - state.playerX);
      if (dist < bestDist) { bestDist = dist; nearest = d; }
    }
    if (!nearest || bestDist > 4.5) return;
    // 触れた = empty なら入室
    if (nearest.stage === "empty") {
      enterStall(nearest);
    }
  }

  function enterStall(door) {
    state.locked = true;
    state.cleared++;
    state.floor++;
    state.pain = clamp(state.pain - 22, 0, 100);
    refs.cleared.textContent = `踏破 ${state.cleared}`;
    door.dom.classList.add("entering");
    refs.player.classList.add("entering");
    showToast("入れた…！ +" + floorReward(state.cleared) + "円", "ok");
    updatePain();
    setTimeout(() => {
      refs.player.classList.remove("entering");
      state.locked = false;
      buildFloor();
    }, 850);
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
    refs.emote.textContent = state.pain > 80 ? "😱" : state.pain > 55 ? "😖" : "💦";
  }

  // --- NPC 管理 -----------------------------------------------------------

  function spawnNpc() {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -8 : 108;
    // NPC は「今 flush している、または exit しているドア」を優先的に狙う
    let targetSlot = -1;
    const candidates = state.doors
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.stage === "flush" || d.stage === "exit" || d.stage === "empty");
    if (candidates.length > 0) {
      targetSlot = pick(candidates).i;
    } else {
      targetSlot = (Math.random() * DOOR_SLOTS) | 0;
    }
    const dom = el("div.stall-npc.top-view", {
      style: { left: x + "%" },
    }, [
      el("div.stall-character", { html: pick(NPC_SVGS) }),
    ]);
    refs.npcLayer.appendChild(dom);
    state.npcs.push({
      x, vx: fromLeft ? 8 : -8, targetSlot, dom,
      tried: false, cooldown: 0, exiting: false,
    });
  }

  function updateNpcs(dt) {
    for (const n of state.npcs.slice()) {
      if (n.exiting) {
        n.x += (n.vx < 0 ? -1 : 1) * 22 * dt;
        n.dom.style.left = n.x + "%";
        if (n.x < -12 || n.x > 112) {
          n.dom.remove();
          state.npcs.splice(state.npcs.indexOf(n), 1);
        }
        continue;
      }

      const tx = slotX(n.targetSlot);
      const dx = tx - n.x;
      const speed = 16 + state.floor * 0.6;
      if (Math.abs(dx) > 1.5) {
        n.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        n.dom.style.left = n.x + "%";
      } else if (!n.tried) {
        n.tried = true;
        const door = state.doors[n.targetSlot];
        if (door && door.stage === "empty") {
          // 取られた！
          door.stage = "occupied-by-npc";
          paintDoor(door);
          door.dom.classList.add("npc-took");
          showToast("先に取られた…！", "ng");
          state.pain = clamp(state.pain + 5, 0, 100);
          updatePain();
        } else {
          showToast("（NPCも待ち中）", "ng");
        }
        n.cooldown = 0.8;
      } else {
        n.cooldown -= dt;
        if (n.cooldown <= 0) n.exiting = true;
      }
    }
  }

  // --- メインループ -------------------------------------------------------

  const game = loop((dt) => {
    if (!state.active) return;
    updatePlayer(dt);

    if (!state.locked) {
      const rate = state.painRate + state.floor * 0.55;
      state.pain = clamp(state.pain + rate * dt, 0, 100);
      updatePain();

      // 全ドアの進行
      for (const d of state.doors) tickDoor(d, dt);
    }

    state.npcSpawnTimer -= dt;
    if (state.npcSpawnTimer <= 0 && state.npcs.length < 2 && !state.locked) {
      spawnNpc();
      state.npcSpawnTimer = Math.max(1.5, rand(2.5, 4.5) - state.floor * 0.18);
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
