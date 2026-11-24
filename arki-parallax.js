// Параллакс радужных дуг на красных плашках главной – запасной путь для браузеров без animation-timeline (Firefox, Safari до 26).
// Пишет в style плашки --arki-p: -1, когда плашка только показалась снизу, 1 – когда ушла вверх. Сдвиг считает arki-parallax.css.
(function () {
  if (window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els = [].slice.call(document.querySelectorAll('.help, .free'));
  if (!els.length) return;
  document.documentElement.classList.add('arki-js');
  var queued = false;
  function update() {
    queued = false;
    var vh = innerHeight;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = (vh - r.top) / (vh + r.height); // 0…1, как view() cover
      p = Math.max(0, Math.min(1, p)) * 2 - 1;
      el.style.setProperty('--arki-p', p.toFixed(4));
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
})();
