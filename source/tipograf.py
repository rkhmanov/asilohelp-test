#!/usr/bin/env python3
"""Висячие предлоги (Саша, 27.11.2026): короткие слова не остаются в конце строки – ни на телефоне, ни на компьютере.

Привязываем неразрывным пробелом (&nbsp;) к следующему слову:
  • слова из одной-двух букв: в, с, к, и, а, о, у, на, по, за, от, до, из, не, но, мы, вы…;
  • трехбуквенные предлоги и союзы: для, без, над, под, про, при, обо, изо, ото, или;
  • число – к следующему слову или знаку (900 €, 3 месяца, 1 000, № 5);
к предыдущему слову – частицы ли, ль, же, ж, бы, б; тире не начинает строку (слово&nbsp;– слово).

Меняется только видимый текст. Не трогаем атрибуты (href, alt, content…), <head>, <script>, <style>, <textarea>, <pre>,
<code>, <svg>, буквы-стикеры первого экрана ([data-sk]) и всё внутри элемента с атрибутом data-notypo.
Неразрывный пробел в тексте пишется как &nbsp; (видно при правке страниц руками).

    python3 source/tipograf.py          – поправит все страницы сайта;
    python3 source/tipograf.py --check  – только проверит (так делает CI и tests/qa.cjs), покажет, где висит.

Генераторы (bloki.py, voprosy.py, reviews.py, build_stati.py) сами прогоняют свой текст через typo(), поэтому
новые FAQ, отзывы из канала и статьи приходят уже без висячих предлогов. Руками правили HTML – запустите этот файл.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {'.git', 'node_modules', 'source', 'vendor', 'tests', 'arhiv', 'animacii'}
SKIP_FILES = {'glavnaya-arhiv-23-11.html'}  # архив главной – как был

NB = '&nbsp;'
SP = r'[ \t\r\n]+'  # обычный (разрывный) пробел; &nbsp; и U+00A0 – уже неразрывные
SHORT = r'[^\W\d_]{1,2}|(?i:для|без|над|под|про|при|обо|изо|ото|или)'
BACK = r'(?i:ли|ль|же|ж|бы|б)'
# короткое слово: перед ним не буква/цифра/дефис/апостроф (иначе это хвост слова: «из-за» не трогаем, «по-русски» тоже)
FWD = re.compile(rf"(?<![\w\-’'&])((?:{SHORT})){SP}(?=[^\s<])")
FWD_END = re.compile(rf"(?<![\w\-’'&])((?:{SHORT})){SP}$")  # короткое слово в конце текста, дальше строчный тег: «в <b>Испании</b>»
BACK_RE = re.compile(rf"(?<=[\w»)]){SP}({BACK})(?![\w\-])")
NUM = re.compile(rf"(?<![\w.,])(\d+|№|§){SP}(?=[\w€$%₽«(]|\d)")
DASH = re.compile(rf"(?<=\S){SP}([–—])(?=\s|$)")

INLINE = {'a', 'b', 'strong', 'em', 'i', 'span', 'u', 's', 'mark', 'small', 'sup', 'sub', 'abbr', 'time', 'q', 'cite', 'nobr', 'label', 'bdi'}
SKIP_TAGS = {'head', 'script', 'style', 'textarea', 'pre', 'code', 'svg', 'title', 'noscript'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
# <script>, <style>, <textarea>, <title> – целиком одним куском: внутри бывает «<» (if(innerWidth<400)…)
RAW = re.compile(r'<(script|style|textarea|title)\b(?:[^"\'>]|"[^"]*"|\'[^\']*\')*>.*?</\1\s*>', re.S | re.I)
TOKEN = re.compile(RAW.pattern + r'|<!--.*?-->|<!\w[^>]*>|<(?:[^"\'>]|"[^"]*"|\'[^\']*\')*>', re.S | re.I)
TAGNAME = re.compile(r'</?([a-zA-Z][\w-]*)')


def fix_text(t, before_inline):
    t = t.replace(' ', NB)
    for _ in range(3):  # «и в то же» – цепочки коротких слов
        t2 = FWD.sub(lambda m: m.group(1) + NB, t)
        t2 = NUM.sub(lambda m: m.group(1) + NB, t2)
        if t2 == t:
            break
        t = t2
    t = BACK_RE.sub(lambda m: NB + m.group(1), t)
    t = DASH.sub(lambda m: NB + m.group(1), t)
    if before_inline:
        t = FWD_END.sub(lambda m: m.group(1) + NB, t)
    return t


def typo(html):
    """Возвращает html с неразрывными пробелами в видимом тексте. Повторный прогон ничего не меняет."""
    out, pos = [], 0
    skip = []  # стек: (имя тега, глубина) – внутри пропускаемого элемента
    parts = []
    for m in TOKEN.finditer(html):
        if m.start() > pos:
            parts.append(('t', html[pos:m.start()]))
        parts.append(('g', m.group(0)))
        pos = m.end()
    if pos < len(html):
        parts.append(('t', html[pos:]))
    for i, (kind, s) in enumerate(parts):
        if kind == 'g':
            out.append(s)
            if RAW.fullmatch(s):
                continue
            n = TAGNAME.match(s)
            if not n:
                continue
            name = n.group(1).lower()
            closing = s.startswith('</')
            if skip:
                top, depth = skip[-1]
                if name == top and name not in VOID and not s.endswith('/>'):
                    skip[-1] = (top, depth - 1 if closing else depth + 1)
                    if skip[-1][1] == 0:
                        skip.pop()
                continue
            if not closing and name not in VOID and not s.endswith('/>') and (
                    name in SKIP_TAGS or re.search(r'\sdata-(sk|notypo)\b', s)):
                skip.append((name, 1))
            continue
        if skip:
            out.append(s)
            continue
        nxt = parts[i + 1][1] if i + 1 < len(parts) else ''
        n = TAGNAME.match(nxt)
        before_inline = bool(n) and not nxt.startswith('</') and n.group(1).lower() in INLINE
        out.append(fix_text(s, before_inline))
    return ''.join(out)


def pages():
    out = []
    for p in sorted(ROOT.rglob('*.html')):
        rel = p.relative_to(ROOT)
        if set(rel.parts[:-1]) & SKIP_DIRS or rel.name in SKIP_FILES:
            continue
        out.append(p)
    return out


def where(old, new, limit=5):
    """Куски текста, где висело (для --check)."""
    res, i = [], 0
    while len(res) < limit:
        while i < min(len(old), len(new)) and old[i] == new[i]:
            i += 1
        if i >= min(len(old), len(new)):
            break
        line = old.count('\n', 0, i) + 1
        frag = re.sub(r'\s+', ' ', old[max(0, i - 30):i + 25])
        res.append(f'стр. {line}: …{frag}…')
        # к следующему расхождению: выравниваем хвосты
        d = len(new) - len(old)
        j = i + 1
        while j < len(old) and old[j:j + 40] != new[j + d:j + d + 40]:
            j += 1
        i = j + 40
        old, new = old[i:], new[i + d:]
        i = 0
    return res


def main():
    check = '--check' in sys.argv
    bad = []
    for p in pages():
        s = p.read_text(encoding='utf-8')
        new = typo(s)
        if new == s:
            continue
        rel = p.relative_to(ROOT).as_posix()
        if check:
            bad.append(rel + '\n    ' + '\n    '.join(where(s, new)))
        else:
            p.write_text(new, encoding='utf-8')
            print('поправлено:', rel)
    if check and bad:
        raise SystemExit('Висячие предлоги и короткие слова (запустите python3 source/tipograf.py):\n  ' + '\n  '.join(bad))
    if check:
        print('Висячих предлогов нет')


if __name__ == '__main__':
    main()
