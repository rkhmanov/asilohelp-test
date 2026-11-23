// Тестовая страница hero-sticker.html: буквы-стикеры на первом экране.
// 1) Заставка: стикеры собираются в кольцо и улетают в заголовок, буквы проявляются.
// 2) Курсор (или палец) над буквами прячет букву под стикер, соседние буквы дают «хвост» поменьше,
//    под самым большим стикером подпись. На телефоне без касания эффект сам пробегает по строке раз в несколько секунд.
// prefers-reduced-motion: без заставки и автопробега, стикеры появляются без пружины.
(function () {
  'use strict';
  var h1 = document.querySelector('.sk-h');
  var fx = document.querySelector('.sk-fx');
  var cap = document.querySelector('.sk-cap');
  var hint = document.querySelector('.sk-hint');
  if (!h1 || !fx || !cap) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;

  // Стикеры: Microsoft Fluent Emoji 3D (MIT), см. img/stickers/README.md
  var S = [
    ['speech-balloon', 'Консультация'],
    ['clipboard', 'Проверим готовый кейс'],
    ['page-facing-up', 'Текст кейса'],
    ['bookmark-tabs', 'Доказательства'],
    ['world-map', 'Отчет о стране'],
    ['open-book', 'Перевод на испанский'],
    ['spiral-calendar', 'Подготовка к интервью'],
    ['airplane', 'Виза и перелет'],
    ['luggage', 'Переезд'],
    ['classical-building', 'Подача в Испании'],
    ['key', 'Первые месяцы'],
    ['handshake', 'Сопровождение'],
    ['balance-scale', 'Юрист в команде'],
    ['rainbow-flag', 'Для ЛГБТ-людей'],
    ['shield', 'Конфиденциально'],
    ['tangerine', 'Испания']
  ];
  var src = function (i) { return 'img/stickers/' + S[i][0] + '.webp'; };
  // Заранее грузим картинки, чтобы стикер не мигал пустым местом при первом наведении
  S.forEach(function (_, i) { var im = new Image(); im.src = src(i); });

  // --- Разбиваем заголовок на буквы ---------------------------------------------------------
  var letters = [];
  var order = [8, 2, 13, 5, 0, 11, 7, 3, 14, 9, 1, 12, 4, 10, 6, 15]; // соседние буквы получают разные стикеры
  function split(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1) { split(n); return; }
      if (n.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (word) {
        if (!word) return;
        if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        w.className = 'sk-w';
        Array.from(word).forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'sk-c';
          var t = document.createElement('span');
          t.className = 'sk-t';
          t.textContent = ch;
          c.appendChild(t);
          var k = order[letters.length % order.length];
          var img = document.createElement('img');
          img.src = src(k); img.alt = ''; img.decoding = 'async'; img.draggable = false;
          c.appendChild(img);
          w.appendChild(c);
          // r — наклон стикера, d — сдвиг вверх; x — текущее значение 0..1, v — скорость пружины, hold — «хвост»
          letters.push({ el: c, t: t, img: img, k: k, r: (Math.random() * 28 - 14), x: 0, v: 0, hold: 0, cx: 0, cy: 0, em: 1, shown: -1 });
        });
        frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
  }
  h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
  split(h1);
  Array.prototype.forEach.call(h1.children, function (ch) { ch.setAttribute('aria-hidden', 'true'); });

  // --- Геометрия -------------------------------------------------------------------------------
  function measure() {
    letters.forEach(function (L) {
      var r = L.el.getBoundingClientRect();
      L.cx = r.left + r.width / 2; L.cy = r.top + r.height / 2; L.em = r.height;
    });
  }
  var dirty = true;
  addEventListener('resize', function () { dirty = true; });
  addEventListener('scroll', function () { dirty = true; }, { passive: true });

  // --- Указатель и анимация --------------------------------------------------------------------
  var ptr = null;           // {x, y} — где сейчас курсор/палец/«призрак»
  var running = false;
  var focus = -1;
  var lastUser = 0;

  function influence(L) {
    if (!ptr || !L.em) return 0;
    var dx = (L.cx - ptr.x) / L.em, dy = (L.cy - ptr.y) / L.em * 1.5;
    var d = Math.sqrt(dx * dx + dy * dy);
    var f = 1 - d / 1.35;
    return f <= 0 ? 0 : Math.pow(f, 1.4);
  }

  function frame() {
    if (dirty) { measure(); dirty = false; }
    var active = false, best = -1, bestX = 0;
    for (var i = 0; i < letters.length; i++) {
      var L = letters[i];
      var inf = influence(L);
      L.hold = Math.max(L.hold * (reduce ? 0.8 : 0.94), inf);
      var target = L.hold < 0.04 ? 0 : L.hold;
      if (reduce) { L.x = target; L.v = 0; }
      else { L.v = (L.v + (target - L.x) * 0.2) * 0.7; L.x += L.v; }
      if (Math.abs(L.x) < 0.002 && Math.abs(L.v) < 0.002 && target === 0) { L.x = 0; L.v = 0; }
      else active = true;
      if (L.x > bestX) { bestX = L.x; best = i; }
      var x = Math.max(0, L.x);
      var q = Math.round(x * 200) / 200;
      if (q !== L.shown) {
        L.shown = q;
        L.img.style.transform = q ? 'translateY(' + (-0.06 * q) + 'em) rotate(' + (L.r * q) + 'deg) scale(' + q + ')' : '';
        L.img.style.zIndex = Math.round(q * 100);
        var o = q < 0.15 ? 1 : q > 0.45 ? 0 : 1 - (q - 0.15) / 0.3;
        L.t.style.opacity = o === 1 ? '' : o;
        L.t.style.transform = o === 1 ? '' : 'scale(' + (1 - 0.25 * (1 - o)) + ')';
        L.el.classList.toggle('is-on', q > 0);
      }
    }
    // Подпись — под самым большим стикером, если он почти раскрыт
    var nf = bestX > 0.55 ? best : -1;
    if (nf !== focus) {
      focus = nf;
      if (nf >= 0) cap.textContent = S[letters[nf].k][1];
      cap.classList.toggle('is-on', nf >= 0);
    }
    if (focus >= 0) {
      var L2 = letters[focus], w = cap.offsetWidth, vw = document.documentElement.clientWidth;
      var left = Math.min(Math.max(L2.cx, w / 2 + 8), vw - w / 2 - 8);
      cap.style.transform = 'translate(' + (left - w / 2) + 'px,' + (L2.cy + L2.em * 0.92) + 'px)';
    }
    if (active) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  // Мышь: следим по всей странице, эффект включается, только когда курсор рядом с буквами
  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' && !h1.contains(e.target)) return;
    lastUser = Date.now(); ghostStop();
    ptr = { x: e.clientX, y: e.clientY }; kick();
  }, { passive: true });
  function release() { ptr = null; kick(); }
  document.addEventListener('pointerleave', release);
  h1.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') release(); });
  h1.addEventListener('pointercancel', release);
  h1.addEventListener('pointerdown', function (e) {
    lastUser = Date.now(); ghostStop(); measure();
    ptr = { x: e.clientX, y: e.clientY }; kick();
  });

  // --- «Призрак»: сам пробегает по строке (подсказка, а на телефоне — постоянно, пока не трогают) ---
  var ghost = null;
  function ghostStop() { if (ghost) { cancelAnimationFrame(ghost); ghost = null; } }
  var lineNo = 1;
  function sweep(done) {
    measure();
    // строки — по тому, как буквы стоят на экране (на телефоне первая строка разбита на две)
    var rows = [];
    letters.forEach(function (L) {
      var r = rows.filter(function (R) { return Math.abs(R[0].cy - L.cy) < L.em * 0.5; })[0];
      if (r) r.push(L); else rows.push([L]);
    });
    if (lineNo < 0) rows.forEach(function (R, i) { if (R[0].el.closest('.sk-line') === h1.querySelector('.mark').closest('.sk-line')) lineNo = i; });
    if (lineNo < 0) lineNo = 0;
    var cs = rows[lineNo % rows.length]; lineNo++;
    if (!cs.length) return;
    var a = cs[0], b = cs[cs.length - 1];
    var t0 = performance.now(), dur = 380 + cs.length * 95;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      ptr = { x: a.cx - a.em * 0.6 + (b.cx - a.cx + a.em * 1.2) * e, y: a.cy + Math.sin(p * Math.PI * 2) * a.em * 0.12 };
      kick();
      if (p < 1) ghost = requestAnimationFrame(step);
      else { ghost = null; ptr = null; kick(); if (done) done(); }
    })(t0);
  }
  function idleLoop() {
    if (reduce) return;
    setTimeout(function () {
      if (!document.hidden && Date.now() - lastUser > 5000 && !ghost) sweep();
      idleLoop();
    }, 4500);
  }

  // --- Заставка: кольцо из стикеров → в заголовок ----------------------------------------------
  function intro() {
    measure();
    var hr = h1.getBoundingClientRect();
    var cx = hr.left + hr.width / 2, cy = hr.top + hr.height / 2;
    var vw = innerWidth, vh = innerHeight;
    var R = Math.min(vw * 0.36, vh * 0.3, 300);
    var size = Math.max(54, Math.min(100, R * 0.36));
    var n = 12, ring = [];
    fx.querySelectorAll('.sk-ring').forEach(function (e) { e.remove(); });
    for (var i = 0; i < n; i++) {
      var im = document.createElement('img');
      im.className = 'sk-ring'; im.alt = ''; im.src = src(order[i]);
      im.style.width = im.style.height = size + 'px';
      var ang = -Math.PI / 2 + i / n * Math.PI * 2;
      var x = cx + Math.cos(ang) * R - size / 2, y = cy + Math.sin(ang) * R - size / 2;
      im.style.left = '0'; im.style.top = '0';
      fx.appendChild(im);
      ring.push({ el: im, x: x, y: y, r: Math.random() * 30 - 15 });
    }
    var T = 0;
    ring.forEach(function (s, i) {
      s.el.animate([
        { transform: 'translate(' + s.x + 'px,' + s.y + 'px) scale(0) rotate(' + (s.r - 40) + 'deg)' },
        { transform: 'translate(' + s.x + 'px,' + s.y + 'px) scale(1.12) rotate(' + (s.r + 6) + 'deg)', offset: 0.7 },
        { transform: 'translate(' + s.x + 'px,' + s.y + 'px) scale(1) rotate(' + s.r + 'deg)' }
      ], { duration: 420, delay: i * 70, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' });
    });
    T = n * 70 + 420 + 250;
    // летим в буквы: равномерно по заголовку
    ring.forEach(function (s, i) {
      var L = letters[Math.round(i * (letters.length - 1) / (n - 1))];
      var k = (L.em * 1.3) / size;
      var tx = L.cx - size / 2, ty = L.cy - size / 2;
      var mx = (s.x + tx) / 2 + (cx - (s.x + tx) / 2) * 0.35, my = (s.y + ty) / 2 + (cy - (s.y + ty) / 2) * 0.35;
      s.el.animate([
        { transform: 'translate(' + s.x + 'px,' + s.y + 'px) scale(1) rotate(' + s.r + 'deg)' },
        { transform: 'translate(' + mx + 'px,' + my + 'px) scale(' + (1 + k) / 2 + ') rotate(' + (s.r * 0.5 + 20) + 'deg)', offset: 0.5 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ') rotate(' + L.r + 'deg)', offset: 0.82 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(0) rotate(' + L.r + 'deg)' }
      ], { duration: 900, delay: T + i * 35, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    });
    var reveal = T + 560;
    letters.forEach(function (L, i) {
      L.t.animate([
        { opacity: 0, transform: 'translateY(.35em) scale(.6)' },
        { opacity: 1, transform: 'translateY(-.04em) scale(1.06)', offset: 0.7 },
        { opacity: 1, transform: 'none' }
      ], { duration: 520, delay: reveal + i * 16, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
    });
    var mk = h1.querySelector('.mark');
    if (mk) {
      var first = letters.findIndex(function (L) { return mk.contains(L.el); });
      mk.animate([
        { opacity: 0, transform: 'rotate(-8deg) scale(.4)' },
        { opacity: 1, transform: 'rotate(4deg) scale(1.08)', offset: 0.65 },
        { opacity: 1, transform: 'rotate(2deg)' }
      ], { duration: 560, delay: reveal + first * 16 - 120, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
    }
    var end = reveal + letters.length * 16 + 520;
    if (hint) hint.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: end, fill: 'backwards' });
    setTimeout(function () {
      fx.querySelectorAll('.sk-ring').forEach(function (e) { e.remove(); });
      if (Date.now() - lastUser > 1500) { lineNo = -1; sweep(); }
    }, end + 150);
  }

  var replay = document.querySelector('.sk-replay');
  if (replay) replay.addEventListener('click', function () {
    letters.forEach(function (L) { L.hold = 0; L.x = 0; L.v = 0; });
    ptr = null; kick();
    if (reduce) return;
    lastUser = 0; intro();
  });

  function start() {
    measure();
    if (!reduce) { intro(); if (touch) idleLoop(); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else addEventListener('load', start);
})();
