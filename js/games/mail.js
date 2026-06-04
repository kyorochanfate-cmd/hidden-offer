// =========================================================================
// mail.js — 朝イチメールチェック
// Outlook風UI: ヘッダー + リボン + フォルダピル + 一覧 + 閲覧ペイン
// =========================================================================

import { el, clear } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { finishGame } from "./result.js?v=1.2.5";

const EMAIL_POOL = [
  { id:"t1", type:"trash", from:"ECサイト通知",    time:"07:12",
    subject:"【限定】本日だけポイント10倍！お見逃しなく",
    body:"毎度ご愛顧いただきありがとうございます。本日限り全商品ポイント10倍キャンペーン開催中！" },
  { id:"t2", type:"trash", from:"社内報編集部",    time:"07:45",
    subject:"社内報 Vol.318｜今月の誕生日社員＆サークル活動",
    body:"今月のお誕生日社員をご紹介します！バドミントンサークルも部員募集中です。" },
  { id:"t3", type:"trash", from:"セキュリティ通知", time:"06:58",
    subject:"【重要】あなたのアカウントに不審なアクセス",
    body:"至急こちらのリンクからパスワードをご変更ください → http://login-c0mpany.example.com" },
  { id:"t4", type:"trash", from:"総務部 福利厚生係", time:"07:30",
    subject:"社員食堂メニュー変更のお知らせ（2ヶ月前）",
    body:"2ヶ月前のメニュー変更のお知らせです。既に変更済みのためご参考まで。" },
  { id:"t5", type:"trash", from:"健康管理室",       time:"08:00",
    subject:"ラジオ体操参加のご案内（毎朝7:50・屋上）",
    body:"毎朝の健康づくりにラジオ体操はいかがでしょうか。参加自由・任意です。" },
  { id:"t6", type:"trash", from:"田所エージェント", time:"07:55",
    subject:"あなたのキャリアに特別なオファーがございます",
    body:"いつもお世話になっております。今回、あなたにぴったりの非公開求人が…" },

  { id:"f1", type:"flag", from:"人事部",          time:"08:05",
    subject:"年末調整書類の提出について（12月25日締切）",
    body:"年末調整の書類をご提出ください。締切：12月25日（金）。詳細は添付PDFをご確認ください。" },
  { id:"f2", type:"flag", from:"山田@テクノA社",  time:"07:48",
    subject:"来週の定例ミーティング、日程調整のお願い",
    body:"来週の定例について以下の日程はいかがでしょうか。来週火曜14:00〜または木曜10:00〜" },
  { id:"f3", type:"flag", from:"経理部",          time:"08:10",
    subject:"10月分経費精算レポートの提出（月末まで）",
    body:"10月分の経費精算レポートの提出をお願いします。提出期限：今月末日。" },
  { id:"f4", type:"flag", from:"鈴木課長",        time:"07:52",
    subject:"チームランチの候補日程（来月調整）",
    body:"来月のチームランチを調整したいと思います。都合のよい日程をご連絡ください。" },
  { id:"f5", type:"flag", from:"IT管理部",        time:"08:15",
    subject:"PCソフトウェア更新のご案内（来週実施）",
    body:"来週木曜にセキュリティソフトのアップデートを実施します。業務への影響はございません。" },

  { id:"r1", type:"reply", from:"佐藤部長", time:"08:22", isBoss:true,
    subject:"【至急】今日のクライアント訪問の資料確認",
    body:"おい、今日10時にA社に行くんだが、昨日頼んだ提案書の最終版できてるよな？朝イチで確認させてくれ。",
    replies:[
      { text:"承知しました。ただいま最終確認中です。9時半までにお送りします。",      correct:true  },
      { text:"申し訳ございません。まだ完成しておりません。",                          correct:false },
      { text:"了解です。先ほど共有フォルダに入れておきましたのでご確認ください。",    correct:false },
      { text:"確認しました。問題ないと思います。",                                    correct:false },
    ]},
  { id:"r2", type:"reply", from:"高橋@Bシステムズ", time:"08:18",
    subject:"本日午後の打ち合わせ、会場変更のご連絡",
    body:"お世話になっております。本日14時の打ち合わせですがA棟からB棟3Fに変更となりました。ご確認いただけますでしょうか。",
    replies:[
      { text:"ご連絡ありがとうございます。承知しました。B棟3Fに伺います。",  correct:true  },
      { text:"了解です！またよろしくお願いします！",                          correct:false },
      { text:"承知しました。なお本日は欠席させていただきます。",              correct:false },
      { text:"確認いたします。折り返しご連絡いたします。",                    correct:false },
    ]},
  { id:"r3", type:"reply", from:"佐藤部長", time:"08:31", isBoss:true,
    subject:"例の件、どうなった？",
    body:"先週話した新規案件の進捗、どうなってる？今日中に報告しろ。",
    replies:[
      { text:"現在対応中です。本日中にご報告いたします。",                    correct:true  },
      { text:"先週の件でしょうか？内容を確認してからご連絡します。",          correct:false },
      { text:"申し訳ございません。まだ着手できていません。",                  correct:false },
      { text:"了解しました。来週中にお送りします。",                          correct:false },
    ]},
  { id:"r4", type:"reply", from:"中村@G法律事務所", time:"08:25",
    subject:"Re: 契約書について ─ 本日中にご回答いただけますか",
    body:"先日お送りした契約書の修正案について、本日中にご回答いただくことは可能でしょうか。先方締切の都合がございまして…",
    replies:[
      { text:"ご連絡ありがとうございます。本日中にご回答いたします。",        correct:true  },
      { text:"承知しました。来週早々にご回答いたします。",                    correct:false },
      { text:"内容確認のうえ上長に相談してからご連絡いたします。",            correct:false },
      { text:"ご依頼の件、難しい状況です。別途ご相談させてください。",        correct:false },
    ]},
  { id:"r5", type:"reply", from:"佐藤部長", time:"08:35", isBoss:true,
    subject:"朝礼の議題、追加しておけ",
    body:"今日の朝礼に「Q3売上レビュー」を議題に追加しておいてくれ。議事録係は君だからな。",
    replies:[
      { text:"承知しました。議題に追加しておきます。",                        correct:true  },
      { text:"かしこまりました！万全の態勢で臨みます！！",                    correct:false },
      { text:"本日は別件があり議事録担当が難しい状況です。",                  correct:false },
      { text:"Q3売上レビューですね。詳細資料もご用意しましょうか？",          correct:false },
    ]},
];

