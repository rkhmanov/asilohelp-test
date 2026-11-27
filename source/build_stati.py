#!/usr/bin/env python3
"""Собирает раздел «Статьи и база знаний» тестового сайта.

Из source/stati/<slug>.md (формат — source/stati/FORMAT.md) делает:
  - stati/<slug>.html — страницы статей;
  - stati.html — список статей с рубриками;
  - o-nas.html — «О нас» (тело страницы в source/o-nas.body.html), чтобы шапка и подвал были одинаковые.

Запуск из корня репозитория:  python3 source/build_stati.py
Нужен пакет markdown:  pip install markdown
"""
import html, json, pathlib, re, sys

sys.dont_write_bytecode = True
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tipograf import typo  # noqa: E402  висячие предлоги
from podval import podval  # noqa: E402  общий подвал
import bloki  # noqa: E402  общий блок заявки «¿Empezamos?»

try:
    import markdown
except ImportError:
    sys.exit("Нужен пакет markdown: pip install markdown")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "source" / "stati"
OUT = ROOT / "stati"
V = "1"  # версия pages.css в ссылке — поднимать после правки стилей
BOT = "https://t.me/ASILOhelperBot?start="
CATS = ["Основы", "Подача", "Кейс", "Интервью", "До отъезда", "Документы", "Жизнь в Испании"]
TODAY = "23.11.2026"
MUST = ["podacha-v-aeroportu", "dokazatelstva", "intervyu"]  # «Стоит прочитать» на stati.html

# ── общие куски ──────────────────────────────────────────────────────────────

def head(title, desc, pre, page):
    return f"""<!doctype html>
<html lang="ru" data-theme="light" data-home="{pre}" data-page="{page}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{html.escape(title)} — asilohelp (тестовая версия)</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="icon" href="{pre}img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{pre}img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{pre}img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat&family=Unbounded:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{pre}motion.css?v=18">
<link rel="stylesheet" href="{pre}site.css?v=49">
<link rel="stylesheet" href="{pre}pages.css?v={V}">
<link rel="stylesheet" href="{pre}bloki.css?v=10">
<script type="importmap">{{"imports":{{"react":"./{pre}vendor/react/react.mjs","react/jsx-runtime":"./{pre}vendor/react/react.mjs","react-dom/client":"./{pre}vendor/react/react.mjs","glisse":"./{pre}vendor/glisse/index.js"}}}}</script>
<script type="module" src="{pre}glass.js?v=15"></script>
<script>(function(){{var r=document.documentElement;function z(){{var w=window.innerWidth;r.style.setProperty('--z',w<=480?w/390:(w>=1100&&w!==1440)?Math.min(w/1440,1.2):1);}}z();addEventListener('resize',z);}})();document.documentElement.classList.add('m-js');</script>
</head>
<body>

<header class="m-header m-header--stay">
  <div class="hdr">
    <a class="hdr__logo" href="{pre}index.html" aria-label="asilohelp — на главную"><img src="{pre}img/logo.svg" alt="asilohelp" width="197" height="32"></a>
    <nav aria-label="Меню">
      <a href="{pre}index.html#help">Услуги</a>
      <a href="{pre}stati.html"{' aria-current="page"' if page == 'news' else ''}>Статьи</a>
      <!-- «О нас» временно скрыто (Саша, 27.11.2026): вернуть ссылку на {pre}o-nas.html -->
      <a href="{pre}voprosy.html">Вопросы</a>
    </nav>
    <div class="hdr__cta">
      <a class="hdr__bot m-btn" href="{BOT}site_header" target="_blank" rel="noopener">Telegram-бот</a>
      <a class="hdr__main m-btn m-btn--accent" href="https://t.me/ASILOhelperBot?start=site_statya_header_start" target="_blank" rel="noopener">Оценить шансы</a>
    </div>
  </div>
</header>
"""


def foot(pre, extra_js=""):
    return "\n" + podval(pre, "site_statya_footer_start") + f"""


<script src="{pre}motion.js?v=5"></script>
{extra_js}
</body>
</html>
"""


