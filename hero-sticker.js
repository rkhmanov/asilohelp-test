// Тестовая страница hero-sticker.html: буквы-стикеры на первом экране.
// Курсор (или палец) над буквами прячет букву под стикер, соседние буквы дают «хвост» поменьше.
// Пока страницу не трогают, эффект сам проходит волной по всем строкам (кроме ASILO).
// prefers-reduced-motion: без автопробега, стикеры появляются без пружины.
(function () {
  'use strict';
  // Главная (index.html): <h1 data-sk="phone"> – стикеры только на телефоне (до 480 px), на компьютере там руки
  var h1 = document.querySelector('.sk-h, [data-sk]');
  if (!h1) return;
  var phoneOnly = h1.getAttribute('data-sk') === 'phone';
  var phoneMq = matchMedia('(max-width: 480px)');
  if (phoneOnly && !phoneMq.matches) { document.documentElement.classList.remove('sk-wait'); return; }
  var off = function () { return phoneOnly && !phoneMq.matches; }; // телефон повернули – эффект выключаем

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Стикеры: [картинка, эмодзи], по порядку букв (дальше по кругу). Тема как в оригинале – дорога: флаги, документы,
  // чемодан, перелет, люди и пары, глобус, пляж. Картинки – Microsoft Fluent Emoji 3D (MIT), см. img/stickers/README.md.
  // Вариант hero-sticker-emoji.html (<h1 data-emoji>): вместо картинок системные эмодзи –
  // на iPhone и Mac это эмодзи Apple, на Android – Google, на Windows – Microsoft. Картинок не грузим.
  // Чего нет в Fluent Emoji (пары, флаг Испании), есть только в варианте с эмодзи (картинка null).
  // Люди в эмодзи – со светлыми тонами кожи, блондины и брюнеты, не только желтые (Саша, 23.11.2026).
  var ALL = [
    ['rainbow-flag', '🏳️‍🌈'],
    ['identification-card', '🪪'],
    ['luggage', '🧳'],
    ['airplane', '✈️'],
    [null, '👬🏻'],
    ['globe', '🌍'],
    ['transgender-flag', '🏳️‍⚧️'],
    [null, '👭🏼'],
    ['backpack', '🎒'],
    ['people-hugging', '👩🏻'],
    [null, '🇪🇸'],
    ['airplane-departure', '🛫'],
    [null, '👨🏻‍❤️‍👨🏼'],
    ['compass', '🧭'],
    ['man', '👱🏼‍♂️'],
    ['palm-tree', '🌴'],
    [null, '👩🏼‍❤️‍👩🏻'],
    ['world-map', '🗺️'],
    ['woman', '👱🏻‍♀️'],
    ['camera', '📸'],
    [null, '🧑🏻‍🤝‍🧑🏽'],
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
      else { L.v = (L.v + (target - L.x) * 0.22) * 0.74; L.x += L.v; }
      if (Math.abs(L.x) < 0.003 && Math.abs(L.v) < 0.003 && target === 0) { L.x = 0; L.v = 0; }
      else active = true;
      var x = Math.max(0, L.x);
      var q = Math.round(x * 200) / 200;
      if (q !== L.shown) {
        L.shown = q;
        L.img.style.transform = q ? 'translateY(' + (-0.06 * q) + 'em) rotate(' + (L.r * q) + 'deg) scale(' + q + ')' : '';
        L.img.style.zIndex = Math.round(q * 100);
        L.el.classList.toggle('is-on', q > 0);
      }
      // Буква: под стикером сжимается в ноль (без прозрачности), а когда стикер уходит, пружина
      // проскакивает ниже нуля – буква выпрыгивает чуть больше обычного и садится на место (как в оригинале)
      var ls = Math.round(Math.min(1.18, Math.max(0, 1 - L.x * 2.4)) * 100) / 100;
      if (ls !== L.ls) {
        L.ls = ls;
        L.t.style.transform = ls === 1 ? '' : 'translateY(' + (ls > 1 ? -(ls - 1) * 0.5 : 0) + 'em) scale(' + ls + ')';
      }
    }
    if (active) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (entering) return; if (off()) { ptr = null; } if (!running) { running = true; requestAnimationFrame(frame); } }

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
  // Пока страницу не трогают, волна идет первый раз через 7 с после открытия страницы, дальше каждые 10 с
  // (Саша, 24.11.2026; раньше раз в 15 с). Если трогали страницу последние 4 с, волна пропускается.
  var FIRST = 7000, IDLE = 10000, t0 = performance.now();
  function idleLoop(delay) {
    if (reduce) return;
    setTimeout(function () {
      if (!document.hidden && !off() && Date.now() - lastUser > 4000 && !busy) { busy = true; sweep(function () { busy = false; }); }
      idleLoop(IDLE);
    }, delay == null ? Math.max(0, FIRST - (performance.now() - t0)) : delay);
  }

  // --- Появление (как в оригинале после кольца-загрузки, само кольцо не берем) -----------------------
  // По каждой строке стикеры выезжают из стопки у первой буквы и встают поезд-рядом поверх букв (шаг 45 мс),
  // ряд сразу снимается слева направо: стикер сжимается в ноль, буква под ним выпрыгивает (шаг 72 мс).
  // Тайминги сняты покадрово с видео-образца, см. .reanimate/sticker/spec.md.
  var entering = false;
  function entrance(done) {
    measure();
    entering = true;
    // текст до старта спрятан (класс sk-wait из <head>), дальше прячут сами анимации
    requestAnimationFrame(function () { document.documentElement.classList.remove('sk-wait'); });
    var z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
    var rows = [];
    letters.forEach(function (L) {
      var r = rows.filter(function (R) { return Math.abs(R[0].cy - L.cy) < L.em * 0.5; })[0];
      if (r) r.push(L); else rows.push([L]);
    });
    var IN = 45, OUT = 72, FLY = 360, POP = 110, ROW = 140, end = 0;
    var k = 1.15 / K; // стикер в ряду – с букву
    rows.forEach(function (R, ri) {
      var base = ri * ROW, first = R[0];
      var revealAt = base + (R.length - 1) * IN + FLY;
      R.forEach(function (L, i) {
        var a = base + i * IN, v = revealAt + i * OUT, dur = v + POP - a;
        var dx = (first.cx - L.cx) / z;
        var r = L.r * 0.6;
        L.el.classList.add('is-on');
        L.img.style.zIndex = 10 + i;
        L.img.animate([
          { transform: 'translateX(' + dx + 'px) rotate(' + (r - 20) + 'deg) scale(0)', offset: 0, easing: 'cubic-bezier(.2,.7,.3,1)' },
          { transform: 'translateX(' + dx * 0.15 + 'px) rotate(' + (r + 4) + 'deg) scale(' + k * 1.12 + ')', offset: FLY * 0.65 / dur, easing: 'ease-in-out' },
          { transform: 'translateX(0) rotate(' + r + 'deg) scale(' + k + ')', offset: FLY / dur },
          { transform: 'translateX(0) rotate(' + r + 'deg) scale(' + k + ')', offset: (v - a) / dur, easing: 'cubic-bezier(.5,0,.9,.4)' },
          { transform: 'translateX(0) rotate(' + r + 'deg) scale(0)', offset: 1 }
        ], { duration: dur, delay: a, fill: 'both' }).onfinish = function (e) {
          L.el.classList.remove('is-on'); L.img.style.zIndex = ''; e.target.cancel();
        };
        L.t.animate([
          { transform: 'translateY(.12em) scale(.4)', opacity: 0 },
          { transform: 'translateY(-.06em) scale(1.14)', opacity: 1, offset: 0.55 },
          { transform: 'none', opacity: 1 }
        ], { duration: 260, delay: v + 20, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
        end = Math.max(end, v + 280);
      });
      // плашка ASILO стоит в строке после «получить» – выпрыгивает следом за последней буквой строки
      var mk = h1.querySelector('.mark'), mr = mk && mk.getBoundingClientRect();
      if (mk && Math.abs(mr.top + mr.height / 2 - R[0].cy) < R[0].em * 0.6 && mr.left > R[R.length - 1].cx) {
        mk.animate([
          { transform: 'rotate(-6deg) scale(.3)', opacity: 0 },
          { transform: 'rotate(4deg) scale(1.08)', opacity: 1, offset: 0.6 },
          { transform: 'rotate(2deg)', opacity: 1 }
        ], { duration: 380, delay: revealAt + R.length * OUT, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
      }
    });
    setTimeout(function () { entering = false; if (done) done(); }, end);
  }

  function start() {
    measure();
    if (reduce) { document.documentElement.classList.remove('sk-wait'); return; }
    // Появление один раз, потом тишина; волна по строкам – через 7 с, потом каждые 10 с, пока страницу не трогают
    entrance(function () { idleLoop(); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else addEventListener('load', start);
})();
