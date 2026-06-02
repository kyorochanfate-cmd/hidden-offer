// =========================================================================
// jobs.js — 求人選択（労働選択）画面（コンパクト＋詳細モーダル）
// =========================================================================

import { el, clear } from "../dom.js?v=1.1.3";
import { Store } from "../state.js?v=1.1.3";
import { GAMES, GAME_ORDER } from "../data.js?v=1.1.3";
import { Router } from "../app.js?v=1.1.3";
import { AVATARS } from "../art.js?v=1.1.3";

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
          el("img", { src: "assets/img/boss.png", alt: "佐藤部長", style: { width: "48px", height: "auto", imageRendering: "pixelated" } })
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
        headerText = "名刺交換タクティカル";
        descText = "【対面マナー】相手より低く爆速で出す謙虚さの極み！";
        catchphrase = "相手より1ミリでも\n低く出せ！";
        rewardText = "マナー合格報酬";
        mediaNode = el("div", { style: { fontSize: "36px" }, text: "📄" });
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
