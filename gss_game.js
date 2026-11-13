// FOUR WINDS 四風 — GSS_GAME for shared/win (STANDARDS §8). Presentation only: ids, strings, rects,
// glyph sets, title type and the per-game dressing (plum petals, four wind ribbons, Wall tiles, Table Fan).
// Loads after win/standard.js + win/gss-win.js and before game.js. No Math.random (hashed motion only).
(function () {
const W = 1080, H = 1920, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - clamp(t), 3), eIn = t => clamp(t) ** 2, eIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t, s = 1.7) => { t = clamp(t) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };
const hash = (i, s) => GSSWin.hash(i, s), pulse = (t, d) => t >= 0 && t < d ? Math.sin(Math.PI * t / d) : 0;
const FX = () => window.FW && window.FW.FX;

// ---- title type: Cinzel Decorative Black (SIL OFL, assets/fonts/), crafted gold per letter ----
const TITLE_FAMILY = 'GSS Title 002';
let fontGen = 0;
try { const ff = new FontFace(TITLE_FAMILY, 'url(assets/fonts/CinzelDecorative-Black.ttf)', { weight: '900' }); document.fonts.add(ff); ff.load().then(() => { fontGen++; }).catch(() => {}); } catch (e) {}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontGen++; });

// ---- art used by the dressing (reused plates and live tiles; nothing baked, nothing edited) ----
const IMG = {}; [['table', 'assets/board/table_portrait.png'], ['wall_back', 'assets/presentation/wall_flip_back.png'], ['wall_edge', 'assets/presentation/wall_flip_edge.png'],
  ['ink1', 'assets/presentation/ink_splat_1.png'], ['ink2', 'assets/presentation/ink_splat_2.png'], ['ink3', 'assets/presentation/ink_splat_3.png']].forEach(([k, s]) => { const im = new Image(); im.onload = () => { IMG[k] = im; }; im.src = s; });
const ART = id => (window.FW_ART || {})[id];

// ---- painters ----
function blossom(g, x, y, r, rot, a, warm) { // five-petal plum blossom, gold (warm = pinker gold)
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a;
  for (let i = 0; i < 5; i++) { g.save(); g.rotate(i * TAU / 5); const pg = g.createRadialGradient(0, -r * .55, r * .05, 0, -r * .5, r * .62);
    pg.addColorStop(0, '#fffbe8'); pg.addColorStop(.55, warm ? '#ffd6a0' : '#ffe08a'); pg.addColorStop(1, warm ? '#e08a4a' : '#d99a2a'); g.fillStyle = pg;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-r * .62, -r * .25, -r * .5, -r * 1.02, 0, -r * .92); g.bezierCurveTo(r * .5, -r * 1.02, r * .62, -r * .25, 0, 0); g.fill();
    g.strokeStyle = 'rgba(140,70,10,.45)'; g.lineWidth = Math.max(1, r * .05); g.stroke(); g.restore(); }
  g.fillStyle = '#b8261c'; g.beginPath(); g.arc(0, 0, r * .2, 0, TAU); g.fill();
  g.fillStyle = '#ffe9a0'; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * r * .3, Math.sin(a) * r * .3, r * .06, 0, TAU); g.fill(); }
  g.restore();
}
const WIND_COL = [['#e8443c', '#8c1016'], ['#ffe08a', '#c07a12'], ['#3cd0b8', '#0e6a62'], ['#6a74e0', '#232a80']]; // cinnabar, gold, teal, indigo
function ribbon(g, pts, w, cols, a) { // a twisting silk ribbon along a polyline (lit faces vs back faces)
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0, tw0] = pts[i], [x1, y1, tw1] = pts[i + 1], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const w0 = w * Math.cos(tw0) * (1 - i / pts.length * .6), w1 = w * Math.cos(tw1) * (1 - (i + 1) / pts.length * .6);
    g.globalAlpha = a; g.fillStyle = (Math.cos(tw0) > 0) ? cols[0] : cols[1];
    g.beginPath(); g.moveTo(x0 + nx * w0, y0 + ny * w0); g.lineTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x1 - nx * w1, y1 - ny * w1); g.lineTo(x0 - nx * w0, y0 - ny * w0); g.closePath(); g.fill();
    if (Math.abs(Math.sin(tw0)) < .35) { g.fillStyle = 'rgba(255,250,230,.35)'; g.fill(); }
  }
  g.globalAlpha = 1;
}
function windRibbons(g, t, P, k = 1) { // Mega+: four wind ribbons curl in from the four corners
  const top = Math.min(P.hudTop - 40, H), corners = [[-40, -40], [W + 40, -40], [W + 40, top], [-40, top]];
  corners.forEach(([cx, cy], j) => {
    const rev = eOut((t - j * 90) / 700); if (rev <= 0) return; const N = 34, pts = [];
    const tx = W / 2 + (cx < W / 2 ? -1 : 1) * 250, ty = (cy < 0 ? 560 : 1180), sw = (j % 2 ? -1 : 1);
    for (let i = 0; i <= N; i++) { const u = i / N * rev; const bx = lerp(cx, tx, u), by = lerp(cy, ty, eOut(u)) ; const curl = Math.sin(u * 5.2 + t / 520 + j) * 46 * u + sw * Math.sin(u * Math.PI) * 120;
      pts.push([bx + curl * .6, by + curl * .8 * sw, u * 7 + t / 380 + j * 1.3]); }
    ribbon(g, pts, 26 * k, WIND_COL[j], .95);
  });
}
function wallTile(g, x, y, w, h, rot, face, a) { // face-up tile tumbling (ivory face on jade back)
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a;
  g.fillStyle = '#0e6b52'; GSSUI.rr(g, -w / 2 + 3, -h / 2 + 5, w, h, w * .14); g.fill();
  const iv = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); iv.addColorStop(0, '#fffaf0'); iv.addColorStop(1, '#e2d2ae'); g.fillStyle = iv; GSSUI.rr(g, -w / 2, -h / 2, w, h - 4, w * .14); g.fill();
  g.strokeStyle = 'rgba(120,90,40,.5)'; g.lineWidth = 1.5; g.stroke();
  const ch = ['東', '南', '西', '北'][face % 4], col = ['#1d7a46', '#b2222a', '#5b3f8f', '#1d5e8c'][face % 4];
  g.fillStyle = col; g.font = `bold ${h * .55}px "Noto Serif CJK SC","Songti SC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 0, 0);
  g.restore();
}
function chop(g, x, y, s, a, rot = -.05) { // 胡 red ink chop (presentation-only motif)
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a;
  g.fillStyle = 'rgba(60,4,4,.35)'; GSSUI.rr(g, -s / 2 + 5, -s / 2 + 7, s, s, s * .12); g.fill();
  const cg = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); cg.addColorStop(0, '#e2342c'); cg.addColorStop(1, '#9c1010'); g.fillStyle = cg;
  g.beginPath(); for (let i = 0; i <= 40; i++) { const q = i / 40, side = Math.min(3, Math.floor(q * 4)), f = q * 4 - side, j = (hash(i, 9) - .5) * s * .03;
    const p = [[-1, -1], [1, -1], [1, 1], [-1, 1]][side], n = [[1, -1], [1, 1], [-1, 1], [-1, -1]][side]; const xx = lerp(p[0], n[0], f) * s / 2 + j, yy = lerp(p[1], n[1], f) * s / 2 + j; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,230,210,.85)'; g.lineWidth = s * .035; GSSUI.rr(g, -s * .38, -s * .38, s * .76, s * .76, s * .06); g.stroke();
  g.fillStyle = '#fff3e6'; g.font = `bold ${s * .58}px "Noto Serif CJK SC","Songti SC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('胡', 0, s * .03);
  g.restore();
}
// AD layout_outro.json malachite.portrait.epic.wallTiles (portrait: back + edge poses only, never the ivory face)
const EPIC_WALL = [{"pose":"back","x":145,"y":409,"rotation":-24,"scale":1.0,"fall_delay_ms":0},{"pose":"back","x":972,"y":368,"rotation":31,"scale":0.85,"fall_delay_ms":140},{"pose":"edge","x":420,"y":300,"rotation":12,"scale":0.85,"fall_delay_ms":60},{"pose":"edge","x":660,"y":330,"rotation":-14,"scale":0.85,"fall_delay_ms":220},{"pose":"back","x":70,"y":640,"rotation":18,"scale":1.2,"fall_delay_ms":300},{"pose":"edge","x":1010,"y":660,"rotation":-30,"scale":1.0,"fall_delay_ms":90},{"pose":"back","x":60,"y":940,"rotation":-38,"scale":0.85,"fall_delay_ms":380},{"pose":"edge","x":1020,"y":960,"rotation":22,"scale":1.2,"fall_delay_ms":180},{"pose":"back","x":274,"y":400,"rotation":52,"scale":0.7,"fall_delay_ms":260},{"pose":"back","x":830,"y":420,"rotation":-48,"scale":0.7,"fall_delay_ms":440},{"pose":"edge","x":17,"y":1127,"rotation":15,"scale":0.85,"fall_delay_ms":340},{"pose":"back","x":1052,"y":1105,"rotation":-12,"scale":0.7,"fall_delay_ms":500}];
function epicWallTiles(g, t) { if (!IMG.wall_back) return;
  EPIC_WALL.forEach((w, i) => { const lt = t - w.fall_delay_ms; if (lt < 0) return; const q = clamp(lt / 650);
    const y = w.y - 320 * (1 - eOut(q)) + Math.sin(lt / 900 + i) * 6, x = w.x + Math.sin(lt / 1300 + i * 2) * 5, rot = (w.rotation + (1 - eOut(q)) * (i % 2 ? 40 : -40) + Math.sin(lt / 1100 + i) * 4) * Math.PI / 180;
    const flip = Math.floor(lt / 260 + i) % 4, pose = q < 1 ? (flip % 2 ? 'wall_edge' : 'wall_back') : (w.pose === 'edge' ? 'wall_edge' : 'wall_back'); // tumble back↔edge while falling, settle on the AD pose
    const im = IMG[pose]; if (!im) return; g.save(); g.globalAlpha = clamp(lt / 120); g.translate(x, y); g.rotate(rot); g.scale(w.scale, w.scale); g.drawImage(im, -im.width / 2, -im.height / 2); g.restore(); }); }
// approved AD ink splats under chop stamps (procedural splat stays as the fallback)
function inkSplat(g, x, y, size, a, seed) { const im = IMG['ink' + (1 + (seed % 3))]; if (!im || a <= 0) return false; const k = size / Math.max(im.width, im.height);
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate((hash(seed, 31) - .5) * .8); g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); g.restore(); return true; }
function splat(g, x, y, r, q, seed) { if (q <= 0 || q >= 1) return; g.save(); g.globalAlpha = (1 - q) * .8; g.fillStyle = '#b8141c';
  for (let i = 0; i < 9; i++) { const a = hash(i, seed) * TAU, d = r * (.8 + 1.2 * hash(i, seed + 1)) * eOut(q * 3), rr = r * .12 * (1 + hash(i, seed + 2)); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * (1 - q * .5), 0, TAU); g.fill(); }
  g.restore(); }
