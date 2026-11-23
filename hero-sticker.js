// Тестовая страница hero-sticker.html: буквы-стикеры на первом экране.
// Курсор (или палец) над буквами прячет букву под стикер, соседние буквы дают «хвост» поменьше.
// Пока страницу не трогают, эффект сам проходит волной по всем строкам (кроме ASILO).
// prefers-reduced-motion: без автопробега, стикеры появляются без пружины.
(function () {
  'use strict';
  var h1 = document.querySelector('.sk-h');
  var hint = document.querySelector('.sk-hint');
  if (!h1) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Стикеры: [картинка, эмодзи], по порядку букв (дальше по кругу). Тема как в оригинале – дорога: флаги, документы,
  // чемодан, перелет, люди и пары, глобус, пляж. Картинки – Microsoft Fluent Emoji 3D (MIT), см. img/stickers/README.md.
  // Вариант hero-sticker-emoji.html (<h1 data-emoji>): вместо картинок системные эмодзи –
  // на iPhone и Mac это эмодзи Apple, на Android – Google, на Windows – Microsoft. Картинок не грузим.
  // Чего нет в Fluent Emoji (пары, флаг Испании), есть только в варианте с эмодзи (картинка null).
  var ALL = [
    ['rainbow-flag', '🏳️‍🌈'],
    ['identification-card', '🪪'],
    ['luggage', '🧳'],
    ['airplane', '✈️'],
    [null, '👬'],
    ['globe', '🌍'],
    ['transgender-flag', '🏳️‍⚧️'],
    [null, '👭'],
    ['backpack', '🎒'],
    ['people-hugging', '🫂'],
    [null, '🇪🇸'],
    ['airplane-departure', '🛫'],
    [null, '👨‍❤️‍👨'],
    ['compass', '🧭'],
    ['man', '🧑'],
    ['palm-tree', '🌴'],
    [null, '👩‍❤️‍👩'],
    ['world-map', '🗺️'],
    ['woman', '👩'],
    ['camera', '📸'],
    [null, '🧑‍🤝‍🧑'],
    ['beach-with-umbrella', '🏖️'],
    ['key', '🔑'],
    ['desert-island', '🏝️'],
    ['house', '🏠']
  ];
  var emoji = h1.hasAttribute('data-emoji');
  var S = ALL.filter(function (x) { return emoji || x[0]; });
  var src = function (i) { return 'img/stickers/' + S[i][0] + '.webp'; };
  // Заранее грузим картинки, чтобы стикер не мигал пустым местом при первом наведении
  if (!emoji) S.forEach(function (_, i) { var im = new Image(); im.src = src(i); });
  function sticker(k, cls) {
    var e;
    if (emoji) { e = document.createElement('span'); e.className = 'sk-e' + (cls ? ' ' + cls : ''); e.textContent = S[k][1]; }
    else { e = document.createElement('img'); e.src = src(k); e.alt = ''; e.decoding = 'async'; e.draggable = false; if (cls) e.className = cls; }
    return e;
  }

  // --- Разбиваем заголовок на буквы ---------------------------------------------------------
  var letters = [];
  var order = S.map(function (_, i) { return i; }); // порядок – как в списке ALL
  function split(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1) { split(n); return; }
      if (n.nodeType !== 3) return;
      if (n.parentNode.closest('.mark')) return; // буквы ASILO без стикеров
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
    var active = false;
    for (var i = 0; i < letters.length; i++) {
      var L = letters[i];
      var inf = influence(L);
      L.hold = Math.max(L.hold * (reduce ? 0.8 : 0.9), inf);
      var target = L.hold < 0.04 ? 0 : L.hold;
      if (reduce) { L.x = target; L.v = 0; }
      else { L.v = (L.v + (target - L.x) * 0.2) * 0.7; L.x += L.v; }
      if (Math.abs(L.x) < 0.002 && Math.abs(L.v) < 0.002 && target === 0) { L.x = 0; L.v = 0; }
      else active = true;
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

  function start() {
    measure();
    if (reduce) return;
    // Без заставки: текст виден сразу, через секунду волна проходит по строкам, потом повторяется, пока страницу не трогают
    setTimeout(function () {
      if (Date.now() - lastUser > 1000 && !busy) { busy = true; sweep(function () { busy = false; }); }
      idleLoop();
    }, 1000);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else addEventListener('load', start);
})();
