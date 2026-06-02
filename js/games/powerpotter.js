// =========================================================================
// powerpotter.js — パワーポッター（PowerPoint 作業シミュレーター）
// 仕様：上司の指示に従ってスライド要素を実際に編集する。
//      指示は矛盾・抽象化・突発リセットを含み、「終わらない」を体験させる。
//      要素を選択 → プロパティパネルで色/サイズ/太字 を変更 → 指示と一致で反映済み。
//      上司は満足しても次の指示を出す。耐えた件数で給料が決まる。
// =========================================================================

import { el, clear, loop, clamp, pick, rand, toast } from "../dom.js?v=1.1.9";
import { Router } from "../app.js?v=1.1.9";
import { ICONS } from "./icons.js?v=1.1.9";
import { generateBossSVG } from "../art.js?v=1.1.9";
import { finishGame } from "./result.js?v=1.1.9";

// --- 編集対象要素の初期状態 ------------------------------------------------
const INITIAL = {
  title: { color: "black", size: "M",  bold: true,  italic: false, underline: false, font: "gothic", text: "Q3 売上分析" },
  logo:  { color: "red",   size: "M",  bold: false, italic: false, underline: false, font: "gothic", text: "LOGO" },
  chart: { color: "blue",  size: "M",  bold: false, italic: false, underline: false, font: "gothic", chartType: "bar", heights: ["55%", "80%", "40%", "95%"], text: "棒グラフ" },
};

