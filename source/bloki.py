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

# Лента отзывов (Саша, 25.11.2026): одна карточка = один человек. В покое лежит либо текстом, либо фото,
# по очереди: текст (белый) / фото / текст (красный) / фото / «Оставить заявку» / дальше так же.
# Нажатие переворачивает карточку: на обороте вторая половина того же человека, той же формы.
# Главная (Саша, 26.11): 14 карточек под 14 утвержденных фото (Figma 4859:3816). Первые 10 – тексты, которые Саша
# выбрал в Figma, дальше добрано. Фото и тексты подобраны отдельно: имя на наклейке – автор текста.
# В текстах нет имени «Саша» – вместо него «координатор» или «юрист». Имена: ники заменены, у пар два имени.
# text: [[…]] – кусок только для компьютера (на телефоне карточка меньше). photo: файл в img/rv/.
# home=False – только на страницах услуг. Формы, цвета и наклон наклеек считаются по месту в ленте.
OTZYVY = [
    dict(id='angelina', name='Ангелина', s='vs', label='Виза', photo='lera.jpg',
         text='Визу получала впервые и очень боялась напортачить. [[Помогли с документами и анкетами. ]]Ребята были на связи постоянно и даже поймали слот в моем регионе'),
    dict(id='yulia', name='Юлия', s='l', label='Консультация юриста', photo='yulia.jpg',
         text='Юрист спокойно и грамотно объяснил все сложности и пути их решения. Стало понятно, а главное – не страшно[[. Спасибо, что не оставляете людей в одиночестве]]'),
    dict(id='daniil', name='Даниил и Артем', s='c', label='Консультация', photo='daniil.jpg',
         text='Мы с парнем заранее написали кучу вопросов о переезде и беженстве и на все получили четкие ответы[[. А еще таблицы, памятки и полезные контакты]]'),
    dict(id='valentin', name='Валентин', s='k', label='Работа с кейсом', photo='valentin.jpg',
         text='До крайнего срока по моему ЛГБТ-кейсу оставался ровно месяц. За этот месяц мы собрали все документы и доказательства[[. Все успели]]'),
    'you',
    dict(id='lyubava', name='Любава', s='svlk', label='Сопровождение', photo='lyubava.jpg',
         text='Первый созвон с координатором развеял главные сомнения[[, Валерия вела подачу на визу, юрист вычитал кейс]]. Визу дали с первого раза. Ценник абсолютно соотносим с пользой'),
    dict(id='daniel', name='Даниэль', s='l', label='Консультация юриста', photo='daniel.jpg',
         text='На все наши вопросы были даны четкие, полные ответы. После консультации стало спокойнее и понятнее, что делать[[. С экспертом точно стоит посоветоваться, чтобы не ошибиться]]'),
    dict(id='aleksej', name='Алексей', s='s', label='Сопровождение', photo='aleksej-k.jpg',
         text='Удалось сдаться в аэропорту при наличии шенгена, пройти детеншн и интервью в полиции и получить красную карту всего через неделю[[. Команда была рядом]]'),
    dict(id='gela', name='Гела и Нико', s='c', label='Консультация', photo='sanya.jpg',
         text='Мы с партнером ехали в Барселону без четкого плана. Координатор ответил на все вопросы и остался на связи[[. Сейчас мы 8 месяцев в Испании, все хорошо]]'),
    dict(id='dmitrij', name='Дмитрий', s='c', label='Консультация', photo='aleksandr.jpg',
         text='Одни кормили завтраками, другие просили нереальный ценник. Ребята оказались «целительной таблеткой»: успокоили[[ и разложили все по полочкам]]'),
    dict(id='rostislav', name='Ростислав', s='kc', label='Работа с кейсом', photo='ross.jpg',
         text='Советы помогли внести правки в кейс[[ и сделать его весомее для миграционного офицера]]. Я подался на убежище неделю назад и теперь в стране легально'),
    dict(id='vika', name='Вика', s='c', label='Консультация', photo='vika.jpg',
         text='Два года не могла решиться. Координатор помог выбрать страну и тип легализации. Оказалось, все не так страшно[[, как я себе представляла]]'),
    dict(id='apollinaria', name='Аполлинария', s='c', label='Консультация', photo='apollinaria.jpg',
         text='Очень информативно, много полезного[[, еще и материалы после консультации]]. Ответили на все вопросы, стало понятнее и спокойнее'),
    dict(id='elena', name='Елена', s='lk', label='Консультация юриста', photo='elena.jpg',
         text='Разобрали все подводные камни, которые могут быть на интервью, и получили ценные правки к кейсу[[. Общение было приятным и конструктивным]]'),
    dict(id='kirill', name='Кирилл', s='c', label='Консультация', photo='kirill.jpg',
         text='Все прошло очень комфортно. Получил ответы на все вопросы, и появилась уверенность[[ и вера]] в то, что все может получиться :)'),
    # только на страницах услуг
    dict(id='nikita', name='Никита', s='vs', label='Виза и сита', photo='nikita.jpg', home=False,
         text='Все четко, быстро и простым языком. Помогли с визой, хотя паспорт был «пустой»[[, и отдельное спасибо за помощь с поиском ситы]]. Без них я бы точно не справился!'),
    dict(id='anna', name='Анна и Катя', s='c', label='Консультация', photo='anna.jpg', home=False,
         text='Мы с девушкой были в жутком стрессе из-за переезда. Координатор успокоил, поддержал и ответил на все-все вопросы[[. Теперь осталось только исполнить нашу мечту 🤍]]'),
    dict(id='sasha-v', name='Саша и Вера', s='s', label='Сопровождение', photo='sasha-v.jpg', home=False,
         text='Наша Испания началась с координатора: встретил в аэропорту, помог дотащить чемоданы[[, заранее нашел жилье]] и все время был на связи[[. Помогал нам не падать духом]]'),
]
# формы карточек по месту в ленте (без повторов подряд): у лежащих текстом – без больших скруглений слева сверху
T_SH = ['f', 'b', 'e', 'g', 'd', 'f', 'h', 'g']
P_SH = ['a', 'c', 'd', 'h', 'c', 'a', 'e', 'b']
TILT = [2, -2, 3, -3, 2, -3, 3, -2]

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


