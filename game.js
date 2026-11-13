// FOUR WINDS 四風 — first playable. Uncalibrated demo math, no real wagering.
(() => {
const C = FW_CONFIG, cv = document.getElementById('c'), g = cv.getContext('2d');
const Q = new URLSearchParams(location.search), DEMO = Q.get('demo'), DEBUG = Q.get('debug') === '1';
const GX = (C.W - (C.COLS * C.CELL_W + (C.COLS - 1) * C.GAP)) / 2, GY = C.GY ?? 400; // pass 3: screen_E board (layout_E.json grid y0)
const GW = C.COLS * C.CELL_W + (C.COLS - 1) * C.GAP, GH = C.ROWS * C.CELL_H + (C.ROWS - 1) * C.GAP;
const cellX = c => GX + c * (C.CELL_W + C.GAP), cellY = r => GY + r * (C.CELL_H + C.GAP);
const PAY_IDS = Object.keys(C.PAYS);
const isPay = id => id in C.PAYS;

const S = { balance: C.START_BALANCE, betI: C.BET_INDEX, hunt: false, busy: false, win: 0, stepWin: 0,
  grid: [], mode: 'base', handsLeft: 0, handsTotal: 0, tableFan: 1, bonusWin: 0, msg: '', msgT: 0,
  demoUsed: false, refillQueue: [], log: [], boost: null };
// AA2 pass: one boost at a time (C.BUY kind 'boost'); S.hunt stays as a compatibility view of the Hand Hunt boost.
Object.defineProperty(S, 'hunt', { get: () => S.boost === 'hunt', set: v => { S.boost = v ? 'hunt' : (S.boost === 'hunt' ? null : S.boost); }, enumerable: true });
const HINT_KEY = 'gss.002_four_winds.hint.payanywhere.done'; // U-1: 8+ PAY ANYWHERE shows until the first pay-anywhere win, then never again
S.hintPay = (() => { try { if (Q.get('hints') === 'reset') localStorage.removeItem(HINT_KEY); return localStorage.getItem(HINT_KEY) !== '1'; } catch (e) { return true; } })(); // ?hints=reset brings it back (QA)
S.hintPayOffT = 0;
const bet = () => C.BETS[S.betI];
const boostDef = () => (S.boost && C.BUY && C.BUY[S.boost]) || null;
const spinCost = () => bet() * (boostDef() ? boostDef().cost : 1); // per-spin price incl. the active boost
const now = () => performance.now();
// Mid-table TOTAL WIN + multiplier sit in the former Wall gap (logo y1=211, frame y0=346.4).
// Pair is centred as a group: TOTAL WIN 600×96, 16 px gap, multiplier badge 200×96. The bar TOTAL still mirrors the amount; outro collect still lands on the bar.
const TW = { x: 270, y: 232, w: 540, h: 96 }, MW = { x: 826, y: 232, w: 170, h: 96 }; // TOTAL WIN centred under the logo; badge to its right
const rc = r => ({ x: r.x + (r.w || 0) / 2, y: r.y + (r.h || 0) / 2 });
const HUDA = {
  kit: () => (window.FW_HUD && FW_HUD.kit && FW_HUD.kit.layout) || null,
  // value sits under the gold TOTAL WIN label; box is the slam target for win amounts
  get total() { return { x: TW.x + TW.w / 2, y: TW.y + TW.h * .62, box: [TW.x, TW.y, TW.w, TW.h] }; },
  // Count the Fan / Table Fan stamp lands on this badge
  get mult() { return { x: MW.x + MW.w / 2, y: MW.y + MW.h / 2, box: [MW.x, MW.y, MW.w, MW.h] }; },
  get collect() { const L = HUDA.kit(), r = L && (L.totalAnchor || L.totalWin || L.total); return r ? rc(r) : L && L.bar ? { x: L.bar.x + L.bar.w * .176, y: L.bar.y + L.bar.h * .66 } : { x: 190, y: 1887 }; }, // outro collect target = bar TOTAL
  // D2 bonus / Heavenly hand-count chip: felt under the frame, centred between the rails (D2_CHANGES: x 260–820, y 1398–1470 at 1080 wide)
  get chip() { const L = HUDA.kit(); if (!L || L.variant !== 'D2') return null; const k = L.k || 1; return [260 * k, L.top + 2 * k, 560 * k, 72 * k]; },
};
// Presentation host: no gameplay arithmetic / RNG in fx.js.
const FX = FW_FX.create(g, S, C, t => {
  for (let c=0;c<C.COLS;c++) for(let r=0;r<C.ROWS;r++) if(S.grid[c]?.[r]===t)
    return {x:cellX(c)+C.CELL_W/2,y:cellY(r)+C.CELL_H/2};
}, { GX, GY, GW, GH, TOTAL: { get x() { return HUDA.total.x; }, get y() { return HUDA.total.y; }, get box() { return HUDA.total.box; } }, MULT: { get x() { return HUDA.mult.x; }, get y() { return HUDA.mult.y; }, get box() { return HUDA.mult.box; } } }); // TOTAL = mid-table TOTAL WIN box; MULT = fan multiplier badge (Count the Fan stamp)
// shared/win (GSS standard win tiers, intro / retrigger / outro, counter). Presentation only; reads real time from the kit (K2).
const WIN = window.GSSWin && window.GSS_GAME ? GSSWin.create({ g, W: C.W, H: C.H, game: GSS_GAME, clock: window.GSSUI && GSSUI.timeWarp,
  get: { autoplay: () => !!(window.FW_HUD && FW_HUD.kit && FW_HUD.kit.state.autoplay), hudTop: () => window.FW_HUD ? FW_HUD.top() : 1528, hudTotal: () => HUDA.collect } }) : null;
window.FW_WIN = WIN;

// ---------- RNG ----------
const pickW = pairs => { let t = 0; pairs.forEach(p => t += p[1]); let r = Math.random() * t; for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; } return pairs[0][0]; };
function weights() {
  const B = S.mode === 'base' ? boostDef() : null, tbl = (B && C[B.weights]) || C.WEIGHTS; // boost weight table (Hand Hunt / Heavenly Hunt: WEIGHTS_HUNT)
  const w = Object.entries(tbl).map(([k, v]) => {
    const mm = C.MODE_WEIGHT_MULT[S.mode];
    if (mm && k in mm) v *= mm[k];
    return [k, v];
  });
  return w;
}
function makeTile(id) {
  const t = { id: id || pickW(weights()), y: 0, a: 1, lift: 0, glow: 0, pop: 0 };
  if (t.id === 'SYM10_flower') t.val = pickW(C.FLOWER_VALUES);
  if (t.id === 'SYM11_fan') t.val = pickW(C.FAN_VALUES);
  // Rising Fan (spec 2026-11-09): base game always lands at x2; Bonus/Heavenly pick up to x50.
  if (t.id === 'SYM12_rising_fan') t.val = S.mode === 'base' ? C.RISING_BASE_VALUE : pickW((C.RISING_FAN_VALUES_BY_MODE || {})[S.mode] || C.RISING_FAN_VALUES); // AA2_PASS §2.6
  return FX.attach(t);
}
// Next value on the spec multiplier ladder (C.MULT_LADDER), capped at RISING_CAP. x100 stays x100.
const nextLadder = v => { const n = C.MULT_LADDER.find(x => x > v); return Math.min(C.RISING_CAP, n === undefined ? C.RISING_CAP : n); };
const nextRefill = () => S.refillQueue.length ? makeTile(S.refillQueue.shift()) : makeTile();

// ---------- tweens ----------
const tweens = [];
function tween(obj, key, to, dur, delay = 0, ease = 'out') {
  return new Promise(res => tweens.push({ obj, key, from: null, to, dur, start: now() + delay, ease, res }));
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const EASE = { out: t => 1 - Math.pow(1 - t, 3), bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; }, in: t => t * t, lin: t => t };
function runTweens() {
  const n = now();
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; if (n < tw.start) continue;
    if (tw.from === null) tw.from = tw.obj[tw.key];
    const p = Math.min(1, (n - tw.start) / tw.dur);
    tw.obj[tw.key] = tw.from + (tw.to - tw.from) * EASE[tw.ease](p);
    if (p >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}

// ---------- demo boards ----------
function demoBoard(kind) {
  const ids = [];
  const fill = () => { for (let i = 0; i < 30; i++) ids[i] = PAY_IDS[i % 9 === 8 ? 4 : i % 8]; shuffle(ids); };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } };
  // a neutral filler that avoids kongs: each pay id max 3-4 times
  const base = []; for (let i = 0; i < 30; i++) base.push(PAY_IDS[i % 9]); shuffle(base);
  const pos = [...Array(30).keys()]; shuffle(pos);
  const put = (id, n, vals) => { for (let k = 0; k < n; k++) { const p = pos.shift(); base[p] = { id, val: vals ? vals[k % vals.length] : undefined }; } };
  const scrubbed = new Set(); let cyc = 0;
  const scrub = id => { scrubbed.add(id); base.forEach((b, i) => { if (b === id) { let n; do { n = PAY_IDS[cyc++ % 9]; } while (scrubbed.has(n)); base[i] = n; } }); };
  if (kind === 'kong') { scrub('SYM09_east'); put('SYM09_east', 9); put('SYM11_fan', 1, [3]); }
  if (kind === 'avalanche') {
    scrub('SYM01_2dots'); scrub('SYM02_3dots'); put('SYM01_2dots', 8); put('SYM02_3dots', 4); put('SYM12_rising_fan', 1, [2]);
    S.refillQueue = Array(8).fill('SYM02_3dots');
  }
  if (kind === 'flowers') put('SYM10_flower', 9, [0.5, 1, 2, 3, 25, 0.2, 1.5, 1, 6]);
  if (kind === 'bonus' || kind === 'retrigger') put('SYM13_hu', 4); // demo=retrigger: same trigger board, then a forced 3-BONUS hand (below)
  if (kind === 'epic') put('SYM10_flower', 9, [25, 10, 6, 6, 3, 2, 1.5, 1, 0.5]); // 55x flower collect -> EPIC (real play, normal resolution)
  if (kind === 'retrigger_hand') [1, 11, 26].forEach(i => { base[i] = 'SYM13_hu'; }); // AD layout_retrigger.json cells (1,0) (5,1) (2,4): index r*6+c
  if (kind === 'heavenly') { put('SYM13_hu', 3); put('SYM14_heavenly', 1); }
  // base[] index = r*6+c
  const grid = [];
  for (let c = 0; c < C.COLS; c++) { grid[c] = []; for (let r = 0; r < C.ROWS; r++) {
    const b = base[r * C.COLS + c]; const t = makeTile(typeof b === 'string' ? b : b.id);
    if (typeof b === 'object' && b.val !== undefined) t.val = b.val; grid[c][r] = t; } }
  return grid;
}

