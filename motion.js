// asilohelp — анимации сайта (в паре с motion.css). Карта: /animacii/
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 5. Появление при прокрутке, один раз. Лесенка: data-reveal-group на родителе.
  document.querySelectorAll('[data-reveal-group]').forEach(group => {
    const step = parseFloat(group.dataset.revealGroup) || 0.08;
    group.querySelectorAll('[data-reveal]').forEach((el, i) => el.style.setProperty('--reveal-delay', Math.min(i * step, 0.36) + 's'));
  });
  const shown = el => el.classList.add('is-shown');
  if (reduce || !('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal]').forEach(shown);
  } else {
    // Саша 24.11: блоки одной группы (data-reveal-group) появляются вместе, лесенкой, как только
    // показался верх группы, – нижние карточки («Сообщество», третья новость) больше не ждут своей очереди.
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const t = e.target; io.unobserve(t);
      if (t.hasAttribute('data-reveal')) shown(t);
      if (t.hasAttribute('data-reveal-group')) t.querySelectorAll('[data-reveal]').forEach(shown);
    }), { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    // display: contents (вопросы на телефоне) – у блока нет рамки, наблюдатель его не увидит
    document.querySelectorAll('[data-reveal-group]').forEach(g => io.observe(g));
    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (el.parentElement && el.parentElement.closest('[data-reveal-group]')) return;
      getComputedStyle(el).display === 'contents' ? shown(el) : io.observe(el);
    });
    // 26.11: что уже стоит в окне при загрузке, проявляем сразу. Иначе на высоких экранах (1728×1000 и т.п.)
    // цифры первого экрана попадали в нижние 10% окна и оставались невидимыми, пока страницу не прокрутят.
    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (el.parentElement && el.parentElement.closest('[data-reveal-group]')) return;
      const r = el.getBoundingClientRect();
      if (r.height && r.top < innerHeight && r.bottom > 0) { io.unobserve(el); shown(el); }
    });
  }

  // 14. Счетчик цифр: <b data-count="187">187</b>, по желанию data-suffix="+".
  // 26.11 (вечер, Саша): цифры одного ряда (первый экран, база знаний) стартуют вместе и приходят к финишу
  // одновременно – одна длительность для всех, с заметным замедлением в конце (easeOutQuart).
  // Старт – когда ряд виден, уже проявился (data-reveal) и вкладка на экране; отсчет времени – с первого кадра,
  // а не с момента, когда наблюдатель заметил цифры (в фоновой вкладке кадры не идут, и счет «проскакивал»).
  const counters = [...document.querySelectorAll('[data-count]')].filter(el => parseInt(el.dataset.count, 10) > 0);
  if (!reduce && counters.length && 'IntersectionObserver' in window) {
    const DUR = 2200;
    const fmt = (el, n) => { el.textContent = (n >= 10000 ? n.toLocaleString('ru-RU') : String(n)) + (el.dataset.suffix || ''); };
    const rowOf = el => el.closest('[data-count-row]') || el;  // ряд цифр помечен data-count-row
    const rows = new Map();
    counters.forEach(el => { const r = rowOf(el); if (!rows.has(r)) rows.set(r, []); rows.get(r).push(el); fmt(el, 0); });
    const run = list => {
      let t0 = 0;
      const tick = t => {
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / DUR), eased = 1 - Math.pow(1 - p, 4);
        list.forEach(el => fmt(el, Math.round(parseInt(el.dataset.count, 10) * eased)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    // ждем, пока блок с цифрами проявится (иначе счет идет под opacity: 0, и человек видит уже готовые числа)
    const whenShown = (row, go) => {
      const hid = rows.get(row)[0].closest('[data-reveal]:not(.is-shown)');
      if (!hid) return go();
      const mo = new MutationObserver(() => { if (hid.classList.contains('is-shown')) { mo.disconnect(); setTimeout(go, 150); } });
      mo.observe(hid, { attributes: true, attributeFilter: ['class'] });
    };
    const whenVisible = go => {
      if (!document.hidden) return go();
      const on = () => { if (document.hidden) return; document.removeEventListener('visibilitychange', on); go(); };
      document.addEventListener('visibilitychange', on);
    };
    const cio = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const row = e.target; cio.unobserve(row);
      whenVisible(() => whenShown(row, () => run(rows.get(row))));
    }), { threshold: 0.4 });
    rows.forEach((_, row) => cio.observe(row));
  }

  // 8. Шапка прячется при прокрутке вниз и возвращается при прокрутке вверх.
  const header = document.querySelector('.m-header');
  if (header && !reduce) {
    // Саша 23.11: не прятать сразу. Шапка держится, пока не пролистали вниз
    // примерно полтора экрана подряд, и возвращается после ~80 px прокрутки вверх.
    let last = scrollY, down = 0, up = 0;
    addEventListener('scroll', () => {
      const y = scrollY, d = y - last;
      last = y;
      if (y < 120) { down = up = 0; header.classList.remove('is-hidden'); return; }
      if (d > 0) { down += d; up = 0; if (down > innerHeight * 1.5) header.classList.add('is-hidden'); }
      else if (d < 0) { up -= d; down = 0; if (up > 80) header.classList.remove('is-hidden'); }
    }, { passive: true });
  }

  // 10. Отзывы на телефоне: открываются нажатием.
  document.querySelectorAll('.m-review').forEach(card => {
    card.addEventListener('click', () => { if (!matchMedia('(hover: hover)').matches) card.classList.toggle('is-open'); });
  });
})();
