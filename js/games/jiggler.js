// =========================================================================
// jiggler.js — マウス・ジグラー：生存証明
// 仕様：在席ステータス（緑）を維持しながら、どれだけサボれるか（プラモ作成）を競う。
//      【新UI】上半分：PC画面、下半分左：マウスパッド、下半分右：さぼり(ドット絵＆工作演出)
// =========================================================================

import { el, clear, loop, clamp, pick } from "../dom.js?v=1.0.6";
import { Router } from "../app.js?v=1.0.6";
import { finishGame } from "./result.js?v=1.0.6";
import { SVG_WORKER } from "../art.js?v=1.0.6";

// プラモデルお題
const SABORI_MODELS = [
  "HG ギラ・ドーガ",
  "1/12 オフィスデスク",
  "超合金 佐藤部長",
  "ミニ四駆 アバンテ",
  "佐藤部長の胸像（金メッキ仕様）",
  "1/24 オフィスチェア（エルゴ）",
  "MG サザビー（サボり専用モデル）",
  "ドット絵職人のキーボード",
];

// 突発チャットお題
const CHAT_QUESTIONS = [
  { sender: "佐藤部長", text: "〇〇さん、昨日頼んだスライドどうなった？" },
  { sender: "佐藤部長", text: "今日の進捗、今すぐチャットで教えて。" },
  { sender: "佐藤部長", text: "今週の週報がまだ未提出だが、忘れているかね？" },
  { sender: "佐藤部長", text: "今日の役員会議、Teamsの会議URLを送ってくれ。" },
  { sender: "佐藤部長", text: "Teamsのステータス、さっきからずっと黄色（離席）だよ？" },
  { sender: "同僚 田中", text: "急報！佐藤部長がさっき君の席を探してたぞ！" },
  { sender: "佐藤部長", text: "〇〇くん、今電話してもいいかね？" },
];

const CHAT_REPLIES = [
  "承知いたしました！ただいま確認します！",
  "すぐにお送りいたします！少々お待ちください！",
  "すみません、今すぐ対応いたします！",
  "大変失礼しました、PCが一時的にフリーズしておりました！",
  "承知いたしました！即座に折り返します！",
];

const WORK_EFFECT_ICONS = ["🔧", "🔨", "🎨", "✏️", "🪛", "⚙️", "✨"];

