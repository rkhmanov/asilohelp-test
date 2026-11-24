/* Лента отзывов на главной (Саша, 23.11.2026; 24.11 – едет всегда, переворачиваются все):
   - едет сама по кругу и не стоит при наведении мыши; пауза – только пока ее тянут
     пальцем или мышкой, листают стрелками или ходят по ней с клавиатуры;
   - тянется пальцем (родная прокрутка) и мышкой (перетаскивание);
   - карточка переворачивается по нажатию, без кнопки «Читать отзыв»;
   - все карточки сами переворачиваются по очереди: фото ~5 с, текст ~12 с, чтобы успеть прочитать;
     карточку, которую перевернули руками, автомат не трогает 15 с;
   - при prefers-reduced-motion ничего не едет и не переворачивается само. */
(function () {
  var reel = document.getElementById('reel');
  if (!reel) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var originals = Array.prototype.slice.call(reel.children);
  var n = originals.length;
  var loop = !reduce && n > 2;

  // Бесконечная лента: две копии карточек после оригиналов, скрытые от экранного диктора.
  if (loop) {
    for (var k = 0; k < 2; k++) {
      originals.forEach(function (el) {
        var c = el.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.classList.add('is-clone');
        if (c.hasAttribute('tabindex') || c.tagName === 'A') c.tabIndex = -1;
        reel.appendChild(c);
      });
    }
    reel.classList.add('is-loop');
  }

  var period = 0;
  function measure() { period = loop ? reel.children[n].offsetLeft - reel.children[0].offsetLeft : 0; }
  function zoomOf() { return reel.getBoundingClientRect().width / (reel.offsetWidth || 1) || 1; }
  function norm(x) {
    if (!loop || period <= 0) return x;
    while (x < period) x += period;
    while (x >= 2 * period) x -= period;
    return x;
  }

  measure();
  var pos = loop ? period : reel.scrollLeft;
  if (loop) reel.scrollLeft = pos;
  addEventListener('resize', function () { var r = period ? (reel.scrollLeft % period) / period : 0; measure(); pos = norm(period + r * period); if (loop) reel.scrollLeft = pos; });

  var holdUntil = 0, touching = false, drag = null, justDragged = false, visible = false;
  function hold(ms) { holdUntil = Math.max(holdUntil, performance.now() + ms); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(reel);
  } else visible = true;

  // Автопрокрутка
  var SPEED = 26, last = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    var dt = last ? Math.min(t - last, 64) : 0; last = t;
    if (!loop) return;
    if (!visible || document.hidden || touching || drag || t < holdUntil || kbFocus()) {
      pos = reel.scrollLeft;
      return;
    }
    pos = norm(pos + SPEED * dt / 1000);
    reel.scrollLeft = pos;
  }
  if (loop) requestAnimationFrame(tick);

  // Пауза при фокусе – только для клавиатуры (после щелчка мышью лента едет дальше)
  function kbFocus() {
    var a = document.activeElement;
    if (!a || !reel.contains(a)) return false;
    try { return a.matches(':focus-visible'); } catch (_) { return true; }
  }

  // Мышь: перетаскивание
  reel.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') { touching = true; return; }
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, s: reel.scrollLeft, moved: false, z: zoomOf() };
  });
  reel.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = (e.clientX - drag.x) / drag.z;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      reel.classList.add('is-drag');
      try { reel.setPointerCapture(drag.id); } catch (_) {}
    }
    if (drag.moved) { pos = norm(drag.s - dx); reel.scrollLeft = pos; if (loop && Math.abs(pos - (drag.s - dx)) > 1) { drag.s = pos + dx; } }
  });
  function endDrag(e) {
    if (e.pointerType !== 'mouse') { touching = false; hold(2500); return; }
    if (!drag) return;
    if (drag.moved) { justDragged = true; setTimeout(function () { justDragged = false; }, 0); }
    reel.classList.remove('is-drag');
    drag = null; hold(1500);
  }
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);
  reel.addEventListener('touchstart', function () { touching = true; }, { passive: true });
  reel.addEventListener('touchend', function () { touching = false; hold(2500); }, { passive: true });
  reel.addEventListener('click', function (e) { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  reel.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Стрелки (glass.js и старая разметка): дать им докрутить
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.reel-nav, .reviews__nav')) hold(1800); });

  // Переворот по нажатию: лента не останавливается, автомат не трогает карточку 15 с
  var MANUAL = 15000;
  function flip(card) { card.classList.toggle('is-flipped'); card.classList.add('is-touched'); card._manual = performance.now() + MANUAL; }
  reel.addEventListener('click', function (e) { var c = e.target.closest('.rv--flip'); if (c) flip(c); });
  reel.addEventListener('keydown', function (e) {
    var c = e.target.closest('.rv--flip');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip(c); }
  });

  // Все карточки сами переворачиваются по очереди: фото PHOTO мс, текст TEXT мс.
  // Сдвиг по фазе – от номера карточки в оригинальном наборе (копии ленты в том же ритме).
  if (!reduce) {
    var PHOTO = 5000, TEXT = 12000, CYCLE = PHOTO + TEXT, STAGGER = 3700;
    var cards = Array.prototype.slice.call(reel.querySelectorAll('.rv--flip'));
    var origFlip = originals.filter(function (el) { return el.classList.contains('rv--flip'); });
    var t0 = performance.now();
    cards.forEach(function (c, i) {
      var k = i % origFlip.length;
      c._phase = k * STAGGER % CYCLE;
    });
    setInterval(function () {
      if (!visible || document.hidden) return;
      var now = performance.now();
      cards.forEach(function (c) {
        if (c._manual && now < c._manual) return;
        if (c._manual) { c._manual = 0; c._phase = (c.classList.contains('is-flipped') ? PHOTO : 0) - (now - t0); }
        var want = ((now - t0 + c._phase) % CYCLE + CYCLE) % CYCLE >= PHOTO;
        if (c.classList.contains('is-flipped') !== want) c.classList.toggle('is-flipped', want);
      });
    }, 250);
  }
})();
