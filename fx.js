/* FOUR WINDS 四風 — code/sprite-only presentation (pass 3). No Spine.
 * FX consumes game events and never decides awards, RNG or rules. No Math.random() here:
 * every decorative variation is a stable hash, so seeded gameplay RNG is never consumed.
 * Plain script, relative new Image() sources: file:// keeps working. Timing unit = frames at 30fps. */
(() => {
'use strict';
const F = n => n * 1000 / 30;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, q) => a + (b - a) * q;
const eOut = q => 1 - Math.pow(1 - q, 3), eIn = q => q * q, eIO = q => q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
const eBack = q => { const c = 1.9; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const hash = (n, salt = 17) => { const v = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453; return v - Math.floor(v); };
const pulse = (age, dur) => age >= 0 && age < dur ? Math.sin(Math.PI * age / dur) : 0;
const DEG = Math.PI / 180;

/* ============ VALUE GLYPHS: one re-skinnable value-draw path ============ */
// Mirror of assets/glyphs/*/metrics.json, used when fetch() is unavailable (file://). Over http the
// live metrics.json replaces it on load.
const METRICS_EMBED = {"win_gold":{"euro":{"w":217,"h":251,"baseline_offset":2},"digit_0":{"w":214,"h":251,"baseline_offset":2},"digit_1":{"w":182,"h":250,"baseline_offset":3},"digit_2":{"w":202,"h":254,"baseline_offset":3},"digit_3":{"w":204,"h":257,"baseline_offset":0},"digit_4":{"w":236,"h":259,"baseline_offset":4},"digit_5":{"w":206,"h":259,"baseline_offset":3},"digit_6":{"w":219,"h":265,"baseline_offset":0},"digit_7":{"w":210,"h":258,"baseline_offset":4},"digit_8":{"w":229,"h":269,"baseline_offset":0},"digit_9":{"w":215,"h":253,"baseline_offset":0},"comma":{"w":106,"h":129,"baseline_offset":-1},"dot":{"w":104,"h":96,"baseline_offset":3}},"fan_red":{"x":{"w":263,"h":259,"baseline_offset":35},"digit_0":{"w":288,"h":373,"baseline_offset":0},"digit_1":{"w":212,"h":367,"baseline_offset":5},"digit_2":{"w":264,"h":365,"baseline_offset":8},"digit_3":{"w":261,"h":374,"baseline_offset":0},"digit_4":{"w":277,"h":363,"baseline_offset":9},"digit_5":{"w":292,"h":391,"baseline_offset":0},"digit_6":{"w":310,"h":395,"baseline_offset":0},"digit_7":{"w":290,"h":382,"baseline_offset":6},"digit_8":{"w":317,"h":395,"baseline_offset":0},"digit_9":{"w":306,"h":394,"baseline_offset":1}},"flower_green":{"digit_0":{"w":282,"h":374,"baseline_offset":3},"digit_1":{"w":218,"h":362,"baseline_offset":11},"digit_2":{"w":257,"h":367,"baseline_offset":12},"digit_3":{"w":255,"h":375,"baseline_offset":4},"digit_4":{"w":284,"h":364,"baseline_offset":11},"digit_5":{"w":273,"h":374,"baseline_offset":0},"digit_6":{"w":305,"h":392,"baseline_offset":1},"digit_7":{"w":292,"h":382,"baseline_offset":9},"digit_8":{"w":311,"h":394,"baseline_offset":0},"digit_9":{"w":308,"h":394,"baseline_offset":0},"dot":{"w":183,"h":185,"baseline_offset":13},"comma":{"w":149,"h":187,"baseline_offset":-24},"k":{"w":341,"h":369,"baseline_offset":6},"m":{"w":429,"h":368,"baseline_offset":7}}};
// Sheets were cut from two rows; the bottom row is ~6% taller, so it is scaled to the top row.
const GLYPH_SETS = {
  fan_red: { dir: 'assets/glyphs/fan_red/', chars: { x: 'x', '0': 'digit_0', '1': 'digit_1', '2': 'digit_2', '3': 'digit_3', '4': 'digit_4', '5': 'digit_5', '6': 'digit_6', '7': 'digit_7', '8': 'digit_8', '9': 'digit_9' }, top: ['digit_0', 'digit_1', 'digit_2', 'digit_3', 'digit_4'], bottom: ['digit_5', 'digit_6', 'digit_7', 'digit_8', 'digit_9'], track: .045 },
  // win_gold (AD review passed 2026-11-09): € amounts. Single-row sheet, QA spacing: track −0.03·H, space 0.28·H.
  win_gold: { dir: 'assets/glyphs/win_gold/', chars: { '€': 'euro', ',': 'comma', '.': 'dot', '0': 'digit_0', '1': 'digit_1', '2': 'digit_2', '3': 'digit_3', '4': 'digit_4', '5': 'digit_5', '6': 'digit_6', '7': 'digit_7', '8': 'digit_8', '9': 'digit_9' }, top: ['digit_0', 'digit_1', 'digit_2', 'digit_3', 'digit_4', 'digit_5', 'digit_6', 'digit_7', 'digit_8', 'digit_9'], bottom: [], trackH: -.03, space: .28, perGlyphFallback: true, minH: 44 },
  flower_green: { dir: 'assets/glyphs/flower_green/', chars: { '.': 'dot', ',': 'comma', 'K': 'k', 'M': 'm', '0': 'digit_0', '1': 'digit_1', '2': 'digit_2', '3': 'digit_3', '4': 'digit_4', '5': 'digit_5', '6': 'digit_6', '7': 'digit_7', '8': 'digit_8', '9': 'digit_9' }, top: ['digit_0', 'digit_1', 'digit_2', 'digit_3', 'digit_4', 'digit_5'], bottom: ['digit_6', 'digit_7', 'digit_8', 'digit_9', 'dot'], track: .05 },
};
// Flower values in euro style with the approved add-on glyphs (comma, K, M): 0,50 · 25,00 · 1,5K · 2,5M.
// compact (tile fallback when the full form would drop under 44 px): trailing zeros go (0,5 · 25 · 1,5K).
function flowerFmt(v, compact) {
  v = Number(v) || 0;
  const unit = (d, u) => { const q = Math.round(v / d * 10) / 10; return (Number.isInteger(q) ? String(q) : q.toFixed(1).replace('.', ',')) + u; };
  if (v >= 1e6) return unit(1e6, 'M'); if (v >= 1e3) return unit(1e3, 'K');
  return compact ? String(Number(v.toFixed(2))).replace('.', ',') : v.toFixed(2).replace('.', ',');
}
// Style table: change these to re-skin every value on tiles, flights, big fan, bloom and amounts.
const VALUE_STYLE = {
  fan:    { glyphs: 'fan_red', fmt: v => 'x' + v, fill: ['#fff0a8', '#f08a1c', '#c8141a'], rim: '#f6c453', out: '#3a0606' },
  rising: { glyphs: 'fan_red', fmt: v => 'x' + v, fill: ['#fff0a8', '#f08a1c', '#c8141a'], rim: '#f6c453', out: '#3a0606' },
  mult:   { glyphs: 'fan_red', fmt: v => 'x' + v, fill: ['#fff0a8', '#f08a1c', '#c8141a'], rim: '#f6c453', out: '#3a0606' },
  flower: { glyphs: 'flower_green', fmt: v => flowerFmt(v), fill: ['#b6ffb0', '#29c94a', '#0b7a26'], rim: '#f2c14e', out: '#04160a' },
  // € amounts: no gold sprite set yet (AD 2026-11-09) → heavy canvas style matched to the sprite sets:
  // white-gold core, warm gold body, thick maroon-brown outline, bronze bevel rim, round dots, soft shadow.
  money:  { glyphs: 'win_gold', heavy: true, fmt: v => window.GSSUI ? GSSUI.formatMoney(Number(v), window.FW_HUD && FW_HUD.theme) : '€' + Number(v).toFixed(2), fill: ['#fffbe6', '#ffe27a', '#f4b42e', '#b8620e'], rim: '#9a5a14', out: '#3a1608' },
};
// Per-symbol value layout, as fractions of the CELL (134×178): anchor (cx, cy) = centre of the digits,
// h = digit height, maxW = widest allowed string. plate: null | 'halo' (soft gold/dark outline glow
// behind the glyphs, for dark tile bodies) | 'dark' (soft dark backplate). Measured from
// assets/symbols/02_parts/mockups/. Re-skins should only need to touch this table.
const TILE_VALUE = {
  // Tuned 08:50 for the plain tiles (gold Flower, dark Fan, dark Rising Fan with ember rim, 08:44 art).
  // Mockup-era values (peony / fan-icon tiles): Flower cy .498 h .245 · Fan cy .287 h .255 maxW .69 · Rising cy .515 h .235 maxW .79.
  // pass 3: every on-tile value ≥ 44 px digit height (TILE_MIN_PX). If the full format would be squeezed
  // below that by maxW, the tile uses its compact form (Flower 25.00 → 25, 1.50 → 1.5); flights, bloom
  // and € amounts keep the full format.
  SYM10_flower:     { kind: 'flower', cx: .5, cy: .50, h: .30, maxW: .90, plate: null, compact: v => flowerFmt(v, true) },
  SYM11_fan:        { kind: 'fan',    cx: .5, cy: .50, h: .31, maxW: .92, plate: 'halo' },
  SYM12_rising_fan: { kind: 'rising', cx: .5, cy: .50, h: .31, maxW: .92, plate: 'halo' },
};
const TILE_MIN_PX = 44;
const PLATE = { halo: { glow: 'rgba(255,196,96,.75)', blur: .22, dark: 'rgba(0,0,0,0)' }, dark: { glow: 'rgba(0,0,0,.85)', blur: .3, dark: 'rgba(12,4,2,.45)' } };
/* ============ LAYOUT: every screen rect FX anchors to, driven by screen_E layout_E.json ============ */
// Source of truth: assets/board/layout_E.json (copy of assets/screen/02_board/layout_E.json, portrait).
// Rects there are [x0,y0,x1,y1]. Embedded copy below is used on file:// (no fetch); over http the live
// file is fetched and compared (glyphStatus().layout). Derived FX zones: fanOpen = hero Count-the-Fan
// pivot over the board; fanRise = closed fan emerging from the Wall; fanPark = Bonus/Heavenly Table Fan
// rest right of the logo, above the Wall; total = TOTAL WIN number (slam target, from game.js).
const LAYOUT_E_EMBED = {"grid":[118.0,400,962.0,1322.0],"well":[116.1,398.5,964.1,1324.7],"frame_outer":[63.0,346.4,1016.2,1374.0],"wall":[100,223,980,353],"logo":[332,16,748,211],"hud_clear":{"y_from":1498},"clearances":{"frame_bottom":1374,"total_win_box":[1390,1500],"hud_y":1528}};
const R4 = a => ({ x: a[0], y: a[1], w: a[2] - a[0], h: a[3] - a[1], x1: a[2], y1: a[3] });
function deriveLayout(P) {
  const grid = R4(P.grid), wall = Object.assign(R4(P.wall), { n: 14, layers: 2, split: 70 / 130 }), logo = R4(P.logo);
  const parkR = 112; // win pass: AD Heavenly-intro park (912,211) R112: measured bbox x794–1030, y97–221 at x200 = clear of logo (≤748) and Wall (≥223)
  return {
    grid, wall, logo, frame: R4(P.frame_outer), well: R4(P.well),
    fanOpen: { x: grid.x + grid.w / 2, y: grid.y + grid.h * .65, R: 300 },
    fanRise: { x: grid.x + grid.w / 2, y: wall.y1 - 10, R: 64 },
    fanPark: { x: 912, y: 211, R: parkR },
    counter: { x: 160, y: 136, w: 196, h: 116 }, // hands counter mirrors the park
    total: { x: 540, y: 1460 }, hudTop: 1528,
    plate: { bg: 'assets/board/screen_E_portrait_nowall.png', wall: 'assets/board/wall_portrait.png', logo: 'assets/board/logo.png' },
  };
}
const LAYOUT = deriveLayout(LAYOUT_E_EMBED);
const layoutStatus = { source: 'embedded', matches: null };
try { if (location.protocol !== 'file:' && window.fetch) fetch('assets/board/layout_E.json').then(r => r.ok ? r.json() : null).then(j => {
  if (!j || !j.portrait) return; layoutStatus.source = 'layout_E.json';
  layoutStatus.matches = ['grid', 'wall', 'logo', 'frame_outer'].every(k => JSON.stringify(j.portrait[k]) === JSON.stringify(LAYOUT_E_EMBED[k]));
  if (!layoutStatus.matches) { const L2 = deriveLayout(j.portrait); ['logo', 'fanPark', 'fanRise', 'fanOpen'].forEach(k => Object.assign(LAYOUT[k], L2[k])); } // grid/wall need a reload (game geometry)
}).catch(() => {}); } catch (e) {}
// screen_E plate art (copied into assets/board/; originals untouched). Code drawing is the fallback.
const ART = {};
Object.entries(LAYOUT.plate).forEach(([k, src]) => { const im = new Image(); im.onload = () => { ART[k] = im; }; im.onerror = () => { ART[k + 'Failed'] = true; }; im.src = src; });
const GL = {};
// ---- FX art-swap layer (assets/fx/MANIFEST.md): painted parts replace procedural drawing when present ----
// Manifest = assets/fx/manifest.json (http) or window.FW_FX_ART (embedded, for file://):
//   { parts: { <name>: { file, size:[w,h], pivot:[x,y], ref_size: <fx.js units>, blend: 'normal'|'additive' } } }
// Names used: fan_leaf_seg_{1..3}, fan_rim_seg_{1..3} (ref_size = R), bloom_petal_a (186) / bloom_petal_b (212),
// bloom_centre (80 slot; art disc r50), bloom_glow (280), shard_{1..7} + dust_puff_{1..3} (cell width 134), petal_var_{1..4} (petal len),
// fan_rib/_b, fan_guard/_b, fan_rivet_tassel (R). Missing part ⇒ procedural (current look).
const FXART = { parts: {}, source: 'none' };
function artUse(man, src) { if (!man || !man.parts) return; FXART.source = src; Object.entries(man.parts).forEach(([n, d]) => { const im = new Image(); im.onload = () => { FXART.parts[n] = Object.assign({ img: im, pivot: [im.width / 2, im.height / 2], ref_size: im.width, blend: 'normal' }, d, { img: im }); }; im.src = 'assets/fx/' + d.file; }); }
const FX_ART_EMBED = /*FX_ART_EMBED*/{"parts":{"fan_leaf_seg_1":{"file":"fan/fan_leaf_seg_1.png","pivot":[96.4,517.5],"ref_size":600,"blend":"normal"},"fan_rim_seg_1":{"file":"fan/fan_rim_seg_1.png","pivot":[94.4,615.4],"ref_size":600,"blend":"normal"},"fan_rib":{"file":"fan/fan_rib.png","pivot":[12.0,582],"ref_size":600,"blend":"normal"},"fan_guard":{"file":"fan/fan_guard.png","pivot":[27.5,600],"ref_size":600,"blend":"normal"},"fan_rivet_tassel":{"file":"fan/fan_rivet_tassel.png","pivot":[74.4,50.4],"ref_size":600,"blend":"normal"},"shard_1":{"file":"kong/shard_1.png","pivot":[36.1,45.0],"ref_size":200,"blend":"normal"},"shard_2":{"file":"kong/shard_2.png","pivot":[48.0,32.8],"ref_size":200,"blend":"normal"},"shard_3":{"file":"kong/shard_3.png","pivot":[41.7,41.7],"ref_size":200,"blend":"normal"},"shard_4":{"file":"kong/shard_4.png","pivot":[72.2,44.4],"ref_size":200,"blend":"normal"},"shard_5":{"file":"kong/shard_5.png","pivot":[35.7,38.4],"ref_size":200,"blend":"normal"},"shard_6":{"file":"kong/shard_6.png","pivot":[33.1,24.5],"ref_size":200,"blend":"normal"},"shard_7":{"file":"kong/shard_7.png","pivot":[50.8,50.4],"ref_size":200,"blend":"normal"},"dust_puff_1":{"file":"kong/dust_puff_1.png","pivot":[101.4,104.4],"ref_size":200,"blend":"additive"},"dust_puff_2":{"file":"kong/dust_puff_2.png","pivot":[124.8,89.4],"ref_size":200,"blend":"additive"},"dust_puff_3":{"file":"kong/dust_puff_3.png","pivot":[114.1,95.7],"ref_size":200,"blend":"additive"},"bloom_petal_a":{"file":"bloom/bloom_petal_a.png","pivot":[131.1,372.3],"ref_size":372.3,"blend":"normal"},"bloom_petal_b":{"file":"bloom/bloom_petal_b.png","pivot":[155.2,424.3],"ref_size":424.3,"blend":"normal"},"bloom_centre":{"file":"bloom/bloom_centre.png","pivot":[236.5,233.5],"ref_size":160,"blend":"normal"},"bloom_glow":{"file":"bloom/bloom_glow.png","pivot":[652.6,638.8],"ref_size":532,"blend":"additive"},"petal_var_1":{"file":"bloom/petal_var_1.png","pivot":[23.84,26.94],"ref_size":64,"blend":"normal"},"petal_var_2":{"file":"bloom/petal_var_2.png","pivot":[20.54,25.18],"ref_size":64,"blend":"normal"},"petal_var_3":{"file":"bloom/petal_var_3.png","pivot":[16.92,29.11],"ref_size":64,"blend":"normal"},"petal_var_4":{"file":"bloom/petal_var_4.png","pivot":[19.16,23.99],"ref_size":64,"blend":"normal"}}}/*END*/; // copy of assets/fx/manifest.json for file:// (no fetch)
if (window.FW_FX_ART) artUse(window.FW_FX_ART, 'window');
else if (location.protocol !== 'file:' && window.fetch) fetch('assets/fx/manifest.json').then(r => r.ok ? r.json() : null).then(j => j ? artUse(j, 'manifest.json') : artUse(FX_ART_EMBED, 'embedded')).catch(() => artUse(FX_ART_EMBED, 'embedded'));
else artUse(FX_ART_EMBED, 'embedded');
// draw part `n` with its pivot at the current origin, scaled so ref_size maps to `ref` runtime units; false if absent
function artDraw(g, n, ref) { const a = FXART.parts[n]; if (!a) return false; const k = ref / a.ref_size; g.save(); if (a.blend === 'additive') g.globalCompositeOperation = 'lighter'; g.drawImage(a.img, -a.pivot[0] * k, -a.pivot[1] * k, a.img.width * k, a.img.height * k); g.restore(); return true; }
const glyphStatus = { metrics: 'embedded', sets: {} };
Object.entries(GLYPH_SETS).forEach(([name, def]) => {
  const set = GL[name] = { def, metrics: METRICS_EMBED[name], img: {}, ok: {}, failed: [], loaded: 0, total: 0 };
  const names = [...new Set(Object.values(def.chars))];
  set.total = names.length;
  names.forEach(n => {
    const im = new Image();
    im.onload = () => { set.ok[n] = true; set.loaded++; };
    im.onerror = () => { set.failed.push(n); };
    im.src = def.dir + n + '.png';
    set.img[n] = im;
  });
  const avg = list => list.reduce((s, n) => s + set.metrics[n].h, 0) / list.length;
  set.refH = avg(def.top.filter(n => n.startsWith('digit')));
  set.rowScale = def.bottom.length ? set.refH / avg(def.bottom.filter(n => n.startsWith('digit'))) : 1;
  try {
    if (location.protocol !== 'file:' && window.fetch) fetch(def.dir + 'metrics.json').then(r => r.ok ? r.json() : null).then(j => {
      if (j) { set.metrics = j; set.refH = avg(def.top.filter(n => n.startsWith('digit'))); set.rowScale = def.bottom.length ? set.refH / avg(def.bottom.filter(n => n.startsWith('digit'))) : 1; glyphStatus.metrics = 'metrics.json'; stripCache.clear(); }
    }).catch(() => {});
  } catch (e) { /* embedded metrics stay */ }
});
const stripCache = new Map(), ttCache = new Map();
// ---- AA2 pass: multiplier glyph colour bands (x2-5 / x7-15 / x25-100). Band sets load only when listed in aa2_art.js
// (window.FW_AA2_ART.glyphBands = { b1: 'dir/', ... }, same char names + metrics as fan_red). Missing -> fan_red.
// ?bandtest=1 tints the fan_red strips per band (hue shift) so the hook can be checked before the art lands.
const BAND_KINDS = { fan: 1, rising: 1, mult: 1 }, BANDS = (window.FW_CONFIG && FW_CONFIG.MULT_BANDS) || [];
const BAND_TEST = /[?&]bandtest=1/.test(location.search), BAND_TINT = { b1: 'hue-rotate(200deg) saturate(1.1)', b2: 'hue-rotate(95deg)', b3: null };
(() => { const A = window.FW_AA2_ART, bands = (A && A.glyphBands) || {};
  Object.entries(bands).forEach(([id, spec]) => { const dir = typeof spec === 'string' ? spec : spec.dir, name = 'band_' + id, def = Object.assign({}, GLYPH_SETS.fan_red, { dir });
    const set = GL[name] = { def, metrics: (spec && spec.metrics) || METRICS_EMBED.fan_red, img: {}, ok: {}, failed: [], loaded: 0, total: 0 };
    const names = [...new Set(Object.values(def.chars))]; set.total = names.length;
    const avg = list => list.reduce((s, n) => s + set.metrics[n].h, 0) / list.length;
    set.refH = avg(def.top.filter(n => n.startsWith('digit'))); set.rowScale = set.refH / avg(def.bottom.filter(n => n.startsWith('digit')));
    names.forEach(n => { const im = new Image(); im.onload = () => { set.ok[n] = true; set.loaded++; stripCache.clear(); ttCache.clear(); }; im.onerror = () => set.failed.push(n); im.src = dir + n + '.png'; set.img[n] = im; });
    if (location.protocol !== 'file:' && window.fetch) fetch(dir + 'metrics.json').then(r => r.ok ? r.json() : null).then(j => { if (j) { set.metrics = j; set.refH = avg(def.top.filter(n => n.startsWith('digit'))); set.rowScale = set.refH / avg(def.bottom.filter(n => n.startsWith('digit'))); stripCache.clear(); ttCache.clear(); } }).catch(() => {});
  }); })();
function bandOf(text) { const n = parseFloat(String(text).replace(/[^0-9.]/g, '')); if (!(n > 0)) return null; const b = BANDS.find(b => n <= b.max); return b ? b.id : null; }
function bandSet(kind, text) { if (!BAND_KINDS[kind]) return null; const id = bandOf(text); if (!id) return null; const set = GL['band_' + id]; return set && glyphReady(set, text) ? { id, set, name: 'band_' + id } : { id, set: null }; }
const isGap = ch => ch === ' ' || ch === '\u00a0' || ch === '\u202f';
function glyphReady(set, text) { return [...text].every(ch => { if (isGap(ch)) return true; const n = set.def.chars[ch]; return n && (set.ok[n] || set.def.perGlyphFallback); }) && [...text].some(ch => set.ok[set.def.chars[ch]]); }
function renderHeavy(st, text, h) {
  const fs = h * 1.34, font = `900 ${fs}px "Arial Black","Arial Bold",Arial,sans-serif`, pad = Math.ceil(h * .34) + 6;
  const m = document.createElement('canvas').getContext('2d'); m.font = font;
  const track = h * .035, items = []; let x = 0;
  for (const ch of text) { const dot = ch === '.' || ch === ','; const w = dot ? h * .44 : m.measureText(ch).width; items.push({ ch, x, w, dot }); x += w + track; }
  const W = x - track;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W + pad * 2); cv.height = Math.ceil(h + pad * 2);
  const c = cv.getContext('2d'), base = pad + h;
  const shape = (ctx, mode) => { ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
   for (const it of items) { const ox = pad + it.x;
    if (it.dot) { const r = h * .145, cx = ox + it.w / 2, cy = base - r * 1.02; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
     if (it.ch === ',') { ctx.moveTo(cx + r * .95, cy + r * .2); ctx.quadraticCurveTo(cx + r * .8, cy + r * 2.3, cx - r * .9, cy + r * 2.6); ctx.quadraticCurveTo(cx + r * .1, cy + r * 1.5, cx - r * .2, cy + r * .9); }
     mode === 'fill' ? ctx.fill() : ctx.stroke(); }
    else if (it.ch.trim()) { mode === 'fill' ? ctx.fillText(it.ch, ox, base) : ctx.strokeText(it.ch, ox, base); } } };
  // soft drop shadow + thick dark outline
  c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = h * .16; c.shadowOffsetY = h * .07; c.strokeStyle = st.out; c.fillStyle = st.out; c.lineWidth = h * .32; shape(c, 'stroke'); shape(c, 'fill'); c.restore();
  // bronze bevel rim
  c.strokeStyle = st.rim; c.lineWidth = h * .12; shape(c, 'stroke');
  // gold body + white-gold core + top highlight, composed on a separate layer so the outline stays clean
  const f = document.createElement('canvas'); f.width = cv.width; f.height = cv.height; const fc = f.getContext('2d');
  const gr = fc.createLinearGradient(0, pad - h * .05, 0, base + h * .05); gr.addColorStop(0, st.fill[0]); gr.addColorStop(.38, st.fill[1]); gr.addColorStop(.66, st.fill[2]); gr.addColorStop(1, st.fill[3]);
  fc.fillStyle = gr; shape(fc, 'fill');
  fc.globalCompositeOperation = 'source-atop';
  const hl = fc.createLinearGradient(0, pad, 0, pad + h * .48); hl.addColorStop(0, 'rgba(255,255,255,.75)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); fc.fillStyle = hl; fc.fillRect(0, pad - h * .1, f.width, h * .55);
  const lo = fc.createLinearGradient(0, base - h * .22, 0, base + h * .05); lo.addColorStop(0, 'rgba(120,50,0,0)'); lo.addColorStop(1, 'rgba(120,50,0,.45)'); fc.fillStyle = lo; fc.fillRect(0, base - h * .25, f.width, h * .35);
  c.drawImage(f, 0, 0);
  return { cv, w: cv.width, h: cv.height, ax: cv.width / 2, ay: pad + h / 2, glyph: false, pad };
}
function renderStrip(kind, text, h) {
  const bs = bandSet(kind, text); // AA2 band hook: band glyph set when loaded, else fan_red (optionally tinted for ?bandtest=1)
  const st = VALUE_STYLE[kind], set = (bs && bs.set) || (st.glyphs && GL[st.glyphs]);
  const useG = !!(set && glyphReady(set, text)), tint = bs && !bs.set && BAND_TEST ? BAND_TINT[bs.id] : null;
  const key = kind + '|' + text + '|' + Math.round(h) + '|' + (useG ? 'g' : 'f') + '|' + (bs ? (bs.set ? bs.name : 'red' + (tint ? ':' + bs.id : '')) : '');
  let s = stripCache.get(key); if (s) return s;
  if (tint) { const base = renderStripPlain(kind, text, h, set, useG, st); const cv = document.createElement('canvas'); cv.width = base.cv.width; cv.height = base.cv.height; const c = cv.getContext('2d'); c.filter = tint; c.drawImage(base.cv, 0, 0); s = Object.assign({}, base, { cv }); stripCache.set(key, s); return s; }
  s = renderStripPlain(kind, text, h, set, useG, st); if (stripCache.size > 260) stripCache.delete(stripCache.keys().next().value); stripCache.set(key, s); return s;
}
function renderStripPlain(kind, text, h, set, useG, st) { let s;
  if (st.heavy && !useG) { if (set) glyphStatus.fallbackUsed = (glyphStatus.fallbackUsed || 0) + 1; return renderHeavy(st, text, h); }
  const pad = Math.ceil(h * .25) + 4;
  const cv = document.createElement('canvas'), c = cv.getContext('2d');
  if (useG) {
    const sc = h / set.refH, items = []; let x = 0; const tH = set.def.trackH !== undefined ? set.def.trackH * h : null;
    [...text].forEach((ch, i) => {
      if (isGap(ch)) { x += (set.def.space || .28) * h; return; }
      const n = set.def.chars[ch], m = set.metrics[n], rs = set.def.bottom.includes(n) ? set.rowScale : 1;
      const gw = m.w * sc * rs, gh = m.h * sc * rs, off = m.baseline_offset * sc * rs;
      if (!set.ok[n]) { // per-glyph fallback: this one character in the heavy canvas gold style
        const fb = renderHeavy(st, ch, h); glyphStatus.fallbackGlyphs = (glyphStatus.fallbackGlyphs || 0) + 1;
        const fw = fb.w - fb.pad * 2; items.push({ fb, x, gw: fw, gh: h, off: 0 }); x += tH !== null ? fw + tH : fw * (1 - set.def.track); return; }
      items.push({ n, x, gw, gh, off }); x += tH !== null ? gw + tH : gw * (1 - set.def.track);
    });
    const last = items[items.length - 1], W = tH !== null ? x - tH : x + last.gw * set.def.track;
    cv.width = Math.ceil(W + pad * 2); cv.height = Math.ceil(h + pad * 2);
    const base = pad + h;
    items.forEach(it => it.fb ? c.drawImage(it.fb.cv, pad + it.x - it.fb.pad, base - h - it.fb.pad) : c.drawImage(set.img[it.n], pad + it.x, base - it.off - it.gh, it.gw, it.gh));
    s = { cv, w: cv.width, h: cv.height, ax: cv.width / 2, ay: pad + h / 2, glyph: true };
  } else {
    if (set) glyphStatus.fallbackUsed = (glyphStatus.fallbackUsed || 0) + 1;
    const fs = h * 1.22, font = `900 ${fs}px "Arial Black","Arial Bold",Arial,sans-serif`;
    c.font = font; const tw = c.measureText(text).width;
    cv.width = Math.ceil(tw + pad * 2 + h * .3); cv.height = Math.ceil(h + pad * 2);
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    const bx = cv.width / 2, by = pad + h;
    c.lineWidth = h * .24; c.strokeStyle = st.out; c.strokeText(text, bx, by);
    if (st.rim) { c.lineWidth = h * .1; c.strokeStyle = st.rim; c.strokeText(text, bx, by); }
    const gr = c.createLinearGradient(0, pad, 0, pad + h); gr.addColorStop(0, st.fill[0]); gr.addColorStop(.5, st.fill[1]); gr.addColorStop(1, st.fill[2]);
    c.fillStyle = gr; c.fillText(text, bx, by);
    s = { cv, w: cv.width, h: cv.height, ax: cv.width / 2, ay: pad + h / 2, glyph: false };
  }
  return s;
}
// The single value-draw path. (x,y) = visual centre of the digits; h = digit height in px.
function drawValueOn(g, kind, value, x, y, h, o = {}) {
  const st = VALUE_STYLE[kind]; const text = typeof value === 'string' ? value : st.fmt(value); if (!text) return 0;
  const minH = st.glyphs && GLYPH_SETS[st.glyphs].minH; if (minH && h * (o.scale || 1) < minH) o = Object.assign({}, o, { scale: minH / h }); // € never below 44 px
  const s = renderStrip(kind, text, Math.max(8, Math.min(220, h)));
  const realH = Math.max(8, Math.min(220, h));
  let k = (o.scale || 1) * h / realH;
  const contentW = s.w - 2 * (s.pad ?? (Math.ceil(realH * .25) + 4));
  if (o.maxW && contentW * k > o.maxW) k = o.maxW / contentW;
  drawValueOn.lastH = realH * k; // effective digit height drawn
  g.save(); if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  g.translate(x, y); if (o.rot) g.rotate(o.rot);
  const pl = o.plate && PLATE[o.plate];
  if (pl) { const W = contentW * k, H = h * (o.scale || 1);
   if (o.plate === 'dark') { const dg = g.createRadialGradient(0, 0, 2, 0, 0, Math.max(W, H) * .7); dg.addColorStop(0, pl.dark); dg.addColorStop(1, 'rgba(12,4,2,0)'); g.fillStyle = dg; g.fillRect(-W, -H, W * 2, H * 2); }
   g.shadowColor = pl.glow; g.shadowBlur = H * pl.blur; }
  g.drawImage(s.cv, -s.ax * k, -s.ay * k, s.w * k, s.h * k);
  g.restore();
  return contentW * k;
}

// Which string a tile shows, and at what digit height, for a cell of w×h px (any orientation).
function tileText(L, val, w, h) {
  const st = VALUE_STYLE[L.kind], hh = Math.max(TILE_MIN_PX, h * L.h), maxW = w * L.maxW;
  const fit = text => { const s = renderStrip(L.kind, text, Math.min(220, hh)); const cw = s.w - 2 * (s.pad ?? (Math.ceil(Math.min(220, hh) * .25) + 4)); const mw = /[KM]$/.test(text) ? w * .97 : maxW; return Math.min(hh, hh * mw / Math.max(1, cw)); }; // K/M suffix forms may use 97% of the plain Flower face
  const full = st.fmt(val); let text = full, px = fit(full);
  if (px < TILE_MIN_PX && L.compact) { const c = L.compact(val), pc = fit(c); if (pc > px) { text = c; px = pc; } }
  return { text, px: Math.round(px * 10) / 10, hh, maxW };
}
// win pass: gate the first render on glyph + plate decode (short timeout), so nothing draws its canvas fallback on load.
function whenReady(ms = 700) { const t0 = Date.now(); return new Promise(res => { (function poll() {
  const sets = Object.values(GL).every(st => st.loaded + st.failed.length >= st.total), plate = ART.bg || ART.bgFailed;
  if ((sets && plate) || Date.now() - t0 > ms) res({ ready: sets && !!plate, waitedMs: Date.now() - t0 }); else (window.requestAnimationFrame || setTimeout)(poll, 16); })(); }); }
window.FW_FX = { LAYOUT, whenReady, measureTileValue: (id, val, w, h) => TILE_VALUE[id] ? tileText(TILE_VALUE[id], val, w, h) : null, glyphStatus: () => ({ metrics: glyphStatus.metrics, fallbackStrips: glyphStatus.fallbackUsed || 0, fallbackGlyphs: glyphStatus.fallbackGlyphs || 0, layout: Object.assign({}, layoutStatus), plate: Object.fromEntries(Object.keys(LAYOUT.plate).map(k => [k, !!ART[k]])),
  sets: Object.fromEntries(Object.entries(GL).map(([n, s]) => [n, { loaded: s.loaded, total: s.total, failed: s.failed.slice() }])) }),
create(g, S, C, position, GEO) {
 GEO = GEO || {};
 const GX = GEO.GX ?? 118, GY = GEO.GY ?? 300, GW = GEO.GW ?? 844, GH = GEO.GH ?? 922;
 const PITCH_X = C.CELL_W + C.GAP, PITCH_Y = C.CELL_H + C.GAP;
 const cellX = c => GX + c * PITCH_X, cellY = r => GY + r * PITCH_Y;
 const TOTAL = GEO.TOTAL || { x: 540, y: 292, box: [270, 232, 540, 96] }; const MULT = GEO.MULT || { x: 911, y: 280, box: [826, 232, 170, 96] };
 const totalHit = () => { if (window.FW_HUD && FW_HUD.bumpTotal) FW_HUD.bumpTotal(); }; // bar TOTAL still mirrors the amount
 // ring sized to a mid-table glass pill (TOTAL WIN box or multiplier badge)
 function boxRing(B, o = {}) { const box = B && B.box; if (!box) { ring((B || TOTAL).x, (B || TOTAL).y, o.r || 120, o); return; }
  const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2, rx = box[2] / 2 - 6, ry = box[3] / 2 - 6;
  ring(cx, cy, rx, Object.assign({}, o, { flat: Math.max(.05, ry / rx) })); }
 let uid = 0, time = performance.now(), last = time, dt = 16, glints = 0, valueGlints = 0;
 const state = { particles: [], flights: [], count: null, presses: {}, journal: [], shake: null, shards: [], inks: [], amounts: [],
   rays: [], slam: null, stamp: null, bloom: null, timeline: [], step: 0, hand: 0, hu: 0, heaven: 0, tension: null, ack: null,
   veil: 0, veilTarget: 0, focus: null, winHoldUntil: 0, winFast: 0, lastCentroid: null, dealSched: null };
 const mark = (type, extra = {}) => { state.journal.push({ type, t: performance.now(), ...extra }); if (state.journal.length > 400) state.journal.shift(); };
 const later = (ms, fn) => state.timeline.push({ at: performance.now() + ms, fn });
 const speed = () => Math.max(.62, 1 - .14 * state.step); // repeat cascade steps tighten progressively
 const rank = t => Math.max(0, Number(t.id.slice(3, 5)) - 5);
 const isHU = t => t.id === 'SYM13_hu', isHeaven = t => t.id === 'SYM14_heavenly', isFan = t => t.id === 'SYM11_fan' || t.id === 'SYM12_rising_fan';
 function locate(t) { for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) if (S.grid[c]?.[r] === t) return { c, r, x: cellX(c) + C.CELL_W / 2, y: cellY(r) + (t.y || 0) + C.CELL_H / 2 }; const p = position(t); return p ? { x: p.x, y: p.y } : null; }
 function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
 function ring(x, y, r = 70, o = {}) { state.particles.push({ ring: true, x, y, r, t: performance.now() + (o.delay || 0), dur: o.dur || F(12), col: o.col || '#ffe5a2', w: o.w || 3, flat: o.flat ?? .55 }); }
 // D2c: landing ring on the bar TOTAL, sized from the kit bar rect so it stays inside the bar and right of the menu hit zone (kit: 110 px)
 function barRing(o = {}) { const L = window.FW_HUD && FW_HUD.layout, b = L && L.bar; if (!b) { ring(TOTAL.x, TOTAL.y, o.r || 120, o); return; }
  const k = L.k || 1, rx = Math.max(20, Math.min(TOTAL.x - (b.x + 110 * k), b.x + b.w - 110 * k - TOTAL.x) - 4 * k), ry = Math.min(TOTAL.y - b.y, b.y + b.h - TOTAL.y) - 3 * k - (o.w || 3) / 2;
  ring(TOTAL.x, TOTAL.y, rx - 12, Object.assign({}, o, { flat: Math.max(.05, ry / rx) })); }
 function burst(x, y, n, o = {}) { for (let i = 0; i < n && state.particles.filter(p => !p.ring).length < 28; i++) { const a = hash(i + uid * 3.1, o.salt || 5) * Math.PI * 2, sp = (o.speed || 120) * (.6 + .6 * hash(i, 9 + uid)); state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 40), t: performance.now(), dur: o.dur || F(16), size: (o.size || 10) * (.7 + .5 * hash(i, 4)), col: o.col || '#ffe5a2' }); } uid++; }
 function accent(t, peak = 1.1, frames = 10) { t.fxAccent = { t: performance.now(), peak, dur: F(frames) }; }
 function drawStar(x, y, size) { g.beginPath(); g.moveTo(x - size, y); g.lineTo(x, y - size * .45); g.lineTo(x + size, y); g.lineTo(x, y + size * .45); g.closePath(); g.fill(); }
 const drawValue = (kind, v, x, y, h, o) => drawValueOn(g, kind, v, x, y, h, o);

 /* ---------- the Wall: one drawing function + LAYOUT.wall (screen_E wall.png swaps in) ---------- */
 const WL = LAYOUT.wall, WALL_N = WL.n, WALL_P = WL.w / WALL_N, WALL_PW = WALL_P - 2, WALL_SPLIT = WL.h * WL.split, WALL_LH = WALL_SPLIT - 4;
 // layer 1 = bottom row, 2 = top row. Rows inside the plate's Wall rect: top 0..split, bottom split..h.
 const wallLayerY = layer => layer === 2 ? WL.y : WL.y + WALL_SPLIT;
 const wallLayerH = layer => layer === 2 ? WALL_SPLIT : WL.h - WALL_SPLIT;
 const wall = { stacks: [], wave: -1e9, nextId: 0, feeds: [] };
 const wallTx = i => WL.x + (i + .5) * WALL_P;
 for (let i = 0; i < WALL_N; i++) wall.stacks.push({ id: wall.nextId++, art: i, x: wallTx(i), from: wallTx(i), to: wallTx(i), t: 0, layers: WL.layers, reserved: 0, pickAt: [] });
 // One face-down tile as seen from the front: glossy deep jade back over a cream ivory edge (sandwich).
 function wallPiece(x, y, w, h, a = 1, shine = 0) {
  g.save(); g.globalAlpha *= a;
  g.fillStyle = 'rgba(0,0,0,.32)'; rr(x - w / 2 + 1.5, y + 2.5, w, h, 6); g.fill();
  rr(x - w / 2, y, w, h, 6); g.save(); g.clip();
  const ey = y + h * .66;
  const iv = g.createLinearGradient(0, ey, 0, y + h); iv.addColorStop(0, '#f7eed6'); iv.addColorStop(.5, '#efe3c4'); iv.addColorStop(1, '#cdbb92');
  g.fillStyle = iv; g.fillRect(x - w / 2, ey, w, h - (ey - y));
  const jd = g.createLinearGradient(0, y, 0, ey); jd.addColorStop(0, '#1a8a6a'); jd.addColorStop(.18, '#0e6b52'); jd.addColorStop(1, '#0a4f3d');
  g.fillStyle = jd; rr(x - w / 2, y - 6, w, ey - y + 6, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,.38)'; rr(x - w / 2 + 4, y + 2, w - 8, 3, 1.5); g.fill();
  const sh = g.createLinearGradient(0, y, 0, ey); sh.addColorStop(0, 'rgba(255,255,255,.14)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(x - w / 2, y, w, ey - y);
  g.fillStyle = 'rgba(0,30,20,.35)'; g.fillRect(x - w / 2, ey - 1.2, w, 1.2);
  if (shine) { g.fillStyle = `rgba(255,250,220,${shine})`; g.fillRect(x - w / 2, y, w, h); }
  g.restore(); g.strokeStyle = 'rgba(0,20,12,.55)'; g.lineWidth = 1; rr(x - w / 2, y, w, h, 6); g.stroke();
  g.restore();
 }
 // Full-size tile back (feeder in flight before the flip)
 function tileBack(x, y, w, h) {
  rr(x, y, w, h, 14); g.save(); g.clip();
  const jd = g.createLinearGradient(x, y, x, y + h); jd.addColorStop(0, '#1a8a6a'); jd.addColorStop(.3, '#0e6b52'); jd.addColorStop(1, '#0a4f3d'); g.fillStyle = jd; g.fillRect(x, y, w, h);
  g.fillStyle = '#efe3c4'; g.fillRect(x, y + h - h * .07, w, h * .07);
  g.fillStyle = 'rgba(255,255,255,.3)'; rr(x + 8, y + 5, w - 16, 6, 3); g.fill(); g.restore();
  g.strokeStyle = 'rgba(0,20,12,.6)'; g.lineWidth = 1.5; rr(x, y, w, h, 14); g.stroke();
 }
 function drawWall() {
  const n = time;
  const plate = ART.wall; // wall_portrait.png: full-canvas layer; sliced per stack × layer so pieces can leave
  g.save(); g.beginPath(); g.rect(WL.x - 8, WL.y - 30, WL.w + 16, WL.h + 40); g.clip();
  const shineX = ((n / 5200) % 1.6) * (WL.w + 300) - 150 + WL.x;
  for (const s of wall.stacks) {
   const q = clamp((n - s.t) / F(10)); s.x = lerp(s.from, s.to, eIO(q));
   const edge = Math.min(clamp((WL.x + WL.w + 6 - s.x) / 30), clamp((s.x - WL.x + 6) / 30));
   const wave = Math.max(0, Math.sin(clamp((n - wall.wave - (s.x - WL.x) * 1.1) / F(8)) * Math.PI)) * 4;
   const vis = s.layers - s.pickAt.filter(a => n >= a).length;
   const shine = clamp(1 - Math.abs(s.x - shineX) / 50) * .22;
   for (let L = 1; L <= vis; L++) {
    const yy = wallLayerY(L) - wave * (L === 1 ? .5 : 1);
    if (plate) { const sx = WL.x + s.art * WALL_P, sy = wallLayerY(L), sh = wallLayerH(L) + (L === 1 ? 0 : 2);
     g.save(); g.globalAlpha *= edge; g.drawImage(plate, sx, sy, WALL_P, sh, s.x - WALL_P / 2, yy, WALL_P, sh);
     if (shine) { g.globalCompositeOperation = 'lighter'; g.globalAlpha *= shine * .6; g.drawImage(plate, sx, sy, WALL_P, sh, s.x - WALL_P / 2, yy, WALL_P, sh); } g.restore(); }
    else wallPiece(s.x, yy, WALL_PW, WALL_LH + 2, edge, shine);
   }
  }
  g.restore();
 }
 // pick one piece for one refill tile: nearest stack to the column, top layer first
 function wallTake(cx, at) {
  const cands = wall.stacks.slice().sort((a, b) => Math.abs(a.to - cx) - Math.abs(b.to - cx));
  for (const s of cands) if (s.layers - s.reserved > 0) { const layer = s.layers - s.reserved; s.reserved++; s.pickAt.push(at); return { x: s.to, y: wallLayerY(layer) + wallLayerH(layer) / 2 }; }
  return { x: cx, y: WL.y + WL.h / 2 };
 }
 function wallAdvance(at) {
  later(at - performance.now(), () => {
   const keep = wall.stacks.filter(s => s.layers - s.reserved > 0);
   keep.forEach(s => { s.layers -= s.reserved; s.reserved = 0; s.pickAt = []; });
   const add = WALL_N - keep.length;
   for (let k = 0; k < add; k++) keep.push({ id: wall.nextId++, art: (wall.nextId * 5) % WALL_N, x: WL.x + WL.w + 40 + k * WALL_P, from: WL.x + WL.w + 40 + k * WALL_P, to: 0, t: 0, layers: WL.layers, reserved: 0, pickAt: [] });
   keep.forEach((s, i) => { s.from = s.x; s.to = wallTx(i); s.t = time + (s.from > WL.x + WL.w ? F(4 + (s.from - WL.x - WL.w) / WALL_P) : 0); });
   wall.stacks = keep; mark('wall-restock', { added: add });
  });
 }
 // Feeders: new tiles drop in from above the reels as a clean cascade, clipped to the frame (no flying-from-wall).
 // Phase 1 (before the well clip): draw the tile only inside the frame lip. Phase 2: same split as before across the well clip.
 function drawFeeds() {
  const n = time, clipTop = GY - 20, frameTop = (LAYOUT.frame && LAYOUT.frame.y) || 346.4, frameX = (LAYOUT.frame && LAYOUT.frame.x) || 63, frameW = (LAYOUT.frame && LAYOUT.frame.w) || 953;
  wall.feeds = wall.feeds.filter(f => !f.done); state.feedLift = null; // debug probe for captures (no logic)
  for (const f of wall.feeds) {
   if (n < f.depart) continue;
   const ty = cellY(f.r) + (f.t.y || 0);
   if (!f.t.fxDraw) continue;
   if (n < f.enter) {
    // still above the well clip: show only the part that has crossed the frame lip
    if (ty + C.CELL_H <= frameTop) continue;
    g.save(); g.beginPath(); g.rect(frameX, frameTop, frameW, Math.max(0, clipTop - frameTop)); g.clip();
    f.t.fxDraw(cellX(f.c), ty, C.CELL_W, C.CELL_H); f.t.fxFeedDraw = true; tileValue(f.t, cellX(f.c), ty, C.CELL_W, C.CELL_H); f.t.fxFeedDraw = false; g.restore();
    continue;
   }
   if (ty >= clipTop || S.grid[f.c]?.[f.r] !== f.t) { f.done = true; continue; }
   const y0 = Math.max(ty - 10, frameTop);
   g.save(); g.beginPath(); g.rect(cellX(f.c) - 10, y0, C.CELL_W + 20, clipTop - y0 + 10); g.clip();
   f.t.fxDraw(cellX(f.c), ty, C.CELL_W, C.CELL_H); f.t.fxSplit = true; tileValue(f.t, cellX(f.c), ty, C.CELL_W, C.CELL_H); f.t.fxSplit = false; g.restore(); // same value, split by the board clip: booked once
  }
 }

 /* ---------- big paper fan / Table Fan ---------- */
 const FO = LAYOUT.fanOpen, FR = LAYOUT.fanRise, FP = LAYOUT.fanPark;
 const FAN = { px: FR.x, py: FR.y, R: FR.R, tx: FR.x, ty: FR.y, Rt: FR.R, open: 0, openT: 0, alpha: 0, alphaT: 0, flick: -1e9, pop: -1e9, label: null, hero: 0 };
 const FAN_SEG = 14, FAN_SPAN = 152 * DEG;
 const fanRibs = v => Math.round(2 + 12 * clamp(Math.log(Math.max(1e-9, v)) / Math.log(200))); // AD/Lead rule (layout_outro.json ribs_rule): x1=2 … x200+=14
const fanOpenFor = v => fanRibs(v) / FAN_SEG; // open fraction = ribs/14 (visual only)
 const fanLabel = () => ({ x: FAN.tx, y: FAN.ty - FAN.Rt * .6 });
 let paperPat = null;
 function paper() { // procedural paper fibre, rendered once into an offscreen pattern
  if (paperPat) return paperPat;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(120,86,40,${.07 + .1 * hash(i, 41)})`; c.fillRect(hash(i, 42) * 256, hash(i, 43) * 256, 1 + hash(i, 44) * 1.5, 1 + hash(i, 45) * 1.5); }
  c.lineCap = 'round';
  for (let i = 0; i < 520; i++) { const x = hash(i, 51) * 256, y = hash(i, 52) * 256, a = hash(i, 53) * 6.283, L = 5 + 20 * hash(i, 54);
   c.strokeStyle = `rgba(${hash(i, 55) > .5 ? '130,95,50' : '255,255,255'},${.1 + .14 * hash(i, 56)})`; c.lineWidth = .6 + hash(i, 57);
   c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .6) * L * .5, y + Math.sin(a + .6) * L * .5, x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke(); }
  paperPat = g.createPattern(cv, 'repeat'); return paperPat;
 }
 function fanDisplay() {
  if (state.count && state.count.kind === 'fan') return state.count.running;
  return S.mode !== 'base' ? (state.fanPending ? state.oldTableFan : S.tableFan) : FAN.label;
 }
 function drawBigFan() {
  const k = 1 - Math.pow(.002, dt / F(9)), ko = 1 - Math.pow(.004, dt / F(8));
  FAN.R += (FAN.Rt - FAN.R) * k; FAN.px += (FAN.tx - FAN.px) * k; FAN.py += (FAN.ty - FAN.py) * k;
  FAN.alpha += (FAN.alphaT - FAN.alpha) * k; FAN.open += (FAN.openT - FAN.open) * ko;
  if (FAN.alpha < .01 || state.hideFan) return; // hideFan: shared/win outro owns the Table Fan (signature beat)
  const fq = (time - FAN.flick) / F(7), flick = fq >= 0 && fq < 1 ? Math.sin(fq * Math.PI * 2) * (1 - fq) : 0;
  const breathe = S.mode !== 'base' && !state.count ? Math.sin(time / 1300) * .012 : 0;
  const R = FAN.R * (1 + breathe + Math.max(0, flick) * .06), open = clamp(FAN.open * (1 - flick * .16)), rot = flick * 7 * DEG + Math.sin(time / 2100) * .6 * DEG;
  const v0 = fanDisplay(), v = S.mode !== 'base' && !(v0 > 0) ? 'x' : v0, pq = (time - FAN.pop) / F(8), pop = pq >= 0 && pq < 1 ? eOut(1 - pq) * .32 : 0;
  const charge = state.count && state.count.charge ? clamp((time - state.count.charge) / F(6)) * .18 : 0;
  paintFan({ px: FAN.px, py: FAN.py, R, open, rot, alpha: FAN.alpha, hero: FAN.hero, value: v, vscale: 1 + pop + charge });
 }
 // Stateless fan painter (board fan, Table Fan park, and the shared/win intro / outro signature beat).
 // o = { px, py, R, open 0..1, rot, alpha, hero 0..1, value, vscale, valueH }
 function paintFan(o) {
  const px = o.px, py = o.py, R = o.R, open = clamp(o.open), rot = o.rot || 0, alpha = o.alpha ?? 1, hero = o.hero || 0;
  g.save(); g.globalAlpha = alpha;
  // lamp glow behind the fan, plus a soft shadow pool on the board under the hero fan
  const glow = g.createRadialGradient(px, py - R * .55, 10, px, py - R * .55, R * 1.25); glow.addColorStop(0, `rgba(255,214,120,${.22 + hero * .22})`); glow.addColorStop(1, 'rgba(255,214,120,0)');
  g.fillStyle = glow; g.fillRect(px - R * 1.4, py - R * 1.8, R * 2.8, R * 2);
  // perspective: the fan tips up from the table as it unfolds (foreshortened + sheared while closed)
  g.translate(px, py); g.transform(1, 0, (1 - open) * .22, .68 + .32 * open, 0, 0);
  const s = Math.max(.6, open * FAN_SEG), span = s * FAN_SPAN / FAN_SEG, a0 = -Math.PI / 2 - span / 2 + rot;
  const ang = i => a0 + Math.min(i, s) * FAN_SPAN / FAN_SEG, r0 = R * .33, rb = R * .84;
  const P = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  const contrast = .1 + .3 * (1 - open), sag = R * (.045 * (1 - open) + .018);
  // drop shadow
  g.save(); g.translate(6, 10); g.fillStyle = 'rgba(8,16,10,.38)'; g.beginPath(); g.arc(0, 0, R + 4, ang(0) - .02, ang(FAN_SEG) + .02); g.arc(0, 0, r0, ang(FAN_SEG) + .02, ang(0) - .02, true); g.closePath(); g.fill(); g.restore();
  // bare inner sticks
  if (FXART.parts.fan_rib) for (let i = 1; i < FAN_SEG; i++) { g.save(); g.rotate(ang(i) + Math.PI / 2); artDraw(g, 'fan_rib', R); g.restore(); } // art-swap: 13 inner ribs
  else for (let i = 0; i <= FAN_SEG; i++) { const a = ang(i), e = P(a, r0 * 1.05); g.strokeStyle = i % 2 ? '#4a2412' : '#5e3018'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(e[0], e[1]); g.stroke(); }
  // pleated leaf: each pleat = two faces (mountain / valley), lit and shaded, zig-zag rim
  const quad = (a, b, c, d) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); };
  g.save(); g.beginPath(); g.arc(0, 0, R + 2, ang(0) - .01, ang(FAN_SEG) + .01); g.arc(0, 0, r0, ang(FAN_SEG) + .01, ang(0) - .01, true); g.closePath(); g.clip();
  for (let i = 0; i < FAN_SEG; i++) {
   const A = ang(i), B = ang(i + 1); if (B - A < .002) continue; const M = (A + B) / 2;
   const vN = 1; if (FXART.parts['fan_leaf_seg_' + vN]) { g.save(); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * 1.08, A - .0044, B + .0044); g.closePath(); g.clip(); g.rotate(M + Math.PI / 2); artDraw(g, 'fan_leaf_seg_' + vN, R); artDraw(g, 'fan_rim_seg_' + vN, R); g.restore(); continue; } // art-swap (masked to its wedge ±0.25° overlap)
   for (let f = 0; f < 2; f++) {
    const a1 = f ? M : A, a2 = f ? B : M, ro1 = f ? R - sag : R, ro2 = f ? R : R - sag, rb1 = f ? rb - sag * .8 : rb, rb2 = f ? rb : rb - sag * .8;
    const pg = g.createLinearGradient(...P((a1 + a2) / 2, r0), ...P((a1 + a2) / 2, rb)); pg.addColorStop(0, '#e6d2a6'); pg.addColorStop(1, '#fbf0d6');
    g.fillStyle = pg; quad(P(a1, r0), P(a1, rb1), P(a2, rb2), P(a2, r0)); g.fill();
    g.fillStyle = '#b8141c'; quad(P(a1, rb1), P(a1, ro1), P(a2, ro2), P(a2, rb2)); g.fill();
    g.fillStyle = f ? `rgba(70,30,6,${contrast})` : `rgba(255,252,240,${contrast * .7})`; quad(P(a1, r0), P(a1, ro1), P(a2, ro2), P(a2, r0)); g.fill();
   }
   g.strokeStyle = 'rgba(178,34,42,.3)'; g.lineWidth = 2; const rm = lerp(r0, rb, .42 + .22 * hash(i, 3)); g.beginPath(); g.arc(0, 0, rm, A + (B - A) * .15, B - (B - A) * .2); g.stroke();
  }
  // paper fibre (cached pattern) multiplied over the whole leaf
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = alpha * .85; g.fillStyle = paper(); g.fillRect(-R - 10, -R - 10, R * 2 + 20, R + 20);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha;
  g.restore();
  if (span > .05) {
   g.strokeStyle = '#f2cf6b'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= FAN_SEG * 2; i++) { const a = lerp(ang(0), ang(FAN_SEG), i / (FAN_SEG * 2)), p = P(a, i % 2 ? R - sag : R); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
   g.lineWidth = 1.5; g.strokeStyle = 'rgba(242,207,107,.85)'; g.beginPath(); g.arc(0, 0, rb, ang(0), ang(FAN_SEG)); g.stroke();
   g.strokeStyle = 'rgba(120,70,20,.5)'; g.beginPath(); g.arc(0, 0, r0, ang(0), ang(FAN_SEG)); g.stroke();
  }
  for (let i = 1; i < FAN_SEG; i++) { const a = ang(i), e = P(a, R); g.strokeStyle = 'rgba(90,40,12,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...P(a, r0)); g.lineTo(e[0], e[1]); g.stroke(); }
  // closed stack: unopened pleats pile up against the far guard
  const stackN = Math.round((1 - open) * 6);
  for (let j = 0; j < stackN; j++) { const a = ang(FAN_SEG) - j * .012; g.strokeStyle = j % 2 ? '#e8d6ae' : '#9a1218'; g.lineWidth = 3; g.beginPath(); g.moveTo(...P(a, r0)); g.lineTo(...P(a, R)); g.stroke(); }
  if (FXART.parts.fan_guard) [0, FAN_SEG].forEach(i => { g.save(); g.rotate(ang(i) + (i ? .012 : -.012) + Math.PI / 2); artDraw(g, 'fan_guard', R); g.restore(); }); // art-swap
  else [0, FAN_SEG].forEach(i => { const a = ang(i) + (i ? .012 : -.012), e = P(a, R * 1.03);
   g.strokeStyle = '#2a0c06'; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(e[0], e[1]); g.stroke();
   g.strokeStyle = '#7a1c12'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(e[0], e[1]); g.stroke();
   g.strokeStyle = '#f2cf6b'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(...P(a, r0)); g.lineTo(...P(a, R * .97)); g.stroke(); });
  g.lineCap = 'butt';
  if (FXART.parts.fan_rivet_tassel) { g.save(); g.rotate(Math.sin(performance.now() / 640) * .06 * (o.still ? 0 : 1)); artDraw(g, 'fan_rivet_tassel', R < 200 ? R * .55 : R * .82); g.restore(); } else { const rv = g.createRadialGradient(-3, -3, 1, 0, 0, 12); rv.addColorStop(0, '#fff6c8'); rv.addColorStop(1, '#a8701e'); g.fillStyle = rv; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); }
  g.restore();
  const v = o.value;
  if ((v === 'x' || (v && v > 0)) && span > .2) { // 'x' = empty Table Fan (AA2 pass)
   const lh = o.valueH || (FXART.parts.fan_leaf_seg_1 ? R * .34 * Math.max(.55, Math.min(1, open * FAN_SEG / 5)) : R * (R < 160 ? .42 : .34)), ly = py - R * .6 * (.68 + .32 * open);
   g.save(); g.globalAlpha = alpha; drawValue('mult', v, px, ly, lh, { scale: o.vscale || 1, maxW: o.valueMaxW || Math.max(90, span * R * .62) }); g.restore();
  }
 }
 function drawTassel() {
  if (FAN.alpha < .01 || FAN.R < 150 || state.hideFan || FXART.parts.fan_rivet_tassel) return; const sw = Math.sin(time / 640) * 6 * DEG + Math.sin(time / 1500) * 3 * DEG, k = clamp(FAN.R / 225, .35, 1.3);
  g.save(); g.globalAlpha = FAN.alpha; g.translate(FAN.px, FAN.py); g.rotate(sw); g.scale(k, k);
  g.strokeStyle = '#c61a20'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 22); g.stroke();
  g.fillStyle = '#f2cf6b'; g.beginPath(); g.arc(0, 24, 5, 0, 7); g.fill();
  const tg = g.createLinearGradient(0, 26, 0, 54); tg.addColorStop(0, '#d8262c'); tg.addColorStop(1, '#7a0c10'); g.fillStyle = tg;
  g.beginPath(); g.moveTo(-6, 27); g.lineTo(6, 27); g.lineTo(9, 52); g.lineTo(-9, 52); g.closePath(); g.fill(); g.restore();
 }

 /* ---------- per-frame ---------- */
 // value audit: every value FX draws for a tile is booked to that tile; >1 in one frame = a stack bug
 const audit = { frames: 0, maxPerTile: 0, multiFrames: 0, multiSamples: [], flightOverValue: 0, per: new Map() };
 // A grid tile above the board clip is invisible (its feeder draws it there): only visible draws are booked.
 function book(t, x, y) { if (t.fxSplit) return; if (!t.fxFeedDraw && x !== undefined) { const m = g.getTransform(); const scr = m.b * x + m.d * y + m.f; if (scr < GY - 20) return; }
  audit.per.set(t, (audit.per.get(t) || 0) + 1); }
 function closeAudit() {
  if (!audit.per.size) return; audit.frames++; let mx = 0, who = null;
  audit.per.forEach((v, t) => { if (v > mx) { mx = v; who = t; } });
  audit.maxPerTile = Math.max(audit.maxPerTile, mx);
  if (mx > 1) { audit.multiFrames++; if (audit.multiSamples.length < 12) audit.multiSamples.push({ t: Math.round(time), id: who.id, val: who.val, n: mx, y: Math.round(who.y || 0), lift: who.lift || 0, mode: S.mode, feeds: wall.feeds.filter(f => f.t === who).length, raised: !!(state.raised && state.raised.has(who)) }); }
  audit.per.clear();
 }
 function begin() {
  closeAudit();
  last = time; time = performance.now(); dt = Math.min(100, time - last); glints = 0; valueGlints = 0;
  for (let i = state.timeline.length - 1; i >= 0; i--) if (time >= state.timeline[i].at) { const e = state.timeline.splice(i, 1)[0]; e.fn(); }
  state.veil += (state.veilTarget - state.veil) * Math.min(1, dt / F(4));
  // Table Fan rest pose: parked beside the logo in Bonus / Heavenly Hand; in base it sinks back into the Wall
  if (!state.count && !state.fanHold) {
   if (S.mode !== 'base') { FAN.tx = FP.x; FAN.ty = FP.y; FAN.Rt = FP.R; FAN.alphaT = 1; FAN.openT = fanOpenFor(fanDisplay()); FAN.hero = 0; }
   else { FAN.tx = FR.x; FAN.ty = FR.y; FAN.Rt = FR.R; FAN.alphaT = 0; FAN.openT = 0; }
  }
  state.raised = state.count && state.count.raise ? state.count.raise : null; state.raisedDraw = [];
 }
 const INK = []; [1, 2, 3].forEach(i => { const im = new Image(); im.onload = () => { INK[i - 1] = im; }; im.src = 'assets/presentation/ink_splat_' + i + '.png'; }); // approved AD HU-stamp splats
 function drawSplats() { // seal ink that splashed past the tile, under the board
  const n = time; state.splats = (state.splats || []).filter(k => n < k.t + k.dur);
  for (const k of state.splats) { const q = clamp((n - k.t) / k.dur); if (q <= 0) continue; const gr = eOut(clamp(q * 6));
   const ink = !k.big && INK[k.seed % 3]; if (ink) { const sz = k.r * 2.5 * gr, kk = sz / Math.max(ink.width, ink.height); g.save(); g.globalAlpha = (1 - q) ** 1.4 * .9; g.translate(k.x, k.y); g.rotate((hash(k.seed, 31) - .5) * 1.2); g.drawImage(ink, -ink.width * kk / 2, -ink.height * kk / 2, ink.width * kk, ink.height * kk); g.restore(); continue; }
   g.save(); g.globalAlpha = (1 - q) ** 1.4 * .8; g.translate(k.x, k.y); g.scale(gr, gr * .92); g.fillStyle = k.col; g.beginPath();
   for (let i = 0; i <= 18; i++) { const a = i / 18 * 6.283, r = k.r * (.78 + .34 * hash(i % 18, k.seed) + (i % 3 === 0 ? .22 * hash(i, k.seed + 3) : 0)); const x = Math.cos(a) * r, y = Math.sin(a) * r * 1.2; i ? g.lineTo(x, y) : g.moveTo(x, y); }
   g.closePath(); g.fill(); g.restore(); }
 }
 function backdrop() { drawSplats(); aa2AnticUnder(); } // AA2-MOTION: anticipation shaft under the tiles // Wall retired (2026-11-12): the mid-table TOTAL WIN / multiplier sit in that gap
 function logoAlpha() { return 1; } // pass 3: the fan never parks over the logo (LAYOUT.fanOpen / fanPark)
 function squash(t) { // shared weighted land: contact 2f compress, recoil 3f, settle 4f
  const a = t.fxLand ? time - t.fxLand : 1e9; if (a > F(9)) return [1, 1];
  if (a < F(2)) { const q = a / F(2); return [1 + .025 * q, 1 - .03 * q]; }
  if (a < F(5)) { const q = (a - F(2)) / F(3); return [lerp(1.025, .99, q), lerp(.97, 1.015, q)]; }
  const q = (a - F(5)) / F(4); return [lerp(.99, 1, q), lerp(1.015, 1, q)];
 }
 function stampScale(t) { // seal press: 1.35 → .88 → 1.06 → 1 (big: 1.5 → .84 → 1.1 → 1)
  const st = t.fxStamp; if (!st) return 1; const a = time - st.t; const big = st.big;
  const s0 = big ? 1.5 : 1.35, s1 = big ? .84 : .88, s2 = big ? 1.1 : 1.06, d1 = F(2), d2 = F(big ? 6 : 4), d3 = F(big ? 7 : 5);
  if (a < 0) return 1; if (a < d1) return lerp(s0, s1, eIn(a / d1));
  if (a < d1 + d2) return lerp(s1, s2, eOut((a - d1) / d2));
  if (a < d1 + d2 + d3) return lerp(s2, 1, eIO((a - d1 - d2) / d3)); return 1;
 }
 // A tile's own value. Exactly one value is drawn per tile per frame:
 //  - while its copy is in flight (t.fxOut) the tile shows nothing; it pops back when the copy lands;
 //  - a Rising tick pops the old value out (3f), then pops the new one in (8f), never both together.
 function tileValue(t, x, y, w, h, alpha = 1) {
  const L = TILE_VALUE[t.id]; if (!L || t.val === undefined) return;
  const cx = x + w * L.cx, cy = y + h * L.cy, plate = L.plate;
  if (t.fxOut && t.fxOut.state === 'out') return;
  const TT = v => { const k = L.kind + '|' + v + '|' + w + 'x' + h + '|' + ((GL[VALUE_STYLE[L.kind].glyphs] || {}).loaded || 0); let r = ttCache.get(k); if (!r) { r = tileText(L, v, w, h); ttCache.set(k, r); } return r; };
  const cur = TT(t.val), hh = cur.hh, maxW = cur.maxW;
  if (!tileValue.minPx) tileValue.minPx = {}; const mk = L.kind; tileValue.minPx[mk] = Math.min(tileValue.minPx[mk] ?? 1e9, cur.px);
  const tk = t.fxTick;
  if (tk && time < tk.t) { book(t, cx, cy); drawValue(L.kind, TT(tk.from).text, cx, cy, hh, { maxW, alpha, plate }); return; }
  if (tk && time < tk.t + F(11)) {
   const a = time - tk.t; book(t, cx, cy);
   if (a < F(3)) { const q = a / F(3); drawValue(L.kind, TT(tk.from).text, cx, cy, hh, { maxW, plate, scale: lerp(1, 1.28, eOut(q)) * (1 - eIn(q) * .85), alpha: alpha * (1 - eIn(q)) }); return; }
   const q = (a - F(3)) / F(8);
   drawValue(L.kind, TT(tk.to).text, cx, cy, hh, { maxW, plate, scale: q < .4 ? lerp(.3, 1.36, eOut(q / .4)) : lerp(1.36, 1, eIO((q - .4) / .6)), alpha });
   return;
  }
  const back = t.fxOut && t.fxOut.state === 'back' ? clamp((time - t.fxOut.t) / F(6)) : 1;
  const vp = aa2ValuePose(t); // AA2-MOTION: land value pose (one value per tile per frame, unchanged)
  book(t, cx, cy); drawValue(L.kind, cur.text, cx, cy + (vp ? vp.dy : 0), hh, { maxW: maxW * (vp ? Math.max(1, vp.s) : 1), alpha, plate, scale: (back < 1 ? eBack(back) : 1) * (vp ? vp.s : 1), rot: vp ? vp.rot : 0 });
 }
 function tile(t, x, y, w, h, draw) {
  t.fxDraw = draw;
  if (state.raised && state.raised.has(t) && !t.fxRaisedPass) { state.raisedDraw.push([t, x, y, w, h, draw]); return; } // drawn above the hero fan
  const st = rank(t), land = t.fxLand ? time - t.fxLand : 1e9, a = t.fxAccent, beat = a ? pulse(time - a.t, a.dur) : 0;
  const special = t.val !== undefined || isHU(t) || isHeaven(t);
  const landBeat = (t.id.startsWith('SYM0') && st > 0) ? pulse(land, F(4 + st)) * (.03 + st * .01) : 0;
  const [sx, sy] = squash(t);
  const lit = t.fxLit ? clamp((time - t.fxLit.t) / F(5)) : 0;
  let hb = 0;
  if (state.tension && (isHU(t) || isHeaven(t)) && t.fxCounted) { const ph = ((time - state.tension.t) % F(22)) / F(22); hb = (pulse(ph, .18) + .6 * pulse(ph - .24, .16)) * .05; }
  if (!state.tension && !S.busy && (isHU(t) || isHeaven(t))) hb = Math.sin(time / 1900 + hash(t.fxId) * 6) * .008;
  const lp = aa2LandPose(t); // AA2-MOTION: special land pose
  const sc = (1 + landBeat + (a ? (a.peak - 1) * beat : 0) + (t.fxLit ? (t.fxLit.peak - 1) * eOut(lit) : 0) + hb) * stampScale(t) * aa2OnePose(t) * (lp ? lp.s : 1);
  const period = st ? 6500 + hash(t.fxId) * 2500 : 12000 + hash(t.fxId) * 4000;
  const phase = ((time + hash(t.fxId, 29) * period) % period) / F(10);
  const idle = !S.busy && phase < 1 && glints < 3 && (!special || valueGlints < 1);
  if (idle) { glints++; if (special) valueGlints++; }
  g.save(); g.translate(x + w / 2, y + h); if (lp) { g.translate(0, lp.dy); if (lp.rot) g.rotate(lp.rot); } g.scale(sx, sy); g.translate(0, -h / 2); g.scale(sc, sc);
  aa2LandUnder(t, w, h); aa2OneUnder(t, w, h); // AA2-MOTION
  if (lit) { g.shadowColor = '#ffd46a'; g.shadowBlur = 26 * lit + 8 * Math.sin(time / 90) * lit; }
  else if (beat) { g.shadowColor = '#ffcd66'; g.shadowBlur = beat * 20; }
  draw(-w / 2, -h / 2, w, h); g.shadowBlur = 0;
  if (lit) { g.strokeStyle = `rgba(255,232,150,${.85 * lit})`; g.lineWidth = 4; rr(-w / 2 + 2, -h / 2 + 2, w - 4, h - 8, 13); g.stroke(); g.fillStyle = `rgba(255,240,190,${.12 * lit * (1 + Math.sin(time / 70)) / 2})`; rr(-w / 2, -h / 2, w, h - 4, 14); g.fill(); }
  if (idle || land < F(12)) { const q = idle ? phase : clamp(land / F(12)); g.save(); g.beginPath(); g.rect(-w / 2 + 8, -h / 2 + 3, w - 16, 9); g.clip(); const xx = -w / 2 + q * w; const gr = g.createLinearGradient(xx - 24, 0, xx + 24, 0); gr.addColorStop(0, '#fff5ce00'); gr.addColorStop(.5, '#fff5ceaa'); gr.addColorStop(1, '#fff5ce00'); g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, 16); g.restore(); }
  if (beat) { g.strokeStyle = `rgba(255,214,112,${.6 * beat})`; g.lineWidth = 2; g.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4); }
  const inFocus = state.focus ? state.focus.has(t) : false;
  const dim = (inFocus || t.fxLit ? 0 : state.veil) * anticDim(t); // AA2-MOTION: lit anticipation column stays readable
  if (dim > .005) { g.fillStyle = `rgba(4,16,10,${dim})`; rr(-w / 2, -h / 2, w, h, 14); g.fill(); }
  aa2LandOver(t, w, h); aa2OneOver(t, w, h); // AA2-MOTION: land character + 'one more' rim (values still draw last)
  tileValue(t, -w / 2, -h / 2, w, h, 1 - dim * .4);
  g.restore();
 }

 /* ---------- break / clear as a set ---------- */
 function rayRect(px, py, a, w, h) { const dx = Math.cos(a), dy = Math.sin(a); let tm = 1e9; if (dx > 1e-6) tm = Math.min(tm, (w - px) / dx); if (dx < -1e-6) tm = Math.min(tm, -px / dx); if (dy > 1e-6) tm = Math.min(tm, (h - py) / dy); if (dy < -1e-6) tm = Math.min(tm, -py / dy); return [px + dx * tm, py + dy * tm]; }
 function shardPolys(seed, w, h) {
  const px = w * (.38 + .24 * hash(seed, 1)), py = h * (.36 + .26 * hash(seed, 2)), N = 6, base = hash(seed, 3) * 6.283;
  const angs = []; for (let i = 0; i < N; i++) angs.push(base + (i + .25 + .5 * hash(seed + i, 4)) * 6.283 / N);
  const corners = [[0, 0], [w, 0], [w, h], [0, h]].map(p => ({ p, a: Math.atan2(p[1] - py, p[0] - px) }));
  const norm = a => { a %= 6.283; return a < 0 ? a + 6.283 : a; };
  const polys = [];
  for (let i = 0; i < N; i++) {
   const A = angs[i], B = angs[(i + 1) % N] + (i === N - 1 ? 6.283 : 0);
   const pts = [[px, py], rayRect(px, py, A, w, h)];
   corners.map(c => ({ p: c.p, d: norm(c.a - A) })).filter(c => c.d > 0 && c.d < B - A).sort((m, n) => m.d - n.d).forEach(c => pts.push(c.p));
   pts.push(rayRect(px, py, B, w, h));
   const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
   polys.push({ pts, cx, cy });
  }
  return { polys, px, py };
 }
 function lifted(t, x, y, w, h, draw) {
  const p = clamp(t.lift || 0);
  if (!t.fxBreak) t.fxBreak = { t: time, spawned: false, flower: t.id === 'SYM10_flower', geo: shardPolys(t.fxId * 7.3, w, h) };
  const b = t.fxBreak; if (b.spawned) return;
  const cen = state.lastCentroid || { x: x + w / 2, y: y + h / 2 };
  if (p >= .99) {
   b.spawned = true; const now = time;
   if (b.flower) { for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283 + hash(t.fxId, i) * .6; state.particles.push({ petal: true, x: x + w / 2, y: y + h / 2, vx: Math.cos(a) * 170, vy: Math.sin(a) * 150 - 90, rot: a, vr: (hash(i, t.fxId) - .5) * 9, t: now, dur: F(20), size: 16 + 6 * hash(i, 8) }); } return; }
   const ox = (x + w / 2 - cen.x), oy = (y + h / 2 - cen.y), ol = Math.hypot(ox, oy) || 1;
   b.geo.polys.forEach((sh, i) => {
    const dx = sh.cx - b.geo.px, dy = sh.cy - b.geo.py, dl = Math.hypot(dx, dy) || 1;
    const sp = 140 + 110 * hash(t.fxId + i, 6);
    state.shards.push({ t: now, dur: F(17 + 4 * hash(i, t.fxId)), x, y, w, h, sh, draw,
     vx: dx / dl * sp + ox / ol * 90, vy: dy / dl * sp + oy / ol * 70 - 110 - 80 * hash(i, 11), vr: (hash(t.fxId, i + 20) - .5) * 7,
     ta: hash(t.fxId, i + 40) * Math.PI, ts: (2.2 + 1.8 * hash(i, t.fxId + 41)) * (hash(i, t.fxId + 42) > .5 ? 1 : -1), th: 11 + 4 * hash(i, 43) });
   });
   if (state.shards.length > 140) state.shards.splice(0, state.shards.length - 140);
   // dust: three soft puffs + specks from the break point
   const bx = x + b.geo.px, by = y + b.geo.py; state.dust = state.dust || [];
   for (let i = 0; i < 3; i++) { const a = hash(t.fxId, 60 + i) * 6.283; state.dust.push({ puff: true, i, x: bx + Math.cos(a) * 20, y: by + Math.sin(a) * 26, vx: Math.cos(a) * 40, vy: Math.sin(a) * 30 - 30, r: 34 + 16 * hash(i, t.fxId + 61), t: now + F(i * .5), dur: F(18) }); }
   for (let i = 0; i < 9; i++) { const a = hash(t.fxId, 70 + i) * 6.283, sp = 160 + 200 * hash(i, t.fxId + 71); state.dust.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160, r: 2 + 2.5 * hash(i, 72), t: now, dur: F(14 + 6 * hash(i, 73)) }); }
   if (state.dust.length > 160) state.dust.splice(0, state.dust.length - 160);
   return;
  }
  g.save(); g.translate(x + w / 2, y + h / 2); const s = 1 + .05 * eOut(p) - (b.flower ? .25 * eIn(p) : 0); g.scale(s, s); if (b.flower) g.rotate(p * .5);
  g.shadowColor = '#ffe08a'; g.shadowBlur = 30; draw(-w / 2, -h / 2, w, h); g.shadowBlur = 0;
  if (!b.flower) {
   g.strokeStyle = `rgba(255,250,225,${.6 + .4 * p})`; g.lineWidth = 2.4; g.lineCap = 'round';
   b.geo.polys.forEach(sh => { const e = sh.pts[1]; const q = clamp(p * 1.4); g.beginPath(); g.moveTo(b.geo.px - w / 2, b.geo.py - h / 2); g.lineTo(lerp(b.geo.px, e[0], q) - w / 2, lerp(b.geo.py, e[1], q) - h / 2); g.stroke(); });
  }
  g.fillStyle = `rgba(255,246,210,${.45 * eIn(p)})`; rr(-w / 2, -h / 2, w, h - 4, 14); g.fill();
  g.restore();
 }
 // Ivory shards with real thickness: the face is foreshortened by a 3D tumble about a per-shard axis;
 // the extruded side wall (ivory over jade, like the tile body) shows on the turned edge, lit edges
 // get a bright bevel line, the back face shows jade when the shard flips over.
 const LIGHT = [-.55, -.83];
 function drawShards() {
  const n = time; state.shards = state.shards.filter(s => n < s.t + s.dur);
  for (const s of state.shards) {
   const d = (n - s.t) / 1000, q = (n - s.t) / s.dur;
   const ox = s.vx * d, oy = s.vy * d + 1500 * d * d, rot = s.vr * d, phi = s.ts * d, cf = Math.cos(phi), sn = Math.sin(phi);
   const k = 1 - .22 * q, sx = s.x + s.sh.cx + ox, sy = s.y + s.sh.cy + oy;
   const ca = Math.cos(s.ta), sa = Math.sin(s.ta), cr = Math.cos(rot) * k, sr = Math.sin(rot) * k;
   const fz = Math.abs(cf) < .08 ? (cf < 0 ? -.08 : .08) : cf;
   // M = T(sx,sy)·Rot(rot)·k · [Rta · diag(1,fz) · Rta^-1] · T(-cx,-cy)
   const a11 = ca * ca + sa * sa * fz, a12 = ca * sa * (1 - fz), a22 = sa * sa + ca * ca * fz;
   const m = [cr * a11 - sr * a12, sr * a11 + cr * a12, cr * a12 - sr * a22, sr * a12 + cr * a22];
   const P = ([px, py]) => { const u = px - s.sh.cx, v = py - s.sh.cy; return [sx + m[0] * u + m[2] * v, sy + m[1] * u + m[3] * v]; };
   const dep = s.th * sn * k, dv = [(-sa * cr - ca * sr) * dep, (-sa * sr + ca * cr) * dep]; // depth along the tumble normal
   const fr = s.sh.pts.map(P), bk = fr.map(p => [p[0] + dv[0], p[1] + dv[1]]);
   const sp = 'shard_' + ((s.sh.i ?? (state.shards.indexOf(s))) % 7 + 1);
   if (FXART.parts[sp]) { g.save(); g.globalAlpha = q < .55 ? 1 : (1 - (q - .55) / .45) ** 1.3; g.transform(m[0], m[1], m[2], m[3], sx, sy); artDraw(g, sp, s.w || 134); g.restore(); continue; } // art-swap (pivot = shard centroid)
   g.save(); g.globalAlpha = q < .55 ? 1 : (1 - (q - .55) / .45) ** 1.3;
   // back face + side walls
   const path = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
   g.fillStyle = '#165a42'; path(bk); g.fill();
   for (let i = 0; i < fr.length; i++) { const a = fr[i], b = fr[(i + 1) % fr.length], c = bk[(i + 1) % fr.length], e = bk[i];
    const nx = b[1] - a[1], ny = -(b[0] - a[0]), nl = Math.hypot(nx, ny) || 1, lit = clamp(.5 + .5 * (nx * LIGHT[0] + ny * LIGHT[1]) / nl);
    const mid = (p, q2) => [lerp(p[0], q2[0], .55), lerp(p[1], q2[1], .55)];
    g.fillStyle = `rgb(${Math.round(lerp(150, 246, lit))},${Math.round(lerp(132, 236, lit))},${Math.round(lerp(98, 205, lit))})`; path([a, b, mid(b, c), mid(a, e)]); g.fill();
    g.fillStyle = `rgb(${Math.round(lerp(14, 40, lit))},${Math.round(lerp(70, 128, lit))},${Math.round(lerp(52, 96, lit))})`; path([mid(a, e), mid(b, c), c, e]); g.fill(); }
   // face (tile art, or the jade back if flipped)
   g.save(); g.transform(m[0], m[1], m[2], m[3], sx - m[0] * s.sh.cx - m[2] * s.sh.cy, sy - m[1] * s.sh.cx - m[3] * s.sh.cy);
   path(s.sh.pts); g.clip();
   if (cf >= 0) s.draw(0, 0, s.w, s.h); else { g.fillStyle = '#0e6b52'; g.fillRect(0, 0, s.w, s.h); }
   g.fillStyle = `rgba(0,0,0,${.28 * (1 - Math.abs(cf))})`; g.fillRect(0, 0, s.w, s.h); // turned away = darker
   g.restore();
   // bevel: bright edge on lit edges, soft dark on the shadow side
   for (let i = 0; i < fr.length; i++) { const a = fr[i], b = fr[(i + 1) % fr.length]; const nx = b[1] - a[1], ny = -(b[0] - a[0]), nl = Math.hypot(nx, ny) || 1, l = (nx * LIGHT[0] + ny * LIGHT[1]) / nl;
    g.strokeStyle = l > 0 ? `rgba(255,252,235,${.55 + .45 * l})` : 'rgba(70,48,18,.55)'; g.lineWidth = l > 0 ? 2.6 : 1.6; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
   g.restore();
  }
  // dust puffs and specks
  state.dust = (state.dust || []).filter(p => n < p.t + p.dur);
  for (const p of state.dust) { const q = (n - p.t) / p.dur; if (q < 0) continue; const d = (n - p.t) / 1000;
   if (p.puff && FXART.parts.dust_puff_1) { const r = p.r * (.5 + .9 * eOut(q)), x = p.x + p.vx * d, y = p.y + p.vy * d, nm = 'dust_puff_' + (1 + (p.i || 0) % 3);
    g.save(); g.globalAlpha = (1 - q) ** 1.5; g.translate(x, y); artDraw(g, FXART.parts[nm] ? nm : 'dust_puff_1', 134 * r / 70); g.restore(); } // art-swap (additive)
   else if (p.puff) { const r = p.r * (.5 + .9 * eOut(q)), x = p.x + p.vx * d, y = p.y + p.vy * d; const gg = g.createRadialGradient(x, y, 1, x, y, r); gg.addColorStop(0, `rgba(246,236,210,${.42 * (1 - q) ** 1.5})`); gg.addColorStop(1, 'rgba(246,236,210,0)'); g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2); }
   else { g.fillStyle = `rgba(250,242,220,${(1 - q) ** 1.2})`; const x = p.x + p.vx * d, y = p.y + p.vy * d + 1300 * d * d; g.fillRect(x - p.r / 2, y - p.r / 2, p.r, p.r); } }
 }

 /* ---------- overlay (above board) ---------- */
 function overlay() {
  const n = time;
  // win pass draw order: shards → cascade feed tiles (clipped to the frame) → hero fan (above every board / lifted tile)
  aa2AnticOver(); // AA2-MOTION
  drawShards(); drawFeeds();
  drawBigFan(); drawTassel();
  if (state.raisedDraw && state.raisedDraw.length) { const sh = api.boardOffset(); g.save(); g.translate(sh.x, sh.y); state.raisedDraw.forEach(([t, x, y, w, h, draw]) => { t.fxRaisedPass = true; tile(t, x, y, w, h, draw); t.fxRaisedPass = false; }); g.restore(); }
  state.inks = state.inks.filter(k => n < k.t + k.dur);
  for (const k of state.inks) { const q = clamp((n - k.t) / k.dur); if (q <= 0) continue; g.save();
   if (k.type === 'drop') { const u = eOut(clamp(q * 3)); g.globalAlpha = (1 - q) ** 1.2; const r = k.r * (1 - .3 * q), x = k.x + k.dx * u, y = k.y + k.dy * u;
    g.fillStyle = '#3a0606'; g.beginPath(); g.arc(x + 1.5, y + 2, r, 0, 7); g.fill(); g.fillStyle = k.col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    if (k.r > 12) { g.beginPath(); g.ellipse(x - k.dx * .12 * u, y - k.dy * .12 * u, r * .55, r * .4, Math.atan2(k.dy, k.dx), 0, 7); g.fill(); g.fillStyle = 'rgba(255,220,210,.45)'; g.beginPath(); g.arc(x - r * .35, y - r * .35, r * .25, 0, 7); g.fill(); } }
   else if (k.type === 'glow') { g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(k.x, k.y, 10, k.x, k.y, k.s); gg.addColorStop(0, `rgba(${k.col},${.55 * (1 - q) ** 1.5})`); gg.addColorStop(1, `rgba(${k.col},0)`); g.fillStyle = gg; g.fillRect(k.x - k.s, k.y - k.s, k.s * 2, k.s * 2); }
   else if (k.type === 'sq') { g.globalAlpha = (1 - q) ** 2 * .95; g.strokeStyle = k.col; g.lineWidth = 14 * (1 - q) + 2; g.shadowColor = k.col; g.shadowBlur = 16; const s = k.s * (1 + .5 * eOut(q)); g.strokeRect(k.x - s / 2, k.y - s / 2 * 1.25, s, s * 1.25); }
   g.restore(); }
  state.rays = state.rays.filter(r => n < r.t + r.dur);
  for (const r of state.rays) { const q = clamp((n - r.t) / r.dur); if (q <= 0) continue; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = pulse(q, 1) * (r.alpha || .5); g.translate(r.x, r.y); g.rotate(n / 2400 + (r.rot || 0));
   for (let i = 0; i < r.n; i++) drawRay(i / r.n * 6.283, r.len * (.75 + .25 * hash(i, 7)), r.wid);
   g.restore(); }
  state.amounts = state.amounts.filter(m => n < m.arrive + F(1));
  for (const m of state.amounts) {
   if (n < m.t) continue; const cq = clamp((n - m.t) / m.countDur), v = m.pay * eOut(cq);
   let x = m.x, y = m.y - 30 * eOut(cq), sc = cq < 1 ? .7 + .3 * eOut(cq) : 1 + .12 * pulse(n - m.t - m.countDur, F(6)), al = clamp((n - m.t) / F(3));
   if (n >= m.fly) { const u = clamp((n - m.fly) / (m.arrive - m.fly)); x = lerp(x, TOTAL.x, eIn(u)); y = lerp(y, TOTAL.y, eIn(u)); sc *= lerp(1, .55, u); }
   drawValue('money', cq >= 1 ? m.pay : v, x, y, m.h, { scale: sc, alpha: al });
  }
  drawBloom();
  // value flights: the value LEAVES its tile (tile shows nothing until it lands), pops up off the
  // tile, then travels on a dark halo with a spark streak — no translucent ghost copy.
  state.flights = state.flights.filter(f => n < f.t + f.dur + F(1));
  for (const f of state.flights) { const q = (n - f.t) / f.dur; if (q < 0) continue;
   if (!f.launched) { f.launched = true; if (f.tile) { accent(f.tile, 1.16, 8); if (!f.spark) f.tile.fxOut = { state: 'out', t: n }; } f.from = (f.tile && locate(f.tile)) || f.from; if (f.fromOff) f.from = { x: f.from.x + f.fromOff.x, y: f.from.y + f.fromOff.y }; }
   if (q >= 1) { if (!f.hit) { f.hit = true; if (f.tile && f.tile.fxOut && !f.keepOut) f.tile.fxOut = { state: 'back', t: n }; f.onHit && f.onHit(); } continue; }
   const lift = clamp(q / .22), u = eIO(clamp((q - .12) / .88));
   const x = lerp(f.from.x, f.to.x, u), y = lerp(f.from.y - 34 * eOut(lift), f.to.y, u) - (f.arc ?? 90) * Math.sin(Math.PI * u);
   if (f.spark) { g.save(); g.globalCompositeOperation = 'lighter'; const sg = g.createRadialGradient(x, y, 1, x, y, 26); sg.addColorStop(0, 'rgba(255,245,200,1)'); sg.addColorStop(1, 'rgba(255,190,80,0)'); g.fillStyle = sg; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); g.restore(); continue; }
   if (u > .02) { g.save(); g.globalCompositeOperation = 'lighter'; for (let j = 1; j <= 4; j++) { const uu = Math.max(0, u - j * .045), xx = lerp(f.from.x, f.to.x, uu), yy = lerp(f.from.y - 34, f.to.y, uu) - (f.arc ?? 90) * Math.sin(Math.PI * uu); const r = 14 - j * 2.5; const sg = g.createRadialGradient(xx, yy, 1, xx, yy, r * 2); sg.addColorStop(0, `rgba(255,236,170,${.5 - j * .1})`); sg.addColorStop(1, 'rgba(255,190,80,0)'); g.fillStyle = sg; g.fillRect(xx - r * 2, yy - r * 2, r * 4, r * 4); } g.restore(); }
   drawValue(f.kind, f.val, x, y, f.h, { scale: lerp(f.s0 || 1, f.s1 || 1, u) * (1 + .3 * pulse(q, .3)) * (q > .8 ? 1 - (q - .8) * 2 : 1), alpha: q > .8 ? 1 - (q - .8) / .2 * .8 : 1, plate: 'dark' }); // dissolves into its target
   // audit: is this copy passing over another tile's visible value?
   for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) { const o = S.grid[c]?.[r]; if (!o || o === f.tile || o.val === undefined || (o.fxOut && o.fxOut.state === 'out')) continue; const ox = cellX(c), oy = cellY(r);
    if (x > ox + 20 && x < ox + C.CELL_W - 20 && y > oy + 40 && y < oy + C.CELL_H - 40) audit.flightOverValue++; }
  }
  if (state.slam) { const s = state.slam, q = (n - s.t) / s.dur;
   if (q >= 0 && q < 1) { const u = eIn(q); g.save(); g.globalAlpha = .3; for (let k = 1; k <= 3; k++) { const uu = eIn(Math.max(0, q - k * .07)); drawValue('mult', s.v, lerp(s.from.x, s.to.x, uu), lerp(s.from.y, s.to.y, uu), s.h * lerp(1.5, 1, uu)); } g.restore(); drawValue('mult', s.v, lerp(s.from.x, s.to.x, u), lerp(s.from.y, s.to.y, u), s.h * lerp(1.5, 1, u)); }
   else if (q >= 1 && !s.hit) { s.hit = true; s.onHit && s.onHit(); }
   if (q >= 1.2) state.slam = null; }
  if (state.stamp) { const s = state.stamp, a = n - s.t, q = a / (s.dur || F(30));
   if (q >= 1) state.stamp = null; else { const D = (s.dur || F(30)) / F(30), sc = a < F(3) * D ? lerp(1.7, .92, eIn(a / (F(3) * D))) : a < F(7) * D ? lerp(.92, 1, eOut((a - F(3) * D) / (F(4) * D))) : 1; drawValue('mult', s.v, s.x, s.y, s.h, { scale: sc, rot: -8 * DEG, alpha: q < .7 ? 1 : 1 - (q - .7) / .3 }); } }
  state.particles = state.particles.filter(p => n < p.t + p.dur);
  for (const p of state.particles) { const q = clamp((n - p.t) / p.dur); if (n < p.t) continue; g.save(); g.globalAlpha = (1 - q) ** 2;
   if (p.ring) { g.strokeStyle = p.col; g.lineWidth = p.w * (1 - q) + 1; g.beginPath(); g.ellipse(p.x, p.y, 12 + p.r * eOut(q), (12 + p.r * eOut(q)) * p.flat, 0, 0, 7); g.stroke(); }
   else if (p.petal) { const d = (n - p.t) / 1000; g.translate(p.x + p.vx * d, p.y + p.vy * d + 260 * d * d); g.rotate(p.rot + p.vr * d); const pv = 'petal_var_' + (1 + Math.abs(Math.floor(p.rot * 7)) % 4); if (!artDraw(g, FXART.parts[pv] ? pv : '-', p.size * 1.6)) petal(p.size * 1.6, p.size * .7, 1, 1); }
   else { const d = (n - p.t) / 1000; g.fillStyle = p.col; drawStar(p.x + p.vx * d, p.y + p.vy * d + 90 * d * d, p.size * (1 - q)); }
   g.restore(); }
  aa2Parts(); // AA2-MOTION
 }
 function drawRay(a, len, wid) { const gr = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); gr.addColorStop(0, 'rgba(255,236,170,.9)'); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - wid) * len, Math.sin(a - wid) * len); g.lineTo(Math.cos(a + wid) * len, Math.sin(a + wid) * len); g.closePath(); g.fill(); }
 // layered petal: layer 0 = back (deeper amber, wider), 1 = front (gold → cream tip, edge light)
 function petal(len, wid, a, layer = 1) {
  if (FXART.parts[layer ? 'bloom_petal_a' : 'bloom_petal_b']) { g.save(); g.globalAlpha *= a; artDraw(g, layer ? 'bloom_petal_a' : 'bloom_petal_b', len); g.restore(); return; } // art-swap
  const gr = g.createLinearGradient(0, 0, 0, -len);
  if (layer) { gr.addColorStop(0, '#9a520e'); gr.addColorStop(.28, '#e8a12a'); gr.addColorStop(.7, '#ffd65e'); gr.addColorStop(1, '#fff4c4'); }
  else { gr.addColorStop(0, '#5a2a06'); gr.addColorStop(.4, '#b8661a'); gr.addColorStop(1, '#e8a640'); }
  g.globalAlpha *= a;
  const shape = () => { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(wid, -len * .22, wid * .95, -len * .78, 0, -len); g.bezierCurveTo(-wid * .95, -len * .78, -wid, -len * .22, 0, 0); };
  shape(); g.fillStyle = gr; g.fill();
  g.strokeStyle = layer ? 'rgba(90,40,4,.85)' : 'rgba(50,20,2,.7)'; g.lineWidth = layer ? 2.4 : 2; g.stroke();
  if (layer) { // edge light on the left flank + a centre crease
   g.save(); shape(); g.clip(); g.strokeStyle = 'rgba(255,250,225,.75)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-wid * .1, -len * .06); g.bezierCurveTo(-wid * .95, -len * .25, -wid * .85, -len * .75, 0, -len * .98); g.stroke(); g.restore();
   g.strokeStyle = 'rgba(160,80,10,.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -len * .1); g.lineTo(0, -len * .8); g.stroke();
  }
 }
 function drawBloom() {
  const b = state.bloom; if (!b) return; const n = time, a = n - b.t0;
  const grow = eBack(clamp(a / F(5))), burstQ = b.burst ? clamp((n - b.burst) / F(7)) : 0;
  if (burstQ >= 1 && !b.keepSum) return;
  g.save(); g.translate(b.x, b.y);
  const shade = g.createRadialGradient(0, 0, 40, 0, 0, 320); shade.addColorStop(0, `rgba(6,18,10,${.62 * (1 - burstQ) * clamp(a / F(3))})`); shade.addColorStop(.7, `rgba(6,18,10,${.4 * (1 - burstQ) * clamp(a / F(3))})`); shade.addColorStop(1, 'rgba(6,18,10,0)'); g.fillStyle = shade; g.fillRect(-330, -330, 660, 660);
  if (FXART.parts.bloom_glow) { g.save(); g.globalAlpha *= .55 * (1 - burstQ); artDraw(g, 'bloom_glow', 280); g.restore(); } else { const glow = g.createRadialGradient(0, 0, 10, 0, 0, 280); glow.addColorStop(0, `rgba(255,214,110,${.55 * (1 - burstQ)})`); glow.addColorStop(1, 'rgba(255,214,110,0)'); g.fillStyle = glow; g.fillRect(-290, -290, 580, 580); }
  const full = b.full ? pulse(n - b.full, F(5)) * .1 : 0, sc = grow * (1 + full + .015 * Math.sin(n / 300)) * (1 + burstQ * .6);
  g.scale(sc, sc);
  const cnt = Math.max(5, b.n);
  if (burstQ < 1) {
   // back layer: one wider, deeper petal between each pair of front petals
   for (let i = 0; i < b.petals.length; i++) { const q = clamp((n - b.petals[i].t) / F(5)), ang = (i / cnt) * 6.283 + Math.PI / cnt;
    g.save(); g.rotate(ang); g.scale(eBack(q), eBack(q)); petal(212, Math.min(78, 330 / cnt + 22), 1 - burstQ, 0); g.restore(); }
   // front layer with glow
   g.save(); g.shadowColor = 'rgba(255,200,90,.7)'; g.shadowBlur = 18;
   for (let i = 0; i < b.petals.length; i++) { const q = clamp((n - b.petals[i].t) / F(5)), ang = (i / cnt) * 6.283;
    g.save(); g.rotate(ang); g.scale(eBack(q), eBack(q)); petal(186, Math.min(68, 290 / cnt + 18), 1 - burstQ, 1); g.restore(); }
   g.restore();
  }
  g.globalAlpha = 1 - burstQ * .3;
  if (!artDraw(g, 'bloom_centre', 80)) { const cg = g.createRadialGradient(-12, -14, 4, 0, 0, 80); cg.addColorStop(0, '#fff3b8'); cg.addColorStop(.55, '#e8aa34'); cg.addColorStop(1, '#8a4e0e'); g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 80, 0, 7); g.fill();
  g.strokeStyle = '#5a2e06'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 22; i++) { const aa = i / 22 * 6.283 + n / 4000; g.fillStyle = i % 2 ? '#7a3e0c' : '#fff0b0'; g.beginPath(); g.arc(Math.cos(aa) * 68, Math.sin(aa) * 68, i % 2 ? 3 : 2.2, 0, 7); g.fill(); } } // art-swap: bloom_centre
  g.restore();
  const pop = b.pop ? clamp(1 - (n - b.pop) / F(5)) * .25 : 0;
  if (b.money) drawValue('money', b.pay, b.x, b.y, 74, { scale: eBack(clamp((n - b.burst) / F(5))) });
  else if (b.sum > 0) drawValue('flower', b.sum, b.x, b.y, 70, { scale: (1 + pop) * grow, maxW: 250 });
 }

 /* ---------- counters / HUD ---------- */
 const counters = {};
 function number(key, value, dur = F(20)) {
  let c = counters[key]; if (!c) c = counters[key] = { from: value, to: value, t: time, v: value, dur };
  if (value !== c.to) { c.from = c.v; c.to = value; c.t = key === 'win' ? Math.max(time, state.winHoldUntil) : time; c.dur = key === 'win' && state.winFast > time ? F(12) : dur; if (key === 'win' && value < c.from) { c.from = value; } }
  const q = clamp((time - c.t) / c.dur); c.v = c.from + (c.to - c.from) * (1 - (1 - q) ** 3); return c.v;
 }

 /* ---------- event API used by game.js ---------- */
 // screen_E board plate (table + frame + logo, no Wall). Returns true when drawn, so game.js skips its code board.
 function drawPlate() { if (!ART.bg) return false; g.drawImage(ART.bg, 0, 0, C.W || 1080, C.H || 1920); return true; }
 /* ==================== AA2-MOTION BEGIN (2026-11-12) ====================
  * Three self-contained presentation beats for the AA2 gap list (design/AA2_SPEC_GAP.md A-1, A-2, A-3):
  *  1) aa2RefillPlan / aa2AnticUnder / aa2AnticOver  — refill anticipation (base only, revealed tiles only)
  *  2) aa2PreRefill / aa2OnePose / aa2OneOver          — 'one more' pulse on exactly 7 of a pay symbol (or 7 Flowers)
  *  3) aa2Land / aa2LandPose / aa2LandUnder / aa2LandOver / aa2ValuePose / aa2Parts — weighted Flower / Fan / Rising Fan lands
  * Reads S.grid and tile ids only. No RNG (stable hashes), no award or rule state, no game timing except the
  * delay / duration numbers FX already returns from refill(). The first-deal tension (deal()) is untouched. */
 const AA2 = { parts: [], plan: null, antic: {}, log: [], counts: {} };
 const aa2Mark = (type, extra) => { AA2.counts[type] = (AA2.counts[type] || 0) + 1; mark(type, extra); AA2.log.push(Object.assign({ type, t: Math.round(performance.now()) }, extra || {})); if (AA2.log.length > 200) AA2.log.shift(); };
 const isSeal = x => !!x && (isHU(x) || isHeaven(x));
 const sealsOf = list => { const s = { hu: 0, hv: 0 }; list.forEach(x => { if (!x) return; if (isHU(x)) s.hu++; else if (isHeaven(x)) s.hv++; }); return s; };
 const setDone = s => s.hu >= C.BONUS_TRIGGER_HU || (s.hu >= C.HEAVENLY_HU && s.hv >= 1);
 // same reading as the first-deal tension: 3 胡, or 2 胡 + 天和, showing and the set not yet complete; base game only (AA2 A-1)
 const anticOpen = s => S.mode === 'base' && (s.hu >= 3 || (s.hu >= 2 && s.hv >= 1)) && !setDone(s);
 const ANT = { slowK: 2.1, slowMin: F(17), gap: F(11), hold: F(6), sealHold: F(6), doneHold: F(8), rowSt: F(2.2), fade: F(10) };

 /* ---- 2) 'one more' + 1) refill plan reset: game.js calls FX.preRefill(remove, wait) right before liftAndRefill ---- */
 async function aa2PreRefill(remove, wait) {
  const key = new Set((remove || []).map(([c, r]) => c + ',' + r)), now = performance.now();
  // refill plan for this step: seals on the board now are exactly the survivors' seals (seals never clear)
  const colSeal = []; for (let c = 0; c < C.COLS; c++) colSeal[c] = (S.grid[c] || []).some(isSeal);
  const base = sealsOf(S.grid.flat());
  AA2.plan = { base, added: { hu: 0, hv: 0 }, colSeal, cols: {}, curC: -1, curTiles: [], shift: 0, condAt: anticOpen(base) ? F(2) : null, cursor: null, wasOpen: anticOpen(base), doneHeld: false, lastSealLand: 0, t0: now };
  AA2.antic = {};
  // 'one more': exactly 7 of one pay symbol (or 7 Flowers) staying on the board through this refill
  const by = {}; for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) { const t = S.grid[c]?.[r]; if (!t || key.has(c + ',' + r)) continue; if (t.id in C.PAYS || t.id === 'SYM10_flower') (by[t.id] = by[t.id] || []).push(t); }
  const sevens = Object.entries(by).filter(([, l]) => l.length === 7);
  if (!sevens.length) return;
  sevens.forEach(([id, l]) => { l.forEach((t, i) => { t.aa2One = { t: now + F(i * .35), seed: t.fxId }; }); aa2Mark('aa2-onemore', { id, n: 7 }); });
  if (state.focus) sevens.forEach(([, l]) => l.forEach(t => state.focus.add(t)));
  await wait(F(4)); // first beat reads before the winners lift; the second beat lands as the refill starts
 }
 function aa2OnePose(t) { const o = t.aa2One; if (!o) return 1; const a = time - o.t; if (a > F(16)) { t.aa2One = null; return 1; } if (a < 0) return 1;
  return 1 + .085 * pulse(a, F(6)) + .05 * pulse(a - F(7.5), F(6)); }
 function aa2OneUnder(t, w, h) { const o = t.aa2One; if (!o) return; const a = time - o.t; if (a < 0 || a > F(16)) return; const env = clamp(a / F(2)) * (a < F(12) ? 1 : 1 - (a - F(12)) / F(4)), beat = Math.max(pulse(a, F(6)), .7 * pulse(a - F(7.5), F(6)));
  g.save(); g.globalCompositeOperation = 'lighter'; const R = w * (.85 + .25 * beat), gr = g.createRadialGradient(0, 0, w * .3, 0, 0, R); gr.addColorStop(0, `rgba(40,230,170,${.0})`); gr.addColorStop(.6, `rgba(40,230,170,${.45 * env * (.5 + .5 * beat)})`); gr.addColorStop(1, 'rgba(40,230,170,0)'); g.fillStyle = gr; g.fillRect(-R, -R * 1.2, R * 2, R * 2.4); g.restore(); }
 function aa2OneOver(t, w, h) { const o = t.aa2One; if (!o) return; const a = time - o.t; if (a < 0 || a > F(16)) return;
  const env = clamp(a / F(2)) * (a < F(12) ? 1 : 1 - (a - F(12)) / F(4)), beat = Math.max(pulse(a, F(6)), .7 * pulse(a - F(7.5), F(6)));
  g.save();
  // jade rim (source-over so it reads on the ivory face), white inner line, distinct from the winners' gold
  g.shadowColor = 'rgba(40,255,190,.95)'; g.shadowBlur = 12 + 16 * beat; g.strokeStyle = `rgba(20,178,128,${(.55 + .45 * beat) * env})`; g.lineWidth = 4 + 3 * beat; rr(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 9, 13); g.stroke(); g.shadowBlur = 0;
  g.strokeStyle = `rgba(235,255,248,${(.4 + .5 * beat) * env})`; g.lineWidth = 1.6; rr(-w / 2 + 7, -h / 2 + 7, w - 14, h - 18, 10); g.stroke();
  g.globalCompositeOperation = 'lighter';
  // one shimmer pass per beat, clipped to the face
  rr(-w / 2, -h / 2, w, h - 4, 14); g.clip();
  [0, F(7.5)].forEach(t0 => { const q = clamp((a - t0) / F(6)); if (q <= 0 || q >= 1) return; const xx = lerp(-w * .9, w * .9, eIO(q)); const gr = g.createLinearGradient(xx - 30, -h / 2, xx + 30, h / 2); gr.addColorStop(0, 'rgba(200,255,235,0)'); gr.addColorStop(.5, `rgba(220,255,240,${.16 * env})`); gr.addColorStop(1, 'rgba(200,255,235,0)'); g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h); });
  g.restore(); }

 /* ---- 1) refill anticipation: adjusts this tile's refill delay / travel (wall-clock only; the tiles are already dealt) ---- */
 function aa2RefillPlan(c, r, nNew, t, ret, k) {
  const P = AA2.plan; if (!P) return ret;
  if (P.curC !== c) { // a new column starts: earlier columns' new seals are revealed by now (columns land in order)
   P.curTiles.forEach(x => { if (isHU(x)) P.added.hu++; else if (isHeaven(x)) P.added.hv++; }); P.curTiles = [];
   const s = { hu: P.base.hu + P.added.hu, hv: P.base.hv + P.added.hv }, open = anticOpen(s);
   if (open && !P.wasOpen) { P.condAt = P.lastSealLand + ANT.sealHold; P.cursor = null; }
   if (!open && P.wasOpen && setDone(s) && !P.doneHeld) { P.shift += ANT.doneHold; P.doneHeld = true; } // set completed inside the anticipation: hold, then normal pace
   P.wasOpen = open; P.curC = c;
   const D = ret.dur, top = F(5 + c * .7) + (nNew - 1) * F(1.5), E = top + D; // normal: this column's top tile lands at E
   if (open && !P.colSeal[c]) {
    const slowD = Math.max(ANT.slowMin, D * ANT.slowK), cur = P.cursor == null ? P.condAt + ANT.hold : P.cursor;
    const T = Math.max(E + P.shift + (slowD - D), cur + ANT.gap);
    P.cols[c] = { antic: true, T, slowD, nNew, on: P.condAt, seals: s };
    P.cursor = T + F(4); P.shift = T - E;
    AA2.antic[c] = { on: P.t0 + P.condAt, land: P.t0 + T, first: P.t0 + T - (nNew - 1) * ANT.rowSt, nNew, heaven: s.hv >= 1 };
    aa2Mark('aa2-antic-col', { c, landMs: Math.round(T), slowMs: Math.round(slowD), hu: s.hu, hv: s.hv });
   } else P.cols[c] = { antic: false, shift: P.shift };
  }
  const pc = P.cols[c];
  if (pc.antic) { ret.dur = pc.slowD; ret.delay = pc.T - pc.slowD - r * ANT.rowSt; if (t) t.aa2Antic = AA2.antic[c]; }
  else ret.delay += pc.shift;
  if (t) { P.curTiles.push(t); if (isSeal(t)) P.lastSealLand = Math.max(P.lastSealLand, ret.delay + ret.dur); }
  return ret;
 }
 const anticAmt = A => { const n = time; if (!A || n < A.on) return 0; const inA = clamp((n - A.on) / F(5)); if (n <= A.land) return inA; return inA * (1 - clamp((n - A.land) / ANT.fade)); };
 const heartbeat = A => { const ph = ((time - A.on) % F(22)) / F(22); return pulse(ph, .18) + .6 * pulse(ph - .24, .16); };
 // which anticipating column lands next (it gets the strong light; the rest wait at a lower level)
 const anticNext = () => { let best = null; for (const [c, A] of Object.entries(AA2.antic)) if (time < A.land && (!best || A.land < best[1].land)) best = [+c, A]; return best ? best[0] : -1; };
 function aa2AnticUnder() { // behind the tiles: a warm shaft in the column well (shows in the gaps and the falling space)
  const nx = anticNext();
  for (const [cs, A] of Object.entries(AA2.antic)) { const I = anticAmt(A); if (I <= .003) continue; const c = +cs, x = cellX(c), lead = c === nx ? 1 : .45, hb = heartbeat(A);
   g.save(); g.globalCompositeOperation = 'lighter';
   const gr = g.createLinearGradient(0, GY - 20, 0, GY + GH + 20); const col = A.heaven ? '255,190,80' : '255,110,40';
   gr.addColorStop(0, `rgba(${col},${(.75 + .25 * hb) * I * lead})`); gr.addColorStop(.5, `rgba(${col},${.38 * I * lead})`); gr.addColorStop(1, `rgba(${col},${(.5 + .3 * hb) * I * lead})`);
   g.fillStyle = gr; g.fillRect(x - 6, GY - 20, C.CELL_W + 12, GH + 40); g.restore(); }
 }
 function aa2AnticOver() { // above the tiles: soft wash, two light rails in the gaps, rising motes, lip slit, contact flare
  const nx = anticNext(), n = time;
  for (const [cs, A] of Object.entries(AA2.antic)) { const I = anticAmt(A), c = +cs, x = cellX(c), lead = c === nx ? 1 : .4, hb = heartbeat(A);
   const flare = n >= A.land ? 1 - clamp((n - A.land) / F(9)) : 0;
   if (I <= .003 && flare <= 0) continue;
   const warm = A.heaven ? '255,214,120' : '255,150,90', hot = A.heaven ? '255,244,200' : '255,226,170';
   g.save(); g.beginPath(); g.rect(x - 24, GY - 36, C.CELL_W + 48, GH + 72); g.clip(); g.globalCompositeOperation = 'lighter';
   // wash: very light on the faces (white stays below clipping)
   const wg = g.createLinearGradient(0, GY, 0, GY + GH); wg.addColorStop(0, `rgba(${warm},${.10 * I * lead})`); wg.addColorStop(1, `rgba(${warm},${.03 * I * lead})`); g.fillStyle = wg; g.fillRect(x - 2, GY - 20, C.CELL_W + 4, GH + 40);
   // lit reel frame: a hot rim around the column with a running light (marquee) and the seals' heartbeat
   const fw = C.CELL_W + 10, fh = GH + 14, fcx = x + C.CELL_W / 2, fcy = GY + GH / 2;
   g.save(); g.translate(fcx, fcy);
   g.shadowColor = `rgba(${warm},1)`; g.shadowBlur = 16 + 14 * hb * lead; g.strokeStyle = `rgba(${hot},${(.55 + .4 * hb) * I * lead})`; g.lineWidth = 2.5 + 2.5 * hb * lead; rr(-fw / 2, -fh / 2, fw, fh, 15); g.stroke(); g.shadowBlur = 0;
   const N = 22, run = n / (lead > .5 ? 900 : 2600);
   for (let i = 0; i < N; i++) { const u = (i / N + run) % 1, [mx, my] = rrPoint(fw, fh, 15, u), tw = .45 + .55 * Math.max(0, Math.sin((i / N) * Math.PI * 6 - n / 120)); const r = 5 + 3 * lead, al = I * lead * tw;
    const mg = g.createRadialGradient(mx, my, 0, mx, my, r * 2.2); mg.addColorStop(0, `rgba(255,250,225,${al})`); mg.addColorStop(.4, `rgba(${warm},${al * .8})`); mg.addColorStop(1, `rgba(${warm},0)`); g.fillStyle = mg; g.fillRect(mx - r * 2.2, my - r * 2.2, r * 4.4, r * 4.4); }
   g.restore();
   // rising motes (hashed, steady speed; 9 per column)
   for (let i = 0; i < 9; i++) { const sp = 900 + 500 * hash(i, c + 50), u = ((n / sp + hash(i, c + 51)) % 1), my = GY + GH + 10 - u * (GH + 30), mx = x + C.CELL_W * (.12 + .76 * hash(i, c + 52)) + Math.sin(n / 260 + i) * 4;
    const a = I * lead * Math.sin(Math.PI * u) * .8; if (a < .02) continue; const mg = g.createRadialGradient(mx, my, 0, mx, my, 7); mg.addColorStop(0, `rgba(${hot},${a})`); mg.addColorStop(1, `rgba(${warm},0)`); g.fillStyle = mg; g.fillRect(mx - 7, my - 7, 14, 14); }
   // lip slit at the frame top: where the anticipated tiles appear; brightens as they come
   const near = n < A.first ? clamp(1 - (A.first - n) / F(14)) : 1;
   const lg = g.createRadialGradient(x + C.CELL_W / 2, GY - 16, 2, x + C.CELL_W / 2, GY - 16, C.CELL_W * .75); lg.addColorStop(0, `rgba(${hot},${(.45 + .5 * near) * I * lead})`); lg.addColorStop(1, `rgba(${warm},0)`);
   g.save(); g.translate(x + C.CELL_W / 2, GY - 16); g.scale(1, .22); g.translate(-(x + C.CELL_W / 2), -(GY - 16)); g.fillStyle = lg; g.fillRect(x - 30, GY - 16 - C.CELL_W, C.CELL_W + 60, C.CELL_W * 2); g.restore();
   // contact flare when the column's last tile lands
   if (flare > 0) { g.strokeStyle = `rgba(${hot},${.85 * flare})`; g.lineWidth = 3 + 5 * flare; g.shadowColor = `rgba(${warm},1)`; g.shadowBlur = 22 * flare; rr(x - 3, GY - 3, C.CELL_W + 6, GH + 6, 14); g.stroke(); }
   g.restore(); }
 }
 const anticDim = t => { const A = t.aa2Antic; if (!A) return 1; if (time > A.land + ANT.fade) { t.aa2Antic = null; return 1; } return .25; }; // tiles in a lit column stay readable through the tension veil

 /* ---- 3) special lands: a distinct, weighted character per symbol (first contact only; a gravity re-land is a light tap) ---- */
 const LANDK = { SYM10_flower: 'flower', SYM11_fan: 'fan', SYM12_rising_fan: 'rising' };
 function aa2Land(t) {
  const k = LANDK[t.id]; if (!k) return; const now = performance.now(), first = !t.aa2Landed; t.aa2Landed = true;
  t.aa2L = { k, t: now, first }; if (!first) return;
  const p = locate(t); if (!p) return; const sd = t.fxId, W2 = C.CELL_W / 2, H2 = C.CELL_H / 2;
  if (k === 'flower') { // petal puff from under the plate, low and wide, then drift down
   for (let i = 0; i < 10; i++) { const side = i % 2 ? 1 : -1, a = (side > 0 ? -.35 : Math.PI + .35) + side * (hash(sd, 200 + i) - .5) * .9;
    const sp = 170 + 150 * hash(i, sd + 201); AA2.parts.push({ type: 'petal', x: p.x + side * W2 * (.55 + .3 * hash(i, sd + 202)), y: p.y + H2 - 18 - 40 * hash(i, sd + 203), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .5 - 150 - 60 * hash(i, sd + 204), rot: hash(i, sd + 205) * 6.28, vr: (hash(i, sd + 206) - .5) * 10, t: now + F(i * .3), dur: F(20 + 6 * hash(i, sd + 207)), size: 20 + 9 * hash(i, sd + 208), v: 1 + i % 4 }); }
   for (let i = 0; i < 3; i++) AA2.parts.push({ type: 'petal', x: p.x + (i - 1) * 30, y: p.y - H2 + 14, vx: (i - 1) * 90, vy: -230 - 40 * hash(i, sd + 209), rot: hash(i, sd + 210) * 6.28, vr: (hash(i, sd + 211) - .5) * 8, t: now + F(1), dur: F(22), size: 22 + 6 * hash(i, sd + 212), v: 1 + (i + 2) % 4 }); // three lift off the crown
   AA2.parts.push({ type: 'puff', x: p.x, y: p.y + H2 - 6, t: now, dur: F(16), r: C.CELL_W * 1.15 });
  } else if (k === 'fan') {
   later(F(5), () => { const q = locate(t); if (!q) return; [-1, 1].forEach((s, i) => AA2.parts.push({ type: 'spark', x: q.x + s * W2 * .78, y: q.y - H2 * .55, vx: s * 70, vy: -60, t: performance.now() + F(i * .5), dur: F(9), size: 13 })); });
   ring(p.x, p.y + 4, 88, { col: '#f6c453', w: 3, dur: F(10), flat: .95, delay: F(2) });
  } else {
   for (let i = 0; i < 14; i++) { const u = hash(sd, 300 + i), side = u < .5 ? -1 : 1, onSide = hash(i, sd + 301) < .45;
    AA2.parts.push({ type: 'ember', x: onSide ? p.x + side * (W2 - 8) : p.x + (u - .5) * C.CELL_W * .8, y: onSide ? p.y + H2 * (.6 - 1.1 * hash(i, sd + 302)) : p.y + H2 - 10, vx: (hash(i, sd + 303) - .5) * 40 + (onSide ? side * 18 : 0), vy: -(70 + 90 * hash(i, sd + 304)), t: now + F(1 + 7 * hash(i, sd + 305)), dur: F(20 + 10 * hash(i, sd + 306)), size: 4 + 4.5 * hash(i, sd + 307), seed: i + sd }); }
   later(F(7), () => { const q = locate(t); if (!q) return; AA2.parts.push({ type: 'spark', x: q.x, y: q.y - H2 + 10, vx: 0, vy: -40, t: performance.now(), dur: F(10), size: 18, hot: true }); });
  }
  if (AA2.parts.length > 160) AA2.parts.splice(0, AA2.parts.length - 160);
  aa2Mark('aa2-land', { kind: k, val: t.val });
 }
 const landAge = t => t.aa2L ? time - t.aa2L.t : 1e9;
 // tile pose on top of the shared contact: {s: uniform scale, rot (pivot = tile bottom centre), dy}
 function aa2LandPose(t) {
  const L = t.aa2L, a = landAge(t); if (!L || !L.first || a > F(14)) return null;
  if (L.k === 'flower') { const s = a < F(3) ? lerp(1, 1.08, eOut(a / F(3))) : a < F(9) ? lerp(1.08, 1, eIO((a - F(3)) / F(6))) : 1; return { s, rot: 0, dy: 0 }; }
  if (L.k === 'fan') { const s = a < F(2) ? lerp(1, 1.09, eOut(a / F(2))) : a < F(10) ? lerp(1.09, 1, eIO((a - F(2)) / F(8))) : 1;
   const rot = a < F(11) ? -4.2 * DEG * Math.exp(-a / F(3)) * Math.cos(Math.PI * 2 * a / F(6.5)) : 0; return { s, rot, dy: 0 }; }
  const s = a < F(4) ? lerp(1, 1.10, eOut(a / F(4))) : a < F(11) ? lerp(1.10, 1, eIO((a - F(4)) / F(7))) : 1;
  return { s, rot: 0, dy: -5 * pulse(a - F(2), F(9)) };
 }
 // value pose: Flower pops .6 → 1.1 → 1 (AA2 A-3); Fan stamps with a flick; Rising Fan rises into place hot
 function aa2ValuePose(t) {
  const L = t.aa2L, a = landAge(t); if (!L) return null;
  if (!L.first) return a < F(5) ? { s: 1 + .05 * pulse(a, F(5)), dy: 0, rot: 0 } : null;
  if (L.k === 'flower' && a < F(9)) return { s: a < F(4) ? lerp(.6, 1.1, eOut(a / F(4))) : lerp(1.1, 1, eIO((a - F(4)) / F(5))), dy: 0, rot: 0 };
  if (L.k === 'fan' && a < F(7)) return { s: a < F(2) ? lerp(1.3, .92, eIn(a / F(2))) : lerp(.92, 1, eOut((a - F(2)) / F(5))), dy: 0, rot: lerp(-7, 0, eOut(clamp(a / F(6)))) * DEG };
  if (L.k === 'rising' && a < F(11)) return { s: a < F(5) ? lerp(.8, 1.14, eOut(a / F(5))) : lerp(1.14, 1, eIO((a - F(5)) / F(6))), dy: lerp(14, 0, eOut(clamp(a / F(6)))), rot: 0 };
  return null;
 }
 // behind the art: contact light under the plate
 function aa2LandUnder(t, w, h) {
  const L = t.aa2L, a = landAge(t); if (!L || !L.first || a > F(13)) return; const q = a / F(13);
  g.save(); g.globalCompositeOperation = 'lighter'; const col = L.k === 'flower' ? '255,214,120' : L.k === 'fan' ? '246,196,83' : '255,120,40';
  const R = w * (L.k === 'rising' ? 1.0 : .9) * (1 + .25 * eOut(q)), gr = g.createRadialGradient(0, h * .22, 4, 0, h * .22, R); gr.addColorStop(0, `rgba(${col},${.55 * (1 - q) ** 1.6})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(-R, h * .22 - R, R * 2, R * 2); g.restore();
 }
 // rounded-rect perimeter point, u in [0,1): 0 = bottom centre, running clockwise (left first)
 function rrPoint(w, h, r, u) {
  const sx = w - 2 * r, sy = h - 2 * r, arc = Math.PI * r / 2, P = 2 * sx + 2 * sy + 4 * arc; let d = ((u % 1) + 1) % 1 * P;
  const segs = [[sx / 2, (s) => [-s, h / 2]], [arc, s => { const an = Math.PI / 2 + s / r; return [-sx / 2 + Math.cos(an) * r, sy / 2 + Math.sin(an) * r]; }], [sy, s => [-w / 2, sy / 2 - s]],
   [arc, s => { const an = Math.PI + s / r; return [-sx / 2 + Math.cos(an) * r, -sy / 2 + Math.sin(an) * r]; }], [sx, s => [-sx / 2 + s, -h / 2]], [arc, s => { const an = -Math.PI / 2 + s / r; return [sx / 2 + Math.cos(an) * r, -sy / 2 + Math.sin(an) * r]; }],
   [sy, s => [w / 2, -sy / 2 + s]], [arc, s => { const an = s / r; return [sx / 2 + Math.cos(an) * r, sy / 2 + Math.sin(an) * r]; }], [sx / 2, s => [sx / 2 - s, h / 2]]];
  for (const [len, f] of segs) { if (d <= len) return f(d); d -= len; } return [0, h / 2];
 }
 // above the art (after the veil, before the value): the character layer
 function aa2LandOver(t, w, h) {
  const L = t.aa2L, a = landAge(t); if (!L || !L.first || a > F(16)) return;
  g.save(); rr(-w / 2, -h / 2, w, h - 4, 14); g.clip();
  if (L.k === 'flower') {
   // a diagonal gold sheen rolls across the plate, plus a rim flash on contact
   const q = clamp((a - F(1)) / F(9)); if (q > 0 && q < 1) { g.globalCompositeOperation = 'lighter'; const xx = lerp(-w * 1.1, w * 1.1, eIO(q)); const gr = g.createLinearGradient(xx - 46, -h * .6, xx + 46, h * .6); gr.addColorStop(0, 'rgba(255,240,190,0)'); gr.addColorStop(.5, `rgba(255,246,214,${.5 * pulse(q, 1) + .1})`); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h); }
   const rf = 1 - clamp(a / F(7)); if (rf > 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,236,170,${.8 * rf})`; g.lineWidth = 5; rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 10, 13); g.stroke(); }
  } else if (L.k === 'fan') {
   // rib flick: seven painted ribs snap open from the left guard about a rivet at the tile's foot, then fade into the lacquer
   const u = eBack(clamp((a - F(.5)) / F(5))), fade = a < F(7) ? 1 : 1 - clamp((a - F(7)) / F(7)), px = 0, py = h / 2 - 16, len = h * .74;
   if (fade > 0) {
    const ang = i => lerp(-82 * DEG, lerp(-64, 64, i / 6) * DEG, u);
    g.globalCompositeOperation = 'lighter'; // light wedge the ribs sweep through
    const wg = g.createRadialGradient(px, py, 10, px, py, len); wg.addColorStop(0, `rgba(246,196,83,${.0})`); wg.addColorStop(.7, `rgba(246,196,83,${.22 * fade})`); wg.addColorStop(1, 'rgba(246,196,83,0)');
    g.fillStyle = wg; g.beginPath(); g.moveTo(px, py); g.arc(px, py, len, -Math.PI / 2 + ang(0), -Math.PI / 2 + ang(6)); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 7; i++) { g.save(); g.translate(px, py); g.rotate(ang(i)); g.globalAlpha = fade * (.55 + .45 * (i === 0 || i === 6 ? 1 : .7));
     if (!artDraw(g, 'fan_rib', len * 600 / 582)) { g.strokeStyle = '#e8b85a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len); g.stroke(); }
     g.restore(); }
    const ef = pulse(a - F(4), F(7)); if (ef > 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,232,160,${.75 * ef})`; g.lineWidth = 3; g.beginPath(); g.arc(px, py, len * .98, -Math.PI / 2 - 64 * DEG, -Math.PI / 2 + 64 * DEG); g.stroke(); }
    g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,236,170,${.8 * fade})`; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); // rivet glint
   }
  } else {
   // ember flick: two heat comets run up the ember rim from the foot and meet at the top, then the whole rim glows and cools
   g.restore(); g.save(); g.globalCompositeOperation = 'lighter';
   const iw = w - 18, ih = h - 22, cy0 = -2, R = 15, q = clamp(a / F(7)), head = .5 * eIO(q);
   for (const dir of [1, -1]) for (let j = 0; j < 18; j++) { const back = j * .012, uu = head - back; if (uu < 0) break; const [ex, ey] = rrPoint(iw, ih, R, dir > 0 ? uu : 1 - uu); const al = (1 - j / 18) * (a < F(9) ? 1 : 1 - clamp((a - F(9)) / F(4)));
    const r0 = j === 0 ? 9 : 6 - j * .2; const eg = g.createRadialGradient(ex, ey + cy0, 0, ex, ey + cy0, r0 * 2); eg.addColorStop(0, `rgba(255,236,170,${al})`); eg.addColorStop(.4, `rgba(255,140,40,${al * .7})`); eg.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = eg; g.fillRect(ex - r0 * 2, ey + cy0 - r0 * 2, r0 * 4, r0 * 4); }
   const rg = pulse(a - F(6), F(10)); if (rg > 0) { g.strokeStyle = `rgba(255,150,60,${.75 * rg})`; g.lineWidth = 4; g.shadowColor = 'rgba(255,110,30,1)'; g.shadowBlur = 18 * rg; rr(-iw / 2, -ih / 2 + cy0, iw, ih, R); g.stroke(); g.shadowBlur = 0; }
   const fl = pulse(a - F(6), F(6)); if (fl > 0) { const fg = g.createRadialGradient(0, -ih / 2 + cy0, 0, 0, -ih / 2 + cy0, 46); fg.addColorStop(0, `rgba(255,244,210,${.9 * fl})`); fg.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = fg; g.fillRect(-46, -ih / 2 + cy0 - 46, 92, 92); }
  }
  g.restore();
 }
 function aa2Parts() { // overlay particles for the lands (petals, puff, embers, sparks); pooled, hashed, no per-frame spawning
  const n = time; AA2.parts = AA2.parts.filter(p => n < p.t + p.dur);
  for (const p of AA2.parts) { const q = (n - p.t) / p.dur; if (q < 0) continue; const d = (n - p.t) / 1000; g.save();
   if (p.type === 'petal') { const drag = Math.exp(-2.4 * d), x = p.x + p.vx * (1 - drag) / 2.4, y = p.y + p.vy * (1 - drag) / 2.4 + 420 * d * d; g.globalAlpha = q < .6 ? 1 : (1 - (q - .6) / .4) ** 1.2; g.translate(x, y); g.rotate(p.rot + p.vr * d); g.scale(1, .75 + .25 * Math.cos(p.rot + d * 9)); const nm = 'petal_var_' + p.v; if (!artDraw(g, FXART.parts[nm] ? nm : '-', p.size * 1.4)) petal(p.size * 1.4, p.size * .6, 1, 1); }
   else if (p.type === 'puff') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .55 * (1 - q) ** 1.5; g.translate(p.x, p.y); g.scale(1.4 * (.6 + .6 * eOut(q)), .45 * (.6 + .6 * eOut(q))); if (!artDraw(g, FXART.parts.dust_puff_2 ? 'dust_puff_2' : '-', p.r * 1.6)) { const gg = g.createRadialGradient(0, 0, 0, 0, 0, p.r); gg.addColorStop(0, 'rgba(255,236,190,.8)'); gg.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gg; g.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); } }
   else if (p.type === 'ember') { g.globalCompositeOperation = 'lighter'; const x = p.x + p.vx * d + Math.sin(d * 7 + p.seed) * 6 * d, y = p.y + p.vy * d + 30 * d * d, fl = .65 + .35 * Math.sin(n / 45 + p.seed * 3), r = p.size * (1 - .5 * q);
    const eg = g.createRadialGradient(x, y, 0, x, y, r * 2.6); eg.addColorStop(0, `rgba(255,240,190,${fl * (1 - q)})`); eg.addColorStop(.35, `rgba(255,140,40,${fl * .8 * (1 - q)})`); eg.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = eg; g.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2); }
   else if (p.type === 'spark') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - q) ** 1.4; g.fillStyle = p.hot ? '#ffd9a0' : '#ffe5a2'; const x = p.x + p.vx * d, y = p.y + p.vy * d; drawStar(x, y, p.size * (1 - .5 * q)); g.rotate(0); g.save(); g.translate(x, y); g.rotate(Math.PI / 2); drawStar(0, 0, p.size * .6 * (1 - .5 * q)); g.restore(); }
   g.restore(); }
 }
 function aa2Probe() { return { plan: AA2.plan && { base: AA2.plan.base, added: AA2.plan.added, cols: JSON.parse(JSON.stringify(AA2.plan.cols)), shift: Math.round(AA2.plan.shift) }, antic: Object.fromEntries(Object.entries(AA2.antic).map(([c, A]) => [c, { on: Math.round(A.on), land: Math.round(A.land), amt: +anticAmt(A).toFixed(3) }])), next: anticNext(), parts: AA2.parts.length, counts: Object.assign({}, AA2.counts), log: AA2.log.slice(-40) }; }
 /* ==================== AA2-MOTION END ==================== */
 const api = { state, begin, backdrop, tile, lifted, overlay, number, mark, accent, logoAlpha, drawValue, tileValue, drawPlate, LAYOUT,
  drawLogo(gg, a = 1) { const L = LAYOUT.logo; if (!ART.logo || a <= 0) return false; gg.save(); gg.globalAlpha *= a; gg.drawImage(ART.logo, L.x, L.y, L.w, L.h); gg.restore(); return true; }, // logo above the win veil (AD layer order)
  paintFan, fanOpenFor, fanRibs, locate, art: FXART, hideFan(on) { state.hideFan = !!on; }, // shared/win dressing hooks (intro / outro Table Fan)
  tileValueMinPx() { return Object.assign({}, tileValue.minPx || {}); },
  valueAudit() { closeAudit(); return { frames: audit.frames, maxPerTile: audit.maxPerTile, multiFrames: audit.multiFrames, samples: audit.multiSamples.slice(), flightOverValueFrames: audit.flightOverValue }; },
  glyphStatus: window.FW_FX.glyphStatus,
  attach(t) { t.fxId = ++uid; return t; },
  press(key) { state.presses[key] = performance.now(); },
  pressScale(key) { return 1 - .045 * pulse(time - (state.presses[key] ?? -1e9), F(8)); },
  bump() { const c = counters.win; if (!c) return 1; const big = state.winFast > time - F(14); return 1 + (big ? .1 : .05) * pulse(time - c.t, F(big ? 12 : 8)); },
  boardOffset() { const s = state.shake; if (!s) return { x: 0, y: 0 }; const q = clamp((time - s.t) / F(s.frames || 6)); return { x: Math.sin(q * 31) * s.amp * (1 - q), y: Math.cos(q * 37) * s.amp * (1 - q) }; },
  hideMsg(m) { return !!m && /^(COUNT THE FAN|TABLE FAN|EIGHT FLOWERS|DOUBLE KONG)/.test(m); },
  preRefill: aa2PreRefill, aa2: { probe: aa2Probe, ANT }, // AA2-MOTION
  handStart() { AA2.plan = null; AA2.antic = {}; state.step = 0; state.hand++; state.hu = 0; state.heaven = 0; state.tension = null; state.ack = null; state.focus = null; state.veilTarget = 0; state.lastCentroid = null; },
  // Deal schedule: shared drop, plus a short hold after each HU / 天和 contact and a slow reveal once
  // three seals (or two + 天和) are already showing. Uses only tiles that have already landed in the
  // schedule; outcomes were fixed before the deal, so this is pure presentation.
  deal(grid) {
   wall.wave = performance.now();
   const list = []; for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) list.push({ c, r, t: grid[c][r], d: c * 67 + (C.ROWS - 1 - r) * 33 });
   list.sort((a, b) => a.d - b.d || a.c - b.c);
   let extra = 0, hu = 0, hv = 0, tense = false, done = false, lastC = -1; const out = {};
   for (const it of list) {
    if (tense && !done && it.c !== lastC) extra += F(9);
    it.d += extra; out[it.c + ',' + it.r] = it.d; lastC = it.c;
    if (isHU(it.t)) { hu++; extra += F(6); } if (isHeaven(it.t)) { hv++; extra += F(9); }
    if (S.mode === 'base' && (hu >= C.BONUS_TRIGGER_HU || (hu >= C.HEAVENLY_HU && hv >= 1)) && !done) { done = true; extra += F(8); } // set acknowledged: hold, then the rest lands at normal pace
    if (!tense && S.mode === 'base' && (hu >= 3 || (hu >= 2 && hv >= 1)) && !(hu >= C.BONUS_TRIGGER_HU || (hu >= C.HEAVENLY_HU && hv >= 1))) { tense = true; extra += F(6); }
   }
   state.dealSched = out;
  },
  dealDelay(c, r) { return state.dealSched ? state.dealSched[c + ',' + r] : c * 67 + (C.ROWS - 1 - r) * 33; },
  land(t) {
   t.fxLand = performance.now();
   aa2Land(t); // AA2-MOTION
   if ((isHU(t) || isHeaven(t)) && !t.fxCounted) {
    t.fxCounted = true; const p = locate(t) || { x: 540, y: 700 }; const big = isHeaven(t);
    t.fxStamp = { t: performance.now(), big };
    const col = big ? '#f2c14e' : '#b3121b', now = performance.now();
    state.inks.push({ type: 'sq', x: p.x, y: p.y, s: C.CELL_W * (big ? 1.08 : .98), t: now, dur: F(big ? 18 : 14), col });
    state.inks.push({ type: 'glow', x: p.x, y: p.y, s: C.CELL_W * (big ? 1.7 : 1.35), t: now, dur: F(big ? 24 : 16), col: big ? '255,210,110' : '230,40,40' });
    // ink splash: four big drops + a spray of small ones, and a splat under the tile that fades
    for (let i = 0; i < 4; i++) { const a = (i / 4 + hash(t.fxId, 90 + i) * .2) * 6.283, d = 105 + 55 * hash(i, t.fxId + 91); state.inks.push({ type: 'drop', x: p.x, y: p.y + 6, dx: Math.cos(a) * d, dy: Math.sin(a) * d * .9, r: 15 + 9 * hash(i, 92 + t.fxId), t: now, dur: F(30), col: big ? '#ffd86a' : '#e8222c' }); }
    for (let i = 0; i < (big ? 14 : 11); i++) { const a = hash(t.fxId * 3 + i, 31) * 6.283, d = 70 + 90 * hash(i, t.fxId); state.inks.push({ type: 'drop', x: p.x, y: p.y + 10, dx: Math.cos(a) * d, dy: Math.sin(a) * d * .85, r: 4 + 7 * hash(i, 77 + t.fxId), t: now, dur: F(26), col: big ? '#ffe08a' : '#ff3a3a' }); }
    (state.splats = state.splats || []).push({ big, x: p.x, y: p.y, r: C.CELL_W * (big ? 1.05 : .95), seed: t.fxId, t: now, dur: F(34), col: big ? 'rgba(242,193,78,.75)' : 'rgba(170,14,22,.8)' });
    ring(p.x, p.y + 70, big ? 160 : 120, { col: big ? '#fff0b0' : '#ff8a7a', w: 8, dur: F(12), flat: .4 });
    ring(p.x, p.y, big ? 180 : 130, { col: big ? '#ffe08a' : '#ff5a4a', w: 5, dur: F(10), flat: 1, delay: F(1) });
    state.shake = { t: now + F(2), amp: big ? 7 : 3.5, frames: big ? 8 : 6 }; // hits on the .88 squash
    if (big) state.rays.push({ x: p.x, y: p.y, n: 14, len: 280, wid: .07, t: now, dur: F(40), alpha: .6 });
    if (isHU(t)) state.hu++; else state.heaven++;
    mark('seal-land', { kind: big ? 'heavenly' : 'hu', value: state.hu + state.heaven * 10 });
    const bonusSet = S.mode === 'base' && state.hu >= C.BONUS_TRIGGER_HU, heavenSet = S.mode === 'base' && state.hu >= C.HEAVENLY_HU && state.heaven >= 1;
    const reSet = S.mode !== 'base' && state.hu >= C.RETRIGGER_HU;
    if ((heavenSet && state.ack !== 'heavenly') || ((bonusSet || reSet) && !state.ack)) {
     state.ack = heavenSet ? 'heavenly' : 'bonus'; state.tension = null; state.veilTarget = 0; state.focus = null;
     const at = F(3);
     later(at, () => { const seals = S.grid.flat().filter(x => x && (isHU(x) || isHeaven(x)));
      seals.forEach((x, i) => { const q = locate(x); x.fxStamp = { t: performance.now() + F(i), big: isHeaven(x) }; if (q) { ring(q.x, q.y, 110, { col: isHeaven(x) ? '#ffd46a' : '#e0353a', w: 4, delay: F(i), dur: F(12) }); } });
      ring(GX + GW / 2, GY + GH / 2, 520, { col: heavenSet ? '#ffe3a0' : '#ff8a70', w: 6, dur: F(16), flat: .9 });
      state.shake = { t: performance.now() + F(2), amp: heavenSet ? 8 : 6, frames: 8 };
      if (heavenSet) { const h = seals.find(isHeaven), q = h && locate(h); if (q) state.rays.push({ x: q.x, y: q.y, n: 18, len: 620, wid: .05, t: performance.now(), dur: F(46), alpha: .45 }); }
      mark('set-ack', { kind: state.ack });
     });
    } else if (S.mode === 'base' && !state.tension && (state.hu >= 3 || (state.hu >= 2 && state.heaven >= 1))) {
     state.tension = { t: performance.now() }; state.focus = new Set(S.grid.flat().filter(x => x && (isHU(x) || isHeaven(x)))); state.veilTarget = .34; mark('tension');
    }
   } else if (state.tension && (isHU(t) || isHeaven(t))) { /* re-land of a seal during gravity: keep focus */ }
   if (state.tension && state.focus && (isHU(t) || isHeaven(t))) state.focus.add(t);
  },
  async wins(wins, wait) {
   if (!wins.length) return;
   const k = speed(); let hold = 0, peakAll = 1;
   state.focus = new Set(); state.veilTarget = .38; const now = performance.now();
   let cx = 0, cy = 0, cn = 0;
   for (const w of wins) {
    const rk = Number(w.id.slice(3, 5)) - 1, tier = Math.min(4, w.n - 8), peak = 1.03 + rk * .009 + tier * .003;
    peakAll = Math.max(peakAll, peak); hold = Math.max(hold, (14 + rk * 1.5 + tier) * k);
    const pts = w.cells.map(([c, r]) => ({ x: cellX(c) + C.CELL_W / 2, y: cellY(r) + C.CELL_H / 2 }));
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    w.cells.forEach(([c, r]) => { const t = S.grid[c][r]; t.fxLit = { t: now, peak }; state.focus.add(t); });
    cx += mx; cy += my; cn++;
    state.amounts.push({ x: mx, y: my + (cn - 1) * 74, pay: w.pay, h: 56 + Math.min(14, rk * 1.6), t: now + F(3), countDur: F(Math.max(7, 11 * k)), fly: 0, arrive: 1e15 });
   }
   state.lastCentroid = { x: cx / cn, y: cy / cn };
   const rkTop = Math.max(...wins.map(w => Number(w.id.slice(3, 5)) - 1));
   ring(state.lastCentroid.x, state.lastCentroid.y, 150 + rkTop * 10, { col: '#ffe5a2', w: 3, dur: F(12), flat: .8 });
   if (rkTop >= 5) burst(state.lastCentroid.x, state.lastCentroid.y, 2 + rkTop - 5, { speed: 160, size: 18 });
   mark('win-set', { groups: wins.length });
   await wait(F(hold));
   // amounts hold through the break, then fly to TOTAL WIN; the HUD count waits for their arrival
   const crack = F(Math.max(4, 6 * k)), flyAt = performance.now() + crack + F(4 * k), arrive = flyAt + F(Math.max(6, 9 * k));
   state.amounts.forEach(m => { if (m.arrive > 1e14) { m.fly = flyAt; m.arrive = arrive; } });
   state.winHoldUntil = arrive;
   later(arrive - performance.now(), () => { totalHit(); boxRing(TOTAL, { col: '#ffe5a2', w: 3, dur: F(10) }); });
   state.step++;
  },
  liftMs() { return F(Math.max(4, 6 * Math.max(.62, 1 - .14 * (state.step - 1)))); },
  settleMs(rows) { const k = Math.max(.62, 1 - .14 * (state.step - 1)); return F(Math.max(6, (8 + rows * .8) * k)); },
  // A column's refill: the new block drops in from above the reels, clipped to the frame (timing unchanged).
  refill(c, r, nNew, t) {
   const k = Math.max(.62, 1 - .14 * (state.step - 1)), now = performance.now();
   if (!state.refillCols || state.refillCols.stamp !== state.step) { state.refillCols = { stamp: state.step, done: {}, last: 0 }; }
   const rc = state.refillCols;
   if (state.focus && !state.tension) { state.focus = null; state.veilTarget = 0; }
   if (state.tension) state.veilTarget = .34;
   const ret = { fromY: -nNew * PITCH_Y - 24, dur: F(Math.max(7, (7 + nNew * 1.4) * k)), delay: F(5 + c * .7) + (nNew - 1 - r) * F(1.5) };
   aa2RefillPlan(c, r, nNew, t, ret, k); // AA2-MOTION: anticipation slow-drop (presentation timing only)
   // when does this tile's bottom edge reach the board clip? (game tween: 'in' = p², from fromY to +7)
   const clipTop = GY - 20, Y0 = cellY(r) + ret.fromY + C.CELL_H, D = clipTop - Y0, tot = 7 - ret.fromY;
   const p = D <= 0 ? 0 : Math.sqrt(clamp(D / tot)), enter = now + ret.delay + p * ret.dur;
   const depart = Math.max(now, enter - F(9));
   if (t) wall.feeds.push({ t, c, r, depart, enter, from: { x: cellX(c) + C.CELL_W / 2, y: (LAYOUT.frame && LAYOUT.frame.y) || 346.4 } });
   rc.last = Math.max(rc.last, enter);
   return ret;
  },
  risingTick(t, from, to) {
   const now = performance.now(), src = state.lastCentroid;
   const prev = t.fxTick && now < t.fxTick.t + F(11) ? t.fxTick : null; // grows twice in one hand: chain, never stack
   t.fxTick = { t: Math.max(now + F(6), prev ? prev.t + F(11) : 0), from, to };
   const p = locate(t);
   if (src && p) state.flights.push({ spark: true, from: src, to: p, t: now, dur: F(6), h: 1, arc: 40, onHit: () => { const q = locate(t); if (q) { ring(q.x, q.y, 80, { col: '#ffcf6a', w: 4, dur: F(10), flat: .8 }); burst(q.x, q.y - 40, 3, { speed: 90, size: 12, col: '#ffd46a' }); } } });
   later(F(6), () => accent(t, 1.14, 10));
  },
  prepareFan() { state.oldTableFan = S.tableFan; state.fanPending = true; state.tension = null; if (!state.count) { state.veilTarget = 0; state.focus = null; } },
  tableFanNumber() { return state.count && state.count.kind === 'fan' ? state.count.running : (state.fanPending && S.mode !== 'base' ? state.oldTableFan : S.tableFan); },
  async count(tiles, kind, wait, info = {}) {
   const bonus = S.mode !== 'base', mult = info.mult;
   mark('count-start', { kind, values: tiles.map(t => t.val) });
   state.count = { kind: 'fan', running: bonus ? state.oldTableFan : 0, charge: 0 };
   state.fanHold = true; FAN.alphaT = 1; FAN.hero = 1; FAN.tx = FO.x; FAN.ty = FO.y; FAN.Rt = FO.R;
   if (!bonus) { FAN.label = null; FAN.openT = .05; if (FAN.alpha < .05) { FAN.px = FR.x; FAN.py = FR.y; FAN.R = FR.R; FAN.open = 0; } } else FAN.openT = fanOpenFor(state.count.running);
   state.focus = new Set(tiles); state.veilTarget = .5; state.count.raise = null; // win pass: board tiles stay UNDER the open fan; only their value copies fly above it
   await wait(F(10));
   const N = tiles.length, st = Math.max(4, Math.min(9, Math.round(36 / Math.max(1, N)))), now = performance.now();
   const total = bonus ? mult : tiles.reduce((s, t) => s + t.val, 0);
   tiles.forEach((t, i) => state.flights.push({ kind: t.id === 'SYM12_rising_fan' ? 'rising' : 'fan', val: t.val, tile: t, from: null, to: { x: FO.x, y: FO.y - FO.R * .6 }, t: now + F(i * st), dur: F(10), h: 40, s0: 1.1, s1: 1.9, arc: 50,
    onHit: () => { state.count.running += t.val; FAN.pop = performance.now(); FAN.openT = bonus ? fanOpenFor(state.count.running) : clamp(state.count.running / total, .14, 1); ring(FO.x, FO.y - FO.R * .6, 110, { col: '#ffe5a2', w: 3, dur: F(8), flat: .7 }); } }));
   if (N) await wait(F((N - 1) * st + 10 + 4));
   state.count.running = bonus ? mult : total; FAN.openT = bonus ? fanOpenFor(mult) : 1; // exact commit
   state.count.charge = performance.now(); FAN.flick = performance.now();
   await wait(F(7));
   const v = bonus ? mult : total;
   state.slam = { v, from: { x: FO.x, y: FO.y - FO.R * .6 }, to: { x: MULT.x, y: MULT.y }, t: performance.now(), dur: F(9), h: 74, // lands on the mid-table multiplier badge
    onHit: () => { state.stamp = { v, x: MULT.x, y: MULT.y, h: 64, t: performance.now(), dur: F(6.6) }; state.shake = { t: performance.now(), amp: 4, frames: 6 }; boxRing(MULT, { col: '#ffe5a2', w: 4, dur: F(9) }); burst(MULT.x, MULT.y, 10, { speed: 220, size: 16 }); } };
   await wait(F(9));
   state.winFast = performance.now() + F(2); state.winHoldUntil = 0;
   state.count.charge = 0; mark('count-end', { kind, value: v });
   later(F(2), () => { state.count = null; state.fanPending = false; tiles.forEach(t => { if (t.fxOut && t.fxOut.state === 'out') t.fxOut = { state: 'back', t: performance.now() }; }); });
   later(F(20), () => { state.fanHold = false; state.veilTarget = 0; state.focus = null; if (!bonus) FAN.label = v; });
   if (!bonus) later(F(34), () => { FAN.label = null; });
  },
  async flowers(cells, wait, pay) {
   const tiles = cells.map(([c, r]) => S.grid[c][r]); const now0 = performance.now();
   state.focus = new Set(tiles); state.veilTarget = .45;
   tiles.forEach(t => { t.fxLit = { t: now0, peak: 1.06 }; });
   mark('flowers-start', { values: tiles.map(t => t.val) });
   await wait(F(3));
   const b = state.bloom = { x: GX + GW / 2, y: GY + GH / 2 - 10, t0: performance.now(), petals: [], sum: 0, n: tiles.length, pay };
   const N = tiles.length, st = Math.max(2, Math.min(4, Math.round(24 / N))), now = performance.now();
   tiles.forEach((t, i) => state.flights.push({ kind: 'flower', val: t.val, tile: t, keepOut: true, from: null, to: { x: b.x, y: b.y }, t: now + F(2 + i * st), dur: F(7), h: 36, s0: 1.05, s1: 1.4, arc: 50,
    onHit: () => { b.sum = Math.round((b.sum + t.val) * 100) / 100; b.pop = performance.now(); b.petals.push({ t: performance.now() }); t.fxLit = null; } }));
   await wait(F(2 + (N - 1) * st + 7 + 1));
   b.sum = Math.round(tiles.reduce((s, t) => s + t.val, 0) * 100) / 100; while (b.petals.length < N) b.petals.push({ t: performance.now() });
   b.full = performance.now(); await wait(F(3));
   b.burst = performance.now(); b.money = true; b.keepSum = true;
   for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; state.particles.push({ petal: true, x: b.x, y: b.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 280 - 60, rot: a + Math.PI / 2, vr: (hash(i, 5) - .5) * 6, t: performance.now(), dur: F(22), size: 18 }); }
   ring(b.x, b.y, 300, { col: '#ffe08a', w: 6, dur: F(14), flat: .9 }); state.shake = { t: performance.now(), amp: 2, frames: 5 };
   await wait(F(7));
   const fl = performance.now();
   b.money = false; state.bloom = null;
   state.amounts.push({ x: b.x, y: b.y + 30, pay, h: 74, t: fl - F(20), countDur: F(1), fly: fl, arrive: fl + F(8) });
   state.winHoldUntil = fl + F(8);
   later(F(8), () => { totalHit(); boxRing(TOTAL, { col: '#ffe08a', w: 3, dur: F(10) }); });
   await wait(F(8));
   state.lastCentroid = { x: b.x, y: b.y };
   mark('flowers-end', { value: b.sum });
  },
  trigger(kind) {
   const heavenly = kind === 'heavenly', now = performance.now();
   state.shake = { t: now, amp: heavenly ? 3 : 2, frames: 6 };
   S.grid.flat().filter(t => t && (isHU(t) || isHeaven(t))).forEach((t, i) => { t.fxStamp = { t: now + F(i * 1.5), big: isHeaven(t) }; const q = locate(t); if (q) ring(q.x, q.y, 120, { col: isHeaven(t) ? '#ffd46a' : '#e0353a', w: 5, delay: F(i * 1.5), dur: F(12) }); });
   if (kind !== 'retrigger') {
    ring(FP.x, FP.y - FP.R * .55, heavenly ? 200 : 160, { col: heavenly ? '#ffe3a0' : '#ffb08a', w: 6, dur: F(16), flat: .7 });
    if (heavenly) state.rays.push({ x: 540, y: -60, n: 15, len: 1500, wid: .035, t: now, dur: F(50), alpha: .32 });
    burst(FP.x, FP.y - FP.R * .55, heavenly ? 20 : 14, { speed: 200, size: 14 });
    FAN.pop = now + F(10);
   } else ring(FP.x, FP.y - FP.R * .55, 140, { col: '#ffb08a', w: 4, dur: F(12), flat: .7 });
   mark('trigger', { kind });
  },
 };
 return api;
}};
})();
