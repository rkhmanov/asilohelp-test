#!/usr/bin/env python3
"""Общие блоки сайта: лента отзывов и красная заявка «¿Empezamos?» (Саша, 24.11.2026).

Блоки одинаковые на всех страницах, где они стоят. Правка – только здесь, потом
    python3 source/bloki.py          – перепишет блоки во всех страницах;
    python3 source/bloki.py --check  – только проверит, что страницы совпадают с этим файлом (так делает CI).

В странице блок стоит между метками <!-- blok:otzyvy --> … <!-- /blok:otzyvy --> и <!-- blok:zayavka --> … <!-- /blok:zayavka -->.

Лента отзывов: на главной все отзывы, на страницах услуг – только отзывы об этой услуге (поле s).
Пары «фото + текст» (data-pair): нажатая карточка переворачивается – фото ↔ отзыв (телефон otzyvy-lenta.js, компьютер otzyvy-lenta-pk.js).
Услуги (s): c – консультация, l – консультация юриста, k – работа с кейсом, v – виза, s – сопровождение.
"""
import html, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Отзывы в ленте – в порядке компьютерного макета Figma (4750:4451).
# photo: (файл, форма карточки a–e, наклон наклейки с именем); photo_first – фото слева от текста.
# Без photo – одиночная текстовая карточка с именем автора.
OTZYVY = [
    dict(id='anna', name='Анна', s='c', label='Консультация', look='q-r', r=2,
         text='Мы с девушкой были на жутком стрессе из-за переезда. Саша нас успокоил, поддержал и ответил на все-все вопросы',
         photo=('anna.jpg', 'a', 2)),
    dict(id='aleksej', name='Алексей', s='s', label='Сопровождение', look='q-dark', r=-2,
         text='Удалось при наличии шенгена сдаться в аэропорту, пройти интервью в полиции и получить красную карту через неделю в Испании',
         photo=('aleksej.jpg', 'b', -2)),
    'you',
    dict(id='ross', name='Росс', s='kc', label='Работа с кейсом', look='', r=-3,
         text='Советы помогли внести правки в кейс. Я подался на убежище неделю назад и теперь нахожусь в стране легально',
         photo=('ross.jpg', 'c', 3), photo_first=True),
    dict(id='angelina', name='Ангелина', s='vs', label='Виза', look='q-dark', r=2,
         text='Визу получала впервые и очень боялась напортачить. Ребята были на связи постоянно и даже помогли поймать слот в моем регионе',
         photo=('angelina.jpg', 'd', -2)),
    dict(id='valentin', name='Валентин', s='k', label='Работа с кейсом', look='q-r', r=-2,
         text='До крайнего срока оставался ровно месяц. За этот месяц мы собрали все нужные документы и доказательства',
         photo=('valentin.jpg', 'e', 2)),
    dict(id='maks', name='Макс', s='c', label='Консультация', look='q-dark', r=3,
         text='Многие страхи ушли после диалога. Как будто поговорил с другом, который просто делится полезной информацией',
         photo=('maks.jpg', 'b', -3), photo_first=True),
    dict(id='sanya', name='Саня', s='c', label='Консультация', look='', r=-2,
         text='Саша очень подробно расписал весь процесс и успокоил на тему наших переживаний',
         photo=('sanya.jpg', 'c', 2)),
    # только на страницах услуг (на главной их нет – home=False)
    dict(name='Даниэль', s='l', label='Консультация юриста', look='', r=3, home=False,
         text='На все наши вопросы были даны четкие, полные ответы. После консультации стало спокойнее и понятнее, что нам нужно сделать'),
    dict(name='Гела', s='c', label='Консультация', look='q-r', r=-3, home=False,
         text='Сейчас мы с партнером уже 8 месяцев в Испании, у нас все хорошо с документами. Консультация с Сашей нам очень помогла'),
    dict(name='Елена', s='lk', label='Консультация юриста', look='', r=3, home=False,
         text='Разобрали все возможные подводные камни, которые могут быть на интервью. Правки к кейсу получили тоже очень ценные'),
    dict(name='Никита', s='vs', label='Виза и сита', look='', r=3, home=False,
         text='Помогли с визой, при том быстро, несмотря на то, что был «пустой» паспорт. Отдельная благодарность за помощь с поиском ситы'),
    dict(name='Любава', s='svlk', label='Сопровождение', look='q-r', r=-3, home=False,
         text='Визу дали с первого раза. Ценник абсолютно соотносим с пользой, полученной в процессе'),
]

