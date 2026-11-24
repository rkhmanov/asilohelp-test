/* Лента отзывов на ТЕЛЕФОНЕ (до 600 px). Компьютер и планшет – отдельный otzyvy-lenta-pk.js (Саша, 24.11.2026).
   Лента отзывов (Саша, 23–24.11.2026).
   - В покое – как в Figma: фото (с именем) и текст (с услугой) отдельными карточками.
   - Нажатие на карточку переворачивает пару: фото и текст одного человека меняются местами
     (пара задается data-pair, карточки стоят рядом). Дублей на экране нет. Само ничего не переворачивается.
   - Едет сама по кругу и не стоит от наведения или щелчка; пауза только после перетаскивания, стрелок
     и пока по ней ходят с клавиатуры. Бесконечность – две копии ленты за оригиналом (видны через ~3 мин).
   - Двигается через transform, а не через прокрутку: на iPhone родная прокрутка с инерцией спорила
     с автопрокруткой и лента дергалась. Тянется пальцем и мышкой, с инерцией; вертикальная прокрутка страницы не мешает.
   - При prefers-reduced-motion сама не едет и переворачивается без анимации.
   - Переворот плоский (scaleX), без 3D: в Safari 3D внутри ленты рисовался со сдвигом. */
(function () {
  var reel = document.getElementById('reel');
  if (!reel || matchMedia('(min-width: 601px)').matches) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Переворот по нажатию: фото и текст одного человека меняются местами (обе карточки «переворачиваются»).
  //    Раньше на обороте карточки была копия соседней, и рядом стояли два одинаковых фото или текста (Саша, 24.11).
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
    if (reduce) { swap(); return; }
    first.classList.add('is-turning'); second.classList.add('is-turning');
    setTimeout(function () {
      swap();
      first.classList.remove('is-turning'); second.classList.remove('is-turning');
    }, 220);
  }
  reel.addEventListener('click', function (e) {
    var card = e.target.closest && e.target.closest('.rv--turn');
    if (card && !e.defaultPrevented) flip(card);
  });
  reel.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('rv--turn')) { e.preventDefault(); flip(e.target); }
  });

  // 2. Дорожка и две копии карточек для бесконечной ленты
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
      if (c.tabIndex >= 0 || c.tagName === 'A') c.tabIndex = -1;
      track.appendChild(c);
    });
  }
  reel.appendChild(track);
  reel.classList.add('is-loop', 'is-js');

  var period = 0, x = 0;
  function zoomOf() { return reel.getBoundingClientRect().width / (reel.offsetWidth || 1) || 1; }
  function measure() {
    var a = track.children[0].getBoundingClientRect().left, b = track.children[n].getBoundingClientRect().left;
    period = (b - a) / zoomOf();
  }
  function norm(v) {
    if (period <= 0) return v;
    v = ((v - period) % period + period) % period + period;
    return v;
  }
  function render() { track.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)'; }
  measure();
  x = norm(period);
  render();
  addEventListener('resize', function () { var r = period ? ((x - period) / period) : 0; measure(); x = norm(period + r * period); render(); });
  // Фокус с клавиатуры на карточке за краем: браузер прокручивает контейнер – переводим это в сдвиг дорожки
  reel.addEventListener('scroll', function () { if (reel.scrollLeft) { x = norm(x + reel.scrollLeft); reel.scrollLeft = 0; render(); } });

  var holdUntil = 0, visible = true, vel = 0, anim = null, drag = null, dragged = false;
  function hold(ms) { holdUntil = Math.max(holdUntil, performance.now() + ms); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(reel);
  // стоим, только пока по ленте ходят с клавиатуры (фокус после щелчка мышкой не в счет – в Safari он бывает «видимым»)
  var byKeys = false;
  addEventListener('keydown', function (e) { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || /^Arrow/.test(e.key)) byKeys = true; }, true);
  addEventListener('pointerdown', function () { byKeys = false; }, true);
  function kbFocus() {
    var a = document.activeElement;
    return byKeys && !!a && reel.contains(a);
  }

  // 3. Движение: автопрокрутка, инерция после броска, докрутка стрелками
  var SPEED = 26, last = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    var dt = last ? Math.min(t - last, 64) : 0; last = t;
    if (!visible || document.hidden || drag) return;
    if (anim) {
      var p = Math.min(1, (t - anim.t0) / anim.d), e = 1 - Math.pow(1 - p, 3);
      x = anim.from + (anim.to - anim.from) * e;
      if (p >= 1) { anim = null; x = norm(x); }
    } else if (Math.abs(vel) > 0.01) {
      x = norm(x + vel * dt);
      vel *= Math.pow(0.94, dt / 16);
    } else if (!reduce && t >= holdUntil && !kbFocus()) {
      x = norm(x + SPEED * dt / 1000);
    } else return;
    render();
  }
  requestAnimationFrame(tick);

  // Стрелки (glass.js): на две карточки вперед/назад
  reel.reelGo = function (dir) {
    var c = track.querySelector('.rflip, .rv');
    var step = ((c ? c.offsetWidth : 257) + (parseFloat(getComputedStyle(track).columnGap) || 0)) * 2;
    vel = 0;
    var from = anim ? anim.to : x;
    from = norm(from); x = from;
    anim = { from: from, to: from + dir * step, t0: performance.now(), d: reduce ? 1 : 520 };
    hold(2500);
  };

  // 4. Перетаскивание пальцем и мышкой
  reel.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    anim = null; vel = 0;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: x, moved: false, z: zoomOf(), lx: e.clientX, lt: performance.now(), v: 0 };
    dragged = false;
  });
  reel.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = (e.clientX - drag.sx) / drag.z, dy = (e.clientY - drag.sy) / drag.z;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      drag.moved = true;
      reel.classList.add('is-drag');
      try { reel.setPointerCapture(drag.id); } catch (_) {}
    }
    var now = performance.now(), ddt = Math.max(1, now - drag.lt);
    drag.v = 0.7 * (-(e.clientX - drag.lx) / drag.z / ddt) + 0.3 * drag.v;
    drag.lx = e.clientX; drag.lt = now;
    x = norm(drag.x0 - dx);
    if (Math.abs(x - (drag.x0 - dx)) > 1) drag.x0 = x + dx;
    render();
  });
  function endDrag(e) {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    if (drag.moved) {
      dragged = true;
      vel = performance.now() - drag.lt < 80 ? Math.max(-3, Math.min(3, drag.v)) : 0;
      setTimeout(function () { dragged = false; }, 0);
    }
    reel.classList.remove('is-drag');
    // пауза только после настоящего перетаскивания; щелчок и касание ленту не останавливают
    if (drag.moved) hold(2500);
    drag = null;
  }
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);
  reel.addEventListener('lostpointercapture', endDrag);
  // кнопку отпустили уже за лентой – иначе лента замирала до следующего щелчка
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  // после перетаскивания щелчок не срабатывает (не переворачивает и не открывает ссылку)
  reel.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  reel.addEventListener('dragstart', function (e) { e.preventDefault(); });
})();
