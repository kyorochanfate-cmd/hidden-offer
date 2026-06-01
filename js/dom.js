// =========================================================================
// dom.js — 最小DOMヘルパー（依存ゼロ）
// =========================================================================

/** el("div.cls#id", {attr}, [children]) 風の生成ヘルパ */
export function el(tag, props = {}, children = []) {
  let tagName = "div";
  const classes = [];
  let id = null;
  const m = tag.match(/^([a-z0-9]+)?/i);
  if (m && m[1]) tagName = m[1];
  tag.replace(/\.([\w-]+)/g, (_, c) => (classes.push(c), ""));
  const idm = tag.match(/#([\w-]+)/);
  if (idm) id = idm[1];

  const node = document.createElement(tagName);
  if (classes.length) node.className = classes.join(" ");
  if (id) node.id = id;

  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = (node.className ? node.className + " " : "") + v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset" && typeof v === "object") Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }

  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  if (children == null) return;
  if (!Array.isArray(children)) children = [children];
  for (const c of children) {
    if (c == null || c === false) continue;
    if (typeof c === "string" || typeof c === "number") node.appendChild(document.createTextNode(String(c)));
    else node.appendChild(c);
  }
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function toast(message) {
  let t = document.getElementById("toast");
  if (!t) { t = el("div#toast"); document.body.appendChild(t); }
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

/** requestAnimationFrame ベースの簡易ゲームループ */
export function loop(fn) {
  let last = performance.now();
  let running = true;
  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    fn(dt);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { stop() { running = false; } };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