def cta(pre, place):
    return f"""<section class="cta" data-reveal>
      <div>
        <h2>Хотите пройти этот путь<br class="br-d"> с командой?</h2>
        <p>Оценка шансов — бесплатно. Расскажите о ситуации, и мы честно скажем, подходит ли вам защита и с чего начать.</p>
        <div class="btns">
          <a class="btn btn--dark m-btn" href="https://t.me/ASILOhelperBot?start=site_statya_cta_start" target="_blank" rel="noopener">Оставить заявку <span class="dot-arr" aria-hidden="true">↗</span></a>
          <a class="btn btn--glass m-btn" href="{BOT}site_{place}_start" target="_blank" rel="noopener">Оценить шансы в боте</a>
        </div>
      </div>
      <div class="cta__hola" aria-hidden="true">¿Hablamos?<span>¡Sí, vamos!</span></div>
    </section>"""


# ── статьи ───────────────────────────────────────────────────────────────────

def parse(path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    if not m:
        sys.exit(f"{path.name}: нет frontmatter")
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith(" "):
            k, v = line.split(":", 1)
            meta[k.strip()] = re.sub(r"\s+#.*$", "", v.strip())
    meta["slug"] = path.stem
    meta["body"] = m.group(2)
    meta["order"] = int(meta.get("order") or 99)
    for k in ("title", "cat", "img", "lead"):
        if not meta.get(k):
            sys.exit(f"{path.name}: нет поля {k}")
    if meta["cat"] not in CATS:
        sys.exit(f"{path.name}: рубрика «{meta['cat']}» не из списка {CATS}")
    meta.setdefault("short", meta["title"])
    # pos: точка кадрирования обложки (CSS object-position), по умолчанию центр
    meta["pos_attr"] = f' style="object-position:{html.escape(meta["pos"])}"' if meta.get("pos") else ""
    words = len(re.findall(r"\w+", meta["body"]))
    meta["min"] = max(2, round(words / 180))
    return meta


def slugify_h(text, used):
    tr = dict(zip("абвгдежзийклмнопрстуфхцчшщъыьэюя", ["a","b","v","g","d","e","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","h","ts","ch","sh","sch","","y","","e","yu","ya"]))
    s = "".join(tr.get(c, c) for c in text.lower())
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:48] or "razdel"
    base, i = s, 2
    while s in used:
        s, i = f"{base}-{i}", i + 1
    used.add(s)
    return s


def render_body(a, pre):
    body = a["body"]
    kb = (f'<a class="kbstrip" href="{BOT}site_articles_kb" target="_blank" rel="noopener">'
          f'<div><b>Полная версия — в базе знаний</b><span>Бесплатно: гайды, чек-листы и ссылки по всем этапам</span></div><em>Открыть в боте ↗</em></a>')
    # FAQ
    faq_html = ""
    fm = re.search(r"^## Вопросы по теме\s*\n(.*)$", body, re.S | re.M)
    if fm:
        body = body[: fm.start()]
        items = re.split(r"^\?\?\s*", fm.group(1), flags=re.M)
        qs = []
        for it in items:
            it = it.strip()
            if not it:
                continue
            q, _, ans = it.partition("\n")
            qs.append((q.strip(), markdown.markdown(ans.strip())))
        a["faq"] = qs
        faq_html = '<h2 id="voprosy">Вопросы по теме</h2>\n<div class="faqs">' + "".join(
            f"<details><summary>{html.escape(q)}</summary><div>{ans}</div></details>" for q, ans in qs) + "</div>"
    # блоки
    shorts = []
    def short(m):
        shorts.append('<div class="short"><b>Коротко</b>' + markdown.markdown(m.group(1).strip()) + "</div>")
        return f"\n\nSHORTBLOCK{len(shorts) - 1}\n\n"
    body = re.sub(r"^:::short\s*\n(.*?)\n:::\s*$", short, body, flags=re.S | re.M)
    body = re.sub(r"^:::kb\s*\n(?:.*?\n)?:::\s*$", "\n\nKBBLOCK\n\n", body, flags=re.S | re.M)
    out = markdown.markdown(body, extensions=["tables", "sane_lists"])
    for i, s in enumerate(shorts):
        out = out.replace(f"<p>SHORTBLOCK{i}</p>", s)
    out = out.replace("<p>KBBLOCK</p>", kb)
    # якоря у h2 и оглавление
    used, toc = set(), []
    def h2(m):
        t = re.sub("<[^>]+>", "", m.group(1))
        sid = slugify_h(t, used)
        toc.append((sid, t))
        return f'<h2 id="{sid}">{m.group(1)}</h2>'
    out = re.sub(r"<h2>(.*?)</h2>", h2, out)
    if faq_html:
        toc.append(("voprosy", "Вопросы по теме"))
    # внешние ссылки — в новой вкладке
    out = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', out)
    return out + faq_html, toc


