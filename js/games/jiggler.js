// =========================================================================
// jiggler.js — マウス・ジグラー：生存証明
// 仕様：在席ステータス（緑）を維持しながら、どれだけサボれるか（プラモ作成）を競う。
//      【新UI】上半分：PC画面、下半分左：マウスパッド、下半分右：さぼり(ドット絵＆工作演出)
// =========================================================================

import { el, clear, loop, clamp, pick } from "../dom.js?v=1.2.0";
import { Router } from "../app.js?v=1.2.0";
import { finishGame } from "./result.js?v=1.2.0";
import { SVG_WORKER } from "../art.js?v=1.2.0";

// サボりのお題（ありがちな内職・現実逃避）
const SABORI_MODELS = [
  "スマホでSNS",
  "ネットサーフィン",
  "転職サイト閲覧",
  "ぼんやり妄想",
  "デスクで内職",
  "Amazon の買い物",
  "競馬の予想",
  "副業の確定申告",
];

// 突発チャットお題（sender ごとに振り分けてチャンネルに着信）
const CHAT_QUESTIONS = [
  { sender: "佐藤部長", text: "〇〇さん、昨日頼んだスライドどうなった？" },
  { sender: "佐藤部長", text: "今日の進捗、今すぐチャットで教えて。" },
  { sender: "佐藤部長", text: "今週の週報がまだ未提出だが、忘れているかね？" },
  { sender: "佐藤部長", text: "今日の役員会議、Teamsの会議URLを送ってくれ。" },
  { sender: "佐藤部長", text: "Teamsのステータス、さっきからずっと黄色（離席）だよ？" },
  { sender: "佐藤部長", text: "〇〇くん、今電話してもいいかね？" },
  // 田中さん（25秒以降）
  { sender: "同僚 田中ゆかり", text: "急報！佐藤部長がさっき君の席を探してたぞ！" },
  { sender: "同僚 田中ゆかり", text: "あの件、今日中にレビューしてもらえる？" },
  { sender: "同僚 田中ゆかり", text: "ランチどうする？社食でいい？" },
  { sender: "同僚 田中ゆかり", text: "資料の3ページ目、誤字あるかも。確認してー。" },
  // 人事部（55秒以降）
  { sender: "人事部 山下", text: "出勤打刻が今朝ありません。至急ご対応ください。" },
  { sender: "人事部 山下", text: "コンプライアンス研修の受講期限が本日です。" },
  { sender: "人事部 山下", text: "ストレスチェック未回答です。本日中にご対応を。" },
];

const CHAT_REPLIES = [
  "承知いたしました！ただいま確認します！",
  "すぐにお送りいたします！少々お待ちください！",
  "すみません、今すぐ対応いたします！",
  "大変失礼しました、PCが一時的にフリーズしておりました！",
  "承知いたしました！即座に折り返します！",
];

const WORK_EFFECT_ICONS = ["🔧", "🔨", "🎨", "✏️", "🪛", "⚙️", "✨"];

