// =========================================================================
// jobs.js — 求人選択（労働選択）画面（コンパクト＋詳細モーダル）
// =========================================================================

import { el, clear } from "../dom.js?v=1.2.5";
import { Store } from "../state.js?v=1.2.5";
import { GAMES, GAME_ORDER } from "../data.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { AVATARS } from "../art.js?v=1.2.5";

// 各業務の遊び方（目的・操作・終了条件）
const HOW_TO = {
  powerpotter: {
    goal: "上司の指示に従ってスライドを修正し続けろ。1箇所完遂で +5円。",
    steps: [
      "上司から「タイトルを赤に」「ロゴを太字に」など指示が降ってくる",
      "スライド上の該当要素をタップ → 指示に合うプロパティに変更",
      "完遂数で給料アップ。ただし矛盾指示・リセットあり",
    ],
    end: "上司の機嫌ゲージが0になると強制退社（ゲーム終了）。",
  },
  chatrally: {
    goal: "佐藤部長のメッセージに、空気を読んだスタンプで爆速リアクション。10ラリー完遂を目指せ。",
    steps: [
      "佐藤部長のメッセージが流れてくる",
      "👍了解 / 🙇謝罪 / 😂爆笑忖度 / 🎉ヨイショ から正解を選ぶ",
      "ラウンドが進むほど制限時間が短くなる",
    ],
    end: "忖度ゲージ0、または時間切れ（既読スルー）で失敗。",
  },
  jiggler: {
    goal: "在席ステータス（緑）を保ちながら、こっそりサボって稼げ。",
    steps: [
      "右下マウスパッドをドラッグ → 在席ゲージ回復（PCランプ緑キープ）",
      "左下「長押しでサボる」ボタン押下 → サボり進捗が貯まる（=お金）。ただし在席ゲージは減りやすくなる",
      "上のTeamsにチャットが来たら即返信。別チャンネルから来た時は左の一覧から切替えて返信",
    ],
    end: "在席ゲージ0、またはチャット既読スルーで強制退場。",
  },
  exchange: {
    goal: "一瞬だけ見える名刺を覚え、佐藤部長の質問に正しい番号で答えろ。",
    steps: [
      "ラウンド開始：3〜8名分の名刺が表で表示される（記憶タイム）",
      "時間切れで名刺が伏せられる（番号だけ見える）",
      "佐藤部長が「○○さんは何番？」と聞いてくる → 該当カードをタップ",
      "ラウンドが進むほど人数増・記憶時間短縮",
    ],
    end: "ライフ❤3つ無くなったらゲームオーバー。10ラウンド完遂でクリア。",
  },
  toilet: {
    goal: "個室にこもって1秒1円でサボれ。腹痛を抑えつつ空き個室を確保せよ。",
    steps: [
      "俯瞰ビューで自キャラを操作",
      "各個室の状態（無音→紙→流す→出てくる→空き）を読んで、流した直後の個室を狙う",
      "個室にこもると秒単位でお金が増える",
    ],
    end: "腹痛ゲージ満タンで失敗（給料没収）。",
  },
};