function lampGlow(g, a, white) { g.save(); g.globalCompositeOperation = 'lighter'; const lg = g.createRadialGradient(540, 40, 20, 540, 380, 900);
  lg.addColorStop(0, white ? `rgba(255,248,222,${.55 * a})` : `rgba(255,214,130,${.45 * a})`); lg.addColorStop(.5, white ? `rgba(200,255,230,${.12 * a})` : `rgba(255,170,80,${.1 * a})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg; g.fillRect(0, 0, W, H); g.restore(); }
function rays(g, x, y, n, len, a, rot) { g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(rot);
  for (let i = 0; i < n; i++) { g.rotate(TAU / n); const rg = g.createLinearGradient(0, 0, 0, -len); rg.addColorStop(0, `rgba(255,224,150,${.38 * a})`); rg.addColorStop(1, 'rgba(255,224,150,0)'); g.fillStyle = rg; g.beginPath(); g.moveTo(-14, 0); g.lineTo(-58, -len); g.lineTo(58, -len); g.lineTo(14, 0); g.closePath(); g.fill(); }
  g.restore(); }
function emblem(g, x, y, s, t, a) { // 天和 (presentation-only emblem, code-drawn placeholder for the AD parts)
  g.save(); g.translate(x, y); g.globalAlpha *= a;
  const d = g.createRadialGradient(-s * .1, -s * .12, s * .05, 0, 0, s * .42); d.addColorStop(0, '#c8ffe8'); d.addColorStop(.5, '#3fd1a0'); d.addColorStop(1, '#0c6a50'); g.fillStyle = d; g.beginPath(); g.arc(0, 0, s * .4, 0, TAU); g.fill();
  g.save(); g.rotate(t / 12000 * TAU); g.strokeStyle = '#ffd470'; g.lineWidth = s * .045; g.beginPath(); g.arc(0, 0, s * .45, 0, TAU); g.stroke();
  for (let i = 0; i < 24; i++) { g.rotate(TAU / 24); g.fillStyle = i % 2 ? '#fff0b0' : '#c8902a'; g.fillRect(-s * .012, -s * .49, s * .024, s * .07); } g.restore();
  g.fillStyle = '#fff3c4'; g.strokeStyle = '#6a3a08'; g.lineWidth = s * .02; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${s * .27}px "Noto Serif CJK SC",serif`;
  g.strokeText('天', 0, -s * .14); g.fillText('天', 0, -s * .14); g.strokeText('和', 0, s * .15); g.fillText('和', 0, s * .15);
  g.restore();
}
function clouds(g, t, a, y0) { g.save(); g.globalAlpha *= a;
  for (let i = 0; i < 9; i++) { const x = (hash(i, 31) * 1400 - 160 + Math.sin(t / 8000 * TAU + i) * 30), y = y0 + (i % 3) * 330 + hash(i, 32) * 90, r = 90 + 70 * hash(i, 33);
    const cg = g.createRadialGradient(x, y, r * .2, x, y, r); cg.addColorStop(0, 'rgba(255,246,210,.55)'); cg.addColorStop(.6, 'rgba(160,230,200,.28)'); cg.addColorStop(1, 'rgba(160,230,200,0)'); g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, r * 1.6, r, 0, 0, TAU); g.fill(); }
  g.restore(); }
function pill(g, x, y, w, h, a) { g.save(); g.globalAlpha *= a; GSSUI.rr(g, x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = 'rgba(4,22,14,.78)'; g.fill(); g.strokeStyle = 'rgba(242,214,150,.75)'; g.lineWidth = 2; g.stroke(); g.restore(); }
function tileImg(g, id, x, y, w, a) { const im = ART(id); if (!im) return; const h = w * im.height / im.width; g.save(); g.globalAlpha *= a; g.drawImage(im, x - w / 2, y - h / 2, w, h); g.restore(); return h; }
const PARK = () => (FX() && FX().LAYOUT.fanPark) || { x: 920, y: 198, R: 108 };
const FAN_B = 2 / 14; // x1 pose: one rib pair (matches fx fanOpenFor)
const openFor = v => FX() ? FX().fanOpenFor(v) : FAN_B;
const ribsFor = v => FX() && FX().fanRibs ? FX().fanRibs(v) : Math.round(2 + 12 * Math.max(0, Math.min(1, Math.log(Math.max(1e-9, v)) / Math.log(200))));
const valFor = open => open <= FAN_B ? 1 : Math.max(1, Math.round(Math.exp((open - FAN_B) / (1 - FAN_B) * Math.log(200)))); // inverse of fx fanOpenFor (display only)

// ---- AD presentation sprites (assets/presentation/, copied unedited from assets/screen/03_presentation/) ----
const SPR = {};
['bonus_hands_portrait_plate_nolamp', 'heavenly_hand_portrait_plate_nolamp', 'lamp', 'lamp_glow', 'lamp_glow_bright', 'lamp_glow_whitegold',
 'tablefan_pose_x1_R400', 'tablefan_gold_pose_open_R420', 'tablefan_gold_pose_x1_R420', 'hu_chop', 'felt_pill_490x147', 'felt_pill_820x144', 'felt_pill_490x144',
 'emblem_disc', 'emblem_ring', 'emblem_tian', 'emblem_he', 'emblem_ear_left', 'emblem_ear_right', 'cloud_large_a', 'cloud_large_b', 'cloud_large_c', 'cloud_wisp_1', 'cloud_wisp_2',
 'ray_burst', 'gold_spark_1', 'gold_spark_2', 'gold_spark_3', 'gold_spark_4', 'gold_spark_5', 'gold_spark_6',
 'wind_ribbon_cinnabar', 'wind_ribbon_gold', 'wind_ribbon_teal', 'wind_ribbon_indigo', 'petal_1', 'petal_2', 'petal_3', 'petal_4',
 'outro_backing_win_portrait_base', 'outro_backing_win_portrait_big', 'outro_backing_win_portrait_mega', 'outro_backing_win_portrait_epic', 'outro_backing_table_fan_portrait',
 'retrigger_backing_portrait', 'retrigger_backing_portrait_heavenly'].forEach(n => { const im = new Image(); im.onload = () => { SPR[n] = im; }; im.src = 'assets/presentation/' + n + '.png'; });
// o = { s, rot (rad), a, piv [x,y] in image px (default centre), add (additive), flip }
// AD 天和 emblem rest layout (portrait), read from assets/presentation/layout_heavenly_hand.json when served; embedded copy for file://
let EMBLEM = { centre: [540, 720], layers: { ear_left: { centre: [254, 761.5], scale: .29959 }, ear_right: { centre: [826, 761.5], scale: .29959 }, emblem_disc: { centre: [539.5, 719.5], scale: .38262 },
  emblem_ring: { centre: [539.5, 720.5], scale: .44369 }, emblem_tian: { centre: [420.5, 720], scale: .21551 }, emblem_he: { centre: [659.5, 720.5], scale: .21397 } } };
if (location.protocol !== 'file:' && window.fetch) fetch('assets/presentation/layout_heavenly_hand.json').then(r => r.ok ? r.json() : null).then(d => { const e = d && d.portrait && d.portrait.emblem;
  if (e && e.layers && e.centre) { const L = {}; Object.keys(EMBLEM.layers).forEach(k => { const v = e.layers[k]; L[k] = v && v.centre && v.scale ? { centre: v.centre, scale: v.scale } : EMBLEM.layers[k]; }); EMBLEM = { centre: e.centre, layers: L }; } }).catch(() => {});
function spr(g, n, x, y, o = {}) { const im = SPR[n]; if (!im) return false; const s = o.s ?? 1, a = o.a ?? 1; if (a <= 0) return true;
  g.save(); if (o.add) g.globalCompositeOperation = 'lighter'; g.globalAlpha *= a; g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(s * (o.flip ? -1 : 1), s);
  const p = o.piv || [im.width / 2, im.height / 2]; g.drawImage(im, -p[0], -p[1]); g.restore(); return true; }
function sprRect(g, n, r, a = 1, add) { const im = SPR[n]; if (!im || a <= 0) return !!im; g.save(); if (add) g.globalCompositeOperation = 'lighter'; g.globalAlpha *= a; g.drawImage(im, r[0], r[1], r[2] - r[0], r[3] - r[1]); g.restore(); return true; }
// lamp glows are RGB-on-black and do not reach black at the sides: AD 140 px smoothstep side mask, baked once per glow
const MASKED = {};
function maskedGlow(n) { if (MASKED[n]) return MASKED[n]; const im = SPR[n]; if (!im) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); const m = 140 / .90756 / im.width, gr = x.createLinearGradient(0, 0, im.width, 0);
  [[0, 0], [.25, .156], [.5, .5], [.75, .844], [1, 1]].forEach(([u, v]) => { gr.addColorStop(u * m, `rgba(0,0,0,${v})`); gr.addColorStop(1 - u * m, `rgba(0,0,0,${v})`); });
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = gr; x.fillRect(0, 0, im.width, im.height); return (MASKED[n] = c); }
// AD lamp (layout_*: lamp_pivot 537,-409.2 scale .5029; glow rect y100 scale .90756) with a slow chain swing
const LAMP = { px: 537, py: -409.2, s: .5029, gs: .90756 };
function lamp(g, t, glowName, glowA, a = 1, swing = 1) { const sw = (Math.sin(t / 2600 * TAU) * 1.6 + Math.sin(t / 1100 * TAU) * .4) * swing * Math.PI / 180;
  g.save(); g.globalAlpha *= a; g.translate(LAMP.px, LAMP.py); g.rotate(sw);
  const mg = glowName && maskedGlow(glowName); if (mg && glowA > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= glowA; g.drawImage(mg, -593 * LAMP.gs, 100 - LAMP.py, mg.width * LAMP.gs, mg.height * LAMP.gs); g.restore(); }
  if (SPR.lamp) { g.scale(LAMP.s, LAMP.s); g.drawImage(SPR.lamp, -430.5, 0); }
  g.restore(); }
function chevron(g, r, a) { const [x0, y0, x1, y1] = r; g.save(); g.globalAlpha *= a; g.strokeStyle = '#f2cf6b'; g.lineWidth = 3; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0 + 3, y0 + 3); g.lineTo(x1 - 3, (y0 + y1) / 2); g.lineTo(x0 + 3, y1 - 3); g.stroke(); g.restore(); }
function huChop(g, x, y, size, a, rot = -.05, edge) { const im = SPR.hu_chop; if (!im) { chop(g, x, y, size, a, rot); return; } const k = size / im.width;
  if (edge) { g.save(); g.shadowColor = 'rgba(26,8,6,.85)'; g.shadowBlur = 4; spr(g, 'hu_chop', x, y, { s: k, rot, a }); g.restore(); } else spr(g, 'hu_chop', x, y, { s: k, rot, a }); }
