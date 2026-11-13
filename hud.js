// FOUR WINDS 四風 — GSS UI kit hookup (presentation only; no game math here).
// Loads after ui/gss-ui.js and BEFORE fx.js/game.js so turbo/quick spin can warp the clock.
(function () {
  const C = window.FW_CONFIG;
  const clock = GSSUI.timeWarp.install();
  const THEME = {
    name: 'FOUR WINDS',
    subline: 'demo math · no real wagering',
    accent: '#f2c45a', accent2: '#fff1c4',
    pillFill: '#062a1f', pillOpacity: 0.62, pillGloss: 0.10,
    rim: 'rgba(240,222,170,0.80)', rimWidth: 2,
    text: '#fffaf0', muted: 'rgba(240,230,205,0.55)', label: 'rgba(225,238,228,0.75)',
    spinDisc: ['#2f6b55', '#03140e'], spinRim: 'rgba(242,214,150,0.95)', spinIcon: '#fffaf0',
    divider: 'rgba(240,222,170,0.32)',
    bar: 'rgba(2,14,10,0.86)', barRim: 'rgba(242,214,150,0.22)',
  };
  const SPEED = { turbo: 1.8, quick: 1.6 }; // multiplied when both are on (≈2.9×)
  let hud = null, api = null, ptrBound = false;

  function bindPointer() {
    if (ptrBound) return;
    const cv = document.getElementById('c');
    if (!cv || !hud) return;
    ptrBound = true;
    const toXY = e => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height };
    };
    // pointerdown stays in the game; these only feed popup scrolling
    cv.addEventListener('pointermove', e => { if (hud) { const p = toXY(e); hud.pointerMove(p.x, p.y); } });
    cv.addEventListener('pointerup', () => hud && hud.pointerUp());
    cv.addEventListener('pointercancel', () => hud && hud.pointerUp());
  }

  function ensure() {
    if (hud) { bindPointer(); return true; }
    if (!window.FW) return false;
    api = window.FW; const S = api.S;
    const cost = () => api.cost ? api.cost() : C.BETS[S.betI] * (S.hunt ? C.HUNT_COST : 1); // per-spin price incl. the active boost (game.js spinCost)
    const B = () => (S.boost && C.BUY && C.BUY[S.boost]) || null;
    const applySpeed = () => clock.setSpeed((hud.state.turbo ? SPEED.turbo : 1) * (hud.state.quick ? SPEED.quick : 1));
    hud = GSSUI.createHud({
      W: C.W, H: C.H, theme: THEME, orientation: 'portrait', layout: 'D2', gameId: '002_four_winds', // kit v1.1 K1: SHOW INTRO clears gss.002_four_winds.splash.hidden
      get: {
        balance: () => api.FX.number('balance', S.balanceHold ?? S.balance), // display hold during a bonus (game.js S.balanceHold; credited once at the outro collect)
        win: () => api.FX.number('win', S.mode === 'base' ? S.win : S.bonusWin),
        bet: () => C.BETS[S.betI], // AA2 pass: the BET pill shows the bet; the boosted per-spin cost sits under SPIN (aa2_ui.js)
        betLabel: () => B() ? `BET · BOOST ${B().cost}×` : 'BET',
        busy: () => S.busy,
        locked: () => S.mode !== 'base',
        canBetDown: () => S.betI > 0,
        canBetUp: () => S.betI < C.BETS.length - 1,
        bets: () => C.BETS,
        betIndex: () => S.betI,
        buyActive: () => !!B(),
        buySub: () => B() ? 'BOOST ON' : '',
      },
      on: {
        spin: () => api.spin(),
        betStep: d => { S.betI = Math.max(0, Math.min(C.BETS.length - 1, S.betI + d)); },
        betSet: (v, i) => { S.betI = Math.max(0, Math.min(C.BETS.length - 1, i)); },
        turbo: applySpeed, quick: applySpeed,
        autoplay: () => {},
        autoplayStop: () => {},
        sound: () => {}, // icon state only — no audio in this playable yet
        showIntro: () => { if (window.FW && FW.showSplash) FW.showSplash(); }, // K1: SHOW INTRO clears the flag (kit) and re-opens the splash now
        buy: () => window.FW_AA2 ? FW_AA2.openBuy() : hud.openSheet(buySheet()), // AA2 pass: 5-option buy & boost menu
        menu: h => h.openMenu({ title: 'MENU', leadBright: true, // kit menu: SHOW INTRO first (K1)
          lines: ['FOUR WINDS 四風 playable', 'Uncalibrated demo math · no real wagering'],
          buttons: [{ label: 'PAYTABLE', primary: true, onTap: () => window.FW_AA2 && FW_AA2.openHelp() }, { label: 'CLOSE' }] }),
      },
    });
    function buySheet() {
      const b = C.BETS[S.betI], c = b * C.HUNT_COST;
      return { title: 'HAND HUNT', leadBright: true,
        lines: [`${GSSUI.formatMoney(c, THEME)} per spin  (1.5× bet ${GSSUI.formatMoney(b, THEME)})`,
                'About 3× the chance of 胡 Bonus Hands and 天和 Heavenly Hand',
                S.hunt ? 'Hand Hunt is ON for every spin' : 'Stays on for every spin until turned off'],
        buttons: S.hunt
          ? [{ label: 'TURN OFF', onTap: () => { S.hunt = false; } }, { label: 'SPIN', primary: true, onTap: () => api.spin() }]
          : [{ label: 'CLOSE' }, { label: 'ACTIVATE', primary: true, onTap: () => { S.hunt = true; } }] };
    }
    bindPointer();
    return true;
  }

  function autoplayTick() {
    if (!hud.state.autoplay || hud.sheetOpen || hud.popupOpen || (window.FW_AA2 && FW_AA2.open)) return;
    const S = api.S;
    if (S.busy || S.mode !== 'base') return;
    if (S.balance < (api.cost ? api.cost() : C.BETS[S.betI])) { hud.stopAutoplay(); return; }
    if (hud.takeAutoplaySpin()) api.spin();
  }

  // D2b: bar TOTAL dim during the outro, bump on the outro collect and whenever a win lands on it (~180 ms, subtle).
  // Region and pivot come from the kit layout (bar rect + totalAnchor); the TOTAL value is re-drawn from an offscreen copy of the kit.
  const TF = { a: 1, t: 0, bumpT: -1e9, seen: false, exiting: false, last: null }, rnow = () => GSSUI.timeWarp.realNow();
  const barA = (() => { const m = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(THEME.bar || ''); return m ? +m[1] : 1; })();
  let OFF = null;
  function totalFx() {
    const W = window.FW && FW.WIN, s = W ? W.state() : { scene: null }, n = rnow();
    if (s.scene === 'outro') { if (s.awaitingTap) TF.seen = true; TF.exiting = TF.seen && !s.awaitingTap; }
    if (TF.last === 'outro' && s.scene !== 'outro') { TF.bumpT = n; TF.seen = false; TF.exiting = false; } // collect: the outro total has landed
    TF.last = s.scene;
    const dt = Math.min(100, Math.max(0, n - (TF.t || n))); TF.t = n;
    const target = s.scene === 'outro' && !TF.exiting ? .35 : 1; TF.a += (target - TF.a) * Math.min(1, dt / 150);
    const q = (n - TF.bumpT) / 180, own = q >= 0 && q < 1 ? 1 + .09 * Math.sin(q * Math.PI) : 1, fxb = api.FX && api.FX.bump ? api.FX.bump() : 1;
    return { a: TF.a, s: Math.max(own, fxb) };
  }
  function drawKit(g) {
    const L = hud.layout, A = L && L.totalAnchor, b = L && L.bar, T = totalFx();
    if (!A || !b || (T.a > .995 && Math.abs(T.s - 1) < .002) || !document.createElement) { hud.draw(g); return; }
    const k = L.k || 1, x0 = b.x + 110 * k, x1 = Math.min(b.x + b.w * .4, A.x * 2), y0 = b.y + 2 * k, w = x1 - x0, h = b.y + b.h - y0;
    g.save(); g.beginPath(); g.rect(0, 0, C.W, C.H); g.rect(x0, y0, w, h); g.clip('evenodd'); hud.draw(g); g.restore();
    if (!OFF) OFF = document.createElement('canvas'); if (OFF.width !== Math.ceil(w) || OFF.height !== Math.ceil(h)) { OFF.width = Math.ceil(w); OFF.height = Math.ceil(h); }
    const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, OFF.width, OFF.height); o.translate(-x0, -y0); hud.draw(o);
    const p = T.a < 1 ? 1 - (1 - barA) / (1 - barA * T.a) : 0; // pre-fill so the bar background composites to the kit's own alpha while the value dims
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    if (p > 0) { g.globalAlpha = p / barA; g.fillStyle = THEME.bar; g.fillRect(x0, y0, w, h); }
    g.globalAlpha = T.a; g.translate(A.x, A.y); g.scale(T.s, T.s); g.translate(-A.x, -A.y); g.drawImage(OFF, x0, y0); g.restore();
  }

  window.FW_HUD = {
    bumpTotal() { TF.bumpT = rnow(); },
    theme: THEME, clock,
    get kit() { return hud; },
    get layout() { return hud ? hud.layout : (GSSUI.layoutPortraitD2 ? GSSUI.layoutPortraitD2(C.W, C.H) : GSSUI.layoutPortrait(C.W, C.H)); },
    top: () => (window.FW_HUD.layout && FW_HUD.layout.top) || GSSUI.layoutPortrait(C.W, C.H).top,
    draw(g) { if (!ensure()) return; autoplayTick(); drawKit(g); },
    overlay(g) { if (hud) hud.drawSheet(g); },
    hit(x, y) { return ensure() ? hud.hit(x, y) : false; },
  };
})();
