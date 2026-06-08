// =========================================================================
// claim.js — クレーム対応（電話応対シミュレーター）
// 怒れる客の罵声に「共感」で応戦し、最後はバグを見つけて即時修正する
// 二段構成のミニゲーム。ストーリーモード専用（通常版とは独立）。
// =========================================================================

import { el, clear, loop, clamp } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { finishGame } from "./result.js?v=1.2.5";

const ROUNDS = [
  {
    customer: "おい！！！ どうなってるんだお前のところは！ こっちは大損害なんだぞ！",
    choices: [
      { type: "empathy",   text: "それは大変な思いをおかけしてしまい、誠に申し訳ございません。詳しい状況をお聞かせいただけますか。" },
      { type: "robotic",   text: "お問い合わせいただきありがとうございます。担当部署に確認の上、追ってご連絡いたします。" },
      { type: "defensive", text: "そのような事象は弊社では確認されておりません。お客様側のご利用環境ではないでしょうか。" },
    ],
  },
  {
    customer: "謝って済むかよ！ 口先だけなら何とでも言えるんだよ！ 本当に悪いと思ってるのか！？",
    choices: [
      { type: "defensive", text: "謝罪はいたしましたので、これ以上は対応いたしかねます。" },
      { type: "empathy",   text: "言葉だけだと思われても仕方がないほど、ご迷惑をおかけしました。私の力で必ず解決いたします。" },
      { type: "robotic",   text: "貴重なご意見として、社内で共有させていただきます。" },
    ],
  },
  {
    customer: "お前のその喋り方、マニュアル通りで心がこもってないんだよ！ ロボットと喋ってるみたいだ！",
    choices: [
      { type: "robotic",   text: "対応マニュアルに沿って、誠心誠意対応させていただいております。" },
      { type: "empathy",   text: "形式的に聞こえてしまったこと、申し訳ありません。私自身、お客様のお力になりたいと心から思っております。" },
      { type: "defensive", text: "心がこもっていないと言われましても、これが弊社の対応方針です。" },
    ],
  },
  {
    customer: "……まぁ、お前がそこまで言うならさ。実は『送信』を押すとエラーが出てな……",
    choices: [
      { type: "empathy",   text: "お時間を頂戴し恐縮ですが、私の方で原因を確認し、すぐに対処いたします。" },
      { type: "defensive", text: "それはお客様の通信環境の問題かもしれません。一度回線をご確認ください。" },
      { type: "robotic",   text: "エラーの件は記録いたしましたので、後日改めてご報告いたします。" },
    ],
  },
];

const ANGER_MAX = 100;
const CHOICE_TIME = 6.0;

const CODE_LINES = [
  { id: 1, text: "const res = await fetch(endpoint, { method: 'POST', body });" },
  { id: 2, text: "if (res.statu === 200) {", buggy: true, fix: "if (res.status === 200) {" },
  { id: 3, text: "  return res.json();" },
  { id: 4, text: "} else {" },
  { id: 5, text: "  throw new Error('Bad Gateway: 502');" },
  { id: 6, text: "}" },
];
const DEBUG_TIME = 12.0;

