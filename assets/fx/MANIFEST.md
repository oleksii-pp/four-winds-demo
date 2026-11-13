# prototype/assets/fx — runtime art-swap (FOUR WINDS 002)
Runtime copy of the painted FX parts approved by the Studio Lead on 2026-11-11. The spec is `../../../assets/fx/MANIFEST.md` (Symbol Artist / AD; do not edit). Each part's `parts.json` sits next to its PNGs.
PNGs are copied here unedited. `manifest.json` is built by `/workspace/tmp/build_fx_manifest.py`, and the same script embeds a copy in `fx.js` (`FX_ART_EMBED`) for file://.
Load order in fx.js: `window.FW_FX_ART`, then `manifest.json` (http), then the embedded copy (file:// or a fetch failure). Any missing part falls back to the procedural fx.js drawing.

| runtime name | file | ref_size → runtime ref | blend | hooked in fx.js |
|---|---|---|---|---|
| fan_leaf_seg_1, fan_rim_seg_1 | fan/ | 600 → R (2x art, R600) | normal | paintFan: one per open segment. Each is masked to its wedge (±0.25° overlap), the leaf to r ≥ 0.33R, under the closing shear |
| fan_rib | fan/ | 600 → R | normal | 13 inner ribs (under the leaf) |
| fan_guard | fan/ | 600 → R | normal | 2 outer guards |
| fan_rivet_tassel | fan/ | 600 → R × 0.82 (tassel ≈ 0.5R); R < 200: × 0.55 | normal | rivet + tassel, ±3.4° swing. drawTassel is skipped when it is present |
| bloom_centre | bloom/ | 160 → 80 slot (art disc r50 at 1x) | normal | drawBloom centre |
| bloom_petal_a / _b | bloom/ | 372.3 → 186 / 424.3 → 212 | normal | front / back petal layers |
| bloom_glow | bloom/ | 532 → 280 | additive | bloom glow at 0.55 |
| petal_var_1..4 | bloom/ | 64 → falling petal length | normal | burst and fall particles |
| shard_1..7 | kong/ | 200 → cell width 134 | normal | Kong break shards (centroid pivot, tumble transform) |
| dust_puff_1..3 | kong/ | 200 → 134 × r/70 | additive | Kong break dust puffs |

Unused for now: fan `_2/_3` alternates, fan_rib_b, fan_guard_b, dust `_alpha` extras, bloom_centre_r80 and bloom_centre_t1scale.
