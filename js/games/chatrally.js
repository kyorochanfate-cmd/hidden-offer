// =========================================================================
// chatrally.js — チャット・レスポンス・ラリー（Teams風）
// 上司のメッセージに空気を読んだ（忖度した）スタンプを爆速で返すゲーム。
// =========================================================================

import { el, clear, loop, clamp } from "../dom.js?v=1.2.4";
import { Store } from "../state.js?v=1.2.4";
import { Router } from "../app.js?v=1.2.4";
import { finishGame } from "./result.js?v=1.2.4";

// メッセージとお題データ
const PROBLEMS = [
  // 👍 了解（普通の連絡・業務指示）
  { text: "明日の会議、10時に会議室Aで開始するから遅れずに頼むぞ。", answer: "like", sender: "佐藤部長" },
  { text: "今日の週報、なるべく定時までに提出しておいてくれ。", answer: "like", sender: "佐藤部長" },
  { text: "この企画書、後で全員にPDFで共有しておいて。", answer: "like", sender: "佐藤部長" },
  { text: "来週月曜は俺が直行するから、午前中はチャットで連絡してくれ。", answer: "like", sender: "佐藤部長" },
  { text: "全社のパスワード更新期限、今日までだぞ。君もう変えたか？", answer: "like", sender: "佐藤部長" },
  { text: "経費精算の領収書、来週火曜までに必ず出しておけよ。", answer: "like", sender: "佐藤部長" },
  { text: "新人歓迎会の出欠、まだ返事してないだろ。今日中に頼む。", answer: "like", sender: "佐藤部長" },

  // 🙇‍♂️ 謝罪（お叱り・理不尽な要求・ミス指摘）
  { text: "おい、昨日頼んだスライドがまだ共有フォルダに入ってないんだが？", answer: "sorry", sender: "佐藤部長" },
  { text: "送られてきたメール、宛先が競合他社の担当者になってないか…？", answer: "sorry", sender: "佐藤部長" },
  { text: "スライドのフォント、またデフォルトのMSゴシックに戻ってるぞ！", answer: "sorry", sender: "佐藤部長" },
  { text: "今日の朝会、無断欠席してたろ？ 何かあったのか？", answer: "sorry", sender: "佐藤部長" },
  { text: "提出されたデータ、合計値の計算が合わないんだが、検算した？", answer: "sorry", sender: "佐藤部長" },

  // 😂 爆笑忖度（オヤジギャグ・誤字）
  { text: "今日もお疲れ座間でした！ （誤字）", answer: "funny", sender: "佐藤部長" },
  { text: "今からクライアントへ直行直帰（チョッキ）する、チョキチョキ！✌なんちゃって", answer: "funny", sender: "佐藤部長" },
  { text: "会議室が空いてない？ カイギしつ（回避しつ）れしました、ガハハ！", answer: "funny", sender: "佐藤部長" },
  { text: "うちのネコがキーボードを踏んで、全員に『あいうえお』って送っちゃったよ（笑）", answer: "funny", sender: "佐藤部長" },
  { text: "クライアントから電話だ。…って、電話に出んわ！ なんちゃって、ガハハ！", answer: "funny", sender: "佐藤部長" },

  // 🎉 ヨイショ・お祝い（手柄自慢・プライベート自慢・良い報告）
  { text: "実は今月、営業成績で東日本エリアの全社1位を獲得したぞ！", answer: "celebrate", sender: "佐藤部長" },
  { text: "ついに週末、ずっと欲しかった新車が納車されるんだ！最高の気分だよ。", answer: "celebrate", sender: "佐藤部長" },
  { text: "今日の私の役員プレゼン、社長から『素晴らしい』と大絶賛されたよ！", answer: "celebrate", sender: "佐藤部長" },
  { text: "昨日娘が第一志望の大学に合格したんだ！これで一安心だよ。", answer: "celebrate", sender: "佐藤部長" },
  { text: "今期のチーム目標、過去最高値で早期達成だ！みんなのおかげだな！", answer: "celebrate", sender: "佐藤部長" }
];