# Страницы: какие услуги показывать в ленте, куда ведет «N отзывов», метки ссылок на бота
STRANICY = {
    'index.html':          dict(s=None, more=('otzyvy.html', '27', 'отзывов целиком'), sub='что они пишут о работе с нами',
                                reel_tag='site_reel_chances', apply_tag='site_apply_chances'),
    'konsultacii.html':    dict(s='cl', more=('otzyvy.html#konsultacii', '17', 'отзывов о консультациях'), sub='что пишут после консультаций',
                                reel_tag='site_konsult_reel_chances', apply_tag='site_konsult_apply_chances'),
    'keys.html':           dict(s='k', more=('otzyvy.html#keys', '4', 'отзыва о работе с кейсом'), sub='что пишут о работе с кейсом',
                                reel_tag='site_keys_reel_case', apply_tag='site_keys_apply_case'),
    'soprovozhdenie.html': dict(s='sv', more=('otzyvy.html#soprovozhdenie', '5', 'отзывов о сопровождении'), sub='что пишут о сопровождении',
                                reel_tag='site_soprpage_reel_chances', apply_tag='site_soprpage_apply_chances'),
    'otzyvy.html':         dict(apply_tag='site_reviews_apply_chances'),
    'voprosy.html':        dict(apply_tag='site_faq_apply_chances'),
}

BOT = 'https://t.me/ASILOhelperBot?start='
e = html.escape


def q_card(o, pair):
    cls = 'rv rv--q' + (f' rv--{o["look"]}' if o['look'] else '')
    name = '' if pair else f'<b>{e(o["name"])}</b>'
    dp = f' data-pair="{o["id"]}"' if pair else ''
    return (f'<figure class="{cls}"{dp}><blockquote>{e(o["text"])}</blockquote>'
            f'<figcaption>{name}<span class="sticker" style="--r:{o["r"]}deg">{e(o["label"])}</span></figcaption></figure>')


def ph_card(o):
    f, shape, r = o['photo']
    return (f'<figure class="rv rv--ph rv--{shape}" data-pair="{o["id"]}"><img src="img/rv/{f}" alt="Фото: {e(o["name"])}" '
            f'loading="lazy" draggable="false"><figcaption class="sticker" style="--r:{r}deg">{e(o["name"])}</figcaption></figure>')


def otzyvy(page):
    cfg = STRANICY[page]
    cards = []
    for o in OTZYVY:
        if o == 'you':
            cards.append(f'<div class="rv rv--you"><span>Здесь может<br>быть ваше фото</span><a class="rv__cta m-btn" href="{BOT}{cfg["reel_tag"]}" '
                         f'target="_blank" rel="noopener" draggable="false">Оставить заявку</a></div>')
            continue
        if cfg['s'] is None and o.get('home') is False:
            continue
        if cfg['s'] is not None and not set(o['s']) & set(cfg['s']):
            continue
        if 'photo' in o:
            pair = [ph_card(o), q_card(o, True)] if o.get('photo_first') else [q_card(o, True), ph_card(o)]
            cards += pair
        else:
            cards.append(q_card(o, False))
    href, n, txt = cfg['more']
    cards.append(f'<a class="rv rv--more" href="{href}" draggable="false"><b>{n}</b>{txt} →</a>')
    # «Оставить заявку» – после первых двух отзывов (как в макете), если отзывов мало – ближе к концу
    you = next(i for i, c in enumerate(cards) if 'rv--you' in c)
    if you > len(cards) - 3:
        cards.insert(len(cards) - 1, cards.pop(you))
    reel = '\n    '.join(cards)
    return f'''<section class="reviews" id="reviews">
  <div class="wrap">
    <div class="sh sh--sm" data-reveal><h2>Истории тех, кто уже в Испании<span>{cfg["sub"]}</span></h2></div>
    <div class="reviews__nav"><button type="button" data-dir="-1" aria-label="Назад"><img src="img/btn-prev.svg" alt="" width="52" height="52"></button><button type="button" data-dir="1" aria-label="Вперед"><img src="img/btn-next.svg" alt="" width="52" height="52"></button></div>
  </div>
  <div class="reel reel--tap" id="reel">
    {reel}
  </div>
  <div class="wrap reviews__foot">
    <p>Это реальные люди: отзывы пришли нам после консультаций, работы над кейсом и сопровождения.<br><a class="reviews__all" href="{href}">Читать все отзывы →</a></p>
    <div class="dots" aria-hidden="true"><i></i><i></i><i></i></div>
  </div>
</section>'''