// keep-out: never let dressing sit on the title / amount (engine passes the rects); returns a y pushed clear of them
function clearY(x, y, r, P) { (P.keepOut || []).forEach(k => { if (Math.abs(x - k.x) < k.w / 2 + r && Math.abs(y - k.y) < k.h / 2 + r) y = y < k.y ? k.y - k.h / 2 - r : k.y + k.h / 2 + r; }); return y; }
const hit = (x, y, r, P) => (P.keepOut || []).some(k => Math.abs(x - k.x) < k.w / 2 + r && Math.abs(y - k.y) < k.h / 2 + r);
// AD layout_outro.json dressing (portrait): petals for Big+, short corner ribbons for Mega/Epic, sparks + lamp flare for Epic
const AD_PETALS = [["petal_1",110,300,25,.825],["petal_2",960,360,-30,.75],["petal_3",180,1250,60,.675],["petal_4",920,1230,-15,.75],["petal_1",300,520,-50,.57],["petal_2",800,600,40,.57],["petal_3",990,900,10,.63],["petal_4",80,880,-35,.63],["petal_1",560,330,70,.51],["petal_2",130,640,-10,.54],["petal_3",960,1460,20,.6]];
// v3 (QA): AD parts, pulled into the true corners and made smaller. The top pair stays inside x<300 / x>780, y<190, clear of the logo rect [332,16,748,211] and the board/Wall; the bottom pair sits under the amount line
// v3b: top-left ribbon flatter/smaller, centre (40,0): its box stays above y≈70, clear of the hands counter plate (160,136, 196x116 → y78-194)
const AD_RIBBONS = { mega: [["wind_ribbon_cinnabar",[-80,-70,160,70],-15,.14,false],["wind_ribbon_gold",[870,-55,1090,135],30,.16,true],["wind_ribbon_teal",[-40,1424,200,1524],3,.13,true],["wind_ribbon_indigo",[880,1424,1120,1524],-3,.13,false]],
  epic: [["wind_ribbon_cinnabar",[-80,-70,160,70],-15,.14,false],["wind_ribbon_gold",[870,-55,1090,135],30,.17,true],["wind_ribbon_teal",[-40,1424,200,1524],3,.13,true],["wind_ribbon_indigo",[880,1424,1120,1524],-3,.13,false]] };
const AD_SPARKS = [[300,480],[780,430],[200,1180],[880,1150],[540,260],[120,760]];
// short corner accents (AD rects); the bottom pair stays at the AD height under the amount, below the board
function cornerRibbons(g, t, P, set) { const L = AD_RIBBONS[set]; if (!L) return; const amt = (P.keepOut || [])[1];
  L.forEach(([n, r, rot, s, flip], i) => { const u = eOut((t - i * 110) / 520); if (u <= 0) return; let cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2; const top = cy < 960;
    if (!top) cy = Math.max(cy, amt ? amt.y + amt.h / 2 + 50 : cy), cy = Math.min(cy, P.hudTop - 40); // AD: under the amount line, below the board (never across tiles)
    const dx = (cx < 540 ? -1 : 1) * 200 * (1 - u), dy = (top ? -1 : 1) * 90 * (1 - u), sway = Math.sin(t / 1400 + i * 1.7) * 2.2;
    spr(g, n, cx + dx, cy + dy, { s: s * (top ? 1 : 1), rot: (rot + sway) * Math.PI / 180, a: clamp(u * 1.4), flip }); }); }
// petals fall into the AD placements, then breathe (deterministic, hashed)
function adPetals(g, t, P, k = 1) { AD_PETALS.forEach(([n, x0, y0, rot, s], i) => { const lt = t - hash(i, 41) * 600; if (lt < 0) return; const q = eOut(lt / 1100);
    let x = x0 + Math.sin(lt / 1500 + i) * 10, y = lerp(y0 - 520 - 200 * hash(i, 42), y0, q) + Math.sin(lt / 1900 + i * 2) * 7; y = clearY(x, y, 50 * s, P); if (y > P.hudTop - 30) return;
    if (!spr(g, n, x, y, { s: s * k, rot: (rot + (1 - q) * 160 * (hash(i, 43) > .5 ? 1 : -1) + Math.sin(lt / 1200 + i) * 8) * Math.PI / 180, a: clamp(lt / 250) }))
      blossom(g, x, y, 30 * s, rot, clamp(lt / 250), i % 3 === 0); }); }
// v3 (QA): small petals (≈40% of the AD size) falling in loops down the side margins, behind the text; they fade out inside the title/amount keep-out
const EDGE_X = [46, 1034, 122, 958, 78, 1002, 150, 930];
const koFade = (x, y, r, P) => { let f = 1; (P.keepOut || []).forEach(k => { const dx = Math.abs(x - k.x) - k.w / 2, dy = Math.abs(y - k.y) - k.h / 2, d = Math.max(dx, dy); f = Math.min(f, clamp((d + r) / (r * 1.5 + 1))); }); return f; };
function edgePetals(g, t, P, n = 6, sc = .26) { const bot = P.hudTop - 20;
  for (let i = 0; i < n; i++) { const per = 4200 + hash(i, 51) * 1800, lt = t - hash(i, 52) * per * .9; if (lt < 0) continue; const fr = (lt % per) / per, x0 = EDGE_X[i % EDGE_X.length];
    const y = lerp(-60, bot + 40, fr), x = x0 + Math.sin(lt / 900 + i * 2.1) * 22, s = sc * (.85 + .3 * hash(i, 53));
    const a = clamp(lt / 300) * clamp(fr / .06) * clamp((1 - fr) / .1) * koFade(x, y, 40, P); if (a <= 0.01) continue;
    if (!spr(g, 'petal_' + (1 + i % 4), x, y, { s, rot: lt / 700 * (i % 2 ? 1 : -1) + i, a: a * .9 })) blossom(g, x, y, 22, i, a, false); } }
// v3 (QA): fewer Wall tiles (the 6 side-margin AD tiles), AD fall_delay_ms; each drops from above the canvas, passes its AD spot after ~750 ms, keeps falling and loops; fades in the keep-out
const EPIC_WALL_SIDE = [0, 1, 4, 5, 6, 7];
function wallTileStream(g, t, P) { if (!IMG.wall_back) return; const bot = P.hudTop - 30;
  EPIC_WALL_SIDE.forEach((wi, i) => { const w = EPIC_WALL[wi]; if (!w) return; const per = 3000 + hash(i, 61) * 900, lt0 = t - w.fall_delay_ms; if (lt0 < 0) return; const lt = lt0 % per;
    const ms = 600 + 300 * hash(i, 62), v = (w.y + 140) / ms, y = -140 + v * lt; if (y > bot) return; const r = 60 * w.scale;
    const x = w.x + Math.sin(lt / 700 + i) * 10, rot = (w.rotation + lt * .14 * (i % 2 ? 1 : -1)) * Math.PI / 180, flip = Math.floor(lt / 240 + i) % 2;
    const a = clamp(lt0 / 120) * clamp((bot - y) / 160) * koFade(x, y, r, P); if (a <= .01) return; /* fades out before the HUD */ const im = IMG[flip ? 'wall_edge' : 'wall_back'] || IMG.wall_back;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.scale(w.scale * .85, w.scale * .85); g.drawImage(im, -im.width / 2, -im.height / 2); g.restore(); }); }
function sparks(g, t, P, list, sc = .42, once) { list.forEach(([x, y], i) => { const lt = t - i * 90; if (lt < 0) return; if (hit(x, y, 40, P)) return;
    const a = once ? pulse(lt, 350) : clamp(lt / 200) * (.55 + .45 * Math.sin(lt / 380 + i * 1.3)); spr(g, 'gold_spark_' + (1 + i % 6), x, y, { s: sc * (1 + (once ? .4 * eOut(lt / 350) : .08 * Math.sin(lt / 300 + i))), rot: lt / 2400 + i, a, add: true }); }); }
function rayBurst(g, x, y, s, a, rot) { if (!spr(g, 'ray_burst', x, y, { s, rot, a, add: true, piv: [450, 432] })) rays(g, x, y, 12, 440 * s, a, rot); }
// spr-based tile-back tumble (portrait: back + edge poses only)
function wallTilesKeepClear(g, t, P) { if (!IMG.wall_back) return;
  EPIC_WALL.forEach((w, i) => { const lt = t - w.fall_delay_ms; if (lt < 0) return; const q = clamp(lt / 650); const im0 = IMG.wall_back, r = 70 * w.scale;
    const ty = clearY(w.x, w.y, r, P), y = ty - 320 * (1 - eOut(q)) + Math.sin(lt / 900 + i) * 6, x = w.x + Math.sin(lt / 1300 + i * 2) * 5, rot = (w.rotation + (1 - eOut(q)) * (i % 2 ? 40 : -40) + Math.sin(lt / 1100 + i) * 4) * Math.PI / 180;
    if (y > P.hudTop - r) return; const flip = Math.floor(lt / 260 + i) % 4, pose = q < 1 ? (flip % 2 ? 'wall_edge' : 'wall_back') : (w.pose === 'edge' ? 'wall_edge' : 'wall_back');
    const im = IMG[pose] || im0; g.save(); g.globalAlpha *= clamp(lt / 120); g.translate(x, y); g.rotate(rot); g.scale(w.scale, w.scale); g.drawImage(im, -im.width / 2, -im.height / 2); g.restore(); }); }
const fanDraw = o => { if (FX()) FX().paintFan(o); };
const EMPTY_START = () => !((window.FW_CONFIG && FW_CONFIG.TABLE_FAN_START) > 0); // AA2 pass: Table Fan starts empty (bare x), not x1
function x1Pose(g, px, py, R, a) { // AD assembled x1 pose (tablefan_pose_x1_R400, pivot 105,401)
  return spr(g, 'tablefan_pose_x1_R400', px, py, { s: R / 400, piv: [105, 401], a }); }

