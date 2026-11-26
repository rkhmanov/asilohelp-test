#!/usr/bin/env node
// Проверка тестового сайта перед мержем: node tests/qa.cjs [--shots] [--only=page.html]
//
// Без браузера (по всем *.html в репозитории, кроме source/ и vendor/):
//   • <meta name="robots" content="noindex…"> на каждой странице;
//   • локальные ссылки и картинки ведут на существующие файлы, якоря #id есть на странице (#ключ=значение — фильтры, не якоря);
//   • ссылки на бота несут метку site_<место>[_<цель>] (см. asilo-bot/cloudflare/src/sources.ts);
//   • на неготовые страницы услуг (konsultacii, keys, soprovozhdenie) ссылок нет – вместо них разделы бота _consult/_caseinfo/_soprinfo (Саша, 26.11.2026);
//   • нет цен сопровождения (990/1190/1690/1990 €), кроме скрытой soprovozhdenie.html (Саша, 26.11.2026);
//   • кнопки «Оставить заявку», «Оценить шансы», «Записаться» ведут в бота, а не на форму #apply (Саша, 24.11.2026; архивные и пробные страницы не в счет).
// В браузере (Chromium из Playwright) на ширине 360, 390, 768 и 1440:
//   • нет ошибок JavaScript и битых локальных файлов;
//   • нет горизонтальной прокрутки;
//   • после прокрутки все блоки с data-reveal показались (анимация появления не застряла);
//   • главная: стекло подключилось, «Мы справимся» раскрывается, карточка услуги ведет в раздел бота, якоря не пишут # в адрес, шапка прячется/возвращается, «Заявка» в нижнем меню ведет в бота.
// --shots сохраняет скриншоты во tests/shots/ (папка в .gitignore).
// Сторонние адреса (esm.sh, Turnstile, шрифты) не проверяются: они могут быть недоступны там, где идёт проверка.

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SHOTS = args.includes('--shots');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'source', 'vendor', 'tests']);