// ---------- flow ----------
function flash(m, ms = 1600) { S.msg = m; S.msgT = now() + ms; }
function dbg(...a) { if (DEBUG) { S.log.push(a.join(' ')); if (S.log.length > 14) S.log.shift(); console.log('[FW]', ...a); } }

// Contact curve shared by initial deal and refills. Travel then weight, never bounce easing.
async function landTile(t, duration, delay=0, settle=[100, 133]) {
  await tween(t, 'y', 7, duration, delay, 'in');
  FX.land(t);
  await tween(t, 'y', -3, settle[0], 0, 'out');
  await tween(t, 'y', 0, settle[1], 0, 'out');
}
async function dropIn(grid) {
  const ps = []; FX.deal(grid); // presentation-only schedule read from the already-dealt grid
  for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) {
    const t = grid[c][r]; t.y = -(GY + GH + 40); t.a = 1;
    ps.push(landTile(t, 400, FX.dealDelay(c, r), [67, 83])); // win pass: same tight settle as refills (first-win wait ~270 → ~170 ms)
  }
  S.grid = grid; await Promise.all(ps);
}
async function dropOut() {
  if (!S.grid.length) return;
  const ps = [];
  for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++)
    ps.push(tween(S.grid[c][r], 'y', GH + 300, 260, c * 35, 'in'));
  await Promise.all(ps);
}

