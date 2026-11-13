// FOUR WINDS 四風 — AA2 improvement pass UI (Studio Lead 2026-11-12). Presentation + menus only: no RNG, no pays.
// Buy & boost menu (5 options), paytable / help page, one-time 8+ PAY ANYWHERE hint, Rising Fan ladder strip,
// bonus [胡][胡][胡] → +5 reminder, boost cost under SPIN, bought-entry veil.
// Art drops in through aa2_art.js; copy drops in through window.FW_AA2_COPY (same keys as COPY below).
(function () {
  const C = window.FW_CONFIG, W = C.W, H = C.H;
  const now = () => performance.now();
  const ART = {}; (() => { const A = window.FW_AA2_ART || {}; Object.entries(A.files || {}).forEach(([k, f]) => { const im = new Image(); im.onload = () => { ART[k] = im; }; im.src = (A.dir || 'assets/aa2_pass/') + f; }); })();
  const FONT = (window.GSSUI && GSSUI.FONT) || 'Arial, sans-serif';
  const F = (w, px) => `${w} ${Math.round(px)}px ${FONT}`;
  const th = () => (window.FW_HUD && FW_HUD.theme) || { accent: '#f2c45a', text: '#fffaf0', label: 'rgba(225,238,228,0.75)', muted: 'rgba(240,230,205,0.55)', rim: 'rgba(240,222,170,0.80)', pillFill: '#062a1f', pillOpacity: .62, pillGloss: .1, rimWidth: 2 };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const pill = (g, x, y, w, h, active) => { if (window.GSSUI && GSSUI.pill) GSSUI.pill(g, th(), x, y, w, h, { active }); else { g.fillStyle = 'rgba(6,42,31,.8)'; rr(g, x, y, w, h, h / 2); g.fill(); g.strokeStyle = th().rim; g.lineWidth = 2; g.stroke(); } };
  const FWo = () => window.FW, S = () => window.FW && FW.S, fmt = v => (window.FW && FW.fmt) ? FW.fmt(v) : '€' + v.toFixed(2);
  const bet = () => C.BETS[S().betI];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), eOut = u => 1 - Math.pow(1 - clamp(u), 3);
  const img = (g, im, x, y, w, h, a = 1) => { if (!im) return false; g.save(); g.globalAlpha *= a; g.drawImage(im, x, y, w, h); g.restore(); return true; };
  const tile = (g, id, cx, cy, w, a = 1) => { const im = window.FW_ART && FW_ART[id]; const h = w * 1.35; if (im) return img(g, im, cx - w / 2, cy - h / 2, w, h, a);
    g.save(); g.globalAlpha *= a; g.fillStyle = '#fffaf0'; rr(g, cx - w / 2, cy - h / 2, w, h, w * .12); g.fill(); g.fillStyle = '#b2222a'; g.font = F(800, w * .5); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(id === 'SYM14_heavenly' ? '天' : id === 'SYM13_hu' ? '胡' : '•', cx, cy); g.restore(); };
  const SAMPLE = { SYM10_flower: ['flower', 1], SYM11_fan: ['fan', 5], SYM12_rising_fan: ['rising', 2] }; // plain tiles: value glyphs drawn on top
  const tileV = (g, id, cx, cy, w, v, a = 1) => { tile(g, id, cx, cy, w, a); const s = SAMPLE[id]; if (s) FXv(s[0], v ?? s[1], cx, cy, w * .36, { maxW: w * .9, alpha: a, plate: s[0] === 'flower' ? null : 'halo' }); };
  const FXv = (kind, v, x, y, h, o) => { if (window.FW && FW.FX && FW.FX.drawValue) return FW.FX.drawValue(kind, v, x, y, h, o); };
  const title = (s, x, y, h, o) => { if (window.FW_WIN && FW_WIN.drawTitle) FW_WIN.drawTitle(s, x, y, h, Infinity, 'stamp', Object.assign({ noGlint: true }, o)); };
  function wrap(g, text, maxW) { const out = []; String(text).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); }); return out; }

  // ---------------- copy: design/AA2_PASS.md §2.7 / §3.2 / §4 (GD). Override via window.FW_AA2_COPY. No "free". ----------------
  const COPY = Object.assign({
    buyTitle: 'BUY & BOOST',
    boostOn: 'BOOST ON', perSpin: 'PER SPIN', tenHands: '10 HANDS',
    noBalance: 'Not enough balance for this option.', unavailable: 'Not available.', autoplayLock: 'Stop autoplay to change buys and boosts.',
    tipIdle: 'Boosts stay on until you turn them off. One boost at a time.\nBuys start the feature at once.',
    hint: 'PAY ANYWHERE', hintLead: '8+',
    reminder: '3 BONUS = +5 HANDS', reminderShort: '+5 HANDS', // pill art: [3 × 胡 tiles] + '+5 HANDS' (the tiles read as '3 BONUS')
    helpTitle: 'PAYTABLE & RULES',
    payHead: b => `PAYS AT YOUR BET ${fmt(b)}`,
    payCols: ['8–9', '10–11', '12–30'],
    rules: [
      { t: 'DOUBLE KONG', tile: 'SYM06_north', x: '8 or more of the same tile anywhere on the table pay. No lines. Fan, Rising Fan, 胡 and 天和 do not pay.' },
      { t: 'FROM THE WALL', tile: 'SYM02_3dots', x: 'Winning tiles leave the table. The tiles above drop, and new tiles fall from the top. This repeats while there are wins. Fans, 胡 and 天和 stay.' },
      { t: 'EIGHT FLOWERS', tile: 'SYM10_flower', x: 'Each Flower shows a value from 0.2× to 25× bet. With 8 or more Flowers on the table, all Flower values pay together, then the Flowers leave like a kong.' },
      { t: 'FAN AND RISING FAN', tile: 'SYM11_fan', bands: [2, 10, 50], x: 'When the deal ends with a win, all wins are multiplied by the sum of every Fan on the table. A Fan shows ×2 to ×100. A Rising Fan lands at ×2 and climbs on every win: ×2, ×3, ×4, ×5, ×7, ×10, ×15, ×25, ×50, up to ×100.' },
      { t: 'BONUS HANDS', tile: 'SYM13_hu', x: '4 or more 胡 in one deal award 10 Bonus Hands. The Table Fan starts empty, and the first fan sets it. A Table Fan collects every fan that pays, and each winning hand is multiplied by the Table Fan plus the fans on the table. 3 or more 胡 in one hand add 5 hands.' },
      { t: 'HEAVENLY HAND', tile: 'SYM14_heavenly', x: '3 胡 and a 天和 in one deal award 10 Heavenly Hands. The Table Fan starts empty, and the first fan sets it. Only Rising Fans land, from ×2 to ×50. 3 or more 胡 in one hand add 5 hands.' },
      { t: 'BUY MENU', tile: null, x: 'Hand Hunt (1.5× bet): 3× the chance of Bonus Hands. Heavenly Hunt (2× bet): more features, and each one is a Heavenly Hand. Guaranteed Rising Fan (5× bet): a Rising Fan on every deal. Buy Bonus Hands (100× bet) and Buy Heavenly Hand (300× bet) start the feature at once. Hunts and the Rising Fan stay on until you turn them off. The menu can be used only when the bet can be changed. Some options may not be available.' },
    ],
    malfunction: 'Malfunction voids all pays and plays.',
    demo: 'Demo math · uncalibrated · no real wagering.',
  }, window.FW_AA2_COPY || {});

  // ---------------- state ----------------
  const UI = { modal: null, sel: null, help: { scroll: 0, max: 0, drag: null }, openT: 0, hit: [] };
  const busy = () => !S() || S().busy || S().mode !== 'base';
  const autoplayOn = () => !!(window.FW_HUD && FW_HUD.kit && FW_HUD.kit.state && FW_HUD.kit.state.autoplay);
  function openBuy() { if (busy()) return; UI.modal = 'buy'; UI.sel = S().boost || null; UI.openT = now(); }
  function openHelp() { UI.modal = 'help'; UI.help.scroll = 0; UI.openT = now(); }
  function close() { UI.modal = null; }

  // ---------------- game area: under-frame band y1380–1492 (AA2_ART_SPEC §4–§5); never at the top ----------------
  const RAIL = [180, 1390, 720, 88], LANE = [241, 1408, 596, 52]; // A10 placement + lane zone (ladder_rail_9slice.json)
  const PILL5 = [576, 1398, 312, 72], CHIP = [180, 1398, 380, 72]; // bonus: chip x180–560, +5 pill x576–888
  function ladderOn() { const s = S(); if (!s || s.mode !== 'base') return false; const B = s.boost && C.BUY[s.boost]; return !!(B && B.ladder); }
  function risingMax() { const s = S(); let m = 0; (s.grid || []).forEach(col => (col || []).forEach(t => { if (t && t.id === 'SYM12_rising_fan' && t.val > m) m = t.val; })); return m; }
  function nine(g, im, x, y, w, h, cap) { if (!im) return false; const k = h / im.height, c = cap || im.height / 2, C2 = c * k; // horizontal 3-slice (A10 / A14 caps)
    g.drawImage(im, 0, 0, c, im.height, x, y, C2, h); g.drawImage(im, c, 0, im.width - 2 * c, im.height, x + C2, y, w - 2 * C2, h); g.drawImage(im, im.width - c, 0, c, im.height, x + w - C2, y, C2, h); return true; }
  function capsule(g, r, key, a = .42) { const [x, y, w, h] = r; if (!nine(g, ART[key], x, y, w, h, 44 * ((ART[key] && ART[key].height / h) || 1))) { g.fillStyle = `rgba(0,0,0,${a})`; rr(g, x, y, w, h, h / 2); g.fill(); g.strokeStyle = 'rgba(242,214,150,.5)'; g.lineWidth = 2; g.stroke(); } }
  function drawLadder(g) {
    const L = C.MULT_LADDER, lit = risingMax(), t = now();
    capsule(g, RAIL, 'ladder_rail', .45);
    // AD: values at cap 24 in band glyphs (fan_red / lapis / imperial via the fx band hook), current ×1.3 on the t2 marker.
    // Guaranteed Rising Fan (×5–×50): the landing step lights, every step below it dims.
    const caps = 24, ws = L.map(v => 15 * (String(v).length + 1) + 4), tot = ws.reduce((a, b) => a + b, 0), pad = (LANE[2] - tot) / L.length; let x = LANE[0];
    const pos = L.map((v, i) => { const cx = x + pad / 2 + ws[i] / 2; x += ws[i] + pad; return cx; });
    [0, 1].forEach(pass => L.forEach((v, i) => { const cx = pos[i], cy = LANE[1] + LANE[3] / 2, on = v === lit, past = lit && v < lit; // pass 0: marker under everything, pass 1: values
      if (pass === 0 && on) { const pulse = 1 + .04 * Math.sin(t / 260); if (!img(g, ART.ladder_marker, cx - 56 * pulse, cy - 38 * pulse, 112 * pulse, 76 * pulse)) { g.save(); g.globalAlpha = .7 + .3 * Math.sin(t / 220); const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 50); gr.addColorStop(0, 'rgba(255,214,110,.9)'); gr.addColorStop(1, 'rgba(255,214,110,0)'); g.fillStyle = gr; g.fillRect(cx - 56, cy - 38, 112, 76); g.restore(); } }
      if (pass === 1) FXv('mult', v, cx, cy, on ? caps * 1.3 : caps, { maxW: on ? 98 : ws[i] + pad * .8, alpha: past ? .38 : 1 }); }));
  }
  function drawReminder(g) { // bonus / Heavenly, persistent: [3 mini 胡] 3 BONUS = +5 HANDS
    const s = S(); if (!s || s.mode === 'base') return; const [x, y, w, h] = PILL5;
    const outro = window.FW_WIN && FW_WIN.state && FW_WIN.state().scene === 'outro';
    g.save(); if (outro) g.globalAlpha = .12; if (!img(g, ART.pill, x, y, w, h)) capsule(g, PILL5, 'pill', .4);
    const tb = [x + 32, y + 14, 244, 43], ty = tb[1] + tb[3] / 2; // text_box from hint_pill_9slice.json (w312)
    [0, 1, 2].forEach(i => tile(g, 'SYM13_hu', tb[0] + 17 + i * 32, ty, 30));
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = F(800, 24); g.fillStyle = th().text; const tx0 = tb[0] + 100; g.fillText(COPY.reminderShort, tx0 + (tb[0] + tb[2] - tx0) / 2, ty + 1, tb[0] + tb[2] - tx0 - 4);
    g.restore();
  }
  // 8+ PAY ANYWHERE: in the empty TOTAL WIN pill (GD §4.1; Lead decision). game.js asks hintAlpha() and calls drawHintIn(box).
  function hintAlpha() { const s = S(); if (!s || s.mode !== 'base' || s.win > 0) return 0; return s.hintPay ? 1 : s.hintPayOffT ? 1 - clamp((now() - s.hintPayOffT) / 400) : 0; }
  function drawHintIn(g, cx, cy, maxW, a) { g.save(); g.globalAlpha *= a; g.textBaseline = 'middle';
    if (img(g, ART.pill420, cx - 210, cy - 36, 420, 72)) { cx = cx - 210 + 208; cy = cy - 36 + 35.5; maxW = Math.min(maxW, 344); } // text_box (32,14)–(384,57)
    g.font = F(800, 28); const lead = COPY.hintLead + ' ', wl = g.measureText(lead).width, wt = g.measureText(COPY.hint).width, k = Math.min(1, maxW / (wl + wt)), x0 = cx - (wl + wt) * k / 2;
    g.translate(x0, cy); g.scale(k, 1); g.textAlign = 'left'; g.fillStyle = '#f2c45a'; g.fillText(lead, 0, 0); g.fillStyle = '#fffaf0'; g.fillText(COPY.hint, wl, 0); g.restore(); }
  const chipRect = () => CHIP.slice();
  function drawGame(g) { const s = S(); if (!s) return; if (s.mode === 'base') { if (ladderOn()) drawLadder(g); } else drawReminder(g); }
  function drawHudExtras(g) { // boost cost under SPIN (HUD band, kit font)
    const s = S(); if (!s || s.mode !== 'base' || !s.boost) return; const B = C.BUY[s.boost]; if (!B) return;
    const L = window.FW_HUD && FW_HUD.layout, sp = L && L.spin; if (!sp) return;
    const y = sp.y + sp.r + 22 * (L.k || 1); g.save(); g.textBaseline = 'middle';
    const a = fmt(bet() * B.cost), b = ' ' + COPY.perSpin; g.font = F(800, 28); const wa = g.measureText(a).width; g.font = F(700, 20); const wb = g.measureText(b).width, x0 = sp.x - (wa + wb) / 2;
    g.textAlign = 'left'; g.fillStyle = th().accent; g.font = F(800, 28); g.fillText(a, x0, y); g.fillStyle = th().label; g.font = F(700, 20); g.fillText(b, x0 + wa, y + 1); g.restore();
  }

  // ---------------- buy menu: AA2_ART_SPEC §3 (panel x16–1064, y1216–1816; 5 cards 184×384) ----------------
  const PANEL = [16, 1216, 1048, 600], CARD_X = { hunt: 50, heavenlyHunt: 246, risingFan: 442, buyBonus: 650, buyHeavenly: 846 }, CARD_Y = 1327, CW = 184, CH = 384, TIP = [56, 1719, 968, 67]; // buy_panel_9slice.json placement_1x + tooltip zone
  function cardState(id) { const B = C.BUY[id], s = S(), price = bet() * B.cost, off = B.enabled === false, auto = autoplayOn();
    const on = B.kind === 'boost' && s.boost === id, poor = !off && !on && s.balance < price;
    return { B, price, off, auto, poor, on, disabled: off || auto || poor }; }
  function emblem(g, id, cx, cy) { // A04–A08 drop-in (160×160), else live tile art
    if (img(g, ART['emblem_' + id], cx - 74, cy - 74, 148, 148)) return; // 160 file drawn at 148 (window ivory is 151 wide) const t = now();
    if (id === 'hunt') [-1, 0, 1].forEach(i => tile(g, 'SYM13_hu', cx + i * 34, cy + Math.abs(i) * 8, 64));
    else if (id === 'heavenlyHunt') { tile(g, 'SYM13_hu', cx - 30, cy + 6, 62); tile(g, 'SYM14_heavenly', cx + 24, cy - 4, 70); }
    else if (id === 'risingFan') tileV(g, 'SYM12_rising_fan', cx, cy, 96, [5, 7, 10, 15, 25, 50][Math.floor(t / 700) % 6]);
    else if (id === 'buyBonus') [-1.5, -.5, .5, 1.5].forEach(i => tile(g, 'SYM13_hu', cx + i * 28, cy + Math.abs(i) * 5, 54));
    else if (id === 'buyHeavenly') { [-1, 1].forEach(i => tile(g, 'SYM13_hu', cx + i * 40, cy + 10, 52)); tile(g, 'SYM14_heavenly', cx, cy - 4, 74); }
  }
  function drawBuy(g) {
    const T = th(), k = eOut((now() - UI.openT) / 220), ids = C.BUY_ORDER.filter(id => C.BUY[id] && CARD_X[id] != null); UI.hit = [];
    g.save(); g.fillStyle = `rgba(0,0,0,${.55 * k})`; g.fillRect(0, 0, W, H); g.globalAlpha = k; g.translate(0, (1 - k) * 40);
    const [px, py, pw, ph] = PANEL;
    if (!img(g, ART.buy_panel, px, py, pw, ph)) { rr(g, px, py, pw, ph, 36); g.fillStyle = 'rgba(4,26,18,.96)'; g.fill(); g.strokeStyle = T.rim; g.lineWidth = 2; g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ART.buy_panel ? '#fffaf0' : T.accent; g.font = F(800, 38); g.fillText(COPY.buyTitle, 540, 1276, 740); // title_box (140,28)–(908,92)
    const xc = 16 + 996, yc = 1216 + 60; // close_x_box (968,28)–(1024,92) g.strokeStyle = T.text; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(xc - 14, yc - 14); g.lineTo(xc + 14, yc + 14); g.moveTo(xc + 14, yc - 14); g.lineTo(xc - 14, yc + 14); g.stroke();
    UI.hit.push({ r: [xc - 44, yc - 44, 88, 88], fn: close });
    ids.forEach(id => { const st = cardState(id), { B } = st, x = CARD_X[id], y = CARD_Y, sel = UI.sel === id;
      g.save(); if (st.disabled) g.globalAlpha *= .45;
      if ((st.on || sel) && !st.disabled) { if (!img(g, ART.card_rim, x - 13.7, y - 11.6, 207, 405)) { g.save(); g.globalAlpha *= .75 + .25 * Math.sin(now() / 900 * Math.PI); g.shadowColor = 'rgba(255,214,110,.9)'; g.shadowBlur = 18; rr(g, x - 3, y - 3, CW + 6, CH + 6, 24); g.strokeStyle = '#ffd76a'; g.lineWidth = 4; g.stroke(); g.restore(); } }
      if (!img(g, ART.card, x, y, CW, CH)) { rr(g, x, y, CW, CH, 22); g.fillStyle = 'rgba(10,22,16,.96)'; g.fill(); g.strokeStyle = 'rgba(242,214,150,.5)'; g.lineWidth = 2; g.stroke();
        rr(g, x + 10, y + 10, 164, 172, 14); g.fillStyle = '#efe4c8'; g.fill(); rr(g, x + 18, y + 270, 148, 52, 26); g.fillStyle = 'rgba(20,90,62,.75)'; g.fill(); g.strokeStyle = 'rgba(242,214,150,.6)'; g.stroke(); }
      emblem(g, id, x + 91, y + 112); // emblem_draw (17,38)–(165,186)
      g.fillStyle = T.text; g.font = F(800, 20); const nm = B.name, lines = wrap(g, nm, 156); // name_field (10,213)–(174,273): 19–21 px, 2 lines, lh 24
      lines.slice(0, 2).forEach((ln, j) => g.fillText(ln, x + 92, y + 243 + (j - (Math.min(2, lines.length) - 1) / 2) * 24, 158));
      let fs = 28; g.font = F(800, fs); const pt = fmt(st.price); while (fs > 20 && g.measureText(pt).width > 136) { fs--; g.font = F(800, fs); } g.fillStyle = '#f2c45a'; g.fillText(pt, x + 91.5, y + 311, 140); // price_plate (16,285)–(167,335)
      g.fillStyle = '#fff1c4'; g.font = F(700, 15); g.fillText(B.kind === 'boost' ? `${B.cost}× · ${COPY.perSpin}` : COPY.tenHands, x + 92, y + 356, 156); // foot_subline (10,340)–(174,371)
      if (st.on) { const bx = x + 32, by = y - 14; if (!img(g, ART.boost_badge, bx, by, 120, 40)) { rr(g, bx, by, 120, 40, 20); g.fillStyle = '#b8862b'; g.fill(); g.strokeStyle = '#fff1c4'; g.lineWidth = 1.5; g.stroke(); } g.fillStyle = '#fffaf0'; g.font = F(800, 16); g.fillText(COPY.boostOn, bx + 60, by + 20.5, 92); } // A09 text_box (12,8)–(108,33)
      g.restore();
      UI.hit.push({ r: [x, y, CW, CH], fn: () => tapCard(id) }); });
    // tooltip: 2 lines for the selected card
    const [tx, ty, tw, tH] = TIP; if (!ART.buy_panel) { rr(g, tx, ty, tw, tH, 18); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill(); }
    const sid = UI.sel, st = sid && cardState(sid), msg = autoplayOn() ? COPY.autoplayLock : !sid ? COPY.tipIdle : st.off ? COPY.unavailable : st.poor ? COPY.noBalance : `${st.B.name} · ${fmt(st.price)}${st.B.kind === 'boost' ? ' ' + COPY.perSpin.toLowerCase() : ''}\n${st.B.line}`;
    g.font = F(600, 24); g.fillStyle = T.text; const ml = wrap(g, msg, tw - 40).slice(0, 2); ml.forEach((ln, i) => g.fillText(ln, 540, ty + tH / 2 + (i - (ml.length - 1) / 2) * 29, tw - 30));
    UI.panel = PANEL;
    g.restore();
  }
  function tapCard(id) { const st = cardState(id); UI.sel = id; if (st.disabled) return;
    if (st.B.kind === 'boost') { FWo().setBoost(st.on ? null : id); return; }
    // buys: kit confirm sheet (STANDARDS §1 / §5: buy sheets use hud.openSheet)
    const hud = window.FW_HUD && FW_HUD.kit; close(); if (!hud) return;
    hud.openSheet({ title: st.B.name, leadBright: true, lines: [`${fmt(st.price)}  (${st.B.cost}× bet ${fmt(bet())})`, st.B.line, 'Starts at once.'],
      buttons: [{ label: 'CANCEL', onTap: () => { openBuy(); UI.sel = id; } }, { label: 'BUY', primary: true, onTap: () => FWo().buyFeature(id) }] }); }

  // ---------------- help / paytable: AA2_ART_SPEC §6 (A12 bg; scroll column x72–1008, y216–1800) ----------------
  const COLX = 72, COLW = 936, VY = 216, VH = 1800 - 216;
  function divider(g, y) { if (!img(g, ART.help_divider, 90, y - 26, 900, 52)) { const gr = g.createLinearGradient(90, 0, 990, 0); gr.addColorStop(0, 'rgba(242,214,150,0)'); gr.addColorStop(.5, 'rgba(242,214,150,.7)'); gr.addColorStop(1, 'rgba(242,214,150,0)'); g.fillStyle = gr; g.fillRect(90, y - 1, 900, 2); } }
  function helpContent(g, y0, draw) {
    const T = th(), X = COLX, CWd = COLW; let y = y0;
    const head = s => { if (draw) title(s, 540, y + 30, 38, { maxW: CWd }); y += 76; };
    const sep = () => { y += 32; if (draw) divider(g, y); y += 44; };
    head('PAYS');
    if (draw) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = T.label; g.font = F(600, 24); g.fillText(COPY.payHead(bet()), 540, y); } y += 44;
    const cols = [0, 2, 4], cx0 = X + 170, colW = (CWd - 170) / 3;
    if (draw) { g.font = F(800, 26); g.fillStyle = T.accent; COPY.payCols.forEach((l, i) => g.fillText(l, cx0 + colW * (i + .5), y)); } y += 30;
    Object.keys(C.PAYS).slice().reverse().forEach((id, i) => { const rh = 156;
      if (draw) { if (i % 2 === 0) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(X, y, CWd, rh); }
        tile(g, id, X + 70, y + rh / 2, 100); g.textAlign = 'center'; g.textBaseline = 'middle';
        cols.forEach((j, c) => { g.fillStyle = T.text; g.font = F(800, 32); g.fillText(fmt(C.PAYS[id][j] * bet()), cx0 + colW * (c + .5), y + rh / 2, colW - 10); }); }
      y += rh; });
    sep(); head('RULES');
    COPY.rules.forEach((R, ri) => {
      const tx = R.tile ? X + 160 : X, tw = CWd - (tx - X); g.font = F(500, 26); const lines = wrap(g, R.x, tw); const hh = Math.max(R.tile ? 178 + (R.bands ? 60 : 0) : 0, 48 + lines.length * 34) + 28;
      if (draw) { if (R.tile) { tileV(g, R.tile, X + 67, y + 89 + 8, 134); if (R.bands) R.bands.forEach((v, i) => FXv('mult', v, X + 22 + i * 45, y + 216, 26, { maxW: 44 })); }
        g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = T.accent; g.font = F(800, 28); g.fillText(R.t, tx, y + 22);
        g.fillStyle = T.text; g.font = F(500, 26); lines.forEach((ln, i) => g.fillText(ln, tx, y + 62 + i * 34)); }
      y += hh; if (ri === 5) sep(); });
    sep();
    if (draw) { g.textAlign = 'center'; g.fillStyle = T.text; g.font = F(700, 28); g.fillText(COPY.malfunction, 540, y); g.fillStyle = T.muted; g.font = F(500, 22); g.fillText(COPY.demo, 540, y + 40); }
    y += 80; return y - y0;
  }
  function drawHelp(g) {
    const T = th(), k = eOut((now() - UI.openT) / 220); UI.hit = [];
    g.save(); g.globalAlpha = k;
    if (!img(g, ART.help_bg, 0, 0, W, H)) { g.fillStyle = 'rgba(3,20,14,.97)'; g.fillRect(0, 0, W, H); const hg = g.createLinearGradient(0, 0, 0, 192); hg.addColorStop(0, 'rgba(120,20,20,.55)'); hg.addColorStop(1, 'rgba(60,10,10,.25)'); g.fillStyle = hg; g.fillRect(0, 0, W, 192); divider(g, 192); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = T.accent; g.font = F(800, 40); g.fillText(COPY.helpTitle, 540, 104, 760);
    const cx = 1000, cy = 100; g.strokeStyle = T.text; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 18, cy - 18); g.lineTo(cx + 18, cy + 18); g.moveTo(cx + 18, cy - 18); g.lineTo(cx - 18, cy + 18); g.stroke();
    const total = helpContent(g, 0, false); UI.help.max = Math.max(0, total - VH); UI.help.scroll = clamp(UI.help.scroll, 0, UI.help.max);
    g.save(); g.beginPath(); g.rect(0, VY, W, VH); g.clip(); helpContent(g, VY - UI.help.scroll, true); g.restore();
    if (UI.help.max > 0) { const bh = VH * VH / (VH + UI.help.max), byy = VY + (VH - bh) * UI.help.scroll / UI.help.max; g.fillStyle = 'rgba(242,214,150,.45)'; rr(g, 1040, byy, 6, bh, 3); g.fill(); }
    UI.hit.push({ r: [cx - 50, cy - 50, 100, 100], fn: close });
    UI.hit.push({ r: [0, VY, W, VH], fn: null, scroll: true });
    UI.hit.push({ r: [0, 0, W, H], fn: () => {} });
    g.restore();
  }

  // ---------------- bought-entry veil (800 ms) ----------------
  function drawBought(g) { const s = S(); const b = s && s.bought; if (!b) return; const q = (now() - b.t) / 800; if (q > 1.4) return;
    const a = q < 1 ? eOut(q) * .7 : .7 * (1 - (q - 1) / .4); g.save(); g.fillStyle = `rgba(0,8,5,${a})`; g.fillRect(0, 0, W, H);
    if (q < 1) title(C.BUY[b.id].name, W / 2, 900, 56, { maxW: 860, alpha: clamp(q * 3) * (1 - clamp((q - .8) / .2)) }); g.restore(); }

  function drawModal(g) { drawBought(g); if (UI.modal === 'buy') { if (busy()) close(); else drawBuy(g); } else if (UI.modal === 'help') drawHelp(g); }
  const inR = (r, x, y) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  function hit(x, y) { if (!UI.modal) return false;
    for (const h of UI.hit) if (inR(h.r, x, y)) { if (h.scroll) { UI.help.drag = { y, s: UI.help.scroll, moved: 0 }; return true; } if (h.fn) h.fn(); return true; }
    if (UI.panel && UI.modal === 'buy' && !inR(UI.panel, x, y)) close(); return true; }
  // help scrolling: drag + wheel (the game only forwards pointerdown)
  (function bind() { const cv = document.getElementById('c'); if (!cv) return setTimeout(bind, 50);
    const toY = e => { const r = cv.getBoundingClientRect(); return (e.clientY - r.top) * H / r.height; };
    cv.addEventListener('pointermove', e => { const d = UI.help.drag; if (UI.modal === 'help' && d && e.buttons) { UI.help.scroll = clamp(d.s - (toY(e) - d.y), 0, UI.help.max); } });
    addEventListener('pointerup', () => { UI.help.drag = null; });
    cv.addEventListener('wheel', e => { if (UI.modal === 'help') { e.preventDefault(); UI.help.scroll = clamp(UI.help.scroll + e.deltaY, 0, UI.help.max); } }, { passive: false });
    addEventListener('keydown', e => { if (UI.modal && e.code === 'Escape') close(); if (UI.modal === 'help' && (e.code === 'ArrowDown' || e.code === 'ArrowUp')) UI.help.scroll = clamp(UI.help.scroll + (e.code === 'ArrowDown' ? 120 : -120), 0, UI.help.max); });
  })();

  window.FW_AA2 = { drawGame, drawHudExtras, drawModal, hit, openBuy, openHelp, close, chipRect, hintAlpha, drawHintIn, reminderOn: () => !!(S() && S().mode !== 'base'), COPY, ART, UI,
    get open() { return !!UI.modal; }, scrollHelp(v) { UI.help.scroll = clamp(v, 0, UI.help.max); }, get helpMax() { return UI.help.max; } };
})();