// Цели из asilo-bot/cloudflare/src/sources.ts (DEST). Поменяются там — поправить здесь.
const DEST = ['kb', 'chances', 'consult', 'cons', 'questions', 'general', 'case', 'casenew', 'caseconsult', 'interview', 'sopr', 'caseinfo', 'soprinfo', 'home', 'start', 'menu'];
const BOT = /^https:\/\/t\.me\/ASILOhelperBot(\?start=([^"'#&]*))?$/i;

const errors = [];
const warns = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warns.push(`${file}: ${msg}`);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else if (e.name.endsWith('.html')) out.push(path.relative(ROOT, path.join(dir, e.name)));
  }
  return out;
}

const pages = walk(ROOT).filter(p => !ONLY || p === ONLY).sort();
const htmlCache = {};
const read = rel => (htmlCache[rel] ??= fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const idsOf = rel => new Set([...read(rel).matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

// Убираем <script> и <style>: строки в JS (t.me/… в подсказках) — не ссылки.
const markup = html => html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');

function checkTag(file, url) {
  const m = url.match(BOT);
  if (!m) return;
  const tag = m[2] || '';
  if (!tag) return err(file, `ссылка на бота без метки: ${url}`);
  if (!/^site_[a-z0-9_]+$/.test(tag)) return err(file, `метка не по формату site_<место>[_<цель>]: ${tag}`);
  const parts = tag.split('_').slice(1);
  if (tag === 'site_home') warn(file, 'общая метка site_home – по ней не видно, какая кнопка привела человека');
  // Слово цели в середине метки уводит бота не туда: site_case_chances откроет «Кейс», а не «Шансы».
  const goals = parts.filter(p => DEST.includes(p));
  if (goals.length > 1) err(file, `в метке ${tag} несколько слов-целей (${goals.join(', ')}) – бот возьмёт первое`);
}

function checkStatic(file) {
  const html = read(file);
  if (!/<meta\s+name="robots"\s+content="noindex/i.test(html)) err(file, 'нет <meta name="robots" content="noindex, nofollow">');
  if (!/<html[^>]*\slang="/i.test(html)) warn(file, 'у <html> нет lang');
  if (!/<meta\s+name="viewport"/i.test(html)) err(file, 'нет <meta name="viewport"> – на телефоне будет мелко');
  const body = markup(html);
  const dir = path.dirname(file);
  // заявки только через бота (Саша, 24.11.2026); архив и пробы первого экрана не трогаем
  if (!/arhiv|animacii|glavnaya-ruki|hero-sticker/.test(file))
    for (const m of body.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([^<]*)/g))
      if (/(Оставить заявку|Оценить шансы|Записаться)/.test(m[2]) && !BOT.test(m[1])) err(file, `кнопка «${m[2].trim()}» ведет не в бота: ${m[1]}`);
  // цены сопровождения на сайте не публикуем (Саша, 24.11 и 26.11.2026); скрытая страница soprovozhdenie.html пока исключение
  if (!/arhiv|animacii|soprovozhdenie\.html/.test(file))
    for (const m of body.matchAll(/\b(990|1190|1690|1790|1990)(?:&nbsp;|\s)?(?:€|евро)/g)) err(file, `цена сопровождения на странице: ${m[0]}`);
  if (!/arhiv|animacii|glavnaya-ruki|hero-sticker/.test(file))
    for (const m of body.matchAll(/<a\s[^>]*href="(?:\.\.\/)*(konsultacii|keys|soprovozhdenie)\.html[^"]*"/g)) err(file, `ссылка на неготовую страницу ${m[1]}.html – нужен раздел бота`);
  for (const m of body.matchAll(/\s(href|src|srcset)="([^"]*)"/g)) {
    const [, attr, raw] = m;
    const urls = attr === 'srcset' ? raw.split(',').map(s => s.trim().split(/\s+/)[0]) : [raw];
    for (const url of urls) {
      if (!url) { err(file, `пустой ${attr}`); continue; }
      if (/^https?:/i.test(url)) { checkTag(file, url); continue; }
      if (/^(mailto|tel|data|javascript):/i.test(url)) continue;
      if (url.startsWith('//')) continue;
      const [p, hash] = url.split('#');
      const clean = decodeURIComponent(p.split('?')[0]);
      let target = clean ? path.normalize(path.join(dir, clean)) : file;
      if (clean.startsWith('/')) target = clean.slice(1);
      let abs = path.join(ROOT, target);
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) { target = path.join(target, 'index.html'); abs = path.join(ROOT, target); }
      if (!fs.existsSync(abs)) { err(file, `нет файла ${url}`); continue; }
      if (hash && !hash.includes('=') && target.endsWith('.html') && !idsOf(target).has(hash)) err(file, `нет якоря #${hash} в ${target}`);
    }
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) err(file, `повторяются id: ${[...new Set(dup)].join(', ')}`);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };
function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const VIEWPORTS = [
  { name: '360', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: '768', viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { name: '1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

async function checkBrowser() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { warn('браузер', 'нет пакета playwright – проверки в браузере пропущены'); return; }
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  try {
    // Ширины — параллельно, страницы внутри ширины — по 3 сразу: 20+ страниц × 4 ширины иначе идут минуты.
    await Promise.all(VIEWPORTS.map(async vp => {
      const ctx = await browser.newContext(vp);
      // Сторонние адреса не ждём (в CI и песочнице они могут не открываться), кроме шрифтов Google:
      // без Unbounded текст уже и переполнения на телефоне не видно.
      await ctx.route(u => !u.href.startsWith(base) && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u.href), r => r.abort());
      const queue = [...pages];
      await Promise.all([0, 1, 2].map(async () => { for (let file; (file = queue.shift());) {
        const page = await ctx.newPage();
        const where = `${file} @${vp.name}`;
        page.on('pageerror', e => { if (!/esm\.sh|turnstile|Failed to fetch dynamically imported module|Failed to resolve module specifier/i.test(e.message)) err(where, `ошибка JS: ${e.message}`); });
        page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) err(where, `${r.status()} ${r.url().slice(base.length)}`); });
        await page.goto(base + file.split(path.sep).join('/'), { waitUntil: 'load' });
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < h; y += Math.round(vp.viewport.height * 0.6)) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(30); }
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(700);
        const r = await page.evaluate(() => {
          const W = document.documentElement.clientWidth;
          const wide = [];
          if (document.documentElement.scrollWidth > W + 1) {
            for (const el of document.querySelectorAll('body *')) {
              const b = el.getBoundingClientRect();
              if (b.width && (b.right > W + 1) && getComputedStyle(el).position !== 'fixed') {
                let a = el.parentElement, clipped = false;
                while (a && a !== document.body) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) { clipped = a.getBoundingClientRect().right <= W + 1; if (clipped) break; } a = a.parentElement; }
                if (!clipped) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).slice(0, 2).join('.')} до ${Math.round(b.right)}px`);
              }
            }
          }
          const stuck = [...document.querySelectorAll('[data-reveal]:not(.is-shown)')].map(e => e.className || e.tagName);
          return { sw: document.documentElement.scrollWidth, W, wide: wide.slice(0, 5), stuck: stuck.slice(0, 5), stuckN: stuck.length };
        });
        if (process.env.QA_DEBUG) console.log(where, JSON.stringify(r));
        if (r.sw > r.W + 1) err(where, `горизонтальная прокрутка ${r.sw - r.W}px: ${r.wide.join('; ')}`);
        if (r.stuckN) err(where, `${r.stuckN} блок(ов) data-reveal не показались: ${r.stuck.join('; ')}`);
        if (SHOTS) await page.screenshot({ path: path.join(__dirname, 'shots', `${file.replace(/[\\/]/g, '_').replace(/\.html$/, '')}-${vp.name}.png`), fullPage: true });
        await page.close();
      } }));
      await ctx.close();
    }));
    await checkInteractions(browser, base);
  } finally {
    await browser.close();
    srv.close();
  }
}

// Поведение главной: стекло подключилось, карточки услуг на телефоне ведут на страницы услуг, «Мы справимся» – аккордеон,
// шапка прячется при прокрутке вниз и возвращается вверх, пустая форма показывает ошибки и не уходит.
async function checkInteractions(browser, base) {
  if (!pages.includes('index.html')) return;
  const F = 'index.html (поведение)';
  // телефон
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.route(u => !u.href.startsWith(base) && !/^https:\/\/fonts\./.test(u.href), r => r.abort());
    const p = await ctx.newPage();
    await p.goto(base + 'index.html', { waitUntil: 'load' });
    await p.waitForTimeout(800);
    if (!(await p.evaluate(() => document.documentElement.classList.contains('lg') && !!document.querySelector('.hdr.lg-on .lg-glass'))))
      err(F, 'жидкое стекло не подключилось к шапке (glass.js / vendor/react)');
    if (!(await p.locator('.tabbar-lg .lg-tab-bar').count())) err(F, 'нет нижнего меню на телефоне');
    // «Мы справимся»: свернуто, раскрывается нажатием на плитку (Саша 24.11)
    const tile = p.locator('.tiles3 .tile').first();
    await tile.scrollIntoViewIfNeeded();
    if (await tile.evaluate(e => e.classList.contains('is-open'))) err(F, '«Мы справимся» на телефоне не свернуто');
    await tile.tap({ position: { x: 40, y: 20 }, force: true });
    await p.waitForTimeout(300);
    if (!(await tile.evaluate(e => e.classList.contains('is-open')))) err(F, 'плитка «Мы справимся» не раскрывается нажатием');
    // ссылки-якоря не пишут #… в адрес (иначе перезагрузка кидает вниз)
    await p.evaluate(() => document.querySelector('a[href="#reviews"]').click());
    await p.waitForTimeout(200);
    if (p.url().includes('#')) err(F, 'якорная ссылка оставила #… в адресе');
    // лента отзывов на телефоне: нажатие переворачивает саму карточку (фото ↔ отзыв этого человека, Саша 24.11)
    {
      await p.evaluate(() => document.getElementById('reviews').scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(600);
      const pt = await p.evaluate(() => { const c = [...document.querySelectorAll('#reel .rflip')].find(c => { const r = c.getBoundingClientRect(); const m = r.left + r.width / 2; return m > 20 && m < innerWidth - 20; }); if (!c) return null; c.setAttribute('data-qa-flip', 'm'); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (!pt) err(F, 'в ленте отзывов на телефоне нет карточек, которые переворачиваются');
      else {
        await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(600);
        if (!(await p.evaluate(() => document.querySelector('[data-qa-flip="m"]').classList.contains('is-flipped')))) err(F, 'карточка отзыва на телефоне не переворачивается нажатием');
      }
    }
    // карточка услуги на телефоне открывает раздел бота в новой вкладке и не раскрывается (Саша 24.11, 26.11)
    const card = p.locator('.flip').first();
    await card.scrollIntoViewIfNeeded();
    await p.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
    await card.tap({ position: { x: 40, y: 40 }, force: true });
    await p.waitForTimeout(300);
    const opened = await p.evaluate(() => window.__opened);
    if (!opened.some(u => /start=site_help_consult$/.test(u))) err(F, `карточка услуги на телефоне не открывает раздел бота (открыто: ${opened.join(', ') || 'ничего'})`);
    const tabHref = await p.evaluate(() => [...document.querySelectorAll('.tabbar-lg a')].map(a => a.getAttribute('href')).find(h => /t\.me/.test(h || '')) || '');
    if (!/start=site_tabbar_chances/.test(tabHref)) err(F, '«Заявка» в нижнем меню не ведет в бота');
    await ctx.close();
  }
  // компьютер
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(u => !u.href.startsWith(base) && !/^https:\/\/fonts\./.test(u.href), r => r.abort());
    const p = await ctx.newPage();
    await p.goto(base + 'index.html', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    const dd = await p.evaluate(() => [...document.querySelectorAll('.nav-dd__card a')].map(a => a.getAttribute('href')));
    for (const g of ['site_uslugi_consult', 'site_uslugi_caseinfo', 'site_uslugi_soprinfo']) if (!dd.some(h => h.endsWith('start=' + g))) err(F, `в меню «Услуги» нет ссылки на бота ${g}`);
    const hdr = () => p.evaluate(() => { const h = document.querySelector('.m-header'); return h.classList.contains('is-hidden') && !h.classList.contains('m-header--stay'); });
    await p.mouse.wheel(0, 1500); await p.waitForTimeout(400);
    const hiddenDown = await hdr();
    await p.mouse.wheel(0, -400); await p.waitForTimeout(400);
    const hiddenUp = await hdr();
    if (hiddenUp) err(F, 'шапка не возвращается при прокрутке вверх');
    if (!hiddenDown && !(await p.evaluate(() => document.querySelector('.m-header').classList.contains('m-header--stay')))) warn(F, 'шапка не прячется при прокрутке вниз');
    // формы на главной нет (Саша, 24.11.2026): в «¿Empezamos?» только кнопка бота
    if (await p.locator('#apply form').count()) err(F, 'на главной снова форма заявки – должна быть только кнопка бота');
    if (!(await p.locator('#apply a[href*="t.me/ASILOhelperBot?start=site_"]').count())) err(F, 'в «¿Empezamos?» нет кнопки бота');
    // лента отзывов на компьютере – отдельная (otzyvy-lenta-pk.js, Саша 24.11): едет всегда, щелчок и нажатие
    // с отпусканием за лентой ее не останавливают, стрелки листают
    await p.evaluate(() => document.getElementById('reviews').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(800);
    const reelX = () => p.evaluate(() => { const t = document.querySelector('#reel .reel__track'); return t ? new DOMMatrix(getComputedStyle(t).transform).m41 : 0; });
    if (!(await p.locator('#reel.reel--pk').count())) err(F, 'на компьютере не включилась компьютерная лента отзывов');
    // щелчок переворачивает саму карточку (фото ↔ отзыв этого человека), лента едет дальше
    for (let i = 0; i < 3; i++) {
      const pt = await p.evaluate((i) => { const cs = [...document.querySelectorAll('#reel .rflip')].filter(c => { const r = c.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth; }); const c = cs[i % cs.length]; if (!c) return null; c.setAttribute('data-qa-flip', i); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i);
      if (!pt) { err(F, 'на компьютере у отзывов нет карточек, которые переворачиваются'); break; }
      const x0 = await reelX();
      await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(600);
      if (!(await p.evaluate((i) => document.querySelector('[data-qa-flip="' + i + '"]').classList.contains('is-flipped'), i))) err(F, 'на компьютере щелчок не переворачивает карточку отзыва');
      if (Math.abs((await reelX()) - x0) < 5) err(F, 'лента отзывов на компьютере встала после щелчка по карточке');
    }
    {
      const r = await p.evaluate(() => { const b = document.getElementById('reel').getBoundingClientRect(); return { x: b.left + 400, y: b.top + 150 }; });
      let x0 = await reelX();
      await p.mouse.move(r.x, r.y); await p.mouse.click(r.x, r.y); await p.waitForTimeout(700);
      if (Math.abs((await reelX()) - x0) < 5) err(F, 'лента отзывов на компьютере стоит после щелчка');
      x0 = await reelX();
      await p.mouse.down(); await p.mouse.move(r.x, r.y - 300, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(700);
      if (Math.abs((await reelX()) - x0) < 5) err(F, 'лента отзывов на компьютере замерла, когда кнопку мыши отпустили за ней');
      x0 = await reelX();
      await p.locator('.reel-nav button').nth(1).click(); await p.waitForTimeout(800);
      if (Math.abs((await reelX()) - x0) < 200) err(F, 'стрелка «вперед» не листает ленту отзывов на компьютере');
    }
    await ctx.close();
  }
}

(async () => {
  if (!pages.length) { console.error('Нет страниц для проверки'); process.exit(1); }
  pages.forEach(checkStatic);
  await checkBrowser();
  console.log(`Страниц: ${pages.length} (${pages.join(', ')})`);
  if (warns.length) console.log(`\nПредупреждения (${new Set(warns).size}):\n  ` + [...new Set(warns)].sort().join('\n  '));
  if (errors.length) { console.log(`\nОшибки (${new Set(errors).size}):\n  ` + [...new Set(errors)].sort().join('\n  ')); process.exit(1); }
  console.log('\n✅ Всё в порядке');
})().catch(e => { console.error(e); process.exit(1); });
