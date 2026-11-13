// FOUR WINDS 四風 — playable config. UNCALIBRATED demo math. Drop PLAYABLE_MATH.md numbers in here.
window.FW_CONFIG = {
  W: 1080, H: 1920, COLS: 6, ROWS: 5,
  GY: 400, // board top: screen_E portrait grid y0 (assets/board/layout_E.json, GY=400 plate 2026-11-09); presentation only
  CELL_W: 134, CELL_H: 178, GAP: 8, ART_W: 200, ART_H: 270,
  START_BALANCE: 1000, BET_INDEX: 4, // GSS standard bet ladder (UI kit −/+), default €1.00
  BETS: [0.20, 0.40, 0.60, 0.80, 1.00, 1.50, 2.00, 3.00, 5.00, 10.00, 20.00, 50.00, 100.00],
  HUNT_COST: 1.5, // Hand Hunt uses WEIGHTS_HUNT (≈3x trigger chance). Kept for old callers; the live price is BUY.hunt.cost
  MIN_KONG: 8,
  // ---- from design/PLAYABLE_MATH.md (demo, uncalibrated) ----
  // pay x bet for 8 / 9 / 10 / 11 / 12+
  // PAYS locked 2026-11-09 to the Amazing Aztecs 2 Ultim8 Pays source spec (SYM11→SYM3 tables).
  // The spec pairs columns: 8 & 9 share a pay, 10 & 11 share a pay, 12+ is the high column.
  PAYS: {
    SYM01_2dots: [0.20, 0.20, 0.50, 0.50, 2.00], SYM02_3dots: [0.30, 0.30, 0.70, 0.70, 2.50],
    SYM03_4dots: [0.40, 0.40, 1.00, 1.00, 3.00], SYM04_5dots: [0.50, 0.50, 1.20, 1.20, 4.00],
    SYM05_6dots: [0.60, 0.60, 2.00, 2.00, 5.00],
    SYM06_north: [1.50, 1.50, 4.00, 4.00, 10.00], SYM07_west: [2.00, 2.00, 5.00, 5.00, 15.00],
    SYM08_south: [3.00, 3.00, 8.00, 8.00, 25.00], SYM09_east: [5.00, 5.00, 15.00, 15.00, 50.00],
  },
  // Spawn weights feel-tuned 2026-11-08 (Studio Lead). PLAYABLE_MATH first-drop
  // hit rate was ~13% (avg max matching pay tiles ~6.1, shy of 8). Amazing Aztecs 2
  // publishes a 28.28% hit rate; these concentrate the lows so first-drop hits
  // land around ~33%. Pays, MIN_KONG and bonus rules unchanged.
  WEIGHTS: {
    SYM01_2dots: 190, SYM02_3dots: 158, SYM03_4dots: 134, SYM04_5dots: 104, SYM05_6dots: 89,
    SYM06_north: 64, SYM07_west: 54, SYM08_south: 45, SYM09_east: 36,
    SYM10_flower: 50, SYM11_fan: 36, SYM12_rising_fan: 16, SYM13_hu: 22, SYM14_heavenly: 2,
  },
  WEIGHTS_HUNT: {
    SYM01_2dots: 190, SYM02_3dots: 158, SYM03_4dots: 134, SYM04_5dots: 104, SYM05_6dots: 89,
    SYM06_north: 64, SYM07_west: 54, SYM08_south: 45, SYM09_east: 36,
    SYM10_flower: 50, SYM11_fan: 36, SYM12_rising_fan: 16, SYM13_hu: 31, SYM14_heavenly: 2, // AA2_PASS §2.5: spec only triples Bonus -> 天和 back to 2
  },
  // AA2_PASS §2.5 (GD 2026-11-12). Heavenly Hunt: milder HU lift (every trigger becomes Heavenly, ~x1.8 features).
  WEIGHTS_HHUNT: {
    SYM01_2dots: 190, SYM02_3dots: 158, SYM03_4dots: 134, SYM04_5dots: 104, SYM05_6dots: 89,
    SYM06_north: 64, SYM07_west: 54, SYM08_south: 45, SYM09_east: 36,
    SYM10_flower: 50, SYM11_fan: 36, SYM12_rising_fan: 16, SYM13_hu: 27, SYM14_heavenly: 2,
  },
  // Guaranteed Rising Fan: more low tiles -> ~60% hit rate (AA2 Thunder buy 60.09%), so the fan has wins to multiply.
  WEIGHTS_RF: {
    SYM01_2dots: 300, SYM02_3dots: 240, SYM03_4dots: 190, SYM04_5dots: 104, SYM05_6dots: 89,
    SYM06_north: 64, SYM07_west: 54, SYM08_south: 45, SYM09_east: 36,
    SYM10_flower: 50, SYM11_fan: 36, SYM12_rising_fan: 16, SYM13_hu: 22, SYM14_heavenly: 2,
  },
  // Per-mode spawn weight multipliers (Studio Lead lock 2026-11-09).
  // 天和 has no role inside free hands; Heavenly Hand also has no ordinary Fan (Rising Fan still spawns).
  // AA2_PASS §2.5: tuned per-mode multipliers on WEIGHTS (shared by natural and bought features).
  MODE_WEIGHT_MULT: {
    bonus:    { SYM14_heavenly: 0, SYM12_rising_fan: 1.5 },                               // RF 16 -> 24
    heavenly: { SYM14_heavenly: 0, SYM11_fan: 0, SYM12_rising_fan: 3.5, SYM13_hu: 1.25 }, // RF 16 -> 56, HU 22 -> 27.5
  },
  // Value tables locked 2026-11-09 to the Amazing Aztecs 2 Ultim8 Pays source spec.
  // Weights are demo feel weights redistributed from the old demo tables (uncalibrated).
  // Flower (money symbol) set per spec: 0.2, 0.5, 1, 1.5, 2, 3, 6, 10, 25 (no 5, no 15).
  // Old 5 merged into 3/6, old 15 into 10/25; 1.5 added, lows kept heavier.
  FLOWER_VALUES: [[0.2,280],[0.5,220],[1,140],[1.5,120],[2,100],[3,110],[6,65],[10,31],[25,14]],
  // The spec's 10-value multiplier ladder. Rising Fan steps along this list (not +1).
  MULT_LADDER: [2, 3, 4, 5, 7, 10, 15, 25, 50, 100],
  // Ordinary Fan: random landing on one of the 10 ladder values (no x6/x8/x12/x20).
  FAN_VALUES: [[2,280],[3,200],[4,140],[5,120],[7,100],[10,75],[15,40],[25,15],[50,5],[100,2]],
  // Rising Fan landing in Bonus Hands / Heavenly Hand: any ladder value up to x50 (x100 is
  // reachable only by growing). In the BASE GAME a Rising Fan always lands at x2 (see game.js).
  RISING_FAN_VALUES: [[2,380],[3,220],[4,140],[5,100],[7,75],[10,42],[15,22],[25,9],[50,4]],
  RISING_BASE_VALUE: 2,
  // AA2_PASS §2.5: Rising Fan landing values per feature mode (x2..x50; x100 only by growing). RISING_FAN_VALUES stays the fallback.
  RISING_FAN_VALUES_BY_MODE: {
    bonus:    [[2,200],[3,180],[4,150],[5,130],[7,110],[10,90],[15,60],[25,40],[50,20]],
    heavenly: [[2,100],[3,120],[4,130],[5,130],[7,130],[10,120],[15,100],[25,70],[50,40]],
  },
  // The one forced Rising Fan of the Guaranteed Rising Fan boost lands on this table (naturally landed ones stay x2).
  RISING_FAN_VALUES_GUARANTEED: [[5,100],[7,130],[10,130],[15,110],[25,70],[50,30]],
  RISING_CAP: 100, FLOWER_MIN: 8,
  BONUS_TRIGGER_HU: 4, BONUS_HANDS: 10, RETRIGGER_HU: 3, RETRIGGER_HANDS: 5,
  HEAVENLY_HU: 3,
  // ---- AA2 improvement pass (Studio Lead 2026-11-12, Oleksii approved) ----
  // Table Fan EMPTY start (AA2 p.47 screens): the plate shows a bare "x" until the first winning fan.
  // Paid factor = max(1, tableFan + visible fans); the first xN fan sets the Table Fan to xN, additive after that.
  // Set to 1 to restore the Nov 9 x1 start.
  TABLE_FAN_START: 0,
  // Full buy / boost menu (AA2 "Diamond Menu" p.47-p.48; SPEC_PLAYABLE "Other buys"). cost = x bet.
  // kind 'boost' = stays on for every spin until turned off (one boost at a time); 'buy' = one-shot feature entry.
  // enabled: per-option market flag (AA2 p.48 "this menu or some of the options may not be available").
  // Tables and copy: design/AA2_PASS.md §2.5 / §2.7 (GD tuned, demo, uncalibrated; plain RTP ≈312%).
  BUY_ORDER: ['hunt', 'heavenlyHunt', 'risingFan', 'buyBonus', 'buyHeavenly'],
  BUY: {
    hunt:         { kind: 'boost', cost: 1.5, name: 'HAND HUNT',             line: '3× the chance of Bonus Hands. Stays on.',                          weights: 'WEIGHTS_HUNT', enabled: true },
    heavenlyHunt: { kind: 'boost', cost: 2,   name: 'HEAVENLY HUNT',         line: 'More features, and every one is a Heavenly Hand. Stays on.',        weights: 'WEIGHTS_HHUNT', allHeavenly: true, enabled: true },
    risingFan:    { kind: 'boost', cost: 5,   name: 'GUARANTEED RISING FAN', line: 'A Rising Fan on every deal, landing ×5 to ×50. Stays on.',           weights: 'WEIGHTS_RF', guaranteeRising: 1, risingValues: 'RISING_FAN_VALUES_GUARANTEED', ladder: true, enabled: true },
    buyBonus:     { kind: 'buy',   cost: 100, name: 'BUY BONUS HANDS',       line: '10 Bonus Hands.',                                                   feature: 'bonus', enabled: true },
    buyHeavenly:  { kind: 'buy',   cost: 300, name: 'BUY HEAVENLY HAND',     line: '10 Heavenly Hands. Only Rising Fans.',                              feature: 'heavenly', enabled: true },
  },
  // Multiplier glyph colour bands (AA2 p.22-p.26 / help p.11): x2-x5 / x7-x15 / x25-x100. Each band names a glyph set;
  // until the AD set lands (aa2_art.js glyphBands) every band falls back to fan_red.
  MULT_BANDS: [{ id: 'b1', max: 6 }, { id: 'b2', max: 24 }, { id: 'b3', max: 1e9 }], // SA brief: L ×2–5 (sums 2–6) fan_red · M ×7–15 (sums 7–24) fan_lapis · H ×25+ fan_imperial
  T: { drop: 380, colDelay: 55, rowDelay: 25, lift: 420, settle: 300, pause: 250 },
};
