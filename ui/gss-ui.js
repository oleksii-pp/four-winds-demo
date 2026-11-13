/* GSS UI kit v1.4.0 (header text from v1.2) — shared, themeable slot HUD (canvas). No raster images: every icon is vector
 * (Path2D SVG paths or canvas strokes). One file, no dependencies.
 *
 *   const hud = GSSUI.createHud({ W:1080, H:1920, theme:{...}, get:{...}, on:{...} });
 *   // each frame, after drawing the game:  hud.draw(ctx)
 *   // on pointerdown (canvas coords):      if (hud.hit(x, y)) return;
 *   // popups are drawn by hud.drawSheet(ctx) (call last), same as the modal sheet.
 *
 * Layout copies the GSS standard: row 1 = TURBO pill · big SPIN disc · BUY pill;
 * row 2 = [autoplay | quick spin] pill and [− | BET value | +] pill; bottom bar =
 * menu · TOTAL · GAME NAME™ · BALANCE · sound. Portrait is the reference; landscape is a
 * first-pass layout (see README).
 *
 * v1.2: AUTOPLAY and BET popups (theme accent, dark glass). See README.
 *
 * v1.3.0: opt-in portrait layout 'D2' (default layout unchanged; layoutPortrait stays the default):
 *   createHud({ layout: 'D2', orientation: 'portrait', ... })
 * D2 = side rails in the lower zone, centre SPIN, bottom bar kept, no header.
 * Landscape is unchanged even when layout is 'D2'.
 *
 * v1.4.0 (all opt-in; nothing changes unless a game asks):
 *   createHud({ hideBuy: true })            no BUY pill (no draw, no hit; layout.buy = null). D2: the left rail is the 3 icons,
 *                                           row-aligned with the bet pills, and layout.top moves down to the rail top.
 *                                           hideBuy: { keepTop: true } keeps layout.top where BUY was. Setter: hud.setHideBuy(on, opt).
 *   hud.setTotalDim(a, ms = 150)            bar TOTAL (label + value) eases to alpha a over ms (real time); 1 = normal.
 *   hud.bumpTotal(scale = 1.09, ms = 180)   one scale pulse of the TOTAL value about layout.totalAnchor (real time).
 *   get.totalFx: () => ({ a, s })           alternative: the game drives TOTAL alpha / scale every frame.
 *   theme.pillSprite = { img, l, r }        pills / round icons from a painted capsule (3-slice, l/r caps in image px); the
 *                                           active tint and rim colour still come from the theme. theme.pillSpriteRim: false = no rim.
 *   theme.spinSprite = { img }              SPIN disc from a painted image (drawn into the disc box); the icon is drawn on top.
 */
(function (root) {
'use strict';

const DEFAULT_THEME = {
  name: 'GAME NAME',
  accent: '#38d6ff',           // turbo rocket, active states, popup accents (OFF / current bet)
  accent2: '#ffd84a',          // secondary accent (rocket flame)
  pillFill: '#0b0d10',         // smoked glass base colour
  pillOpacity: 0.6,            // 0..1
  pillGloss: 0.10,             // top highlight strength
  rim: 'rgba(225,228,232,0.75)',
  rimWidth: 2,
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.55)',
  label: 'rgba(255,255,255,0.72)', // small caps labels (BET / TOTAL / BALANCE)
  spinDisc: ['#3a3f46', '#0a0c0f'], // radial: highlight -> edge
  spinRim: 'rgba(225,228,232,0.85)',
  spinIcon: '#ffffff',
  divider: 'rgba(255,255,255,0.28)',
  bar: 'rgba(0,0,0,0.72)',
  barRim: 'rgba(255,255,255,0.10)',
  disabledAlpha: 0.42,
  currency: '€', decimal: ',', thousands: '.', currencySpace: true,
};

// K3 (v1.1): the HUD font is locked inside the kit. A theme `font` key is ignored.
const FONT = 'system-ui, -apple-system, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif';

// v1.2: default stake ladder (games pass get.bets() to override) and autoplay counts.
const DEFAULT_BETS = [0.20, 0.40, 0.60, 0.80, 1.00, 1.50, 2.00, 3.00, 5.00, 10.00, 20.00, 50.00, 100.00];
const AUTOPLAY_COUNTS = [10, 25, 50, 100, 500, 1000];

/* ---------- money ---------- */
function formatMoney(v, th) {
  th = Object.assign({}, DEFAULT_THEME, th || {});
  const neg = v < 0; v = Math.abs(Math.round((+v || 0) * 100) / 100);
  const [i, d] = v.toFixed(2).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, th.thousands);
  return (neg ? '-' : '') + th.currency + (th.currencySpace ? ' ' : '') + int + th.decimal + d;
}

/* ---------- time warp (turbo / quick spin) ----------
 * Speeds up a game's presentation clock without touching its logic: performance.now()
 * returns a virtual time that runs `speed`× faster, and setTimeout/setInterval delays are
 * divided by `speed`. Install BEFORE game/fx scripts load. Re-anchors so time stays monotonic. */
const timeWarp = (function () {
  let installed = null;
  // K2 (v1.1): real (unwarped) time, captured when the kit loads, so it is real even if a game calls
  // install() later. Use these for caps and autoplay timeouts that must not follow turbo.
  const perf0 = root.performance, realNow0 = perf0 && perf0.now ? perf0.now.bind(perf0) : () => Date.now();
  const realST0 = root.setTimeout.bind(root);
  return {
  realNow() { return installed ? installed.realNow() : realNow0(); },
  realSetTimeout(fn, ms, ...a) { return realST0(fn, Math.max(0, +ms || 0), ...a); },
  getSpeed() { return installed ? installed.speed : 1; },
  get installed() { return !!installed; },
  install() {
    if (installed) return installed;
    const perf = root.performance, realNow = perf.now.bind(perf);
    const realST = root.setTimeout.bind(root), realSI = root.setInterval.bind(root);
    let speed = 1, anchorReal = realNow(), anchorVirt = anchorReal;
    const virt = () => anchorVirt + (realNow() - anchorReal) * speed;
    perf.now = virt;
    root.setTimeout = (fn, ms, ...a) => realST(fn, Math.max(0, (+ms || 0) / speed), ...a);
    root.setInterval = (fn, ms, ...a) => realSI(fn, Math.max(0, (+ms || 0) / speed), ...a);
    installed = {
      get speed() { return speed; },
      setSpeed(k) { k = Math.max(0.1, +k || 1); if (k === speed) return; anchorVirt = virt(); anchorReal = realNow(); speed = k; },
      getSpeed() { return speed; },
      realNow, realSetTimeout: (fn, ms, ...a) => realST(fn, Math.max(0, +ms || 0), ...a),
    };
    return installed;
  } };
})();

