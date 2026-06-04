// =========================================================================
// mail.js — フィッシングメール判定ゲーム
// 差出人・リンク・添付ファイルを🔍タップで検査 → 🗑削除 or ✅安全
// =========================================================================

import { el, clear } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { finishGame } from "./result.js?v=1.2.5";

const EMAIL_POOL = [
  // ── フィッシング ─────────────────────────────────────────────────
  {
    id:"p1", isSuspicious: true,
    from: { name:"佐藤部長", address:"sato-buchou@gmail-corp.net" },
    time:"08:15",
    subject:"【緊急】社内システムのパスワードを確認してください",
    bodyParts:[
      { type:"text", content:"お疲れ様です。セキュリティ監査のため、現在お使いのパスワードをご返信ください。\n\n対応期限：本日中" },
    ],
    tell:"from",
    reason:"差出人アドレスのドメインが「gmail-corp.net」。社内の正規アドレスは @company.co.jp のはず。また、パスワードをメールで求めることは絶対にありません。",
  },
  {
    id:"p2", isSuspicious: true,
    from: { name:"社内ITサポート", address:"it-support@company.co.jp" },
    time:"07:58",
    subject:"社内ポータルのメンテナンス完了のお知らせ",
    bodyParts:[
      { type:"text", content:"メンテナンスが完了しました。以下よりログインをお願いします。\n" },
      { type:"link", display:"https://portal.company.co.jp/login", realUrl:"http://c0mpany-portal.ru/steal" },
    ],
    tell:"link",
    reason:"リンクの表示は正規URLに見えますが、実際の送り先は「c0mpany-portal.ru」（oが数字の0）という全く別のサイトです。",
  },
  {
    id:"p3", isSuspicious: true,
    from: { name:"人事部", address:"hr@cornpany.co.jp" },
    time:"08:20",
    subject:"年末調整フォームの提出をお願いします",
    bodyParts:[
      { type:"text", content:"お疲れ様です。年末調整のフォームを以下よりご提出ください。マイナンバーと口座情報の入力が必要です。\n" },
      { type:"link", display:"年末調整フォームはこちら", realUrl:"http://hr-form-company.xyz/submit" },
    ],
    tell:"from",
    reason:"ドメインが「cornpany.co.jp」。よく見ると m が rn に置き換えられています。フォントによっては見分けにくい古典的な手口です。",
  },
  {
    id:"p4", isSuspicious: true,
    from: { name:"経理部 鈴木", address:"suzuki@company.co.jp" },
    time:"08:05",
    subject:"Q3決算報告書（最終版）",
    bodyParts:[
      { type:"text", content:"お疲れ様です。先ほどお話しした資料を添付します。ご確認ください。\n" },
      { type:"attachment", name:"Q3決算報告書_final.pdf.exe" },
    ],
    tell:"attachment",
    reason:"ファイル名が「.pdf.exe」。PDFに偽装した実行ファイル（ウイルス）です。正規の資料がexeであることはありません。",
  },
  {
    id:"p5", isSuspicious: true,
    from: { name:"Amazon", address:"noreply@amazon-security-alert.com" },
    time:"07:45",
    subject:"【重要】アカウントへの不審なアクセスを検知しました",
    bodyParts:[
      { type:"text", content:"お客様のアカウントで不審なログインが検出されました。\n24時間以内にご対応いただかない場合、アカウントは永久停止となります。\n" },
      { type:"link", display:"今すぐアカウントを保護する", realUrl:"http://amazon-security-alert.com/verify?tkn=9x8k2" },
    ],
    tell:"link",
    reason:"「24時間以内」「永久停止」と煽り、焦らせて判断力を奪う典型的な手口。リンク先も amazon.co.jp とは無関係のドメインです。",
  },
  {
    id:"p6", isSuspicious: true,
    from: { name:"田所 誠（キャリアサポート）", address:"tadokoro@career-offer-jp.net" },
    time:"07:33",
    subject:"あなたのご経歴に特別なオファーがございます",
    bodyParts:[
      { type:"text", content:"突然のご連絡をお許しください。あなたのご活躍を拝見し、ぜひ一度お話を伺いたく存じます。\n報酬：年収2,000万円以上も可能\n" },
      { type:"link", display:"詳細はこちら（登録不要）", realUrl:"http://career-phish.biz/track?uid=84729&ref=spam" },
    ],
    tell:"link",
    reason:"「登録不要」と書きながら、URLにはトラッキングIDが付いています。アクセスするだけで個人情報が収集される仕組みです。",
  },
  {
    id:"p7", isSuspicious: true,
    from: { name:"システム管理者", address:"admin@company-helpdesk.net" },
    time:"08:35",
    subject:"あなたのメールボックスが満杯です",
    bodyParts:[
      { type:"text", content:"あなたのメールボックスの容量が98%に達しました。\n以下のリンクより今すぐ容量を拡張してください。対応しない場合、メールの送受信ができなくなります。\n" },
      { type:"link", display:"容量を拡張する", realUrl:"http://mail-storage-expand.tk/auth" },
    ],
    tell:"from",
    reason:"差出人が「company-helpdesk.net」と一見それらしいドメインですが、社内の正規アドレスは @company.co.jp です。メールボックス拡張を外部サイトで行うことはありません。",
  },

  {
    id:"p7", isSuspicious: true,
    from: { name:"システム管理者", address:"admin@company-helpdesk.net" },
    time:"08:35",
    subject:"あなたのメールボックスが満杯です",
    bodyParts:[
      { type:"text", content:"あなたのメールボックスの容量が98%に達しました。\n以下のリンクより今すぐ容量を拡張してください。対応しない場合、メールの送受信ができなくなります。\n" },
      { type:"link", display:"容量を拡張する", realUrl:"http://mail-storage-expand.tk/auth" },
    ],
    tell:"from",
    reason:"差出人が「company-helpdesk.net」と一見それらしいドメインですが、社内の正規アドレスは @company.co.jp です。メールボックス拡張を外部サイトで行うことはありません。",
  },
  {
    id:"p8", isSuspicious: true,
    from: { name:"三菱UFJ銀行", address:"info@mufg-security-notice.com" },
    time:"07:22",
    subject:"【緊急】お客様のお取引を一時停止いたしました",
    bodyParts:[
      { type:"text", content:"拝啓、お客様。\n\n不正利用の疑いがございましたため、お客様のご口座を一時停止させていただきました。\nお早めに下記よりご本人確認の手続きをおとり下さい。\n手続きが完了しない場合、口座は永続的に利用停止となる場合があります。\n\n※本メールに心当たりがない場合もお手続きをお願い致します。\n" },
      { type:"link", display:"本人確認はこちら", realUrl:"http://mufg-secure-login.cn/verify" },
    ],
    tell:"content",
    reason:"「心当たりがない場合もお手続きを」という一文が典型的な手口。本物の銀行は絶対にそのような案内をしません。リンク先も .cn ドメインで中国のサーバーです。",
  },
  {
    id:"p9", isSuspicious: true,
    from: { name:"佐藤部長", address:"sato.taro@company.co.jp" },
    time:"08:50",
    subject:"急ぎでお願い",
    bodyParts:[
      { type:"text", content:"今すぐギフトカードを購入してもらいたい。\nAmazonギフト券3万円分を5枚、今日中にコードを教えてくれ。\n理由は後で説明する。誰にも言わないでくれ。\n\n佐藤" },
    ],
    tell:"content",
    reason:"アドレスは本物に見えますが「ギフトカードを購入して」「誰にも言わないで」は100%詐欺の手口（ビジネスメール詐欺）。本物の上司が業務でギフトカードを要求することは絶対にありません。",
  },
  {
    id:"l1", isSuspicious: false,
    from: { name:"佐藤部長", address:"sato.taro@company.co.jp" },
    time:"08:30",
    subject:"今日の14時、A社との打ち合わせ室を予約しておけ",
    bodyParts:[
      { type:"text", content:"第3会議室を14:00〜16:00で押さえておいてくれ。\n参加者：俺、山田、お前の3名。\n以上。" },
    ],
    tell: null,
    reason:"差出人は正規の社内アドレス（@company.co.jp）。リンクも添付もなく、パスワードの要求もありません。",
  },
  {
    id:"l2", isSuspicious: false,
    from: { name:"山田太郎（テクノA社）", address:"yamada@techno-a.co.jp" },
    time:"08:10",
    subject:"来週の定例、資料を共有します",
    bodyParts:[
      { type:"text", content:"お世話になっております。来週火曜の定例に向けて資料を共有します。\nご確認のほどよろしくお願いいたします。\n" },
      { type:"attachment", name:"定例資料_2024Q4.pptx" },
    ],
    tell: null,
    reason:"差出人は取引先の正規アドレス。添付ファイルも .pptx（PowerPoint）で安全な形式です。",
  },
  {
    id:"l3", isSuspicious: false,
    from: { name:"IT管理部", address:"it-admin@company.co.jp" },
    time:"07:50",
    subject:"本日夜間：社内VPNメンテナンスのお知らせ",
    bodyParts:[
      { type:"text", content:"お疲れ様です。IT管理部です。\n本日22:00〜24:00にVPNのメンテナンスを実施します。\nその間はリモートアクセスが利用できません。ご不便をおかけします。" },
    ],
    tell: null,
    reason:"社内の正規アドレスからの通知。パスワードやリンクのクリックを求めておらず、安全なメールです。",
  },
  {
    id:"l4", isSuspicious: false,
    from: { name:"人事部 採用担当", address:"recruit@company.co.jp" },
    time:"08:22",
    subject:"来月の新入社員研修について",
    bodyParts:[
      { type:"text", content:"お疲れ様です。来月の新入社員研修の日程が確定しましたのでお知らせします。\n\n日時：11月5日（火）10:00〜17:00\n場所：本社5F大会議室\n\nご参加をお待ちしております。" },
    ],
    tell: null,
    reason:"社内アドレスからのシンプルな案内メール。リンクも添付もなく安全です。",
  },
];

