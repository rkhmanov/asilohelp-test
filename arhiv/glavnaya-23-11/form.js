// asilohelp — форма заявки → CRM (crm.asilohelp.com/site/lead, код — rkhmanov/asilo-bot, cloudflare/src/sitelead.ts).
// Подключается на любой странице с <form id="form">. Пункт «Что вас интересует» можно выбрать заранее:
// <form id="form" data-interest="Работа с кейсом"> — выберется кнопка с таким текстом.
(() => {
  const API = 'https://crm.asilohelp.com/site/lead';
  const form = document.getElementById('form');
  if (!form) return;
  const $ = sel => form.querySelector(sel);
  const name = $('#f-name'), contact = $('#f-contact'), about = $('#f-about'), consent = $('#f-consent'), sensitive = $('#f-sensitive');
  const typeInput = $('[name="contact_type"]'), submit = $('.submit'), formErr = $('#form-err');
  const submitText = submit.textContent;
  let sending = false;

  // Telegram / E-mail. Без стекла — кнопки .seg; со стеклом glass.js вызывает window.asiloSetContactType.
  const setType = type => {
    typeInput.value = type;
    contact.type = type === 'email' ? 'email' : 'text';
    contact.inputMode = type === 'email' ? 'email' : 'text';
    contact.autocomplete = type === 'email' ? 'email' : 'off';
    contact.placeholder = type === 'email' ? 'name@mail.com' : '@username или +34…';
    clearErr(contact);
  };
  window.asiloSetContactType = setType;
  // заранее выбранный интерес (на страницах услуг)
  const pre = form.dataset.interest;
  if (pre) form.querySelectorAll('.chips button').forEach(x => { const on = x.textContent.trim() === pre; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  form.querySelectorAll('.seg, .chips').forEach(g => g.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    g.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-pressed', x === t); });
    if (g.classList.contains('seg')) setType(t.dataset.type);
  }));

  // ошибки у полей
  const errBox = el => document.getElementById(el.getAttribute('aria-describedby') || 'err-ts');
  function setErr(el, msg) { const b = errBox(el); b.textContent = msg; b.hidden = false; el.setAttribute('aria-invalid', 'true'); el.closest('.field, .consent')?.classList.add('is-invalid'); }
  function clearErr(el) { const b = errBox(el); if (b) { b.hidden = true; b.textContent = ''; } el.removeAttribute('aria-invalid'); el.closest('.field, .consent')?.classList.remove('is-invalid'); }
  [name, contact, about].forEach(el => el.addEventListener('input', () => clearErr(el)));
  consent.addEventListener('change', () => { if (consent.checked) clearErr(consent); });
  const tsErr = document.getElementById('err-ts');
  window.asiloTsOk = () => { tsErr.hidden = true; };
  window.asiloTsReset = () => {};

  // Telegram: @username (5–32: латиница, цифры, _), ссылка t.me/… или телефон +7…15 цифр
  function normTelegram(v) {
    v = v.trim().replace(/^https?:\/\//i, '').replace(/^(t\.me|telegram\.me)\//i, '@');
    const phone = v.replace(/[\s\-().]/g, '');
    if (/^\+\d{7,15}$/.test(phone)) return phone;
    const u = v.replace(/^@/, '');
    if (/^[A-Za-z0-9_]{5,32}$/.test(u)) return '@' + u;
    return null;
  }
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    [name, contact, about, consent].forEach(clearErr);
    const bad = [];
    const n = name.value.trim();
    if (!n) { setErr(name, 'Напишите, как к вам обращаться.'); bad.push(name); }
    else if (n.length > 80) { setErr(name, 'Слишком длинно — не больше 80 знаков.'); bad.push(name); }
    let c = contact.value.trim();
    if (typeInput.value === 'email') {
      if (!c) { setErr(contact, 'Укажите e-mail, чтобы мы могли ответить.'); bad.push(contact); }
      else if (!EMAIL.test(c) || c.length > 254) { setErr(contact, 'Проверьте e-mail — например, name@mail.com.'); bad.push(contact); }
    } else {
      const t = c && normTelegram(c);
      if (!c) { setErr(contact, 'Укажите Telegram, чтобы мы могли ответить.'); bad.push(contact); }
      else if (!t) { setErr(contact, 'Укажите @username (5–32 знака: латиница, цифры, _) или телефон в формате +34…'); bad.push(contact); }
      else c = t;
    }
    if (about.value.length > 2000) { setErr(about, 'Слишком длинно — не больше 2000 знаков.'); bad.push(about); }
    if (!consent.checked) { setErr(consent, 'Без согласия на обработку данных мы не сможем ответить на заявку.'); bad.push(consent); }
    return { bad, contact: c };
  }
  const token = () => (window.turnstile && turnstile.getResponse()) || form.querySelector('[name="cf-turnstile-response"]')?.value || '';
  function focusEl(el) {
    // со стеклом галочка спрятана под тумблером — фокус на тумблер
    const target = el.classList.contains('consent__native') ? el.parentElement.querySelector('.consent__switch [role="switch"], .consent__switch button, .consent__switch input') || el : el;
    target.focus({ preventScroll: true });
    (el.closest('.field, .consent') || el).scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function busy(on) {
    sending = on;
    submit.disabled = on;
    submit.setAttribute('aria-busy', on);
    form.setAttribute('aria-busy', on);
    submit.textContent = on ? 'Отправляем…' : submitText;
  }
  function fail(msg) {
    formErr.textContent = msg; formErr.hidden = false;
    try { window.turnstile && turnstile.reset(); } catch (_) {}
  }
  const GENERIC = 'Не получилось отправить заявку. Попробуйте ещё раз через минуту или напишите нам в Telegram: @ASILOhelperBot.';

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    formErr.hidden = true;
    const { bad, contact: c } = validate();
    const tok = token();
    if (!tok && !bad.length) { tsErr.textContent = 'Подтвердите, что вы не робот.'; tsErr.hidden = false; }
    if (bad.length) { focusEl(bad[0]); return; }
    if (!tok) { tsErr.scrollIntoView({ block: 'center' }); return; }
    tsErr.hidden = true;
    busy(true);
    const chip = form.querySelector('.chips button.on');
    const body = {
      name: name.value.trim(), contact_type: typeInput.value, contact: c,
      interest: chip ? chip.textContent.trim() : 'Пока не знаю', about: about.value.trim(),
      consent: true, sensitive_consent: sensitive.checked, token: tok,
      website: form.querySelector('[name="website"]').value, page: location.href,
    };
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      let data = null; try { data = await res.json(); } catch (_) {}
      if (res.ok && data && data.ok) { done(data.code, body.contact_type); return; }
      fail((data && data.error) || (res.status === 403 ? 'Не получилось пройти проверку на робота. Отметьте галочку ещё раз и отправьте заявку.'
        : res.status === 429 ? 'Слишком много заявок подряд. Подождите пару минут и попробуйте снова.' : GENERIC));
    } catch (_) { fail(GENERIC); }
    finally { clearTimeout(timer); busy(false); }
  });

  function done(code, type) {
    const ok = $('.form__ok');
    if (code) { const p = $('.form__code'); p.querySelector('span').textContent = code; p.hidden = false; }
    $('.form__next').firstChild.textContent = (type === 'email' ? 'Менеджерка напишет вам на почту в рабочий день. ' : 'Менеджерка напишет вам в Telegram в рабочий день. ') + 'Если за два рабочих дня никто не ответил — напишите нам в ';
    $('.form__body').style.display = 'none'; ok.style.display = 'block'; ok.focus({ preventScroll: true });
    form.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
})();
