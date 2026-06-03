// =========================================================================
// state.js — プレイヤー状態（localStorage 永続化）
// 仕様書 6-1: coins / unlockedGames / collections のみの軽量構造
// Sell and Forget: サーバー不要、端末ローカルで完結
// =========================================================================

import { GAME_ORDER, STARTER_GAME_ID } from "./data.js?v=1.2.3";

// ★ 開発モード：true で起動時に全求人アンロック＋コイン9999
const DEV_UNLOCK_ALL = true;

// セーブキーは DEV モードを切り替えるたびにバンプ（既存セーブを無効化）
const KEY = DEV_UNLOCK_ALL ? "hidden-offer-save-dev1" : "hidden-offer-save-v1";

const listeners = new Set();

const defaultState = () => DEV_UNLOCK_ALL
  ? ({
      coins: 9999,
      unlockedGames: [...GAME_ORDER],   // 全求人アンロック
      collections: [],
    })
  : ({
      coins: 0,
      unlockedGames: [STARTER_GAME_ID],
      collections: [],
    });

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.unlockedGames) || parsed.unlockedGames.length === 0) {
      return defaultState();
    }
    return {
      coins: parsed.coins | 0,
      unlockedGames: parsed.unlockedGames,
      collections: parsed.collections || [],
    };
  } catch {
    return defaultState();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((fn) => fn(state));
}

export const Store = {
  get() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  // --- コイン ---
  get coins() { return state.coins; },
  addCoins(n) { state.coins = Math.max(0, state.coins + n); save(); },
  spendCoins(n) {
    if (state.coins < n) return false;
    state.coins -= n; save(); return true;
  },

  // --- アンロック ---
  isUnlocked(id) { return state.unlockedGames.includes(id); },
  unlockGame(id) {
    if (!state.unlockedGames.includes(id)) { state.unlockedGames.push(id); save(); }
  },
  get unlockedGames() { return state.unlockedGames; },
  unlockedCount() {
    return GAME_ORDER.filter((id) => state.unlockedGames.includes(id)).length;
  },

  // --- コレクション ---
  addCollection(id) { state.collections.push(id); save(); },
  get collections() { return state.collections; },

  reset() { state = defaultState(); save(); },
};