export function renderJobs(mount) {
  function draw() {
    clear(mount);
    
    const screen = el("div.screen.retro", {}, [
      bgFxSimple(),
      el("div.retro-body", { style: { display: "flex", flexDirection: "column", height: "100%" } }, [
        
        // ヘッダー
        el("div.job-title-container", {}, [
          el("div.job-title-the", { text: "THE" }),
          el("div.job-title-main", { text: "労働選択" }),
          el("div.job-title-sub", { text: "業務メニュー" }),
        ]),

        // コンパクト求人リスト
        el("div.retro-scroll", { style: { flex: "1", padding: "12px 14px 4px" } }, [
          el("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } },
            GAME_ORDER.map(buildCompactRow)),
        ]),

        // 下部ボタン
        el("div.job-controls", {}, [
          el("button.pbtn.outline.job-back-btn-center", { 
            onclick: () => Router.menu() 
          }, [el("span", { text: "オフィスに戻る" })]),
        ]),
      ]),
    ]);

    mount(screen);
  }

  function buildCompactRow(id) {
    const g = GAMES[id];
    const unlocked = Store.isUnlocked(id);

    let displayTitle = g.jpTitle;
    let displaySub = g.theme;
    let badgeText = unlocked ? "解放済み" : "🔒 LOCKED";

    if (!unlocked) {
      displayTitle = "？？？";
      displaySub = "未解放の非公開求人";
    } else {
      if (id === "powerpotter") {
        displayTitle = "スライド職人";
        badgeText = "歩合 5円";
      } else if (id === "chatrally") {
        displayTitle = "チャット忖度ラリー";
        badgeText = "歩合 5円";
      } else if (id === "jiggler") {
        badgeText = "在席手当";
      } else if (id === "exchange") {
        badgeText = "マナー手当";
      } else if (id === "toilet") {
        badgeText = "1秒1円";
      }
    }

    const row = el("div.job-compact-row", {
      class: unlocked ? "" : "locked",
      "data-job": id,
      onclick: () => showDetailModal(id, unlocked)
    }, [
      el("div.av", {}, [
        unlocked 
          ? el("div", { style: { display: "flex" }, html: AVATARS[id] || "" }) 
          : el("span", { text: "🔒" })
      ]),
      el("div.info", {}, [
        el("div.title", { text: displayTitle }),
        el("div.sub", { text: displaySub }),
      ]),
      el("div.badge", { text: badgeText })
    ]);

    return row;
  }

  function showDetailModal(id, unlocked) {
    const g = GAMES[id];
    let modalMask;

    const close = () => {
      modalMask.remove();
    };

    let dialogNode;

    if (!unlocked) {
      // ロック中のモーダル表示
      dialogNode = el("div.job-detail-dialog", { "data-job": id }, [
        el("div.job-detail-header", { text: "？？？" }),
        el("div.job-detail-desc", { text: "この求人はロックされています", style: { color: "var(--r-mute)" } }),
        el("div.job-detail-content", {}, [
          el("div.job-detail-media", {}, [
            el("span", { style: { fontSize: "32px" }, text: "🔒" })
          ]),
          el("div.job-detail-info", {}, [
            el("div.job-detail-catch", { text: "キャリアコンサル（ガチャ）で\nこの極秘求人を引き当てよう！" }),
            el("div.job-detail-reward", { text: "LOCKED", style: { color: "var(--r-mute)" } })
          ])
        ]),
        el("div.job-detail-controls", {}, [
          el("button.pbtn.outline", { onclick: close }, [el("span", { text: "戻る" })])
        ])
      ]);
    } else {
      // 解放済みジョブの詳細モーダル
      let headerText = g.jpTitle;
      let descText = "";
      let catchphrase = "";
      let rewardText = "";
      let mediaNode = null;

      if (id === "powerpotter") {
        headerText = "スライド職人：スライドの怒り";
        descText = "【急募】終わりなきスライド修正。上司の無茶振りに応えろ！";
        catchphrase = "URGENT! COMPLETE\n至急スライド完成！";
        rewardText = "+5円 / 箇所";
        mediaNode = el("div", { style: { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } }, [
          el("img", { src: "assets/img/SATO_normal.png", alt: "佐藤部長", style: { width: "48px", height: "auto", imageRendering: "pixelated" } })
        ]);
      } else if (id === "chatrally") {
        headerText = "チャット忖度ラリー";
        descText = "【Slack/Teams対応】役員へのウインクは一発炎上！適切なスタンプを爆速で返せ";
        catchphrase = "適切なスタンプで\n炎上回避";
        rewardText = "+5円 / 対応";
        mediaNode = el("div.mini-chat-mock", {}, [
          el("div.mini-chat-sidebar"),
          el("div.mini-chat-body", {}, [
            el("div.mini-chat-bubble", { text: "確認します" }),
            el("div.mini-chat-bubble", { text: "確認します" }),
            el("div.mini-chat-stamps", {}, [
              el("span.mini-chat-stamp", { text: "👍" }),
              el("span.mini-chat-stamp", { text: "😄" }),
              el("span.mini-chat-stamp", { text: "🙇‍♂️" })
            ])
          ])
        ]);
      } else if (id === "jiggler") {
        headerText = "マウスジグラー：生存証明";
        descText = "【在宅勤務向け】サボりを隠し通せ！";
        catchphrase = "会社のPCランプを\n『緑』に維持";
        rewardText = "在席時間報酬";
        mediaNode = el("div", { style: { fontSize: "36px" }, text: "🖱" });
      } else if (id === "exchange") {
        headerText = "名刺おぼえ会議";
        descText = "【記憶系】交換した名刺を一瞬で覚え、佐藤部長の質問に正しい番号で答えろ！";
        catchphrase = "誰が何番か\n瞬時に思い出せ！";
        rewardText = "正答ボーナス +10円〜";
        mediaNode = el("div", { style: { fontSize: "36px" }, text: "🃏" });
      } else if (id === "toilet") {
        headerText = "トイレ逃避タイム";
        descText = "【個室サバイバル】極限までサボれ。ノック・上司接近に正しく対応！";
        catchphrase = "1秒1円の\nサボリ給";
        rewardText = "個室潜伏 +1円/秒";
        mediaNode = el("div", { style: { fontSize: "36px" }, text: "🚪" });
      }

      dialogNode = el("div.job-detail-dialog", { "data-job": id }, [
        el("div.job-detail-header", { text: headerText }),
        el("div.job-detail-desc", { text: descText }),
        el("div.job-detail-content", {}, [
          el("div.job-detail-media", {}, [mediaNode]),
          el("div.job-detail-info", {}, [
            el("div.job-detail-catch", { html: catchphrase.replace(/\n/g, "<br>") }),
            el("div.job-detail-reward", { text: rewardText })
          ])
        ]),
        el("div.job-detail-controls", {}, [
          el("button.pbtn.outline", { onclick: close }, [el("span", { text: "戻る" })]),
          el("button.pbtn.yellow", {
            onclick: () => showHowToModal(id),
          }, [el("span", { text: "遊び方" })]),
          el("button.pbtn.green", {
            onclick: () => {
              close();
              Router.game(id);
            }
          }, [el("span", { text: "業務開始" })])
        ])
      ]);
    }

    modalMask = el("div.retro-modal-mask", {
      onclick: (e) => {
        if (e.target === modalMask) close();
      }
    }, [dialogNode]);

    document.getElementById("app").appendChild(modalMask);
  }

  function showHowToModal(id) {
    const g = GAMES[id];
    const h = HOW_TO[id];
    if (!h) return;
    let mask;
    const close = () => mask.remove();
    const dialog = el("div.job-detail-dialog.howto-dialog", { "data-job": id }, [
      el("div.job-detail-header", { text: `遊び方：${g.jpTitle}` }),
      el("div.howto-section", {}, [
        el("div.howto-label", { text: "■ 目的" }),
        el("div.howto-text", { text: h.goal }),
      ]),
      el("div.howto-section", {}, [
        el("div.howto-label", { text: "■ 操作" }),
        el("ol.howto-steps", {}, h.steps.map(s => el("li", { text: s }))),
      ]),
      el("div.howto-section", {}, [
        el("div.howto-label", { text: "■ 終了条件" }),
        el("div.howto-text", { style: { color: "var(--r-red)" }, text: h.end }),
      ]),
      el("div.job-detail-controls", {}, [
        el("button.pbtn.outline", { onclick: close }, [el("span", { text: "閉じる" })]),
      ]),
    ]);
    mask = el("div.retro-modal-mask", {
      style: { zIndex: "1001" },
      onclick: (e) => { if (e.target === mask) close(); },
    }, [dialog]);
    document.getElementById("app").appendChild(mask);
  }

  draw();
  return {};
}

function bgFxSimple() {
  const items = [
    { e: "¥", x: 86, y: 8, c: "coin", s: 24 },
    { e: "📄", x: 6, y: 14, c: "doc", s: 20 },
    { e: "☕", x: 8, y: 88, c: "coffee", s: 22 },
    { e: "🖱", x: 88, y: 86, c: "mouse", s: 20 },
  ];
  return el("div.retro-bg-fx", {},
    items.map((it) => el("div", {
      class: "fx " + it.c,
      style: { left: it.x + "%", top: it.y + "%", fontSize: it.s + "px" },
      text: it.e,
    })),
  );
}
