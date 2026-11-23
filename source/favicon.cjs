// Иконка сайта: радуга из логотипа (3 дуги) на белом круге.
// Запуск: node source/favicon.cjs  → img/favicon.svg, img/favicon-32.png, img/apple-touch-icon.png
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const IMG = path.join(__dirname, '..', 'img');

// Цвета дуг — из logo.svg; внутренняя чуть темнее (#E7B3BC → #DE9AA7), иначе на 16 px сливается с белым.
const COLS = ['#A02538', '#C97080', '#DE9AA7'];
const R = 26, W = 6.4, GAP = 1.8, RING = 2, RING_C = '#E2AEB8';

function rainbow() {
  const cy = 32 + (R - W / 2) / 2; // радуга по центру круга по высоте
  return COLS.map((c, i) => {
    const r = +(R - W / 2 - i * (W + GAP)).toFixed(2);
    return `<path d="M${32 - r} ${cy}A${r} ${r} 0 0 1 ${32 + r} ${cy}" stroke="${c}" stroke-width="${W}" stroke-linecap="round"/>`;
  }).join('');
}
const circle = `<circle cx="32" cy="32" r="${32 - RING / 2}" fill="#fff" stroke="${RING_C}" stroke-width="${RING}"/>`;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">${circle}${rainbow()}</svg>\n`;
// apple-touch-icon: iOS заливает прозрачное черным и сам скругляет углы — поэтому белый квадрат, круг внутри.
const touch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" fill="#fff"/><g transform="translate(5 5) scale(.84375)">${circle}${rainbow()}</g></svg>`;

fs.writeFileSync(path.join(IMG, 'favicon.svg'), favicon);
(async () => {
  const b = await chromium.launch();
  for (const [svg, size, file, omitBackground] of [[favicon, 32, 'favicon-32.png', true], [touch, 180, 'apple-touch-icon.png', false]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    await p.screenshot({ path: path.join(IMG, file), omitBackground });
    await p.close();
  }
  await b.close();
  console.log('ok: img/favicon.svg, img/favicon-32.png, img/apple-touch-icon.png');
})();