def card(a, pre, wide=False):
    cls = "card m-card" + (" card--wide" if wide else "")
    return (f'<a class="{cls}" href="{pre}stati/{a["slug"]}.html" data-cat="{html.escape(a["cat"])}" data-reveal>'
            f'<div class="card__img"><img src="{pre}img/{a["img"]}" alt="" loading="lazy"{a["pos_attr"]}><span class="chip">{html.escape(a["cat"])}</span></div>'
            f'<div class="card__body"><h3>{html.escape(a["short"] if not wide else a["title"])}</h3>'
            f'<p>{html.escape(a["lead"])}</p><small>{a["min"]} мин чтения</small></div></a>')


def sources_html(a):
    src = a.get("source", "")
    parts = []
    for s in [x.strip() for x in src.split(";") if x.strip()]:
        name, _, url = s.partition("|")
        name, url = name.strip(), url.strip()
        parts.append(f'<a href="{html.escape(url)}" target="_blank" rel="noopener">«{html.escape(name)}»</a>' if url.startswith("http") else f"«{html.escape(name)}»")
    by = ", ".join(parts) if parts else "базы знаний asilohelp"
    return (f'<p class="src">По материалам статей базы знаний {by}. Текст — общая информация, а не юридическая консультация: '
            f'правила и сроки меняются, а решение по вашей истории зависит от деталей. Нашли неточность — напишите нам в '
            f'<a href="{BOT}site_articles_kb" target="_blank" rel="noopener">бот</a>.</p>')


ART_JS = """<script>
  // полоска прочтения и подсветка оглавления
  (() => {
    const bar = document.querySelector('.progress'), paper = document.querySelector('.paper');
    const links = [...document.querySelectorAll('.toc a[href^="#"]:not(.up)')];
    const heads = links.map(l => document.getElementById(l.getAttribute('href').slice(1))).filter(Boolean);
    const on = () => {
      const r = paper.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      bar.style.transform = `scaleX(${p})`;
      let cur = heads[0];
      heads.forEach(h => { if (h.getBoundingClientRect().top < 140) cur = h; });
      links.forEach(l => l.classList.toggle('on', cur && l.getAttribute('href') === '#' + cur.id));
    };
    addEventListener('scroll', on, { passive: true }); on();
    // поделиться / скопировать ссылку
    const msg = (b, t) => { const o = b.textContent; b.textContent = t; setTimeout(() => b.textContent = o, 1800); };
    document.querySelector('[data-copy]')?.addEventListener('click', e => navigator.clipboard?.writeText(location.href).then(() => msg(e.target, 'Ссылка скопирована')));
    const sh = document.querySelector('[data-share]');
    if (sh) { if (navigator.share) sh.addEventListener('click', () => navigator.share({ title: document.title, url: location.href }).catch(() => {})); else sh.remove(); }
  })();
</script>"""


