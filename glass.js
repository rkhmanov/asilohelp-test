// «Жидкое стекло» на сайте — библиотека Glisse 0.5.0 (npm: glisse, MIT).
// Сайт статичный, поэтому React берём с esm.sh через importmap, а Glisse лежит в vendor/glisse.
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
  return h(Switch, { checked: on, "aria-label": label, onCheckedChange: (v) => { input.checked = v; setOn(v); } });
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

  // 2. Плавающие карточки: первый экран, «Кто мы», «База знаний»
  document.querySelectorAll(".hero .scr, .fl, .status").forEach(glassify);

  // 3. Всё, что лежит поверх фото: чипы на фото Саши, стикеры на отзывах
  document.querySelectorAll(".dark__art .chip, .rv .sticker, .arch .sticker").forEach(glassify);

  // 4. Плашка «Тестовая версия» — тёмное стекло
  const banner = document.querySelector(".test-banner");
  if (banner) { banner.setAttribute("data-theme", "dark"); glassify(banner); }

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
    const input = seg.parentElement.querySelector("input");
    const host = document.createElement("div");
    host.className = "seg-lg";
    seg.replaceWith(host);
    createRoot(host).render(h(SegmentedControl, {
      "aria-label": "Способ связи",
      items: [{ value: "tg", label: "Telegram" }, { value: "mail", label: "E-mail" }],
      defaultValue: "tg",
      onValueChange: (v) => { input.placeholder = v === "mail" ? "name@mail.com" : "@username"; input.type = v === "mail" ? "email" : "text"; },
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
      defaultValue: null,
      items: [
        { value: "help", label: "Услуги", icon: icons.help, href: "#help" },
        { value: "us", label: "О нас", icon: icons.us, href: "#us" },
        { value: "news", label: "Статьи", icon: icons.news, href: "#news" },
        { value: "faq", label: "Вопросы", icon: icons.faq, href: "#faq" },
        { value: "apply", label: "Заявка", icon: icons.apply, href: "#apply" },
      ],
    }));
}
