// =========================================================================
// icons.js — Office風ベクターアイコン（SVG文字列）。商標回避の汎用モチーフ。
// =========================================================================

const wrap = (inner, stroke = "#605e5c") =>
  `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const ICONS = {
  paste: (c = "#605e5c", a = "#c0432b") => wrap(
    `<rect x="5" y="4" width="14" height="17" rx="1.5"/><rect x="9" y="2.5" width="6" height="3" rx="1" fill="${a}" stroke="${a}"/><rect x="7.5" y="8" width="9" height="10" rx="1" fill="#fff"/>`, c),
  copy: (c = "#605e5c") => wrap(
    `<rect x="4" y="4" width="11" height="13" rx="1.5" fill="#fff"/><rect x="8" y="7" width="11" height="13" rx="1.5" fill="#fff"/>`, c),
  align: (c = "#605e5c") => wrap(
    `<line x1="4" y1="6" x2="18" y2="6"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="18" y2="14"/><line x1="4" y1="18" x2="11" y2="18"/>`, c),
  newSlide: (c = "#605e5c", a = "#c0432b") => wrap(
    `<rect x="3.5" y="5" width="14" height="10" rx="1" fill="#fff"/><line x1="18" y1="16" x2="18" y2="22" stroke="${a}"/><line x1="15" y1="19" x2="21" y2="19" stroke="${a}"/>`, c),
  textbox: (c = "#605e5c") => wrap(
    `<rect x="3.5" y="6" width="17" height="12" rx="1"/><text x="12" y="15" font-size="9" fill="${c}" stroke="none" text-anchor="middle" font-weight="700">A</text>`, c),
  image: (c = "#605e5c", a = "#c0432b") => wrap(
    `<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6" fill="${a}" stroke="none"/><path d="M5 17l4-4 3 2 3-3 4 5"/>`, c),
  chart: (c = "#605e5c", a = "#c0432b") => wrap(
    `<rect x="5" y="13" width="3.4" height="6" fill="${a}" stroke="none"/><rect x="10.3" y="9" width="3.4" height="10" fill="${c}" stroke="none"/><rect x="15.6" y="5" width="3.4" height="14" fill="${a}" stroke="none"/>`, c),
  shape: (c = "#605e5c") => wrap(`<circle cx="12" cy="12" r="8"/>`, c),
  save: (c = "#ffe6df", a = "#fff") => wrap(`<path d="M5 4h11l3 3v13H5z"/><rect x="8" y="4" width="7" height="5" fill="${a}" stroke="none"/>`, c),
  undo: (c = "#ffe6df") => wrap(`<path d="M8 8H15a4 4 0 0 1 0 8H9"/><path d="M8 5l-3 3 3 3"/>`, c),
  redo: (c = "#ffe6df") => wrap(`<path d="M16 8H9a4 4 0 0 0 0 8h6"/><path d="M16 5l3 3-3 3"/>`, c),
};