const MAX_ROUNDS = 6;
const MAX_LIVES  = 3;
const EMAILS_PER_ROUND = 4;

const AVATAR_COLORS = ["#0078d4","#8764b8","#e3008c","#107c10","#ca5010","#5c2d91","#038387","#c19c00"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function startMail(mount, gameId) {
  const state = {
    active:   true,
    round:    1,
    lives:    MAX_LIVES,
    score:    0,
    correct:  0,
    queue:    [],
    current:  null,
    phase:    "judge",  // judge | verdict
    tooltipEl: null,
  };

  const root = el("div.olk-app", {}, [
    // ヘッダー
    el("div.olk-header", {}, [
      el("button.olk-back", { onclick: () => quit() }, [el("span", { text: "←" })]),
      el("div.olk-app-icon", { text: "🛡" }),
      el("div.olk-header-title", { text: "メールセキュリティ" }),
      el("div.olk-header-spacer"),
      el("div.olk-round-badge#olk-round", { text: "ROUND 1 / " + MAX_ROUNDS }),
    ]),

    // ボス反応
    el("div.olk-statusbar", {}, [
      el("img.olk-boss-mini#olk-boss-img", { src:"assets/img/sato_normal.png", alt:"佐藤部長" }),
      el("div.olk-boss-text#olk-boss-bubble", { text:"怪しいメールは即削除。引っかかるな。" }),
      el("div.olk-status-right", {}, [
        el("div.olk-lives#olk-lives", { text:"❤❤❤" }),
        el("div.olk-score#olk-score", { text:"0円" }),
      ]),
    ]),

    // 進捗バー
    el("div.olk-progress-wrap", {}, [el("div.olk-progress-fill#olk-progress")]),

    // メール表示エリア
    el("div.olk-ph-wrap", {}, [
      el("div.olk-ph-envelope#olk-ph-envelope"),
      el("div.olk-ph-verdict#olk-ph-verdict"),
      el("div.olk-ph-actions#olk-ph-actions"),
    ]),

    // ツールチップ
    el("div.olk-tt#olk-tt", {}, [el("div.olk-tt-inner#olk-tt-inner")]),
  ]);

  mount(root);

  const refs = {
    bossImg:    root.querySelector("#olk-boss-img"),
    bossBubble: root.querySelector("#olk-boss-bubble"),
    lives:      root.querySelector("#olk-lives"),
    score:      root.querySelector("#olk-score"),
    round:      root.querySelector("#olk-round"),
    progress:   root.querySelector("#olk-progress"),
    envelope:   root.querySelector("#olk-ph-envelope"),
    verdict:    root.querySelector("#olk-ph-verdict"),
    actions:    root.querySelector("#olk-ph-actions"),
    tt:         root.querySelector("#olk-tt"),
    ttInner:    root.querySelector("#olk-tt-inner"),
  };

  root.addEventListener("click", e => {
    if (!e.target.closest(".olk-inspectable") && !e.target.closest("#olk-tt")) hideTooltip();
  });

  // ── ラウンド ──────────────────────────────────────────────────────
  function startRound() {
    if (!state.active) return;
    if (state.round > MAX_ROUNDS) { finish(true); return; }

    const phishing = pickN(EMAIL_POOL.filter(e => e.isSuspicious), 2);
    const legit    = pickN(EMAIL_POOL.filter(e => !e.isSuspicious), 2);
    state.queue    = shuffle([...phishing, ...legit]);
    refs.round.textContent = "ROUND " + state.round + " / " + MAX_ROUNDS;
    showNext();
  }

  function showNext() {
    if (!state.active) return;
    if (state.queue.length === 0) { state.round++; startRound(); return; }
    state.current = state.queue.shift();
    state.phase   = "judge";
    updateProgress();
    renderEnvelope(state.current);
  }

  function updateProgress() {
    const done = EMAILS_PER_ROUND - state.queue.length;
    refs.progress.style.width = (done / EMAILS_PER_ROUND * 100) + "%";
  }

  // ── メール描画 ────────────────────────────────────────────────────
  function renderEnvelope(email) {
    hideTooltip();
    clear(refs.envelope);
    clear(refs.verdict);
    clear(refs.actions);
    refs.verdict.classList.remove("show");

    // FROM（タップで検査）
    const fromInspect = el("div.olk-ph-from.olk-inspectable", {
      onclick: () => toggleTooltip(fromInspect,
        "📧 送信元アドレス",
        email.from.address,
        email.tell === "from"
      ),
    }, [
      el("div.olk-avatar", { style:{ background: avatarColor(email.from.name) }, text: email.from.name[0] }),
      el("div.olk-ph-from-meta", {}, [
        el("div.olk-ph-from-name", { text: email.from.name }),
        el("div.olk-ph-from-addr", { text: truncate(email.from.address, 30) }),
      ]),
      el("span.olk-inspect-chip", { text:"🔍 確認" }),
    ]);
    refs.envelope.appendChild(fromInspect);

    refs.envelope.appendChild(el("div.olk-ph-subject", { text: email.subject }));
    refs.envelope.appendChild(el("div.olk-ph-time", { text: email.time }));
    refs.envelope.appendChild(el("div.olk-ph-divider"));

    // 本文
    const bodyEl = el("div.olk-ph-body");
    email.bodyParts.forEach(part => {
      if (part.type === "text") {
        bodyEl.appendChild(el("div.olk-ph-text", { text: part.content }));
      } else if (part.type === "link") {
        const linkEl = el("div.olk-ph-link.olk-inspectable", {
          onclick: () => toggleTooltip(linkEl,
            "🔗 実際のリンク先URL",
            part.realUrl,
            email.tell === "link"
          ),
        }, [
          el("span.olk-link-display", { text: part.display }),
          el("span.olk-inspect-chip", { text:"🔍 確認" }),
        ]);
        bodyEl.appendChild(linkEl);
      } else if (part.type === "attachment") {
        const isBadExt = /\.(exe|xlsm|docm|js|vbs|bat|cmd)(\.|$)/i.test(part.name);
        const attEl = el("div.olk-ph-attachment.olk-inspectable", {
          onclick: () => toggleTooltip(attEl,
            "📎 添付ファイル",
            part.name,
            email.tell === "attachment"
          ),
        }, [
          el("span.olk-attach-icon", { text: isBadExt ? "⚠️" : "📄" }),
          el("span.olk-attach-name", { text: part.name }),
          el("span.olk-inspect-chip", { text:"🔍 確認" }),
        ]);
        bodyEl.appendChild(attEl);
      }
    });
    refs.envelope.appendChild(bodyEl);

    // 判定ボタン
    refs.actions.appendChild(
      el("div.olk-judge-btns", {}, [
        el("button.olk-judge-btn.delete", { onclick: () => handleJudge(true) }, [
          el("div.olk-judge-icon", { text:"🗑" }),
          el("div.olk-judge-label", { text:"削除（怪しい）" }),
        ]),
        el("button.olk-judge-btn.safe", { onclick: () => handleJudge(false) }, [
          el("div.olk-judge-icon", { text:"✅" }),
          el("div.olk-judge-label", { text:"安全（受信）" }),
        ]),
      ])
    );
  }

  // ── 判定 ──────────────────────────────────────────────────────────
  function handleJudge(markedSuspicious) {
    if (state.phase !== "judge") return;
    state.phase = "verdict";
    hideTooltip();

    const email   = state.current;
    const correct = markedSuspicious === email.isSuspicious;

    if (correct) {
      const gain = email.isSuspicious ? 15 : 10;
      state.score  += gain;
      state.correct++;
      refs.score.textContent = state.score + "円";
      setBoss("sato_smile", email.isSuspicious ? "見抜いたな。よし。" : "正しい判断だ。");
    } else {
      state.lives--;
      refs.lives.textContent =
        "❤".repeat(Math.max(0, state.lives)) +
        "🖤".repeat(Math.max(0, MAX_LIVES - state.lives));
      setBoss("sato_angry",
        email.isSuspicious ? "引っかかったぞ！フィッシングだ！" : "それは本物だ！誤検知するな！"
      );
    }

    showVerdict(email, correct, !correct && state.lives <= 0);
  }

  function showVerdict(email, correct, isGameOver) {
    // 怪しい箇所をハイライト
    if (email.tell) {
      const map = { from: ".olk-ph-from", link: ".olk-ph-link", attachment: ".olk-ph-attachment", content: ".olk-ph-body" };
      refs.envelope.querySelector(map[email.tell])?.classList.add("tell-highlight");
    }

    clear(refs.verdict);
    refs.verdict.classList.add("show");

    const isPhish = email.isSuspicious;
    const resultText = correct
      ? (isPhish ? "✅ 正解！フィッシングメールを削除しました" : "✅ 正解！安全なメールです")
      : (isPhish ? "❌ フィッシングメールでした！" : "❌ これは安全なメールでした");

    refs.verdict.appendChild(
      el("div.olk-verdict-label." + (correct ? "ok" : "ng"), { text: resultText })
    );
    refs.verdict.appendChild(
      el("div.olk-verdict-reason", { text: "💡 " + email.reason })
    );

    clear(refs.actions);
    if (isGameOver) {
      setTimeout(() => finish(false), 2500);
    } else {
      refs.actions.appendChild(
        el("button.olk-next-btn", { onclick: () => showNext() }, [el("span", { text:"次のメール →" })])
      );
    }
  }

  // ── ツールチップ ──────────────────────────────────────────────────
  function toggleTooltip(anchorEl, label, value, isBad) {
    if (refs.tt.classList.contains("show") && state.tooltipEl === anchorEl) {
      hideTooltip(); return;
    }
    state.tooltipEl = anchorEl;
    clear(refs.ttInner);
    refs.ttInner.appendChild(el("div.olk-tt-label", { text: label }));
    refs.ttInner.appendChild(el("div.olk-tt-value." + (isBad ? "bad" : "good"), { text: value }));
    if (isBad) refs.ttInner.appendChild(el("div.olk-tt-warn", { text:"⚠️ これは怪しい！" }));

    const rect     = anchorEl.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    refs.tt.style.top  = (rect.bottom - rootRect.top + 4) + "px";
    refs.tt.style.left  = "12px";
    refs.tt.style.right = "12px";
    refs.tt.classList.add("show");
  }

  function hideTooltip() {
    refs.tt.classList.remove("show");
    state.tooltipEl = null;
  }

  // ── ユーティリティ ────────────────────────────────────────────────
  function setBoss(img, text) {
    refs.bossImg.src = "assets/img/" + img + ".png";
    refs.bossBubble.textContent = text;
  }

  function truncate(str, n) { return str.length > n ? str.slice(0, n) + "…" : str; }

  function quit() { state.active = false; Router.menu(); }

  function finish(cleared) {
    state.active = false;
    const score = state.score;
    const coins = Math.floor(score / 5);
    let msg, comment;
    if (cleared) {
      msg     = "全" + MAX_ROUNDS + "ラウンド完遂！正解 " + state.correct + "件、" + score + "円。";
      comment = "佐藤部長「なかなかやるな。うちの情報セキュリティは任せた。」";
    } else if (state.correct === 0) {
      msg     = "全問不正解。セキュリティ研修を受けてこい。";
      comment = "佐藤部長「こんなんに引っかかるようじゃ、うちの機密が全部漏れるぞ。」";
    } else {
      msg     = state.round + "ラウンドで脱落（正解 " + state.correct + "件）。";
      comment = "佐藤部長「クリックする前にアドレスをよく確認しろ。」";
    }
    finishGame(gameId, score, coins, msg, {
      isWin:      cleared,
      allowances: [{ name:"フィッシング検出 × " + state.correct, value: score }],
      deductions: [],
      bossComment: comment,
    });
  }

  startRound();
  return { dispose() { state.active = false; } };
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
