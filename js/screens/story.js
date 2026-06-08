// =========================================================================
// story.js — ストーリーモード（ノベルゲーム風 / バストアップ＋テキストウィンドウ）
// 仕様書 6-2: 画面遷移は必ず Router 経由
// =========================================================================

import { el, clear } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { StoryState } from "../storyState.js?v=1.2.5";

// 各キャラのバストアップ画像（無い場合は色付きプレースホルダ）
const SPRITES = {
  sato_normal:  "assets/img/sato_normal.png",
  sato_smile:   "assets/img/sato_smile.png",
  sato_angry:   "assets/img/sato_angry.png",
  hana_normal:  "assets/img/hana_normal.png",
  hana_bigsmile:"assets/img/hana_bigsmile.png",
};

const PLACEHOLDER = {
  "高橋": { initial: "高", color: "#5b6b7a" },
};

// ---- 第1章 ----
const CHAPTER_1 = [
  { type: "narration", text: "午前九時。オフィスの蛍光灯が、いつもより少しだけ白く感じた。" },
  { type: "narration", text: "今日も「お前」は、与えられた業務を黙々とこなすだけの一日を始める。" },
  { type: "narration", text: "佐藤課長のデスクに、昨夜遅くまでかけて作った企画書スライドを提出する。" },

  { type: "line", speaker: "佐藤課長", sprite: "sato_normal", text: "おう、例のスライド、できたか。見せてみろ。" },
  { type: "thought", text: "（……一晩かけて作った。今度こそ、文句のつけようがないはずだ）" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_angry", text: "……は？ なんだこれは。フォントがバラバラじゃないか。色のトーンも合ってない。これでお客様の前に出せると思っているのか？" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_angry", text: "いいか、スライドってのはな、見た目が9割なんだよ。中身がどんなに良くても、見た目がダメなら全部ゴミだ。やり直し。" },
  { type: "thought", text: "（……またか。何度直しても、何かが「気に入らない」らしい）" },
  { type: "narration", text: "ここからが、僕の「本領発揮」であり、我が社の悪しき伝統である【スライド修正タイム】の始まりだった。" },

  { type: "game", gameId: "powerpotter", label: "【スライド修正タイム】開始――" },

  { type: "narration", text: "時計を見ると、すでに17時を回っていた。" },
  { type: "narration", text: "1回目の修正、2回目の修正……気づけば、提出のたびに課長は新しい「気に入らない点」を見つけ出した。" },
  { type: "narration", text: "5回目。「配色が安っぽい」。8回目。「やっぱり最初の方が良かったかもしれん」。12回目。「いや、これじゃない感じがする」。" },
  { type: "narration", text: "そして15回目の修正を終え、ふと壁の時計に目をやると――" },
  { type: "thought", text: "（……17時だったはずなのに、もう18時32分になっている。1時間半も経ったのか？　いや、体感では数分のはずなのに）" },
  { type: "narration", text: "頭の中で、時間の感覚がほんの少しだけ、ずれた気がした。けれど「お前」は、それを深く考えることをしない。考えないように、できている。" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_smile", text: "おう、今度のはいいじゃないか！　最初からこれを出せばよかったんだ。さすがだな。" },
  { type: "thought", text: "（……褒められた。なのに、何も嬉しくない。ただ、「これでようやく終わる」という安堵だけがある）" },

  { type: "narration", text: "解放された「お前」の元に、明るい声が飛んでくる。" },
  { type: "line", speaker: "花", sprite: "hana_bigsmile", text: "おつかれさまー！！　また課長にいじめられてたでしょ、見てたよ！　今日もえらいえらい、よしよし！" },
  { type: "line", speaker: "花", sprite: "hana_bigsmile", text: "ねえねえ、今度の休み一緒にランチ行こうよ！　絶対楽しいって、ね、ね！？　約束ね、もう逃がさないからね！" },
  { type: "thought", text: "（……花ちゃんは、いつもこうだ。距離感がおかしいくらい近い。まるで、誰かが「もっと親密に」と命じているかのように）" },
  { type: "line", speaker: "花", sprite: "hana_normal", text: "あ、でも無理しなくていいんだよ？　ほんとに、無理だけはしないでね……？　心配なんだから。" },
  { type: "narration", text: "花の笑顔の奥に、ほんの一瞬、何かに怯えるような陰がよぎった気がした。だが、それもすぐに消えてしまった。" },

  { type: "narration", text: "夕暮れ時、給湯室の前で、営業部の高橋とすれ違う。" },
  { type: "line", speaker: "高橋", sprite: "ph_takahashi", text: "おい、お前。例の件、まだ終わってないのか？　どんだけ仕事が遅いんだよ。给料泥棒って言葉、知ってるか？" },
  { type: "line", speaker: "高橋", sprite: "ph_takahashi", text: "はぁ……お前みたいなのがいるから、こっちまで評価が下がるんだよ。次は無いと思え。" },
  { type: "thought", text: "（……高橋さんの言葉は、いつも刃物みたいだ。けれど、なぜだろう。刺さるはずの言葉が、最近どこか「型通り」に聞こえる）" },
  { type: "narration", text: "「お前」は、高橋の言葉をただ黙って受け止める。反論する理由も、その必要性も、見当たらなかったから。" },

  { type: "narration", text: "全ての業務を終え、フロアにはもう「お前」しかいない。" },
  { type: "narration", text: "窓の外には、ビルの明かりが幾何学模様のように広がっている。誰もが、今日も同じように働き、同じように家路につく。" },
  { type: "thought", text: "（……この景色を、何度見ただろう。けれど、なぜか今日はやけに、作り物めいて見える）" },
  { type: "thought", text: "（花ちゃんの過剰な優しさ。高橋さんの過剰な厳しさ。佐藤課長の、終わらない「気に入らない」。まるで――誰かが、僕の反応を試しているみたいだ）" },
  { type: "narration", text: "そんな埒もない考えを振り払うように、「お前」は鞄を手に取り、オフィスの照明を落とそうとした。" },

  { type: "narration", text: "その時、デスクの電話がけたたましく鳴り響いた。" },
  { type: "narration", text: "こんな時間に、誰が――。" },
];

const CHAPTERS = {
  ch1: { id: "ch1", title: "第1章　お前は、今日も。", script: CHAPTER_1 },
};

export function startStory(mount, params = {}) {
  const chapterId = params.chapter || "ch1";
  const startIndex = params.index || 0;
  const chapter = CHAPTERS[chapterId];

  const state = { idx: startIndex, finished: false };

  const root = el("div.screen.story-screen", {}, [
    el("div.story-bg"),
    el("div.story-sprite-wrap#story-sprite-wrap"),
    el("div.story-skip", { text: "スキップ ▶▶", onclick: (e) => { e.stopPropagation(); skipToEnd(); } }),
    el("div.story-textbox#story-textbox", {}, [
      el("div.story-nameplate#story-nameplate"),
      el("div.story-text#story-text"),
      el("div.story-tap-hint", { text: "▼ タップして進む" }),
    ]),
  ]);

  root.addEventListener("click", (e) => {
    if (e.target.closest(".story-skip")) return;
    advance();
  });

  mount(root);
  render();

  function render() {
    if (state.idx >= chapter.script.length) {
      showEnd();
      return;
    }
    const beat = chapter.script[state.idx];
    const spriteWrap = root.querySelector("#story-sprite-wrap");
    const nameplate = root.querySelector("#story-nameplate");
    const textEl = root.querySelector("#story-text");
    const textbox = root.querySelector("#story-textbox");

    clear(spriteWrap);
    textbox.classList.remove("narration", "thought", "dialogue");

    if (beat.type === "narration") {
      textbox.classList.add("narration");
      nameplate.style.display = "none";
      nameplate.textContent = "";
      textEl.textContent = beat.text;
    } else if (beat.type === "thought") {
      textbox.classList.add("thought");
      nameplate.style.display = "none";
      nameplate.textContent = "";
      textEl.textContent = beat.text;
    } else if (beat.type === "line") {
      textbox.classList.add("dialogue");
      nameplate.style.display = "";
      nameplate.textContent = beat.speaker;
      textEl.textContent = beat.text;
      spriteWrap.appendChild(buildSprite(beat.speaker, beat.sprite));
    } else if (beat.type === "game") {
      launchGame(beat);
      return;
    }
  }

  function buildSprite(speaker, spriteKey) {
    const src = SPRITES[spriteKey];
    if (src) {
      return el("img.story-sprite", { src, alt: speaker });
    }
    const ph = PLACEHOLDER[speaker] || { initial: speaker?.[0] || "?", color: "#6264a7" };
    return el("div.story-sprite-ph", {
      style: { background: ph.color },
      text: ph.initial,
    });
  }

  function advance() {
    if (state.finished) return;
    state.idx++;
    render();
  }

  function skipToEnd() {
    if (state.finished) return;
    while (state.idx < chapter.script.length && chapter.script[state.idx].type !== "game") {
      state.idx++;
    }
    render();
  }

  function launchGame(beat) {
    StoryState.active = true;
    StoryState.onContinue = () => {
      Router.go("story", { chapter: chapterId, index: state.idx + 1 });
    };
    Router.go("game", { id: beat.gameId, storyMode: true });
  }

  function showEnd() {
    state.finished = true;
    clear(root.querySelector("#story-sprite-wrap"));
    const textbox = root.querySelector("#story-textbox");
    textbox.classList.remove("narration", "thought", "dialogue");
    root.querySelector("#story-nameplate").style.display = "none";
    root.querySelector("#story-nameplate").textContent = "";
    root.querySelector("#story-text").textContent = "";

    const overlay = el("div.story-end-overlay", {}, [
      el("div.story-end-title", { text: `── ${chapter.title}　了 ──` }),
      el("div.story-end-sub", { text: "（つづく）" }),
      el("button.pbtn.outline.block", { onclick: () => Router.menu() }, [el("span", { text: "メニューへ戻る" })]),
    ]);
    root.appendChild(overlay);
  }

  return {
    dispose() {
      StoryState.active = false;
      StoryState.onContinue = null;
    },
  };
}