def nbsp(t):
    """Предлоги и короткие слова не висят в конце строки; тире не начинает строку."""
    for _ in range(2):
        t = re.sub(r'(^|[\s\u00a0«(])([А-Яа-яЁёA-Za-z]{1,2}) ', '\\1\\2\u00a0', t)
    return t.replace(' –', '\u00a0–')


def rv_text(t):
    """[[…]] – кусок только для компьютера (.rv__x скрыт на телефоне)."""
    parts = re.split(r'\[\[|\]\]', nbsp(t))
    return ''.join(e(x) if i % 2 == 0 else f'<span class="rv__x">{e(x)}</span>' for i, x in enumerate(parts))


def q_card(o, shape, red, r, front):
    cls = f'rv rv--q rv--{shape}' + (' rv--q-dark' if red else '')
    attr = ' data-front' if front else ' hidden'
    return (f'<figure class="{cls}" data-pair="{o["id"]}"{attr}><blockquote>{rv_text(o["text"])}</blockquote>'
            f'<figcaption><span class="sticker" style="--r:{r}deg">{e(o["label"])}</span></figcaption></figure>')


def ph_card(o, shape, r, front):
    attr = ' data-front' if front else ' hidden'
    return (f'<figure class="rv rv--ph rv--{shape}" data-pair="{o["id"]}"{attr}><img src="img/rv/{o["photo"]}" alt="Фото: {e(o["name"])}" '
            f'loading="lazy" draggable="false"><figcaption class="sticker" style="--r:{r}deg">{e(o["name"])}</figcaption></figure>')


def otzyvy(page):
    cfg = STRANICY[page]
    cards = []
    i = 0
    for o in OTZYVY:
        if o == 'you':
            cards.append(f'<div class="rv rv--you"><span>Здесь может<br>быть ваше фото</span><a class="rv__cta m-btn" href="{BOT}{cfg["reel_tag"]}" '
                         f'target="_blank" rel="noopener" draggable="false">Оставить заявку</a></div>')
            continue
        if cfg['s'] is None and o.get('home') is False:
            continue
        if cfg['s'] is not None and not set(o['s']) & set(cfg['s']):
            continue
        k = i // 2
        text_up = i % 2 == 0
        shape = (T_SH if text_up else P_SH)[k % len(T_SH)]
        red = k % 2 == 1
        r = TILT[i % len(TILT)]
        q = q_card(o, shape, red, r, text_up)
        ph = ph_card(o, shape, -r, not text_up)
        cards += [q, ph] if text_up else [ph, q]
        i += 1
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
