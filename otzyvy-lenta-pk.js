/* Лента отзывов на компьютере и планшете (шире 600 px). Отдельно от телефона (otzyvy-lenta.js) – решение Саши 24.11.2026:
   правки одной версии не должны ломать другую.
   - Дизайн как в Figma «ФИНАЛ» 4750:4451: фото (с именем) и текст (с услугой) отдельными карточками.
   - Нажатие переворачивает пару: фото и текст одного человека плоско поворачиваются и меняются местами
     (data-pair), поэтому двух одинаковых карточек рядом не бывает. Лента при этом едет дальше.
   - Едет сама, ровно и всегда: ни наведение, ни щелчок ее не останавливают (движение – анимация браузера на видеокарте,
     без своего цикла и без прокрутки, поэтому не дергается и не залипает).
   - Стрелки (glass.js) плавно листают на две карточки, лента едет дальше.
   - Бесконечность: копия ленты сразу за оригиналом (видна через ~3 минуты).
   - При prefers-reduced-motion стоит на месте и прокручивается обычной прокруткой. */
(function () {
  var reel = document.getElementById('reel');
  if (!reel || !matchMedia('(min-width: 601px)').matches) return;
  reel.classList.add('reel--pk');
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Переворот по нажатию (как на телефоне, но код свой): пара меняется местами
  Array.prototype.forEach.call(reel.querySelectorAll('.rv[data-pair]'), function (c) {
    c.classList.add('rv--turn');
    c.tabIndex = 0;
    c.title = c.classList.contains('rv--ph') ? 'Нажмите, чтобы прочитать отзыв' : 'Нажмите, чтобы увидеть фото';
  });
  function partner(card) {
    var p = card.dataset.pair, a = card.previousElementSibling, b = card.nextElementSibling;
    if (a && a.dataset && a.dataset.pair === p) return a;
    if (b && b.dataset && b.dataset.pair === p) return b;
    return null;
  }
  function flip(card) {
    var other = partner(card);
    if (!other || card.classList.contains('is-turning')) return;
    var first = card.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING ? card : other;
    var second = first === card ? other : card;
    function swap() { first.parentNode.insertBefore(second, first); }
    if (reduceMotion) { swap(); return; }
    first.classList.add('is-turning'); second.classList.add('is-turning');
    setTimeout(function () { swap(); first.classList.remove('is-turning'); second.classList.remove('is-turning'); }, 220);
  }
  reel.addEventListener('click', function (e) {
    var card = e.target.closest && e.target.closest('.rv--turn');
    if (card) flip(card);
  });
  reel.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('rv--turn')) { e.preventDefault(); flip(e.target); }
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
  }
  start(0);
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
  // Фокус с клавиатуры на карточке за краем: браузер прокручивает контейнер – возвращаем на место
  reel.addEventListener('scroll', function () { if (reel.scrollLeft) reel.scrollLeft = 0; });
})();
