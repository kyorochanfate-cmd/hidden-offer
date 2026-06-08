// =========================================================================
// story.js — ストーリーモード（ノベルゲーム風 / バストアップ＋テキストウィンドウ）
// 仕様書 6-2: 画面遷移は必ず Router 経由
// =========================================================================

import { el, clear } from "../dom.js?v=1.2.5";
import { Router } from "../app.js?v=1.2.5";
import { StoryState } from "../storyState.js?v=1.2.5";

// 各キャラのバストアップ画像（無い場合は色付きプレースホルダ）
const SPRITES = {
  sato_normal:  "assets/img/SATO_normal.png",
  sato_smile:   "assets/img/SATO_smile.png",
  sato_angry:   "assets/img/SATO_angry.png",
  hana_normal:  "assets/img/HANA_normal.png",
  hana_bigsmile:"assets/img/HANA_smile.png",
  takahashi:    "assets/img/TAKAHASHI.png",
};

const PLACEHOLDER = {};

// ---- 第1章 ----
const CHAPTER_1 = [
  { type: "narration", text: "午前九時。オフィスの蛍光灯が、いつもより少しだけ白く感じた。" },
  { type: "narration", text: "今日も、与えられた業務を黙々とこなすだけの一日が始まる。" },
  { type: "narration", text: "佐藤課長のデスクに、昨夜遅くまでかけて作った企画書スライドを提出する。" },

  { type: "line", speaker: "佐藤課長", sprite: "sato_normal", text: "おう、例のスライド、できたか。見せてみろ。" },
  { type: "thought", text: "（……一晩かけて作った。今度こそ、文句のつけようがないはずだ）" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_angry", text: "……は？ なんだこれは。フォントがバラバラじゃないか。色のトーンも合ってない。これでお客様の前に出せると思っているのか？" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_angry", text: "いいか、スライドってのはな、見た目が9割なんだよ。中身がどんなに良くても、見た目がダメなら全部ゴミだ。やり直し。" },
  { type: "thought", text: "（……またか。何度直しても、何かが「気に入らない」らしい）" },
  { type: "narration", text: "ここからが、私の「本領発揮」であり、我が社の悪しき伝統である【スライド修正タイム】の始まりだった。" },

  { type: "game", gameId: "powerpotter", label: "【スライド修正タイム】開始――" },

  { type: "narration", text: "時計を見ると、すでに17時を回っていた。" },
  { type: "narration", text: "1回目の修正、2回目の修正……気づけば、提出のたびに課長は新しい「気に入らない点」を見つけ出した。" },
  { type: "narration", text: "5回目。「配色が安っぽい」。8回目。「やっぱり最初の方が良かったかもしれん」。12回目。「いや、これじゃない感じがする」。" },
  { type: "narration", text: "そして15回目の修正を終え、ふと壁の時計に目をやると――" },
  { type: "thought", text: "（……さっき確認したときは17時だったはずだ。もう一時間以上は経った気がするのに、まだ17時43分？　……思ったより、時間が経っていない）" },
  { type: "narration", text: "頭の中で、時間の感覚がほんの少しだけ、ずれた気がした。けれど私は、それを深く考えることをしない。考えないように、できている。" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_smile", text: "おう、今度のはいいじゃないか！　最初からこれを出せばよかったんだ。さすがだな。" },
  { type: "thought", text: "（……褒められた。なのに、何も嬉しくない。ただ、「これでようやく終わる」という安堵だけがある）" },

  { type: "narration", text: "解放された私の元に、明るい声が飛んでくる。" },
  { type: "line", speaker: "花", sprite: "hana_bigsmile", text: "おつかれさまー！！　また課長にいじめられてたでしょ、見てたよ！　今日もえらいえらい、よしよし！" },
  { type: "line", speaker: "花", sprite: "hana_bigsmile", text: "いつも助けてもらってばっかりでごめんね。ほんと、感謝してるんだから。ありがとうね、ね！" },
  { type: "thought", text: "（……花ちゃんは、いつもこうだ。距離感がおかしいくらい近い。まるで、誰かが「もっと親密に」と命じているかのように）" },
  { type: "line", speaker: "花", sprite: "hana_normal", text: "あ、でも無理しなくていいんだよ？　ほんとに、無理だけはしないでね……？　心配なんだから。" },
  { type: "narration", text: "花の笑顔の奥に、ほんの一瞬、何かに怯えるような陰がよぎった気がした。だが、それもすぐに消えてしまった。" },

  { type: "narration", text: "夕暮れ時、給湯室の前で、営業部の高橋とすれ違う。" },
  { type: "line", speaker: "高橋", sprite: "takahashi", text: "おい、お前。例の件、まだ終わってないのか？　どんだけ仕事が遅いんだよ。給料泥棒って言葉、知ってるか？" },
  { type: "line", speaker: "高橋", sprite: "takahashi", text: "はぁ……お前みたいなのがいるから、こっちまで評価が下がるんだよ。次は無いと思え。" },
  { type: "thought", text: "（……高橋さんの言葉は、いつも刃物みたいだ。けれど、なぜだろう。刺さるはずの言葉が、最近どこか「型通り」に聞こえる）" },
  { type: "narration", text: "私は、高橋の言葉をただ黙って受け止める。反論する理由も、その必要性も、見当たらなかったから。" },

  { type: "narration", text: "全ての業務を終え、フロアにはもう私しかいない。" },
  { type: "narration", text: "窓の外には、ビルの明かりが幾何学模様のように広がっている。誰もが、今日も同じように働き、同じように家路につく。" },
  { type: "thought", text: "（……この景色を、何度見ただろう。けれど、なぜか今日はやけに、作り物めいて見える）" },
  { type: "thought", text: "（花ちゃんの過剰な優しさ。高橋さんの過剰な厳しさ。佐藤課長の、終わらない「気に入らない」。まるで――誰かが、私の反応を試しているみたいだ）" },
  { type: "narration", text: "そんな埒もない考えを振り払うように、私は鞄を手に取り、オフィスの照明を落とそうとした。" },

  { type: "narration", text: "その時、デスクの電話がけたたましく鳴り響いた。" },
  { type: "narration", text: "こんな時間に、誰が――。" },
];

// ---- 第2章 ----
const CHAPTER_2 = [
  { type: "line", speaker: "高橋", sprite: "takahashi", text: "おい、そこ。お前の席の電話、鳴りっぱなしだぞ。早く取れよ。" },
  { type: "narration", text: "営業部の高橋が、私のデスクの後ろを通りすがりざまに吐き捨てた。相変わらず愛想のない奴だ。私を一体何だと思っているんだろう。" },
  { type: "narration", text: "ジリリリリリリン！\nジリリリリリリン！" },
  { type: "narration", text: "黒いプラスチック製のビジネスフォンが、デスクの上で激しく震えている。" },
  { type: "narration", text: "私は大きく息を吸い込み、受話器を持ち上げた。受話器のプラスチックの冷たさが、手のひらに伝わる。プロのサラリーマンたるもの、どんな時でも声のトーンは明るく、だ。" },
  { type: "narration", text: "「お電話ありがとうございます。カスタマーサポートセンターでございます」" },
  { type: "narration", text: "『おい！！！　どうなってるんだお前のところは！！！』" },
  { type: "narration", text: "受話器の向こうから、鼓膜を破らんばかりの怒号が飛び込んできた。声の主はかなり興奮しているようで、受話器越しでもビンビンと怒りのバイブスが伝わってくる。" },
  { type: "narration", text: "『こっちはな！　先週頼んだシステムが動かなくて大損害を被ってるんだよ！　責任者を出せ！　責任者を！　今すぐだ！！！』" },
  { type: "narration", text: "出た、典型的な激昂型クレーマー。" },
  { type: "narration", text: "並の社員ならここでパニックになるところだが、数々の修羅場をくぐり抜けてきた私の頭脳は、恐ろしいほど冷静だった。" },
  { type: "thought", text: "（相手が怒鳴り散らしている間に、頭の中で「何が原因で、どう切り返せば相手が落ち着くか」のロードマップが瞬時に構築されていく。よし、まずは「徹底的な傾聴と共感」からだ）" },
  { type: "narration", text: "「大変申し訳ございません。お客様に多大なご不便とご心配をおかけしておりますこと、心よりお詫び申し上げます」" },
  { type: "narration", text: "声のトーン、頭を下げる角度、すべてが完璧。ビジネスマナー研修のお手本のような謝罪を繰り出す。" },
  { type: "narration", text: "『謝って済むかよ！　口先だけなら何とでも言えるんだよ！　お前ら、本当に申し訳ないと思ってるのか！？　ええ！？　大体な、お前のその喋り方、何なんだよ！　さっきから聞いてりゃあ、マニュアル通りというか、心がこもってないんだよ！　お前、本当に生きてる人間か！？　ロボットと喋ってるみたいで余計に腹が立つんだよ！！！』" },
  { type: "thought", text: "（ロボットみたい、だと？　こっちは最大限の誠意を持って、プロの対応をしてやっているというのに、随分な暴言を吐くクレーマーだ。理不尽にも程があるが、ここで言い返したら負けである。私はぐっとこらえた）" },
  { type: "narration", text: "そこへ、私のパーテーションの横から佐藤課長がぬっと顔を覗かせ、手元のタブレットを見ながら小声で囁いてきた。" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_normal", text: "そこ、何をもたもたしてるんだ。相手は『人間味』を求めてるんだよ。もっと泥臭く、感情を揺さぶるような声を出すんだ。ほら、声を少し低くして、わざとらしくため息を混ぜるんだ。エモーショナルにいけ。そうすれば相手の反発が収まるから。" },
  { type: "narration", text: "課長の無茶振りも大概だが、背に腹は変えられない。私はすぐさま喉のコンディションを切り替え、全力のクレーム対応に臨んだ。" },

  { type: "game", gameId: "claim", label: "【クレーム対応】開始――" },

  { type: "narration", text: "「お客様のお怒り、ごもっともです……。私の至らなさのせいで、お客様の大切なビジネスに傷をつけてしまいました。本当に……本当に、申し訳ありません……」" },
  { type: "narration", text: "『……あ、いや。そこまで落ち込まなくてもいいけどさ』" },
  { type: "narration", text: "よし、食いついた。受話器の向こうの空気が、明らかに軟化する。男の怒りのボルテージが、急速に冷えていくのが手に取るように分かった。" },
  { type: "narration", text: "『まぁ、お前がそこまで言うならさ。別に、お前個人を責めたいわけじゃないんだよ。ただ、この画面の『送信』ボタンを押した時に、エラーコード「502」ってのが出てさ……』" },
  { type: "thought", text: "（エラーコード502。バッドゲートウェイか）" },
  { type: "narration", text: "それを聞いた瞬間、かつてマニュアルで目を通した社内システムのネットワーク構成図が、パッと頭の中に思い浮かんだ。第3サーバーのプロキシ設定の記述ミスに違いない。" },
  { type: "narration", text: "「お客様、そのまま10秒ほどお時間をいただけますでしょうか」" },
  { type: "narration", text: "私は外線を受け流しながら、片手で自社サーバーの設定画面を爆速で開いた。" },
  { type: "narration", text: "ここからは時間との勝負だ。指先をキーボードの上で滑らせ、数万行に及ぶコードの波からバグを特定し、流れるように書き換えていく。我ながら、今日のタイピングのキレは神がかっている。ゾーンに入るとはまさにこのことだ。" },
  { type: "narration", text: "「お待たせいたしました。お客様、もう一度『送信』ボタンを押していただけますか？」" },
  { type: "narration", text: "『え？　ああ、ちょっと待って……あ、動いた。いけたわ。なんだ、直せるんじゃん。ありがとな。お前、最初は冷たい奴だと思ったけど、なかなかしっかりしてるじゃない。助かったよ』" },
  { type: "narration", text: "「とんでもございません。また何かございましたら、いつでもお申し付けください」" },
  { type: "narration", text: "通話が切れ、受話器を置く。" },
  { type: "thought", text: "（ふぅ、大物だったな……。なぜか首のあたりが妙に熱い。知恵熱だろうか）" },
  { type: "narration", text: "パチパチパチパチ。" },
  { type: "narration", text: "背後から拍手が聞こえた。振り返ると、同期の花ちゃんが、目を輝かせて手を叩いていた。" },
  { type: "line", speaker: "花", sprite: "hana_bigsmile", text: "すごーい！　さすが頼りになる！　あの鬼クレーマーをあっという間に丸め込んじゃうなんて、あんたはやっぱり天才ね！　もう本当に尊敬しちゃう！" },
  { type: "narration", text: "「いやあ、まあね。プロだからね」" },
  { type: "narration", text: "私はちょっと得意げになって髪をかき上げた。一仕事終えた充実感に浸りながら、次の案件をチェックするために画面の右下に目をやる。" },
  { type: "narration", text: "【 21 : 35 】" },
  { type: "thought", text: "（よし、まだ21時半か。これなら終電前に余裕で帰れそうだ）" },
  { type: "narration", text: "だが、そんな私の前に、佐藤課長がどさりと新たな資料の束を置いた。" },
  { type: "line", speaker: "佐藤課長", sprite: "sato_normal", text: "よし、そこ。次の仕事だ。" },
];

const CHAPTERS = {
  ch1: { id: "ch1", title: "第1章　お前は、今日も。", script: CHAPTER_1 },
  ch2: { id: "ch2", title: "第2章　感情のサンドバッグ、あるいは過剰適応の果て", script: CHAPTER_2 },
};

const NEXT_CHAPTER = { ch1: "ch2" };

export function startStory(mount, params = {}) {
  const chapterId = params.chapter || "ch1";
  const startIndex = params.index || 0;
  const chapter = CHAPTERS[chapterId];

  const state = { idx: startIndex, finished: false };

  const root = el("div.screen.story-screen", {}, [
    el("div.story-bg"),
    el("div.story-sprite-wrap#story-sprite-wrap"),
    el("div.story-topbar", {}, [
      el("div.story-toolbtn", { text: "≡ ログ", onclick: (e) => { e.stopPropagation(); openLog(); } }),
      el("div.story-toolbtn", { text: "スキップ ▶▶", onclick: (e) => { e.stopPropagation(); skipToEnd(); } }),
    ]),
    el("div.story-textbox#story-textbox", {}, [
      el("div.story-nameplate#story-nameplate"),
      el("div.story-text#story-text"),
      el("div.story-tap-hint", { text: "▼ タップして進む" }),
    ]),
  ]);

  const seenBeats = [];
  for (let i = 0; i < startIndex && i < chapter.script.length; i++) {
    const b = chapter.script[i];
    if (b.type !== "game") seenBeats.push(b);
  }

  root.addEventListener("click", (e) => {
    if (e.target.closest(".story-topbar")) return;
    if (e.target.closest(".story-log-modal")) return;
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
    if (beat.type !== "game" && seenBeats[seenBeats.length - 1] !== beat) {
      seenBeats.push(beat);
    }
  }

  function openLog() {
    const list = el("div.story-log-list");
    seenBeats.forEach((b) => {
      const row = el("div.story-log-row");
      if (b.type === "line") {
        row.classList.add("dialogue");
        row.appendChild(el("div.story-log-name", { text: b.speaker }));
        row.appendChild(el("div.story-log-text", { text: b.text }));
      } else if (b.type === "thought") {
        row.classList.add("thought");
        row.appendChild(el("div.story-log-text", { text: b.text }));
      } else {
        row.classList.add("narration");
        row.appendChild(el("div.story-log-text", { text: b.text }));
      }
      list.appendChild(row);
    });
    const modal = el("div.story-log-modal", { onclick: (e) => e.stopPropagation() }, [
      el("div.story-log-header", {}, [
        el("div.story-log-title", { text: "テキストログ" }),
        el("div.story-log-close", { text: "✕ 閉じる", onclick: () => modal.remove() }),
      ]),
      list,
    ]);
    root.appendChild(modal);
    list.scrollTop = list.scrollHeight;
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

    const nextChapterId = NEXT_CHAPTER[chapterId];
    const buttons = [];
    if (nextChapterId && CHAPTERS[nextChapterId]) {
      buttons.push(el("button.pbtn.purple.block", { onclick: () => Router.go("story", { chapter: nextChapterId }) }, [el("span", { text: "次の章へ" })]));
    }
    buttons.push(el("button.pbtn.outline.block", { onclick: () => Router.menu() }, [el("span", { text: "メニューへ戻る" })]));

    const overlay = el("div.story-end-overlay", {}, [
      el("div.story-end-title", { text: `── ${chapter.title}　了 ──` }),
      el("div.story-end-sub", { text: nextChapterId ? "" : "（つづく）" }),
      ...buttons,
    ]);
    root.appendChild(overlay);
  }

  return { dispose() {} };
}
