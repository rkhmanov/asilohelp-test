// Шапка из «жидкого стекла» — библиотека Glisse 0.5.0 (npm: glisse, MIT).
// Сайт статичный, поэтому React берём с esm.sh через importmap, а Glisse лежит в vendor/glisse.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Glass } from "glisse";

// ?glass=0 — показать прежнюю шапку (матовое стекло) для сравнения
const off = new URLSearchParams(location.search).get("glass") === "0";
const hdr = document.querySelector(".hdr");
if (hdr && !off) {
  const host = document.createElement("div");
  host.className = "hdr__glass-host";
  host.setAttribute("aria-hidden", "true");
  hdr.prepend(host);
  createRoot(host).render(createElement(Glass, { className: "hdr__glass" }));
  hdr.classList.add("hdr--glisse");
}
