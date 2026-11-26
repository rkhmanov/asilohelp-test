#!/usr/bin/env python3
"""Новые отзывы из канала «отзывы» → source/reviews-auto.json → otzyvy.html (Саша, 26.11.2026).

Бот @ASILOhelperBot — админ закрытого канала «отзывы» и записывает каждый пересланный туда отзыв (asilo-bot,
src/sitereviews.ts). Отсюда их забираем: GET https://crm.asilohelp.com/site/reviews.

Тексты — как прислали, без правки опечаток. Имя — настоящее из CRM или из Telegram по-русски (ник → «Клиент»).
Ссылки t.me из текста вырезаем (на канал отзывов с сайта не ведем). Услуги (s) угадываем по словам в тексте;
поправить можно руками в reviews-auto.json — при следующем заборе правка сохранится (по id).
Если отзыв уже есть в старом списке R (source/reviews.py) — второй раз не добавляем.

Запуск: python3 source/reviews_sync.py [--file feed.json]  — потом сам пересобирает otzyvy.html и общие блоки.
Раз в две недели запускает GitHub Action «Новые отзывы» (.github/workflows/otzyvy.yml).
"""
import json, os, pathlib, re, subprocess, sys, urllib.request

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import reviews  # noqa: E402

URL = os.environ.get('REVIEWS_URL', 'https://crm.asilohelp.com/site/reviews')


def fetch():
    if '--file' in sys.argv:
        return json.loads(pathlib.Path(sys.argv[sys.argv.index('--file') + 1]).read_text(encoding='utf-8'))
    req = urllib.request.Request(URL, headers={'user-agent': 'asilohelp-site-reviews'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def services(text):
    """Буквы услуг по словам в тексте; первая — главная (подпись на карточке)."""
    t = text.lower()
    has = {
        's': 'сопровожд' in t,
        'v': re.search(r'\bвиз[аеуыо]', t) is not None,
        'l': 'юрист' in t,
        'k': re.search(r'\bкейс', t) is not None,
        'c': 'консультац' in t or 'созвон' in t,
    }
    order = [k for k in 'svlkc' if has[k]]
    if has['k'] and has['c'] and not (has['s'] or has['v'] or has['l']):
        order = ['c', 'k']  # консультация с разбором кейса
    return ''.join(order) or 'c'


def clean(text):
    text = re.sub(r'(https?://)?(t\.me|telegram\.me)/\S+', '', text)
    return re.sub(r'[ \t]{2,}', ' ', re.sub(r'[ \t]+\n', '\n', text)).strip()


def key(text):
    return re.sub(r'[^а-яёa-z]', '', text.lower())[:80]


def main():
    feed = fetch()
    if not feed.get('connected'):
        print('Бот еще не подключен к каналу отзывов — ничего не меняю.')
        return
    old = json.loads(reviews.AUTO.read_text(encoding='utf-8')) if reviews.AUTO.exists() else []
    by_id = {r['id']: r for r in old}
    if not feed['reviews'] and old:
        sys.exit('Бот вернул пустой список, а отзывы были — ничего не меняю, проверьте /site/reviews.')
    known = {key(r[3]) for r in reviews.R}
    out = []
    for r in feed['reviews']:
        text = clean(r['text'])
        if not text or key(text) in known:
            continue
        prev = by_id.get(r['id'], {})
        out.append({'id': r['id'], 'date': r['date'], 'name': prev.get('name') or r['name'],
                    's': prev.get('s') or services(text), 'text': text,
                    **({'hidden': True} if prev.get('hidden') else {})})
    added = len({r['id'] for r in out} - set(by_id))
    reviews.AUTO.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'Отзывов из канала: {len(out)}, новых: {added}')
    reviews.main()
    subprocess.run([sys.executable, str(HERE / 'bloki.py')], check=True)


if __name__ == '__main__':
    main()