const ELEMENT_LABELS = { title: "タイトル", logo: "ロゴ", chart: "グラフ" };
// 色覚バリアフリー（CUD / Wong 2011）— 第一/第二色覚異常でも区別しやすい6色
const COLORS = {
  black:  "#1a1a1a",
  red:    "#D55E00",   // 朱
  blue:   "#0072B2",   // 青
  green:  "#009E73",   // 緑
};
const COLOR_LABELS = {
  black:  "黒",
  red:    "赤",
  blue:   "青",
  green:  "緑",
};
const SIZE_PX = { S: 14, M: 22, L: 32 };

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
    slideNumber: 1,          // 現在のスライド番号
  };

  // UI 参照
  const refs = {
    slide: screen.querySelector(".pp-slide"),
    workspace: screen.querySelector(".pp-workspace"),
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
    slideNumText: screen.querySelector("#pp-slidenum"),
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
      node.style.fontStyle = e.italic ? "italic" : "normal";
      node.style.textDecoration = e.underline ? "underline" : "none";

      const FONTS = {
        gothic: "var(--font-jp)",
        mincho: '"Yu Mincho", "MS Mincho", serif',
        pop: '"HG創英角ﾎﾟｯﾌﾟ体", "HGS創英角ﾎﾟｯﾌﾟ体", "HG創英角ポップ体", "HGS創英角ポップ体", "Comic Sans MS", sans-serif',
      };
      node.style.fontFamily = FONTS[e.font] || FONTS.gothic;

      if (id === "logo") {
        const ring = screen.querySelector(`#el-${id} .ering`);
        ring.style.borderColor = COLORS[e.color];
        const dia = 50 + (["S","M","L"].indexOf(e.size)) * 20;
        ring.style.width = ring.style.height = dia + "px";
      }
      if (id === "chart") {
        const area = screen.querySelector(`#el-${id} .echart-area`);
        if (area) {
          clear(area);
          const heights = e.heights || ["55%", "80%", "40%", "95%"];
          const chartType = e.chartType || "bar";
          const primaryColor = COLORS[e.color];

          // Set the height of the chart area based on size
          const hMap = { S: 50, M: 80, L: 110 };
          const chartHeight = hMap[e.size] || 80;
          area.style.height = chartHeight + "px";

          if (chartType === "bar") {
            area.className = "echart-area echart-bars";
            heights.forEach((h, i) => {
              const bar = el("div.ebar", { style: { height: h } });
              bar.style.background = i % 2 === 0 ? primaryColor : "#5b9bd5";
              area.appendChild(bar);
            });
          } else if (chartType === "line") {
            area.className = "echart-area echart-line";
            const pts = heights.map((h, i) => {
              const val = parseFloat(h);
              const x = 20 + i * 26; // X spacing
              const y = 90 - val * 0.8; // Y coordinates
              return { x, y };
            });
            const pathD = `M ${pts.map(p => `${p.x} ${p.y}`).join(" L ")}`;
            const svgHtml = `
              <svg viewBox="0 0 120 100" width="100%" height="100%" style="overflow: visible; max-height: ${chartHeight - 10}px;">
                <line x1="10" y1="20" x2="110" y2="20" stroke="#e1dfdd" stroke-dasharray="2 2" stroke-width="0.5"/>
                <line x1="10" y1="50" x2="110" y2="50" stroke="#e1dfdd" stroke-dasharray="2 2" stroke-width="0.5"/>
                <line x1="10" y1="80" x2="110" y2="80" stroke="#e1dfdd" stroke-dasharray="2 2" stroke-width="0.5"/>
                <path d="${pathD}" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="${primaryColor}" stroke-width="2.5"/>`).join("")}
              </svg>
            `;
            area.innerHTML = svgHtml;
          } else if (chartType === "pie") {
            area.className = "echart-area echart-pie";
            const svgHtml = `
              <svg viewBox="0 -5 100 105" width="100%" height="100%" style="max-height: ${chartHeight - 10}px;">
                <circle cx="50" cy="50" r="30" fill="none" stroke="${primaryColor}" stroke-width="30" stroke-dasharray="84.82 188.5" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#5b9bd5" stroke-width="30" stroke-dasharray="56.55 188.5" transform="rotate(72 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#70ad47" stroke-width="30" stroke-dasharray="47.12 188.5" transform="rotate(180 50 50)"/>
              </svg>
            `;
            area.innerHTML = svgHtml;
          }
        }
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
    } else if (ins.kind === "combined") {
      complete = ins.changes.every(c => state.elements[ins.target][c.prop] === c.value);
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

    const propLabel = (p) => {
      if (p === "color") return "色";
      if (p === "size") return "サイズ";
      if (p === "bold") return "太字";
      if (p === "italic") return "斜体";
      if (p === "underline") return "下線";
      if (p === "font") return "フォント";
      if (p === "chartType") return "グラフの種類";
      return p;
    };
    let hint = null;
    let penalty = 0;

    if (ins.kind === "combined") {
      if (targetId !== ins.target) {
        hint = `いやいや、${ELEMENT_LABELS[ins.target]}って言ったよね？${ELEMENT_LABELS[targetId]}じゃなくて。`;
        penalty = 5;
      } else {
        const matchingChange = ins.changes.find(c => c.prop === prop);
        if (!matchingChange) {
          hint = `${ELEMENT_LABELS[ins.target]}のそこは変えなくていいから、指示された部分だけ直して。`;
          penalty = 3;
        } else {
          // If value is correct, they are making progress, don't penalize
          if (newVal === matchingChange.value) {
            state.lastHintAt = 0;
            return;
          }
          
          // Otherwise hint for the wrong value
          if (prop === "color") {
            hint = `「${COLOR_LABELS[matchingChange.value]}」にしてほしいんだけど。`;
            penalty = 3;
          } else if (prop === "size") {
            const arr = ["S","M","L"];
            const oldIdx = arr.indexOf(oldVal);
            const newIdx = arr.indexOf(newVal);
            const targetIdx = arr.indexOf(matchingChange.value);
            const shouldBeBigger = targetIdx > oldIdx;
            const isBiggerNow = newIdx > oldIdx;
            if (shouldBeBigger === isBiggerNow) {
              state.lastHintAt = 0;
              return;
            }
            hint = shouldBeBigger ? "もう少し大きくして" : "もうちょい小さくして";
            penalty = 3;
          } else if (prop === "bold") {
            hint = matchingChange.value ? "太字にしてって言ったよ" : "太字は解除して";
            penalty = 3;
          } else if (prop === "italic") {
            hint = matchingChange.value ? "斜体にしてね" : "斜体は戻して";
            penalty = 3;
          } else if (prop === "underline") {
            hint = matchingChange.value ? "下線引いてくれる？" : "下線は消して";
            penalty = 3;
          } else if (prop === "font") {
            const fontLabels = { gothic: "ゴシック", mincho: "明朝", pop: "ポップ" };
            hint = `フォントは「${fontLabels[matchingChange.value]}」だって。`;
            penalty = 3;
          } else if (prop === "chartType") {
            const chartNames = { bar: "棒グラフ", line: "折れ線グラフ", pie: "円グラフ" };
            hint = `グラフは「${chartNames[matchingChange.value]}」にして。`;
            penalty = 3;
          }
        }
      }
    } else if (ins.kind === "set") {
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
          penalty = 3;
        } else if (ins.prop === "size") {
          const arr = ["S","M","L","XL"];
          const oldIdx = arr.indexOf(oldVal);
          const newIdx = arr.indexOf(newVal);
          const targetIdx = arr.indexOf(ins.value);

          // 正しい方向（大きくすべきで大きくなった、または小さくすべきで小さくなった）かチェック
          const shouldBeBigger = targetIdx > oldIdx;
          const isBiggerNow = newIdx > oldIdx;

          if (shouldBeBigger === isBiggerNow) {
            // 正しい方向に進んでいるので、減点もお説教もしない！
            state.lastHintAt = 0; // 次のクリック判定のために即時リセット
            return;
          }

          // 逆方向または超えてしまった場合
          const direction = shouldBeBigger ? "もうちょっと大きく" : "もうちょっと小さく";
          hint = `${direction}って言ったよ？`;
          penalty = 3;
        } else if (ins.prop === "bold") {
          hint = ins.value ? "太字にしてって言ったでしょ…" : "太字外してって言ったよ。";
          penalty = 3;
        } else if (ins.prop === "italic") {
          hint = ins.value ? "斜体にしてって言ったよね？" : "斜体は解除してって言ったよ。";
          penalty = 3;
        } else if (ins.prop === "underline") {
          hint = ins.value ? "下線引いてって言ったでしょ…" : "下線は引かないで。";
          penalty = 3;
        } else if (ins.prop === "font") {
          const fontLabels = { gothic: "ゴシック", mincho: "明朝", pop: "ポップ" };
          hint = `フォントは「${fontLabels[ins.value]}」だって。`;
          penalty = 3;
        } else if (ins.prop === "chartType") {
          const chartNames = { bar: "棒グラフ", line: "折れ線グラフ", pie: "円グラフ" };
          hint = `グラフは「${chartNames[ins.value]}」にして。`;
          penalty = 3;
        }
      }
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
    // サイズ (＋ / － ボタン方式)
    const sizes = ["S", "M", "L"];
    const curIdx = sizes.indexOf(e.size);
    refs.panel.appendChild(el("div.pp-prow", {}, [
      el("div.pp-plabel", { text: "サイズ" }),
      el("div.pp-pbtns", { style: { gap: "8px" } }, [
        el("button.pp-szbtn.step", {
          text: "－",
          disabled: curIdx === 0,
          onclick: () => {
            if (curIdx > 0) setProp(id, "size", sizes[curIdx - 1]);
          }
        }),
        el("button.pp-szbtn.step", {
          text: "＋",
          disabled: curIdx === sizes.length - 1,
          onclick: () => {
            if (curIdx < sizes.length - 1) setProp(id, "size", sizes[curIdx + 1]);
          }
        }),
        el("span", { 
          style: { alignSelf: "center", fontSize: "12px", fontWeight: "bold", marginLeft: "4px", color: "var(--pp-ink-soft)" }, 
          text: e.size 
        })
      ]),
    ]));
    // スタイル (太字 / 斜体 / 下線)
    const styleButtons = [
      el("button.pp-szbtn", {
        class: e.bold ? "pp-szbtn sel" : "pp-szbtn",
        text: "B",
        style: { fontWeight: "bold", width: "28px", minWidth: "28px", padding: "5px 0" },
        onclick: () => setProp(id, "bold", !e.bold),
      })
    ];
    if (state.slideNumber >= 2) {
      styleButtons.push(
        el("button.pp-szbtn", {
          class: e.italic ? "pp-szbtn sel" : "pp-szbtn",
          text: "I",
          style: { fontStyle: "italic", fontWeight: "bold", width: "28px", minWidth: "28px", padding: "5px 0" },
          onclick: () => setProp(id, "italic", !e.italic),
        })
      );
    }
    if (state.slideNumber >= 3) {
      styleButtons.push(
        el("button.pp-szbtn", {
          class: e.underline ? "pp-szbtn sel" : "pp-szbtn",
          text: "U",
          style: { textDecoration: "underline", fontWeight: "bold", width: "28px", minWidth: "28px", padding: "5px 0" },
          onclick: () => setProp(id, "underline", !e.underline),
        })
      );
    }

    refs.panel.appendChild(el("div.pp-prow", {}, [
      el("div.pp-plabel", { text: "スタイル" }),
      el("div.pp-pbtns", { style: { gap: "4px" } }, styleButtons),
    ]));

    // フォントファミリー (スライド4以降)
    if (state.slideNumber >= 4) {
      const fontLabels = { gothic: "ゴシック", mincho: "明朝", pop: "ポップ" };
      refs.panel.appendChild(el("div.pp-prow", {}, [
        el("div.pp-plabel", { text: "フォント" }),
        el("div.pp-pbtns", { style: { gap: "4px" } }, Object.keys(fontLabels).map((f) =>
          el("button.pp-szbtn", {
            class: e.font === f ? "pp-szbtn sel" : "pp-szbtn",
            text: fontLabels[f],
            style: { 
              fontFamily: f === "gothic" ? "var(--font-jp)" : (f === "mincho" ? '"Yu Mincho", serif' : '"DotGothic16", sans-serif'),
              fontSize: "11px",
              padding: "4px 6px",
              minWidth: "auto",
              flex: "1",
            },
            onclick: () => setProp(id, "font", f),
          })
        )),
      ]));
    }

    // グラフの種類 (スライド5以降かつグラフ要素選択時)
    if (state.slideNumber >= 5 && id === "chart") {
      const chartLabels = { bar: "棒", line: "折れ線", pie: "円" };
      refs.panel.appendChild(el("div.pp-prow", {}, [
        el("div.pp-plabel", { text: "グラフの種類" }),
        el("div.pp-pbtns", { style: { gap: "4px" } }, Object.keys(chartLabels).map((t) =>
          el("button.pp-szbtn", {
            class: e.chartType === t ? "pp-szbtn sel" : "pp-szbtn",
            text: chartLabels[t],
            style: { fontSize: "11px", padding: "4px 6px", minWidth: "auto", flex: "1" },
            onclick: () => setProp(id, "chartType", t),
          })
        )),
      ]));
    }
  }

  // --- 上司の指示生成 ------------------------------------------------------

  function nextInstruction() {
    const roll = Math.random();
    let ins;
    const lastIns = state.history[state.history.length - 1];
    const isLastContradiction = lastIns && lastIns.contradiction;

    // 完了数3回以上で35%の確率で組み合わせ指示
    if (state.completed >= 3 && Math.random() < 0.35) {
      ins = makeCombinedInstruction();
    } else if (state.completed >= 2 && roll < 0.22) {
      ins = makeVagueInstruction();
    } else if (state.completed >= 2 && roll < 0.5 && !isLastContradiction) {
      ins = makeContradictionInstruction();
    } else {
      ins = makeConcreteInstruction();
    }
    state.instruction = ins;
    state.pendingTime = 0;
    // 各指示の応答制限時間：完遂数が増えるほど短くなる（15.0→5.0秒）
    state.instructionLimit = Math.max(5.0, 15.0 - state.completed * 0.8);
    addChat(ins);
  }

  function makeConcreteInstruction() {
    const target = pick(["title", "logo", "chart"]);
    const availableProps = ["color", "size", "bold"];
    if (state.slideNumber >= 2) availableProps.push("italic");
    if (state.slideNumber >= 3) availableProps.push("underline");
    if (state.slideNumber >= 4) availableProps.push("font");
    if (state.slideNumber >= 5 && target === "chart") availableProps.push("chartType");

    const prop = pick(availableProps);
    const cur = state.elements[target][prop];
    let value, text;
    if (prop === "color") {
      const choices = Object.keys(COLORS).filter((c) => c !== cur);
      value = pick(choices);
      const verbs = ["にして", "に変えて", "にできる？"];
      text = `${ELEMENT_LABELS[target]}を${COLOR_LABELS[value]}${pick(verbs)}`;
    } else if (prop === "size") {
      const bigger = ["M","L"].includes(cur) ? Math.random() < 0.5 : true;
      const arr = ["S","M","L"];
      value = bigger
        ? arr[clamp(arr.indexOf(cur) + 1, 0, 2)]
        : arr[clamp(arr.indexOf(cur) - 1, 0, 2)];
      if (value === cur) value = bigger ? "L" : "S";
      text = `${ELEMENT_LABELS[target]}${bigger ? "もう少し大きく" : "もうちょい小さく"}して`;
    } else if (prop === "bold") {
      value = !cur;
      text = value
        ? `${ELEMENT_LABELS[target]}を太字にしてくれる？`
        : `${ELEMENT_LABELS[target]}の太字外して、印象強すぎる`;
    } else if (prop === "italic") {
      value = !cur;
      text = value
        ? `${ELEMENT_LABELS[target]}を斜体にして`
        : `${ELEMENT_LABELS[target]}の斜体戻して、読みにくい`;
    } else if (prop === "underline") {
      value = !cur;
      text = value
        ? `${ELEMENT_LABELS[target]}に下線を引いてくれる？`
        : `${ELEMENT_LABELS[target]}の下線消して。くどいから`;
    } else if (prop === "font") {
      const choices = ["gothic", "mincho", "pop"].filter(f => f !== cur);
      value = pick(choices);
      const fontLabels = { gothic: "ゴシック体", mincho: "明朝体", pop: "ポップ体" };
      text = `${ELEMENT_LABELS[target]}のフォントを${fontLabels[value]}に切り替えて`;
    } else if (prop === "chartType") {
      const choices = ["bar", "line", "pie"].filter(t => t !== cur);
      value = pick(choices);
      const chartNames = { bar: "棒グラフ", line: "折れ線グラフ", pie: "円グラフ" };
      text = `グラフを${chartNames[value]}に変更してくれる？`;
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
      const arr = ["S","M","L"];
      const cur = state.elements[target][prop];
      value = arr[(arr.indexOf(cur) + 1) % 3];
      text = `${ELEMENT_LABELS[target]}、やっぱ${arr.indexOf(value) > arr.indexOf(cur) ? "大きく" : "小さく"}した方がよくない？`;
    } else if (prop === "bold") {
      value = !state.elements[target][prop];
      text = value ? `やっぱ${ELEMENT_LABELS[target]}太字で` : `やっぱ${ELEMENT_LABELS[target]}の太字やめて、ダサい`;
    } else if (prop === "italic") {
      value = !state.elements[target][prop];
      text = value ? `やっぱ${ELEMENT_LABELS[target]}は斜体にしといて` : `やっぱ${ELEMENT_LABELS[target]}の斜体やめよう、普通に戻して`;
    } else if (prop === "underline") {
      value = !state.elements[target][prop];
      text = value ? `やっぱ${ELEMENT_LABELS[target]}に下線引いてくれる？` : `やっぱ${ELEMENT_LABELS[target]}の下線はナシで`;
    } else if (prop === "font") {
      const cur = state.elements[target][prop];
      const choices = ["gothic", "mincho", "pop"].filter(f => f !== cur);
      value = pick(choices);
      const fontLabels = { gothic: "ゴシック", mincho: "明朝", pop: "ポップ" };
      text = `やっぱ${ELEMENT_LABELS[target]}のフォント、${fontLabels[value]}に戻そうか`;
    } else if (prop === "chartType") {
      const cur = state.elements[target][prop];
      const choices = ["bar", "line", "pie"].filter(t => t !== cur);
      value = pick(choices);
      const chartNames = { bar: "棒グラフ", line: "折れ線グラフ", pie: "円グラフ" };
      text = `グラフ、やっぱり${chartNames[value]}のほうが分かりやすいかな`;
    }
    return { kind: "set", target, prop, value, text: rudeText(text), contradiction: true };
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
      || s.elements[id].bold !== prev[id].bold
      || s.elements[id].italic !== prev[id].italic
      || s.elements[id].underline !== prev[id].underline
      || s.elements[id].font !== prev[id].font
      || s.elements[id].chartType !== prev[id].chartType);
  }

  function makeCombinedInstruction() {
    const target = pick(["title", "logo", "chart"]);
    
    const availableProps = ["color", "size", "bold"];
    if (state.slideNumber >= 2) availableProps.push("italic");
    if (state.slideNumber >= 3) availableProps.push("underline");
    if (state.slideNumber >= 4) availableProps.push("font");
    if (state.slideNumber >= 5 && target === "chart") availableProps.push("chartType");

    // Pick 2 distinct properties
    const shuffled = [...availableProps].sort(() => Math.random() - 0.5);
    const prop1 = shuffled[0];
    const prop2 = shuffled[1];

    const generateValAndText = (prop) => {
      const cur = state.elements[target][prop];
      let value, text;
      if (prop === "color") {
        const choices = Object.keys(COLORS).filter((c) => c !== cur);
        value = pick(choices);
        text = `${COLOR_LABELS[value]}にして`;
      } else if (prop === "size") {
        const bigger = ["M","L"].includes(cur) ? Math.random() < 0.5 : true;
        const arr = ["S","M","L"];
        value = bigger
          ? arr[clamp(arr.indexOf(cur) + 1, 0, 2)]
          : arr[clamp(arr.indexOf(cur) - 1, 0, 2)];
        if (value === cur) value = bigger ? "L" : "S";
        text = bigger ? "大きくして" : "小さくして";
      } else if (prop === "bold") {
        value = !cur;
        text = value ? "太字にして" : "太字を外して";
      } else if (prop === "italic") {
        value = !cur;
        text = value ? "斜体にして" : "斜体戻して";
      } else if (prop === "underline") {
        value = !cur;
        text = value ? "下線引いて" : "下線消して";
      } else if (prop === "font") {
        const choices = ["gothic", "mincho", "pop"].filter(f => f !== cur);
        value = pick(choices);
        const fontLabels = { gothic: "ゴシック体", mincho: "明朝体", pop: "ポップ体" };
        text = `フォントを${fontLabels[value]}にして`;
      } else if (prop === "chartType") {
        const choices = ["bar", "line", "pie"].filter(t => t !== cur);
        value = pick(choices);
        const chartNames = { bar: "棒グラフ", line: "折れ線グラフ", pie: "円グラフ" };
        text = `グラフを${chartNames[value]}にして`;
      }
      return { prop, value, text };
    };

    const c1 = generateValAndText(prop1);
    const c2 = generateValAndText(prop2);

    const txt = rudeText(`${ELEMENT_LABELS[target]}なんだけど、${c1.text}、あとついでに${c2.text}くれる？`);

    return {
      kind: "combined",
      target,
      changes: [
        { prop: c1.prop, value: c1.value },
        { prop: c2.prop, value: c2.value }
      ],
      text: txt
    };
  }

  function checkInstruction() {
    const ins = state.instruction;
    if (!ins) return;
    let ok = false;
    if (ins.kind === "set") {
      ok = state.elements[ins.target][ins.prop] === ins.value;
    } else if (ins.kind === "combined") {
      ok = ins.changes.every(c => state.elements[ins.target][c.prop] === c.value);
    } else if (ins.kind === "vague") {
      ok = ins.accepts(state, ins.snapshot);
    } else if (ins.kind === "chaos") {
      ok = ["title","logo","chart"].every((id) =>
        state.elements[id].color === ins.target[id].color
        && state.elements[id].size === ins.target[id].size
        && state.elements[id].bold === ins.target[id].bold
        && state.elements[id].italic === ins.target[id].italic
        && state.elements[id].underline === ins.target[id].underline
        && state.elements[id].font === ins.target[id].font
        && state.elements[id].chartType === ins.target[id].chartType);
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

    // 5回完了ごとにスライド切り替え
    if (state.completed > 0 && state.completed % 5 === 0) {
      state.nextDelay = 999; // 切り替え完了まで次の指示を出さない
      setTimeout(changeSlide, 800);
      return;
    }

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
    const m = mood < 30 ? "rage" : mood < 60 ? "irritated" : mood < 85 ? "normal" : "happy";
    if (refs.bossFace.dataset.mood !== m) {
      refs.bossFace.dataset.mood = m;
      const img = refs.bossFace.querySelector("img");
      if (img) {
        img.className = `boss-img boss-mood-${m}`;
      }
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

    // 激怒時に画面周囲を赤くフラッシュさせる
    if (refs.workspace) {
      refs.workspace.classList.toggle("rage-pulse", state.boss.mood < 30);
    }

    // 機嫌0で強制退社（業務終了）
    if (state.boss.mood <= 0) { quit(true, "exhausted"); return; }
  });

  const SLIDE_TEMPLATES = [
    { title: "Q3 売上分析", chartHeights: ["55%", "80%", "40%", "95%"], logoColor: "red", logoSize: "M" },
    { title: "中期経営計画", chartHeights: ["30%", "50%", "70%", "90%"], logoColor: "blue", logoSize: "S" },
    { title: "競合他社比較", chartHeights: ["85%", "65%", "45%", "25%"], logoColor: "green", logoSize: "L" },
    { title: "今後の課題と対策", chartHeights: ["40%", "45%", "35%", "50%"], logoColor: "black", logoSize: "M" },
    { title: "新事業プロポーザル", chartHeights: ["15%", "55%", "85%", "100%"], logoColor: "blue", logoSize: "L" },
  ];

  function changeSlide() {
    state.slideNumber += 1;

    // テンプレートを選択 (ループ)
    const tplIdx = (state.slideNumber - 1) % SLIDE_TEMPLATES.length;
    const tpl = SLIDE_TEMPLATES[tplIdx];

    // スライドの要素状態をリセット
    state.elements = {
      title: { color: "black", size: "M", bold: true, italic: false, underline: false, font: "gothic", text: tpl.title },
      logo: { color: tpl.logoColor, size: tpl.logoSize, bold: false, italic: false, underline: false, font: "gothic", text: "LOGO" },
      chart: { color: "blue", size: "M", bold: false, italic: false, underline: false, font: "gothic", chartType: "bar", heights: tpl.chartHeights, text: tpl.title.substring(0, 4) + "推移" },
    };

    // UIを更新
    refs.slide.querySelector("#el-title .etext").textContent = tpl.title;
    refs.slide.querySelector("#el-chart .etext").textContent = tpl.title.substring(0, 4) + "推移";

    applyElementStyles();
    selectElement(null); // 選択解除

    // ステータスバーのスライド番号更新
    if (refs.slideNumText) {
      refs.slideNumText.textContent = `スライド ${state.slideNumber}/8`;
    }

    // 難易度アップ
    state.naturalDecay += 0.15; // 機嫌の自然減少速度をアップ
    toast(`難易度UP! スライド ${state.slideNumber} に切り替わりました。`);

    // スライドのフラッシュ演出
    refs.slide.classList.add("slide-flash");
    setTimeout(() => refs.slide.classList.remove("slide-flash"), 500);

    // 上司の吹き出し
    setBubble("よし、次はこのスライドを修正して。指示出すからよく聞いて。", "佐藤部長");
    state.instruction = null;
    state.nextDelay = 1.8; // 次の指示までのディレイ
  }

  applyElementStyles();
  renderSelection();
  renderPanel();
  refs.bossFace.innerHTML = `<img class="boss-img boss-mood-normal" src="assets/img/boss.png" alt="佐藤部長"/>`;
  refs.bossFace.dataset.mood = "normal";

  function quit(forced, reason) {
    game.stop();
    
    const unitPrice = 5;
    const completedPay = state.completed * unitPrice;
    const deductionVal = state.completed > 0 ? 5 : 0;
    
    const coins = Math.max(0, completedPay - deductionVal);
    const score = state.completed * 100 + Math.floor(state.boss.mood);
    const mins = Math.floor(state.elapsed / 60);
    const secs = Math.floor(state.elapsed % 60);
    const elapsedStr = `${mins}分${secs}秒`;

    let msg;
    let details;

    if (state.completed === 0) {
      msg = `1件も完遂できずに退勤（${elapsedStr}）。無労働のため支給はありません。`;
      details = {
        isWin: true,
        allowances: [],
        deductions: [],
        bossComment: "佐藤部長「何もせずすぐに退勤するとは何事かね？やる気がないなら、もう来なくていいぞ。」"
      };
    } else {
      if (reason === "exhausted") {
        msg = `上司の機嫌が限界に達し、業務終了（${elapsedStr}）。`;
      } else {
        msg = `${state.completed}件の修正に耐えて退勤（${elapsedStr}）。`;
      }

      let comment = "";
      if (state.boss.mood >= 80) {
        comment = "佐藤部長「素晴らしい出来栄えだ！微に入り細を穿つスライド修正、まさに職人技だな。このクオリティなら役員会も一発パスだ。」";
      } else if (state.boss.mood >= 40) {
        comment = "佐藤部長「まあまあだな。フォントや色の細かい注文にもよく応えてくれた。ただ、作業スピードをもう少し意識し給え。」";
      } else {
        comment = "佐藤部長「なんとか形になったが、イライラさせられたぞ。もっと上司の意図を汲み取ったスライド作りを心掛けたまえ。」";
      }

      details = {
        isWin: true,
        allowances: [
          { name: `修正箇所 × ${state.completed}`, value: completedPay }
        ],
        deductions: [
          { name: "お祈り保険料", value: 2 },
          { name: "忖度維持管理費", value: 3 }
        ],
        bossComment: comment
      };
    }

    finishGame(gameId, score, coins, msg, details);
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
    el("div.pp-filename", { text: "Q3売上_最終_v8_本当に最終.pptx · スライド職人" }),
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
    el("div.pp-bossface#pp-bossface", { "data-mood": "normal" }, [
      el("img.boss-img.boss-mood-normal", { src: "assets/img/boss.png", alt: "佐藤部長" })
    ]),
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
        el("div.echart-area.echart-bars", {}, [
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
    el("span#pp-slidenum", { text: "スライド 1/8" }),
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