function evaluate() {
  const counts = {}, cells = {};
  for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) {
    const id = S.grid[c][r].id; counts[id] = (counts[id] || 0) + 1; (cells[id] = cells[id] || []).push([c, r]);
  }
  const wins = [];
  PAY_IDS.forEach(id => { const n = counts[id] || 0; if (n >= C.MIN_KONG) {
    const pay = C.PAYS[id][Math.min(4, n - C.MIN_KONG)] * bet(); wins.push({ id, n, pay, cells: cells[id] }); } });
  let flower = null;
  if ((counts.SYM10_flower || 0) >= C.FLOWER_MIN) {
    const fc = cells.SYM10_flower; flower = { n: fc.length, cells: fc, pay: fc.reduce((s, [c, r]) => s + S.grid[c][r].val, 0) * bet() };
  }
  return { wins, flower, counts };
}

async function liftAndRefill(remove) {
  // lift together
  const ps = [];
  remove.forEach(([c, r]) => { const t = S.grid[c][r]; t.glow = 1;
    ps.push(tween(t, 'lift', 1, FX.liftMs(), 0, 'lin')); });
  await Promise.all(ps);
  const key = new Set(remove.map(([c, r]) => c + ',' + r));
  const ps2 = [];
  for (let c = 0; c < C.COLS; c++) {
    const keep = []; for (let r = 0; r < C.ROWS; r++) if (!key.has(c + ',' + r)) keep.push({ t: S.grid[c][r], r });
    const nNew = C.ROWS - keep.length; if (!nNew) continue;
    const col = [];
    for (let k = 0; k < nNew; k++) { const t = nextRefill(); col.push(t); }
    col.push(...keep.map(o => o.t));
    col.forEach((t, r) => {
      const oldR = keep.find(o => o.t === t)?.r;
      // presentation: survivors settle at once; the new block drops in under the frame lip (FX.refill)
      const feed = oldR === undefined ? FX.refill(c, r, nNew, t) : null;
      const fromY = oldR !== undefined ? (oldR - r) * (C.CELL_H + C.GAP) : feed.fromY;
      t.y = fromY;
      if (fromY !== 0) ps2.push(landTile(t, oldR !== undefined ? FX.settleMs(r - oldR) : feed.dur, oldR !== undefined ? 0 : feed.delay, [67, 83])); // pass 3: tighter cascade settle
    });
    S.grid[c] = col;
  }
  await Promise.all(ps2);
}

const fanTiles = () => { const f = []; for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) { const t = S.grid[c][r]; if (t.id === 'SYM11_fan' || t.id === 'SYM12_rising_fan') f.push(t); } return f; };

// Random deal. Guaranteed Rising Fan boost (AA2 Thunder buy, p.47): if the deal has no Rising Fan, one random
// pay-tile cell becomes a Rising Fan (base: always x2). Specials (胡 / 天和 / Flower / Fan) are never replaced.
function dealGrid() {
  const gr = []; for (let c = 0; c < C.COLS; c++) { gr[c] = []; for (let r = 0; r < C.ROWS; r++) gr[c][r] = makeTile(); }
  const B = S.mode === 'base' ? boostDef() : null;
  if (B && B.guaranteeRising && !gr.flat().some(t => t.id === 'SYM12_rising_fan')) {
    const cand = []; for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) if (isPay(gr[c][r].id)) cand.push([c, r]);
    if (cand.length) { const [c, r] = cand[Math.floor(Math.random() * cand.length)]; const t = makeTile('SYM12_rising_fan'); if (B.risingValues) t.val = pickW(C[B.risingValues]); gr[c][r] = t; dbg('GUARANTEE rising', c, r, 'x' + t.val); } // AA2_PASS §2.6: forced fan lands x5–x50
  }
  return gr;
}
async function playHand(forcedGrid) {
  S.win = 0; S.stepWin = 0; S.fanShown = 0; FX.handStart(); // presentation notification; fanShown is display-only (base multiplier badge)
  await dropOut();
  await dropIn(forcedGrid || dealGrid());
  let payWin = 0, flowerWin = 0, cascades = 0, huSeen = 0, heavenSeen = 0;
  while (true) {
    const ev = evaluate();
    huSeen = Math.max(huSeen, ev.counts.SYM13_hu || 0); heavenSeen = Math.max(heavenSeen, ev.counts.SYM14_heavenly || 0);
    if (!ev.wins.length && !ev.flower) break;
    if (S.hintPay) { S.hintPay = false; S.hintPayOffT = now(); try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {} } // first pay-anywhere win: hint gone for good
    let remove = [];
    ev.wins.forEach(w => { payWin += w.pay; remove.push(...w.cells); dbg('KONG', w.id, w.n, '=', w.pay.toFixed(2)); });
    if (ev.flower) await FX.flowers(ev.flower.cells, wait, ev.flower.pay);
    await FX.wins(ev.wins, wait);
    if (ev.flower) { flowerWin += ev.flower.pay; remove.push(...ev.flower.cells); flash('EIGHT FLOWERS  ' + fmt(ev.flower.pay), 1800); dbg('FLOWERS', ev.flower.n, '=', ev.flower.pay.toFixed(2)); }
    if (ev.wins.length) flash(ev.wins.map(w => 'DOUBLE KONG ×' + w.n).join('  ·  '), 1400);
    S.win = payWin + flowerWin;
    // Rising Fans visible at the moment of this win step to the NEXT spec ladder value
    // (x5→x7, x15→x25…, cap x100) BEFORE the refill, so a Rising Fan that falls in on
    // this refill first grows on the next win.
    fanTiles().forEach(t => { if (t.id === 'SYM12_rising_fan' && t.val < C.RISING_CAP) { const from = t.val; t.val = nextLadder(t.val); t.pop = 1; FX.risingTick(t, from, t.val); FX.mark('rising-tick', {from, value:t.val}); tween(t, 'pop', 0, 333); } });
    // AA2-MOTION BEGIN: 'one more' pulse on exactly 7 of a pay symbol + refill-anticipation plan reset (presentation only; no RNG, no award state)
    if (FX.preRefill) await FX.preRefill(remove, wait);
    // AA2-MOTION END
    await liftAndRefill(remove);
    cascades++;
    await wait(17); // pass 3 pace (was 67)
  }
  // Count the Fan
  FX.prepareFan();
  const fanSum = fanTiles().reduce((s, t) => s + t.val, 0);
  // Fans multiply pays AND Eight Flowers (Studio Lead lock 2026-11-09).
  // Base: no visible fans → mult stays 1. Bonus/Heavenly: a no-win hand adds nothing to Table Fan.
  const anyWin = payWin + flowerWin;
  let mult = 1;
  if (S.mode === 'base') { if (anyWin > 0 && fanSum > 0) mult = fanSum; }
  else if (anyWin > 0) { S.tableFan = Math.min(C.RISING_CAP * 10, S.tableFan + fanSum); mult = Math.max(1, S.tableFan); } // AA2 empty start: an empty Table Fan (0) pays x1
  if (mult > 1) { if (S.mode === 'base') S.fanShown = mult; await FX.count(fanTiles(), 'fan', wait, { mult }); flash((S.mode === 'base' ? 'COUNT THE FAN ' : 'TABLE FAN ') + '×' + mult, 1500); await wait(33); } // presentation: slam lands on the multiplier badge, then the win jumps
  const total = anyWin * mult;
  dbg('HAND end cascades', cascades, 'pay', payWin.toFixed(2), 'fan', fanSum, 'mult', mult, 'flowers', flowerWin.toFixed(2), 'total', total.toFixed(2), 'HU', huSeen, '天和', heavenSeen);
  S.win = total;
  return { total, huSeen, heavenSeen };
}