const dressing = {
  // above the veil: lamp glow + lamp + logo (AD layer order: veil < glow < lamp < logo)
  overVeil(g, t, P) { const hv = P.mode === 'heavenly', k = P.kind, ex = P.exit || 0;
    const a = (k === 'outro' ? clamp(t / 400) * (1 - eIn(ex)) : k === 'retrigger' ? clamp(t / 200) * (1 - clamp((t - 1450) / 250)) : clamp(t / 400) * (P.fade ?? 1));
    if (a <= 0) return; const gA = k === 'retrigger' ? (hv ? .25 : .8) : hv ? .27 + .03 * Math.sin(t / 1700) : k === 'outro' ? .41 + .01 * Math.sin(t / 1700) : .5 + .1 * Math.sin(t / 1700); // v3: outro glow at the low end of the AD .4-.6 range (luma target ~98)
    lamp(g, t, hv ? 'lamp_glow_whitegold' : 'lamp_glow', gA * a, a, .6);
    if (FX() && FX().drawLogo) FX().drawLogo(g, a); },
  backing(g, kind, a, P) { const tier = P.tier;
    if (kind === 'retrigger') { sprRect(g, P.mode === 'heavenly' ? 'retrigger_backing_portrait_heavenly' : 'retrigger_backing_portrait', [-7, 566, 1085, 1182], a); return; }
    if (kind === 'outro') { const id = { big: 'big', mega: 'mega', epic: 'epic' }[tier] || 'base', R = { base: [-24, 1144, 1103, 1486], big: [-24, 1000, 1103, 1486], mega: [-50, 1012, 1131, 1486], epic: [-27, 999, 1107, 1486] }[id];
      sprRect(g, 'outro_backing_win_portrait_' + id, R, a); return; }
    if (kind === 'tier') { // base-win titles: the same soft dark backing, re-centred on the tier title + amount block
      const id = { big: 'big', mega: 'mega', epic: 'epic' }[tier]; if (!id) return; const R = { big: [-24, 1000, 1103, 1486], mega: [-50, 1012, 1131, 1486], epic: [-27, 999, 1107, 1486] }[id];
      const ko = P.keepOut || [], top = ko[0] ? ko[0].y - ko[0].h / 2 : 600, bot = ko[1] ? ko[1].y + ko[1].h / 2 : 980, cy = (top + bot) / 2, h = (bot - top) * 1.45, sx = (R[2] - R[0]);
      sprRect(g, 'outro_backing_win_portrait_' + id, [540 - sx / 2, cy - h / 2, 540 + sx / 2, cy + h / 2], a * (P.fade ?? 1)); } },
  light(g, t, P) { },        // replaced by the AD lamp spotlight above the veil (overVeil)
  preBeat(g, t, P) { // excitement: a few sparks converge on the amount (kept small; the veil is the beat)
    const q = t / 600; g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) { const a = hash(i, 3) * TAU, d = lerp(520, 40, eIn(clamp(q * 1.1 - hash(i, 4) * .2))), x = 540 + Math.cos(a) * d, y = 900 + Math.sin(a) * d * .8;
      g.globalAlpha = pulse(q - hash(i, 4) * .2, .9) * .8; g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(x, y, 3 + 3 * hash(i, 5), 0, TAU); g.fill(); }
    g.restore(); },
  // Big: veil → title → count → petals fall in as the count runs
  big(g, t, P) { const ct = P.countT ?? t; if (ct > 300 || P.jumped) edgePetals(g, P.jumped ? Math.max(ct - 300, 2000) : ct - 300, P, 4); },
  // Mega: veil → title → count → corner ribbons sweep in → petals
  mega(g, t, P) { const ct = P.countT ?? t; if (ct > 200 || P.jumped) cornerRibbons(g, P.jumped ? 3000 : ct - 200, P, 'mega'); if (ct > 1100 || P.jumped) edgePetals(g, P.jumped ? 2000 : ct - 1100, P, 5); },
  // Epic: veil + flare → title stamp → count with the fan opening behind → ribbons sweep → tiles tumble + petals as the count accelerates → settle
  epic(g, t, P) { const ct = P.countT ?? t, J = P.jumped;
    if (ct > 900 || J) cornerRibbons(g, J ? 3000 : ct - 900, P, 'epic');
    if (ct > 1800 || J) { wallTileStream(g, J ? 3000 : ct - 1800, P); edgePetals(g, J ? 2000 : ct - 1800, P, 6); }
    if (ct > 2400 || J) sparks(g, J ? 3000 : ct - 2400, P, AD_SPARKS, .55); },
  hero(g, t, P) { const inOutro = P.kind === 'outro' || (window.FW_WIN && FW_WIN.state().scene === 'outro'), ct = P.countT ?? t;
    rayBurst(g, 540, 98, 1.05, clamp(t / 500) * .6 * (1 + .1 * Math.sin(t / 700)), t / 9000); // AD epic lamp flare at the lamp rim, 0.6 additive
    if (inOutro) return; // outro: the real Table Fan is the hero
    if (ct < 0 && !P.jumped) return; const k = P.jumped ? 1 : clamp(ct / 2600), ribs = 2 + Math.round(12 * eOut(k)); // the fan opens rib by rib behind the count
    fanDraw({ px: 540, py: 1060, R: 470, open: ribs / 14, alpha: .5 * clamp(ct / 300 + (P.jumped ? 1 : 0)) * (P.fade ?? 1), hero: .4, value: 0 }); },
  wings(g, t, P) { // Mega entry: a short flare behind the title (no streamers across the title)
    const y = P.cy || 690; rayBurst(g, 540, y, .7, pulse(t, 700) * .5, t / 5000); },
  counterPlate(g, c, o) { const w = c.w, h = c.h; GSSUI.rr(g, -w / 2, -h / 2, w, h, h * .42);
    const pg = g.createLinearGradient(0, -h / 2, 0, h / 2); pg.addColorStop(0, '#8a1a1e'); pg.addColorStop(1, '#3e0608'); g.fillStyle = pg; g.fill();
    g.lineWidth = 4; g.strokeStyle = o.last ? '#ffb04a' : '#f2c45a'; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,236,180,.55)'; GSSUI.rr(g, -w / 2 + 7, -h / 2 + 7, w - 14, h - 14, h * .36); g.stroke();
    if (o.last || o.flash) { g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = '#ffb04a'; g.shadowBlur = 30; g.strokeStyle = `rgba(255,190,90,${.5 + .5 * (o.flash || .4 + .3 * Math.sin(o.t / 95))})`; g.lineWidth = 3; GSSUI.rr(g, -w / 2, -h / 2, w, h, h * .42); g.stroke(); g.restore(); } },

  // ---- bonus intros (§3a / §3b) on the AD plates (layout_bonus_hands.json / layout_heavenly_hand.json) ----
  introScene(g, t, P) {
    const hv = P.mode === 'heavenly', ex = P.exit || 0, a = clamp(t / 300) * (1 - eIn(ex)), park = PARK();
    g.save(); g.globalAlpha = a;
    if (!sprRect(g, hv ? 'heavenly_hand_portrait_plate_nolamp' : 'bonus_hands_portrait_plate_nolamp', [0, 0, W, H])) { if (IMG.table) g.drawImage(IMG.table, 0, 0, W, H); }
    if (hv) { // clouds: back / mid parallax drift; on exit they roll in from the right and part
      const roll = eIO(ex) * 1.0; [['cloud_large_b', 540, 470, .6833, .4], ['cloud_large_a', 90, 1110, .39628, .7], ['cloud_large_c', 1000, 1080, .4055, .7]].forEach(([n, x, y, s, par], i) => {
        spr(g, n, x + Math.sin(t / 9000 * TAU + i) * 24 * par - roll * 300 * par * (i === 1 ? -1 : 1), y + Math.sin(t / 7000 * TAU + i * 2) * 6, { s, a: .95 }); });
      rayBurst(g, 540, 720, 1.13, clamp((t - 600) / 500) * .55, t / 14000); }
    lamp(g, t, hv ? 'lamp_glow_whitegold' : 'lamp_glow_bright', hv ? .27 + .03 * Math.sin(t / 3000 * TAU) : .75 + .05 * Math.sin(t / 3000 * TAU), 1, 1);
    g.restore();
    // Bonus Hands: four 胡 chops stamp on the diagonal seat corners (NW, NE, SE, SW)
    if (!hv) [[250, 430], [830, 430], [830, 1110], [250, 1110]].forEach(([x, y], i) => { const ct = t - 250 - i * 110; if (ct < 0) return;
      const s = ct < 120 ? lerp(1.3, .96, eIn(ct / 120)) : ct < 260 ? lerp(.96, 1, eBack((ct - 120) / 140, 2)) : 1 + Math.sin(t / 900 + i) * .015;
      const ux = lerp(x, x < 540 ? -120 : 1200, eIn(ex)), uy = y;
      g.save(); g.globalAlpha = 1 - ex; inkSplat(g, x, y, 220, clamp(ct / 80) * (1 - .4 * clamp((ct - 300) / 500)) * .8, 40 + i); huChop(g, ux, uy, 150 * s, .9, (i % 2 ? .06 : -.06)); g.restore(); });
    // Heavenly: the gold Table Fan fully open as a halo behind 天和, then 天和 settles in
    if (hv) { const ht = t - 300; if (ht >= 0) { const q = eOut(ht / 600), ha = clamp(ht / 300) * (1 - clamp(ex / .2));
        spr(g, 'tablefan_gold_pose_open_R420', 540, 900 + 60 * (1 - q), { s: lerp(.85, 1, q) * (1 + .01 * Math.sin(t / 1800)), piv: [420, 421], a: ha });
        const et = t - 450; if (et >= 0) { const s0 = lerp(1.25, 1, eBack(clamp(et / 600), 1.3)) * (1 - .9 * eIn(clamp(ex / .5))), ea = clamp(et / 300) * (1 - clamp(ex / .5)), ey = lerp(720, 900, eIn(clamp(ex / .5)));
          // v3: AD rest rects (layout_heavenly_hand.json portrait.emblem, embedded fallback); layers ears < disc < ring < 天 < 和, pivot = sprite centre, rotation 0 at rest
          const E = EMBLEM.layers, gc = EMBLEM.centre, eo = clamp((et - 150) / 400), rr = (1 - eOut(clamp(et / 900))) * -.35;
          ['ear_left', 'ear_right', 'emblem_disc', 'emblem_ring', 'emblem_tian', 'emblem_he'].forEach(n => { const L = E[n]; if (!L) return; const ear = n.startsWith('ear');
            const dx = (L.centre[0] - gc[0]) * (ear ? eOut(eo) : 1), dy = L.centre[1] - gc[1];
            spr(g, ear ? 'emblem_' + n : n, gc[0] + dx * s0, ey + dy * s0, { s: L.scale * s0, a: ea, rot: n === 'emblem_ring' ? rr : 0 }); }); } } }
    // the Table Fan: bonus = AD x1 pose (rises closed, opens to x1, values loop); heavenly = halo closes to x1 while flying to fanPark (AD exit 0–500 ms easeInOutCubic)
    const fanT = t - (hv ? 800 : 500);
    if (!hv && fanT >= 0) { const piv = { x: 540, y: 980, R: 400 }, rise = eOut(fanT / 300);
      let open = fanT < 300 ? .05 : .05 + (openFor(1) - .05) * eBack((fanT - 300) / 300, 1.2), v = 1, pop = 0, anim = fanT < 650;
      const lt = t - P.settle; if (lt > 0 && !ex) { const q = lt % 3600; v = q < 900 ? 1 : q < 1800 ? 4 : q < 3000 ? 9 : 1; // AA2 pass: pose 1 = EMPTY Table Fan (bare x), first fan x4 sets x4, then +5 = x9 const o2 = lerp(open, openFor(v), clamp(((q < 1800 ? q - 900 : q - 1800) % 900) / 300)); anim = anim || Math.abs(o2 - openFor(1)) > .001; open = o2;
        pop = pulse(q - 900, 260) * .2 + pulse(q - 1800, 260) * .2; if (q >= 3000) { open = lerp(openFor(9), openFor(1), eIO((q - 3000) / 600)); anim = q < 3600; } }
      const m = eIO(clamp(ex / .72)), px = lerp(piv.x, park.x, m), py = lerp(lerp(1400, piv.y, rise), park.y, m) - Math.sin(m * Math.PI) * 90, R = lerp(piv.R, park.R, m);
      const vs = 1 + pop + (fanT > 450 && fanT < 700 ? pulse(fanT - 450, 250) * .3 : 0), useX1 = !anim && !ex && SPR.tablefan_pose_x1_R400;
      if (useX1) { x1Pose(g, px, py, R, 1); if (FX()) FX().drawValue('mult', EMPTY_START() ? 'x' : 1, 540, 800, 150, { scale: vs, maxW: 200 }); }
      else fanDraw({ px, py, R, open: lerp(open, openFor(1), ex), alpha: 1, hero: 1, value: fanT > 450 ? (v === 1 && EMPTY_START() ? 'x' : v) : 0, vscale: vs, valueH: R * .375, valueMaxW: R * .5 }); }
    if (hv && fanT >= 0) { const m = eIO(clamp(ex / (500 / 700))); // value x1 under the halo; on exit the painted fan takes over from the gold halo and closes to the park
      if (ex > 0) fanDraw({ px: lerp(540, park.x, m), py: lerp(900, park.y, m) - Math.sin(m * Math.PI) * 120, R: lerp(420, park.R, m), open: lerp(1, openFor(1), m), alpha: clamp(ex / .12), hero: 1, value: 0 });
      else if (FX()) { const lt = t - P.settle; FX().drawValue('mult', EMPTY_START() ? 'x' : 1, 540, EMPTY_START() ? 1030 : 1040, EMPTY_START() ? 90 : 110, { scale: 1 + (fanT < 300 ? pulse(fanT, 300) * .3 : 0) + pulse(lt % 3200, 260) * .12, alpha: clamp(fanT / 200), maxW: 160 }); } }
    // AA2 pass (Lead decision 2026-11-12, AA2_PASS §1.4): both intros teach the empty start with one line
    if (EMPTY_START() && fanT >= 0 && window.FW_WIN) { const la = clamp((fanT - (hv ? 300 : 650)) / 300) * (1 - ex);
      if (la > 0) { const ly = hv ? 1118 : 1100; g.save(); g.globalAlpha = la * 0.78; g.fillStyle = '#06201a'; g.beginPath(); g.roundRect(120, ly - 30, 840, 60, 30); g.fill(); g.restore(); } // backing strip: keeps the line readable over the tassel / fan rays
      if (la > 0) FW_WIN.drawTitle('FIRST FAN SETS THE TABLE', 540, hv ? 1118 : 1100, 38, Infinity, 'stamp', { noGlint: true, maxW: 820, alpha: la }); }
    // rule pills (AD rects; code chevrons; live tile art)
    const pt = t - (hv ? 1500 : 1300); if (pt >= 0 && FX()) {
      const pa = i => eOut((pt - i * 140) / 320) * (1 - ex), dy = i => 24 * (1 - eOut((pt - i * 140) / 320));
      if (!hv) {
        const a0 = pa(0), y0 = dy(0); if (a0 > 0) { g.save(); g.translate(0, y0); sprRect(g, 'felt_pill_490x147', [30, 1616, 520, 1763], a0);
          [2, 3, 2].forEach((m, j) => { const x = 92 + j * 88; tileImg(g, 'SYM11_fan', x, 1689, 84, a0); g.save(); g.globalAlpha = a0; FX().drawValue('mult', m, x, 1689, 34, { maxW: 64 }); g.restore(); });
          chevron(g, [335, 1664, 365, 1716], a0); fanDraw({ px: 434, py: 1742, R: 82, open: .5 + .08 * Math.sin(t / 900), alpha: a0, value: 0 }); g.restore(); }
        const a1 = pa(1), y1 = dy(1); if (a1 > 0) { g.save(); g.translate(0, y1); sprRect(g, 'felt_pill_490x147', [560, 1616, 1050, 1763], a1);
          [0, 1, 2].forEach(j => tileImg(g, 'SYM13_hu', 622 + j * 88, 1689, 84, a1)); chevron(g, [862, 1664, 892, 1716], a1);
          if (window.FW_WIN) FW_WIN.drawGlyphs('win', '+5', 964, 1689, 70, { minPx: 60, alpha: a1 }); g.restore(); }
      } else {
        const a0 = pa(0), y0 = dy(0); if (a0 > 0) { g.save(); g.translate(0, y0); sprRect(g, 'felt_pill_820x144', [130, 1506, 950, 1650], a0);
          const lt = Math.max(0, t - P.settle), sv = [5, 7, 10, 15][Math.floor(lt / 800) % 4];
          tileImg(g, 'SYM12_rising_fan', 190, 1578, 84, a0); g.save(); g.globalAlpha = a0; FX().drawValue('rising', sv, 190, 1578, 36, { maxW: 72, plate: 'halo', scale: 1 + pulse(lt % 800, 220) * .15 }); // value on the plain Rising Fan tile (was beside it: tile read empty) g.restore();
          FW_WIN.drawTitle('ONLY RISING FANS', 593, 1578, 39, Infinity, 'stamp', { noGlint: true, maxW: 510, alpha: a0 }); g.restore(); }
        const a1 = pa(1), y1 = dy(1); if (a1 > 0) { g.save(); g.translate(0, y1); sprRect(g, 'felt_pill_490x144', [295, 1664, 785, 1808], a1);
          [0, 1, 2].forEach(j => tileImg(g, 'SYM13_hu', 352 + j * 84, 1736, 82, a1)); chevron(g, [597, 1710, 625, 1762], a1);
          if (window.FW_WIN) FW_WIN.drawGlyphs('win', '+5', 697, 1736, 70, { minPx: 60, alpha: a1 }); g.restore(); }
      } }
    if (hv) { const wa = a; spr(g, 'cloud_wisp_1', 150 + Math.sin(t / 6000 * TAU) * 14, 1860, { s: .64748, a: wa }); spr(g, 'cloud_wisp_2', 930 - Math.sin(t / 6500 * TAU) * 14, 1860, { s: .65693, a: wa }); }
  },
  // ---- retrigger (§4a): lifted BONUS tiles at stamp scale 1.15 (on the AD cells when the board has them there), chops top-right, sparks 350–700 ms ----
  retriggerScene(g, t, P) { const fx = FX(), S = window.FW && FW.S; if (!S) return;
    const hus = S.grid.flat().filter(tl => tl && (tl.id === 'SYM13_hu' || tl.id === 'SYM14_heavenly')), fade = 1 - clamp((t - 1300) / 300);
    hus.forEach((tile, i) => { const p = fx && fx.locate ? fx.locate(tile) : null; if (!p) return; const ct = t - i * 120; if (ct < 0) return;
      const sc = ct < 160 ? lerp(1, 1.15, eBack(ct / 160, 2)) : 1.15, w = 134 * sc;
      g.save(); g.globalAlpha = fade; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18; g.shadowOffsetY = 8; tileImg(g, tile.id, p.x, p.y, w, 1); g.restore();
      const kt = ct - 120; if (kt < 0) return; const s = kt < 120 ? lerp(1.4, .95, eIn(kt / 120)) : kt < 260 ? lerp(.95, 1, eOut((kt - 120) / 140)) : 1;
      const cx = p.x + 67 * sc - 12 * sc, cy = p.y - 89 * sc + 7 * sc; // AD v3: 66 px, top-right of the lifted tile, slight overhang
      inkSplat(g, cx, cy, 110, fade * .6 * clamp(kt / 80), 70 + i); huChop(g, cx, cy, 66 * s, .9 * fade, -.05, true); });
    sparks(g, t - 350, { keepOut: [] }, [[601, 639], [766, 771], [706, 953], [479, 1001], [314, 869], [374, 687]], .42, true); },

  // ---- outro signature (§5): the parked Table Fan folds, flies to the centre and opens rib by rib ----
  outroSignature: {
    duration(o) { const n = ribsFor(o.tableFan || 1) - 2; return 800 + n * 110 + 250; },
    draw(g, t, P, o) {
      const park = PARK(), piv = { x: 540, y: 880, R: 400 } /* v3: fan up 80 px so the tassel ends above the text block */, v = o.tableFan || 1, n = ribsFor(v) - 2, ex = P.exit || 0;
      if (FX()) FX().hideFan(true);
      let px, py, R, open, val = 1, vs = 1;
      if (t < 300) { px = park.x; py = park.y; R = park.R; open = openFor(1); }
      else if (t < 800) { const u = (t - 300) / 500; const f = clamp(u / .3); open = lerp(openFor(1), .05, eOut(f)); const m = eIO(clamp((u - .3) / .7)); px = lerp(park.x, piv.x, m); py = lerp(park.y, piv.y, m) - Math.sin(m * Math.PI) * 120; R = lerp(park.R, piv.R, m); if (u > .85) open = lerp(.05, FAN_B, (u - .85) / .15); }
      else { const ribs = Math.min(n, (t - 800) / 110), whole = Math.floor(ribs), fr = ribs - whole; const ribEase = whole >= n ? 0 : eBack(fr, 1.1);
        open = FAN_B + (whole + ribEase) / 14; px = piv.x; py = piv.y; R = piv.R; val = ribs >= n ? v : valFor(open); const st = t - (800 + n * 110); vs = st >= 0 ? 1 + pulse(st, 250) * .18 : 1; }
      if (ex > 0) { px = lerp(piv.x, 540, ex); py = lerp(piv.y, 343, eIn(ex)); R = lerp(piv.R, 64, eIO(ex)); open = lerp(open, 0, ex); }
      const sT = t - (800 + n * 110);
      if (sT >= 0) rayBurst(g, piv.x, piv.y - 260, .75, clamp(sT / 250) * (1 - ex) * (.3 + .06 * Math.sin(t / 700)), t / 16000); // v3: softer (luma target)
      fanDraw({ px, py, R, open, alpha: 1 - clamp((ex - .7) / .3), hero: 1, value: !(o.tableFan > 0) && EMPTY_START() ? 'x' : t >= 300 ? val : v, vscale: vs, valueH: 150 * Math.max(.55, Math.min(1, open * 14 / 5)) }); // AD value rule (0.34R·max(.55, min(1, ribs/5)) at R400 ≈ 150 full)
      if (sT >= 0) { sprRect(g, 'outro_backing_table_fan_portrait', [248, 370, 832, 510], clamp(sT / 250) * (1 - ex)); FW_WIN.drawTitle('TABLE FAN', 540, 440, 50, sT, 'drop', { alpha: 1 - ex, idleT: t }); }
    },
  },
};