export function startChatRally(mount, gameId) {
  // ゲーム状態
  const state = {
    mood: 100,            // 忖度ゲージ (0~100)
    combo: 0,             // 連続成功コンボ
    completed: 0,         // 成功したラリー数
    targetCount: 10,      // クリアに必要なラリー数
    active: true,         // ゲーム進行中フラグ
    limitTime: 6.0,       // 現在の制限時間秒（徐々に短くなる）
    remainingTime: 6.0,   // 残り時間
    currentProb: null,    // 現在の問題
    messages: [],         // 表示中のチャット履歴
    earnedCoins: 0,       // 獲得予定のコイン
  };

  // UI 参照オブジェクト
  const refs = {};

  // 画面全体の Teams 風 DOM の構築
  const root = el("div.teams-game", {}, [
    // Teams風パープルヘッダー
    el("div.teams-header", {}, [
      el("button.btn-back", { text: "←", onclick: () => quit() }),
      el("div.title", { text: "Microsoft Teams (忖度チャット)" }),
      el("div", { style: { width: "24px" } }) // バランス用余白
    ]),

    // ステータス・忖度ゲージバー
    el("div.teams-subbar", {}, [
      el("div", { style: { fontWeight: "700", color: "#605e5c" }, text: "忖度ゲージ" }),
      el("div.teams-gauge-container", {}, [
        refs.gauge = el("div.teams-gauge-bar", { style: { width: "100%" } })
      ]),
      refs.combo = el("div", { style: { minWidth: "90px", textAlign: "right", fontWeight: "700", color: "#6264a7" }, text: "Combo: 0" }),
      refs.progress = el("div", { style: { minWidth: "90px", textAlign: "right", fontWeight: "700" }, text: "進捗: 0/10" })
    ]),

    // 制限時間インジケーター（Teams風パープルライン）
    el("div.teams-timer-container", {}, [
      refs.timer = el("div.teams-timer-bar", { style: { width: "100%" } })
    ]),

    // チャットメッセージログ領域
    refs.chatArea = el("div.teams-chat-area"),

    // 下部スタンプリアクションパネル
    el("div.teams-reaction-panel", {}, [
      el("div.teams-reaction-title", { text: "適切な忖度リアクションを選択してください" }),
      el("div.teams-stamps", {}, [
        buildStampBtn("👍", "like", "了解・承知", refs),
        buildStampBtn("🙇‍♂️", "sorry", "平謝り", refs),
        buildStampBtn("😂", "funny", "爆笑忖度", refs),
        buildStampBtn("🎉", "celebrate", "ヨイショ", refs)
      ])
    ])
  ]);

  mount(root);

  // 初期メッセージの投入とゲームループの開始
  addSystemMessage("佐藤部長とのチャットが開始されました。失礼のないように既読即レススタンプで対応してください。");
  
  // 1秒待ってから最初のお題を開始
  let startTimer = setTimeout(() => {
    if (state.active) nextProblem();
  }, 1000);

  // タイマー更新ループ
  const gameLoop = loop((dt) => {
    if (!state.active || !state.currentProb) return;

    state.remainingTime -= dt;
    const pct = clamp((state.remainingTime / state.limitTime) * 100, 0, 100);
    refs.timer.style.width = pct + "%";

    if (state.remainingTime <= 0) {
      // 時間切れ（既読スルー）
      handleTimeout();
    }
  });

  // --- 内部ヘルパー関数群 ---

  function quit() {
    if (confirm("ゲームを中断してメニューに戻りますか？")) {
      cleanup();
      Router.menu();
    }
  }

  function cleanup() {
    state.active = false;
    clearTimeout(startTimer);
    gameLoop.stop();
  }

  function buildStampBtn(emoji, value, label, refsObj) {
    const btn = el("button.teams-stamp-btn", {
      onclick: () => submitAnswer(value)
    }, [
      el("span", { text: emoji }),
      el("span.teams-stamp-label", { text: label })
    ]);
    if (!refsObj.stampBtns) refsObj.stampBtns = [];
    refsObj.stampBtns.push({ btn, value });
    return btn;
  }

  function setStampsDisabled(disabled) {
    if (refs.stampBtns) {
      refs.stampBtns.forEach(item => item.btn.disabled = disabled);
    }
  }

  function addSystemMessage(text) {
    const msg = el("div.teams-msg.system", {}, [
      el("div.teams-msg-content", {}, [
        el("div.teams-bubble", { text })
      ])
    ]);
    refs.chatArea.appendChild(msg);
    scrollToBottom();
  }

  function addBossMessage(sender, text) {
    // 佐藤部長ならボス顔、他はテキスト頭文字
    const isBoss = sender === "佐藤部長";
    const avatarContent = isBoss 
      ? el("img", { src: "assets/img/sato_normal.png", alt: "B" })
      : el("span", { text: sender.slice(-2) });

    const msg = el("div.teams-msg", {}, [
      el("div.teams-avatar", { style: { background: isBoss ? "transparent" : "#6264a7" } }, [avatarContent]),
      el("div.teams-msg-content", {}, [
        el("div.teams-msg-header", {}, [
          el("span.teams-sender-name", { text: sender }),
          el("span.teams-timestamp", { text: getNowTimeStr() })
        ]),
        el("div.teams-bubble", { text })
      ])
    ]);

    refs.chatArea.appendChild(msg);
    scrollToBottom();
  }

  function addPlayerMessage(stampEmoji, label) {
    const msg = el("div.teams-msg", { style: { flexDirection: "row-reverse" } }, [
      el("div.teams-avatar", { style: { background: "#107c41" } }, [el("span", { text: "私" })]),
      el("div.teams-msg-content", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end" } }, [
        el("div.teams-msg-header", { style: { flexDirection: "row-reverse" } }, [
          el("span.teams-sender-name", { text: "あなた" }),
          el("span.teams-timestamp", { text: getNowTimeStr() })
        ]),
        el("div.teams-bubble", { 
          style: { background: "#eef1fc", borderColor: "#c8d1f2", borderRadius: "8px 0 8px 8px" }, 
          text: `（スタンプ送信） ${stampEmoji} ${label}`
        })
      ])
    ]);

    refs.chatArea.appendChild(msg);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      refs.chatArea.scrollTop = refs.chatArea.scrollHeight;
    });
  }

  function getNowTimeStr() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }

  // お題更新
  function nextProblem() {
    if (!state.active) return;
    setStampsDisabled(false);

    // 未出題の中から重複しないようにランダム選定
    const filtered = PROBLEMS.filter(p => p !== state.currentProb);
    const prob = filtered[Math.floor(Math.random() * filtered.length)];
    state.currentProb = prob;

    // 難易度調整: 進行数に応じて制限時間を短縮 (6.0秒から最小2.8秒へ)
    state.limitTime = Math.max(2.8, 6.0 - state.completed * 0.35);
    state.remainingTime = state.limitTime;

    addBossMessage(prob.sender, prob.text);
  }

  // プレイヤーのスタンプ送信判定
  function submitAnswer(value) {
    if (!state.active || !state.currentProb) return;
    
    // 一時的に連続連打防止
    setStampsDisabled(true);

    const prob = state.currentProb;
    state.currentProb = null;

    const stampMap = {
      like: { emoji: "👍", label: "承知いたしました！" },
      sorry: { emoji: "🙇‍♂️", label: "大変申し訳ございません！即座に対応します！" },
      funny: { emoji: "😂", label: "ハハハ！面白すぎます部長！" },
      celebrate: { emoji: "🎉", label: "おめでとうございます！さすが部長です！" }
    };
    const userStamp = stampMap[value];
    addPlayerMessage(userStamp.emoji, userStamp.label);

    if (prob.answer === value) {
      // 忖度成功
      state.combo += 1;
      state.completed += 1;
      // 機嫌少し回復
      state.mood = Math.min(100, state.mood + 5);
      
      // 画面表示更新
      refs.combo.textContent = `Combo: ${state.combo}`;
      refs.progress.textContent = `進捗: ${state.completed}/${state.targetCount}`;
      updateMoodGauge();

      if (state.completed >= state.targetCount) {
        // 10ラリー完遂でゲームクリア！
        setTimeout(handleWin, 800);
      } else {
        // 次の問題へ
        setTimeout(nextProblem, 1000);
      }
    } else {
      // 忖度失敗（空気を読めなかった）
      state.combo = 0;
      refs.combo.textContent = "Combo: 0";
      
      // 部長の機嫌が大幅減少 (-30)
      state.mood = Math.max(0, state.mood - 30);
      updateMoodGauge();

      const angerTexts = [
        "佐藤部長「……？ 今のスタンプの意図は何だかね？」",
        "佐藤部長「本当にチャット内容を読んでリアクションしているか？」",
        "佐藤部長「ふざけているのか？ 失礼だぞ！」"
      ];
      addBossMessage("佐藤部長", angerTexts[Math.floor(Math.random() * angerTexts.length)]);

      if (state.mood <= 0) {
        setTimeout(handleLose, 800);
      } else {
        setTimeout(nextProblem, 1200);
      }
    }
  }

  // 時間切れ（既読スルー）
  function handleTimeout() {
    state.currentProb = null;
    setStampsDisabled(true);
    state.combo = 0;
    refs.combo.textContent = "Combo: 0";

    // 機嫌減少 (-25)
    state.mood = Math.max(0, state.mood - 25);
    updateMoodGauge();

    addBossMessage("佐藤部長", "佐藤部長「既読スルーか？ レスポンスは秒速で行うのが社会人のマナーだろう！」");

    if (state.mood <= 0) {
      setTimeout(handleLose, 800);
    } else {
      setTimeout(nextProblem, 1200);
    }
  }

  function updateMoodGauge() {
    refs.gauge.style.width = state.mood + "%";
    if (state.mood < 40) {
      refs.gauge.classList.add("warning");
    } else {
      refs.gauge.classList.remove("warning");
    }
  }

  // クリア
  function handleWin() {
    cleanup();

    // 給与計算式（完全歩合制、単価5）
    const completedPay = state.completed * 5; // 10回成功 * 5 = 50
    const deductionVal = 5;
    state.earnedCoins = Math.max(0, completedPay - deductionVal);

    let comment = "";
    if (state.mood >= 80) {
      comment = "佐藤部長「素晴らしい！君のレスポンス速度は我が部でナンバーワンだ。スタンプの忖度具合も芸術の域に達している。」";
    } else if (state.mood >= 50) {
      comment = "佐藤部長「まあまあだな。大きな遅滞なくレスポンスできていた。引き続き上司への忖度を怠らないように。」";
    } else {
      comment = "佐藤部長「なんとか終わらせたな。いくつかヒヤッとするスタンプミスがあったぞ。次回からは猛省して取り組むように。」";
    }

    const details = {
      isWin: true,
      allowances: [
        { name: `忖度対応 × ${state.completed}`, value: completedPay }
      ],
      deductions: [
        { name: "お祈り保険料", value: 2 },
        { name: "忖度維持管理費", value: 3 }
      ],
      bossComment: comment
    };

    const score = state.completed * 100 + Math.floor(state.mood) + state.combo * 10;
    const msg = `定時退社！\n上司の理不尽チャットを見事に忖度しきりました。`;

    finishGame(gameId, score, state.earnedCoins, msg, details);
  }

  // 業務終了（クビはなし）
  function handleLose() {
    cleanup();

    const completedPay = state.completed * 5;
    const deductionVal = state.completed > 0 ? 5 : 0;
    const coins = Math.max(0, completedPay - deductionVal);

    const details = {
      isWin: true,
      allowances: [
        { name: `忖度対応 × ${state.completed}`, value: completedPay }
      ],
      deductions: [
        { name: "お祈り保険料", value: 2 },
        { name: "忖度維持管理費", value: 3 }
      ],
      bossComment: "佐藤部長「レスポンスが遅すぎるぞ！今日はこれ以上チャットに入らなくていい。また明日出直してきなさい。」"
    };

    const score = state.completed * 100;
    const msg = "上司の機嫌が限界に達し、チャットラリーが終了しました。";

    finishGame(gameId, score, coins, msg, details);
  }
}
