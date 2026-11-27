/* Лента отзывов на компьютере и планшете (шире 600 px). Отдельно от телефона (otzyvy-lenta.js) – решение Саши 24.11.2026:
   правки одной версии не должны ломать другую.
   - Одна карточка = один человек (Саша, 25.11): лежит фото (с именем) или текст (с услугой), по очереди.
   - Нажатие переворачивает карточку на месте: фото ↔ отзыв этого человека, оборот той же формы. Лента при этом едет дальше.
   - Тянется мышкой (за любое место ленты) и двумя пальцами на тачпаде; после этого едет дальше сама.
   - Трогается, только когда лента заметно показалась на экране (половина высоты), и стоит, пока ее не видно
     или вкладка в фоне (Саша, 27.11: «долистал, а они уже давно крутились»).
   - Едет сама и ровно: ни наведение, ни щелчок ее не останавливают (движение – анимация браузера на видеокарте,
     без своего цикла и без прокрутки, поэтому не дергается и не залипает).
   - Стрелки (glass.js) плавно листают на две карточки, лента едет дальше.
   - Бесконечность: копия ленты сразу за оригиналом (видна через ~3 минуты).
   - При prefers-reduced-motion стоит на месте и прокручивается обычной прокруткой. */
(function () {
  var reel = document.getElementById('reel');
  if (!reel || !matchMedia('(min-width: 601px)').matches) return;
  reel.classList.add('reel--pk');
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0. Своя очередь карточек для этого экрана (главная, Саша 26.11): data-pk – место в ленте.
  //    Если у ленты есть такие метки, карточки без метки (и их обороты) убираем, остальные ставим по порядку.
  if (reel.querySelector('[data-pk]')) {
    var placed = [];
    Array.prototype.slice.call(reel.children).forEach(function (c) {
      if (c.hidden) return;
      if (c.hasAttribute('data-pk')) { placed.push(c); return; }
      var pair = c.getAttribute('data-pair');
      if (pair) Array.prototype.forEach.call(reel.querySelectorAll('[data-pair="' + pair + '"]'), function (x) { x.remove(); });
      else c.remove();
    });
    placed.sort(function (a, b) { return a.getAttribute('data-pk') - b.getAttribute('data-pk'); });
    placed.forEach(function (c) { reel.appendChild(c); });
  }

  // 1. Переворот по нажатию (Саша, 25.11): одна карточка = один человек. В ленте лежит лицевая сторона (data-front:
  //    фото или текст), вторая половина того же человека (hidden) – на обороте, той же формы. Плоский переворот (scaleX).
  Array.prototype.forEach.call(reel.querySelectorAll('.rv[data-front]'), function (card) {
    var back = reel.querySelector('.rv[data-pair="' + card.dataset.pair + '"]:not([data-front])');
    if (!back) return;
    var box = document.createElement('div');
    box.className = 'rflip';
    box.setAttribute('role', 'button');
    box.tabIndex = 0;
    box.setAttribute('aria-label', card.classList.contains('rv--ph') ? 'Показать отзыв' : 'Показать фото автора');
    var inner = document.createElement('div');
    inner.className = 'rflip__in';
    card.replaceWith(box);
    back.hidden = false;
    back.classList.add('rflip__back');
    back.setAttribute('aria-hidden', 'true');
    card.classList.add('rflip__front');
    inner.appendChild(card);
    inner.appendChild(back);
    box.appendChild(inner);
  });
  function flip(box) {
    if (reduceMotion || box.classList.contains('is-turning')) { box.classList.toggle('is-flipped'); return; }
    box.classList.add('is-turning');
    setTimeout(function () { box.classList.toggle('is-flipped'); box.classList.remove('is-turning'); }, 220);
  }
  reel.addEventListener('click', function (e) {
    var box = e.target.closest && e.target.closest('.rflip');
    if (box && !e.defaultPrevented) flip(box);
  });
  reel.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('rflip')) { e.preventDefault(); flip(e.target); }
  });

  if (reduceMotion || !reel.animate) return;

  var originals = Array.prototype.slice.call(reel.children);
  var n = originals.length;
  var track = document.createElement('div');
  track.className = 'reel__track';
  originals.forEach(function (el) { track.appendChild(el); });
  for (var k = 0; k < 2; k++) {
    originals.forEach(function (el) {
      var c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.classList.add('is-clone');
      Array.prototype.forEach.call(c.querySelectorAll('a, [tabindex]'), function (a) { a.tabIndex = -1; });
      if (c.tagName === 'A') c.tabIndex = -1;
      track.appendChild(c);
    });
  }
  reel.appendChild(track);
  reel.classList.add('is-loop', 'is-js');

  var SPEED = 26; // px в секунду, как раньше
  var anim = null, period = 0;
  function start(frac) {
    period = track.children[n].offsetLeft - track.children[0].offsetLeft;
    if (period <= 0) return;
    if (anim) anim.cancel();
    var d = period / SPEED * 1000;
    anim = track.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + (-period) + 'px,0,0)' }],
      { duration: d, iterations: Infinity, easing: 'linear' });
    anim.currentTime = (frac || 0) * d;
    sync();
  }
  // Едет, только пока лента на экране, вкладка открыта и ее не тянут мышкой
  var onScreen = !('IntersectionObserver' in window), drag = null, dragged = false;
  function sync() {
    if (!anim) return;
    var go = onScreen && !document.hidden && !(drag && drag.moved);
    if (go && anim.playState !== 'running') anim.play();
    else if (!go && anim.playState === 'running') anim.pause();
  }
  if (!onScreen) {
    // старт – когда видна половина ленты; стоп – когда ушла с экрана целиком
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      if (e.intersectionRatio >= 0.5) onScreen = true;
      else if (!e.isIntersecting) onScreen = false;
      sync();
    }, { threshold: [0, 0.5] }).observe(reel);
  }
  document.addEventListener('visibilitychange', sync);
  // Старт (Саша, 27.11): экран начинается на 1/3 первой карточки – первая фотка срезана слева на треть
  function startOffset() {
    var r = reel.getBoundingClientRect(), f = track.children[0].getBoundingClientRect();
    var z = r.width / (reel.offsetWidth || 1) || 1;
    return ((f.left - r.left) + f.width / 3) / z;
  }
  period = track.children[n].offsetLeft - track.children[0].offsetLeft;
  start(period > 0 ? startOffset() / period : 0);
  var rt;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var f = anim && anim.effect ? (anim.currentTime % anim.effect.getTiming().duration) / anim.effect.getTiming().duration : 0;
      start(f);
    }, 150);
  });

  // Стрелки: плавный сдвиг на две карточки поверх движения (сдвигаем время анимации)
  var shift = null;
  reel.reelGo = function (dir) {
    if (!anim) return;
    var c = track.children[0];
    var step = ((c ? c.offsetWidth : 257) + (parseFloat(getComputedStyle(track).columnGap) || 0)) * 2;
    var ms = dir * step / SPEED * 1000;
    var t0 = performance.now(), done = 0, D = 520;
    if (shift) cancelAnimationFrame(shift);
    (function f(t) {
      var p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3), want = ms * e;
      var dur = anim.effect.getTiming().duration;
      anim.currentTime = ((anim.currentTime + want - done) % dur + dur) % dur;
      done = want;
      shift = p < 1 ? requestAnimationFrame(f) : null;
    })(t0);
  };

  // Перетаскивание мышкой и горизонтальная прокрутка тачпадом (Саша, 25.11): сдвигаем время анимации,
  // пока тянут – лента стоит под рукой, отпустили – едет дальше. После перетаскивания щелчок не переворачивает.
  function moveBy(px) {
    var dur = anim.effect.getTiming().duration;
    anim.currentTime = ((anim.currentTime + px / SPEED * 1000) % dur + dur) % dur;
  }
  reel.addEventListener('pointerdown', function (e) {
    if (!anim || e.button !== 0 || e.pointerType === 'touch') return;
    if (e.target.closest && e.target.closest('a, button')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  });
  reel.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
      drag.moved = true;
      anim.pause();
      reel.classList.add('is-drag');
      try { reel.setPointerCapture(drag.id); } catch (_) {}
    }
    var z = reel.getBoundingClientRect().width / (reel.offsetWidth || 1) || 1;
    moveBy(-dx / z);
    drag.x = e.clientX;
  });
  function endDrag(e) {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    if (drag.moved) {
      dragged = true;
      setTimeout(function () { dragged = false; }, 0);
      reel.classList.remove('is-drag');
    }
    drag = null;
    sync();
  }
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);
  reel.addEventListener('lostpointercapture', function (e) { if (e.target === reel) endDrag(e); });
  addEventListener('pointerup', endDrag);
  reel.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  reel.addEventListener('dragstart', function (e) { e.preventDefault(); });
  reel.addEventListener('wheel', function (e) {
    if (!anim || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    moveBy(e.deltaX);
  }, { passive: false });
  // Фокус с клавиатуры на карточке за краем: браузер прокручивает контейнер – возвращаем на место
  reel.addEventListener('scroll', function () { if (reel.scrollLeft) reel.scrollLeft = 0; });
})();
