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

  // Стикеры: [картинка, подпись, эмодзи]. Картинки – Microsoft Fluent Emoji 3D (MIT), см. img/stickers/README.md.
  // Вариант hero-sticker-emoji.html (<h1 data-emoji>): вместо картинок системные эмодзи –
  // на iPhone и Mac это эмодзи Apple, на Android – Google, на Windows – Microsoft. Картинок не грузим.
  // Пар в Fluent Emoji нет, поэтому они только в варианте с эмодзи (картинка null).
  var ALL = [
    ['speech-balloon', 'Консультация', '💬'],
    ['clipboard', 'Проверим готовый кейс', '📋'],
    ['page-facing-up', 'Текст кейса', '📄'],
    ['bookmark-tabs', 'Доказательства', '📑'],
    ['world-map', 'Отчет о стране', '🗺️'],
    ['open-book', 'Перевод на испанский', '📖'],
    ['spiral-calendar', 'Подготовка к интервью', '🗓️'],
    ['airplane', 'Виза и перелет', '✈️'],
    ['luggage', 'Переезд', '🧳'],
    ['classical-building', 'Подача в Испании', '🏛️'],
    ['key', 'Первые месяцы', '🔑'],
    ['handshake', 'Сопровождение', '🤝'],
    ['balance-scale', 'Юрист в команде', '⚖️'],
    ['rainbow-flag', 'Для ЛГБТ-людей', '🏳️‍🌈'],
    ['shield', 'Конфиденциально', '🛡️'],
    ['tangerine', 'Испания', '🍊'],
    ['identification-card', 'Паспорт и документы', '🪪'],
    ['transgender-flag', 'Для транс-людей', '🏳️‍⚧️'],
    [null, 'Для геев', '👬'],
    [null, 'Для лесбиянок', '👭'],
    [null, 'Для пар', '👨‍❤️‍👨'],
    [null, 'Для пар', '👩‍❤️‍👩']
  ];
  var emoji = h1.hasAttribute('data-emoji');
  var S = ALL.filter(function (x) { return emoji || x[0]; });
  var src = function (i) { return 'img/stickers/' + S[i][0] + '.webp'; };
  // Заранее грузим картинки, чтобы стикер не мигал пустым местом при первом наведении
  if (!emoji) S.forEach(function (_, i) { var im = new Image(); im.src = src(i); });
  function sticker(k, cls) {
    var e;
    if (emoji) { e = document.createElement('span'); e.className = 'sk-e' + (cls ? ' ' + cls : ''); e.textContent = S[k][2]; }
    else { e = document.createElement('img'); e.src = src(k); e.alt = ''; e.decoding = 'async'; e.draggable = false; if (cls) e.className = cls; }
    return e;
  }

  // --- Разбиваем заголовок на буквы ---------------------------------------------------------
  var letters = [];
  // Порядок стикеров по буквам: перемешан с постоянным зерном, соседние буквы получают разные стикеры
  var order = (function () {
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var out = [];
    for (var pass = 0; pass < 4; pass++) {
      var a = S.map(function (_, i) { return i; });
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      if (out.length && a[0] === out[out.length - 1]) a.push(a.shift());
      out = out.concat(a);
    }
    return out;
  })();
  var markAt = -1; // буквы ASILO без стикеров: плашка остается как есть
  function split(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1) { split(n); return; }
      if (n.nodeType !== 3) return;
      if (n.parentNode.closest('.mark')) { if (markAt < 0) markAt = letters.length; return; }
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
          var img = sticker(k);
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
  var K = 2.3; // размер стикера в долях кегля, из --st-k в hero-sticker.css
  function measure() {
    K = parseFloat(getComputedStyle(h1).getPropertyValue('--st-k')) || 2.3;
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
    var f = 1 - d / (0.55 * K);
    return f <= 0 ? 0 : Math.pow(f, 1.2);
  }

  function frame() {
    if (dirty) { measure(); dirty = false; }
    var active = false, best = -1, bestX = 0;
    for (var i = 0; i < letters.length; i++) {
      var L = letters[i];
      var inf = influence(L);
      L.hold = Math.max(L.hold * (reduce ? 0.8 : 0.9), inf);
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
      cap.style.transform = 'translate(' + (left - w / 2) + 'px,' + (L2.cy + L2.em / 1.14 * K * 0.5 * Math.min(1, L2.x) + 6) + 'px)';
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
  var ghost = null, busy = false;
  function ghostStop() { sweepId++; busy = false; if (ghost) { cancelAnimationFrame(ghost); ghost = null; } }
  var sweepId = 0;
  // Пробегает по всем строкам змейкой (слева направо, следующая – справа налево), буквы ASILO пропускает
  function sweep(done) {
    measure();
    // строки – по тому, как буквы стоят на экране (на телефоне первая строка разбита на две)
    var rows = [];
    letters.forEach(function (L) {
      var r = rows.filter(function (R) { return Math.abs(R[0].cy - L.cy) < L.em * 0.5; })[0];
      if (r) r.push(L); else rows.push([L]);
    });
    var i = 0, id = sweepId;
    (function row() {
      if (id !== sweepId) return;
      if (i >= rows.length) { ghost = null; ptr = null; kick(); if (done) done(); return; }
      var cs = rows[i], back = i % 2 === 1; i++;
      var a = cs[0], b = cs[cs.length - 1];
      var x0 = a.cx - a.em * 0.5, x1 = b.cx + b.em * 0.5;
      if (back) { var t = x0; x0 = x1; x1 = t; }
      var t0 = performance.now(), dur = 300 + cs.length * 85;
      (function step(now) {
        if (id !== sweepId) return;
        var p = Math.min(1, (now - t0) / dur);
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        ptr = { x: x0 + (x1 - x0) * e, y: a.cy + Math.sin(p * Math.PI * 2) * a.em * 0.1 };
        kick();
        if (p < 1) ghost = requestAnimationFrame(step);
        else { ptr = null; kick(); ghost = requestAnimationFrame(function () { setTimeout(row, 90); }); }
      })(t0);
    })();
  }
  // Пока страницу не трогают, волна повторяется: пауза 3 с после конца прохода
  function idleLoop() {
    if (reduce) return;
    setTimeout(function () {
      if (!document.hidden && Date.now() - lastUser > 4000 && !busy) { busy = true; sweep(function () { busy = false; }); }
      idleLoop();
    }, 3000);
  }

  // --- Заставка: кольцо из стикеров → в заголовок ----------------------------------------------
  function intro() {
    measure();
    var hr = h1.getBoundingClientRect();
    var cx = hr.left + hr.width / 2, cy = hr.top + hr.height / 2;
    var vw = innerWidth, vh = innerHeight;
    var R = Math.min(vw * 0.36, vh * 0.3, 300);
    var size = Math.max(64, Math.min(130, R * 0.45));
    var n = 12, ring = [];
    fx.querySelectorAll('.sk-ring').forEach(function (e) { e.remove(); });
    for (var i = 0; i < n; i++) {
      var im = sticker(order[i], 'sk-ring');
      im.style.width = im.style.height = size + 'px';
      if (emoji) im.style.fontSize = (size * 0.82) + 'px';
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
      var first = Math.max(0, markAt);
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
      if (Date.now() - lastUser > 1500) { busy = true; sweep(function () { busy = false; }); }
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
    if (!reduce) { intro(); idleLoop(); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else addEventListener('load', start);
})();
