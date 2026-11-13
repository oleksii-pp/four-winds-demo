// Symbol art loader. Painted PNGs (200x270) win over placeholders. Looks in prototype/assets/symbols/ then ../assets/symbols/02_parts/.
window.FW_SYMS = ['SYM01_2dots','SYM02_3dots','SYM03_4dots','SYM04_5dots','SYM05_6dots','SYM06_north','SYM07_west','SYM08_south','SYM09_east','SYM10_flower','SYM11_fan','SYM12_rising_fan','SYM13_hu','SYM14_heavenly'];
window.FW_ART = {};
(function () {
  const dirs = ['assets/symbols/', '../assets/symbols/02_parts/'];
  FW_SYMS.forEach(id => {
    let i = 0;
    const tryNext = () => {
      if (i >= dirs.length) return;
      const img = new Image();
      img.onload = () => { FW_ART[id] = img; };
      img.onerror = () => { i++; tryNext(); };
      img.src = dirs[i] + id + '.png?' + Date.now();
    };
    tryNext();
  });
})();