def article_page(a, arts):
    pre = "../"
    body, toc = render_body(a, pre)
    place = "art" + a["slug"].replace("-", "")[:40]
    same = [x for x in arts if x is not a and x["cat"] == a["cat"]]
    rest = [x for x in arts if x is not a and x not in same]
    nxt = (same + sorted(rest, key=lambda x: abs(x["order"] - a["order"])))[:3]
    toc_html = "".join(f'<a href="#{i}">{html.escape(t)}</a>' for i, t in toc)
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"], "inLanguage": "ru",
          "author": {"@type": "Organization", "name": "asilohelp"}, "dateModified": "2026-11-23"}
    if a.get("faq"):
        ld_faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", ans)}} for q, ans in a["faq"]]}
    else:
        ld_faq = None
    jsonld = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>' + (
        f'\n<script type="application/ld+json">{json.dumps(ld_faq, ensure_ascii=False)}</script>' if ld_faq else "")
    return head(a["title"], a["lead"], pre, "news") + f"""
<div class="progress" aria-hidden="true"></div>
<main id="top" class="art-pg">
  <div class="wrap">
    <nav class="crumb" aria-label="Навигация"><a href="{pre}index.html">Главная</a> / <a href="{pre}stati.html">Статьи</a> / <a href="{pre}stati.html#cat={html.escape(a['cat'])}">{html.escape(a['cat'])}</a></nav>
    <div class="art-layout">
      <article class="paper">
        <header class="paper__head">
          <span class="tag">{html.escape(a['cat'])}</span>
          <h1>{html.escape(a['title'])}</h1>
          <div class="meta"><span>{a['min']} мин чтения</span><span>Обновлено: {TODAY}</span></div>
          <p class="paper__lead">{html.escape(a['lead'])}</p>
          <div class="share"><button type="button" data-share>Поделиться</button><button type="button" data-copy>Скопировать ссылку</button><a href="https://t.me/share/url?url=https%3A%2F%2Fasilohelp.com%2Fstati%2F{a['slug']}" target="_blank" rel="noopener">Отправить в Telegram</a></div>
        </header>
        <div class="paper__img"><img src="{pre}img/{a['img']}" alt=""{a['pos_attr']}></div>
        <div class="prose">
{body}
        </div>
        {sources_html(a)}
      </article>
      <aside class="aside">
        <nav class="toc" aria-label="На этой странице"><small>На этой странице</small>{toc_html}<a class="up" href="#top">↑ К началу</a></nav>
        <div class="hola"><b>¡Hola!</b><p>Хотите пройти путь с командой?</p><span>Оценка шансов — бесплатно, ответим в течение суток.</span><a href="{BOT}site_{place}_start" target="_blank" rel="noopener">Оценить шансы ↗</a></div>
      </aside>
    </div>

    <section class="next">
      <h2 class="sec-title">Продолжим читать?</h2>
      <div class="grid" data-reveal-group="0.08">{''.join(card(x, pre) for x in nxt)}</div>
    </section>

  </div>
{bloki.blok('zayavka', bloki.zayavka('stati/' + a['slug'] + '.html'))}

</main>
{jsonld}
""" + foot(pre, ART_JS)


# ── список статей ───────────────────────────────────────────────────────────

KB_TOPICS = [
    ("До отъезда", "паспорт, виза, документы, деньги, дела в России"),
    ("Кейс", "как написать историю и что в ней важно"),
    ("Доказательства", "что собрать, как перевести и заверить"),
    ("Подача", "в аэропорту и в Испании, первый визит в полицию"),
    ("Интервью", "как проходит и как подготовиться"),
    ("Что дальше", "красная карта, NIE, TIE, работа, программа приема"),
]

LIST_JS = """<script>
  // рубрики: фильтр карточек, рубрика в адресе (#cat=Кейс)
  (() => {
    const btns = [...document.querySelectorAll('.filters button')], cards = [...document.querySelectorAll('#all .card')];
    const set = cat => {
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
      cards.forEach(c => c.hidden = cat !== 'all' && c.dataset.cat !== cat);
    };
    btns.forEach(b => b.addEventListener('click', () => { set(b.dataset.cat); history.replaceState(null, '', b.dataset.cat === 'all' ? location.pathname : '#cat=' + b.dataset.cat); }));
    const m = decodeURIComponent(location.hash).match(/^#cat=(.+)$/);
    if (m && btns.some(b => b.dataset.cat === m[1])) { set(m[1]); document.getElementById('fresh').scrollIntoView(); }
  })();
</script>"""


