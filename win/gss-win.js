/* GSS shared win presentation v1.1.0 (shared/STANDARDS.md §1–§4, §6). Plain script, no dependencies,
 * no build step; http and file:// both work (relative Image() sources, embedded metrics allowed).
 *
 *   <script src="ui/gss-ui.js"></script> <script src="win/standard.js"></script> <script src="win/gss-win.js"></script>
 *   const W = GSSWin.create({ g: ctx, W: 1080, H: 1920, game: GSS_GAME, clock: GSSUI.timeWarp,
 *                             get: { autoplay: () => hud.state.autoplay, hudTop: () => 1528 } });
 *   await W.present(amount, totalBet)        // base event, once after the whole spin (Big+ = titled)
 *   await W.intro({ mode, count })           // bonus intro, tap (or real 3000 ms in autoplay)
 *   W.counterShow(mode, n); W.counterCommit(n) // hands/spins counter, decrement on commit
 *   await W.retrigger({ mode, n, from, to }) // +N popup, auto 1700 ms, tap skips to the fly-out
 *   await W.outro({ mode, total, bet })      // signature beat, tiered count, collect tap
 *   per frame (after the game + HUD):  W.draw(ctx)      input:  if (W.hit(x, y)) return;
 *
 * Time: every beat runs on its own presentation clock advanced by REAL elapsed time (kit K2
 * GSSUI.timeWarp.realNow) × speed, where speed = the kit's turbo/quick factor (getSpeed), capped at
 * ×1.5 for Big+ titles and the trigger celebration. Autoplay timeouts are real 3000 ms. No
 * Math.random: all motion is hashed. Nothing here touches game math.
 *
 * v1.1.0 (all opt-in, backward compatible; see README "v1.1.0"):
 *   W.setDressing(patch, { replace })        swap dressing painters at runtime (merge, or replace over the defaults)
 *   W.onOutroEnd(fn) / opts.on.outroEnd       called when an outro scene ends ({ mode, total, tier, why }); also a
 *                                             'gsswin:outroend' CustomEvent on window. W.on('sceneEnd', fn) for every scene.
 *   W.setGlyphs(role, def | set | null)       register / replace a glyph set at runtime ('win' = amounts, 'title' = title type);
 *   W.setTitleStyle(style)                    returns a promise that resolves when the set has loaded
 *   game.amount = { style, draw } / W.setAmount(cfg)  amount type: style merged over every amount draw, or a painter
 *                                             draw(g, str, x, y, h, o, value) that replaces the glyph strip
 *   W.chipShow(cfg) / chipUpdate(patch) / chipHide()  bonus chip (plate + text, optional 3-slice art) drawn under scenes
 *   intro({ noCount, noTitle }) or strings.modes[m].introCount / introTitle = false   intro without the count / title
 *   outro({ hudBand }) / modes[m].outroHudBand / game.outroHudBand (default .6), get.pageOpaque()   the outro's HUD band
 *                                             alpha; 0 or an opaque page skips it */