export function startJiggler(mount, gameId) {
  // ゲーム状態
  const state = {
    active: true,
    elapsed: 0,
    mood: 80,                 // 在席ゲージ (0〜100)
    saboriProgress: 0,        // さぼり（プラモ）進捗 (0〜100)
    completed: 0,             // 完成させたプラモ数
    currentModel: pick(SABORI_MODELS),
    
    // サボり状態
    isSaboring: false,
    decayNormal: 7.0,         // 通常時の在席ゲージ減少率 /秒
    decaySabori: 22.0,        // サボり時の減少率 /秒 (約3倍)
    
    // チャット奇襲状態
    chatActive: false,
    chatSender: "",
    chatText: "",
    chatTimer: 0.0,
    chatLimit: 3.5,           // チャットの返信猶予秒（時間とともに短くする）
    chatReplyText: "",
    nextChatDelay: 6.0,       // 次のチャットまでの秒数
    
    // マウスドラッグ用
    mouseX: 50,
    mouseY: 50,
    isDragging: false,
    
    // エフェクト用タイマー
    effectTimer: 0.0,
  };

  // 画面構築
  const screen = el("div.jig-game", {}, [
    // PCモニターのベゼルヘッダー
    el("div.jig-titlebar", {}, [
      el("button.pbtn.outline", { 
        style: { padding: "4px 8px", fontSize: "11px", minWidth: "auto" }, 
        onclick: () => quit(false) 
      }, [el("span", { text: "← メニュー" })]),
      el("div.jig-filename", { text: "在席維持工作システム v1.1.0" }),
      el("div.jig-clock#jig-timer", { text: "0:00" }),
    ]),

    // 上半分：Teams アプリ UI
    el("div.teams-window", {}, [
      // Teams Top Bar
      el("div.teams-top-bar", {}, [
        el("div.teams-title", { text: "Microsoft Teams (リモートワーク用)" }),
        el("div.teams-search-bar", { text: "🔍 検索 (またはコマンドの入力)" }),
        el("div.teams-profile-wrap", {}, [
          el("div.teams-profile-avatar", { text: "自" }),
          el("div.teams-profile-status#jig-lamp", { class: "active" })
        ])
      ]),
      
      // Teams Main Area
      el("div.teams-main", {}, [
        // App Rail (サイドバー)
        el("div.teams-app-rail", {}, [
          el("div.rail-item.active", {}, [
            el("span", { text: "💬" }),
            el("div.rail-badge#teams-badge", { text: "1", style: { display: "none" } })
          ]),
          el("div.rail-item", {}, [el("span", { text: "🔔" })]),
          el("div.rail-item", {}, [el("span", { text: "👥" })]),
          el("div.rail-item", {}, [el("span", { text: "📅" })])
        ]),
        
        // Chat List (チャット履歴一覧)
        el("div.teams-chat-list", {}, [
          el("div.chat-list-item.active", {}, [
            el("div.chat-avatar", { text: "佐" }),
            el("div.chat-info", {}, [
              el("div.chat-name", { text: "佐藤部長" }),
              el("div.chat-preview#teams-preview", { text: "昨日のスライドの件..." })
            ]),
            el("div.chat-status-dot.available")
          ]),
          el("div.chat-list-item", {}, [
            el("div.chat-avatar", { text: "田" }),
            el("div.chat-info", {}, [
              el("div.chat-name", { text: "田中さん" }),
              el("div.chat-preview", { text: "承知いたしました。" })
            ]),
            el("div.chat-status-dot.away")
          ])
        ]),
        
        // Chat Room (佐藤部長との会話画面)
        el("div.teams-chat-room", {}, [
          // Room Header & Monitor Banner
          el("div.teams-room-header", {}, [
            el("div.room-title-wrap", {}, [
              el("span.room-name", { text: "佐藤部長" }),
              el("span.room-status#jig-lamp-text", { text: "連絡可能" })
            ]),
            // 在席維持レベル (PC監視システムバナー)
            el("div.teams-monitor-banner", {}, [
              el("span.teams-monitor-label", { text: "在席維持:" }),
              el("span.teams-monitor-val#jig-mood-val", { text: "80%" }),
              el("div.teams-monitor-track", {}, [
                el("div.teams-monitor-fill#jig-mood-fill", { style: { width: "80%" } })
              ])
            ])
          ]),
          
          // Messages Container (チャットメッセージ履歴)
          el("div.teams-messages-container#teams-messages", {}),
          
          // Bottom Input Area Mockup
          el("div.teams-input-bar", {}, [
            el("div.teams-input-placeholder", { text: "佐藤部長への返信を入力してください..." })
          ])
        ])
      ])
    ]),

    // 下半分：物理デスク（スプリット）
    el("div.jig-desk-split", {}, [
      // 下左：仮想マウス操作スペース
      el("div.jig-mouse-area#jig-desktop", {}, [
        el("div.jig-desktop-label", { text: "■ 仮想マウスパッド (スワイプして動かせ！)" }),
        
        // 仮想マウス
        el("div.jig-virtual-mouse#jig-mouse", {
          style: { left: "50px", top: "50px" }
        }, [
          el("div.jig-mouse-wheel")
        ]),
      ]),

      // 下右：サボり工作エリア
      el("div.jig-sabori-area#jig-sabori-area", {}, [
        // 工作進捗表示
        el("div.jig-sabori-header", {}, [
          el("div.jig-sabori-title#jig-model-title", { text: state.currentModel }),
          el("div.jig-sabori-val-row", {}, [
            el("span", { text: "工作進捗" }),
            el("span#jig-sabori-val", { text: "0%" })
          ]),
          el("div.jig-track", { style: { height: "6px" } }, [
            el("div.jig-fill.sabori#jig-sabori-fill", { style: { width: "0%" } })
          ])
        ]),

        // キャラクタードット絵展示エリア
        el("div.jig-worker-showcase#jig-showcase", {}, [
          el("img.jig-worker-image#jig-worker-img", {
            src: "assets/img/jig_working.png"
          })
        ]),

        // さぼりボタン
        el("button.pbtn.purple.jig-sabori-btn#jig-sabori-btn", {}, [
          el("span", { text: "プラモを作る" })
        ])
      ])
    ])
  ]);

  mount(screen);

  // DOM 参照
  const refs = {
    timer: screen.querySelector("#jig-timer"),
    lamp: screen.querySelector("#jig-lamp"),
    lampText: screen.querySelector("#jig-lamp-text"),
    count: screen.querySelector("#jig-count"),
    moodFill: screen.querySelector("#jig-mood-fill"),
    moodVal: screen.querySelector("#jig-mood-val"),
    modelTitle: screen.querySelector("#jig-model-title"),
    saboriFill: screen.querySelector("#jig-sabori-fill"),
    saboriVal: screen.querySelector("#jig-sabori-val"),
    desktop: screen.querySelector("#jig-desktop"),
    mouse: screen.querySelector("#jig-mouse"),
    saboriBtn: screen.querySelector("#jig-sabori-btn"),
    saboriArea: screen.querySelector("#jig-sabori-area"),
    workerImg: screen.querySelector("#jig-worker-img"),
    showcase: screen.querySelector("#jig-showcase"),
    // 新規 Teams UI 用
    messagesContainer: screen.querySelector("#teams-messages"),
    teamsBadge: screen.querySelector("#teams-badge"),
    teamsPreview: screen.querySelector("#teams-preview"),
    chatTimerFill: null
  };

  // --- キャラクターの状況画像切り替え ---
  function updateWorkerVisual() {
    let imgPath = "assets/img/jig_working.png"; // デフォルト：仕事中
    
    if (state.chatActive || state.mood < 30) {
      imgPath = "assets/img/jig_pinch.jpg";     // チャット襲来、または離席ピンチ警告
    } else if (state.isSaboring) {
      imgPath = "assets/img/jig_saboring.png";   // サボり中
    }
    
    if (refs.workerImg && refs.workerImg.getAttribute("src") !== imgPath) {
      refs.workerImg.src = imgPath;
    }
  }

  // --- Teams初期チャットメッセージの追加 ---
  const initialHistory = [
    { sender: "佐藤部長", text: "おはよう。本日も各自リモートワークに励むように。", time: "昨日 9:00", isBoss: true },
    { sender: "自分", text: "おはようございます。了解いたしました。本日もよろしくお願いいたします。", time: "昨日 9:02", isBoss: false },
    { sender: "佐藤部長", text: "昨日のスライド職人の進捗だが、進み具合はどうだ？", time: "昨日 14:15", isBoss: true },
    { sender: "自分", text: "順調に進んでおります。本日中に報告いたします。", time: "昨日 14:18", isBoss: false }
  ];

  function appendMessage(sender, text, time, isBoss) {
    const avatarChar = isBoss ? "佐" : "自";
    const avatarClass = isBoss ? "boss" : "me";
    const msgClass = isBoss ? "" : "my-message";
    
    const msgNode = el(`div.teams-msg.${msgClass}`, {}, [
      el(`div.teams-msg-avatar.${avatarClass}`, { text: avatarChar }),
      el("div.teams-msg-content", {}, [
        el("div.teams-msg-meta", {}, [
          el("span.teams-msg-sender", { text: sender }),
          el("span.teams-msg-time", { text: time })
        ]),
        el("div.teams-msg-text", { text: text })
      ])
    ]);
    
    refs.messagesContainer.appendChild(msgNode);
    refs.messagesContainer.scrollTop = refs.messagesContainer.scrollHeight;
  }

  // 初期メッセージ描画
  initialHistory.forEach(h => appendMessage(h.sender, h.text, h.time, h.isBoss));

  // --- ドラッグ操作の実装 (仮想マウスパッド) ---
  const pad = refs.desktop;
  
  const startDrag = (e) => {
    if (!state.active) return;
    state.isDragging = true;
    updateMousePos(e);
    e.preventDefault();
  };

  const doDrag = (e) => {
    if (!state.isDragging || !state.active) return;
    updateMousePos(e);
  };

  const stopDrag = () => {
    state.isDragging = false;
  };

  function updateMousePos(e) {
    const rect = pad.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // マウス幅（30px, 40px）を考慮してクランプ
    const x = clamp(clientX - rect.left - 15, 0, rect.width - 30);
    const y = clamp(clientY - rect.top - 20, 0, rect.height - 40);

    // 動かした距離を計算
    const dist = Math.hypot(x - state.mouseX, y - state.mouseY);
    if (dist > 3) {
      // 在席メーターを小刻みに回復
      state.mood = Math.min(100, state.mood + dist * 0.25);
      updateMoodUI();
      
      // マウス本体を小刻みに揺らすエフェクト
      refs.mouse.classList.remove("jiggle-shake");
      void refs.mouse.offsetWidth;
      refs.mouse.classList.add("jiggle-shake");
    }

    state.mouseX = x;
    state.mouseY = y;
    refs.mouse.style.left = x + "px";
    refs.mouse.style.top = y + "px";
  }

  pad.addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", doDrag);
  window.addEventListener("mouseup", stopDrag);

  pad.addEventListener("touchstart", startDrag, { passive: false });
  window.addEventListener("touchmove", doDrag, { passive: false });
  window.addEventListener("touchend", stopDrag);

  // --- サボるボタン (長押しイベント) ---
  const startSabori = (e) => {
    if (!state.active) return;
    state.isSaboring = true;
    refs.saboriBtn.classList.add("active");
    refs.saboriArea.classList.add("active");
    if (refs.workerImg) refs.workerImg.classList.add("saboring");
    updateWorkerVisual();
    e.preventDefault();
  };

  const endSabori = () => {
    state.isSaboring = false;
    refs.saboriBtn.classList.remove("active");
    refs.saboriArea.classList.remove("active");
    if (refs.workerImg) refs.workerImg.classList.remove("saboring");
    updateWorkerVisual();
  };

  refs.saboriBtn.addEventListener("mousedown", startSabori);
  refs.saboriBtn.addEventListener("mouseup", endSabori);
  refs.saboriBtn.addEventListener("mouseleave", endSabori);

  refs.saboriBtn.addEventListener("touchstart", startSabori, { passive: false });
  refs.saboriBtn.addEventListener("touchend", endSabori);

  // --- 爆速返信アクション ---
  function submitReply() {
    if (!state.active || !state.chatActive) return;
    state.chatActive = false;

    // 返信エリアを消去
    const replyBox = refs.messagesContainer.querySelector("#teams-reply-box");
    if (replyBox) {
      replyBox.remove();
    }

    // Teams UIの通知やプレビューをリセット
    if (refs.teamsBadge) {
      refs.teamsBadge.style.display = "none";
    }
    if (refs.teamsPreview) {
      refs.teamsPreview.textContent = state.chatReplyText;
      refs.teamsPreview.style.fontWeight = "normal";
      refs.teamsPreview.style.color = "#a19f9d";
    }

    // 自分の返答メッセージを追加
    appendMessage("自分", state.chatReplyText, "たった今", false);
    
    // 在席メーター大幅回復
    state.mood = Math.min(100, state.mood + 20);
    updateMoodUI();
    
    // 次のチャット遅延をランダム設定
    state.nextChatDelay = 7.0 + Math.random() * 8.0;
    updateWorkerVisual();
  }

  // UI更新用
  function updateMoodUI() {
    if (refs.moodFill) refs.moodFill.style.width = state.mood + "%";
    if (refs.moodVal) refs.moodVal.textContent = Math.floor(state.mood) + "%";
    
    if (state.mood < 30) {
      if (refs.moodFill) refs.moodFill.style.background = "var(--danger)";
      if (refs.lamp) refs.lamp.className = "teams-profile-status warning";
      if (refs.lampText) refs.lampText.textContent = "警告 (離席寸前)";
    } else {
      if (refs.moodFill) refs.moodFill.style.background = "var(--ok)";
      if (refs.lamp) refs.lamp.className = "teams-profile-status active";
      if (refs.lampText) refs.lampText.textContent = "連絡可能";
    }
    updateWorkerVisual();
  }

  // 工作中のエフェクト生成
  function spawnWorkEffect() {
    const icon = pick(WORK_EFFECT_ICONS);
    const fx = el("div.jig-work-effect", { text: icon });
    
    // キャラクターの周りにランダム配置
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 40;
    fx.style.left = (40 + offsetX) + "px";
    fx.style.top = (40 + offsetY) + "px";
    
    refs.showcase.appendChild(fx);
    setTimeout(() => fx.remove(), 800);
  }

  // --- メインゲームループ ---
  const gameLoop = loop((dt) => {
    if (!state.active) return;

    state.elapsed += dt;
    
    // 時計表示
    const m = Math.floor(state.elapsed / 60);
    const s = Math.floor(state.elapsed % 60);
    refs.timer.textContent = `${m}:${String(s).padStart(2, "0")}`;

    // --- 1. 在席メーターの減少 ---
    const timeFactor = 1.0 + (state.elapsed * 0.0035);
    const decayRate = (state.isSaboring ? state.decaySabori : state.decayNormal) * timeFactor;
    
    // チャット奇襲中以外は在席メーターが時間減少
    if (!state.chatActive) {
      state.mood = clamp(state.mood - decayRate * dt, 0, 100);
      updateMoodUI();
    }

    if (state.mood <= 0) {
      quit(true, "away");
      return;
    }

    // --- 2. サボり（工作）の進行 ---
    if (state.isSaboring && !state.chatActive) {
      state.saboriProgress = clamp(state.saboriProgress + 20 * dt, 0, 100);
      refs.saboriFill.style.width = state.saboriProgress + "%";
      refs.saboriVal.textContent = Math.floor(state.saboriProgress) + "%";

      // 工作エフェクト生成タイマー
      state.effectTimer += dt;
      if (state.effectTimer >= 0.25) {
        state.effectTimer = 0.0;
        spawnWorkEffect();
      }

      if (state.saboriProgress >= 100) {
        state.completed += 1;
        state.saboriProgress = 0;
        refs.count.textContent = `プラモ完成: ${state.completed}`;
        
        // 次のモデル
        state.currentModel = pick(SABORI_MODELS);
        refs.modelTitle.textContent = state.currentModel;
        
        // 進捗フラッシュ
        refs.saboriFill.classList.add("flash");
        setTimeout(() => refs.saboriFill.classList.remove("flash"), 300);
      }
    }

    // --- 3. チャット奇襲の発生＆タイマー処理 ---
    if (!state.chatActive) {
      state.nextChatDelay -= dt;
      if (state.nextChatDelay <= 0) {
        triggerChat();
      }
    } else {
      state.chatTimer -= dt;
      const pct = clamp((state.chatTimer / state.chatLimit) * 100, 0, 100);
      if (refs.chatTimerFill) {
        refs.chatTimerFill.style.width = pct + "%";
      }

      if (state.chatTimer <= 0) {
        quit(true, "ignored");
      }
    }
  });

  function triggerChat() {
    state.chatActive = true;
    const q = pick(CHAT_QUESTIONS);
    state.chatSender = q.sender;
    state.chatText = q.text;
    
    state.chatLimit = Math.max(1.8, 3.5 - state.completed * 0.15);
    state.chatTimer = state.chatLimit;

    // 佐藤部長の問い詰めメッセージをチャットに追加
    appendMessage(q.sender, q.text, "たった今", true);

    // Teams UIの通知バッジ表示とプレビュー更新
    if (refs.teamsBadge) {
      refs.teamsBadge.style.display = "flex";
      refs.teamsBadge.textContent = "1";
    }
    if (refs.teamsPreview) {
      refs.teamsPreview.textContent = q.text;
      refs.teamsPreview.style.fontWeight = "bold";
      refs.teamsPreview.style.color = "#fff";
    }

    // 返信選択肢を決定
    state.chatReplyText = pick(CHAT_REPLIES);

    // インライン返信枠をチャット末尾に追加
    const replyBox = el("div.teams-inline-reply-box#teams-reply-box", {}, [
      el("div.teams-countdown-track", {}, [
        el("div.teams-countdown-fill#jig-chat-timer-fill", { style: { width: "100%" } })
      ]),
      el("div.teams-reply-actions", {}, [
        el("button.teams-reply-btn#jig-reply-btn", {
          // clickとtouchstartを両方バインドし、バブリングとデフォルト挙動を遮断する
          onclick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            submitReply();
          },
          ontouchstart: (e) => {
            e.preventDefault();
            e.stopPropagation();
            submitReply();
          }
        }, [
          el("span", { text: `💬 返信: 「${state.chatReplyText}」` })
        ])
      ])
    ]);

    refs.messagesContainer.appendChild(replyBox);
    refs.messagesContainer.scrollTop = refs.messagesContainer.scrollHeight;

    // タイマーバーの参照を動的に設定
    refs.chatTimerFill = replyBox.querySelector("#jig-chat-timer-fill");
    updateWorkerVisual();
  }

  function quit(forced, reason) {
    state.active = false;
    gameLoop.stop();
    window.removeEventListener("mousemove", doDrag);
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", doDrag);
    window.removeEventListener("touchend", stopDrag);

    const unitPrice = 5;
    const saboriPay = state.completed * unitPrice;
    const deductionVal = state.completed > 0 ? 5 : 0;
    const coins = Math.max(0, saboriPay - deductionVal);
    const score = state.completed * 200 + Math.floor(state.elapsed) * 10;
    
    const mins = Math.floor(state.elapsed / 60);
    const secs = Math.floor(state.elapsed % 60);
    const elapsedStr = `${mins}分${secs}秒`;

    let msg = "";
    let details = {};

    if (state.completed === 0) {
      msg = `サボり成果がないまま退勤（生存時間: ${elapsedStr}）。無労働のため支給はありません。`;
      details = {
        allowances: [],
        deductions: [],
        bossComment: "佐藤部長「在席ステータスは緑だったが、何の成果物もないとはどういうことだね？まさか遊んでいたんじゃないだろうな。」"
      };
    } else {
      let comment = "";
      if (reason === "away") {
        msg = `ステータスが「離席中」になり、サボりが発覚（生存時間: ${elapsedStr}）。`;
        comment = `佐藤部長「おい！就業時間中にステータスが離席中になっていたぞ！会社のPCランプを緑に保つことすらできないのかね！大体、机の上のプラモはなんだ！」`;
      } else if (reason === "ignored") {
        msg = `部長からの緊急チャットを既読スルーし、サボりが発覚（生存時間: ${elapsedStr}）。`;
        comment = `佐藤部長「チャットを送ったのに返信が一切ないとは何事かね！在席の緑ステータスは偽装だったのか！すぐに私の席に来なさい！」`;
      } else {
        msg = `サボりきって無事に定時退勤（生存時間: ${elapsedStr}）。`;
        comment = `佐藤部長「うむ、終日在席して非常によく頑張ってくれた。PCランプが常に緑で安心したぞ。この調子で明日も業務（？）に励み給え。」`;
      }

      details = {
        allowances: [
          { name: `サボり成果（工作） × ${state.completed}`, value: saboriPay }
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

  return {
    dispose() {
      state.active = false;
      gameLoop.stop();
      window.removeEventListener("mousemove", doDrag);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", doDrag);
      window.removeEventListener("touchend", stopDrag);
    }
  };
}
