// =========================================================================
// chapterSelect.js — 章選択画面
// =========================================================================

import { el } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { Store } from "../state.js?v=1.2.5";

const CHAPTER_LIST = [
  { id: "ch1", num: "第1章", title: "お前は、今日も。" },
  { id: "ch2", num: "第2章", title: "感情のサンドバッグ、あるいは過剰適応の果て" },
  { id: "ch3", num: "第3章", title: "迷惑メールフォルダの中身" },
];

// ch1は常に開放、以降は前章クリアで解放
function isUnlocked(index) {
  if (index === 0) return true;
  return Store.isChapterCleared(CHAPTER_LIST[index - 1].id);
}

export function renderChapterSelect(mount) {
  const screen = el("div.screen.retro", {}, [
    el("div.retro-body", { style: { padding: "calc(16px + var(--safe-top)) 16px 16px", overflowY: "auto" } }, [
      el("div", { style: { textAlign: "center", marginBottom: "24px" } }, [
        el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "10px", letterSpacing: ".2em", color: "var(--r-sub)", marginBottom: "6px" }, text: "STORY MODE" }),
        el("div", { style: { fontSize: "22px", fontWeight: "700" }, text: "章を選択" }),
      ]),
      el("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        CHAPTER_LIST.map((ch, i) => {
          const unlocked = isUnlocked(i);
          const cleared = Store.isChapterCleared(ch.id);
          const card = el("div.retro-card", {
            style: {
              opacity: unlocked ? "1" : "0.4",
              cursor: unlocked ? "pointer" : "default",
              position: "relative",
              padding: "14px 16px",
            },
          }, [
            el("div", { style: { fontFamily: "var(--r-font-en)", fontSize: "10px", letterSpacing: ".14em", color: "var(--r-yellow)", marginBottom: "4px" }, text: ch.num }),
            el("div", { style: { fontWeight: "700", fontSize: "15px", lineHeight: "1.4" }, text: ch.title }),
            ...(cleared ? [el("div", { style: { marginTop: "6px", fontSize: "11px", color: "var(--r-green)" }, text: "✓ クリア済み" })] : []),
            ...(!unlocked ? [el("div", { style: { marginTop: "6px", fontSize: "11px", color: "var(--r-mute)" }, text: "🔒 前の章をクリアすると解放" })] : []),
          ]);
          if (unlocked) {
            card.addEventListener("click", () => Router.go("story", { chapter: ch.id }));
          }
          return card;
        })
      ),
      el("button.pbtn.outline.block", { style: { marginTop: "24px" }, onclick: () => Router.menu() }, [el("span", { text: "メニューへ戻る" })]),
    ]),
  ]);

  mount(screen);
  return { dispose() {} };
}
