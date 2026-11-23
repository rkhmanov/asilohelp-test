/* Руки на первом экране главной (index.html, шире 480 px) и glavnaya-ruki.html (и на телефоне).
   Две руки из «Сотворения Адама» (img/ruki-left.png, img/ruki-right.png — яркость + маска, см. source/ruki.py)
   рисуются полутоном: точка тем крупнее, чем темнее место, плюс пунктирный контур.
   Руки въезжают с краев и собираются из точек, потом медленно тянутся друг к другу;
   при прокрутке пальцы сходятся, и точки у кончиков становятся фирменного красного цвета.
   prefers-reduced-motion: одна неподвижная картинка, без въезда и покачивания. */
(function () {
  var band = document.querySelector('.ruki');
  if (!band) return;
  var cv = band.querySelector('canvas');
  var ctx = cv.getContext('2d');
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = mq.matches || /[?&]shot/.test(location.search);

  // геометрия исходника (пиксели source/ruki-src.jpg)
  var SRC = {
    left: { url: 'img/ruki-left.png', ox: 5, oy: 206, tipX: 539, tipY: 344 },
    right: { url: 'img/ruki-right.png', ox: 552, oy: 167, tipX: 552, tipY: 326 }
  };
  var TOP = 167, BOTTOM = 473, TIPY = 344; // общая высота сцены по вертикали
  var INK = '37,38,42', ACC = '160,37,56';

  var hands = {}, W = 0, H = 0, s = 1, sp = 7, k = 1, start = 0, raf = 0, visible = true, built = false;

  function load(h) {
    return new Promise(function (ok, fail) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas');
        c.width = im.naturalWidth; c.height = im.naturalHeight;
        var x = c.getContext('2d');
        x.drawImage(im, 0, 0);
        h.w = c.width; h.h = c.height;
        h.px = x.getImageData(0, 0, c.width, c.height).data;
        // яркость руки от 5-го до 95-го процентиля: полутон одинаково читается на обеих руках
        var hist = [], i;
        for (i = 0; i < h.px.length; i += 4) if (h.px[i + 3] > 200) hist.push(h.px[i]);
        hist.sort(function (a, b) { return a - b; });
        h.lo = hist[Math.floor(hist.length * 0.05)]; h.hi = hist[Math.floor(hist.length * 0.95)];
        ok();
      };
      im.onerror = fail;
      im.src = h.url;
    });
  }

  function at(h, x, y) { // [яркость, маска] в точке исходника (координаты внутри вырезки)
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= h.w || y >= h.h) return [255, 0];
    var i = (y * h.w + x) * 4;
    return [h.px[i], h.px[i + 3]];
  }

  function smooth(a, b, v) { v = Math.min(1, Math.max(0, (v - a) / (b - a))); return v * v * (3 - 2 * v); }

  // точки одной руки: координаты относительно кончика пальца, в исходных пикселях
  function build(h, side) {
    var dots = [], st = sp / s, rMax = sp * 0.44, x, y, j;
    for (y = st / 2; y < h.h; y += st) {
      for (x = st / 2; x < h.w; x += st) {
        // среднее по 4 точкам ячейки
        var L = 0, A = 0;
        for (j = 0; j < 4; j++) {
          var v = at(h, x + (j & 1 ? st / 4 : -st / 4), y + (j & 2 ? st / 4 : -st / 4));
          L += v[0]; A += v[1];
        }
        L /= 4; A /= 4;
        if (A < 160) continue;
        var dark = (h.hi - L) / (h.hi - h.lo);
        var r = rMax * Math.pow(Math.min(1, Math.max(0, (dark - 0.28) / 0.72)), 1.5);
        if (r < 0.4) continue;
        dots.push(dot(h, side, x, y, r, 0));
      }
    }
    // пунктирный контур: край маски на сетке помельче
    var e = (sp * 0.5) / s, d = e;
    for (y = 0; y < h.h; y += e) {
      for (x = 0; x < h.w; x += e) {
        if (at(h, x, y)[1] < 128) continue;
        if (at(h, x - d, y)[1] < 128 || at(h, x + d, y)[1] < 128 || at(h, x, y - d)[1] < 128 || at(h, x, y + d)[1] < 128) {
          // не рисуем «край» там, где рука упирается в край исходника (обрез плеча)
          if ((side === 'left' && x < d * 1.5) || (side === 'right' && x > h.w - d * 1.5)) continue;
          dots.push(dot(h, side, x, y, Math.max(0.6, sp * 0.12), 1));
        }
      }
    }
    return dots;
  }

  function dot(h, side, x, y, r, line) {
    var ax = h.ox + x - h.tipX, ay = h.oy + y - h.tipY;             // от кончика пальца
    var u = side === 'left' ? x / h.w : 1 - x / h.w;              // 0 — у плеча, 1 — у пальцев
    return {
      x: ax, y: ay + (h.tipY - TIPY), r: r, line: line,
      fade: smooth(0, 0.3, u),                                     // плечо растворяется
      seed: 0.62 * u + 0.38 * Math.random(),                       // порядок появления: от плеча к пальцам
      tip: Math.sqrt(ax * ax + ay * ay)                            // расстояние до кончика
    };
  }

  function layout() {
    var w = band.clientWidth;
    if (!w) return false;
    var mobile = w <= 600;
    s = mobile ? w / 540 : Math.min(0.92, Math.max(0.62, w / 1500));
    sp = mobile ? 3.4 : 5.2;
    W = w;
    H = Math.round((BOTTOM - TOP) * s + 40);
    band.style.height = H + 'px';
    band.style.setProperty('--tip', Math.round((TIPY - TOP) * s + 20) + 'px');
    var z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
    k = Math.min(window.devicePixelRatio || 1, 2) * z;
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    hands.left.dots = build(hands.left, 'left');
    hands.right.dots = build(hands.right, 'right');
    return true;
  }

  function scrollPart() { // 0 — страница наверху, 1 — блок с руками ушел под шапку
    var r = band.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    return Math.min(1, Math.max(0, 1 - (r.top + r.height * 0.6) / (vh * 0.75)));
  }

  function frame(now) {
    raf = 0;
    if (!start) start = now;
    var t = (now - start) / 1000;
    var intro = reduce ? 1 : Math.min(1, t / 2.6);
    var ease = 1 - Math.pow(1 - intro, 3);
    var sc = reduce ? 0 : scrollPart();
    // промежуток между кончиками пальцев (исходные пиксели)
    var breathe = reduce ? 0 : Math.sin(t * 0.9) * 0.5 + 0.5;          // 0..1, период ~7 с
    var gap = 26 + 30 * breathe;
    gap = gap * (1 - sc) + 3 * sc;
    var touch = smooth(40, 4, gap);                                   // 0..1: насколько пальцы близко
    var slide = (1 - ease) * W * 0.22;                                // въезд с краев, css px

    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = (TIPY - TOP) * s + 20;
    draw(hands.left, cx - (gap / 2) * s - slide, cy + (reduce ? 0 : Math.sin(t * 0.7) * 2.5), intro, touch);
    draw(hands.right, cx + (gap / 2) * s + slide, cy + (reduce ? 0 : Math.sin(t * 0.7 + 2) * 2.5), intro, touch);

    if (!reduce && visible) raf = requestAnimationFrame(frame);
  }

  function draw(h, ox, oy, intro, touch) {
    var dots = h.dots, i, d, a, acc, reach = 150 * (0.35 + 0.65 * touch);
    // 4 слоя: контур и полутон серым, потом красный поверх у кончиков пальцев
    var ink = [], red = [];
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      a = d.fade * Math.min(1, Math.max(0, (intro * 1.25 - d.seed) / 0.18));
      if (a <= 0.02) continue;
      acc = touch * Math.max(0, 1 - d.tip / reach);
      if (acc > 0.5) red.push(d, a * Math.min(1, (acc - 0.5) * 3)); else ink.push(d, a);
    }
    paint(ink, INK, ox, oy, 0.72);
    paint(red, ACC, ox, oy, 1);
  }

  function paint(list, rgb, ox, oy, max) {
    // группируем по прозрачности, чтобы рисовать одним путем на группу
    var buckets = [[], [], [], []], i, b;
    for (i = 0; i < list.length; i += 2) {
      b = Math.min(3, Math.floor(list[i + 1] * 4));
      buckets[b].push(list[i]);
    }
    for (b = 0; b < 4; b++) {
      if (!buckets[b].length) continue;
      ctx.fillStyle = 'rgba(' + rgb + ',' + (max * (b + 1) / 4) + ')';
      ctx.beginPath();
      for (i = 0; i < buckets[b].length; i++) {
        var d = buckets[b][i], x = ox + d.x * s, y = oy + d.y * s;
        ctx.moveTo(x + d.r, y);
        ctx.arc(x, y, d.r, 0, 6.2832);
      }
      ctx.fill();
    }
  }

  function kick() { if (!raf && built) raf = requestAnimationFrame(frame); }

  // бордовый фон блоков 1–3 на компьютере начинается под цифрами (на главной — на 175 px выше их низа)
  window.rukiBg = function () {
    var bg = document.querySelector('.bg-burgundy'), nums = document.querySelector('.hero--ruki .hero__nums');
    if (!bg || !nums || getComputedStyle(bg).display === 'none') return;
    var y = 0, el = nums;
    while (el && el.tagName !== 'MAIN') { y += el.offsetTop; el = el.offsetParent; }
    bg.style.top = Math.round(y + nums.offsetHeight - 175) + 'px';
  };
  window.rukiBg();

  var rt = 0, lastW = 0;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (!band.clientWidth || band.clientWidth === lastW) return;
      lastW = band.clientWidth;
      if (layout()) { if (window.rukiBg) window.rukiBg(); kick(); }
    }, 120);
  }

  // на телефоне (до 480 px) на главной рук нет: картинки не грузим, пока полоса скрыта
  var started = false;
  function shown() { return getComputedStyle(band).display !== 'none'; }
  function tryStart() {
    if (started || !shown()) return;
    started = true;
    removeEventListener('resize', tryStart);
    init();
  }
  addEventListener('resize', tryStart);
  tryStart();

  function init() { Promise.all([load(SRC.left), load(SRC.right)]).then(function () {
    hands.left = SRC.left; hands.right = SRC.right;
    if (!layout()) return;
    lastW = band.clientWidth;
    built = true;
    band.classList.add('is-on');
    if (window.rukiBg) window.rukiBg();
    kick();
    addEventListener('resize', onResize);
    addEventListener('scroll', function () { if (reduce) return; kick(); }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) kick();
      }).observe(band);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
    var onMq = function () { reduce = mq.matches; start = 0; kick(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
  }).catch(function () { band.style.display = 'none'; }); }
})();
