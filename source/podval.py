#!/usr/bin/env python3
"""Подвал сайта – один на все страницы (Саша, 27.11.2026, Figma: компонент «Подвал сайта · единый» 5088:3507).

В Figma у компонента два варианта, и они отличаются не только расстановкой, но и составом:
  • компьютер (5088:3416) – «Сайт» / «Мы в соц. сетях» / «Доп. информация» (Частые вопросы и Отзывы – там), без «О нас»;
  • телефон (5088:3460) – «Сайт» (8 ссылок, «Статьи», «О нас») / «Мы в сети» / «Документы», ссылки в две колонки.
Поэтому в HTML обе раскладки: колонки .foot__col--d видны шире 600 px, .foot__col--m – до 600 px (site.css, «Подвал»).

Правка подвала – только здесь, потом
    python3 source/podval.py          – перепишет <footer class="foot"> во всех страницах;
    python3 source/podval.py --check  – только проверит, что страницы совпадают с этим файлом (так делает CI).
Статьи, stati.html и o-nas.html собирает source/build_stati.py – он берет подвал отсюда же.
"""
import pathlib, re, sys

sys.dont_write_bytecode = True
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tipograf import typo  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
BOT = 'https://t.me/ASILOhelperBot?start='

# Страница → метка кнопки «Оставить заявку» в подвале (цель start, см. README «Метки»).
# Архивы (glavnaya-arhiv-23-11.html) и проба первого экрана glavnaya-ruki.html не трогаем.
STRANICY = {
    'index.html': 'site_footer_start',
    'voprosy.html': 'site_faq_footer_start',
    'otzyvy.html': 'site_reviews_footer_start',
    'stati.html': 'site_stati_footer_start',
    'o-nas.html': 'site_onas_footer_start',
    '404.html': 'site_404_footer_start',
    'keys.html': 'site_keys_footer_start',
    'konsultacii.html': 'site_konsult_footer_start',
    'soprovozhdenie.html': 'site_soprpage_footer_start',
    'legal.html': 'site_legal_footer_start',
    'privacy.html': 'site_privacy_footer_start',
    'cookies.html': 'site_cookies_footer_start',
}
STATYA_TAG = 'site_statya_footer_start'  # все stati/*.html
DOKUMENTY = {'legal.html', 'privacy.html', 'cookies.html'}  # на них своя ссылка в подвале подсвечена (docs.css)

FOOTER_RE = re.compile(r'<footer class="foot">.*?</footer>', re.S)


def links(pre, tag):
    """Все ссылки подвала: ключ → (текст, адрес, внешняя ли)."""
    return {
        'consult': ('Консультации', BOT + 'site_footer_consult', True),
        'case': ('Работа с кейсом', BOT + 'site_footer_caseinfo', True),
        'sopr': ('Сопровождение', BOT + 'site_footer_soprinfo', True),
        'stati': ('Статьи и база знаний', pre + 'stati.html', False),
        'stati_m': ('Статьи', pre + 'stati.html', False),
        'onas': ('О нас', pre + 'o-nas.html', False),
        'otzyvy': ('Отзывы', pre + 'otzyvy.html', False),
        'faq': ('Частые вопросы', pre + 'voprosy.html', False),
        'zayavka': ('Оставить заявку', BOT + tag, True),
        'tg': ('Telegram-канал', 'https://t.me/spainLGBTQ', True),
        'ig': ('Instagram', 'https://www.instagram.com/rkhmanov/', True),
        'yt': ('YouTube', 'https://www.youtube.com/@rkhmanov/', True),
        'legal': ('Правовая информация', pre + 'legal.html', False),
        'privacy': ('Политика конфиденциальности', pre + 'privacy.html', False),
        'cookies': ('Политика cookie', pre + 'cookies.html', False),
    }


# (заголовок, ссылки) – порядок как в Figma
KOMPYUTER = [
    ('Сайт', ['consult', 'case', 'sopr', 'stati', 'zayavka']),
    ('Мы в соц. сетях', ['tg', 'ig', 'yt']),
    ('Доп. информация', ['legal', 'privacy', 'cookies', 'faq', 'otzyvy']),
]
TELEFON = [
    ('Сайт', ['consult', 'case', 'sopr', 'stati_m', 'onas', 'otzyvy', 'faq', 'zayavka']),
    ('Мы в сети', ['tg', 'ig', 'yt']),
    ('Документы', ['legal', 'privacy', 'cookies']),
]


def podval(pre='', tag='site_footer_start', current=''):
    """HTML подвала. pre – '../' для страниц в stati/, current – файл страницы (ссылка на нее помечается aria-current)."""
    L = links(pre, tag)

    def a(key):
        text, href, ext = L[key]
        attrs = ' target="_blank" rel="noopener"' if ext else ''
        if current and not ext and href == pre + current:
            attrs += ' aria-current="page"'
        return f'<a href="{href}"{attrs}>{text}</a>'

    def cols(spec, kind):
        return '\n'.join(f'      <div class="foot__col foot__col--{kind}"><b>{title}</b>{"".join(a(k) for k in keys)}</div>'
                         for title, keys in spec)

    html = f'''<footer class="foot">
  <div class="foot__card">
    <div class="foot__top">
      <div class="foot__about"><img src="{pre}img/logo-footer.svg" alt="asilohelp" width="234" height="38">
        <p>Помогаем ЛГБТ-людям из России и постсоветских стран переехать в Испанию и запросить международную защиту.</p>
        <p>Мы не адвокатское бюро. Материалы сайта – информация, а не юридическая консультация.</p></div>
{cols(KOMPYUTER, 'd')}
{cols(TELEFON, 'm')}
    </div>
    <div class="foot__bottom">© 2026 asilohelp.com</div>
  </div>
</footer>'''
    return typo(html)


def targets():
    for name, tag in STRANICY.items():
        yield ROOT / name, '', tag, name if name in DOKUMENTY else ''
    for p in sorted((ROOT / 'stati').glob('*.html')):
        yield p, '../', STATYA_TAG, ''


def main():
    check = '--check' in sys.argv
    bad = []
    for path, pre, tag, current in targets():
        if not path.exists():
            continue
        s = path.read_text(encoding='utf-8')
        if len(FOOTER_RE.findall(s)) != 1:
            sys.exit(f'{path.relative_to(ROOT)}: нет подвала <footer class="foot"> или их несколько')
        new = FOOTER_RE.sub(lambda m: podval(pre, tag, current), s)
        if new != s:
            bad.append(str(path.relative_to(ROOT)))
            if not check:
                path.write_text(new, encoding='utf-8')
    if check and bad:
        sys.exit('подвал не совпадает с source/podval.py: ' + ', '.join(bad) + ' – запустите python3 source/podval.py')
    print(f'подвал обновлен: {len(bad)} стр.' if bad else 'подвал везде как в source/podval.py')


if __name__ == '__main__':
    main()
