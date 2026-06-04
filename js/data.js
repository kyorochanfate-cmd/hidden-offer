// =========================================================================
// data.js — マスターデータ
// 仕様書 6-2: 新ゲーム追加は GAMES に1エントリ＋GAME_ORDERに1行で完結
// =========================================================================

export const STARTER_GAME_ID = "powerpotter";
export const GACHA_COST = 50;

export const GAMES = {
  powerpotter: {
    id: "powerpotter",
    title: "スライド職人",
    subtitle: "Slides of Fury",
    jpTitle: "スライド職人",
    theme: "終わりなきスライド修正",
    posting: "大手SIerでのパワポスライド爆速量産マスター",
    salary: "コインによる歩合制 / お祈り保険完備",
    color: "#c0432b",
    app: "プレゼン資料作成",
  },
  chatrally: {
    id: "chatrally",
    title: "Chat Response Rally",
    subtitle: "スタンプの忖度",
    jpTitle: "チャット・レスポンス・ラリー",
    theme: "過剰な絵文字スタンプ選び",
    posting: "秒速で空気を読むビジネスチャット忖度オペレーター",
    salary: "成果報酬 / 既読スルー厳禁",
    color: "#4a154b",
    app: "ビジネスチャット",
  },
  jiggler: {
    id: "jiggler",
    title: "Mouse Jiggler",
    subtitle: "Stay Active",
    jpTitle: "マウス・ジグラー",
    theme: "ステータスを緑に保つ工作",
    posting: "常時オンライン死守スペシャリスト（成果物不問）",
    salary: "フルリモート / 在席時間で評価",
    color: "#2fae8f",
    app: "在席ステータス維持",
  },
  exchange: {
    id: "exchange",
    title: "The Memory",
    subtitle: "名刺おぼえ会議",
    jpTitle: "名刺おぼえ会議",
    theme: "交換した名刺を瞬時に記憶し、上司の質問に番号で答える",
    posting: "短期記憶に自信のある営業職募集",
    salary: "正答ボーナス制 / ライフ3つで挑戦",
    color: "#b8860b",
    app: "名刺記憶テスト",
  },
  toilet: {
    id: "toilet",
    title: "Stall Hunt",
    subtitle: "個室争奪戦",
    jpTitle: "個室争奪戦",
    theme: "昼食後フロア、空き個室を探し当てろ",
    posting: "限界の腹痛を抱え空き個室を秒速で見つけられる方",
    salary: "成功フロアごとに歩合 / 漏らしたら無給",
    color: "#9bb8d9",
    app: "空き個室サーチ",
  },
  mail: {
    id: "mail",
    title: "Morning Mail Check",
    subtitle: "朝イチメールチェック",
    jpTitle: "朝イチメールチェック",
    theme: "朝礼前にメールを仕分けろ",
    posting: "朝礼前の5分でメールを完全処理できる方",
    salary: "処理数歩合制 / 誤仕分けでライフ消費",
    color: "#1a3a6b",
    app: "メール",
  },
};

export const GAME_ORDER = ["powerpotter", "chatrally", "jiggler", "exchange", "toilet", "mail"];

// --- お祈りメール（ハズレ） ---
export const REJECTION_MAILS = [
  {
    id: "mail_careful",
    from: "株式会社グローバルシナジー 人事部",
    body: "この度は弊社の求人にご応募いただき誠にありがとうございました。\n慎重に選考を重ねました結果、誠に残念ながら今回はご期待に添いかねる結果となりました。\n\nなお、貴殿の今後益々のご活躍をお祈り申し上げます。",
  },
  {
    id: "mail_match",
    from: "ネクストキャリア・パートナーズ",
    body: "厳正なる選考の結果、今回はご縁がなかったものとさせていただきます。\nあなたの市場価値とポジションの要件が、総合的に「マッチしなかった」と判断いたしました。\n\n3秒後にこのメールは記憶から消去されます。",
  },
  {
    id: "mail_culture",
    from: "カルチャーフィット採用委員会",
    body: "書類選考の結果をお知らせします。\nスキルは申し分ないものの、弊社の「カルチャー」にフィットしないと全会一致で判断いたしました。\n（カルチャーの定義は社内でも不明です）\n\n益々のご清祥をお祈りいたします。",
  },
  {
    id: "mail_potential",
    from: "ポテンシャル重視株式会社",
    body: "ポテンシャルを重視した選考の結果、あなたのポテンシャルは確認できませんでした。\n\nまた何かの機会がございましたら、その時はおそらく同じ結果になるかと存じます。",
  },
];

// --- 市場価値診断（称号） ---
export const TITLES = [
  { id: "title_newbie", name: "新入社員の雑用レベル", power: 5, desc: "コピー用紙の補充で1日が終わる。" },
  { id: "title_yesman", name: "高速うなずきマシン", power: 120, desc: "会議で最も多く首を縦に振った人物。" },
  { id: "title_stamp", name: "スタンプ忖度ニンジャ", power: 340, desc: "0.2秒で適切な絵文字を選定できる。" },
  { id: "title_ghost", name: "在席ステータスの亡霊", power: 580, desc: "緑ランプだけがそこに在る。本体は不在。" },
  { id: "title_slide", name: "深夜スライド錬成師", power: 999, desc: "AM3時、円グラフだけが輝いている。" },
  { id: "title_legend", name: "伝説の中間管理職", power: 9999, desc: "上にも下にも気を遣い、心は空。" },
];

export function getCollectionEntry(id) {
  const m = REJECTION_MAILS.find((x) => x.id === id);
  if (m) return { ...m, kind: "mail" };
  const t = TITLES.find((x) => x.id === id);
  if (t) return { ...t, kind: "title" };
  return null;
}

// --- ガチャ抽選 ---
// 戻り値: {type:"unlock", gameId} | {type:"mail", entry} | {type:"title", entry}
export function rollGacha(unlockedGames) {
  const locked = GAME_ORDER.filter((id) => !unlockedGames.includes(id));
  if (locked.length > 0 && Math.random() < 0.55) {
    return { type: "unlock", gameId: locked[0] };
  }
  if (Math.random() < 0.5) {
    return { type: "mail", entry: REJECTION_MAILS[(Math.random() * REJECTION_MAILS.length) | 0] };
  }
  return { type: "title", entry: TITLES[(Math.random() * TITLES.length) | 0] };
}