async function spin() {
  if (S.busy) return;
  if (S.mode !== 'base') return;
  const cost = spinCost(), B = boostDef();
  if (S.balance < cost) { flash('NOT ENOUGH BALANCE'); return; }
  FX.press('spin'); FX.mark('spin'); S.busy = true; S.balance -= cost;
  let forced = null;
  if (DEMO && !S.demoUsed) { forced = demoBoard(DEMO); S.demoUsed = true; }
  const res = await playHand(forced);
  S.balance += res.total;
  if (WIN) await WIN.present(res.total, cost); // base event, once, after Count the Fan (Big+ titled; below Big = TOTAL WIN amount only)
  // AA2_PASS §2.2 rule 6: the feature outro tier is measured against the plain bet, not the boosted cost
  if (res.huSeen >= C.HEAVENLY_HU && res.heavenSeen >= 1) await freeHands('heavenly', bet());
  else if (res.huSeen >= C.BONUS_TRIGGER_HU) await freeHands(B && B.allHeavenly ? 'heavenly' : 'bonus', bet()); // Heavenly Hunt: every feature it triggers is a Heavenly Hand
  S.busy = false;
}
// ---------- buy menu (AA2 pass) ----------
// Boosts toggle between deals and stay on; one boost at a time. Buys: confirm in the menu, autoplay stops,
// 800 ms bought-entry transition, then the same intro (STANDARDS §1: no board celebration, no seeded symbols).
function setBoost(id) {
  if (S.busy || S.mode !== 'base') return false;
  if (id && !(C.BUY[id] && C.BUY[id].kind === 'boost' && C.BUY[id].enabled !== false)) return false;
  S.boost = id || null; FX.mark('boost', { id: S.boost }); return true;
}
async function buyFeature(id) {
  const B = C.BUY[id]; if (!B || B.kind !== 'buy' || B.enabled === false || S.busy || S.mode !== 'base') return false;
  const price = bet() * B.cost; if (S.balance < price) { flash('NOT ENOUGH BALANCE'); return false; }
  if (window.FW_HUD && FW_HUD.kit && FW_HUD.kit.stopAutoplay) FW_HUD.kit.stopAutoplay();
  S.busy = true; S.balance -= price; S.win = 0; S.bought = { id, price, t: now() }; FX.mark('buy', { id, price }); dbg('BUY', id, price.toFixed(2));
  await wait(800); // bought entry: short transition (AA2 UI veil in aa2_ui.js reads S.bought)
  await freeHands(B.feature, bet(), { bought: true });
  S.bought = null; S.busy = false; return true;
}

async function freeHands(kind, trigBet = bet(), opt = {}) {
  S.mode = kind; S.tableFan = C.TABLE_FAN_START ?? 1; // AA2 pass: Table Fan starts EMPTY (0, plate shows a bare x) in both modes
  S.handsLeft = C.BONUS_HANDS; S.handsTotal = C.BONUS_HANDS; S.bonusWin = 0;
  S.balanceHold = S.balance; // STANDARDS: the displayed BALANCE credits the bonus total once, at the outro collect (internal math stays per hand)
  if (!WIN) flash(kind === 'heavenly' ? '天和  HEAVENLY HAND  ·  10 HANDS' : '胡  BONUS HANDS  ·  10 HANDS', 2200);
  if (!opt.bought) FX.trigger(kind);
  if (WIN) { if (!opt.bought) await WIN.celebrate(kind === 'heavenly' ? 1667 : 1400); await WIN.intro({ mode: kind, count: C.BONUS_HANDS }); WIN.counterShow(kind, S.handsLeft); }
  else await wait(kind === 'heavenly' ? 1667 : 1400);
  while (S.handsLeft > 0) {
    S.handsLeft--; if (WIN) WIN.counterCommit(S.handsLeft); // decrement on commit
    const demoHand = DEMO === 'retrigger' && !S.demoRetrig && S.handsTotal - S.handsLeft === 3 ? (S.demoRetrig = true, demoBoard('retrigger_hand')) : null; // new demo only
    const res = await playHand(demoHand);
    S.bonusWin += res.total; S.balance += res.total;
    if (res.huSeen >= C.RETRIGGER_HU) { const from = S.handsLeft; S.handsLeft += C.RETRIGGER_HANDS; S.handsTotal += C.RETRIGGER_HANDS; FX.trigger('retrigger');
      if (WIN) await WIN.retrigger({ mode: kind, n: C.RETRIGGER_HANDS, from, to: S.handsLeft }); else { flash('+5 HANDS', 1500); await wait(800); } }
    await wait(450);
  }
  S.win = S.bonusWin;
  if (WIN) { await WIN.outro({ mode: kind, total: S.bonusWin, bet: trigBet, tableFan: S.tableFan }); WIN.counterHide(); }
  else { flash((kind === 'heavenly' ? 'HEAVENLY HAND' : 'BONUS HANDS') + ' WIN  ' + fmt(S.bonusWin), 2600); await wait(2200); }
  S.balanceHold = null; // collect done: the display catches up with the internal balance in one credit
  S.mode = 'base'; if (FX.hideFan) FX.hideFan(false);
}

