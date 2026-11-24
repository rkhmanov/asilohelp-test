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
  }

  // 14. Счетчик цифр: <b data-count="187">187</b>, по желанию data-suffix="+".
  // Считает, когда сама цифра видна на экране (а не когда показался весь блок), – 24.11.
  const counters = document.querySelectorAll('[data-count]');
  if (!reduce && counters.length && 'IntersectionObserver' in window) {
    const fmt = (el, n) => { el.textContent = (n >= 10000 ? n.toLocaleString('ru-RU') : String(n)) + (el.dataset.suffix || ''); };
    const cio = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; cio.unobserve(el);
      const to = parseInt(el.dataset.count, 10), t0 = performance.now(), dur = to > 50 ? 1400 : 1000;
      const tick = t => {
        const p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
        fmt(el, Math.round(to * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.6 });
    counters.forEach(el => { if (parseInt(el.dataset.count, 10) > 0) { fmt(el, 0); cio.observe(el); } });
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
