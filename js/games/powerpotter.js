// =========================================================================
// powerpotter.js — パワーポッター（PowerPoint 作業シミュレーター）
// 仕様：上司の指示に従ってスライド要素を実際に編集する。
//      指示は矛盾・抽象化・突発リセットを含み、「終わらない」を体験させる。
//      要素を選択 → プロパティパネルで色/サイズ/太字 を変更 → 指示と一致で反映済み。
//      上司は満足しても次の指示を出す。耐えた件数で給料が決まる。
// =========================================================================

import { el, clear, loop, clamp, pick, rand, toast } from "../dom.js";
import { Router } from "../app.js";
import { ICONS } from "./icons.js";
import { generateBossSVG } from "../art.js";
import { finishGame } from "./result.js";

// --- 編集対象要素の初期状態 ------------------------------------------------
const INITIAL = {
  title: { color: "black", size: "M",  bold: true,  text: "Q3 売上分析" },
  logo:  { color: "red",   size: "M",  bold: false, text: "LOGO" },
  chart: { color: "blue",  size: "M",  bold: false, text: "棒グラフ" },
};

const ELEMENT_LABELS = { title: "タイトル", logo: "ロゴ", chart: "グラフ" };
// 色覚バリアフリー（CUD / Wong 2011）— 第一/第二色覚異常でも区別しやすい6色
const COLORS = {
  black:  "#1a1a1a",
  red:    "#D55E00",   // 朱（バーミリオン）
  blue:   "#0072B2",   // 純青
  green:  "#009E73",   // 青緑
  pink:   "#CC79A7",   // 紫赤（旧紫の置換／青と混同しない）
  orange: "#E69F00",   // 橙黄
};
const COLOR_LABELS = {
  black:  "黒",
  red:    "赤",
  blue:   "青",
  green:  "緑",
  pink:   "ピンク",
  orange: "橙",
};
const SIZE_PX = { S: 14, M: 22, L: 32, XL: 44 };

// --- 上司の指示テンプレ ----------------------------------------------------
// 具体的指示：{kind:"set", target, prop, value, text}
// 抽象指示：{kind:"vague", text, accepts}   accepts = (state, history) => bool
// リセット指示：{kind:"reset", text}
// 全部リセット完遂指示：{kind:"chaos", text}
const RUDE_OPENERS = ["お疲れさま、", "ちょっといい？", "悪いんだけど、", "急ぎで、", "やっぱさ、", "あのさ、"];

function rudeText(body) { return pick(RUDE_OPENERS) + body; }

// --- ゲーム本体 ------------------------------------------------------------