// ---------- drawing ----------
const fmt = v => window.GSSUI ? GSSUI.formatMoney(v, window.FW_HUD && FW_HUD.theme) : '€' + v.toFixed(2); // GSS UI kit money format (€ 1.234,50)
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const WIND = { SYM06_north: ['北', '#1d5e8c'], SYM07_west: ['西', '#5b3f8f'], SYM08_south: ['南', '#b2222a'], SYM09_east: ['東', '#1d7a46'] };
const DOT_COL = ['#1d5e8c', '#b2222a', '#1d7a46'];
const DOT_POS = { 2: [[.5, .3], [.5, .7]], 3: [[.25, .22], [.5, .5], [.75, .78]], 4: [[.3, .3], [.7, .3], [.3, .7], [.7, .7]], 5: [[.28, .27], [.72, .27], [.5, .5], [.28, .73], [.72, .73]], 6: [[.3, .22], [.7, .22], [.3, .5], [.7, .5], [.3, .78], [.7, .78]] };

function drawTile(t, x, y, w, h) {
  // body: ivory face on green/jade back for thickness
  g.save();
  g.fillStyle = 'rgba(0,0,0,.35)'; rr(x + 4, y + 8, w, h, 14); g.fill();
  g.fillStyle = '#1f6b4f'; rr(x, y + 5, w, h, 14); g.fill();
  const grd = g.createLinearGradient(x, y, x + w, y + h); grd.addColorStop(0, '#fffaf0'); grd.addColorStop(1, '#e9dcc1');
  g.fillStyle = grd; rr(x, y, w, h - 4, 14); g.fill();
  g.strokeStyle = 'rgba(120,90,40,.45)'; g.lineWidth = 2; g.stroke();
  const art = FW_ART[t.id];
  if (art) { const k = Math.min(w / art.width, h / art.height); g.drawImage(art, x + (w-art.width*k)/2, y+(h-art.height*k)/2, art.width*k, art.height*k); }
  else drawFace(t, x, y, w, h - 4);
  if (t.val !== undefined && !FX.tileValue) drawValue(t, x, y, w, h); // FX draws values via the glyph path
  g.restore();
}
function drawFace(t, x, y, w, h) {
  const id = t.id, cx = x + w / 2, cy = y + h / 2;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const m = id.match(/SYM0([1-5])_/);
  if (m) {
    const n = +m[1] + 1; const R = n <= 3 ? 20 : 17;
    DOT_POS[n].forEach(([px, py], i) => {
      const dx = x + 14 + px * (w - 28), dy = y + 18 + py * (h - 36);
      g.fillStyle = DOT_COL[(i + n) % 3]; g.beginPath(); g.arc(dx, dy, R, 0, 7); g.fill();
      g.strokeStyle = '#fffaf0'; g.lineWidth = 3; g.beginPath(); g.arc(dx, dy, R * .55, 0, 7); g.stroke();
      g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(dx, dy, R * .18, 0, 7); g.fill();
    });
    return;
  }
  if (WIND[id]) { g.fillStyle = WIND[id][1]; g.font = 'bold 96px "Noto Serif CJK SC","Songti SC",serif'; g.fillText(WIND[id][0], cx, cy - 6); return; }
  if (id === 'SYM10_flower') {
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.fillStyle = '#d9466f'; g.beginPath(); g.ellipse(cx + Math.cos(a) * 20, y + 52 + Math.sin(a) * 20, 18, 12, a, 0, 7); g.fill(); }
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(cx, y + 52, 11, 0, 7); g.fill(); return;
  }
  if (id === 'SYM11_fan' || id === 'SYM12_rising_fan') {
    const col = id === 'SYM11_fan' ? '#b2222a' : '#c8902a';
    g.fillStyle = col; g.beginPath(); g.moveTo(cx, y + 92); g.arc(cx, y + 92, 58, Math.PI * 1.1, Math.PI * 1.9); g.closePath(); g.fill();
    g.strokeStyle = '#fbe7b0'; g.lineWidth = 2; for (let i = 0; i <= 6; i++) { const a = Math.PI * (1.1 + .8 * i / 6); g.beginPath(); g.moveTo(cx, y + 92); g.lineTo(cx + Math.cos(a) * 58, y + 92 + Math.sin(a) * 58); g.stroke(); }
    if (id === 'SYM12_rising_fan') { g.fillStyle = '#1d7a46'; g.beginPath(); g.moveTo(cx, y + 6); g.lineTo(cx + 14, y + 26); g.lineTo(cx - 14, y + 26); g.fill(); }
    return;
  }
  if (id === 'SYM13_hu') { g.fillStyle = '#b2222a'; rr(x + 14, y + 30, w - 28, w - 28, 10); g.fill(); g.fillStyle = '#fff3d6'; g.font = 'bold 82px "Noto Serif CJK SC",serif'; g.fillText('胡', cx, y + 30 + (w - 28) / 2 + 2); g.fillStyle = '#b2222a'; g.font = 'bold 22px sans-serif'; g.fillText('HU SEAL', cx, y + h - 26); return; }
  if (id === 'SYM14_heavenly') {
    const gg = g.createLinearGradient(x, y, x, y + h); gg.addColorStop(0, '#f7d774'); gg.addColorStop(1, '#b8862b');
    g.fillStyle = gg; rr(x + 8, y + 8, w - 16, h - 16, 10); g.fill(); g.fillStyle = '#7a1414'; g.font = 'bold 60px "Noto Serif CJK SC",serif';
    g.fillText('天', cx, cy - 32); g.fillText('和', cx, cy + 34);
  }
}
function drawValue(t, x, y, w, h) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const s = 1 + (t.pop || 0) * .08;
  const txt = t.id === 'SYM10_flower' ? (t.val < 1 ? t.val.toFixed(2) : String(t.val)) : '×' + t.val;
  const by = t.id === 'SYM10_flower' ? y + h - 52 : y + h - 50;
  g.save(); g.translate(x + w / 2, by); g.scale(s, s);
  g.font = `900 ${txt.length > 4 ? 38 : 48}px "Arial Black",Arial,sans-serif`;
  g.lineWidth = 8; g.strokeStyle = '#3a1608'; g.strokeText(txt, 0, 0);
  g.fillStyle = t.id === 'SYM10_flower' ? '#ffe9a8' : '#ffd34d'; g.fillText(txt, 0, 0);
  g.restore();
}