/* ---------- drawing primitives ---------- */
function rr(g, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function hexA(col, a) { // '#rrggbb' -> rgba with alpha; other formats returned as-is
  if (typeof col === 'string' && /^#[0-9a-f]{6}$/i.test(col)) {
    const n = parseInt(col.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return col;
}
function contrastInk(col) {
  let r = 255, g = 255, b = 255;
  if (typeof col === 'string' && /^#[0-9a-f]{6}$/i.test(col)) {
    const n = parseInt(col.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255;
  } else if (typeof col === 'string') {
    const m = col.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? '#1a1208' : '#ffffff';
}
const imgOk = im => !!(im && (im.complete === undefined || im.complete) && (im.naturalWidth || im.width));
function sprite3(g, sp, x, y, w, h) { // horizontal 3-slice capsule: caps keep their aspect at height h, the middle stretches
  const im = sp.img, iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, k = h / ih, l = (sp.l ?? ih / 2), r = (sp.r ?? ih / 2), L = l * k, Rr = r * k;
  if (w <= L + Rr + 1) { g.drawImage(im, x, y, w, h); return; } // round icon / short pill: the whole image
  g.drawImage(im, 0, 0, l, ih, x, y, L, h); g.drawImage(im, l, 0, iw - l - r, ih, x + L, y, w - L - Rr, h); g.drawImage(im, iw - r, 0, r, ih, x + w - Rr, y, Rr, h);
}
function pill(g, th, x, y, w, h, o = {}) {
  if (th.pillSprite && imgOk(th.pillSprite.img)) { // v1.4.0 opt-in painted pill
    g.save(); sprite3(g, th.pillSprite, x, y, w, h);
    if (o.active) { rr(g, x, y, w, h, h / 2); const ag = g.createLinearGradient(0, y, 0, y + h); ag.addColorStop(0, hexA(th.accent, 0.30)); ag.addColorStop(1, hexA(th.accent, 0.08)); g.fillStyle = ag; g.fill(); }
    if (th.pillSpriteRim !== false && (o.active || th.pillSpriteRim)) { g.lineWidth = th.rimWidth; g.strokeStyle = o.active ? th.accent : th.rim; rr(g, x + th.rimWidth / 2, y + th.rimWidth / 2, w - th.rimWidth, h - th.rimWidth, (h - th.rimWidth) / 2); g.stroke(); }
    g.restore(); return;
  }
  g.save();
  rr(g, x, y, w, h, h / 2);
  g.fillStyle = hexA(th.pillFill, th.pillOpacity); g.fill();
  if (th.pillGloss > 0) {
    const gl = g.createLinearGradient(0, y, 0, y + h);
    gl.addColorStop(0, `rgba(255,255,255,${th.pillGloss})`); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fill();
  }
  if (o.active) {
    const ag = g.createLinearGradient(0, y, 0, y + h);
    ag.addColorStop(0, hexA(th.accent, 0.30)); ag.addColorStop(1, hexA(th.accent, 0.08));
    g.fillStyle = ag; g.fill();
  }
  g.lineWidth = th.rimWidth; g.strokeStyle = o.active ? th.accent : th.rim;
  rr(g, x + th.rimWidth / 2, y + th.rimWidth / 2, w - th.rimWidth, h - th.rimWidth, (h - th.rimWidth) / 2); g.stroke();
  g.restore();
}
function vline(g, th, x, y0, y1) { g.save(); g.strokeStyle = th.divider; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); g.restore(); }

/* ---------- vector icons (all drawn centred at cx,cy in a box of size s) ---------- */
const P = (d) => (typeof Path2D !== 'undefined' ? new Path2D(d) : null);
const PATHS = {
  // 24×24 viewBox
  rocketBody: P('M12 1.6c3.3 2.6 5 6.3 5 10.6l-1.7 3.4H8.7L7 12.2C7 7.9 8.7 4.2 12 1.6z'),
  rocketFinL: P('M7.4 12.4 4.3 15.6l1.1 3.6 3.6-2.6z'),
  rocketFinR: P('M16.6 12.4l3.1 3.2-1.1 3.6-3.6-2.6z'),
  rocketFlame: P('M9.6 16.6h4.8L12 22.6z'),
  bolt: P('M13.6 1.5 4.2 13.6h6.3l-1.3 8.9 9.6-12.6h-6.5z'),
  speaker: P('M3 8.8h4.2L12.6 4v16l-5.4-4.8H3z'),
};
function withBox(g, cx, cy, s, fn) { g.save(); g.translate(cx - s / 2, cy - s / 2); g.scale(s / 24, s / 24); fn(); g.restore(); }
function arrowHead(g, x, y, ang, len, col) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath();
  g.moveTo(len * 0.9, 0); g.lineTo(-len * 0.45, -len * 0.75); g.lineTo(-len * 0.45, len * 0.75); g.closePath(); g.fill(); g.restore();
}
const ICON = {
  refresh(g, cx, cy, s, col, rot = 0) { // big circular arrow (spin)
    const r = s * 0.36, lw = s * 0.11, a0 = -Math.PI * 0.30 + rot, a1 = a0 + Math.PI * 1.62;
    g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
    arrowHead(g, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, a1 + Math.PI / 2, lw * 1.55, col);
    g.restore();
  },
  autoplay(g, cx, cy, s, col) { // two circular arrows
    const r = s * 0.34, lw = s * 0.085;
    g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
    for (const base of [-Math.PI * 0.95, Math.PI * 0.05]) {
      const a0 = base + 0.25, a1 = base + Math.PI - 0.45;
      g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
      arrowHead(g, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, a1 + Math.PI / 2, lw * 1.6, col);
    }
    g.restore();
  },
  bolt(g, cx, cy, s, col) { withBox(g, cx, cy, s, () => { g.fillStyle = col; g.fill(PATHS.bolt); }); },
  rocket(g, cx, cy, s, col, col2) {
    withBox(g, cx, cy, s, () => {
      g.translate(12, 12); g.rotate(Math.PI / 4); g.translate(-12, -12); // classic 45° launch
      g.fillStyle = col2; g.fill(PATHS.rocketFlame);
      g.fillStyle = col; g.fill(PATHS.rocketBody); g.fill(PATHS.rocketFinL); g.fill(PATHS.rocketFinR);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(12, 8.6, 1.9, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(11.5, 8.1, 0.7, 0, 7); g.fill();
    });
  },
  menu(g, cx, cy, s, col) {
    g.save(); g.strokeStyle = col; g.lineWidth = s * 0.1; g.lineCap = 'round';
    for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(cx - s * 0.36, cy + k * s * 0.27); g.lineTo(cx + s * 0.36, cy + k * s * 0.27); g.stroke(); }
    g.restore();
  },
  sound(g, cx, cy, s, col, on = true) {
    withBox(g, cx, cy, s, () => {
      g.fillStyle = col; g.fill(PATHS.speaker);
      g.strokeStyle = col; g.lineWidth = 2; g.lineCap = 'round';
      if (on) { g.beginPath(); g.arc(13, 12, 4, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(13, 12, 7.6, -0.95, 0.95); g.stroke(); }
      else { g.beginPath(); g.moveTo(15.5, 9); g.lineTo(21.5, 15); g.moveTo(21.5, 9); g.lineTo(15.5, 15); g.stroke(); }
    });
  },
  minus(g, cx, cy, s, col) { g.save(); g.strokeStyle = col; g.lineWidth = s * 0.13; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - s * 0.36, cy); g.lineTo(cx + s * 0.36, cy); g.stroke(); g.restore(); },
  plus(g, cx, cy, s, col) { ICON.minus(g, cx, cy, s, col); g.save(); g.strokeStyle = col; g.lineWidth = s * 0.13; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy - s * 0.36); g.lineTo(cx, cy + s * 0.36); g.stroke(); g.restore(); },
};

/* ---------- layouts (canvas units) ---------- */
function layoutPortrait(W, H) {
  const k = W / 1080;                       // everything authored at 1080 wide
  const barH = 96 * k, pillH = 100 * k, spinR = 0.8 * pillH, row2H = 96 * k;
  const barY = H - barH, row2Y = barY - 26 * k - row2H, row1CY = row2Y - 14 * k - spinR;
  const cx = W / 2, sidePillW = 1.4 * spinR * 2, gap = 28 * k;
  return {
    k, orientation: 'portrait',
    top: row1CY - spinR,                    // highest pixel the HUD uses (game keeps clear above this)
    spin: { x: cx, y: row1CY, r: spinR },
    turbo: { x: cx - spinR - gap - sidePillW, y: row1CY - pillH / 2, w: sidePillW, h: pillH },
    buy: { x: cx + spinR + gap, y: row1CY - pillH / 2, w: sidePillW, h: pillH },
    auto: { x: 54 * k, y: row2Y, w: 440 * k, h: row2H },
    bet: { x: W - 54 * k - 440 * k, y: row2Y, w: 440 * k, h: row2H },
    bar: { x: 0, y: barY, w: W, h: barH },
  };
}
function layoutPortraitD2(W, H, opt) {
  // Side rails in the lower zone, centre SPIN, bottom bar back, no header.
  // Authored at 1080×1920 (see shared/ui/layout_variants/variants.js layoutD2).
  // TOTAL WIN merges into the bar; BUY sits above the left rail.
  const k = W / 1080;
  const barH = 96 * k, barY = H - barH;
  const ih = 96 * k, gap = 12 * k, stackH = 4 * ih + 3 * gap; // BUY + 3 icons
  const stackEnd = barY - 8 * k;
  const stackTop = stackEnd - stackH;
  const buyH = ih;
  const iconTop = stackTop + buyH + gap;
  const cxL = 86 * k, r = 48 * k;
  const plus = { x: 848 * k, y: iconTop, w: 200 * k, h: ih };
  const betVal = { x: 848 * k, y: iconTop + ih + gap, w: 200 * k, h: ih };
  const minus = { x: 848 * k, y: iconTop + 2 * (ih + gap), w: 200 * k, h: ih };
  const cy = barY + barH / 2;
  const L = {
    k, orientation: 'portrait', variant: 'D2',
    top: stackTop,
    spin: { x: W / 2, y: iconTop + ih + gap + ih / 2, r: 116 * k },
    buy: { x: cxL - 74 * k, y: stackTop, w: 148 * k, h: buyH },
    left: [
      { kind: 'autoplay', x: cxL, y: iconTop + ih / 2, r },
      { kind: 'turbo',    x: cxL, y: iconTop + ih + gap + ih / 2, r },
      { kind: 'quick',    x: cxL, y: iconTop + 2 * (ih + gap) + ih / 2, r },
    ],
    plus, betVal, minus,
    // Popup anchors / hit compatibility with the v1.2 popup layout.
    auto: { x: cxL - r, y: iconTop, w: r * 2, h: ih },
    turbo: { x: cxL - r, y: iconTop + ih + gap, w: r * 2, h: ih },
    quick: { x: cxL - r, y: iconTop + 2 * (ih + gap), w: r * 2, h: ih },
    bet: betVal,
    bar: { x: 0, y: barY, w: W, h: barH },
    // Slam / fly-to target: visual centre of the bar's left-aligned TOTAL value.
    totalAnchor: { x: 200 * k, y: cy + 15 * k },
    keepTotalWin: false,
  };
  if (opt && opt.hideBuy) { L.buy = null; L.buyHidden = true; if (!(opt.hideBuy && opt.hideBuy.keepTop)) L.top = iconTop; } // v1.4.0: 3-icon rail = the 3 bet pills' rows
  return L;
}
function layoutLandscape(W, H) {
  // First pass: spin cluster stacked in a right column, autoplay + bet stacked in a left
  // column, bar across the bottom. Board sits in the middle.
  const k = H / 1080, barH = 76 * k, pillH = 92 * k, spinR = 0.85 * pillH;
  const colW = 300 * k, rx = W - 40 * k - colW, lx = 40 * k, midY = (H - barH) / 2;
  const sp = { x: rx + colW / 2, y: midY, r: spinR };
  return {
    k, orientation: 'landscape', top: 0, leftW: lx + colW, rightX: rx,
    spin: sp,
    turbo: { x: rx + 20 * k, y: midY - spinR - 30 * k - pillH, w: colW - 40 * k, h: pillH },
    buy: { x: rx + 20 * k, y: midY + spinR + 30 * k, w: colW - 40 * k, h: pillH },
    auto: { x: lx, y: midY - pillH - 20 * k, w: colW, h: pillH },
    bet: { x: lx, y: midY + 20 * k, w: colW, h: pillH },
    bar: { x: 0, y: H - barH, w: W, h: barH },
  };
}

/* ---------- HUD ---------- */
function createHud(opts) {
  const o = Object.assign({ W: 1080, H: 1920, orientation: 'auto' }, opts);
  let th = Object.assign({}, DEFAULT_THEME, o.theme || {});
  const get = Object.assign({
    balance: () => 0, win: () => 0, bet: () => 1, betLabel: () => 'BET',
    busy: () => false, locked: () => false, // locked: bet/buy disabled (e.g. during a bonus)
    canBetDown: () => true, canBetUp: () => true, buyActive: () => false, buySub: () => '',
    bets: () => DEFAULT_BETS, betIndex: null,
  }, o.get || {});
  const on = Object.assign({ spin() {}, stop() {}, buy() {}, betStep() {}, betSet: null, turbo() {}, quick() {}, autoplay() {}, autoplayStop() {}, sound() {}, menu: null, showIntro: null }, o.on || {});
  const st = Object.assign({ turbo: false, quick: false, autoplay: false, autoplayLeft: 0, sound: true }, o.initial || {});
  const presses = {}; let spinRot = 0, lastT = 0, sheet = null;
  // v1.4.0 bar TOTAL fx (real time, so turbo does not shorten it)
  const TFX = { a: 1, from: 1, to: 1, t0: 0, ms: 150, bumpT: -1e9, bumpS: 1.09, bumpMs: 180 };
  const rnow = () => timeWarp.realNow();
  function totalFx() {
    if (typeof get.totalFx === 'function') { const v = get.totalFx() || {}; return { a: v.a ?? 1, s: v.s ?? 1 }; }
    const n = rnow(), q = TFX.ms > 0 ? Math.max(0, Math.min(1, (n - TFX.t0) / TFX.ms)) : 1; TFX.a = TFX.from + (TFX.to - TFX.from) * q;
    const b = (n - TFX.bumpT) / Math.max(1, TFX.bumpMs), s = b >= 0 && b < 1 ? 1 + (TFX.bumpS - 1) * Math.sin(b * Math.PI) : 1;
    return { a: TFX.a, s };
  }
  // v1.2 popups
  let popup = null; // { kind:'autoplay'|'bet', scroll, ...layout fields filled by layoutPopup() }
  let autoLeft = 0, autoPending = false, lastBusy = false;
  const L = () => {
    const land = o.orientation === 'landscape' || (o.orientation === 'auto' && o.W > o.H);
    if (String(o.layout || '').toUpperCase() === 'D2' && !land) return layoutPortraitD2(o.W, o.H, { hideBuy: o.hideBuy });
    const l = land ? layoutLandscape(o.W, o.H) : layoutPortrait(o.W, o.H);
    if (o.hideBuy) { l.buy = null; l.buyHidden = true; } // v1.4.0: classic / landscape just drop BUY (no re-flow of the other pills)
    return l;
  };
  let lay = L();
  const press = key => { presses[key] = Date.now(); };
  const pressK = key => { const d = Date.now() - (presses[key] || -1e9); return d < 160 ? 1 - 0.06 * Math.sin(Math.PI * d / 160) : 1; };
  const scaled = (g, key, cx, cy, fn) => { const s = pressK(key); g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); fn(); g.restore(); };
  const F = (wt, px) => `${wt} ${Math.round(px)}px ${FONT}`;
  const syncLeft = () => { st.autoplayLeft = autoLeft; };

  function drawSpin(g) {
    const b = lay.spin, busy = get.busy();
    scaled(g, 'spin', b.x, b.y, () => {
      if (th.spinSprite && imgOk(th.spinSprite.img)) { // v1.4.0 opt-in painted disc
        g.drawImage(th.spinSprite.img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        if (st.autoplay) { g.save(); g.lineWidth = th.rimWidth + 1; g.strokeStyle = th.accent; g.beginPath(); g.arc(b.x, b.y, b.r - 1.5, 0, 7); g.stroke(); g.restore(); }
        g.save(); if (busy && !st.autoplay) g.globalAlpha = 0.6; if (th.spinSprite.icon !== false) ICON.refresh(g, b.x, b.y, b.r * 1.5, st.autoplay ? th.accent : th.spinIcon, spinRot); g.restore();
        return;
      }
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24 * lay.k; g.shadowOffsetY = 6 * lay.k;
      const d = g.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.45, b.r * 0.1, b.x, b.y, b.r);
      d.addColorStop(0, hexA(th.spinDisc[0], 0.92)); d.addColorStop(1, hexA(th.spinDisc[1], 0.92));
      g.fillStyle = d; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
      g.restore();
      // gloss
      g.save(); g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.clip();
      const gl = g.createLinearGradient(0, b.y - b.r, 0, b.y + b.r * 0.2); gl.addColorStop(0, 'rgba(255,255,255,0.18)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl; g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 1.2); g.restore();
      g.save(); g.lineWidth = th.rimWidth + 1; g.strokeStyle = st.autoplay ? th.accent : th.spinRim; g.beginPath(); g.arc(b.x, b.y, b.r - 1.5, 0, 7); g.stroke(); g.restore();
      g.save(); if (busy && !st.autoplay) g.globalAlpha = 0.6;
      ICON.refresh(g, b.x, b.y, b.r * 1.5, st.autoplay ? th.accent : th.spinIcon, spinRot);
      g.restore();
    });
  }
  function drawRow1(g) {
    const t = lay.turbo, b = lay.buy, locked = get.locked() || get.busy();
    scaled(g, 'turbo', t.x + t.w / 2, t.y + t.h / 2, () => {
      pill(g, th, t.x, t.y, t.w, t.h, { active: st.turbo });
      ICON.rocket(g, t.x + t.w / 2, t.y + t.h / 2, t.h * 0.72, th.accent, th.accent2);
    });
    if (b) scaled(g, 'buy', b.x + b.w / 2, b.y + b.h / 2, () => {
      g.save(); if (locked) g.globalAlpha = th.disabledAlpha;
      pill(g, th, b.x, b.y, b.w, b.h, { active: get.buyActive() });
      const sub = get.buySub();
      g.fillStyle = th.text; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = F(800, b.h * 0.38); g.fillText('BUY', b.x + b.w / 2, b.y + b.h / 2 - (sub ? b.h * 0.1 : 0) + 1);
      if (sub) { g.fillStyle = th.accent; g.font = F(700, b.h * 0.17); g.fillText(sub, b.x + b.w / 2, b.y + b.h * 0.78); }
      g.restore();
    });
  }
  function drawRow2(g) {
    const a = lay.auto, b = lay.bet, locked = get.locked() || get.busy();
    // autoplay | quick spin
    pill(g, th, a.x, a.y, a.w, a.h, {});
    const ah = a.w / 2;
    if (st.autoplay) { g.save(); rr(g, a.x, a.y, a.w, a.h, a.h / 2); g.clip(); g.fillStyle = hexA(th.accent, 0.22); g.fillRect(a.x, a.y, ah, a.h); g.restore(); }
    if (st.quick) { g.save(); rr(g, a.x, a.y, a.w, a.h, a.h / 2); g.clip(); g.fillStyle = hexA(th.accent, 0.22); g.fillRect(a.x + ah, a.y, ah, a.h); g.restore(); }
    vline(g, th, a.x + ah, a.y + a.h * 0.22, a.y + a.h * 0.78);
    scaled(g, 'auto', a.x + ah / 2, a.y + a.h / 2, () => {
      const cx = a.x + ah / 2, cy = a.y + a.h / 2, col = st.autoplay ? th.accent : th.text;
      if (st.autoplay && autoLeft > 0) {
        const icx = cx - ah * 0.16, n = autoLeft >= 1e6 ? '∞' : String(autoLeft);
        ICON.autoplay(g, icx, cy, a.h * 0.48, col);
        g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = F(800, a.h * 0.34); g.fillText(n, cx + ah * 0.18, cy + 1, ah * 0.42);
      } else {
        ICON.autoplay(g, cx, cy, a.h * 0.56, col);
      }
    });
    scaled(g, 'quick', a.x + ah * 1.5, a.y + a.h / 2, () => ICON.bolt(g, a.x + ah * 1.5, a.y + a.h / 2, a.h * 0.56, st.quick ? th.accent : th.text));
    // − | BET | +
    pill(g, th, b.x, b.y, b.w, b.h, {});
    const side = b.w * 0.25;
    vline(g, th, b.x + side, b.y + b.h * 0.22, b.y + b.h * 0.78); vline(g, th, b.x + b.w - side, b.y + b.h * 0.22, b.y + b.h * 0.78);
    g.save(); g.globalAlpha = locked || !get.canBetDown() ? th.disabledAlpha : 1;
    scaled(g, 'minus', b.x + side / 2, b.y + b.h / 2, () => ICON.minus(g, b.x + side / 2, b.y + b.h / 2, b.h * 0.42, th.text)); g.restore();
    g.save(); g.globalAlpha = locked || !get.canBetUp() ? th.disabledAlpha : 1;
    scaled(g, 'plus', b.x + b.w - side / 2, b.y + b.h / 2, () => ICON.plus(g, b.x + b.w - side / 2, b.y + b.h / 2, b.h * 0.42, th.text)); g.restore();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = th.label; g.font = F(600, b.h * 0.2); g.fillText(get.betLabel(), b.x + b.w / 2, b.y + b.h * 0.3);
    g.fillStyle = th.text; g.font = F(800, b.h * 0.33); g.fillText(formatMoney(get.bet(), th), b.x + b.w / 2, b.y + b.h * 0.64, b.w - side * 2 - 12);
  }
  function drawBar(g) {
    const r = lay.bar, k = lay.k, cy = r.y + r.h / 2;
    g.save(); g.fillStyle = th.bar; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = th.barRim; g.fillRect(r.x, r.y, r.w, Math.max(1, 2 * k)); g.restore();
    scaled(g, 'menu', 60 * k, cy, () => ICON.menu(g, 60 * k, cy, 46 * k, th.text));
    scaled(g, 'sound', r.w - 60 * k, cy, () => ICON.sound(g, r.w - 60 * k, cy, 50 * k, st.sound ? th.text : th.muted, st.sound));
    const pair = (x, align, lbl, val) => {
      g.textAlign = align; g.textBaseline = 'middle';
      g.fillStyle = th.label; g.font = F(600, 21 * k); g.fillText(lbl, x, cy - 17 * k);
      g.fillStyle = th.text; g.font = F(800, 32 * k); g.fillText(val, x, cy + 15 * k);
    };
    const fx = totalFx(); // v1.4.0 dim / bump (identity unless a game uses it)
    if (fx.a >= 0.999 && Math.abs(fx.s - 1) < 0.001) pair(120 * k, 'left', 'TOTAL', formatMoney(get.win(), th));
    else {
      const A = lay.totalAnchor || { x: 200 * k, y: cy + 15 * k };
      g.save(); g.globalAlpha *= Math.max(0, Math.min(1, fx.a));
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = th.label; g.font = F(600, 21 * k); g.fillText('TOTAL', 120 * k, cy - 17 * k);
      g.translate(A.x, A.y); g.scale(fx.s, fx.s); g.translate(-A.x, -A.y);
      g.fillStyle = th.text; g.font = F(800, 32 * k); g.fillText(formatMoney(get.win(), th), 120 * k, cy + 15 * k);
      g.restore();
    }
    pair(r.w - 120 * k, 'right', 'BALANCE', formatMoney(get.balance(), th));
    g.textAlign = 'center'; g.fillStyle = th.muted; g.font = F(600, 22 * k);
    const nm = String(th.name).toUpperCase(); g.fillText(nm, r.w / 2, cy - (th.subline ? 9 * k : 0));
    const w = g.measureText(nm).width; g.font = F(600, 13 * k); g.textAlign = 'left'; g.fillText('™', r.w / 2 + w / 2 + 2 * k, cy - (th.subline ? 9 * k : 0) - 8 * k);
    if (th.subline) { g.textAlign = 'center'; g.font = F(500, 15 * k); g.fillStyle = th.muted; g.globalAlpha = 0.75; g.fillText(th.subline, r.w / 2, cy + 18 * k); g.globalAlpha = 1; }
  }

  /* ----- v1.2 popups ----- */
  function betsList() {
    const b = get.bets && get.bets();
    return Array.isArray(b) && b.length ? b.slice() : DEFAULT_BETS.slice();
  }
  function currentBetIndex() {
    if (typeof get.betIndex === 'function') {
      const i = get.betIndex(); if (i != null && i >= 0) return i | 0;
    }
    const v = +get.bet(), bets = betsList();
    let best = 0, d = Infinity;
    for (let i = 0; i < bets.length; i++) { const dd = Math.abs(bets[i] - v); if (dd < d) { d = dd; best = i; } }
    return best;
  }
  function closePopup() { popup = null; }
  function canOpenAuto() { return st.autoplay || (!get.busy() && !get.locked()); }
  function canOpenBet() { return !get.busy() && !get.locked(); }
  function openPopup(kind) {
    if (popup && popup.kind === kind) { closePopup(); return; }
    if (kind === 'autoplay' && !canOpenAuto()) return;
    if (kind === 'bet' && !canOpenBet()) return;
    sheet = null;
    popup = { kind, scroll: 0 };
  }
  function stopAutoplay() {
    const was = st.autoplay || autoLeft > 0;
    st.autoplay = false; autoLeft = 0; autoPending = false; syncLeft();
    if (was && on.autoplayStop) on.autoplayStop();
  }
  function startAutoplay(n) {
    n = Math.max(0, Math.floor(+n || 0));
    closePopup();
    if (n <= 0) { stopAutoplay(); return; }
    autoLeft = n; st.autoplay = true; autoPending = false; syncLeft();
    if (on.autoplay) on.autoplay(n);
  }
  // Decrement remaining once the previous autoplay spin has gone idle, whether the
  // game ticks takeAutoplaySpin() before or after hud.draw() in the same frame.
  function settleAutoplay() {
    if (st.autoplay && autoPending && !get.busy()) {
      autoPending = false;
      autoLeft = Math.max(0, autoLeft - 1); syncLeft();
      if (autoLeft <= 0) stopAutoplay();
    }
  }
  function takeAutoplaySpin() {
    settleAutoplay();
    if (!st.autoplay || autoLeft <= 0) return false;
    autoPending = true;
    return true;
  }
  function watchBusy() {
    settleAutoplay();
    lastBusy = !!get.busy();
  }

  function layoutPopup() {
    if (!popup) return null;
    const k = lay.k, W = o.W, H = o.H, land = lay.orientation === 'landscape';
    const pad = 28 * k, titleH = 52 * k, gap = 16 * k, rPanel = 28 * k, rCell = 10 * k;
    const offH = 80 * k, pointerH = 18 * k, screenPad = 20 * k, barTop = lay.bar.y;
    const preferredCellH = 88 * k, minCellH = 56 * k;
    const kind = popup.kind;
    const values = kind === 'autoplay' ? AUTOPLAY_COUNTS : betsList();
    const cols = kind === 'autoplay' ? 2 : 3;
    const rows = Math.ceil(values.length / cols);
    const hasOff = kind === 'autoplay';
    // Width: autoplay matches the auto pill; bet is a 3-col panel.
    let w;
    if (kind === 'autoplay') w = Math.max(lay.auto.w, 400 * k);
    else w = Math.min(W - screenPad * 2, land ? 700 * k : 720 * k);
    const innerW = w - pad * 2;
    const cellW = (innerW - gap * (cols - 1)) / cols;

    // How much vertical room if we sit above the HUD cluster (portrait) or beside the pill (landscape).
    const anchor = kind === 'autoplay' ? lay.auto : lay.bet;
    const anchorCx = kind === 'autoplay' ? anchor.x + anchor.w * 0.25 : anchor.x + anchor.w * 0.5;
    const sidePlace = land; // landscape: park the panel in the board column, pointer on the left
    const clusterTop = Math.min(
      lay.top != null ? lay.top : Infinity,
      lay.turbo ? lay.turbo.y : Infinity,
      lay.buy ? lay.buy.y : Infinity,
      lay.spin ? (lay.spin.y - lay.spin.r) : Infinity
    );
    // Portrait: keep the panel above TURBO / SPIN / BUY. The pointer stays a short caret on the bottom edge.
    const panelBottomMax = (Number.isFinite(clusterTop) ? clusterTop : anchor.y) - 16 * k;
    let maxH;
    if (sidePlace) maxH = Math.max(200 * k, barTop - screenPad * 2);
    else maxH = Math.max(200 * k, panelBottomMax - screenPad);

    const chrome = pad * 0.55 + titleH + (hasOff ? gap + offH : 0) + pad;
    const gridAvail = Math.max(minCellH, maxH - chrome);
    let cellH = Math.min(preferredCellH, (gridAvail - (rows - 1) * gap) / Math.max(1, rows));
    let gridClipH, maxScroll = 0, scrollable = false;
    if (cellH < minCellH) {
      cellH = minCellH;
      const gridH = rows * cellH + (rows - 1) * gap;
      gridClipH = gridAvail;
      maxScroll = Math.max(0, gridH - gridClipH);
      scrollable = maxScroll > 0;
    } else {
      gridClipH = rows * cellH + (rows - 1) * gap;
    }
    const gridH = rows * cellH + (rows - 1) * gap;
    const h = chrome + gridClipH;

    let x, y, ptrSide, tipX, tipY;
    if (sidePlace) {
      x = (lay.leftW || (anchor.x + anchor.w)) + 16 * k;
      if (x + w > W - screenPad) x = W - screenPad - w;
      y = anchor.y + anchor.h / 2 - h / 2;
      y = Math.max(screenPad, Math.min(y, barTop - screenPad - h));
      ptrSide = 'left';
      tipX = anchor.x + anchor.w + 4 * k;
      tipY = anchor.y + anchor.h / 2;
      if (tipX >= x) tipX = x - pointerH;
    } else {
      if (kind === 'autoplay') x = anchor.x;
      else x = anchor.x + anchor.w - w; // right-align over the bet pill
      x = Math.max(screenPad, Math.min(x, W - screenPad - w));
      y = panelBottomMax - h;
      if (y < screenPad) y = screenPad;
      ptrSide = 'bottom';
      tipX = anchorCx;
      tipY = y + h + pointerH;
    }

    const half = 16 * k;
    let base;
    if (ptrSide === 'bottom' || ptrSide === 'top') {
      base = Math.max(x + rPanel + half, Math.min(tipX, x + w - rPanel - half));
      if (ptrSide === 'bottom') { tipY = y + h + pointerH; tipX = base; }
      else { tipY = y - pointerH; tipX = base; }
    } else {
      base = Math.max(y + rPanel + half, Math.min(tipY, y + h - rPanel - half));
      if (ptrSide === 'left') { tipX = x - pointerH; tipY = base; }
      else { tipX = x + w + pointerH; tipY = base; }
    }
    const pointer = { side: ptrSide, base, half, tipX, tipY };

    const gridX = x + pad, gridY = y + pad * 0.55 + titleH;
    const sc = Math.max(0, Math.min(popup.scroll || 0, maxScroll));
    popup.scroll = sc; popup.maxScroll = maxScroll; popup.scrollable = scrollable;
    const cells = values.map((val, i) => {
      const c = i % cols, r = (i / cols) | 0;
      return {
        val, i,
        x: gridX + c * (cellW + gap),
        y: gridY + r * (cellH + gap) - sc,
        w: cellW, h: cellH,
      };
    });
    const off = hasOff ? { x: gridX, y: gridY + gridClipH + gap, w: innerW, h: offH } : null;
    popup.box = { x, y, w, h }; popup.cells = cells; popup.off = off; popup.pointer = pointer;
    popup.gridClip = { x: gridX - 2, y: gridY, w: innerW + 4, h: gridClipH };
    popup.rPanel = rPanel; popup.rCell = rCell; popup.titleH = titleH; popup.pad = pad;
    popup.values = values;
    return popup;
  }

  function pathPanel(g, box, r, ptr) {
    const { x, y, w, h } = box;
    r = Math.min(r, h / 2, w / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    if (ptr && ptr.side === 'right') {
      g.lineTo(x + w, ptr.base - ptr.half); g.lineTo(ptr.tipX, ptr.tipY); g.lineTo(x + w, ptr.base + ptr.half);
    }
    g.arcTo(x + w, y + h, x, y + h, r);
    if (ptr && ptr.side === 'bottom') {
      g.lineTo(ptr.base + ptr.half, y + h); g.lineTo(ptr.tipX, ptr.tipY); g.lineTo(ptr.base - ptr.half, y + h);
    }
    g.arcTo(x, y + h, x, y, r);
    if (ptr && ptr.side === 'left') {
      g.lineTo(x, ptr.base + ptr.half); g.lineTo(ptr.tipX, ptr.tipY); g.lineTo(x, ptr.base - ptr.half);
    }
    g.arcTo(x, y, x + w, y, r);
    if (ptr && ptr.side === 'top') {
      g.lineTo(ptr.base - ptr.half, y); g.lineTo(ptr.tipX, ptr.tipY); g.lineTo(ptr.base + ptr.half, y);
    }
    g.closePath();
  }
  function inPointer(ptr, px, py) {
    if (!ptr) return false;
    // loose triangle hit
    const box = popup.box;
    if (ptr.side === 'bottom') return px >= ptr.base - ptr.half - 4 && px <= ptr.base + ptr.half + 4 && py >= box.y + box.h && py <= ptr.tipY + 2;
    if (ptr.side === 'top') return px >= ptr.base - ptr.half - 4 && px <= ptr.base + ptr.half + 4 && py <= box.y && py >= ptr.tipY - 2;
    if (ptr.side === 'left') return py >= ptr.base - ptr.half - 4 && py <= ptr.base + ptr.half + 4 && px <= box.x && px >= ptr.tipX - 2;
    if (ptr.side === 'right') return py >= ptr.base - ptr.half - 4 && py <= ptr.base + ptr.half + 4 && px >= box.x + box.w && px <= ptr.tipX + 2;
    return false;
  }

  function drawPopup(g) {
    if (!popup) return;
    const p = layoutPopup(); if (!p) return;
    const k = lay.k, box = p.box, ink = contrastInk(th.accent);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 28 * k; g.shadowOffsetY = 8 * k;
    pathPanel(g, box, p.rPanel, p.pointer);
    g.fillStyle = hexA(th.pillFill, Math.min(0.96, (th.pillOpacity || 0.6) + 0.34)); g.fill();
    g.shadowColor = 'transparent';
    if (th.pillGloss > 0) {
      const gl = g.createLinearGradient(0, box.y, 0, box.y + box.h * 0.45);
      gl.addColorStop(0, `rgba(255,255,255,${th.pillGloss * 0.9})`); gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl; g.fill();
    }
    g.lineWidth = th.rimWidth; g.strokeStyle = th.rim; g.stroke();
    // title
    g.fillStyle = th.label; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = F(700, 26 * k);
    const title = p.kind === 'autoplay' ? 'AUTOPLAY' : 'BET';
    g.fillText(title, box.x + box.w / 2, box.y + p.pad * 0.55 + p.titleH * 0.42);
    // cells
    const cur = p.kind === 'bet' ? currentBetIndex() : -1;
    const countsDisabled = p.kind === 'autoplay' && !!get.busy();
    g.save();
    const gc = p.gridClip;
    g.beginPath(); g.rect(gc.x, gc.y, gc.w, gc.h); g.clip();
    p.cells.forEach(c => {
      if (c.y + c.h < gc.y || c.y > gc.y + gc.h) return;
      const on = p.kind === 'bet' && c.i === cur;
      g.save();
      if (countsDisabled) g.globalAlpha = th.disabledAlpha;
      rr(g, c.x, c.y, c.w, c.h, p.rCell);
      if (on) { g.fillStyle = th.accent; g.fill(); }
      else { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(); g.lineWidth = 1.5 * k; g.strokeStyle = 'rgba(255,255,255,0.28)'; g.stroke(); }
      g.fillStyle = on ? ink : th.text; g.textAlign = 'center'; g.textBaseline = 'middle';
      const label = p.kind === 'autoplay' ? String(c.val) : formatMoney(c.val, th);
      g.font = F(700, Math.min(c.h * 0.42, 36 * k));
      g.fillText(label, c.x + c.w / 2, c.y + c.h / 2 + 1, c.w - 12 * k);
      g.restore();
    });
    g.restore();
    // fade at clip edges when scrollable
    if (p.scrollable) {
      if (p.scroll > 1) {
        const fg = g.createLinearGradient(0, gc.y, 0, gc.y + 18 * k);
        fg.addColorStop(0, hexA(th.pillFill, 0.9)); fg.addColorStop(1, hexA(th.pillFill, 0));
        g.fillStyle = fg; g.fillRect(gc.x, gc.y, gc.w, 18 * k);
      }
      if (p.scroll < p.maxScroll - 1) {
        const fg = g.createLinearGradient(0, gc.y + gc.h - 18 * k, 0, gc.y + gc.h);
        fg.addColorStop(0, hexA(th.pillFill, 0)); fg.addColorStop(1, hexA(th.pillFill, 0.9));
        g.fillStyle = fg; g.fillRect(gc.x, gc.y + gc.h - 18 * k, gc.w, 18 * k);
      }
    }
    if (p.off) {
      const b = p.off, rad = Math.min(20 * k, b.h * 0.28);
      rr(g, b.x, b.y, b.w, b.h, rad);
      g.fillStyle = th.accent; g.fill();
      const gl = g.createLinearGradient(0, b.y, 0, b.y + b.h);
      gl.addColorStop(0, 'rgba(255,255,255,0.18)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl; g.fill();
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = F(800, Math.min(b.h * 0.42, 34 * k));
      g.fillText('OFF', b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    g.restore();
  }

  function drawSheet(g) {
    drawPopup(g);
    if (!sheet) return;
    const k = lay.k, W = o.W, H = o.H;
    g.save(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
    const w = Math.min(W - 120 * k, 820 * k), lines = sheet.lines || [], btns = sheet.buttons || [];
    const h = 170 * k + lines.length * 46 * k + 130 * k, x = (W - w) / 2, y = (sheet.y != null ? sheet.y : (H - h) / 2);
    sheet._box = { x, y, w, h };
    rr(g, x, y, w, h, 40 * k); g.fillStyle = hexA(th.pillFill, Math.min(0.95, th.pillOpacity + 0.3)); g.fill();
    g.lineWidth = th.rimWidth; g.strokeStyle = th.rim; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = th.accent; g.font = F(800, 52 * k); g.fillText(sheet.title, W / 2, y + 74 * k);
    lines.forEach((ln, i) => { g.fillStyle = i === 0 && sheet.leadBright ? th.text : th.label; g.font = F(i === 0 && sheet.leadBright ? 700 : 500, 30 * k); g.fillText(ln, W / 2, y + 150 * k + i * 46 * k, w - 60 * k); });
    const bw = (w - 60 * k - (btns.length - 1) * 24 * k) / Math.max(1, btns.length), bh = 92 * k, by = y + h - bh - 34 * k;
    sheet._btns = btns.map((b, i) => {
      const bx = x + 30 * k + i * (bw + 24 * k);
      g.save(); if (b.disabled) g.globalAlpha = th.disabledAlpha;
      pill(g, th, bx, by, bw, bh, { active: !!b.primary });
      g.fillStyle = b.primary ? th.accent : th.text; g.font = F(800, 32 * k); g.fillText(b.label, bx + bw / 2, by + bh / 2 + 1, bw - 24 * k); g.restore();
      return { x: bx, y: by, w: bw, h: bh, b };
    });
    g.restore();
  }

  const inR = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function hitPopup(x, y) {
    if (!popup) return false;
    const p = layoutPopup(); if (!p) return false;
    if (p.off && inR(p.off, x, y)) { // OFF always works during autoplay (and otherwise)
      press('off'); stopAutoplay(); closePopup(); return true;
    }
    const gc = p.gridClip;
    if (p.scrollable && inR(gc, x, y)) {
      // start a document-level drag so scrolling works even if the game only forwards pointerdown
      const scale = (() => { /* canvas scale unknown; track in client later via last hit only */ return 1; })();
      p._dragY = y; p._dragScroll = p.scroll; p._dragging = false;
    }
    if (inR(gc, x, y)) {
      for (const c of p.cells) {
        if (!inR(c, x, y)) continue;
        if (c.y + c.h < gc.y || c.y > gc.y + gc.h) continue;
        if (p.kind === 'autoplay') {
          if (get.busy()) return true; // only OFF is armed while a spin is running
          press('acell'); startAutoplay(c.val); return true;
        }
        if (p.kind === 'bet') {
          if (!canOpenBet()) return true;
          press('bcell');
          const idx = c.i, val = c.val;
          if (on.betSet) on.betSet(val, idx);
          closePopup();
          return true;
        }
      }
      return true; // swallowed by grid
    }
    if (inR(p.box, x, y) || inPointer(p.pointer, x, y)) return true;
    // outside: close, then let the same tap fall through to HUD controls
    closePopup();
    return false;
  }
  // Optional pointermove/up for bet-grid scrolling (also installed from hit when needed).
  function pointerMove(x, y) {
    if (!popup || !popup.scrollable || popup._dragY == null) return false;
    const dy = popup._dragY - y;
    if (Math.abs(dy) > 6 * lay.k) popup._dragging = true;
    if (popup._dragging) {
      popup.scroll = Math.max(0, Math.min(popup.maxScroll, popup._dragScroll + dy));
    }
    return true;
  }
  function pointerUp() {
    if (popup) { popup._dragY = null; popup._dragging = false; }
  }


  function drawIconRound(g, cx, cy, r, kind) {
    const active = kind === 'turbo' ? st.turbo : kind === 'quick' ? st.quick : kind === 'autoplay' ? st.autoplay : false;
    const key = kind === 'autoplay' ? 'auto' : kind;
    scaled(g, key, cx, cy, () => {
      pill(g, th, cx - r, cy - r, r * 2, r * 2, { active });
      const s = r * 1.35;
      if (kind === 'turbo') ICON.rocket(g, cx, cy, s, th.accent, th.accent2);
      else if (kind === 'quick') ICON.bolt(g, cx, cy, s, st.quick ? th.accent : th.text);
      else if (kind === 'autoplay') {
        const col = st.autoplay ? th.accent : th.text;
        if (st.autoplay && autoLeft > 0) {
          const n = autoLeft >= 1e6 ? '∞' : String(autoLeft);
          ICON.autoplay(g, cx, cy - r * 0.18, s * 0.85, col);
          g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = F(800, r * 0.52);
          g.fillText(n, cx, cy + r * 0.48, r * 1.6);
        } else {
          ICON.autoplay(g, cx, cy, s, col);
        }
      }
    });
  }
  function drawPortraitD2(g) {
    const locked = get.locked() || get.busy();
    const b = lay.buy;
    if (b) scaled(g, 'buy', b.x + b.w / 2, b.y + b.h / 2, () => {
      g.save(); if (locked) g.globalAlpha = th.disabledAlpha;
      pill(g, th, b.x, b.y, b.w, b.h, { active: get.buyActive() });
      const sub = get.buySub();
      g.fillStyle = th.text; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = F(800, b.h * 0.38); g.fillText('BUY', b.x + b.w / 2, b.y + b.h / 2 - (sub ? b.h * 0.1 : 0) + 1);
      if (sub) { g.fillStyle = th.accent; g.font = F(700, b.h * 0.17); g.fillText(sub, b.x + b.w / 2, b.y + b.h * 0.78); }
      g.restore();
    });
    (lay.left || []).forEach(it => drawIconRound(g, it.x, it.y, it.r, it.kind));
    const plus = lay.plus, betVal = lay.betVal, minus = lay.minus;
    g.save(); g.globalAlpha = locked || !get.canBetUp() ? th.disabledAlpha : 1;
    scaled(g, 'plus', plus.x + plus.w / 2, plus.y + plus.h / 2, () => {
      pill(g, th, plus.x, plus.y, plus.w, plus.h, {});
      ICON.plus(g, plus.x + plus.w / 2, plus.y + plus.h / 2, plus.h * 0.46, th.text);
    }); g.restore();
    scaled(g, 'bet', betVal.x + betVal.w / 2, betVal.y + betVal.h / 2, () => {
      pill(g, th, betVal.x, betVal.y, betVal.w, betVal.h, {});
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = th.label; g.font = F(600, betVal.h * 0.2);
      g.fillText(get.betLabel(), betVal.x + betVal.w / 2, betVal.y + betVal.h * 0.3);
      g.fillStyle = th.text; g.font = F(800, betVal.h * 0.33);
      g.fillText(formatMoney(get.bet(), th), betVal.x + betVal.w / 2, betVal.y + betVal.h * 0.64, betVal.w - 16);
    });
    g.save(); g.globalAlpha = locked || !get.canBetDown() ? th.disabledAlpha : 1;
    scaled(g, 'minus', minus.x + minus.w / 2, minus.y + minus.h / 2, () => {
      pill(g, th, minus.x, minus.y, minus.w, minus.h, {});
      ICON.minus(g, minus.x + minus.w / 2, minus.y + minus.h / 2, minus.h * 0.46, th.text);
    }); g.restore();
  }
  function inCircle(c, x, y, pad) { return c && Math.hypot(x - c.x, y - c.y) <= c.r + (pad || 0); }
  function hitD2(x, y) {
    const busy = get.busy(), locked = get.locked() || busy;
    const s = lay.spin;
    if (Math.hypot(x - s.x, y - s.y) <= s.r + 8 * lay.k) {
      press('spin');
      if (st.autoplay) { stopAutoplay(); return true; }
      if (busy) on.stop(); else on.spin();
      return true;
    }
    if (inR(lay.buy, x, y)) { press('buy'); if (!locked) on.buy(); return true; }
    for (const it of (lay.left || [])) {
      if (!inCircle(it, x, y, 8 * lay.k)) continue;
      if (it.kind === 'autoplay') { press('auto'); openPopup('autoplay'); return true; }
      if (it.kind === 'turbo') { press('turbo'); st.turbo = !st.turbo; on.turbo(st.turbo); return true; }
      if (it.kind === 'quick') { press('quick'); st.quick = !st.quick; on.quick(st.quick); return true; }
    }
    if (inR(lay.plus, x, y)) {
      if (!locked && get.canBetUp()) { press('plus'); on.betStep(1); }
      return true;
    }
    if (inR(lay.minus, x, y)) {
      if (!locked && get.canBetDown()) { press('minus'); on.betStep(-1); }
      return true;
    }
    if (inR(lay.betVal, x, y) || inR(lay.bet, x, y)) { press('bet'); openPopup('bet'); return true; }
    const r = lay.bar;
    if (inR(r, x, y)) {
      if (x < 110 * lay.k) { press('menu'); if (on.menu) on.menu(api); else openMenu(); }
      else if (x > r.w - 110 * lay.k) { press('sound'); st.sound = !st.sound; on.sound(st.sound); }
      return true;
    }
    return false;
  }
  function hit(x, y) {
    if (sheet) {
      for (const bb of sheet._btns || []) if (inR(bb, x, y)) { if (!bb.b.disabled) { const fn = bb.b.onTap; if (bb.b.close !== false) sheet = null; fn && fn(); } return true; }
      if (sheet._box && !inR(sheet._box, x, y)) sheet = null; // tap outside closes
      return true; // modal swallows taps
    }
    if (popup) {
      const swallowed = hitPopup(x, y);
      if (swallowed) return true;
      // closed by outside tap: fall through so a tap on the other trigger can open it
    }
    if (lay.variant === 'D2') return hitD2(x, y);
    const busy = get.busy(), locked = get.locked() || busy;
    const s = lay.spin;
    if (Math.hypot(x - s.x, y - s.y) <= s.r + 8 * lay.k) {
      press('spin');
      if (st.autoplay) { stopAutoplay(); return true; } // tap spin = stop autoplay
      if (busy) on.stop(); else on.spin();
      return true;
    }
    if (inR(lay.turbo, x, y)) { press('turbo'); st.turbo = !st.turbo; on.turbo(st.turbo); return true; }
    if (inR(lay.buy, x, y)) { press('buy'); if (!locked) on.buy(); return true; }
    const a = lay.auto;
    if (inR(a, x, y)) {
      if (x < a.x + a.w / 2) { press('auto'); openPopup('autoplay'); }
      else { press('quick'); st.quick = !st.quick; on.quick(st.quick); }
      return true;
    }
    const b = lay.bet, side = b.w * 0.25;
    if (inR(b, x, y)) {
      if (x < b.x + side) {
        if (!locked && get.canBetDown()) { press('minus'); on.betStep(-1); }
      } else if (x > b.x + b.w - side) {
        if (!locked && get.canBetUp()) { press('plus'); on.betStep(1); }
      } else {
        press('bet'); openPopup('bet');
      }
      return true;
    }
    const r = lay.bar;
    if (inR(r, x, y)) {
      if (x < 110 * lay.k) { press('menu'); if (on.menu) on.menu(api); else openMenu(); }
      else if (x > r.w - 110 * lay.k) { press('sound'); st.sound = !st.sound; on.sound(st.sound); }
      return true;
    }
    return false;
  }
  // K1 (v1.1): the menu sheet carries SHOW INTRO (clears the splash "don't show again" flag).
  function showIntro() { splash.show(o.gameId); if (on.showIntro) on.showIntro(); }
  function openMenu(extra) {
    extra = extra || {};
    closePopup();
    const btns = (extra.buttons || [{ label: 'CLOSE' }]).slice();
    if (o.gameId) btns.unshift({ label: 'SHOW INTRO', onTap: showIntro });
    sheet = { title: extra.title || 'MENU', lines: extra.lines || [], leadBright: extra.leadBright, buttons: btns };
  }
  function draw(g) {
    const t = Date.now(), dt = lastT ? Math.min(100, t - lastT) : 16; lastT = t;
    watchBusy();
    if (get.busy() || st.autoplay) spinRot += dt * 0.006 * (st.turbo || st.quick ? 2 : 1);
    else spinRot = spinRot % (Math.PI * 2) * 0.85;
    g.save(); g.textBaseline = 'middle';
    drawBar(g);
    if (lay.variant === 'D2') drawPortraitD2(g);
    else { drawRow2(g); drawRow1(g); }
    drawSpin(g);
    g.restore();
  }
  const api = {
    draw, hit, drawSheet, pointerMove, pointerUp, state: st, openMenu, showIntro, get gameId() { return o.gameId || null; },
    get layout() { return lay; },
    get theme() { return th; },
    setTheme(t) { th = Object.assign({}, DEFAULT_THEME, t || {}); },
    resize(W, H) { o.W = W; o.H = H; lay = L(); },
    set(key, v) { if (key in st) st[key] = v; },
    openSheet(s) { closePopup(); sheet = s; }, closeSheet() { sheet = null; }, get sheetOpen() { return !!sheet; },
    // v1.2 popups + counted autoplay
    openAutoplayPopup() { openPopup('autoplay'); },
    openBetPopup() { openPopup('bet'); },
    closePopup, startAutoplay, stopAutoplay, takeAutoplaySpin,
    get popupOpen() { return popup ? popup.kind : null; },
    get autoplayLeft() { return autoLeft; },
    // v1.4.0
    setHideBuy(on, opt) { o.hideBuy = on ? (opt && opt.keepTop ? { keepTop: true } : (on === true ? true : on)) : false; lay = L(); },
    get buyHidden() { return !!lay.buyHidden; },
    setTotalDim(a, ms = 150) { totalFx(); TFX.from = TFX.a; TFX.to = Math.max(0, Math.min(1, +a)); TFX.t0 = rnow(); TFX.ms = Math.max(0, +ms || 0); },
    bumpTotal(scale = 1.09, ms = 180) { TFX.bumpS = +scale || 1.09; TFX.bumpMs = Math.max(1, +ms || 180); TFX.bumpT = rnow(); },
    get totalDim() { return totalFx().a; },
  };
  return api;
}

/* ---------- splash flag (K1) ---------- */
const splash = {
  key: id => `gss.${id}.splash.hidden`,
  isHidden(id) { try { return !!id && root.localStorage.getItem(splash.key(id)) === '1'; } catch (e) { return false; } },
  hide(id) { try { if (id) root.localStorage.setItem(splash.key(id), '1'); } catch (e) {} },
  show(id) { try { if (id) root.localStorage.removeItem(splash.key(id)); } catch (e) {} },
};

root.GSSUI = { version: '1.4.0', FONT, DEFAULT_THEME, DEFAULT_BETS, AUTOPLAY_COUNTS, createHud, splash, formatMoney, timeWarp, icons: ICON, pill, rr, layoutPortrait, layoutPortraitD2, layoutLandscape };
})(typeof window !== 'undefined' ? window : globalThis);