export function startPowerPotter(mount, gameId) {
  const screen = el("div.ppt");
  buildShell(screen);
  mount(screen);

  // 状態
  const state = {
    elements: deepCopy(INITIAL),
    selected: "title",
    completed: 0,           // 完遂した指示数
    pendingTime: 0,          // 現在指示への経過時間
    instruction: null,       // 現在の指示
    elapsed: 0,              // 勤務時間（秒）
    boss: { mood: 75 },      // 上司の機嫌（高いほど良い）。0で強制退社
    history: [],
    lastHintAt: 0,           // ヒント連発防止
    naturalDecay: 0.45,      // 機嫌の自然減少 /秒
  };

  // UI 参照
  const refs = {
    slide: screen.querySelector(".pp-slide"),
    titleEl: screen.querySelector("#el-title"),
    logoEl: screen.querySelector("#el-logo"),
    chartEl: screen.querySelector("#el-chart"),
    panel: screen.querySelector("#pp-props"),
    bubble: screen.querySelector("#pp-bubble"),
    bubbleStatus: screen.querySelector("#pp-bubble-status"),
    bossFace: screen.querySelector("#pp-bossface"),
    urgencyFill: screen.querySelector("#pp-urgency"),
    deadline: screen.querySelector("#pp-dl"),
    moodFill: screen.querySelector("#pp-mood"),
    moodText: screen.querySelector("#pp-mood-text"),
    completedText: screen.querySelector("#pp-done"),
  };

  // 要素クリックで選択
  for (const id of ["title", "logo", "chart"]) {
    const node = screen.querySelector(`#el-${id}`);
    node.addEventListener("click", (e) => { e.stopPropagation(); selectElement(id); });
  }
  // スライド余白で選択解除
  refs.slide.addEventListener("click", () => selectElement(null));

  // 退勤ボタン
  screen.querySelector("#pp-quit").addEventListener("click", () => quit(false));

  function selectElement(id) {
    state.selected = id;
    renderSelection();
    renderPanel();
  }

  function renderSelection() {
    for (const k of ["title", "logo", "chart"]) {
      const n = screen.querySelector(`#el-${k}`);
      n.classList.toggle("sel", state.selected === k);
    }
  }

  function applyElementStyles() {
    for (const id of ["title", "logo", "chart"]) {
      const e = state.elements[id];
      const node = screen.querySelector(`#el-${id} .etext`);
      node.style.color = COLORS[e.color];
      node.style.fontSize = SIZE_PX[e.size] + "px";
      node.style.fontWeight = e.bold ? "900" : "500";
      if (id === "logo") {
        const ring = screen.querySelector(`#el-${id} .ering`);
        ring.style.borderColor = COLORS[e.color];
        const dia = 72 + (["S","M","L","XL"].indexOf(e.size)) * 24;
        ring.style.width = ring.style.height = dia + "px";
      }
      if (id === "chart") {
        const bars = screen.querySelectorAll(`#el-${id} .ebar`);
        bars.forEach((b, i) => {
          b.style.background = i % 2 === 0 ? COLORS[e.color] : "#5b9bd5";
        });
      }
    }
  }

  // 単一エントリポイント：要素プロパティ変更
  function setProp(elementId, prop, newVal) {
    const e = state.elements[elementId];
    const oldVal = e[prop];
    if (oldVal === newVal) return;
    e[prop] = newVal;
    applyElementStyles();
    renderPanel();     // 選択中のボタンハイライトを更新
    evaluateChange(elementId, prop, oldVal, newVal);
  }

  // 変更後の評価：完遂 or 具体ヒント
  function evaluateChange(targetId, prop, oldVal, newVal) {
    const ins = state.instruction;
    if (!ins) return;

    // 1. 完遂判定
    let complete = false;
    if (ins.kind === "set") {
      complete = state.elements[ins.target][ins.prop] === ins.value;
    } else if (ins.kind === "vague") {
      complete = ins.accepts(state, ins.snapshot);
    }
    if (complete) { completeInstruction(); return; }

    // 2. 完遂しなかった → 具体的に訂正してくる
    detectMistake(ins, targetId, prop, oldVal, newVal);
  }

  function detectMistake(ins, targetId, prop, oldVal, newVal) {
    const now = performance.now();
    if (now - state.lastHintAt < 700) return;  // 連発防止
    state.lastHintAt = now;

    const propLabel = (p) => p === "color" ? "色" : p === "size" ? "サイズ" : "太字";
    let hint = null;
    let penalty = 0;

    if (ins.kind === "set") {
      if (targetId !== ins.target) {
        hint = `いやいや、${ELEMENT_LABELS[ins.target]}って言ったよね？${ELEMENT_LABELS[targetId]}じゃなくて。`;
        penalty = 5;
      } else if (prop !== ins.prop) {
        hint = `${ELEMENT_LABELS[ins.target]}の${propLabel(ins.prop)}を変えてって言ったでしょ。`;
        penalty = 4;
      } else {
        // target/prop は一致、value が違う → 「それじゃない」
        if (ins.prop === "color") {
          hint = `「${COLOR_LABELS[ins.value]}」って言ったの聞いてた？`;
        } else if (ins.prop === "size") {
          const arr = ["S","M","L","XL"];
          const direction = arr.indexOf(ins.value) > arr.indexOf(newVal) ? "もうちょっと大きく" : "もうちょっと小さく";
          hint = `${direction}って言ったよ？`;
        } else {
          hint = ins.value ? "太字にしてって言ったでしょ…" : "太字外してって言ったよ。";
        }
        penalty = 3;
      }
    // vague は何でも受け入れるのでヒントなし

    if (hint) {
      showHint(hint);
      state.boss.mood = clamp(state.boss.mood - penalty, 0, 100);
    }
  }

  function showHint(text) {
    refs.bubbleStatus.textContent = text;
    refs.bubbleStatus.className = "pp-bubble-status ng";
    // 顔と吹き出しを一瞬揺らす
    refs.bubble.parentElement.classList.remove("shake");
    void refs.bubble.parentElement.offsetWidth;
    refs.bubble.parentElement.classList.add("shake");
  }

  function renderPanel() {
    clear(refs.panel);
    if (!state.selected) {
      refs.panel.appendChild(el("div.pp-empty", {}, [
        el("div", { text: "要素を選択してください" }),
        el("div.cap", { text: "タイトル / ロゴ / グラフ" }),
      ]));
      return;
    }
    const id = state.selected;
    const e = state.elements[id];
    refs.panel.appendChild(el("div.pp-pheader", {}, [
      el("span.pp-ptag", { text: ELEMENT_LABELS[id] }),
      el("span.pp-pname", { text: e.text }),
    ]));
    // 色
    refs.panel.appendChild(el("div.pp-prow", {}, [
      el("div.pp-plabel", { text: "塗りつぶしの色" }),
      el("div.pp-pswatches", {}, Object.keys(COLORS).map((c) =>
        el("button.pp-swatch", {
          class: c === e.color ? "pp-swatch sel" : "pp-swatch",
          style: { background: COLORS[c] },
          title: COLOR_LABELS[c],
          onclick: () => setProp(id, "color", c),
        })
      )),
    ]));
    // サイズ
    refs.panel.appendChild(el("div.pp-prow", {}, [
      el("div.pp-plabel", { text: "サイズ" }),
      el("div.pp-pbtns", {}, ["S","M","L","XL"].map((s) =>
        el("button.pp-szbtn", {
          class: s === e.size ? "pp-szbtn sel" : "pp-szbtn",
          text: s,
          onclick: () => setProp(id, "size", s),
        })
      )),
    ]));
    // 太字
    refs.panel.appendChild(el("div.pp-prow", {}, [
      el("div.pp-plabel", { text: "スタイル" }),
      el("div.pp-pbtns", {}, [
        el("button.pp-szbtn", {
          class: e.bold ? "pp-szbtn sel" : "pp-szbtn",
          text: "太字 B",
          onclick: () => setProp(id, "bold", !e.bold),
        }),
      ]),
    ]));
  }

  // --- 上司の指示生成 ------------------------------------------------------

  function nextInstruction() {
    const roll = Math.random();
    let ins;
    // 抽象指示は控えめ（具体指示中心、矛盾＝直前と逆もよくある）
    if (state.completed >= 2 && roll < 0.22) {
      ins = makeVagueInstruction();
    } else if (state.completed >= 2 && roll < 0.5) {
      ins = makeContradictionInstruction();
    } else {
      ins = makeConcreteInstruction();
    }
    state.instruction = ins;
    state.pendingTime = 0;
    // 各指示の応答制限時間：完遂数が増えるほど短くなる（22→8秒）
    state.instructionLimit = Math.max(8, 22 - state.completed * 0.7);
    addChat(ins);
  }

  function makeConcreteInstruction() {
    const target = pick(["title", "logo", "chart"]);
    const prop = pick(["color", "size", "bold"]);
    const cur = state.elements[target][prop];
    let value, text;
    if (prop === "color") {
      const choices = Object.keys(COLORS).filter((c) => c !== cur);
      value = pick(choices);
      const verbs = ["にして", "に変えて", "にできる？"];
      text = `${ELEMENT_LABELS[target]}を${COLOR_LABELS[value]}${pick(verbs)}`;
    } else if (prop === "size") {
      const bigger = ["M","L","XL"].includes(cur) ? Math.random() < 0.5 : true;
      const arr = ["S","M","L","XL"];
      value = bigger
        ? arr[clamp(arr.indexOf(cur) + 1, 0, 3)]
        : arr[clamp(arr.indexOf(cur) - 1, 0, 3)];
      if (value === cur) value = bigger ? "XL" : "S";
      text = `${ELEMENT_LABELS[target]}${bigger ? "もう少し大きく" : "もうちょい小さく"}して`;
    } else {
      value = !cur;
      text = value
        ? `${ELEMENT_LABELS[target]}を太字にしてくれる？`
        : `${ELEMENT_LABELS[target]}の太字外して、印象強すぎる`;
    }
    return { kind: "set", target, prop, value, text: rudeText(text) };
  }

  function makeContradictionInstruction() {
    // 履歴から最後の具体指示を取り、逆を作る
    const last = [...state.history].reverse().find((h) => h.kind === "set");
    if (!last) return makeConcreteInstruction();
    const { target, prop } = last;
    let value, text;
    if (prop === "color") {
      value = pick(Object.keys(COLORS).filter((c) => c !== state.elements[target][prop]));
      text = `ごめん、やっぱ${ELEMENT_LABELS[target]}は${COLOR_LABELS[value]}のほうがいいかも`;
    } else if (prop === "size") {
      const arr = ["S","M","L","XL"];
      const cur = state.elements[target][prop];
      value = arr[(arr.indexOf(cur) + 2) % 4];
      text = `${ELEMENT_LABELS[target]}、やっぱ${arr.indexOf(value) > arr.indexOf(cur) ? "大きく" : "小さく"}した方がよくない？`;
    } else {
      value = !state.elements[target][prop];
      text = value ? `やっぱ${ELEMENT_LABELS[target]}太字で` : `太字やめて、ダサい`;
    }
    return { kind: "set", target, prop, value, text: rudeText(text) };
  }

  function makeVagueInstruction() {
    const variants = [
      { text: "なんかこのスライド、刺さらないんだよなあ。直しといて。", accepts: (s, prev) => anyChange(s, prev) },
      { text: "全体的にイケてない。なんとかして。", accepts: (s, prev) => anyChange(s, prev) },
      { text: "もっと目を引く感じにできる？", accepts: (s, prev) => {
          return ["title","logo","chart"].some((id) => SIZE_PX[s.elements[id].size] > SIZE_PX[prev[id].size])
              || ["title","logo","chart"].some((id) => s.elements[id].bold && !prev[id].bold);
        } },
      { text: "落ち着いた感じに寄せてほしいかな。", accepts: (s, prev) => {
          return ["title","logo","chart"].some((id) => SIZE_PX[s.elements[id].size] < SIZE_PX[prev[id].size])
              || ["title","logo","chart"].some((id) => !s.elements[id].bold && prev[id].bold);
        } },
      { text: "色味、もうちょい考えて。", accepts: (s, prev) => {
          return ["title","logo","chart"].some((id) => s.elements[id].color !== prev[id].color);
        } },
    ];
    const v = pick(variants);
    return { kind: "vague", text: rudeText(v.text), accepts: v.accepts, snapshot: deepCopy(state.elements) };
  }

  function anyChange(s, prev) {
    return ["title","logo","chart"].some((id) =>
      s.elements[id].color !== prev[id].color
      || s.elements[id].size !== prev[id].size
      || s.elements[id].bold !== prev[id].bold);
  }

  function checkInstruction() {
    const ins = state.instruction;
    if (!ins) return;
    let ok = false;
    if (ins.kind === "set") {
      ok = state.elements[ins.target][ins.prop] === ins.value;
    } else if (ins.kind === "vague") {
      ok = ins.accepts(state, ins.snapshot);
    } else if (ins.kind === "chaos") {
      ok = ["title","logo","chart"].every((id) =>
        state.elements[id].color === ins.target[id].color
        && state.elements[id].size === ins.target[id].size
        && state.elements[id].bold === ins.target[id].bold);
    }
    if (ok) completeInstruction();
  }

  function completeInstruction() {
    state.completed += 1;
    state.boss.mood = clamp(state.boss.mood + 8, 0, 100);
    state.history.push(state.instruction);
    markChatDone();
    state.instruction = null;
    refs.completedText.textContent = `完遂 ${state.completed}`;
    flashApproved();
    // 少し待ってから次（上司は0.8〜1.8秒で次を投げる）
    state.nextDelay = rand(0.8, 1.8);
  }

  function flashApproved() {
    const pop = el("div.pp-pop", { text: "✓ 反映済み", style: { color: "var(--ok)" } });
    pop.style.left = "50%"; pop.style.top = "50%";
    pop.style.transform = "translate(-50%,-50%) scale(.5)";
    refs.slide.appendChild(pop);
    requestAnimationFrame(() => {
      pop.style.transition = "transform .35s cubic-bezier(.2,1.6,.4,1), opacity .8s ease";
      pop.style.transform = "translate(-50%,-50%) scale(1)";
      setTimeout(() => { pop.style.opacity = "0"; }, 400);
      setTimeout(() => pop.remove(), 1000);
    });
  }

  function setBubble(text, statusText = "") {
    refs.bubble.textContent = text;
    refs.bubbleStatus.textContent = statusText;
    refs.bubbleStatus.className = "pp-bubble-status";
    refs.bubble.parentElement.classList.remove("hide");
    // 再アニメーション
    refs.bubble.parentElement.classList.remove("pop");
    void refs.bubble.parentElement.offsetWidth;
    refs.bubble.parentElement.classList.add("pop");
  }

  function addChat(ins) {
    setBubble(ins.text, "");
  }

  function markChatDone() {
    refs.bubbleStatus.textContent = "✓ 反映済み";
    refs.bubbleStatus.classList.add("ok");
  }

  function markChatTimeout() {
    refs.bubbleStatus.textContent = "…で？（未対応で流された）";
    refs.bubbleStatus.classList.add("ng");
  }

  function setBossFace(mood) {
    // mood: 0..100 で表情SVGを差し替え
    const m = mood < 30 ? "rage" : mood < 60 ? "irritated" : mood < 85 ? "normal" : "happy";
    if (refs.bossFace.dataset.mood !== m) {
      refs.bossFace.dataset.mood = m;
      refs.bossFace.innerHTML = generateBossSVG(m);
    }
  }

  // --- メインループ --------------------------------------------------------

  let started = false;
  state.nextDelay = 1.5;

  const game = loop((dt) => {
    state.elapsed += dt;
    // 経過時間表示（10 PM DEADLINE の代わりに経過分秒）
    const m = Math.floor(state.elapsed / 60);
    const s = Math.floor(state.elapsed % 60);
    refs.deadline.textContent = `勤務 ${m}:${String(s).padStart(2,"0")}`;

    // 機嫌の自然減衰（時間が経つほど少しずつ減る）
    const decay = state.naturalDecay + state.elapsed * 0.001;  // 徐々に厳しくなる
    state.boss.mood = clamp(state.boss.mood - decay * dt, 0, 100);

    if (!state.instruction) {
      state.nextDelay -= dt;
      if (state.nextDelay <= 0) { started = true; nextInstruction(); }
    } else {
      // 応答制限時間：完遂数で短くなる（22→8秒）
      state.pendingTime += dt;
      const remain = state.instructionLimit - state.pendingTime;
      // 残り時間バーを更新
      if (refs.urgencyFill) {
        const pct = clamp((remain / state.instructionLimit) * 100, 0, 100);
        refs.urgencyFill.style.width = pct + "%";
        refs.urgencyFill.style.background = remain < 3 ? "var(--danger)"
          : remain < 6 ? "var(--warn)" : "var(--info)";
      }
      if (remain <= 0) {
        markChatTimeout();
        state.boss.mood = clamp(state.boss.mood - 18, 0, 100);
        state.instruction = null;
        state.nextDelay = rand(0.4, 1.0);
        if (refs.urgencyFill) refs.urgencyFill.style.width = "0%";
      }
    }

    // 機嫌バー＆おじさん表情
    refs.moodFill.style.width = state.boss.mood + "%";
    refs.moodFill.style.background = state.boss.mood < 30 ? "var(--danger)"
      : state.boss.mood < 60 ? "var(--warn)" : "var(--ok)";
    refs.moodText.textContent = state.boss.mood < 30 ? "上司：激怒"
      : state.boss.mood < 60 ? "上司：イライラ"
      : state.boss.mood < 85 ? "上司：普通"
      : "上司：満足";
    setBossFace(state.boss.mood);

    // 機嫌0で強制退社（クビ／出禁）
    if (state.boss.mood <= 0) { quit(true, "fired"); return; }
  });

  applyElementStyles();
  renderSelection();
  renderPanel();
  refs.bossFace.innerHTML = generateBossSVG("normal");
  refs.bossFace.dataset.mood = "normal";

  function quit(forced, reason) {
    game.stop();
    // 給料: 完遂数×18 + 残機嫌÷2（forced=機嫌0の場合はボーナス無し）
    const moodBonus = forced ? 0 : Math.floor(state.boss.mood / 2);
    const coins = Math.max(0, state.completed * 18 + moodBonus);
    const score = state.completed * 100 + Math.floor(state.boss.mood);
    const mins = Math.floor(state.elapsed / 60);
    const secs = Math.floor(state.elapsed % 60);
    const elapsedStr = `${mins}分${secs}秒`;

    let msg;
    if (reason === "fired") {
      msg = `上司の機嫌が切れ、激怒退社（${elapsedStr}）。\n${state.completed}件の理不尽指示に耐えました。`;
    } else if (state.completed === 0) {
      msg = `1件も完遂できずに退勤（${elapsedStr}）。給料はわずかです。`;
    } else {
      msg = `${state.completed}件の理不尽指示に耐えて自主退勤（${elapsedStr}）。`;
    }
    finishGame(gameId, score, coins, msg);
  }

  return { dispose() { game.stop(); } };
}

// =========================================================================
// UI 構築
// =========================================================================

function buildShell(root) {
  root.appendChild(titleBar());
  root.appendChild(tabStrip());
  root.appendChild(ribbon());

  // 上部：締切バー（ファイル名横に表示でなく、リボン直下のサブバーに）
  root.appendChild(subBar());

  // 本体（ワークスペース＋右プロパティ）— サムネパネルは廃止し、スライドを最大化
  const main = el("div.pp-main");
  main.appendChild(workspace());
  main.appendChild(rightPanel());
  root.appendChild(main);

  // 下部：上司（おじさん）＋吹き出し
  root.appendChild(bossPanel());

  // 最下部：ステータスバー
  root.appendChild(statusBar());
}

function titleBar() {
  return el("div.pp-titlebar", {}, [
    el("div.pp-qat", {}, [
      el("div.qicon", { html: ICONS.save() }),
      el("div.qicon", { html: ICONS.undo() }),
      el("div.qicon", { html: ICONS.redo() }),
    ]),
    el("div.pp-filename", { text: "Q3売上_最終_v8_本当に最終.pptx · PowerPotter" }),
    el("div.pp-winbtns", {}, [
      el("span", { text: "—" }),
      el("span", { text: "▢" }),
      el("span.close", { text: "✕" }),
    ]),
  ]);
}

function tabStrip() {
  const tabs = ["ホーム", "挿入", "描画", "デザイン", "画面切り替え", "アニメーション", "校閲", "表示"];
  return el("div.pp-tabs", {}, [
    el("div.pp-tab.file", { text: "ファイル" }),
    ...tabs.map((t, i) => el("div", { class: "pp-tab" + (i === 0 ? " active" : ""), text: t })),
  ]);
}

function ribbon() {
  function cmd(label, html) {
    return el("button.pp-cmd", {}, [
      el("div.glyph", { html }),
      el("div.clabel", { text: label }),
    ]);
  }
  return el("div.pp-ribbon", {}, [
    el("div.pp-group", {}, [
      el("div.cmds", {}, [cmd("貼り付け", ICONS.paste()), cmd("コピー", ICONS.copy())]),
      el("div.glabel", { text: "クリップボード" }),
    ]),
    el("div.pp-sep"),
    el("div.pp-group", {}, [
      el("div.cmds", {}, [cmd("新しい\nスライド", ICONS.newSlide())]),
      el("div.glabel", { text: "スライド" }),
    ]),
    el("div.pp-sep"),
    el("div.pp-group", {}, [
      el("div.cmds", {}, [cmd("テキスト", ICONS.textbox()), cmd("画像", ICONS.image()), cmd("グラフ", ICONS.chart())]),
      el("div.glabel", { text: "挿入" }),
    ]),
    el("div.pp-sep"),
    el("div.pp-group", {}, [
      el("div.cmds", {}, [cmd("図形", ICONS.shape()), cmd("配置", ICONS.align())]),
      el("div.glabel", { text: "図形描画" }),
    ]),
  ]);
}

function subBar() {
  return el("div.pp-subbar", {}, [
    el("button.pp-back", { text: "← メニュー", onclick: () => Router.menu() }),
    el("div.pp-deadline-pill", {}, [
      el("span", { text: "勤務" }),
      el("span.dt#pp-dl", { text: "0:00" }),
    ]),
    el("div.pp-mood-wrap", {}, [
      el("div.pp-mood-label", {}, [
        el("span#pp-mood-text", { text: "上司：普通" }),
        el("span.pp-done#pp-done", { text: "完遂 0" }),
      ]),
      el("div.pp-mood-track", {}, [el("div.pp-mood-fill#pp-mood")]),
    ]),
    el("button.pp-quit#pp-quit", { text: "退勤" }),
  ]);
}

function bossPanel() {
  return el("div.pp-bosspanel", {}, [
    el("div.pp-bossface#pp-bossface", { "data-mood": "normal" }),
    el("div.pp-bubble-wrap", {}, [
      el("div.pp-bubble-name", { text: "佐藤部長" }),
      el("div.pp-bubble#pp-bubble", { text: "（指示が来るまでスライドを眺めている……）" }),
      el("div.pp-bubble-status#pp-bubble-status", { text: "" }),
      el("div.pp-urgency-track", {}, [el("div.pp-urgency-fill#pp-urgency")]),
    ]),
  ]);
}

function workspace() {
  const ws = el("div.pp-workspace", {});
  // スライドはコンテナで中央配置
  const slide = el("div.pp-slide", {}, [
    el("div.stitle.pp-element#el-title", {}, [el("div.etext", { text: "Q3 売上分析" })]),
    el("div.sunder"),
    el("div.pp-canvas", {}, [
      // ロゴ
      el("div.pp-element.pp-logo#el-logo", {}, [
        el("div.ering"),
        el("div.etext", { text: "LOGO" }),
      ]),
      // グラフ
      el("div.pp-element.pp-chart#el-chart", {}, [
        el("div.echart-bars", {}, [
          el("div.ebar", { style: { height: "55%" } }),
          el("div.ebar", { style: { height: "80%" } }),
          el("div.ebar", { style: { height: "40%" } }),
          el("div.ebar", { style: { height: "95%" } }),
        ]),
        el("div.etext", { text: "Q3 推移" }),
      ]),
    ]),
  ]);
  ws.appendChild(slide);
  return ws;
}

function rightPanel() {
  return el("div.pp-rightpanel", {}, [
    el("div.pp-rphead", { text: "図形の書式設定" }),
    el("div.pp-props#pp-props"),
  ]);
}

function statusBar() {
  return el("div.pp-statusbar", {}, [
    el("span", { text: "スライド 8/8" }),
    el("span", { text: "日本語" }),
    el("span.review", { text: "校閲: 進行中" }),
    el("span.sb-spacer"),
    el("span", { text: "ノート" }),
    el("span", { text: "－" }),
    el("div.sb-zoom"),
    el("span", { text: "＋" }),
    el("span", { text: "100%" }),
  ]);
}

function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