const BTN = {
  spin: { x: 840, y: 1735, r: 135 },
  minus: { x: 560, y: 1545, w: 70, h: 70 }, plus: { x: 900, y: 1545, w: 70, h: 70 },
  hunt: { x: 70, y: 1665, w: 360, h: 140 },
};
function drawBg() {
  if (FX.drawPlate && FX.drawPlate()) return; // screen_E plate: table + frame + logo (Wall retired 2026-11-12)
  // code fallback board (no plate loaded): same rects as layout_E.json
  const gr = g.createRadialGradient(540, 760, 100, 540, 900, 1200); gr.addColorStop(0, '#1d5a45'); gr.addColorStop(1, '#06180f');
  g.fillStyle = gr; g.fillRect(0, 0, C.W, C.H);
  g.globalAlpha = .06; g.strokeStyle = '#9fe0c0'; for (let i = -C.H; i < C.W; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + C.H, C.H); g.stroke(); } g.globalAlpha = 1;
  const L = (FX.LAYOUT && FX.LAYOUT.logo) || { x: 332, y: 16, w: 416, h: 195 };
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.globalAlpha = FX.logoAlpha();
  g.font = 'bold 92px "Noto Serif CJK SC","Songti SC",serif'; g.lineWidth = 8; g.strokeStyle = '#4a0c0c'; g.strokeText('四 風', L.x + L.w / 2, L.y + L.h * .36);
  const lg = g.createLinearGradient(0, L.y, 0, L.y + L.h * .7); lg.addColorStop(0, '#fff0b0'); lg.addColorStop(1, '#c8902a'); g.fillStyle = lg; g.fillText('四 風', L.x + L.w / 2, L.y + L.h * .36);
  g.font = '900 50px Georgia,serif'; g.lineWidth = 7; g.strokeText('FOUR WINDS', L.x + L.w / 2, L.y + L.h * .8); g.fillText('FOUR WINDS', L.x + L.w / 2, L.y + L.h * .8); g.restore();
  // frame: red-gold lacquer, clean corners (no wind badges)
  const fx = GX - 30, fy = GY - 30, fw = GW + 60, fh = GH + 60;
  g.fillStyle = '#5a0f0f'; rr(fx - 10, fy - 10, fw + 20, fh + 20, 30); g.fill();
  const fg = g.createLinearGradient(fx, fy, fx, fy + fh); fg.addColorStop(0, '#f2cf6b'); fg.addColorStop(.5, '#9c6a1e'); fg.addColorStop(1, '#f2cf6b');
  g.strokeStyle = fg; g.lineWidth = 8; rr(fx, fy, fw, fh, 24); g.stroke();
  g.fillStyle = '#0c2a1f'; rr(fx + 10, fy + 10, fw - 20, fh - 20, 18); g.fill();
}
function drawGrid() {
  g.save(); rr(GX - 20, GY - 20, GW + 40, GH + 40, 16); g.clip();
  const lifted = [];
  for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) {
    const t = S.grid[c]?.[r]; if (!t) continue;
    if (t.lift > 0) { lifted.push([t, c, r]); continue; }
    FX.tile(t, cellX(c), cellY(r) + t.y, C.CELL_W, C.CELL_H, (x,y,w,h)=>drawTile(t,x,y,w,h));
  }
  g.restore();
  // lifted tiles fly above frame, together
  // winning sets crack and break together (FX owns the shards; presentation only)
  lifted.forEach(([t, c, r]) => FX.lifted(t, cellX(c), cellY(r) + t.y, C.CELL_W, C.CELL_H, (x, y, w, h) => drawTile(t, x, y, w, h)));
}
function button(b, label, sub, on, enabled = true) {
  g.save(); g.globalAlpha = enabled ? 1 : .45; const key = b===BTN.hunt?'hunt':b===BTN.plus?'plus':'minus'; const sc=FX.pressScale(key);g.translate(b.x+b.w/2,b.y+b.h/2);g.scale(sc,sc);g.translate(-b.x-b.w/2,-b.y-b.h/2);
  const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, on ? '#f2cf6b' : '#a3261f'); gr.addColorStop(1, on ? '#b07a22' : '#5a0f0f');
  g.fillStyle = gr; rr(b.x, b.y, b.w, b.h, 22); g.fill(); g.strokeStyle = '#f2cf6b'; g.lineWidth = 4; g.stroke();
  g.fillStyle = on ? '#3a1608' : '#ffe9a8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 44px "Arial Black",Arial'; g.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? 18 : 0));
  if (sub) { g.font = 'bold 26px Arial'; g.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + 30); }
  g.restore();
}
const eOutC = u => 1 - Math.pow(1 - u, 3);
// D2b/D2c: the shared/win veil stops at the HUD top. Base Mega/Epic: extend the same veil (colour + alpha, no desat) over the HUD band, with the
// engine's own fade, drawn right after WIN.draw so it reads the same scene time (in 300 ms; out 350 ms from the tier end or the tap-close point read from the public WIN.log 'tier-jump' / 'tier-close' marks).
// Outro: the engine already darkens the HUD band (0.6 black, drawn after this layer), so nothing is stacked there.
function hudVeilTier(st) { if (st.scene !== 'tier' || !GSS_GAME.tierVeil || GSS_GAME.tierVeil[st.tier] == null) return 0;
  const STD = WIN.standard, T = (STD.tiers || []).find(x => x.id === st.tier) || { end: 6300 }, L = WIN.log || [];
  let i = L.length - 1; while (i >= 0 && L[i].type !== 'tier-start') i--; // marks of the current tier scene only
  let closeAt = null; for (let j = Math.max(0, i); j < L.length; j++) { const e = L[j];
    if (e.type === 'tier-jump') { closeAt = null; if (e.t + STD.count.settlePop > T.end) closeAt = e.t + STD.count.settlePop; }
    else if (e.type === 'tier-close' && closeAt == null) closeAt = e.t; }
  const end = closeAt ?? T.end, out = Math.max(0, Math.min(1, (st.t - end) / 350)), inA = Math.min(1, st.t / 300);
  return GSS_GAME.tierVeil[st.tier] * inA * (1 - out); }
