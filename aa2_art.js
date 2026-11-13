// FOUR WINDS — AA2 pass art (AD delivery 2026-11-12, assets/aa2_pass/MANIFEST.md try 1; A11 marker t2). Piece ids A01–A14 per AA2_ART_SPEC.md.
// Files are the @1x finals copied into prototype/assets/aa2/ (canvas is 1080×1920 @1x). Every piece is textless: all text is live code.
// Layout rects come from each piece's *_9slice.json (zones / placement_1x). Missing file → code placeholder.
window.FW_AA2_ART = {
  dir: 'assets/aa2/',
  files: {
    buy_panel: 'buy_panel.png',              // A01 1048×600 @ (16,1216); x-repeat run 236–927 (widen only, never heighten)
    card: 'card.png',                        // A02 184×384 ×5, y1327
    card_rim: 'card_select_rim.png',         // A03 207×405, card rect in canvas (13.7,11.6)
    emblem_hunt: 'emb_hand_hunt.png',        // A04 160² drawn at 148² in card zone emblem_draw
    emblem_heavenlyHunt: 'emb_heavenly_hunt.png', // A05
    emblem_risingFan: 'emb_rising_fan.png',  // A06
    emblem_buyBonus: 'emb_bonus_hands.png',  // A07
    emblem_buyHeavenly: 'emb_heavenly_hand.png', // A08
    boost_badge: 'badge_boost_on.png',       // A09 120×40, live "BOOST ON" 16 px in text_box (12,8)–(108,33)
    ladder_rail: 'ladder_rail.png',          // A10 720×88 @ (180,1390); lane (61,18)–(657,70)
    ladder_marker: 'ladder_marker.png',      // A11 t2 (ivory face) 112×76, centred behind the current value
    help_bg: 'paytable_bg.png',              // A12 1080×1920 opaque RGB
    help_divider: 'help_divider.png',        // A13 900×52
    pill420: 'hint_pill_420.png',            // A14 420×72: 8+ PAY ANYWHERE (28 px), text_box (32,14)–(384,57)
    pill: 'hint_pill_312.png',               // A14 312×72 @ (576,1398): [3 × 胡] +5 HANDS (24 px), text_box (32,14)–(276,57)
  },
  // Multiplier glyph colour bands (config MULT_BANDS): b1 ×2–6 = fan_red (base set, not listed), b2 ×7–24 = fan_lapis t1 (AD PASSED),
  // b3 ×25+ = fan_imperial t2. Metrics embedded so file:// works (mirror of each folder's metrics.json).
  glyphBands: {
    b2: { dir: 'assets/glyphs/fan_lapis/', metrics: {"x":{"w":274,"h":263,"baseline_offset":33},"digit_0":{"w":298,"h":361,"baseline_offset":1},"digit_1":{"w":224,"h":352,"baseline_offset":6},"digit_2":{"w":286,"h":357,"baseline_offset":6},"digit_3":{"w":284,"h":363,"baseline_offset":0},"digit_4":{"w":307,"h":352,"baseline_offset":7},"digit_5":{"w":318,"h":373,"baseline_offset":1},"digit_6":{"w":315,"h":379,"baseline_offset":1},"digit_7":{"w":299,"h":367,"baseline_offset":8},"digit_8":{"w":330,"h":380,"baseline_offset":0},"digit_9":{"w":321,"h":379,"baseline_offset":1}} },
    b3: { dir: 'assets/glyphs/fan_imperial/', metrics: {"x":{"w":246,"h":265,"baseline_offset":29},"digit_0":{"w":271,"h":361,"baseline_offset":0},"digit_1":{"w":202,"h":352,"baseline_offset":7},"digit_2":{"w":256,"h":356,"baseline_offset":7},"digit_3":{"w":251,"h":356,"baseline_offset":0},"digit_4":{"w":274,"h":351,"baseline_offset":7},"digit_5":{"w":281,"h":373,"baseline_offset":2},"digit_6":{"w":290,"h":380,"baseline_offset":0},"digit_7":{"w":269,"h":358,"baseline_offset":10},"digit_8":{"w":298,"h":378,"baseline_offset":1},"digit_9":{"w":297,"h":366,"baseline_offset":2}} },
  },
};