// ---- Feature Splash (PRESENTATION_SCREENS §1, AD layout_splash.json, portrait). Drawn live from the real tiles, glyphs and AD parts. ----
[['wallP', 'assets/board/wall_portrait.png'], ['logo', 'assets/board/logo.png'], ['wall_face', 'assets/presentation/wall_flip_face.png'],
 ['card_frame', 'assets/presentation/card_frame_460x560.png'], ['hud_shade', 'assets/presentation/hud_shade_portrait.png']].forEach(([k, s]) => { const im = new Image(); im.onload = () => { IMG[k] = im; }; im.src = s; });
const SPL = { logo: [110, 130, 970, 533], wall: [286, 545, 793, 620], cards: [[70, 630, 530, 1190], [550, 630, 1010, 1190], [70, 1200, 530, 1760], [550, 1200, 1010, 1760]], // v3: cards up 20/30 px so TAP TO CONTINUE (1814) has room above DON'T SHOW AGAIN (1886)
  boardLogo: [332, 16, 748, 211], boardWall: [100, 223, 980, 353], cardAt: [900, 1050, 1200, 1350] };
const lerpR = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
let logoFx = null; // offscreen for the light pass (logo silhouette band)
function drawLogoAt(g, r, a, sweep) { const im = IMG.logo; if (!im || a <= 0) return; const w = r[2] - r[0], h = r[3] - r[1];
  g.save(); g.globalAlpha *= a; g.drawImage(im, r[0], r[1], w, h); g.restore();
  if (sweep > 0 && sweep < 1) { if (!logoFx) { logoFx = document.createElement('canvas'); logoFx.width = 860; logoFx.height = 403; } const x = logoFx.getContext('2d'), cw = logoFx.width, ch = logoFx.height;
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cw, ch); x.drawImage(im, 0, 0, cw, ch); x.globalCompositeOperation = 'source-atop';
    const bx = lerp(-200, cw + 200, eIO(sweep)), gr = x.createLinearGradient(bx - 120, 0, bx + 120, 0); gr.addColorStop(0, 'rgba(255,250,225,0)'); gr.addColorStop(.5, 'rgba(255,250,225,.95)'); gr.addColorStop(1, 'rgba(255,250,225,0)');
    x.fillStyle = gr; x.fillRect(0, 0, cw, ch); x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0, cw, ch); // keep the band inside the logo alpha
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= a * .55; g.drawImage(logoFx, r[0], r[1], w, h); g.restore(); } }
function cardTile(g, id, x, y, w, a, o = {}) { const im = ART(id); if (!im || a <= 0) return; const h = w * im.height / im.width, s = o.s ?? 1;
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s * (o.sy ?? 1));
  if (o.shadow) { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 14; g.shadowOffsetY = 6; }
  g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
  if (o.glow > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= a * o.glow; g.strokeStyle = '#ffd86a'; g.lineWidth = 6; g.shadowColor = '#ffd86a'; g.shadowBlur = 22; GSSUI.rr(g, x - w * s / 2, y - h * s / 2, w * s, h * s, 12 * s); g.stroke(); g.restore(); }
  return h; }