(function (root) {
'use strict';
const STD0 = root.GSS_STANDARD;
const AUTOPLAY = { on: false }; // global hook (GSSWin.setAutoplay)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - clamp(t), 3), eIn = t => clamp(t) * clamp(t), eIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t, s = 1.7) => { t = clamp(t) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };
const eQuart = t => 1 - Math.pow(1 - clamp(t), 4);
const hash = (i, s = 0) => { let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const pulse = (t, d) => t >= 0 && t < d ? Math.sin(Math.PI * t / d) : 0;
const deep = (a, b) => { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a); for (const k in b || {}) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && typeof b[k] !== 'function' && a && typeof a[k] === 'object') ? deep(a[k], b[k]) : b[k]; return o; };
function rr(g, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

/* ================= glyph sets (role sets from STANDARDS §4: win / mult / tile_money / title) ================= */
// def = { dir, chars: { '€': 'euro', … }, metrics: { file: { w, h, baseline_offset } } (embedded) or null
//         (fetched from dir/metrics.json over http, else image size), trackH: −.03, space: .28,
//         minPx: 44, fallback: { fill: [...], rim, out } (crafted canvas glyph for a missing char) }
let SET_UID = 0;
function loadGlyphSet(def) {
  const set = { def, img: {}, ok: {}, failed: [], loaded: 0, total: 0, metrics: def.metrics || null, gen: 0, uid: ++SET_UID }; // uid (1.1.0): caches stay per set when a role is replaced at runtime
  const names = [...new Set(Object.values(def.chars))]; set.total = names.length;
  names.forEach(n => { const im = new Image(); im.onload = () => { set.ok[n] = true; set.loaded++; set.gen++; }; im.onerror = () => { set.failed.push(n); set.gen++; }; im.src = def.dir + n + '.png'; set.img[n] = im; });
  if (!set.metrics) { set.metrics = {}; try { if (location.protocol !== 'file:' && root.fetch) fetch(def.dir + 'metrics.json').then(r => r.ok ? r.json() : null).then(j => { if (j) { set.metrics = j; set.gen++; } }).catch(() => {}); } catch (e) {} }
  set.done = () => set.loaded + set.failed.length >= set.total;
  set.m = n => set.metrics[n] || { w: set.img[n].naturalWidth || 200, h: set.img[n].naturalHeight || 250, baseline_offset: 0 };
  set.refH = () => { if (def.capRef && set.ok[def.capRef]) return set.m(def.capRef).h || 250; // opt-in (1.0.1): size by one reference glyph, e.g. capRef: 'H' = the cap height
    let ds = names.filter(n => /digit/.test(n)); if (!ds.length) ds = names.filter(n => /^[A-Z]$/.test(n)); return ds.reduce((s, n) => s + set.m(n).h, 0) / Math.max(1, ds.length) || 250; }; // digits, or capitals for a title alphabet
  return set;
}
const DEFAULT_GOLD = { fill: ['#fffbe6', '#ffe27a', '#f4b42e', '#b8620e'], rim: '#9a5a14', out: '#3a1608' };
function craftedGlyph(ch, h, st, font) { // canvas fallback for one char, in the set's colours (light core, body, dark outline ≥ 8%)
  st = st || DEFAULT_GOLD; const fs = h * 1.25, pad = Math.ceil(h * .3);
  const c0 = mk(4, 4).getContext('2d'); c0.font = `900 ${fs}px ${font}`; const w = c0.measureText(ch).width;
  const cv = mk(w + pad * 2, h + pad * 2), c = cv.getContext('2d'); c.font = `900 ${fs}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  const x = cv.width / 2, base = pad + h;
  c.strokeStyle = st.out; c.lineWidth = h * .2; c.strokeText(ch, x, base);
  c.strokeStyle = st.rim; c.lineWidth = h * .09; c.strokeText(ch, x, base);
  const gr = c.createLinearGradient(0, pad, 0, base); st.fill.forEach((col, i) => gr.addColorStop(i / (st.fill.length - 1), col)); c.fillStyle = gr; c.fillText(ch, x, base);
  return { cv, w, pad };
}
const stripCache = new Map();
function glyphStrip(set, text, h, font) {
  const key = set.def.dir + '|' + text + '|' + Math.round(h * 2) + '|' + set.gen + '|' + set.uid;
  let s = stripCache.get(key); if (s) return s;
  const d = set.def, sc = h / set.refH(), tH = (d.trackH ?? -.03) * h, items = []; let x = 0, fb = 0;
  for (const ch of String(text)) {
    if (ch === ' ' || ch === '\u00a0') { x += (d.space ?? .28) * h; continue; }
    const n = d.chars[ch];
    if (n && set.ok[n]) { const m = set.m(n), gw = m.w * sc, gh = m.h * sc; items.push({ n, x, gw, gh, off: (m.baseline_offset || 0) * sc }); x += gw + tH; }
    else { const f = craftedGlyph(ch, h * (/[,.]/.test(ch) ? .5 : 1), d.fallback, font); fb++; items.push({ f, x, gw: f.w, gh: h }); x += f.w + tH; }
  }
  const W = Math.max(1, x - tH), pad = Math.ceil(h * .3), cv = mk(W + pad * 2, h + pad * 2), c = cv.getContext('2d'), base = pad + h;
  for (const it of items) { if (it.f) c.drawImage(it.f.cv, pad + it.x - it.f.pad, base - it.f.cv.height + it.f.pad); else c.drawImage(set.img[it.n], pad + it.x, base - it.off - it.gh, it.gw, it.gh); }
  s = { cv, w: W, h, pad, fallback: fb }; stripCache.set(key, s); if (stripCache.size > 300) stripCache.delete(stripCache.keys().next().value);
  return s;
}
// Draw a glyph string centred at (cx, cy). Height never below minPx (money ≥ 44 px, STANDARDS §4); maxW
// fits by uniform scale down to the floor; past the floor the string keeps the floor (plate widens).
function drawGlyphs(g, set, text, cx, cy, h, o = {}) {
  const minPx = o.minPx ?? set.def.minPx ?? 44; h = Math.max(minPx, h);
  const s = glyphStrip(set, text, h, o.font || 'Georgia, serif');
  let k = o.scale ?? 1; if (o.maxW && s.w * k > o.maxW) k = Math.max(minPx / h, o.maxW / s.w);
  g.save(); g.globalAlpha *= o.alpha ?? 1; g.translate(cx, cy); g.scale(k, k);
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = h * .35; }
  g.drawImage(s.cv, -s.w / 2 - s.pad, -h / 2 - s.pad); g.restore();
  return { w: s.w * k, h: h * k, fallback: s.fallback };
}

/* ================= crafted title type (per letter; STANDARDS §4 `title` set, or the canvas craft path) ================= */
// style = { font: '"Cinzel Decorative", Georgia, serif', weight: 900, fill: [stops], rim: [stops], out, outFrac,
//           shine, shadow }, or { glyphs: <loaded title set> } to use painted letter sprites.
const letterCache = new Map();
function letterSprite(ch, h, st) {
  const key = ch + '|' + Math.round(h) + '|' + st.key + '|' + (st.fontGen ? st.fontGen() : 0) + '|' + (st.glyphs ? st.glyphs.gen + ':' + st.glyphs.uid : 0);
  let L = letterCache.get(key); if (L) return L;
  if (st.glyphs && st.glyphs.ok[st.glyphs.def.chars[ch]]) { // painted title alphabet
    const set = st.glyphs, n = set.def.chars[ch], m = set.m(n), k = h / set.refH(), w = m.w * k, gh = m.h * k, pad = Math.ceil(h * .25);
    const cv = mk(w + pad * 2, gh + pad * 2), c = cv.getContext('2d'); c.drawImage(set.img[n], pad, pad, w, gh);
    const wv = mk(cv.width, cv.height), wc = wv.getContext('2d'); wc.drawImage(cv, 0, 0); wc.globalCompositeOperation = 'source-in'; wc.fillStyle = '#fff'; wc.fillRect(0, 0, wv.width, wv.height); // glint / flash silhouette
    L = { cv, w, pad, base: pad + gh + (m.baseline_offset || 0) * k, white: wv }; letterCache.set(key, L); return L; // 1.0.1: same sign as glyphStrip() (baseline_offset = baseline − glyph bottom; negative = overshoot below the baseline)
  }
  const fs = h * 1.36, font = `${st.weight || 900} ${fs}px ${st.font}`, pad = Math.ceil(h * .42);
  const c0 = mk(4, 4).getContext('2d'); c0.font = font; const w = Math.max(h * .2, c0.measureText(ch).width);
  const W = w + pad * 2, H = h * 1.5 + pad * 2, base = pad + h * 1.1, x = W / 2;
  const layer = () => { const cv = mk(W, H), c = cv.getContext('2d'); c.font = font; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.miterLimit = 2; return [cv, c]; };
  const [cv, c] = layer();
  // 1 soft cast shadow, 2 dark outer outline (≥ 8% of height), 3 bronze bevel rim, 4 gold body, 5 bevel light/shade, 6 top-edge specular
  c.save(); c.shadowColor = st.shadow || 'rgba(20,4,0,.75)'; c.shadowBlur = h * .14; c.shadowOffsetY = h * .07; c.fillStyle = st.out || '#2a0a04'; c.fillText(ch, x, base); c.restore();
  c.strokeStyle = st.out || '#2a0a04'; c.lineWidth = h * (st.outFrac || .2); c.strokeText(ch, x, base);
  const rg = c.createLinearGradient(0, base - h, 0, base); (st.rim || ['#fff0b8', '#b8741c', '#6a3608', '#e0a040']).forEach((col, i, a) => rg.addColorStop(i / (a.length - 1), col));
  c.strokeStyle = rg; c.lineWidth = h * .1; c.strokeText(ch, x, base);
  const fg = c.createLinearGradient(0, base - h, 0, base + h * .05); (st.fill || ['#fffef2', '#ffe9a0', '#ffc94a', '#e8901c', '#a85a0c']).forEach((col, i, a) => fg.addColorStop(i / (a.length - 1), col));
  c.fillStyle = fg; c.fillText(ch, x, base);
  // bevel: light from above-left inside the body, warm shade at the foot
  const [bv, b] = layer(); b.fillStyle = '#fff'; b.fillText(ch, x, base); b.globalCompositeOperation = 'source-in';
  const bl = b.createLinearGradient(0, base - h, 0, base); bl.addColorStop(0, 'rgba(255,255,240,.85)'); bl.addColorStop(.38, 'rgba(255,250,220,.15)'); bl.addColorStop(.55, 'rgba(120,50,0,0)'); bl.addColorStop(1, 'rgba(110,40,0,.45)');
  b.fillStyle = bl; b.fillRect(0, 0, W, H); c.drawImage(bv, 0, 0);
  // top-edge specular sliver: glyph minus itself shifted down
  const [sv, s2] = layer(); s2.fillStyle = 'rgba(255,255,250,1)'; s2.fillText(ch, x, base); s2.globalCompositeOperation = 'destination-out'; s2.fillText(ch, x + h * .012, base + h * .035);
  c.globalAlpha = .75; c.drawImage(sv, 0, 0); c.globalAlpha = 1;
  // inner fine line (gilded inlay)
  c.save(); c.globalCompositeOperation = 'source-atop'; c.strokeStyle = 'rgba(255,248,214,.45)'; c.lineWidth = Math.max(1, h * .018); c.strokeText(ch, x, base - h * .01); c.restore();
  // white silhouette for light passes
  const [wv, wc] = layer(); wc.fillStyle = '#fff6d6'; wc.fillText(ch, x, base);
  L = { cv, w, pad, base, white: wv }; letterCache.set(key, L); return L;
}
// Per-letter title. entry: 'stamp' | 'pop' | 'drop' (letters fall like tiles). t = ms since the title began
// (Infinity = settled). Returns the laid-out width. Never fades the reveal to empty.
function drawTitle(g, text, cx, cy, h, st, t, entry = 'stamp', o = {}) {
  if (!isFinite(t)) t = 1e6; // 'already settled' (Infinity) must not NaN the idle / glint maths
  const chars = [...String(text)], track = h * (st.track ?? .02), sp = h * .34, stagger = o.stagger ?? (entry === 'drop' ? 35 : 45);
  const Ls = chars.map(ch => ch === ' ' ? null : letterSprite(ch, h, st));
  const tw = chars.reduce((s, ch, i) => s + (Ls[i] ? Ls[i].w + track : sp), -track);
  let k = 1; if (o.maxW && tw > o.maxW) k = o.maxW / tw;
  let x = cx - tw * k / 2; const glintPeriod = o.glintPeriod || 2600, gp = ((o.idleT ?? t) % glintPeriod) / glintPeriod;
  chars.forEach((ch, i) => {
    const L = Ls[i]; if (!L) { x += sp * k; return; }
    const lt = t - i * stagger, lx = x + L.w * k / 2; x += (L.w + track) * k;
    if (lt < 0) return;
    let sc = 1, dy = 0, al = 1, rot = 0;
    if (entry === 'stamp') { if (lt < 90) { sc = lerp(2.1, .9, eIn(lt / 90)); al = clamp(lt / 50); } else if (lt < 230) sc = lerp(.9, 1.07, eOut((lt - 90) / 140)); else if (lt < 360) sc = lerp(1.07, 1, eIO((lt - 230) / 130)); rot = (hash(i, 7) - .5) * .12 * (1 - clamp(lt / 300)); }
    else if (entry === 'pop') { sc = lt < 260 ? lerp(.25, 1.16, eBack(lt / 260, 2)) : lerp(1.16, 1, eIO((lt - 260) / 180)); al = clamp(lt / 80); }
    else if (entry === 'drop') { const T1 = 260; if (lt < T1) { dy = lerp(-h * 1.3, 7, eIn(lt / T1)); al = clamp(lt / 60); } else if (lt < T1 + 70) dy = lerp(7, -3, eOut((lt - T1) / 70)); else if (lt < T1 + 160) dy = lerp(-3, 0, eOut((lt - T1 - 70) / 90)); }
    const settled = lt > 420, idle = settled ? Math.sin((o.idleT ?? t) / 640 + i * .7) * h * .012 : 0;
    g.save(); g.globalAlpha *= al * (o.alpha ?? 1); g.translate(lx, cy + h * .45 * k + dy + idle); g.rotate(rot); g.scale(sc * k, sc * k);
    g.drawImage(L.cv, -L.cv.width / 2, -L.base);
    if (L.white && settled && !o.noGlint) { const lp = (lx - (cx - tw * k / 2)) / Math.max(1, tw * k), d = Math.abs(gp * 1.6 - .3 - lp); const gl = clamp(1 - d / .12) * .55; if (gl > .01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha *= gl; g.drawImage(L.white, -L.cv.width / 2, -L.base); } }
    if (L.white && lt < 160) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - lt / 160) * .7 * (o.alpha ?? 1); g.drawImage(L.white, -L.cv.width / 2, -L.base); }
    g.restore();
  });
  return tw * k;
}

/* ================= default dressing (games override per STANDARDS §2 "per-game themable") ================= */
const DEFAULT_DRESSING = {
  particles(g, t, P) { // sparse gold sparks rising
    const n = Math.round(14 + 26 * P.level);
    for (let i = 0; i < n; i++) { const per = 2200 + 1400 * hash(i, 1), q = ((t + hash(i, 2) * per) % per) / per, x = P.W * (.08 + .84 * hash(i, 3)) + Math.sin(t / 700 + i) * 16, y = P.cy + 420 - q * 760;
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(q * Math.PI) * .8; g.fillStyle = '#ffd56a'; g.beginPath(); g.arc(x, y, 3 + 4 * hash(i, 4), 0, 7); g.fill(); g.restore(); }
  },
};

/* ================= engine ================= */
function create(opts) {
  const g = opts.g, W = opts.W || 1080, H = opts.H || 1920;
  const game = opts.game || {}, STD = JSON.parse(JSON.stringify(STD0, (k, v) => v === Infinity ? 'Infinity' : (typeof v === 'function' ? undefined : v)));
  STD.tiers.forEach(tr => { if (tr.max === 'Infinity') tr.max = Infinity; }); STD.count.curve = STD0.count.curve; STD.flow.splash.storageKey = STD0.flow.splash.storageKey;
  const ignored = [];
  Object.entries(flat(game.overrides || {})).forEach(([path, v]) => { if ((root.GSS_STANDARD_OVERRIDABLE || []).includes(path)) setPath(STD, path, v); else ignored.push(path); });
  const clock = opts.clock || (root.GSSUI && root.GSSUI.timeWarp) || null;
  const realNow = () => clock && clock.realNow ? clock.realNow() : performance.now();
  const speed = () => clock && clock.getSpeed ? clock.getSpeed() : 1;
  const get = Object.assign({ autoplay: () => false, hudTop: () => 1528 }, opts.get || {});
  // Autoplay source: the game's get.autoplay() (e.g. the kit's hud.state.autoplay) OR a pushed flag
  // (WIN.setAutoplay(bool) / GSSWin.setAutoplay(bool), for a kit autoplay event/callback). Either one = on.
  let apFlag = null; const apGet = get.autoplay; get.autoplay = () => !!(apGet() || apFlag || AUTOPLAY.on);
  let D = Object.assign({}, DEFAULT_DRESSING, game.dressing || {});
  const strings = deep({ tiers: { big: 'BIG WIN', mega: 'MEGA WIN', epic: 'EPIC WIN' }, tap: 'TAP TO CONTINUE', outroLabel: 'TOTAL WIN', modes: {} }, game.strings || {});
  const LY = deep({ tierTitle: { x: W / 2, y: 720, h: 150 }, tierAmount: { x: W / 2, y: 930, h: 140, maxW: 900 },
    intro: { count: { x: W / 2, y: 1350, h: 220 }, title: { x: W / 2, y: 1530, h: 100 }, tap: { x: W / 2, y: 1850, h: 44 } },
    retrigger: { x: W / 2, y: 820, h: 240, label: 80 },
    outro: { title: { x: W / 2, y: 1135, h: 110 }, label: { x: W / 2, y: 1240, h: 46 }, amount: { x: W / 2, y: 1345, h: 130, maxW: 900 }, tap: { x: W / 2, y: 1450, h: 40 } },
    counter: { x: 168, y: 150, w: 190, h: 104 }, hudTotal: { x: 180, y: 1872 } }, game.layout || {});
  const glyphs = {}; Object.entries(game.glyphs || {}).forEach(([role, def]) => { glyphs[role] = def && def.dir ? loadGlyphSet(def) : null; });
  let winSet = glyphs.win;
  let titleStyle = Object.assign({ key: 'std', font: 'Georgia, serif' }, game.title || {}, glyphs.title ? { glyphs: glyphs.title } : {});
  const fmt = game.formatMoney || (v => root.GSSUI ? root.GSSUI.formatMoney(v, game.theme) : '€ ' + (+v).toFixed(2));
  let AMT = game.amount || null; // 1.1.0 amount type hook: { style: { glow, minPx, … } merged over each call, draw(g, str, x, y, h, o, v) painter }
  const money = (v, x, y, h, o = {}) => { if (AMT && AMT.draw) return AMT.draw(g, fmt(v), x, y, h, o, v);
    return winSet ? drawGlyphs(g, winSet, fmt(v), x, y, h, AMT && AMT.style ? Object.assign({ font: titleStyle.font }, o, AMT.style) : Object.assign({ font: titleStyle.font }, o)) : null; };
  const text = (s, x, y, h, t, entry, o) => drawTitle(g, s, x, y - h * .45, h, titleStyle, t, entry, o);
  const log = [];
  const mark = (type, extra) => { log.push(Object.assign({ type, real: Math.round(realNow()), speed: speed() }, extra || {})); if (log.length > 300) log.shift(); };

  let scene = null, lastReal = realNow();
  const counter = { on: false, mode: null, value: 0, shown: 0, pop: -1e9, popK: 1.1, flash: -1e9, floatT: -1e9, floatS: '', hold: null, t: 0 };

  function tierFor(amount, bet) {
    const a = Math.round((+amount || 0) * 100) / 100; if (!(a > 0) || !(bet > 0)) return null;
    const ratio = a / bet; return STD.tiers.find(tr => ratio <= tr.max + 1e-9) || STD.tiers[STD.tiers.length - 1];
  }
  const titled = tr => !!tr && STD.tiers.indexOf(tr) >= STD.tiers.findIndex(x => x.id === STD.titledFrom);
  function run(sc) { return new Promise(res => { if (scene && scene.resolve) scene.resolve('replaced'); sc.resolve = res; sc.t = 0; sc.start = realNow(); sc.taps = 0; scene = sc; mark(sc.kind + '-start', sc.info); }); }
  const LST = { sceneEnd: [], outroEnd: [] }; if (opts.on && opts.on.outroEnd) LST.outroEnd.push(opts.on.outroEnd); if (opts.on && opts.on.sceneEnd) LST.sceneEnd.push(opts.on.sceneEnd);
  const emit = (ev, info) => { for (const fn of LST[ev].slice()) { try { fn(info); } catch (e) { console.error(e); } }
    if (ev === 'outroEnd' && root.dispatchEvent && typeof root.CustomEvent === 'function') { try { root.dispatchEvent(new root.CustomEvent('gsswin:outroend', { detail: info })); } catch (e) {} } };
  function onEv(ev, fn) { if (!LST[ev]) LST[ev] = []; LST[ev].push(fn); return () => { const i = LST[ev].indexOf(fn); if (i >= 0) LST[ev].splice(i, 1); }; }
  function finish(sc, why) { if (scene !== sc) return; scene = null; mark(sc.kind + '-end', { why, t: Math.round(sc.t) });
    if (LST.sceneEnd.length) emit('sceneEnd', { kind: sc.kind, why, info: sc.info });
    if (sc.kind === 'outro') emit('outroEnd', Object.assign({ why }, sc.info)); // 1.1.0 outro-end hook (before the outro promise resolves)
    sc.resolve(why); }
  const P = (sc, level, extra) => Object.assign({ W, H, cx: W / 2, cy: LY.tierAmount.y - 100, hudTop: get.hudTop(), level, hash, t: sc.t, tier: sc.tier && sc.tier.id, mode: sc.mode, g, clamp, lerp, eOut, eBack, pulse }, extra || {});
  function veil(a, toY) { if (a <= 0) return; g.save(); const y1 = toY ?? get.hudTop(); g.globalAlpha = Math.min(1, a); g.fillStyle = game.veil || '#04160f'; g.fillRect(0, 0, W, y1); g.restore(); } // uniform felt veil (AD: #04160f, alpha = tier dim)
  const over = (kind, t, PP) => { if (D.overVeil) D.overVeil(g, t, Object.assign({ kind }, PP)); }, backing = (kind, a, PP) => { if (D.backing && a > 0) D.backing(g, kind, a, PP); };
  function tapLine(t0, t, y, s, pz = 0) { const q = clamp((t - t0) / 300); if (q <= 0) return; const ph = Math.sin((t - t0) / 1600 * Math.PI * 2) * .5 + .5, br = .65 + .35 * ph; text(s || strings.tap, W / 2, y.y ?? y, (y.h || 44) * (1 + pz * ph), Infinity, 'stamp', { alpha: q * br, noGlint: true, idleT: t }); }

  /* ---------- base event: tier presentation ---------- */
  function present(amount, bet, o = {}) {
    const tier = tierFor(amount, bet); if (!tier) return Promise.resolve(null);
    if (!titled(tier) && (game.belowBig || 'game') === 'game') { mark('present-skip', { tier: tier.id, amount }); return Promise.resolve(tier); } // below BIG: amount only, owned by the game's TOTAL WIN
    return run({ kind: 'tier', tier, amount, bet, info: { tier: tier.id, amount, ratio: +(amount / bet).toFixed(2) }, cap: titled(tier), jumpAt: null, closeAt: null,
      draw(t) {
        const T = this.tier, big = titled(T), lvl = { big: 0, mega: .5, epic: 1 }[T.id] ?? 0, end = this.closeAt ?? T.end;
        const out = clamp((t - end) / 350), inA = clamp(t / 300);
        if (t >= end + 350) return finish(this, this.closeAt ? 'tap-close' : 'auto');
        const fade = 1 - out;
        veil(((game.tierVeil && game.tierVeil[T.id]) ?? T.dim) * inA * fade); /* game.tierVeil: Lead-approved per-game veil (002: mega/epic .62) */
        g.save(); g.globalAlpha = fade;
        const k0 = this.jumpAt != null ? 1 : clamp((t - T.cs) / Math.max(1, T.cl));
        const PP = P(this, lvl, { titleT: t - T.pre, countT: t - T.cs, k: k0, countDone: T.cs + T.cl, jumped: this.jumpAt != null,
          keepOut: [{ x: LY.tierTitle.x, y: LY.tierTitle.y, w: (LY.tierTitle.w || W - 150), h: LY.tierTitle.h * 1.5 }, { x: LY.tierAmount.x, y: LY.tierAmount.y, w: (LY.tierAmount.maxW || 900), h: LY.tierAmount.h * 1.3 }] });
        over('tier', t, PP); backing('tier', inA * fade, PP);
        if (D.light && big) D.light(g, t, PP);
        if (t < T.pre && D.preBeat) D.preBeat(g, t, PP);
        if (big && t >= T.pre) {
          if (T.id === 'epic' && D.hero) D.hero(g, t - T.pre, PP);
          if (D[T.id]) D[T.id](g, t - T.pre, PP); else D.particles(g, t - T.pre, PP);
          if (T.entry === 'pop+wings' && D.wings) D.wings(g, t - T.pre, PP);
          const tt = this.jumpAt != null ? Math.max(t - T.pre, 1e4) : t - T.pre, sz = LY.tierTitle.h * (T.id === 'epic' ? 1.22 : T.id === 'mega' ? 1.1 : 1);
          text(strings.tiers[T.id] || T.title, LY.tierTitle.x, LY.tierTitle.y, sz, tt, T.entry === 'pop+wings' ? 'pop' : 'stamp', { idleT: t, maxW: W - 150, stagger: T.te / Math.max(4, (T.title || '').length) });
        }
        // amount: count on the standard curve; jump on the first tap; settle pop
        const k = this.jumpAt != null ? 1 : clamp((t - T.cs) / Math.max(1, T.cl)), v = T.cl ? this.amount * STD.count.curve(k) : this.amount;
        if (t >= T.cs || this.jumpAt != null) {
          const doneAt = this.jumpAt ?? (T.cs + T.cl), sp = pulse(t - doneAt, STD.count.settlePop) * .1, ah = LY.tierAmount.h * (T.id === 'epic' ? 1.15 : 1);
          money(k >= 1 ? this.amount : v, LY.tierAmount.x, LY.tierAmount.y, ah, { scale: (t - T.cs < 160 && this.jumpAt == null ? lerp(.6, 1, eBack((t - T.cs) / 160)) : 1) + sp, maxW: LY.tierAmount.maxW, glow: 'rgba(255,190,60,.55)' });
        }
        g.restore();
      },
      tap() { const real = realNow() - this.start; if (real < STD.count.skipLock) return true;
        if (this.jumpAt == null) { this.jumpAt = this.t; this.closeAt = null; if (this.t + STD.count.settlePop > this.tier.end) this.closeAt = this.t + STD.count.settlePop; mark('tier-jump', { t: Math.round(this.t) }); }
        else if (STD.count.secondTapCloses && this.closeAt == null) { this.closeAt = this.t; mark('tier-close', { t: Math.round(this.t) }); }
        return true; },
    });
  }

  /* ---------- trigger celebration wait (unskippable, ×min(k, 1.5)) ---------- */
  function celebrate(ms) { return run({ kind: 'trigger', cap: true, info: { ms }, passive: true, draw(t) { if (t >= ms) finish(this, 'auto'); }, tap() { return false; } }); }

  /* ---------- bonus intro ---------- */
  function intro(o) {
    const IL = LY.intro[o.mode] ? deep(LY.intro, LY.intro[o.mode]) : LY.intro;
    const F = STD.flow.intro, m = strings.modes[o.mode] || {}, settle = (o.settleMs ?? m.introSettle ?? F.settleMs), lock = o.inputLock ?? m.introLock ?? F.inputLock;
    const showCount = !(o.noCount || m.introCount === false), showTitle = !(o.noTitle || m.introTitle === false); // 1.1.0 flags
    return run({ kind: 'intro', mode: o.mode, info: { mode: o.mode, count: o.count }, exitAt: null, settledReal: null,
      draw(t) {
        if (this.exitAt != null && t >= this.exitAt + F.exitMs) return finish(this, this.why || 'tap');
        const ex = this.exitAt != null ? clamp((t - this.exitAt) / F.exitMs) : 0, PP = P(this, 0, { settle, exit: ex, count: o.count, layout: IL });
        if (t >= settle && this.settledReal == null) this.settledReal = realNow();
        if (D.introScene) D.introScene(g, t, PP); else { g.fillStyle = `rgba(4,14,9,${.9 * clamp(t / 300)})`; g.fillRect(0, 0, W, H); }
        g.save(); g.globalAlpha = 1 - eIn(ex);
        const C1 = IL.count, cT = t - (m.countAt ?? 1000);
        if (cT >= 0 && showCount) { const sc = cT < 300 ? (cT < 120 ? lerp(1.4, .95, eIn(cT / 120)) : lerp(.95, 1, eBack((cT - 120) / 180, 1.8))) : 1; drawGlyphs(g, winSet, String(o.count), C1.x, C1.y, C1.h, { scale: sc, alpha: clamp(cT / 60), minPx: 60, glow: 'rgba(255,200,90,.45)' }); }
        const tT = t - (m.titleAt ?? 1100); if (tT >= 0 && showTitle) text(m.title || String(o.mode).toUpperCase(), IL.title.x, IL.title.y, IL.title.h, tT, 'drop', { idleT: t, maxW: W - 90 });
        if (t >= settle) tapLine(settle, t, IL.tap);
        g.restore();
        if (this.exitAt == null && this.settledReal != null && get.autoplay() && realNow() - this.settledReal >= F.autoplayTimeout) { this.exitAt = t; this.why = 'autoplay'; mark('intro-auto', {}); }
      },
      tap() { if (realNow() - this.start < lock || this.exitAt != null) return true;
        if (this.t < settle && F.tapJumpsToSettle) { this.t = settle; mark('intro-jump', {}); } else { this.exitAt = this.t; this.why = 'tap'; } return true; },
    });
  }

  /* ---------- hands / spins counter ---------- */
  function counterShow(mode, v) { Object.assign(counter, { on: true, mode, value: v, shown: v, hold: null, pop: -1e9, flash: -1e9 }); }
  function counterHide() { counter.on = false; }
  function counterCommit(v) { if (!counter.on) return; const last = v === 0; counter.value = v; if (counter.hold == null) counter.shown = v; counter.pop = counter.t; counter.popK = STD.counter.tickPop;
    if (last) { counter.floatT = counter.t; counter.floatS = (strings.modes[counter.mode] || {}).lastSpin || 'LAST SPIN'; } mark('counter', { v }); }
  function drawCounter(dt) {
    counter.t += dt; if (!counter.on) return; const c = LY.counter, t = counter.t, m = strings.modes[counter.mode] || {};
    const pq = t - counter.pop, pk = pq >= 0 && pq < STD.counter.tickMs * (counter.popK > 1.15 ? 1.5 : 1) ? (counter.popK - 1) * Math.sin(Math.PI * pq / (STD.counter.tickMs * (counter.popK > 1.15 ? 1.5 : 1))) : 0;
    const lastPulse = counter.shown <= 1 ? Math.sin(t / STD.counter.lastSpinPulse.period * Math.PI * 2) * STD.counter.lastSpinPulse.amp : 0, s = 1 + pk + lastPulse;
    g.save(); g.translate(c.x, c.y); g.scale(s, s);
    if (D.counterPlate) D.counterPlate(g, c, { t, last: counter.shown <= 1, flash: pulse(t - counter.flash, 400) });
    else { rr(g, -c.w / 2, -c.h / 2, c.w, c.h, c.h / 2); g.fillStyle = 'rgba(40,8,6,.85)'; g.fill(); g.lineWidth = 3; g.strokeStyle = counter.shown <= 1 ? '#ffb04a' : '#f2c45a'; g.stroke(); }
    drawGlyphs(g, winSet, String(counter.shown), 0, m.counterWord ? -c.h * .17 : 0, Math.max(STD.counter.minDigitPx, c.h * (m.counterWord ? .55 : .78)), { minPx: STD.counter.minDigitPx });
    if (m.counterWord) text(m.counterWord, 0, c.h * .31, c.h * .2, Infinity, 'stamp', { noGlint: true, maxW: c.w * .74, idleT: 0 });
    g.restore();
    const fq = t - counter.floatT; if (fq >= 0 && fq < 1600 && counter.floatS) { const a = fq < 200 ? fq / 200 : 1 - clamp((fq - 1100) / 500); text(counter.floatS, Math.max(c.x, 190), (LY.counter.floatY ?? (c.y - c.h * .5 - 14)) - fq * .02, 34, fq, 'pop', { alpha: a, noGlint: true, maxW: 340 }); /* rises above the plate, never over the Wall */ }
  }

  /* ---------- retrigger popup (+N): auto 1700, tap → fly-out at 1300 ---------- */
  function retrigger(o) {
    const F = STD.flow.retrigger, m = strings.modes[o.mode] || {}; counter.hold = o.from ?? counter.shown;
    return run({ kind: 'retrigger', mode: o.mode, info: { n: o.n }, arrived: false,
      draw(t) {
        if (t >= F.totalMs) { if (!this.arrived) arrive(this); return finish(this, this.skipped ? 'tap' : 'auto'); }
        const L = LY.retrigger, PP = P(this, .3);
        const ra = clamp(t / 200) * (1 - clamp((t - 1450) / 250));
        veil(.25 * ra); over('retrigger', t, PP); backing('retrigger', ra, PP);
        if (D.retriggerScene) D.retriggerScene(g, t, PP);
        const pt = t - 350; if (pt < 0) return;
        let x = L.x, y = L.y, sc = pt < 350 ? (pt < 220 ? lerp(.5, 1.15, eBack(pt / 220, 2)) : lerp(1.15, 1, eIO((pt - 220) / 130))) : 1, al = clamp(pt / 80);
        if (t >= F.tapSkipTo) { const u = clamp((t - F.tapSkipTo) / (F.totalMs - F.tapSkipTo)); x = lerp(L.x, LY.counter.x, eIO(u)); y = lerp(L.y, LY.counter.y, eIO(u)) - Math.sin(u * Math.PI) * 140; sc = lerp(1, .3, eIn(u)); if (u >= .98 && !this.arrived) arrive(this); }
        drawGlyphs(g, winSet, '+' + o.n, x, y, L.h, { scale: sc, alpha: al, minPx: 60, glow: 'rgba(255,200,90,.5)' });
        if (t < F.tapSkipTo + 150) text(m.retrigger || m.title || '', L.x, L.labelY ?? L.y + L.h * .75, (L.labelByMode && L.labelByMode[o.mode]) || L.label, pt - (L.labelDelay || 0), L.labelEntry || 'drop', { stagger: L.labelStagger, idleT: t, alpha: 1 - clamp((t - F.tapSkipTo) / 150), maxW: W - 120 });
      },
      tap() { if (realNow() - this.start < F.inputLock) return true; if (this.t < F.tapSkipTo) { this.t = F.tapSkipTo; this.skipped = true; } return true; },
    });
    function arrive(sc) { sc.arrived = true; counter.hold = null; counter.shown = o.to ?? counter.value; counter.pop = counter.t; counter.popK = STD.counter.retriggerPop; counter.flash = counter.t; mark('counter-retrigger', { to: counter.shown }); }
  }

  /* ---------- bonus outro: signature beat → tiered count → collect ---------- */
  function outro(o) {
    const F = STD.flow.outro, tier = tierFor(o.total, o.bet), big = titled(tier), m = strings.modes[o.mode] || {};
    const sigMs = D.outroSignature ? D.outroSignature.duration(o) : 0, labelAt = sigMs + 0, countAt = sigMs + 600, countMs = !(o.total > 0) ? 0 : big ? tier.cl : F.shortCount;
    const thr = big ? STD.tiers[STD.tiers.indexOf(tier) - 1].max * o.bet : Infinity, settleAt = countAt + countMs, hudBand = +(o.hudBand ?? m.outroHudBand ?? game.outroHudBand ?? .6) || 0;
    return run({ kind: 'outro', mode: o.mode, tier, info: { mode: o.mode, total: o.total, tier: tier ? tier.id : 'none', sigMs, countMs }, cap: false, jumped: false, exitAt: null, titleAt: null, settledReal: null,
      draw(t) {
        this.cap = big && t >= countAt && t < settleAt + 500;
        if (this.exitAt != null && t >= this.exitAt + F.exitMs) return finish(this, this.why || 'tap');
        const ex = this.exitAt != null ? clamp((t - this.exitAt) / F.exitMs) : 0, lvl = tier ? ({ big: 0, mega: .5, epic: 1 }[tier.id] ?? 0) : 0;
        veil((game.outroVeil ?? .55) * clamp(t / 400) * (1 - eIn(ex)));
        if (hudBand > 0 && !(get.pageOpaque && get.pageOpaque())) { g.save(); g.fillStyle = `rgba(0,0,0,${hudBand * clamp(t / 400) * (1 - ex)})`; g.fillRect(0, get.hudTop(), W, H - get.hudTop()); g.restore(); } // HUD at 0.4 (1.1.0: hudBand, opaque page skips)
        const kq = this.jumped ? 1 : clamp((t - countAt) / Math.max(1, countMs));
        const PP = P(this, lvl, { exit: ex, jumped: this.jumped, total: o.total, k: kq, countT: t - countAt, titleAt: this.titleAt, sigMs,
          keepOut: [{ x: W / 2, y: LY.outro.title.y - LY.outro.title.h * .45, w: (LY.outro.title.w || W - 100), h: LY.outro.title.h * 1.4 }, { x: W / 2, y: LY.outro.amount.y, w: (LY.outro.amount.maxW || 900), h: LY.outro.amount.h * 1.3 }, { x: W / 2, y: LY.outro.label.y - LY.outro.label.h * .5, w: 460, h: LY.outro.label.h * 1.5 }] });
        over('outro', t, PP); backing('outro', clamp(t / 400) * (1 - eIn(ex)), PP);
        if (D.outroSignature) D.outroSignature.draw(g, this.jumped ? Math.max(t, sigMs + 1) : t, PP, o);
        g.save(); g.globalAlpha = 1 - eIn(ex);
        const k = this.jumped ? 1 : clamp((t - countAt) / Math.max(1, countMs)), v = (o.total || 0) * (countMs ? eQuart(k) : 1);
        if (big && this.titleAt == null && (v >= thr || this.jumped)) { this.titleAt = t; mark('outro-title', { tier: tier.id, t: Math.round(t) }); }
        if (this.titleAt != null) { const tt = t - this.titleAt, PT = Object.assign({}, PP, { countT: tt, kind: 'outro' }); /* outro dressing beats run from the title stamp */ if (tier.id === 'epic' && D.hero) D.hero(g, tt, PT); if (D[tier.id]) D[tier.id](g, tt, PT); if (tier.entry === 'pop+wings' && D.wings) D.wings(g, tt, Object.assign({}, PT, { cy: LY.outro.title.y })); text(strings.tiers[tier.id], LY.outro.title.x, LY.outro.title.y, LY.outro.title.h, this.jumped && tt < 1 ? 1e4 : tt, 'stamp', { idleT: t, maxW: W - 100 }); }
        const lt = t - labelAt; if (lt >= 0) text(m.outroLabel || strings.outroLabel, LY.outro.label.x, LY.outro.label.y + 20 * (1 - eOut(lt / 350)), LY.outro.label.h, Infinity, 'stamp', { alpha: clamp(lt / 350), noGlint: true });
        if (t >= labelAt + 250 || this.jumped) { const ct = t - settleAt, sp = ct >= 0 ? pulse(ct, 300) * .08 : 0; money(k >= 1 ? (o.total || 0) : v, LY.outro.amount.x, LY.outro.amount.y, LY.outro.amount.h, { scale: 1 + sp, maxW: LY.outro.amount.maxW, alpha: clamp((t - labelAt - 250) / 250) || (this.jumped ? 1 : 0), glow: 'rgba(255,190,60,.5)' }); }
        const settled = this.jumped ? this.t >= (this.jumpT || 0) + 300 : t >= settleAt;
        if (settled && this.settledReal == null) { this.settledReal = realNow(); this.settleT = t; }
        if (settled) tapLine(this.settleT, t, LY.outro.tap);
        g.restore();
        if (ex > 0 && D.collect) D.collect(g, ex, Object.assign({}, PP, { from: LY.outro.amount, to: (get.hudTotal && get.hudTotal()) || LY.hudTotal, total: o.total }));
        else if (ex > 0) money(o.total || 0, lerp(LY.outro.amount.x, ((get.hudTotal && get.hudTotal()) || LY.hudTotal).x, eIO(ex)), lerp(LY.outro.amount.y, ((get.hudTotal && get.hudTotal()) || LY.hudTotal).y, eIO(ex)) - Math.sin(ex * Math.PI) * 120, LY.outro.amount.h, { scale: lerp(1, .4, ex), alpha: 1 - clamp((ex - .8) / .2) });
        if (this.exitAt == null && this.settledReal != null && get.autoplay() && realNow() - this.settledReal >= F.autoplayTimeout) { this.exitAt = t; this.why = 'autoplay'; mark('outro-auto', {}); }
      },
      tap() { if (realNow() - this.start < F.inputLock || this.exitAt != null) return true;
        if (this.settledReal == null && F.tapJumpsToFinal) { this.jumped = true; this.jumpT = this.t; this.t = Math.max(this.t, sigMs + 1); this.jumpT = this.t; mark('outro-jump', {}); }
        else if (this.settledReal != null) { this.exitAt = this.t; this.why = 'tap'; mark('outro-collect', {}); } return true; },
    });
  }

  /* ---------- feature splash (STANDARDS §1): tap only (never auto-continues, autoplay included), lock 400,
     a tap during the build jumps to the settled pose, the next tap exits; DON'T SHOW AGAIN toggle saved on exit ---------- */
  function splash(o = {}) {
    const F = Object.assign({ settleMs: 1700, exitMs: 1200 }, STD.flow.splash, o) /* exit 1200 per PRESENTATION_SCREENS §1 */, id = o.gameId || game.id, SL = LY.splash || {};
    const tg = Object.assign({ x: W / 2, y: 1888, w: 360, h: 64 }, SL.toggle || {}), store = root.GSSUI && root.GSSUI.splash;
    return run({ kind: 'splash', cap: false, info: { id }, exitAt: null, checked: false, settledReal: null, jumped: false,
      draw(t) {
        if (this.exitAt != null && t >= this.exitAt + F.exitMs) { if (this.checked && store) store.hide(id); return finish(this, this.why || 'tap'); }
        const ex = this.exitAt != null ? clamp((t - this.exitAt) / F.exitMs) : 0; this.exitP = ex; const PP = P(this, 0, { settle: F.settleMs, exit: ex, checked: this.checked, toggle: tg, jumped: this.jumped });
        if (t >= F.settleMs && this.settledReal == null) this.settledReal = realNow();
        if (D.splashScene) D.splashScene(g, t, PP); else { g.fillStyle = `rgba(4,14,9,${1 - ex})`; g.fillRect(0, 0, W, H); }
        g.save(); g.globalAlpha = 1 - clamp(ex / .3);
        if (t >= F.settleMs) { tapLine(F.settleMs, t, SL.tap || { y: 1822, h: 44 }, null, .04); /* gentle pulse (alpha + 4 % size) */
          const q = clamp((t - F.settleMs) / 300), bx = tg.x - 150, by = tg.y; g.globalAlpha *= q * .7; g.strokeStyle = '#f7efd9'; g.lineWidth = 3; GSSUI.rr(g, bx - 18, by - 18, 36, 36, 6); g.stroke();
          if (this.checked) { g.strokeStyle = '#f2c45a'; g.lineWidth = 5; g.beginPath(); g.moveTo(bx - 10, by); g.lineTo(bx - 2, by + 9); g.lineTo(bx + 12, by - 10); g.stroke(); }
          g.fillStyle = '#f7efd9'; g.font = `700 26px ${(root.GSSUI && GSSUI.FONT) || 'Arial'}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(SL.toggleLabel || "DON'T SHOW AGAIN", bx + 32, by + 1); }
        g.restore();
      },
      tap(x, y) { if (realNow() - this.start < STD.flow.splash.inputLock || this.exitAt != null) return true;
        if (x != null && this.t >= F.settleMs && Math.abs(x - tg.x) <= tg.w / 2 && Math.abs(y - tg.y) <= tg.h / 2) { this.checked = !this.checked; mark('splash-toggle', { checked: this.checked }); return true; } // the toggle is not the continue tap
        if (this.t < F.settleMs) { this.t = F.settleMs; this.jumped = true; mark('splash-jump', {}); } else { this.exitAt = this.t; this.why = 'tap'; mark('splash-exit', { checked: this.checked, t: Math.round(this.t) }); if (o.onExit) o.onExit(); } return true; },
    });
  }

  /* ---------- bonus chip (1.1.0, opt-in): plate + text between the rails; under every scene ---------- */
  // cfg = { rect: [x, y, w, h], text: 'SPIN 1 / 10' | (chip) => string, n, img (3-slice plate), insets: [l, r] (in ref px),
  //         ref: plate width the insets are measured in (default img width), font, color, stroke, fill, rim, alpha, textX }
  let chip = null;
  function chipShow(cfg) { chip = Object.assign({ alpha: 1 }, cfg || {}); mark('chip-show', {}); }
  function chipUpdate(patch) { if (chip) Object.assign(chip, patch || {}); }
  function chipHide() { chip = null; }
  function drawChip() {
    if (!chip || !chip.rect || !(chip.alpha > 0)) return; const [x, y, w, h] = chip.rect;
    g.save(); g.globalAlpha *= chip.alpha;
    if (D.chip) { D.chip(g, chip, { W, H, x, y, w, h }); g.restore(); return; }
    const im = chip.img, ok = im && im.complete !== false && (im.naturalWidth || im.width), ins = chip.insets || [0, 0];
    let l = 0, r = 0;
    if (ok) { const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, rk = iw / (chip.ref || iw), sc = h / ih; const L = ins[0] * rk * sc, Rr = ins[1] * rk * sc; l = L; r = Rr;
      g.drawImage(im, 0, 0, ins[0] * rk, ih, x, y, L, h); g.drawImage(im, ins[0] * rk, 0, iw - (ins[0] + ins[1]) * rk, ih, x + L, y, w - L - Rr, h); g.drawImage(im, iw - ins[1] * rk, 0, ins[1] * rk, ih, x + w - Rr, y, Rr, h); }
    else { rr(g, x, y, w, h, h * .3); g.fillStyle = chip.fill || 'rgba(24,10,34,.86)'; g.fill(); g.lineWidth = 2; g.strokeStyle = chip.rim || 'rgba(236,200,112,.7)'; g.stroke(); }
    const s = typeof chip.text === 'function' ? chip.text(chip) : chip.text; if (s) {
      const tx = chip.textX ?? (x + l + (w - l - r) / 2), fs = chip.fontPx || Math.round(h * .36);
      g.font = chip.font || `800 ${fs}px ${(root.GSSUI && root.GSSUI.FONT) || 'Arial'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      if (chip.stroke) { g.strokeStyle = chip.stroke; g.lineWidth = fs * .16; g.strokeText(s, tx, y + h / 2 + 1, w - l - r - 16); }
      g.fillStyle = chip.color || '#ffffff'; g.fillText(s, tx, y + h / 2 + 1, w - l - r - 16); }
    g.restore();
  }
  function draw(gg) {
    const now = realNow(), dReal = Math.min(100, Math.max(0, now - lastReal)); lastReal = now;
    const k = speed(), capK = Math.min(k, STD.speed.celebrationCap);
    drawCounter(dReal * k); drawChip();
    if (!scene) return;
    const sc = scene; sc.t += dReal * (sc.cap ? capK : k);
    sc.draw(sc.t);
  }
  function tap() { return scene && !scene.passive ? scene.tap() : false; }
  function hit(x, y) { if (!scene || scene.passive) return false; if (scene.kind === 'tier' && y >= get.hudTop()) return false; scene.tap(x, y); return true; } // base wins leave the HUD live (stop autoplay, bet …)
  if (opts.keys !== false && root.addEventListener) root.addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && scene && !scene.passive) tap(); });

  return {
    standard: STD, ignoredOverrides: ignored, glyphs, tierFor, titled, present, celebrate, intro, retrigger, outro, splash,
    counterShow, counterHide, counterCommit, draw, hit, tap, log, setAutoplay(on) { apFlag = on == null ? null : !!on; }, get autoplay() { return get.autoplay(); },
    get busy() { return !!scene; },
    state() { const s = scene; return s ? { scene: s.kind, t: Math.round(s.t), awaitingTap: (s.kind === 'intro' || s.kind === 'outro' || s.kind === 'splash') && s.settledReal != null && s.exitAt == null, tier: s.tier ? s.tier.id : null, exit: s.exitP || 0 } : { scene: null }; },
    glyphStatus() { return Object.fromEntries(Object.entries(glyphs).filter(([, s]) => s).map(([k, s]) => [k, { loaded: s.loaded, total: s.total, failed: s.failed.slice() }])); },
    whenReady(ms = 700) { const t0 = Date.now(); return new Promise(res => (function poll() { const ok = Object.values(glyphs).every(s => !s || s.done()); if (ok || Date.now() - t0 > ms) res(ok); else setTimeout(poll, 16); })()); },
    drawGlyphs: (set, s, x, y, h, o) => drawGlyphs(g, typeof set === 'string' ? glyphs[set] : set, s, x, y, h, o),
    drawTitle: (s, x, y, h, t, entry, o) => text(s, x, y, h, t, entry, o), money, fmt,
    // 1.1.0 runtime API (opt-in)
    setDressing(patch, o2 = {}) { D = Object.assign({}, o2.replace ? DEFAULT_DRESSING : D, patch || {}); return D; },
    get dressing() { return D; },
    on: onEv, onOutroEnd: fn => onEv('outroEnd', fn),
    setGlyphs(role, def) { const set = def == null ? null : (def.def && def.img && def.ok ? def : loadGlyphSet(def)); glyphs[role] = set;
      if (role === 'win') winSet = set;
      if (role === 'title') titleStyle = Object.assign({}, titleStyle, { glyphs: set || undefined }); if (role === 'title' && !set) delete titleStyle.glyphs;
      mark('glyphs-set', { role }); return new Promise(res => (function poll(t0) { if (!set || set.done() || Date.now() - t0 > 4000) res(set); else setTimeout(() => poll(t0), 16); })(Date.now())); },
    setTitleStyle(style) { titleStyle = Object.assign({ key: 'rt' + (++SET_UID), font: 'Georgia, serif' }, style || {}, glyphs.title ? { glyphs: glyphs.title } : {}); return titleStyle; },
    get titleStyle() { return titleStyle; },
    setAmount(cfg) { AMT = cfg || null; },
    chipShow, chipUpdate, chipHide, get chip() { return chip; },
  };
  function flat(o, p = '', out = {}) { for (const k in o) { const v = o[k], q = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, q, out); else out[q] = v; } return out; }
  function setPath(o, path, v) { const ks = path.split('.'); let c = o; ks.slice(0, -1).forEach(k => { c = c[k] = c[k] || {}; }); c[ks[ks.length - 1]] = v; }
}

root.GSSWin = { version: '1.1.0', create, loadGlyphSet, drawGlyphs, drawTitle, hash, setAutoplay(on) { AUTOPLAY.on = !!on; }, get autoplay() { return AUTOPLAY.on; } };
})(typeof window !== 'undefined' ? window : globalThis);