export function startClaim(mount, gameId) {
  const state = {
    phase: "call",      // "call" | "debug" | "done"
    round: 0,
    anger: 70,
    trust: 0,
    choiceTime: CHOICE_TIME,
    debugTime: DEBUG_TIME,
    resolved: false,
  };

  const root = el("div.claim-game", {}, [
    el("div.claim-header", {}, [
      el("div.claim-title", { text: "☎ カスタマーサポートセンター" }),
      el("div.claim-sub#claim-phase-label", { text: "クレーム対応中…" }),
    ]),
    el("div.claim-gauge-wrap", {}, [
      el("div.claim-gauge-label", { text: "客の怒りゲージ" }),
      el("div.claim-gauge-track", {}, [
        el("div.claim-gauge-fill#claim-anger-fill"),
      ]),
    ]),
    el("div.claim-stage#claim-stage"),
  ]);

  mount(root);

  const refs = {
    phaseLabel: root.querySelector("#claim-phase-label"),
    angerFill: root.querySelector("#claim-anger-fill"),
    stage: root.querySelector("#claim-stage"),
  };

  function updateAnger() {
    const pct = clamp((state.anger / ANGER_MAX) * 100, 0, 100);
    refs.angerFill.style.width = pct + "%";
    refs.angerFill.style.background = pct > 65 ? "var(--r-red)" : pct > 35 ? "var(--r-yellow)" : "var(--r-green)";
  }

  // ---- フェーズ1：傾聴フェーズ（共感の選択） ----
  function showCallRound() {
    if (state.anger <= 0) { state.phase = "debug"; startDebug(); return; }
    if (state.round >= ROUNDS.length) { state.phase = "debug"; startDebug(); return; }

    const r = ROUNDS[state.round];
    state.choiceTime = CHOICE_TIME;
    let answered = false;

    clear(refs.stage);
    refs.phaseLabel.textContent = `クレーム対応中…（${state.round + 1}/${ROUNDS.length}）`;

    const timerFill = el("div.claim-timer-fill");
    const choicesWrap = el("div.claim-choices");

    refs.stage.appendChild(el("div.claim-customer", {}, [
      el("div.claim-customer-label", { text: "客（電話口）" }),
      el("div.claim-customer-text", { text: r.customer }),
    ]));
    refs.stage.appendChild(el("div.claim-timer-track", {}, [timerFill]));
    refs.stage.appendChild(choicesWrap);

    r.choices.forEach((c) => {
      const btn = el("button.claim-choice", { onclick: () => pick(c) }, [el("span", { text: c.text })]);
      choicesWrap.appendChild(btn);
    });

    const tick = loop((dt) => {
      if (answered) { tick.stop(); return; }
      state.choiceTime -= dt;
      timerFill.style.width = clamp((state.choiceTime / CHOICE_TIME) * 100, 0, 100) + "%";
      if (state.choiceTime <= 0) { pick(null); }
    });

    function pick(choice) {
      if (answered) return;
      answered = true;
      tick.stop();
      [...choicesWrap.children].forEach((b) => (b.disabled = true));

      const isGood = choice && choice.type === "empathy";
      if (isGood) {
        state.anger = clamp(state.anger - 26, 0, ANGER_MAX);
        state.trust += 1;
        flashResult(choice ? choice.text : "", true, "客の声が、少し落ち着いた……");
      } else {
        state.anger = clamp(state.anger + 14, 0, ANGER_MAX);
        const why = !choice ? "（応答が遅れ、客の苛立ちが増した）"
          : choice.type === "robotic" ? "（言葉は丁寧だが、心がこもっていないと感じさせてしまった）"
          : "（突き放すような物言いで、火に油を注いでしまった）";
        flashResult(choice ? choice.text : "", false, why);
      }
      updateAnger();
      state.round += 1;
      setTimeout(showCallRound, 1100);
    }
  }

  function flashResult(text, good, comment) {
    const pop = el("div.claim-result-pop", { text: good ? "✓ 共感できた" : "✗ 逆効果だった" });
    pop.classList.add(good ? "good" : "bad");
    refs.stage.appendChild(pop);
    refs.stage.appendChild(el("div.claim-result-comment", { text: comment }));
  }

  // ---- フェーズ2：デバッグフェーズ（バグ特定） ----
  function startDebug() {
    clear(refs.stage);
    refs.phaseLabel.textContent = "原因特定 — コードを確認せよ！";
    state.debugTime = DEBUG_TIME;
    let solved = false;

    const timerFill = el("div.claim-timer-fill");
    const codeBox = el("div.claim-code");

    refs.stage.appendChild(el("div.claim-customer", {}, [
      el("div.claim-customer-label", { text: "状況" }),
      el("div.claim-customer-text", { text: "「送信」を押すとエラーコード502。バグの原因となっている行をタップして特定せよ。" }),
    ]));
    refs.stage.appendChild(el("div.claim-timer-track", {}, [timerFill]));
    refs.stage.appendChild(codeBox);

    CODE_LINES.forEach((line) => {
      const row = el("div.claim-code-line", { onclick: () => guess(line, row) }, [
        el("span.claim-code-num", { text: String(line.id) }),
        el("span.claim-code-text", { text: line.text }),
      ]);
      codeBox.appendChild(row);
    });

    const tick = loop((dt) => {
      if (solved) { tick.stop(); return; }
      state.debugTime -= dt;
      timerFill.style.width = clamp((state.debugTime / DEBUG_TIME) * 100, 0, 100) + "%";
      if (state.debugTime <= 0) { guess(null, null); }
    });

    function guess(line, row) {
      if (solved) return;
      solved = true;
      tick.stop();
      [...codeBox.children].forEach((r) => (r.style.pointerEvents = "none"));

      const correct = line && line.buggy;
      state.resolved = correct;
      if (row) row.classList.add(correct ? "hit" : "miss");
      const buggyRow = [...codeBox.children].find((_, i) => CODE_LINES[i].buggy);
      if (buggyRow && !correct) buggyRow.classList.add("reveal");

      refs.stage.appendChild(el("div.claim-result-pop", {
        text: correct ? "✓ バグを特定！ 修正完了" : "✗ 見つけられなかった……",
        class: "claim-result-pop " + (correct ? "good" : "bad"),
      }));
      refs.stage.appendChild(el("div.claim-result-comment", {
        text: correct
          ? "if (res.statu === 200) → if (res.status === 200) ―― タイプミス一つで丸一日が消える。"
          : "原因は2行目のタイプミス（statu → status）だった。気づけなかったが、被害が広がる前に対応はできた。",
      }));

      setTimeout(finish, 1400);
    }
  }

  function finish() {
    state.phase = "done";
    const goodCalls = state.trust;
    const score = goodCalls * 120 + (state.resolved ? 300 : 100) + Math.max(0, ANGER_MAX - state.anger) * 2;
    const coins = goodCalls * 6 + (state.resolved ? 12 : 4);

    let comment;
    if (goodCalls >= 3 && state.resolved) {
      comment = "佐藤課長「ほう……怒り狂った客を宥めた上に、原因まで突き止めるとはな。なかなかやるじゃないか」";
    } else if (goodCalls >= 2 || state.resolved) {
      comment = "佐藤課長「まあ、及第点だ。次はもう少し早く客の心を開かせてみせろ」";
    } else {
      comment = "佐藤課長「……課長の私が出るところだったぞ。次はもっと『人間味』を出せ」";
    }

    finishGame(gameId, score, coins, "クレーム対応を終え、受話器を置いた。", {
      isWin: true,
      allowances: [
        { name: `共感応答 × ${goodCalls}`, value: goodCalls * 6 },
        { name: state.resolved ? "原因究明ボーナス" : "対応完遂手当", value: state.resolved ? 12 : 4 },
      ],
      deductions: [],
      bossComment: comment,
    });
  }

  updateAnger();
  showCallRound();

  return { dispose() {} };
}