function feltBed(g, r, warm, t) { const [x0, y0, x1, y1] = r; g.save(); g.beginPath(); GSSUI.rr(g, x0 + 18, y0 + 18, x1 - x0 - 36, y1 - y0 - 36, 18); g.clip();
  if (IMG.table) { const sy = Math.max(0, y0 - 420); g.drawImage(IMG.table, x0 + (540 - (x0 + x1) / 2) * .4, sy, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); } else { g.fillStyle = '#0d6a3a'; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  const hg = g.createRadialGradient((x0 + x1) / 2, y0 + 120, 20, (x0 + x1) / 2, y0 + 200, 420); hg.addColorStop(0, `rgba(120,255,170,${.16 + .03 * Math.sin(t / 3000 * TAU)})`); hg.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = hg; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalCompositeOperation = 'source-over';
  if (warm > 0) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = `rgba(110,255,210,${.8 * warm})`; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalCompositeOperation = 'source-over'; }
  g.fillStyle = 'rgba(4,22,15,.72)'; g.fillRect(x0, y0 + 480, x1 - x0, 60); // label band (dark felt)
  g.restore(); }
// card 1: FROM THE WALL (2400 loop): three 東 lift and clear, the column above drops, Wall tiles tip back → edge → face into the gaps
const C1 = { start: [['SYM01_2dots', 'SYM05_6dots', 'SYM03_4dots'], ['SYM09_east', 'SYM09_east', 'SYM09_east'], ['SYM02_3dots', 'SYM07_west', 'SYM04_5dots']], fresh: ['SYM08_south', 'SYM02_3dots', 'SYM06_north'] };
function card1(g, r, lt) { const cx = (r[0] + r[2]) / 2, w = 98, gap = 12, h = 136, X = c => cx + (c - 1) * (w + gap), Y = row => r[1] + 106 + row * (h + 6), q = lt % 2400;
  const endPose = (a) => { for (let c = 0; c < 3; c++) { cardTile(g, C1.fresh[c], X(c), Y(0), w, a); cardTile(g, C1.start[0][c], X(c), Y(1), w, a); cardTile(g, C1.start[2][c], X(c), Y(2), w, a); } };
  const startPose = (a, lift) => { for (let row = 0; row < 3; row++) for (let c = 0; c < 3; c++) { const e = row === 1; cardTile(g, C1.start[row][c], X(c), Y(row) - (e ? 12 * lift : 0), w, a, { s: e ? 1 + .08 * lift : 1, glow: e ? lift : 0 }); } };
  if (q < 420) { startPose(1, eOut(q / 300)); if (q > 300) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = pulse(q - 300, 120); g.fillStyle = '#fff2c0'; for (let c = 0; c < 3; c++) g.fillRect(X(c) - w / 2, Y(1) - h / 2 - 12, w, h); g.restore(); } return; }
  if (q >= 2100) { const u = (q - 2100) / 300; endPose(1); startPose(u, 0); return; } // crossfade to the start pose over a full board (never empty)
  for (let c = 0; c < 3; c++) { cardTile(g, C1.start[2][c], X(c), Y(2), w, 1);
    const d0 = 420 + c * 90, u = clamp((q - d0) / 380), land = u >= 1 ? (q - d0 - 380) : -1, sq = land >= 0 && land < 300 ? pulse(land, 300) * .06 : 0;
    cardTile(g, C1.start[0][c], X(c), lerp(Y(0), Y(1), eIn(u)), w, 1, { sy: 1 - sq }); // the tile above drops into the gap (weighted, no bounce)
    const fy = lerp(r[1] - 60, Y(0), eIn(u)), pose = u < .3 ? 'wall_back' : u < .55 ? 'wall_edge' : u < .8 ? 'wall_face' : null; // Wall tile tips over as it falls
    if (u > 0 && pose && IMG[pose]) { const im = IMG[pose], k = w / im.width; g.save(); g.globalAlpha = clamp(u / .1); g.translate(X(c), fy); g.rotate((1 - u) * (c - 1) * .25); g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); g.restore(); }
    else if (u > 0) cardTile(g, C1.fresh[c], X(c), fy, w, 1, { sy: 1 - sq }); } }
// card 2: EIGHT FLOWERS (3000 loop): values fly in arcs to the centre and sum into €15,50; a plum-blossom burst where the tiles were
const C2V = [0.5, 1, 1.5, 2, 3, 0.5, 1, 6];
function card2(g, r, lt) { const cx = (r[0] + r[2]) / 2, w = 92, gap = 8, X = i => cx + ((i % 4) - 1.5) * (w + gap), Y = i => r[1] + 110 + Math.floor(i / 4) * 134, q = lt % 3000, fx = FX(), sumY = r[1] + 405;
  const lift = q < 300 ? 0 : q < 500 ? eOut((q - 300) / 200) : q < 2700 ? 1 : 1 - (q - 2700) / 300; let sum = 0;
  C2V.forEach((v, i) => { const ft = q - 500 - i * 90, u = clamp(ft / 420);
    cardTile(g, 'SYM10_flower', X(i), Y(i) - 8 * lift, w, 1, { s: 1 + .05 * lift, glow: lift * .6 });
    if (!fx) return; if (u >= 1 && q < 2700) { sum += v; return; }
    const back = q >= 2700 ? (q - 2700) / 300 : 1; if (u <= 0 || q >= 2700) { fx.drawValue('flower', v, X(i), Y(i) + 34, 44, { maxW: 84, alpha: q >= 2700 ? back : 1 }); return; }
    const x = lerp(X(i), cx, eIO(u)), y = lerp(Y(i) + 34, sumY, eIO(u)) - Math.sin(u * Math.PI) * 70; fx.drawValue('flower', v, x, y, 44, { maxW: 84, scale: 1 + .1 * Math.sin(u * Math.PI) }); });
  const bt = q - 1350; if (bt > 0 && bt < 1100) { const cy = r[1] + 177; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .3, d = 30 + 170 * eOut(bt / 900), al = 1 - clamp((bt - 500) / 600);
      if (!spr(g, 'petal_' + (1 + i % 4), cx + Math.cos(a) * d, cy + Math.sin(a) * d * .7, { s: .3, rot: a + bt / 500, a: al })) blossom(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * .7, 16, a, al, i % 2); }
    blossom(g, cx, cy, 70 * eBack(clamp(bt / 300), 1.6), bt / 1500, 1 - clamp((bt - 600) / 500), false); }
  if (q >= 560 && window.FW_WIN) { const shown = q < 2700 ? Math.min(15.5, Math.round(sum * 100) / 100) : 15.5, a = q < 2700 ? clamp((q - 560) / 150) : 1 - (q - 2700) / 300;
    FW_WIN.drawGlyphs('win', FW_WIN.fmt(shown), cx, sumY, 64, { minPx: 44, alpha: a, scale: 1 + pulse(q - 1320, 260) * .12 }); } }
