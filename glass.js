// «Жидкое стекло» на сайте — библиотека Glisse 0.5.0 (npm: glisse, MIT).
// Сайт статичный, поэтому React берём с esm.sh через importmap, а Glisse лежит в vendor/glisse.
// ?glass=0 — выключить всё и посмотреть прежний вид.
import { createElement as h, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Glass, SegmentedControl, Switch, Button, TabBar, Menu } from "glisse";

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

if (!off) {
  document.documentElement.classList.add("lg");

  // 1. Шапка
  glassify(document.querySelector(".hdr"));

  // 2. Шапка: «Услуги ⌄» — стеклянное выпадающее меню
  const servicesLink = document.querySelector('.hdr nav a[href="#help"]');
  if (servicesLink) {
    const go = (sel) => () => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: sel === "#help" ? "start" : "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    const host = document.createElement("span");
    host.className = "nav-menu";
    servicesLink.replaceWith(host);
    createRoot(host).render(h(Menu, {
      "aria-label": "Услуги",
      align: "start",
      icon: h("span", { className: "nav-menu__label" }, "Услуги", h("img", { src: "img/chevron.svg", alt: "", width: 8, height: 4 })),
      items: [
        { label: "Консультация", icon: icons.chat, onSelect: go(".fc--a") },
        { label: "Работа с кейсом", icon: icons.folder, onSelect: go(".fc--b") },
        { label: "Сопровождение", icon: icons.route, onSelect: go(".fc--c") },
        "separator",
        { label: "Все услуги", icon: icons.grid, onSelect: go("#help") },
      ],
    }));
  }

  // 5. Отзывы: круглые стеклянные кнопки поверх ленты с фото
  const reel = document.getElementById("reel");
  const oldNav = document.querySelector(".reviews__nav");
  if (reel && oldNav) {
    const wrap = document.createElement("div");
    wrap.className = "reel-wrap";
    reel.before(wrap);
    wrap.append(reel);
    oldNav.remove();
    const go = (dir) => reel.scrollBy({ left: dir * 275 * 2, behavior: "smooth" });
    mount((n) => { n.className = "reel-nav"; wrap.append(n); },
      h("div", { className: "reel-nav__in" },
        h(Button, { icon: icons.prev, "aria-label": "Назад", onClick: () => go(-1) }),
        h(Button, { icon: icons.next, "aria-label": "Вперёд", onClick: () => go(1) })));
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
  const anchor = (id) => (onHome ? "" : home + "index.html") + "#" + id;
  mount((n) => {
    n.className = "tabbar-lg";
    n.addEventListener("click", (e) => {
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
        { value: "faq", label: "Вопросы", icon: icons.faq, href: anchor("faq") },
        { value: "apply", label: "Заявка", icon: icons.apply, href: anchor("apply") },
      ],
    }));
}
