// «Жидкое стекло» на сайте — библиотека Glisse 0.5.0 (npm: glisse, MIT).
// Сайт статичный: React 19.1 лежит в vendor/react/react.mjs (одна сборка на react, react/jsx-runtime и react-dom/client,
// как собрать — vendor/react/README.md), Glisse — в vendor/glisse. Связь — через importmap в index.html.
// ?glass=0 — выключить всё и посмотреть прежний вид.
import { createElement as h, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Glass, SegmentedControl, Switch, Button, TabBar } from "glisse";

const off = new URLSearchParams(location.search).get("glass") === "0";

// Стеклянная подложка под существующий блок: блок теряет свой фон, под содержимым — Glass.
function glassify(el) {
  if (!el || el.classList.contains("lg-on")) return;
  const host = document.createElement("span");
  host.className = "lg-host";
  host.setAttribute("aria-hidden", "true");
  el.prepend(host);
  el.classList.add("lg-on");
  createRoot(host).render(h(Glass));
}

const svg = (...paths) =>
  h("svg", { viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true },
    ...paths.map((d, i) => h("path", { key: i, d })));

const icons = {
  prev: svg("M14.5 6 8.5 12l6 6"),
  next: svg("M9.5 6l6 6-6 6"),
  help: svg("M3.5 8h17v11.5h-17z", "M8.5 8V5h7v3", "M3.5 13h17"),
  news: svg("M6 3h9l4 4v14H6z", "M14 3v5h5", "M9 13h7", "M9 17h5"),
  us: svg("M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6", "M16 4.6a3.5 3.5 0 0 1 0 6.8", "M18 14.3c2 .7 3.5 2.6 3.5 5.7"),
  faq: svg("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6", "M12 17h.01"),
  chat: svg("M4 5h16v11H9l-5 4z", "M8 9.5h8", "M8 12.5h5"),
  folder: svg("M3.5 6.5h6l2 2h9v10.5h-17z", "M8 13.5h8"),
  route: svg("M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"),
  grid: svg("M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"),
  apply: svg("M21 3 3 10.4l7.2 2.4L12.6 20z", "M10.2 12.8 21 3"),
};

// Тумблер согласия: связан с настоящим чекбоксом (он остаётся в форме, просто скрыт).
function ConsentSwitch({ input, label }) {
  const [on, setOn] = useState(input.checked);
  useEffect(() => {
    const sync = () => setOn(input.checked);
    input.addEventListener("change", sync);
    return () => input.removeEventListener("change", sync);
  }, [input]);
  return h(Switch, { checked: on, "aria-label": label, onCheckedChange: (v) => { input.checked = v; setOn(v); input.dispatchEvent(new Event("change", { bubbles: true })); } });
}

function mount(where, el) {
  const host = document.createElement("div");
  where(host);
  createRoot(host).render(el);
  return host;
}