let HUDVEIL_A = 0;
function drawHudVeil(st) { if (!WIN || !window.FW_HUD || !FW_HUD.top) return; st = st || WIN.state();
  const a = hudVeilTier(st); HUDVEIL_A = a; if (a <= .004) return; const top = FW_HUD.top(); g.save(); g.globalAlpha = a; g.fillStyle = GSS_GAME.veil || '#04160f'; g.fillRect(0, top, C.W, C.H - top); g.restore(); }
function drawHud() {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // TOTAL WIN + multiplier pills in the former Wall gap (between logo and frame). Bonus hand-count stays on the chip under the frame.
  const outroOn = WIN && WIN.state().scene === 'outro', TA = HUDA.total, MA = HUDA.mult; // shared/win outro owns the total; boxes recede
  const boxA = outroOn ? .12 : 1;
  const th = (window.FW_HUD && FW_HUD.theme) || { pillFill: '#062a1f', pillOpacity: 0.62, pillGloss: 0.10, rim: 'rgba(240,222,170,0.80)', rimWidth: 2, accent: '#f2c45a' };
  const glass = (x, y, w, h, a) => { g.save(); g.globalAlpha *= a; if (window.GSSUI && GSSUI.pill) GSSUI.pill(g, th, x, y, w, h); else { g.fillStyle = 'rgba(6,42,31,.62)'; rr(x, y, w, h, h / 2); g.fill(); g.strokeStyle = th.rim; g.lineWidth = 2; rr(x + 1, y + 1, w - 2, h - 2, (h - 2) / 2); g.stroke(); } g.restore(); };
  const displayMult = () => { if (FX.state && FX.state.count && FX.state.count.kind === 'fan') { const v = FX.tableFanNumber(); return v == null ? FX.state.count.running : v; } return S.mode !== 'base' ? S.tableFan : (S.fanShown || 1); };
  if (TA.box) { const [bx, by, bw, bh] = TA.box; glass(bx, by, bw, bh, boxA);
    g.save(); g.globalAlpha *= boxA; g.fillStyle = th.accent || '#f2c45a'; g.font = '700 22px "Arial Black",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const hintA = window.FW_AA2 ? FW_AA2.hintAlpha() : 0; // AA2 pass U-1: 8+ PAY ANYWHERE (A14 420 pill) fills the empty TOTAL WIN slot until the first pay-anywhere win
    g.save(); g.globalAlpha *= 1 - hintA; g.fillText('TOTAL WIN', TA.x, by + 22); g.restore();
    const winTxt = fmt(FX.number('win', S.mode === 'base' ? S.win : S.bonusWin));
    if (hintA > 0) FW_AA2.drawHintIn(g, TA.x, by + bh / 2, bw - 48, hintA);
    g.save(); if (hintA > 0) g.globalAlpha *= 1 - hintA; g.translate(TA.x, TA.y); g.scale(FX.bump(), FX.bump()); g.translate(-TA.x, -TA.y);
    if (FX.drawValue) FX.drawValue('money', winTxt, TA.x, TA.y, 48, { maxW: bw - 40 }); // win_gold glyphs (≥44 px)
    else { g.fillStyle = '#ffd34d'; g.font = '900 52px "Arial Black",Arial'; g.fillText(winTxt, TA.x, TA.y); }
    g.restore(); g.restore(); }
  const mv = displayMult(), st = FX.state && FX.state.stamp, stamping = !!(st && (now() - st.t) < (st.dur || 220) * .7);
  const bonusPlate = S.mode !== 'base'; // AA2 pass: in Bonus / Heavenly the plate is always on and reads a bare "x" while the Table Fan is empty
  if (MA.box && (mv > 1 || stamping || bonusPlate)) { const [mx, my, mw, mh] = MA.box; glass(mx, my, mw, mh, boxA);
    if (!stamping) { g.save(); g.globalAlpha *= boxA; if (FX.drawValue) FX.drawValue('mult', mv > 0 ? mv : 'x', MA.x, MA.y, 56, { maxW: mw - 16 }); g.restore(); } }
  const CH = HUDA.chip && window.FW_AA2 && FW_AA2.reminderOn() ? FW_AA2.chipRect() : HUDA.chip; if (CH && S.mode !== 'base') { // AA2 pass: chip shares the under-frame slot with the +5 reminder g.save(); if (outroOn) g.globalAlpha = .12; // D2 hand-count chip (bonus / Heavenly)
    g.fillStyle = 'rgba(0,0,0,.4)'; rr(CH[0], CH[1], CH[2], CH[3], 20); g.fill(); g.fillStyle = '#c9e7d6'; g.font = 'bold 24px Arial';
    g.fillText(`${S.mode === 'heavenly' ? '天和 HEAVENLY HAND' : '胡 BONUS HANDS'}  ·  HAND ${S.handsTotal - S.handsLeft}/${S.handsTotal}`, CH[0] + CH[2] / 2, CH[1] + CH[3] / 2, CH[2] - 24); g.restore(); }
  // balance / bet / buttons / spin: GSS UI kit (hud.js + ui/gss-ui.js)
  // v3: HUD slide-up as the splash exits (distance from the kit's own layout top; no fixed positions). Hidden under the splash until its exit reveal.
  const sst = WIN && WIN.state(), hudDy = sst && sst.scene === 'splash' && window.FW_HUD && FW_HUD.top ? (C.H - FW_HUD.top()) * (1 - eOutC(Math.max(0, Math.min(1, ((sst.exit || 0) - .45) / .55)))) : 0;
  if (window.FW_AA2 && !hudDy) FW_AA2.drawGame(g); // AA2 pass: hint caption, Rising Fan ladder strip, +5 reminder (game area, under the frame)
  if (window.FW_HUD) { if (hudDy) { g.save(); g.translate(0, hudDy); } FW_HUD.draw(g); if (hudDy) g.restore(); }
  if (window.FW_AA2 && !hudDy) FW_AA2.drawHudExtras(g); // boost cost under SPIN
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // message
  if (S.msg && now() < S.msgT && !FX.state.count && !FX.hideMsg(S.msg)) {
    g.fillStyle = 'rgba(40,6,6,.88)'; rr(90, GY + GH - 96, 900, 58, 18); g.fill(); g.strokeStyle = '#f2cf6b'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#ffe9a8'; g.font = `900 ${S.msg.length > 30 ? 24 : 30}px "Arial Black",Arial`; g.fillText(S.msg, 540, GY + GH - 67);
  }
  if (DEBUG) {
    g.textAlign = 'left'; g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(0, 0, 1080, 30 + S.log.length * 22);
    g.fillStyle = '#8f8'; g.font = '18px monospace'; g.fillText(`demo=${DEMO || '-'} mode=${S.mode} art=${Object.keys(FW_ART).length}/14 hunt=${S.hunt}`, 10, 16);
    S.log.forEach((l, i) => g.fillText(l, 10, 40 + i * 22));
  }
}
function frame() { runTweens();FX.begin(); drawBg();FX.backdrop();g.save();const shake=FX.boardOffset();g.translate(shake.x,shake.y);drawGrid();g.restore();drawHud();FX.overlay();if (WIN) WIN.draw(g);drawHudVeil();if (window.FW_HUD) FW_HUD.overlay(g);if (window.FW_AA2) FW_AA2.drawModal(g);requestAnimationFrame(frame); }