// card 3: FANS MULTIPLY (3600 loop): Rising Fan steps ×2 → ×3 → ×4 on two Double Kong clears, then Count the Fan opens a small fan to ×7; €2,00 → €14,00
function card3(g, r, lt) { const cx = (r[0] + r[2]) / 2, fx = FX(), q = lt % 3600, w = 110, yT = r[1] + 150, xF = cx - 92, xR = cx + 92;
  const rv = q < 450 ? 2 : q < 1050 ? 3 : 4, back = q >= 3200 ? (q - 3200) / 400 : 0, fly = clamp((q - 1500) / 450);
  cardTile(g, 'SYM11_fan', xF, yT, w, 1, { glow: q > 1350 && q < 1600 ? .7 : 0 }); cardTile(g, 'SYM12_rising_fan', xR, yT, w, 1, { glow: pulse(q - 450, 300) + pulse(q - 1050, 300) });
  [[450, cx - 170], [1050, cx + 170]].forEach(([at, x]) => { const k = q - at; if (k < 0 || k > 420) return; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k / 420; // Double Kong clear flash beside the fans
    rays(g, x, yT + 70, 10, 90 * eOut(k / 200), 1, k / 900); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x, yT + 70, 26 * (1 - k / 420), 0, TAU); g.fill(); g.restore(); });
  const fpx = cx, fpy = r[1] + 468, fR = 178; // v3: fan centred under the tiles, the amount sits between them (all inside the card)
  if (fx) { const fanVal = (x, y, v, a, sc) => fx.drawValue('mult', v, x, y, 50, { maxW: 90, alpha: a, scale: sc });
    const st = q < 1050 ? q - 450 : q - 1050, bump = (st >= 0 && st < 200 && q < 1500 && q > 450) ? 1 + .15 * pulse(st, 200) : 1;
    // v3 (Lead): the tiles never go empty; after the values fly into the fan the tiles keep their value at ~50 %
    const tileA = q < 1500 ? 1 : back > 0 ? lerp(.5, 1, back) : .5;
    fanVal(xF, yT + 40, 3, tileA, 1); fanVal(xR, yT + 40, q >= 3200 ? 2 : rv, tileA, bump);
    if (q >= 1500 && fly < 1) { const ex = fpx, ey = fpy - 95; fanVal(lerp(xF, ex, eIO(fly)), lerp(yT + 40, ey, eIO(fly)) - Math.sin(fly * Math.PI) * 50, 3, 1 - fly * .5, 1 - fly * .3); fanVal(lerp(xR, ex, eIO(fly)), lerp(yT + 40, ey, eIO(fly)) - Math.sin(fly * Math.PI) * 50, 4, 1 - fly * .5, 1 - fly * .3); } }
  const ribs = q < 1950 ? 2 : q < 3200 ? Math.min(ribsFor(7), 2 + (q - 1950) / 90) : lerp(ribsFor(7), 2, clamp((q - 3200) / 300)); // opens rib by rib, closes at the end
  if (fx) fx.paintFan({ px: fpx, py: fpy, R: fR, open: ribs / 14, alpha: 1, hero: .3, value: q >= 1950 && q < 3300 ? 7 : 0, vscale: 1 + pulse(q - 1950, 260) * .25, valueH: 50, valueMaxW: 100 });
  if (window.FW_WIN) { const amt = q < 2350 || q >= 3400 ? 2 : 14; // game money format (win_gold glyphs), centred and fitted inside the card
    FW_WIN.drawGlyphs('win', FW_WIN.fmt(amt), cx, r[1] + 272, 46, { minPx: 44, maxW: 360, alpha: 1, scale: 1 + pulse(q - 2350, 280) * .12 }); } }
// card 4: 10 BONUS HANDS ↔ HEAVENLY HAND (A 2400, 300 crossfade, B 2400, 300 crossfade). The row is always full: BONUS tiles stamp onto wind tiles (A);
// in B the third tile becomes the SUPER BONUS; crossfades blend two complete rows, never an empty card.
const C4W = ['SYM06_north', 'SYM07_west', 'SYM08_south', 'SYM09_east'];
function card4(g, r, lt) { const cx = (r[0] + r[2]) / 2, q = lt % 5400, w = 96, X = i => cx + (i - 1.5) * (w + 6), yT = r[1] + 190;
  const land = (k, i0) => { const l = k - 150 - i0 * 160; return l < 0 ? null : { s: l < 100 ? lerp(1.35, .92, eIn(l / 100)) : l < 200 ? lerp(.92, 1, eOut((l - 100) / 100)) : 1, l }; };
  const stateA = (a, k) => { if (a <= 0) return; for (let i = 0; i < 4; i++) { const L = land(k, i); if (!L) cardTile(g, C4W[i], X(i), yT, w, a); else cardTile(g, 'SYM13_hu', X(i), yT, w, a, { s: L.s, shadow: true, glow: pulse(L.l, 300) * .8 }); }
    const ct = k - 1000; if (ct >= 0) { const s = ct < 120 ? lerp(1.4, .95, eIn(ct / 120)) : ct < 260 ? lerp(.95, 1, eOut((ct - 120) / 140)) : 1 + .02 * Math.sin(k / 700); g.save(); g.globalAlpha *= a; inkSplat(g, cx, r[1] + 360, 200, clamp(ct / 80) * .7, 45); huChop(g, cx, r[1] + 360, 130 * s, .92, -.06); g.restore(); } };
  const stateB = (a, k) => { if (a <= 0) return; for (let i = 0; i < 4; i++) { if (i !== 2) { cardTile(g, 'SYM13_hu', X(i), yT, w, a); continue; } const L = land(k, 0);
      if (!L) cardTile(g, 'SYM13_hu', X(i), yT, w, a); else cardTile(g, 'SYM14_heavenly', X(i), yT, w, a, { s: L.s * 1.04, shadow: true, glow: .5 + .3 * Math.sin(k / 300) }); }
    const ck = k - 450; if (ck > 0) [['cloud_wisp_1', -1], ['cloud_wisp_2', 1]].forEach(([n, d]) => spr(g, n, X(2) + d * 120 * eOut(ck / 900), yT + 50 - 30 * eOut(ck / 900), { s: .32 * eOut(clamp(ck / 600)), a: a * .9 }));
    const et = k - 700; if (et > 0) { const ey = r[1] + 375 - 40 * eOut(clamp(et / 600)), s0 = .13 * eBack(clamp(et / 500), 1.4), ea = a * clamp(et / 300);
      spr(g, 'emblem_ear_left', cx - 150 * s0 / .13, ey, { s: s0 * .67, a: ea }); spr(g, 'emblem_ear_right', cx + 150 * s0 / .13, ey, { s: s0 * .67, a: ea });
      spr(g, 'emblem_disc', cx, ey, { s: s0 * .86, a: ea, piv: [552.5, 558.5] }); spr(g, 'emblem_ring', cx, ey, { s: s0, a: ea, piv: [589, 591.5], rot: k / 20000 * TAU });
      spr(g, 'emblem_tian', cx - 60 * s0 / .13, ey, { s: s0 * .43, a: ea }); spr(g, 'emblem_he', cx + 60 * s0 / .13, ey, { s: s0 * .43, a: ea }); } };
  const A = q < 2400 ? 1 : q < 2700 ? 1 - (q - 2400) / 300 : q < 5100 ? 0 : (q - 5100) / 300;
  if (A < 1) stateB(1, q >= 2400 ? q - 2400 : 3000); if (A > 0) stateA(A, q >= 5100 ? q - 5100 : q);
  return A; }
const C4LW = { n: 80, l: 270 };
const card4Warm = lt => { const q = lt % 5400; return q < 2400 ? 0 : q < 2700 ? (q - 2400) / 300 : q < 5100 ? 1 : 1 - (q - 5100) / 300; };
dressing.splashScene = function (g, t, P) { const ex = P.exit || 0, J = P.jumped, T = J ? Math.max(t, 1700) : t;
  // L0 table + hud shade (fade up from black)
  const up = eOut(clamp(T / 400)), out = 1 - clamp((ex - .55) / .45); // the last 45% of the exit reveals the board under it
  g.save(); g.globalAlpha = out; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = out * up;
  if (IMG.table) g.drawImage(IMG.table, 0, 0, W, H); if (IMG.hud_shade) g.drawImage(IMG.hud_shade, 0, 0, W, H); g.restore();
  // L1 lamp: two 60 ms flickers, then full; glow breathes ±5 %
  const fl = T < 120 ? 0 : T < 180 ? 1 : T < 260 ? .15 : T < 320 ? 1 : T < 360 ? .3 : 1, ga = fl * clamp(T / 400) * (1 + .05 * Math.sin(T / 3000 * TAU)) * out;
  g.save(); g.globalAlpha = out; lamp(g, T, 'lamp_glow', .85 * ga, 1, .6); g.restore();
  // dust motes in the lamp cone (≤12, slow, hashed)
  g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 12; i++) { const per = 9000 + 5000 * hash(i, 61), u = ((T + hash(i, 62) * per) % per) / per, x = 540 + (hash(i, 63) - .5) * 520 * (.4 + u), y = 120 + u * 620;
    g.globalAlpha = ga * .35 * Math.sin(u * Math.PI); g.fillStyle = '#fff4cc'; g.beginPath(); g.arc(x + Math.sin(T / 1700 + i) * 12, y, 1.6 + 1.6 * hash(i, 64), 0, TAU); g.fill(); } g.restore();
  // L3 Wall strip (behind the logo): slides in 700–1000 with a 4 px recoil; one glint every 2 s; exit: drops to the board Wall and widens
  const wt = T - 700; if (wt >= 0 && IMG.wallP) { const u = clamp(wt / 300), rec = wt > 300 && wt < 420 ? Math.sin((wt - 300) / 120 * Math.PI) * 4 : 0;
    let R = SPL.wall.slice(); R[1] += lerp(-160, 0, eOut(u)) + rec; R[3] += lerp(-160, 0, eOut(u)) + rec; R = lerpR(R, SPL.boardWall, eIO(clamp((ex - .17) / .55)));
    g.save(); g.globalAlpha = clamp(wt / 150); g.drawImage(IMG.wallP, 100, 223, 880, 130, R[0], R[1], R[2] - R[0], R[3] - R[1]); g.restore();
    const gq = (T % 2000) / 2000, gi = Math.floor(T / 2000), gx = R[0] + (R[2] - R[0]) * (.05 + .9 * hash(gi, 66)); if (gq < .25 && !ex) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = pulse(gq, .25) * .8;
      const gg = g.createRadialGradient(gx, (R[1] + R[3]) / 2, 2, gx, (R[1] + R[3]) / 2, 36); gg.addColorStop(0, 'rgba(255,250,220,.9)'); gg.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gg; g.fillRect(gx - 40, R[1] - 10, 80, R[3] - R[1] + 20); g.restore(); } }
  // L2 logo hero: drops in 250–950 (1.12 → 1.04 → 1.0), light pass after the land and every 4.5 s; exit: flies to its board rect
  const lt = T - 250; if (lt >= 0) { const u = clamp(lt / 700), s = u < .6 ? lerp(1.12, .985, eOut(u / .6)) : lerp(.985, 1, eOut((u - .6) / .4)), dy = lerp(-120, 0, eBack(u, 1.4));
    let R = SPL.logo, cxl = (R[0] + R[2]) / 2, cyl = (R[1] + R[3]) / 2, hw = (R[2] - R[0]) / 2 * s, hh = (R[3] - R[1]) / 2 * s; R = [cxl - hw, cyl - hh + dy, cxl + hw, cyl + hh + dy];
    R = lerpR(R, SPL.boardLogo, eIO(clamp(ex / .67))); const sw = T < 950 ? -1 : ((T - 950) % 4500) / 600; drawLogoAt(g, R, clamp(lt / 200), sw); }
  // L4 cards: rise 40 px, .94 → 1, fade 320 ms each (900/1050/1200/1350); loops staggered so no two peak together; exit: fold flat toward the bottom edge, 4 → 1
  SPL.cards.forEach((r, i) => { const ct = T - SPL.cardAt[i]; if (ct < 0) return; const u = clamp(ct / 320), s = lerp(.94, 1, eBack(u, 1.2)), rise = 40 * (1 - eOut(u));
    const fold = clamp((ex * 1200 - (3 - i) * 50) / 340), sy = lerp(1, .05, eIn(fold)), cxr = (r[0] + r[2]) / 2, by = r[3];
    g.save(); g.globalAlpha = clamp(u * 1.6) * (1 - clamp((fold - .7) / .3)); g.translate(cxr, by + rise); g.scale(s, s * sy); g.translate(-cxr, -by);
    const loopT = Math.max(0, ct - 400) + [0, 230, 470, 120][i]; // staggered loop phase
    feltBed(g, r, i === 3 ? card4Warm(loopT) * .5 : 0, T); // Heavenly: the felt warms to jade
    g.save(); g.beginPath(); GSSUI.rr(g, r[0] + 18, r[1] + 18, r[2] - r[0] - 36, r[3] - r[1] - 36, 18); g.clip();
    let A = 1; if (i === 0) card1(g, r, loopT); else if (i === 1) card2(g, r, loopT); else if (i === 2) card3(g, r, loopT); else A = card4(g, r, loopT);
    g.restore();
    if (IMG.card_frame) g.drawImage(IMG.card_frame, r[0], r[1], r[2] - r[0], r[3] - r[1]); else { g.strokeStyle = '#f2c45a'; g.lineWidth = 6; GSSUI.rr(g, r[0] + 8, r[1] + 8, r[2] - r[0] - 16, r[3] - r[1] - 16, 22); g.stroke(); }
    if (window.FW_WIN) { const ly = r[1] + 510, labT = ct - 160;
      if (i === 3) { // v3b: '10' + space + BONUS HANDS, centred as one group (widths from the last draw; deterministic)
        const gap = 16, tot = C4LW.n + gap + C4LW.l, x0 = cxr - tot / 2;
        const gw = FW_WIN.drawGlyphs('win', '10', x0 + C4LW.n / 2, ly - 4, 44, { minPx: 44, alpha: A }); if (gw && gw.w) C4LW.n = gw.w;
        const lw = FW_WIN.drawTitle('BONUS HANDS', x0 + C4LW.n + gap + C4LW.l / 2, ly, 34, labT, 'stamp', { maxW: 300, alpha: A, idleT: T, noGlint: true }); if (lw) C4LW.l = lw;
        FW_WIN.drawTitle('HEAVENLY HAND', cxr, ly, 34, labT, 'stamp', { maxW: 380, alpha: 1 - A, idleT: T, noGlint: true }); }
      else FW_WIN.drawTitle(['FROM THE WALL', 'EIGHT FLOWERS', 'FANS MULTIPLY'][i], cxr, ly, 34, labT, 'stamp', { maxW: 380, idleT: T, noGlint: true }); }
    g.restore(); });
};