def list_page(arts):
    pre = ""
    lead, rest = arts[0], arts
    by = {a["slug"]: a for a in arts}
    must = [by[s] for s in MUST if s in by] or arts[1:4]
    cats = [c for c in CATS if any(a["cat"] == c for a in arts)]
    kb_list = "".join(
        f'<a href="{BOT}site_articles_kb" target="_blank" rel="noopener"><i>{i:02d}</i><b>{t}</b><span>{d}</span><em>↗</em></a>'
        for i, (t, d) in enumerate(KB_TOPICS, 1))
    must_html = "".join(
        f'<a href="stati/{a["slug"]}.html"><span class="n"><b>{i:02d}</b>{html.escape(a["cat"])}</span><strong>{html.escape(a["short"])}</strong><span>{a["min"]} мин чтения</span></a>'
        for i, a in enumerate(must, 1))
    grid = "".join(card(a, pre, wide=(i == 0)) for i, a in enumerate(rest[1:]))
    filters = '<button type="button" data-cat="all" aria-pressed="true">Все</button>' + "".join(
        f'<button type="button" data-cat="{html.escape(c)}" aria-pressed="false">{html.escape(c)}</button>' for c in cats)
    return head("Статьи и база знаний", "Гайды о международной защите в Испании для ЛГБТ-людей: кейс, доказательства, подача, интервью, документы и жизнь после.", pre, "news") + f"""
<main id="top" class="pg">
  <div class="wrap">
    <div class="pg-head" data-reveal>
      <h1>Статьи и база знаний<span>о защите в Испании</span></h1>
      <p>Чтобы понимать процедуру и чувствовать себя увереннее. Пишем по своему опыту и опыту людей, которые прошли этот путь с нами.</p>
    </div>

    <section class="kbx" id="kb" data-reveal>
      <div>
        <span class="pill">Бесплатно · в Telegram-боте</span>
        <h2>Полная база знаний<br>о защите в <span class="mark">Испании</span></h2>
        <p>Пошаговые гайды и чек-листы: от загранпаспорта и визы до интервью, красной карты и жизни после. Бот пришлет ссылку на базу сразу после подписки на канал.</p>
        <div class="kbx__btns">
          <a class="btn btn--white m-btn" href="{BOT}site_articles_kb" target="_blank" rel="noopener">Получить базу знаний <img class="m-arrow" src="img/arrow-dark.svg" alt="" width="44" height="44"></a>
          <a class="ghost" href="#fresh">или читайте статьи ниже ↓</a>
        </div>
      </div>
      <div class="kbx__list"><small>Что внутри</small>{kb_list}</div>
    </section>

    <div class="top">
      <a class="feat m-card" href="stati/{lead['slug']}.html" data-reveal>
        <div class="feat__text">
          <span class="tag">Главный гайд · {html.escape(lead['cat'])}</span>
          <h2>{html.escape(lead['title'])}</h2>
          <p>{html.escape(lead['lead'])}</p>
          <span class="feat__go">Читать гайд <i aria-hidden="true">↗</i></span>
          <span class="feat__meta">{lead['min']} мин · обновлено {TODAY} · автор: команда asilohelp</span>
        </div>
        <div class="feat__img"><img src="img/{lead['img']}" alt=""{lead['pos_attr']}></div>
      </a>
      <div class="must" data-reveal><small>Стоит прочитать</small>{must_html}</div>
    </div>

    <section class="fresh" id="fresh">
      <div class="fresh__bar">
        <h2 class="sec-title">Все статьи</h2>
        <div class="filters" role="group" aria-label="Рубрики">{filters}</div>
      </div>
      <div class="grid" id="all" data-reveal-group="0.06">{grid}</div>
    </section>

  </div>
{bloki.blok('zayavka', bloki.zayavka('stati.html'))}

</main>
""" + foot(pre, LIST_JS)


# ── О нас ───────────────────────────────────────────────────────────────────

def about_page():
    body = (ROOT / "source" / "o-nas.body.html").read_text(encoding="utf-8")
    body = body.replace("{{CTA}}", cta("", "about"))
    return head("О нас", "Команда ЛГБТ-людей и союзников: многие из нас сами получили международную защиту в Испании.", "", "us") + body + foot("")


def main():
    arts = sorted((parse(p) for p in SRC.glob("*.md") if p.name != "FORMAT.md"), key=lambda a: (a["order"], a["slug"]))
    if not arts:
        sys.exit("нет статей в source/stati")
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.html"):
        old.unlink()
    for a in arts:
        (OUT / f"{a['slug']}.html").write_text(typo(article_page(a, arts)), encoding="utf-8")
    (ROOT / "stati.html").write_text(typo(list_page(arts).replace("start=site_statya_", "start=site_stati_")), encoding="utf-8")  # метка кнопок: site_stati_…
    if (ROOT / "source" / "o-nas.body.html").exists():
        (ROOT / "o-nas.html").write_text(typo(about_page().replace("start=site_statya_", "start=site_onas_")), encoding="utf-8")  # метка кнопок: site_onas_…
    print(f"статей: {len(arts)} → stati/, stati.html" + (", o-nas.html" if (ROOT / 'o-nas.html').exists() else ""))


if __name__ == "__main__":
    main()
