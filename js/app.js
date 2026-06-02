// =========================================================================
// app.js — エントリ＆ルーター
// 仕様書 6-2: 画面遷移は必ず Router 経由。各画面は独立モジュール。
// =========================================================================

import { renderMenu } from "./screens/menu.js?v=1.1.0";
import { renderJobs } from "./screens/jobs.js?v=1.1.0";
import { renderGacha } from "./screens/gacha.js?v=1.1.0";
import { renderCollection } from "./screens/collection.js?v=1.1.0";
import { renderSettings } from "./screens/settings.js?v=1.1.0";
import { GAMES } from "./data.js?v=1.1.0";

// 各ミニゲームの起動関数
import { startPowerPotter } from "./games/powerpotter.js?v=1.1.0";
import { startChatRally } from "./games/chatrally.js?v=1.1.0";
import { startJiggler } from "./games/jiggler.js?v=1.1.0";
import { startExchange } from "./games/exchange.js?v=1.1.0";

const GAME_LAUNCHERS = {
  powerpotter: startPowerPotter,
  chatrally: startChatRally,
  jiggler: startJiggler,
  exchange: startExchange,
};

const app = document.getElementById("app");
let current = null; // 現在のクリーンアップ関数

export const Router = {
  go(route, params = {}) {
    // 直前画面の後始末
    if (current && typeof current.dispose === "function") current.dispose();
    current = null;

    let result;
    switch (route) {
      case "menu":       result = renderMenu(mount); break;
      case "jobs":       result = renderJobs(mount); break;
      case "gacha":      result = renderGacha(mount); break;
      case "collection": result = renderCollection(mount); break;
      case "settings":   result = renderSettings(mount); break;
      case "game":       result = GAME_LAUNCHERS[params.id]?.(mount, params.id); break;
      default:           result = renderMenu(mount);
    }
    current = result || null;
  },
  menu() { this.go("menu"); },
  gacha() { this.go("gacha"); },
  collection() { this.go("collection"); },
  game(id) { if (GAMES[id]) this.go("game", { id }); },
};

/** 画面ノードを #app に差し替えてマウントする */
function mount(screenNode) {
  app.replaceChildren(screenNode);
  return screenNode;
}

// 初期画面
Router.go("menu");

// グローバル公開（デバッグ用）
window.Router = Router;
