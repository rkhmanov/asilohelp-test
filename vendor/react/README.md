# React для «жидкого стекла»

`react.mjs` — React 19.1.0 и React DOM 19.1.0 (лицензия MIT, `LICENSE`) одной ES-сборкой. Её отдаёт сам сайт, поэтому браузер посетителя не ходит на сторонние CDN (раньше React грузился с esm.sh, 23.11.2026 перенесли сюда).

`index.html` связывает её через importmap: `react`, `react/jsx-runtime` и `react-dom/client` указывают на один файл, так что у Glisse и `glass.js` один и тот же React.

Пересобрать (например, при обновлении React):

```sh
mkdir /tmp/rb && cd /tmp/rb && npm init -y && npm i react@19.1.0 react-dom@19.1.0 esbuild
cp <репо>/vendor/react/entry.js . 
npx esbuild entry.js --bundle --format=esm --minify --define:process.env.NODE_ENV='"production"' --legal-comments=none --outfile=<репо>/vendor/react/react.mjs
```

`entry.js` перечисляет все имена из `react`, `react/jsx-runtime` и `react-dom/client` (сгенерирован по `Object.keys` этих пакетов). Если новой версии Glisse понадобится имя, которого там нет, — добавить строку `export const Имя = all.Имя;`.