const MAX_ROUNDS = 8;
const MAX_LIVES  = 3;
const ROUND_SEC  = 90;

const AVATAR_COLORS = ["#0078d4","#8764b8","#e3008c","#107c10","#ca5010","#5c2d91","#038387","#c19c00"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function startMail(mount, gameId) {
  const state = {
    active:    true,
    round:     1,
    lives:     MAX_LIVES,
    score:     0,
    correct:   0,
    emails:    [],
    processed: new Set(),
    selected:  null,
    phase:     "list",
    timer:     ROUND_SEC,
  };

  const root = el("div.olk-app", {}, [
    // ── ヘッダー（Outlook青）─────────────────────────────────────────
    el("div.olk-header", {}, [
      el("button.olk-back", { onclick: () => quit() }, [el("span", { text: "←" })]),
      el("div.olk-app-icon", { text: "✉" }),
      el("div.olk-header-title", { text: "受信トレイ" }),
      el("div.olk-header-spacer"),
      el("div.olk-timer#olk-timer", { text: "朝礼 1:30" }),
    ]),

    // ── リボン（アクション）──────────────────────────────────────────
    el("div.olk-ribbon", {}, [
      el("button.olk-ribbon-btn.disabled#olk-rb-trash", {
        onclick: () => ribbonAction("trash"),
      }, [
        el("div.olk-rb-icon", { text: "🗑" }),
        el("div.olk-rb-label", { text: "削除" }),
      ]),
      el("button.olk-ribbon-btn.disabled#olk-rb-flag", {
        onclick: () => ribbonAction("flag"),
      }, [
        el("div.olk-rb-icon", { text: "🚩" }),
        el("div.olk-rb-label", { text: "フラグ" }),
      ]),
      el("button.olk-ribbon-btn.disabled#olk-rb-reply", {
        onclick: () => ribbonAction("reply"),
      }, [
        el("div.olk-rb-icon", { text: "↩" }),
        el("div.olk-rb-label", { text: "返信" }),
      ]),
      el("button.olk-ribbon-btn.disabled", {}, [
        el("div.olk-rb-icon", { text: "↪" }),
        el("div.olk-rb-label", { text: "転送" }),
      ]),
    ]),

    // ── フォルダピル ────────────────────────────────────────────────
    el("div.olk-folderbar", {}, [
      el("div.olk-folder-pill.active", {}, [
        el("span.olk-folder-icon", { text: "📥" }),
        el("span", { text: "受信トレイ" }),
        el("span.olk-folder-badge#olk-count", { text: "0" }),
      ]),
      el("div.olk-folder-pill", {}, [el("span", { text: "下書き" })]),
      el("div.olk-folder-pill", {}, [el("span", { text: "送信済み" })]),
    ]),

    // ── ステータスバー（ボス/ライフ/スコア/タイマー）─────────────────
    el("div.olk-statusbar", {}, [
      el("img.olk-boss-mini#olk-boss-img", { src: "assets/img/sato_normal.png", alt: "佐藤部長" }),
      el("div.olk-boss-text#olk-boss-bubble", { text: "さっさと処理しろ。朝礼に間に合わんぞ。" }),
      el("div.olk-status-right", {}, [
        el("div.olk-lives#olk-lives", { text: "❤❤❤" }),
        el("div.olk-score#olk-score", { text: "0円" }),
      ]),
    ]),

    // ── タイマーバー ────────────────────────────────────────────────
    el("div.olk-timerbar", {}, [el("div.olk-timerbar-fill#olk-timer-fill")]),

    // ── メイン: リスト + 閲覧ペイン ──────────────────────────────────
    el("div.olk-main", {}, [
      el("div.olk-list#olk-list"),
      el("div.olk-reading#olk-reading"),
    ]),

    el("div.olk-toast#olk-toast"),
  ]);

  mount(root);

  const refs = {
    bossImg:    root.querySelector("#olk-boss-img"),
    bossBubble: root.querySelector("#olk-boss-bubble"),
    timerText:  root.querySelector("#olk-timer"),
    timerFill:  root.querySelector("#olk-timer-fill"),
    lives:      root.querySelector("#olk-lives"),
    score:      root.querySelector("#olk-score"),
    list:       root.querySelector("#olk-list"),
    reading:    root.querySelector("#olk-reading"),
    count:      root.querySelector("#olk-count"),
    rbTrash:    root.querySelector("#olk-rb-trash"),
    rbFlag:     root.querySelector("#olk-rb-flag"),
    rbReply:    root.querySelector("#olk-rb-reply"),
    toast:      root.querySelector("#olk-toast"),
  };

  function startRound() {
    if (!state.active) return;
    if (state.round > MAX_ROUNDS) { finish(true); return; }

    state.processed = new Set();
    state.selected  = null;
    state.phase     = "list";
    state.emails    = buildRoundEmails(state.round);
    state.timer     = ROUND_SEC;

    clearReading();
    renderList();
    updateRibbon();
    runTimer();
    setBoss("sato_normal", "さっさと処理しろ。朝礼に間に合わんぞ。");
  }

  function buildRoundEmails(round) {
    const nReply = Math.min(3, 1 + Math.floor((round - 1) * 0.4));
    const nFlag  = Math.min(3, 1 + Math.floor((round - 1) * 0.3));
    const nTrash = Math.min(4, 2 + Math.floor((round - 1) * 0.2));
    const trash = pickN(EMAIL_POOL.filter(e => e.type === "trash"), nTrash);
    const flag  = pickN(EMAIL_POOL.filter(e => e.type === "flag"),  nFlag);
    const reply = pickN(EMAIL_POOL.filter(e => e.type === "reply"), nReply);
    return shuffle([...trash, ...flag, ...reply]);
  }

  function renderList() {
    clear(refs.list);
    const remaining = state.emails.filter(e => !state.processed.has(e.id)).length;
    refs.count.textContent = remaining;

    state.emails.forEach(email => {
      const done     = state.processed.has(email.id);
      const selected = state.selected === email.id;
      const initial  = email.from[0] || "?";
      const cls      = ["olk-row", done ? "done" : "", selected ? "selected" : ""].join(" ");

      const item = el("div", {
        class: cls,
        onclick: () => !done && selectEmail(email.id),
      }, [
        el("div.olk-row-bar"),
        el("div.olk-avatar", {
          style: { background: avatarColor(email.from) },
          text: initial,
        }),
        el("div.olk-row-body", {}, [
          el("div.olk-row-top", {}, [
            el("div.olk-row-from", { text: email.from }),
            el("div.olk-row-time", { text: email.time }),
          ]),
          el("div.olk-row-subject", { text: email.subject }),
          el("div.olk-row-preview", { text: email.body }),
        ]),
      ]);
      refs.list.appendChild(item);
    });
  }

  function selectEmail(id) {
    state.selected = id;
    state.phase    = "action";
    renderList();
    renderReading(id);
    updateRibbon();
  }

  function renderReading(id) {
    const email = state.emails.find(e => e.id === id);
    if (!email) return;
    clear(refs.reading);
    refs.reading.classList.add("open");
    refs.reading.appendChild(el("div.olk-read-subject", { text: email.subject }));
    refs.reading.appendChild(
      el("div.olk-read-meta", {}, [
        el("div.olk-avatar.lg", {
          style: { background: avatarColor(email.from) },
          text: email.from[0],
        }),
        el("div.olk-read-meta-text", {}, [
          el("div.olk-read-from", { text: email.from }),
          el("div.olk-read-to", { text: "宛先: 自分　" + email.time }),
        ]),
      ])
    );
    refs.reading.appendChild(el("div.olk-read-body", { text: email.body }));
    refs.reading.appendChild(el("div.olk-read-replyarea#olk-replyarea"));
  }

  function clearReading() {
    clear(refs.reading);
    refs.reading.classList.remove("open");
    refs.reading.appendChild(el("div.olk-read-empty", { text: "メールを選択してください" }));
    state.selected = null;
    state.phase    = "list";
  }

  function updateRibbon() {
    const enabled = !!state.selected && state.phase === "action";
    [refs.rbTrash, refs.rbFlag, refs.rbReply].forEach(b => {
      if (enabled) b.classList.remove("disabled");
      else b.classList.add("disabled");
    });
  }

  function ribbonAction(action) {
    if (!state.selected || state.phase !== "action") return;
    const email = state.emails.find(e => e.id === state.selected);
    if (!email) return;
    if (action === "reply") {
      showReplyOptions(email);
    } else {
      handleAction(email, action);
    }
  }

  function showReplyOptions(email) {
    state.phase = "reply";
    const area = refs.reading.querySelector("#olk-replyarea");
    if (!area) return;
    clear(area);
    const choices = email.replies ? shuffle(email.replies.slice()) : [
      { text:"承知しました。確認の上ご返信いたします。", correct:false },
      { text:"ご連絡ありがとうございます。",            correct:false },
      { text:"このメールに返信は不要です。",            correct:false },
      { text:"恐れ入りますがご確認ください。",          correct:false },
    ];
    area.appendChild(el("div.olk-reply-head", { text: "返信文を選択:" }));
    choices.forEach(r => {
      area.appendChild(
        el("button.olk-reply-btn", { onclick: () => handleReply(email, r) }, [
          el("span", { text: r.text })
        ])
      );
    });
    updateRibbon();
  }

  function handleAction(email, action) {
    const correct = email.type === action;
    resolveAnswer(email, correct, correct ? null : email.type);
  }

  function handleReply(email, reply) {
    if (email.type !== "reply") {
      resolveAnswer(email, false, email.type);
      return;
    }
    resolveAnswer(email, reply.correct, reply.correct ? null : "wrong_reply");
  }

  function resolveAnswer(email, correct, wrongType) {
    state.processed.add(email.id);
    clearReading();
    renderList();
    updateRibbon();

    if (correct) {
      const gain = 10 + state.round * 2;
      state.score   += gain;
      state.correct++;
      refs.score.textContent = state.score + "円";
      toast("正解 +" + gain + "円", "ok");
      setBoss("sato_smile", "よし。次だ。");
    } else {
      state.lives--;
      refs.lives.textContent =
        "❤".repeat(Math.max(0, state.lives)) +
        "🖤".repeat(Math.max(0, MAX_LIVES - state.lives));
      toast("ミス", "ng");
      const msgs = {
        trash:       "それはゴミ箱じゃないぞ！",
        flag:        "急ぎだろ！フラグじゃなく返信しろ！",
        reply:       "そんなメールに返信するな！",
        wrong_reply: "その返信文は不適切だ！",
      };
      setBoss("sato_angry", msgs[wrongType] || "違うだろ！");
      if (state.lives <= 0) { finish(false); return; }
    }

    if (state.processed.size >= state.emails.length) {
      stopTimer();
      setBoss("sato_smile", "全部片付けたか。朝礼に間に合ったぞ。");
      setTimeout(() => {
        if (!state.active) return;
        state.round++;
        startRound();
      }, 1500);
    }
  }

  let timerHandle = null;
  function runTimer() {
    stopTimer();
    timerHandle = setInterval(() => {
      state.timer -= 0.1;
      const pct = Math.max(0, (state.timer / ROUND_SEC) * 100);
      refs.timerFill.style.width = pct + "%";
      const m = Math.floor(state.timer / 60);
      const s = Math.floor(state.timer % 60);
      refs.timerText.textContent = "朝礼 " + m + ":" + String(s).padStart(2, "0");
      if (state.timer <= 0) {
        stopTimer();
        setBoss("sato_angry", "時間切れだ！");
        finish(false);
      }
    }, 100);
  }
  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  function setBoss(img, text) {
    refs.bossImg.src = "assets/img/" + img + ".png";
    refs.bossBubble.textContent = text;
  }

  function toast(msg, kind) {
    refs.toast.textContent = msg;
    refs.toast.className   = "olk-toast show " + (kind || "");
    setTimeout(() => { refs.toast.className = "olk-toast"; }, 1200);
  }

  function quit() { state.active = false; stopTimer(); Router.menu(); }

  function finish(cleared) {
    state.active = false;
    stopTimer();
    const score = state.score;
    const coins = Math.floor(score / 5);
    let msg, comment;
    if (cleared) {
      msg     = "全" + MAX_ROUNDS + "ラウンド完遂！正解 " + state.correct + "件、最終 " + score + "円。";
      comment = "佐藤部長「メール処理も仕事のうちだ。よくやった。」";
    } else if (state.correct === 0) {
      msg     = "メール仕分けゼロ。";
      comment = "佐藤部長「メールの一本も処理できないのか。社会人失格だ。」";
    } else {
      msg     = state.round + "ラウンドで力尽きた（正解 " + state.correct + "件）。";
      comment = "佐藤部長「朝から何やってるんだ。もっと集中しろ。」";
    }
    finishGame(gameId, score, coins, msg, {
      isWin:      cleared,
      allowances: [{ name: "仕分け正解 × " + state.correct, value: score }],
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