TG_SVG = ('<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M21.4 4.1 2.9 11.3c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 '
          '1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.5-1.9-1.4-1.5Z"/></svg>')


def zayavka(page, tg_svg):
    tag = STRANICY[page]['apply_tag']
    return f'''<section class="apply" id="apply">
  <div class="apply__box" data-reveal>
    <div class="apply__bg" aria-hidden="true"><span class="apply__ghost">начинаем?</span></div>
    <div class="arch" aria-hidden="true"><img src="img/rv-sasha-dog.jpg" alt=""></div>
    <span class="sticker apply__sticker" aria-hidden="true">Ответим пн–пт</span>
    <div class="apply__left">
      <h2>¿Empezamos?</h2>
      <p>Расскажите, где вы сейчас и что вас интересует.<br class="only-d"> На бесплатной оценке шансов скажем, подходит ли<br class="only-d"> вам <span class="only-d">международная </span>защита и с чего начать.</p>
      <a class="tg m-btn" href="{BOT}{tag}" target="_blank" rel="noopener"><span class="tg__ava" aria-hidden="true">{tg_svg}</span><span class="tg__txt"><small>Оставьте заявку в</small><b>@ASILOhelperBot</b></span><img class="tg__go m-arrow" src="img/arrow-red44.svg" alt="" width="40" height="40"></a>
      <p class="apply__note">Общение с нами не нарушает законы РФ. Мы не передаем данные третьим лицам.</p>
    </div>
  </div>
</section>'''


def put(s, name, body, page):
    a, b = f'<!-- blok:{name} -->', f'<!-- /blok:{name} -->'
    if a not in s:
        raise SystemExit(f'{page}: нет метки {a}')
    i, j = s.index(a) + len(a), s.index(b)
    return s[:i] + '\n' + body + '\n' + s[j:]


def main():
    check = '--check' in sys.argv
    # иконка Telegram – та же, что сейчас на главной
    home = (ROOT / 'index.html').read_text(encoding='utf-8')
    m = re.search(r'<span class="tg__ava" aria-hidden="true">(<svg.*?</svg>)</span>', home)
    tg_svg = m.group(1) if m else TG_SVG
    bad = []
    for page, cfg in STRANICY.items():
        p = ROOT / page
        s = p.read_text(encoding='utf-8')
        new = s
        if 's' in cfg:
            new = put(new, 'otzyvy', otzyvy(page), page)
        new = put(new, 'zayavka', zayavka(page, tg_svg), page)
        if new != s:
            if check:
                bad.append(page)
            else:
                p.write_text(new, encoding='utf-8')
                print('обновлено:', page)
    if check and bad:
        raise SystemExit('Общие блоки разошлись с source/bloki.py: ' + ', '.join(bad) + '. Запустите python3 source/bloki.py')
    if check:
        print('Общие блоки на месте')


if __name__ == '__main__':
    main()