window.GSS_GAME = {
  id: '002_four_winds',
  outroVeil: .62, tierVeil: { mega: .62, epic: .62 }, // Lead 2026-11-11: veil .62 (no desat) for the outro and the base Mega/Epic
  theme: null, // HUD theme lives in hud.js (FW_HUD.theme); money format comes from it
  strings: {
    tiers: { big: 'BIG WIN', mega: 'MEGA WIN', epic: 'EPIC WIN' }, tap: 'TAP TO CONTINUE', outroLabel: 'TOTAL WIN',
    modes: {
      bonus:    { title: 'BONUS HANDS', counterWord: 'HANDS', lastSpin: 'LAST HAND', retrigger: 'BONUS HANDS', introLock: 1000 },
      heavenly: { title: 'HEAVENLY HANDS', counterWord: 'HANDS', lastSpin: 'LAST HAND', retrigger: 'HEAVENLY HANDS', introLock: 1200, introSettle: 2000, countAt: 1200, titleAt: 1300 },
    },
  },
  layout: { // portrait rects (PRESENTATION_SCREENS.md), all clear of hud.layout.top 1528 except the HUD-bar collect target
    tierTitle: { x: 540, y: 690, h: 150, w: 880 }, tierAmount: { x: 540, y: 905, h: 140, maxW: 900 },
    intro: { count: { x: 540, y: 1350, h: 220 }, title: { x: 540, y: 1536, h: 88 }, picto: { y: 1700 }, tap: { x: 540, y: 1850, h: 44 }, // AD: cap 88, baseline 1580
      heavenly: { count: { x: 540, y: 1280, h: 200 }, title: { x: 540, y: 1455, h: 69.5 }, picto: { y: 1620 } } }, // AD: cap 69.5, baseline 1490
    retrigger: { x: 540, y: 820, h: 240, label: 80, labelY: 1046, labelByMode: { heavenly: 69.5 }, labelEntry: 'stamp', labelDelay: 200, labelStagger: 24 }, // v3: '+5' lands first, then the label stamps in place below it (no letters falling through the '+5') // AD layout_retrigger.json v3
    outro: { title: { x: 540, y: 1180, h: 120, w: 880 }, label: { x: 540, y: 1258, h: 46 }, amount: { x: 540, y: 1352, h: 122, maxW: 880 }, tap: { x: 540, y: 1470, h: 38 } }, // v3: AD text block with ~30 px gaps (title 1060-1180, label 1212-1258, amount 1291-1413, tap 1451-1489); fan pivot moved up to 880 // AD layout_outro.json (baselines; amount centre)
    counter: { x: 160, y: 136, w: 196, h: 116 }, hudTotal: { x: 190, y: 1887 },
    splash: { tap: { y: 1814, h: 40 }, toggle: { x: 540, y: 1886, w: 360, h: 60 } }, // v3: label between the cards (bottom 1760) and the toggle
  },
  glyphs: {
    win: { dir: 'assets/glyphs/win_gold/', minPx: 44, trackH: -.03, space: .28,
      chars: { '€': 'euro', '+': 'plus', ',': 'comma', '.': 'dot', '0': 'digit_0', '1': 'digit_1', '2': 'digit_2', '3': 'digit_3', '4': 'digit_4', '5': 'digit_5', '6': 'digit_6', '7': 'digit_7', '8': 'digit_8', '9': 'digit_9' },
      // embedded copy of assets/glyphs/win_gold/metrics.json so file:// works (no fetch)
      metrics: {"euro":{"w":217,"h":251,"baseline_offset":2},"digit_0":{"w":214,"h":251,"baseline_offset":2},"digit_1":{"w":182,"h":250,"baseline_offset":3},"digit_2":{"w":202,"h":254,"baseline_offset":3},"digit_3":{"w":204,"h":257,"baseline_offset":0},"digit_4":{"w":236,"h":259,"baseline_offset":4},"digit_5":{"w":206,"h":259,"baseline_offset":3},"digit_6":{"w":219,"h":265,"baseline_offset":0},"digit_7":{"w":210,"h":258,"baseline_offset":4},"digit_8":{"w":229,"h":269,"baseline_offset":0},"digit_9":{"w":215,"h":253,"baseline_offset":0},"comma":{"w":106,"h":129,"baseline_offset":-1},"dot":{"w":104,"h":96,"baseline_offset":3},"plus":{"w":210,"h":218,"baseline_offset":19}},
      fallback: { fill: ['#fffbe6', '#ffe27a', '#f4b42e', '#b8620e'], rim: '#9a5a14', out: '#3a1608' } }, // per-glyph crafted fallback only if a sprite fails
    // AD title_gold alphabet (A–Z, plus, space): painted letters, still animated per letter; the crafted Cinzel path is the fallback
    title: { dir: 'assets/glyphs/title_gold/', minPx: 0, chars: Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => [c, c]).concat([['+', 'plus']])),
      metrics: {"A":{"w":295,"h":268,"baseline_offset":1},"B":{"w":247,"h":272,"baseline_offset":0},"C":{"w":252,"h":281,"baseline_offset":-7},"D":{"w":267,"h":271,"baseline_offset":0},"E":{"w":241,"h":269,"baseline_offset":1},"F":{"w":226,"h":273,"baseline_offset":0},"G":{"w":281,"h":278,"baseline_offset":-5},"H":{"w":290,"h":274,"baseline_offset":0},"I":{"w":143,"h":274,"baseline_offset":0},"J":{"w":200,"h":279,"baseline_offset":-6},"K":{"w":272,"h":273,"baseline_offset":0},"L":{"w":218,"h":272,"baseline_offset":1},"M":{"w":338,"h":272,"baseline_offset":1},"N":{"w":271,"h":272,"baseline_offset":1},"O":{"w":284,"h":282,"baseline_offset":-8},"P":{"w":237,"h":271,"baseline_offset":0},"Q":{"w":302,"h":313,"baseline_offset":-37},"R":{"w":274,"h":272,"baseline_offset":0},"S":{"w":216,"h":285,"baseline_offset":-4},"T":{"w":248,"h":275,"baseline_offset":0},"U":{"w":285,"h":283,"baseline_offset":-5},"V":{"w":307,"h":276,"baseline_offset":2},"W":{"w":368,"h":271,"baseline_offset":0},"X":{"w":286,"h":270,"baseline_offset":0},"Y":{"w":274,"h":270,"baseline_offset":0},"Z":{"w":254,"h":270,"baseline_offset":0},"plus":{"w":236,"h":234,"baseline_offset":18},"space":{"w":80,"h":271,"baseline_offset":0}} },
  },
  title: { key: 'fw-gold', font: `"${TITLE_FAMILY}", "Cinzel Decorative", "Playfair Display SC", Georgia, serif`, weight: 900, fontGen: () => fontGen,
    fill: ['#fffef0', '#fff0b0', '#ffd257', '#f0a422', '#b8660c'], rim: ['#fff4c8', '#c8841c', '#6e3606', '#f0b448'], out: '#3a0c06', outFrac: .2, track: .03 },
  overrides: { flow: { intro: { inputLock: 1000, settleMs: 1800 } } }, // PRESENTATION_SCREENS §3a: lock 1000 (Heavenly 1200 via strings.modes)
  belowBig: 'game', // < 15×: amount only, shown by the game's TOTAL WIN count (fx.js number())
  dressing,
  formatMoney: v => GSSUI.formatMoney(v, window.FW_HUD && FW_HUD.theme),
};
})();