// チャンネル定義（複数の人からの Teams DM をシミュレート）
const CHANNELS = {
  sato:   { name: "佐藤部長",       icon: "佐", color: "#ec6a3c", unlockAt: 0   },
  tanaka: { name: "田中ゆかりさん", icon: "田", color: "#d23b8a", unlockAt: 25  },
  hr:     { name: "人事部 山下",    icon: "人", color: "#107c41", unlockAt: 55  },
};
function senderToChannelId(sender) {
  if (sender.includes("佐藤"))  return "sato";
  if (sender.includes("田中"))  return "tanaka";
  if (sender.includes("人事"))  return "hr";
  if (sender.includes("システム")) return "hr";
  return "sato";
}

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

    // 複数チャンネル
    activeChannel: "sato",
    pendingChannel: null,     // 現在の奇襲が起きてるチャンネル
    channels: {
      sato:   { unread: 0, preview: "（まだメッセージなし）" },
      tanaka: { unread: 0, preview: "" },
      hr:     { unread: 0, preview: "" },
    },
    
    // マウスドラッグ用
    mouseX: 50,
    mouseY: 50,
    isDragging: false,
    
    // エフェクト用タイマー
    effectTimer: 0.0,
  };

  // チュートリアル表示中はゲーム停止
  state.paused = true;

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
        
        // Chat List (チャット履歴一覧) — JSで動的レンダリング
        el("div.teams-chat-list#jig-chat-list", {}),

        // Chat Room
        el("div.teams-chat-room", {}, [
          // Room Header & Monitor Banner
          el("div.teams-room-header", {}, [
            el("div.room-title-wrap", {}, [
              el("span.room-name#jig-room-name", { text: "佐藤部長" }),
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

    // 下半分：物理デスク（スプリット）— 左:サボリ、右:仮想マウス
    el("div.jig-desk-split", {}, [
      // 下左：サボり工作エリア
      el("div.jig-sabori-area#jig-sabori-area", {}, [
        // 工作進捗表示
        el("div.jig-sabori-header", {}, [
          el("div.jig-sabori-title#jig-model-title", { text: state.currentModel }),
          el("div.jig-sabori-val-row", {}, [
            el("span", { text: "サボり度" }),
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
          el("span", { text: "長押しでサボる" })
        ])
      ]),

      // 下右：仮想マウス操作スペース
      el("div.jig-mouse-area#jig-desktop", {}, [
        el("div.jig-desktop-label", { text: "■ ここをドラッグして在席キープ" }),

        // 仮想マウス
        el("div.jig-virtual-mouse#jig-mouse", {
          style: { left: "50px", top: "50px" }
        }, [
          el("div.jig-mouse-wheel")
        ]),
      ]),
    ])
  ]);

  mount(screen);

  // --- 遊び方チュートリアル（最初に1回だけ表示） ---
  const tutorial = el("div", {
    style: {
      position: "absolute", inset: "0",
      background: "rgba(0,0,0,0.86)",
      zIndex: "9999",
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      padding: "20px", textAlign: "center", color: "#fff",
      fontFamily: 'var(--r-font-jp, "DotGothic16", sans-serif)',
    }
  }, [
    el("div", { style: { fontSize: "20px", fontWeight: "700", marginBottom: "14px", color: "#ffd24a", textShadow: "2px 2px 0 #1a1230" }, text: "■ 遊び方 ■" }),
    el("div", { style: { fontSize: "13px", lineHeight: "1.7", maxWidth: "320px", marginBottom: "16px" } }, [
      el("div", { style: { marginBottom: "10px" }, text: "🎯 目的：在席ステータス（緑）を保ちながら、こっそりサボる！" }),
      el("div", { style: { marginBottom: "6px", color: "#5be8ff" }, text: "① 右下のマウスパッドをドラッグ" }),
      el("div", { style: { marginBottom: "10px", fontSize: "11px", color: "#c8b8e8" }, text: "→ 在席ゲージが回復（PCランプ緑キープ）" }),
      el("div", { style: { marginBottom: "6px", color: "#c267ff" }, text: "② 左下「サボる」ボタンを長押し" }),
      el("div", { style: { marginBottom: "10px", fontSize: "11px", color: "#c8b8e8" }, text: "→ サボり進捗が貯まる（=お金）。ただし在席ゲージは減りやすくなる" }),
      el("div", { style: { marginBottom: "6px", color: "#ff5cb4" }, text: "③ 上の Teams にチャットが来たら即返信" }),
      el("div", { style: { marginBottom: "0", fontSize: "11px", color: "#c8b8e8" }, text: "→ 別チャンネルから来た時は左の一覧から切替えて返信" }),
    ]),
    el("div", { style: { fontSize: "11px", color: "#ff5b6e", marginBottom: "14px" }, text: "在席ゲージ0 or チャット既読スルーで強制退場！" }),
    el("button.pbtn.green", {
      style: { fontSize: "16px", padding: "10px 28px" },
      onclick: () => { tutorial.remove(); state.paused = false; }
    }, [el("span", { text: "▶ スタート" })]),
  ]);
  screen.appendChild(tutorial);

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
    chatList: screen.querySelector("#jig-chat-list"),
    roomName: screen.querySelector("#jig-room-name"),
    teamsBadge: screen.querySelector("#teams-badge"),
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

  // チャンネルごとのメッセージ履歴（切替時に再描画用）
  state.channels.sato.history   = initialHistory.slice();
  state.channels.tanaka.history = [];
  state.channels.hr.history     = [];

  // 初期メッセージ描画
  initialHistory.forEach(h => appendMessage(h.sender, h.text, h.time, h.isBoss));
  state.channels.sato.preview = initialHistory[initialHistory.length - 1]?.text || "";
  renderChannelList();

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
    // 違うチャンネルを見ている時は返信不可（プレイヤーは正しいチャンネルに切り替える必要がある）
    if (state.activeChannel !== state.pendingChannel) return;
    state.chatActive = false;

    // 返信エリアを消去
    const replyBox = refs.messagesContainer.querySelector("#teams-reply-box");
    if (replyBox) replyBox.remove();

    // 自分の返答メッセージを履歴に追加（active なら DOM にも反映）
    pushMessage(state.pendingChannel, "自分", state.chatReplyText, "たった今", false);
    state.pendingChannel = null;
    renderChannelList();
    
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

    if (refs.moodFill) {
      refs.moodFill.classList.remove("warning", "critical");
      if (state.mood < 30)      refs.moodFill.classList.add("critical");
      else if (state.mood < 60) refs.moodFill.classList.add("warning");
    }

    if (state.mood < 30) {
      if (refs.lamp) refs.lamp.className = "teams-profile-status warning";
      if (refs.lampText) refs.lampText.textContent = "警告 (離席寸前)";
    } else {
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

  // ゲージ満タン時の「+10円」フローティング
  function spawnCoinPop() {
    const pop = el("div.jig-coin-pop", { text: "+10円" });
    refs.saboriArea.appendChild(pop);
    setTimeout(() => pop.remove(), 1200);
  }

  // --- 複数チャンネル管理 -------------------------------------------------

  // 解放済み（経過時間 >= unlockAt）のチャンネルIDを列挙
  function getUnlockedChannels() {
    return Object.keys(CHANNELS).filter(id => state.elapsed >= CHANNELS[id].unlockAt);
  }

  function renderChannelList() {
    clear(refs.chatList);
    for (const id of getUnlockedChannels()) {
      const ch = CHANNELS[id];
      const data = state.channels[id];
      const isActive = state.activeChannel === id;
      const item = el("div.chat-list-item", {
        class: (isActive ? "active" : "") + (data.unread > 0 ? " has-unread" : ""),
        "data-channel": id,
        onclick: () => switchChannel(id),
      }, [
        el("div.chat-avatar", { style: { background: ch.color }, text: ch.icon }),
        el("div.chat-info", {}, [
          el("div.chat-name", { text: ch.name }),
          el("div.chat-preview", { text: data.preview }),
        ]),
        data.unread > 0
          ? el("div.chat-unread-badge", { text: String(data.unread) })
          : el("div.chat-status-dot.available"),
      ]);
      refs.chatList.appendChild(item);
    }
  }

  function switchChannel(channelId) {
    if (!state.channels[channelId]) return;
    state.activeChannel = channelId;
    state.channels[channelId].unread = 0;
    refs.roomName.textContent = CHANNELS[channelId].name;

    // 既存メッセージをクリアし、当該チャンネルの履歴を再描画
    clear(refs.messagesContainer);
    const history = state.channels[channelId].history || [];
    if (history.length === 0) {
      refs.messagesContainer.appendChild(
        el("div.teams-msg.system", {}, [
          el("div.teams-msg-content", {}, [
            el("div.teams-bubble", { text: `${CHANNELS[channelId].name}とのチャットを表示しています。` })
          ])
        ])
      );
    } else {
      history.forEach(h => appendMessage(h.sender, h.text, h.time, h.isBoss));
    }

    // 奇襲中で当該チャンネル宛なら返信ボックスを表示
    if (state.chatActive && state.pendingChannel === channelId) {
      showPendingChatMessage();
    }
    renderChannelList();
  }

  // 履歴に追加し、アクティブなら画面にも反映
  function pushMessage(channelId, sender, text, time, isBoss) {
    const ch = state.channels[channelId];
    if (!ch.history) ch.history = [];
    ch.history.push({ sender, text, time, isBoss });
    ch.preview = text;
    if (state.activeChannel === channelId) {
      appendMessage(sender, text, time, isBoss);
    }
  }

  function showPendingChatMessage() {
    // pendingChannel の最新メッセージは履歴に既にあるので最後を描画
    const history = state.channels[state.pendingChannel].history || [];
    const last = history[history.length - 1];
    if (last) appendMessage(last.sender, last.text, last.time, last.isBoss);

    // 返信ボックス（既存 triggerChat と同じ DOM）を追加
    const replyBox = el("div.teams-inline-reply-box#teams-reply-box", {}, [
      el("div.teams-countdown-track", {}, [
        el("div.teams-countdown-fill#jig-chat-timer-fill", { style: { width: "100%" } })
      ]),
      el("div.teams-reply-actions", {}, [
        el("button.teams-reply-btn#jig-reply-btn", {
          onclick: (e) => { e.preventDefault(); e.stopPropagation(); submitReply(); },
          ontouchstart: (e) => { e.preventDefault(); e.stopPropagation(); submitReply(); },
        }, [el("span", { text: `💬 返信: 「${state.chatReplyText}」` })])
      ])
    ]);
    refs.messagesContainer.appendChild(replyBox);
    refs.messagesContainer.scrollTop = refs.messagesContainer.scrollHeight;
    refs.chatTimerFill = replyBox.querySelector("#jig-chat-timer-fill");
  }

  // --- メインゲームループ ---
  const gameLoop = loop((dt) => {
    if (!state.active || state.paused) return;

    state.elapsed += dt;

    // 時計表示
    const m = Math.floor(state.elapsed / 60);
    const s = Math.floor(state.elapsed % 60);
    refs.timer.textContent = `${m}:${String(s).padStart(2, "0")}`;

    // チャンネル解放アンロックを監視（unlockAt を跨いだら一覧再描画）
    const visibleNow = refs.chatList.children.length;
    const expected = getUnlockedChannels().length;
    if (visibleNow !== expected) renderChannelList();

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

        // 次のモデル
        state.currentModel = pick(SABORI_MODELS);
        refs.modelTitle.textContent = state.currentModel;

        // 進捗フラッシュ＋「+10円」フローティング演出
        refs.saboriFill.classList.add("flash");
        setTimeout(() => refs.saboriFill.classList.remove("flash"), 300);
        spawnCoinPop();
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
    // 解放済みチャンネルの sender だけから抽選
    const unlocked = getUnlockedChannels();
    const pool = CHAT_QUESTIONS.filter(q => unlocked.includes(senderToChannelId(q.sender)));
    const q = pick(pool.length ? pool : CHAT_QUESTIONS);
    const channelId = senderToChannelId(q.sender);

    state.chatActive = true;
    state.chatSender = q.sender;
    state.chatText = q.text;
    state.pendingChannel = channelId;
    state.chatLimit = Math.max(1.8, 3.5 - state.completed * 0.15);
    state.chatTimer = state.chatLimit;
    state.chatReplyText = pick(CHAT_REPLIES);

    // チャンネルに未読＋履歴に追加
    state.channels[channelId].unread += 1;
    pushMessage(channelId, q.sender, q.text, "たった今", true);
    renderChannelList();

    // アクティブチャンネル ＝ pendingChannel なら返信ボックスを追加
    if (state.activeChannel === channelId) {
      // 返信ボックスのみ追加（メッセージは pushMessage 内で既に描画済み）
      const replyBox = el("div.teams-inline-reply-box#teams-reply-box", {}, [
        el("div.teams-countdown-track", {}, [
          el("div.teams-countdown-fill#jig-chat-timer-fill", { style: { width: "100%" } })
        ]),
        el("div.teams-reply-actions", {}, [
          el("button.teams-reply-btn#jig-reply-btn", {
            onclick: (e) => { e.preventDefault(); e.stopPropagation(); submitReply(); },
            ontouchstart: (e) => { e.preventDefault(); e.stopPropagation(); submitReply(); },
          }, [el("span", { text: `💬 返信: 「${state.chatReplyText}」` })])
        ])
      ]);
      refs.messagesContainer.appendChild(replyBox);
      refs.messagesContainer.scrollTop = refs.messagesContainer.scrollHeight;
      refs.chatTimerFill = replyBox.querySelector("#jig-chat-timer-fill");
    } else {
      // 別チャンネルから着信：「○○さんから新着メッセージ。切り替えて返信！」のヒントだけ表示
      const hint = el("div.teams-channel-hint", {
        text: `🔔 ${CHANNELS[channelId].name} から新着メッセージ。左の一覧から切り替えて返信！`,
      });
      refs.messagesContainer.appendChild(hint);
      refs.messagesContainer.scrollTop = refs.messagesContainer.scrollHeight;
    }
    updateWorkerVisual();
  }

  function quit(forced, reason) {
    state.active = false;
    gameLoop.stop();
    window.removeEventListener("mousemove", doDrag);
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", doDrag);
    window.removeEventListener("touchend", stopDrag);

    const unitPrice = 10;
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
