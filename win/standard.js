/* GSS studio standard: flow, win tiers, counters, glyph rules, speed (shared/STANDARDS.md §7).
 * Plain script, no build step; works over http and file://. Games pass GSS_GAME (§8) and only the
 * keys listed in GSS_STANDARD_OVERRIDABLE may be overridden (see shared/win/README.md). */
(function (root) {
'use strict';
const GSS_STANDARD = {
  version: '1.0.0',
  flow: {
    splash:   { inputLock: 400, autoContinue: false, storageKey: id => `gss.${id}.splash.hidden` },
    trigger:  { skippable: false, minMs: 1200, maxMs: 2000, boughtMs: 800 },
    intro:    { inputLock: 500, tapJumpsToSettle: true, autoplayTimeout: 3000, settleMs: 1800, exitMs: 700 },
    retrigger:{ auto: true, totalMs: 1700, tapSkipTo: 1300, inputLock: 300 },
    outro:    { inputLock: 600, tapJumpsToFinal: true, autoplayTimeout: 3000, shortCount: 1200, exitMs: 900 },
    bonusEnd: 'outroTiered',                    // locked: one celebration, inside the outro
  },
  tiers: [ // max ratio inclusive; timings ms at speed 1.0
    { id: 'micro', max: 1.00,  title: null,       pre: 0,   te: 0,   cs: 0,   cl: 0,    end: 1400, dim: 0 },
    { id: 'small', max: 7.99,  title: null,       pre: 0,   te: 0,   cs: 100, cl: 600,  end: 1800, dim: 0 },
    { id: 'large', max: 14.99, title: null,       pre: 0,   te: 267, cs: 200, cl: 1000, end: 2400, dim: 0 },
    { id: 'big',   max: 29.99, title: 'BIG WIN',  pre: 600, te: 400, cs: 800, cl: 5000, end: 6300, dim: .55, entry: 'stamp' },
    { id: 'mega',  max: 49.99, title: 'MEGA WIN', pre: 600, te: 533, cs: 800, cl: 5000, end: 6300, dim: .60, entry: 'pop+wings' },
    { id: 'epic',  max: Infinity, title: 'EPIC WIN', pre: 600, te: 667, cs: 900, cl: 5000, end: 6400, dim: .65, entry: 'stamp' },
  ],
  titledFrom: 'big',                            // locked: no tier above large runs without a title
  count: { curve: k => 1 - Math.pow(1 - k, 1.3), settlePop: 450, skipLock: 400, skipFrom: 'large', secondTapCloses: true },
  counter: { decrementOn: 'commit', tickMs: 200, tickPop: 1.1, retriggerPop: 1.2, lastSpinPulse: { amp: .06, period: 600 }, minDigitPx: 60 },
  runningTotal: { countMs: 400, ease: 'cubicOut' },
  glyphs: { tileMinFrac: .30, minPx: 44, maxWFrac: .86, outlineFrac: .08,
            tileMoney: { decimalsBelow: 10, abbrevFrom: 1000 }, amountsAbbrev: false },
  speed: { turbo: 1.8, quick: 1.6, celebrationCap: 1.5, autoplayGap: { normal: 400, turbo: 120 } },
};
// §8: what a game may change. Everything else (ratios, timings, count curve, skip logic, dim, order,
// speed caps) is locked; shared/win ignores (and reports) other override keys.
const GSS_STANDARD_OVERRIDABLE = ['flow.intro.inputLock', 'flow.intro.settleMs', 'flow.intro.exitMs', 'flow.outro.exitMs'];
root.GSS_STANDARD = GSS_STANDARD;
root.GSS_STANDARD_OVERRIDABLE = GSS_STANDARD_OVERRIDABLE;
})(typeof window !== 'undefined' ? window : globalThis);