// Шапка: «Услуги ⌄» — выпадающий список страниц услуг (компьютер и планшет; на телефоне пунктов шапки нет).
// Свой, без React: открывается при наведении и по нажатию, кнопка «Услуги» остается на месте,
// список появляется под ней и не закрывает ее. До 24.11.2026 здесь было меню Glisse: оно открывалось
// только по нажатию и ложилось поверх кнопки — второе нажатие на «Услуги» попадало в «Консультации».
// Ссылка в шапке: <a data-nav="services" href="…#help">. Путь к корню сайта — <html data-home="../">. Работает и с ?glass=0.
{
  const link = document.querySelector('.hdr nav a[data-nav="services"], .hdr nav a[href$="#help"]');
  if (link) {
    const home = document.documentElement.dataset.home || "";
    const ico = (...d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.map((x) => `<path d="${x}"/>`).join("")}</svg>`;
    // Страницы услуг пока не готовы (Саша, 26.11.2026): пункты ведут в разделы бота. Вернуть страницы – home + "konsultacii.html" и т. д.
    const BOT = "https://t.me/ASILOhelperBot?start=";
    const help = document.getElementById("help") ? "#help" : home + "index.html#help";
    const items = [
      ["Консультации", BOT + "site_uslugi_consult", ico("M4 5h16v11H9l-5 4z", "M8 9.5h8", "M8 12.5h5")],
      ["Работа с кейсом", BOT + "site_uslugi_caseinfo", ico("M3.5 6.5h6l2 2h9v10.5h-17z", "M8 13.5h8")],
      ["Сопровождение", BOT + "site_uslugi_soprinfo", ico("M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z")],
      null,
      ["Все услуги", help, ico("M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z")],
    ];
    const here = location.pathname.split("/").pop() || "index.html";
    const dd = document.createElement("div");
    dd.className = "nav-dd";
    dd.innerHTML = `<button type="button" class="nav-dd__btn" aria-expanded="false" aria-controls="nav-dd-list">Услуги <img src="${home}img/chevron.svg" alt="" width="8" height="4"></button>`
      + `<div class="nav-dd__panel" id="nav-dd-list"><div class="nav-dd__card">`
      + items.map((it) => it ? `<a href="${it[1]}"${it[1] === here ? ' aria-current="page"' : ""}${it[1].startsWith("https://") ? ' target="_blank" rel="noopener"' : ""}>${it[2]}<span>${it[0]}</span></a>` : '<hr>').join("")
      + `</div></div>`;
    link.replaceWith(dd);
    const btn = dd.querySelector(".nav-dd__btn");
    const links = [...dd.querySelectorAll(".nav-dd__card a")];
    let timer = 0, hoverAt = 0;
    const set = (on) => {
      clearTimeout(timer);
      dd.classList.toggle("is-open", on);
      btn.setAttribute("aria-expanded", String(on));
    };
    const isOpen = () => dd.classList.contains("is-open");
    // наведение: открыть сразу, закрыть с задержкой, чтобы мышь успела дойти до списка
    const mouse = (e) => e.pointerType === "mouse";
    dd.addEventListener("pointerenter", (e) => { if (!mouse(e)) return; if (!isOpen()) hoverAt = performance.now(); set(true); });
    dd.addEventListener("pointerleave", (e) => { if (!mouse(e)) return; clearTimeout(timer); timer = setTimeout(() => set(false), 220); });
    // нажатие: открыть/закрыть; если список только что открылся от наведения — не закрывать его тем же нажатием
    btn.addEventListener("click", () => {
      const fresh = performance.now() - hoverAt < 600;
      hoverAt = 0;
      if (isOpen() && fresh) return;
      set(!isOpen());
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); set(true); links[0].focus(); }
    });
    dd.addEventListener("keydown", (e) => {
      const i = links.indexOf(document.activeElement);
      if (e.key === "Escape" && isOpen()) { set(false); btn.focus(); }
      else if (i > -1 && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length].focus(); }
    });
    dd.addEventListener("focusout", (e) => { if (!dd.contains(e.relatedTarget)) set(false); });
    document.addEventListener("pointerdown", (e) => { if (!dd.contains(e.target)) set(false); });
    // «Все услуги» на главной — плавно к блоку, без # в адресе
    dd.querySelector(`.nav-dd__card a[href="#help"]`)?.addEventListener("click", (e) => {
      e.preventDefault();
      set(false);
      document.getElementById("help").scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  }
}

if (!off) {
  document.documentElement.classList.add("lg");

  // 1. Шапка
  glassify(document.querySelector(".hdr"));

  // 5. Отзывы: круглые стеклянные кнопки поверх ленты с фото
  const reel = document.getElementById("reel");
  const oldNav = document.querySelector(".reviews__nav");
  if (reel && oldNav) {
    const wrap = document.createElement("div");
    wrap.className = "reel-wrap";
    reel.before(wrap);
    wrap.append(reel);
    oldNav.remove();
    // шаг – две карточки (ширина карточки + зазор), чтобы не зависеть от размеров в CSS
    const step = () => { const c = reel.querySelector(".rv"); return ((c ? c.offsetWidth : 257) + (parseFloat(getComputedStyle(reel).columnGap) || 0)) * 2; };
    // лента с otzyvy-lenta.js двигается через transform – листаем ее функцией reelGo
    const go = (dir) => (reel.reelGo ? reel.reelGo(dir) : reel.scrollBy({ left: dir * step(), behavior: "smooth" }));
    mount((n) => { n.className = "reel-nav"; wrap.append(n); },
      h("div", { className: "reel-nav__in" },
        h(Button, { icon: icons.prev, "aria-label": "Назад", onClick: () => go(-1) }),
        h(Button, { icon: icons.next, "aria-label": "Вперед", onClick: () => go(1) })));
  }

  // 6. Форма: Telegram / E-mail — сегментированный переключатель iOS
  const seg = document.querySelector(".contact .seg");
  if (seg) {
    const host = document.createElement("div");
    host.className = "seg-lg";
    seg.replaceWith(host);
    createRoot(host).render(h(SegmentedControl, {
      "aria-label": "Способ связи",
      items: [{ value: "tg", label: "Telegram" }, { value: "mail", label: "E-mail" }],
      defaultValue: "tg",
      // тип контакта, подсказку и проверку ведёт скрипт формы в index.html
      onValueChange: (v) => window.asiloSetContactType?.(v === "mail" ? "email" : "telegram"),
    }));
  }

  // 7. Форма: галочки согласия → тумблеры
  document.querySelectorAll(".consent input[type=checkbox]").forEach((input, i) => {
    const host = document.createElement("span");
    host.className = "consent__switch";
    input.after(host);
    input.classList.add("consent__native");
    createRoot(host).render(h(ConsentSwitch, { input, label: i === 0 ? "Согласие на обработку данных" : "Согласие на обработку особых данных" }));
  });

  // 8. Телефон: нижнее меню-таббар, как в iOS
  // TabBar сам меняет адрес (#faq), но страницу не прокручивает — докручиваем сами.
  // Внутренние страницы: <html data-home="../"> — путь до корня сайта; data-page — какая вкладка активна.
  const home = document.documentElement.dataset.home ?? "";
  const onHome = !document.documentElement.dataset.page;
  // якорь есть на этой странице (вопросы и заявка на страницах услуг) — ведем к нему, иначе на главную
  const anchor = (id) => (onHome || document.getElementById(id) ? "" : home + "index.html") + "#" + id;
  // «Вопросы»: свой блок #faq на странице, иначе страница всех вопросов
  const faqHref = onHome || document.getElementById("faq") ? "#faq" : home + "voprosy.html";
  mount((n) => {
    n.className = "tabbar-lg";
    n.addEventListener("click", (e) => {
      // «Заявка» ведет в бота (Саша, 24.11.2026): открываем Telegram в новой вкладке, сайт остается открытым
      const tg = e.target.closest('a[href^="https://t.me/"]');
      if (tg) { e.preventDefault(); window.open(tg.href, "_blank", "noopener"); return; }
      const a = e.target.closest('a[href^="#"]');
      const to = a && document.querySelector(a.getAttribute("href"));
      if (to) to.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    document.body.append(n);
  },
    h(TabBar, {
      "aria-label": "Разделы",
      defaultValue: document.documentElement.dataset.page || null,
      items: [
        { value: "help", label: "Услуги", icon: icons.help, href: anchor("help") },
        { value: "us", label: "О нас", icon: icons.us, href: home + "o-nas.html" },
        { value: "news", label: "Статьи", icon: icons.news, href: home + "stati.html" },
        { value: "faq", label: "Вопросы", icon: icons.faq, href: faqHref },
        { value: "apply", label: "Заявка", icon: icons.apply, href: "https://t.me/ASILOhelperBot?start=site_tabbar_chances" },
      ],
    }));
}
