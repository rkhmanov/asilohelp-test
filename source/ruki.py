"""Руки для glavnaya-ruki.html: вырезает две руки из фрагмента «Сотворения Адама»
(Микеланджело, общественное достояние; файл Wikimedia Commons
«Creation_of_Adam_(Michelangelo)_Detail.jpg», переведен в серый и очищен от фона)
и сохраняет img/ruki-left.png и img/ruki-right.png: яркость + маска (альфа).
Точки (полутон) рисует ruki.js прямо в браузере.

Запуск: pip install pillow numpy scipy && python3 source/ruki.py
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parent.parent
im = np.asarray(Image.open(root / 'source/ruki-src.jpg').convert('L')).astype(float)
mask = im < 243
mask[:, 1139:] = False          # край кадра
mask[355:, 1090:] = False       # ткань под рукой справа
mask = ndimage.binary_opening(mask, iterations=1)
mask = ndimage.binary_fill_holes(mask)
lab, n = ndimage.label(mask)
sizes = ndimage.sum(mask, lab, range(1, n + 1))
mask = np.isin(lab, np.argsort(sizes)[-2:] + 1)   # только две руки

EXT = {'left': (330, 0.55), 'right': (330, -0.18)}   # на сколько пикселей и с каким наклоном продлить плечо

for name, (x0, x1) in {'left': (0, 548), 'right': (548, 1140)}.items():
    m = mask[:, x0:x1]
    ys, xs = np.where(m)
    y0, y1, xa, xb = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    L = im[y0:y1, x0 + xa:x0 + xb].clip(0, 255).astype(np.uint8)
    M = (m[y0:y1, xa:xb] * 255).astype(np.uint8)
    # кончик пальца: крайняя точка маски со стороны другой руки
    col = M.shape[1] - 1 if name == 'left' else 0
    while not M[:, col].any():
        col += -1 if name == 'left' else 1
    tip = (col, int(np.where(M[:, col])[0].mean()))
    # «дорастить» руку: продлеваем плечо за обрез исходника вдоль его направления
    # (столбец у обреза сдвигается вниз/вверх по наклону руки), ruki.js потом плавно гасит его
    E, slope = EXT[name]
    src = 6 if name == 'left' else M.shape[1] - 7          # столбец рядом с обрезом
    colL, colM = L[:, src - 3:src + 4].mean(1), M[:, src]
    shift = int(round(abs(slope) * E))
    H2 = L.shape[0] + shift
    L2 = np.full((H2, L.shape[1] + E), 255, np.uint8); M2 = np.zeros_like(L2)
    off_old = 0 if slope > 0 else shift                     # рука уходит вниз (левая) или вверх (правая)
    xo = E if name == 'left' else 0
    L2[off_old:off_old + L.shape[0], xo:xo + L.shape[1]] = L
    M2[off_old:off_old + L.shape[0], xo:xo + L.shape[1]] = M
    for i in range(E + 6):                                  # +6: закрываем светлый шов на самом обрезе
        if name == 'left':
            x, dist = i, E - i
        else:
            x, dist = xo + L.shape[1] - 6 + i, i - 5
        dy = off_old + int(round(slope * max(dist, 0)))
        L2[dy:dy + L.shape[0], x] = colL
        M2[dy:dy + L.shape[0], x] = colM
    L, M = L2, M2
    oy = y0 - (shift if slope < 0 else 0)
    ox = (x0 + xa - E) if name == 'left' else x0 + xa
    tip = (tip[0] + (E if name == 'left' else 0), tip[1] + (shift if slope < 0 else 0))
    img = Image.fromarray(np.dstack([L, M]), 'LA')
    img.save(root / f'img/ruki-{name}.png', optimize=True)
    print(name, 'size', img.size, 'origin', (int(ox), int(oy)), 'tip (в вырезке)', tip)