// ---------- input ----------
function hit(e) {
  const rc = cv.getBoundingClientRect(); const x = (e.clientX - rc.left) * C.W / rc.width, y = (e.clientY - rc.top) * C.H / rc.height;
  if (window.FW_AA2 && FW_AA2.hit(x, y)) return; // AA2 buy menu / help page (modal) take taps first
  if (WIN && WIN.hit(x, y)) return; // shared/win presentations take taps (skip / continue / collect)
  if (window.FW_HUD) FW_HUD.hit(x, y); // all HUD buttons live in hud.js (GSS UI kit)
}
cv.addEventListener('pointerdown', hit);
addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); if (!(window.FW_AA2 && FW_AA2.open)) spin(); } });

// initial board (no win shown, just tiles). First render waits for glyph + plate decode (≤700 ms) so
// TOTAL WIN never draws its canvas-€ fallback on load.
// K1 SHOW INTRO (kit menu) re-opens the splash at once between spins; autoplay stops (the splash never auto-continues)
async function showSplash() { if (!WIN || !WIN.splash || S.busy) return false; if (window.FW_HUD && FW_HUD.kit && FW_HUD.kit.stopAutoplay) FW_HUD.kit.stopAutoplay();
  S.busy = true; await WIN.splash({ gameId: GSS_GAME.id }); S.busy = false; return true; }
window.FW = { showSplash,  S, spin, FX, WIN, setBoost, buyFeature, cost: spinCost, bet, boostDef, fmt, PAY_IDS, cellX, cellY, GX, GY, GW, GH, drawTile, get hudVeil() { return HUDVEIL_A; } }; // debug hook (hudVeil: last HUD-band veil alpha, QA)
Promise.all([window.FW_FX.whenReady ? FW_FX.whenReady(700) : null, WIN ? WIN.whenReady(700) : null]).then(r => {
  S.readyInfo = r;
  const deal = () => { const gr = []; for (let c = 0; c < C.COLS; c++) { gr[c] = []; for (let r = 0; r < C.ROWS; r++) gr[c][r] = makeTile(PAY_IDS[(c * 5 + r * 2) % 9]); } dropIn(gr); };
  frame();
  // Feature Splash (STANDARDS §1) on load unless DON'T SHOW AGAIN was saved; the first deal comes From the Wall as it exits. No RNG in the splash.
  if (WIN && WIN.splash && window.GSSUI && !GSSUI.splash.isHidden(GSS_GAME.id)) { S.busy = true; let dealt = false; const go = () => { if (!dealt) { dealt = true; deal(); } };
    WIN.splash({ gameId: GSS_GAME.id, onExit: () => GSSUI.timeWarp.realSetTimeout(go, 600) }).then(() => { S.busy = false; go(); }); }
  else deal();
});
if (Q.get('autospin')) setTimeout(spin, 1200);
})();
