/* РОСГЛАВПИВО® — Главное Пиво России 2027 · main.js */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Хедер: высота + скрытие при скролле вниз ---------- */
  var header = document.getElementById('siteHeader');
  function syncHeaderHeight() {
    if (!header) return;
    document.documentElement.style.setProperty('--header-h', header.offsetHeight / 10 + 'rem');
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  var lastY = window.pageYOffset;
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset;
    if (header) {
      if (y > 200 && y > lastY) header.classList.add('is-hidden');
      else header.classList.remove('is-hidden');
    }
    lastY = y;
  }, { passive: true });

  /* ---------- 2. Бургер ---------- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('mainNav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('nav-open', open);
      syncHeaderHeight();
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
        syncHeaderHeight();
      }
    });
  }

  /* ---------- 3. Слайдер в hero ---------- */
  var slider = document.querySelector('[data-slider]');
  if (slider) {
    var track = slider.querySelector('[data-track]');
    var slides = [].slice.call(slider.querySelectorAll('[data-slide]'));
    var dotsBox = slider.querySelector('[data-dots]');
    var prev = slider.querySelector('[data-prev]');
    var next = slider.querySelector('[data-next]');
    var index = 0;
    var timer = null;
    var AUTOPLAY = 9000;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Слайд ' + (i + 1));
      b.addEventListener('click', function () { go(i); restart(); });
      dotsBox.appendChild(b);
    });
    var dots = [].slice.call(dotsBox.children);

    function render() {
      track.style.transform = 'translate3d(-' + index * 100 + '%,0,0)';
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === index);
        d.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
      slides.forEach(function (s, i) { s.setAttribute('aria-hidden', i === index ? 'false' : 'true'); });
      slider.setAttribute('data-active', index);
    }
    function go(i) { index = (i + slides.length) % slides.length; render(); }
    function start() { if (reduceMotion) return; stop(); timer = setInterval(function () { go(index + 1); }, AUTOPLAY); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    if (prev) prev.addEventListener('click', function () { go(index - 1); restart(); });
    if (next) next.addEventListener('click', function () { go(index + 1); restart(); });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    /* свайп */
    var startX = null;
    slider.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { go(index + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    /* колесико (опционально, как в прототипе) */
    var wheelLock = false;
    slider.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) < 24 || wheelLock) return;
      if (e.target.closest('a, button')) return;
      wheelLock = true;
      go(index + (e.deltaY > 0 ? 1 : -1));
      restart();
      setTimeout(function () { wheelLock = false; }, 700);
    }, { passive: true });

    /* клавиатура */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(index - 1); restart(); }
      if (e.key === 'ArrowRight') { go(index + 1); restart(); }
    });

    render();
    start();
  }

  /* ---------- 3b. Таймер до закрытия заявок ---------- */
  var cdDays = document.querySelector('[data-cd-days]');
  if (cdDays) {
    var deadline = new Date('2026-12-31T23:59:59+03:00');
    var left = Math.ceil((deadline - new Date()) / 86400000);
    if (left > 0) {
      cdDays.textContent = left;
    } else {
      var box = document.querySelector('[data-countdown]');
      if (box) box.textContent = 'Приём заявок открыт';
    }
  }

  /* ---------- 4. Категории пива ---------- */
  var catSelect = document.querySelector('[data-cat-select]');
  if (catSelect) {
    var showPanel = function (id) {
      [].forEach.call(document.querySelectorAll('[data-panel]'), function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-panel') === id);
      });
    };
    catSelect.addEventListener('change', function () {
      showPanel(catSelect.value);
    });
    showPanel(catSelect.value);
  }

  /* ---------- 5. Появление блоков при скролле ---------- */
  var revealEls = [].slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 0.07 + 's';
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 6. SEO-текст ---------- */
  var seoToggle = document.querySelector('[data-seo-toggle]');
  var seoBlock = document.querySelector('.seo');
  if (seoToggle && seoBlock) {
    seoToggle.addEventListener('click', function () {
      var open = seoBlock.classList.toggle('is-open');
      seoToggle.textContent = open ? 'Свернуть' : 'Читать полностью';
    });
  }

  /* ---------- 7. Cookie ---------- */
  var cookie = document.querySelector('[data-cookie]');
  var cookieOk = document.querySelector('[data-cookie-ok]');
  try {
    if (cookie && !localStorage.getItem('rgp_cookie_ok')) {
      setTimeout(function () { cookie.hidden = false; }, 1200);
    }
  } catch (err) { /* приватный режим */ }
  if (cookieOk) {
    cookieOk.addEventListener('click', function () {
      if (cookie) cookie.hidden = true;
      try { localStorage.setItem('rgp_cookie_ok', '1'); } catch (err) {}
    });
  }

  /* ---------- 8. Модалка видео ---------- */
  var modal = document.querySelector('[data-modal]');
  var modalCaption = document.querySelector('[data-modal-caption]');
  var modalClose = document.querySelector('[data-modal-close]');
  function openModal(title) {
    if (!modal) return;
    if (modalCaption && title) modalCaption.textContent = title;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  [].forEach.call(document.querySelectorAll('[data-video]'), function (btn) {
    btn.addEventListener('click', function () { openModal(btn.getAttribute('data-video')); });
  });
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ---------- 9. Маска телефона + отправка формы ---------- */
  var phone = document.querySelector('input[name="phone"]');
  if (phone) {
    phone.addEventListener('input', function () {
      var digits = phone.value.replace(/\D/g, '');
      if (digits[0] === '8') digits = '7' + digits.slice(1);
      if (digits[0] !== '7') digits = '7' + digits;
      digits = digits.slice(0, 11);
      var out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
      if (digits.length >= 8) out += '-' + digits.slice(7, 9);
      if (digits.length >= 10) out += '-' + digits.slice(9, 11);
      phone.value = out;
    });
    phone.addEventListener('focus', function () {
      if (!phone.value) phone.value = '+7 (';
    });
  }

  var form = document.getElementById('regForm');
  if (form) {
    /* ENDPOINT: адрес приёмника заявок (CRM/почтовый скрипт). Пока пусто —
       форма работает в демо-режиме: валидирует и показывает успех без отправки. */
    var FORM_ENDPOINT = '';
    var CAPTCHA_SITEKEY = ''; // ← sitekey Яндекс SmartCaptcha

    var submitBtn = form.querySelector('button[type="submit"]');
    var successBox = form.querySelector('[data-success]');
    var errorBox = form.querySelector('[data-form-error]');

    function showError(msg) {
      if (!errorBox) return;
      errorBox.textContent = msg;
      errorBox.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorBox) errorBox.hidden = true;

      var name = form.querySelector('input[name="name"]');
      var tel = form.querySelector('input[name="phone"]');
      var agree = form.querySelector('.check input');
      var email = form.querySelector('input[name="email"]');
      var ok = true;

      [name, tel].forEach(function (f) {
        if (!f) return;
        var empty = !f.value.trim() || (f === tel && f.value.replace(/\D/g, '').length < 11);
        f.style.borderColor = empty ? '#ea3636' : '';
        if (empty) ok = false;
      });
      if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        email.style.borderColor = '#ea3636'; ok = false;
      } else if (email) {
        email.style.borderColor = '';
      }
      if (agree && !agree.checked) { ok = false; agree.parentNode.style.color = '#ea3636'; }
      else if (agree) { agree.parentNode.style.color = ''; }

      if (!ok) {
        var firstBad = form.querySelector('[style*="rgb(234, 54, 54)"]');
        if (firstBad) firstBad.focus({ preventScroll: false });
        return;
      }

      // демо-режим: приёмника нет — показываем успех локально
      function done() {
        form.classList.add('is-sent');
        if (successBox) {
          successBox.hidden = false;
          successBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }
      }

      if (!FORM_ENDPOINT) { done(); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('is-loading'); }
      fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.reset(); if (tel) tel.value = '';
          done();
        })
        .catch(function () {
          showError('Не удалось отправить заявку. Позвоните по телефону 8-800-2017-226 или напишите на info@росглавпиво.рф.');
        })
        .then(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
        });
    });
  }

  /* ---------- 10. Плавный скролл с учётом фикс. шапки ---------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute('href');
    if (hash === '#' || hash.length < 2) return;
    var target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.pageYOffset - (header ? header.offsetHeight : 0) - 20;
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

})();

/* ---------------------------------------------------------------
   Карта: API Яндекс.Карт грузится только по кнопке (не тормозит
   загрузку страницы). Ключ подставляется сюда: API_KEY.
---------------------------------------------------------------- */
(function () {
  var box = document.querySelector('[data-map]');
  var btn = document.querySelector('[data-map-load]');
  if (!box || !btn) return;

  var API_KEY = ''; // ← ключ JavaScript API Яндекс.Карт
  var scriptRequested = false;

  function initMap() {
    if (!window.ymaps) return;
    ymaps.ready(function () {
      var lat = parseFloat(box.getAttribute('data-map-lat')) || 55.7959;
      var lon = parseFloat(box.getAttribute('data-map-lon')) || 37.5055;
      var map = new ymaps.Map(box.querySelector('[data-map-canvas]'), {
        center: [lat, lon], zoom: 16, controls: ['zoomControl', 'fullscreenControl']
      }, { suppressMapOpenBlock: true });
      var placemark = new ymaps.Placemark([lat, lon], {
        hintContent: 'РОСБИОТЕХ', balloonContent: 'Москва, ул. Врубеля, 12'
      }, { preset: 'islands#orangeDotIcon' });
      map.geoObjects.add(placemark);
      box.classList.add('is-loaded');
    });
  }

  function loadApi() {
    if (scriptRequested) return;
    scriptRequested = true;
    if (!API_KEY) {
      // ключа нет — показываем понятное состояние вместо пустой карты
      var note = box.querySelector('[data-map-note]');
      if (note) note.textContent = 'Для интерактивной карты нужен ключ JavaScript API Яндекс.Карт';
      btn.textContent = 'Открыть адрес';
      btn.disabled = true;
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?apikey=' + encodeURIComponent(API_KEY) + '&lang=ru_RU';
    s.onload = initMap;
    s.onerror = function () {
      var note = box.querySelector('[data-map-note]');
      if (note) note.textContent = 'Не удалось загрузить карту — откройте адрес по ссылке';
    };
    document.head.appendChild(s);
  }

  btn.addEventListener('click', loadApi);
})();

/* ---------------------------------------------------------------
   Заглушки документов: ссылки без файла не должны уводить наверх
---------------------------------------------------------------- */
[].forEach.call(document.querySelectorAll('[data-doc-placeholder]'), function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    var tip = a.querySelector('.doc__name');
    if (!tip) return;
    tip.setAttribute('data-tip', 'Файл появится после публикации');
    tip.classList.add('is-tip');
    setTimeout(function () { tip.classList.remove('is-tip'); }, 2200);
  });
});

/* ---------------------------------------------------------------
   Пузырьки на кнопках — слой создаётся один раз, 7 span'ов, CSS-анимация
---------------------------------------------------------------- */
[].forEach.call(document.querySelectorAll('.btn__bg'), function (bg) {
  if (bg.querySelector('.bubbles')) return;
  var layer = document.createElement('span');
  layer.className = 'bubbles';
  layer.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < 7; i++) layer.appendChild(document.createElement('i'));
  bg.appendChild(layer);
});

/* ---------------------------------------------------------------
   Всплывающее окно с обратным отсчётом до закрытия регистрации
   - показываем один раз на сессию/пока не закрыто
   - если закрыть крестиком — сохраняем в localStorage и больше не мешаем
   - если просто закрыть сайт — при новом визите покажется снова
---------------------------------------------------------------- */
function initDeadlinePopup() {
  var pop = document.querySelector('[data-deadline-popup]');
  if (!pop) return;
  var KEY = 'rgp_deadline_closed_v1';
  var deadline = new Date('2026-12-31T23:59:59+03:00');

  var dayEl = pop.querySelector('[data-pop-days]');
  var hourEl = pop.querySelector('[data-pop-hours]');

  function tick() {
    var diff = deadline - new Date();
    if (diff < 0) diff = 0;
    var d = Math.floor(diff / 864e5);
    var h = Math.floor(diff % 864e5 / 36e5);
    if (dayEl) dayEl.textContent = d;
    if (hourEl) hourEl.textContent = h;
  }
  tick();
  setInterval(tick, 60000);

  function close() {
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }

  var closed = false;
  try { closed = localStorage.getItem(KEY) === '1'; } catch (e) {}

  if (!closed) {
    setTimeout(function () {
      pop.classList.add('is-open');
      pop.setAttribute('aria-hidden', 'false');
      var btn = pop.querySelector('[data-pop-cta]');
      if (btn) btn.focus({ preventScroll: true });
    }, 1200);
  }

  pop.addEventListener('click', function (e) {
    if (e.target.closest('[data-pop-close]') || e.target === pop) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pop.classList.contains('is-open')) close();
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDeadlinePopup);
} else {
  initDeadlinePopup();
}

/* ---------------------------------------------------------------
   Кнопка «наверх» — появляется после первого экрана
---------------------------------------------------------------- */
(function () {
  var up = document.querySelector('[data-to-top]');
  if (!up) return;
  var ticking = false;
  function update() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    up.classList.toggle('is-visible', y > window.innerHeight * 0.85);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
  up.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ---------------------------------------------------------------
   Копирование контактов в буфер обмена
---------------------------------------------------------------- */
[].forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
  btn.addEventListener('click', function () {
    var text = btn.getAttribute('data-copy');
    var done = function () {
      var old = btn.getAttribute('data-label') || btn.textContent;
      btn.classList.add('is-copied');
      btn.textContent = 'Скопировано';
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.textContent = old;
      }, 1800);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  });
});

/* ---------------------------------------------------------------
   Яндекс SmartCaptcha — подключается по sitekey.
   Пока sitekey не задан, показывается заглушка из разметки.
---------------------------------------------------------------- */
(function () {
  var slot = document.querySelector('[data-captcha]');
  if (!slot) return;
  var SITEKEY = (typeof CAPTCHA_SITEKEY !== 'undefined' && CAPTCHA_SITEKEY) || '';
  if (!SITEKEY) return;
  var s = document.createElement('script');
  s.src = 'https://smartcaptcha.yandexcloud.net/captcha.js?render=onload&onload=onCaptchaLoad';
  s.defer = true;
  document.head.appendChild(s);
  window.onCaptchaLoad = function () {
    slot.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'smart-captcha';
    box.setAttribute('data-sitekey', SITEKEY);
    slot.appendChild(box);
    window.smartCaptcha && window.smartCaptcha.render(box, { sitekey: SITEKEY, hl: 'ru' });
  };
})();

/* ---------------------------------------------------------------
   Категории: аккордеон групп стилей (одна открытая по умолчанию)
---------------------------------------------------------------- */
(function () {
  var acc = document.querySelector('.cats__acc');
  if (!acc) return;

  function setOpen(item, open, animate) {
    var body = item.querySelector('.acc__body');
    var head = item.querySelector('.acc__head');
    var list = item.querySelector('.acc__list');
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!animate) { body.style.transition = 'none'; }
    body.style.height = open ? list.scrollHeight + 'px' : '0px';
    if (!animate) {
      void body.offsetHeight;
      body.style.transition = '';
      return;
    }
    if (open) {
      // после анимации фиксируем auto, чтобы содержимое не обрезалось
      var done = function () {
        body.style.height = 'auto';
        body.removeEventListener('transitionend', done);
      };
      body.addEventListener('transitionend', done);
    }
  }

  [].forEach.call(acc.querySelectorAll('.acc__item'), function (item) {
    setOpen(item, item.classList.contains('is-open'), false);
  });

  acc.addEventListener('click', function (e) {
    var head = e.target.closest('.acc__head');
    if (!head) return;
    var item = head.parentElement;
    setOpen(item, !item.classList.contains('is-open'), true);
  });

  window.addEventListener('resize', function () {
    [].forEach.call(acc.querySelectorAll('.acc__item.is-open .acc__body'), function (b) {
      var list = b.parentElement.querySelector('.acc__list');
      if (b.style.height !== 'auto') b.style.height = list.scrollHeight + 'px';
    });
  });
})();

/* ---------------------------------------------------------------
   Галерея: просмотрщик с листанием (92 кадра)
---------------------------------------------------------------- */
(function () {
  var lb = document.querySelector('[data-lightbox]');
  if (!lb) { console.warn('lightbox: разметка не найдена'); return; }
  lb.setAttribute('data-lb-ready', '1');
  var img = lb.querySelector('[data-lb-img]');
  var counter = lb.querySelector('[data-lb-counter]');
  var thumbs = lb.querySelector('[data-lb-thumbs]');
  var TOTAL = 92;
  var current = 1;
  var thumbsBuilt = false;

  function big(i) { return 'assets/img/gallery/' + i + '-big.jpg'; }
  function small(i) { return 'assets/img/gallery/' + i + '.jpg'; }

  function buildThumbs() {
    if (thumbsBuilt) return;
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= TOTAL; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lb__thumb';
      b.setAttribute('data-lb-go', i);
      b.setAttribute('aria-label', 'Фото ' + i);
      var im = document.createElement('img');
      im.src = small(i);
      im.alt = '';
      im.loading = 'lazy';
      b.appendChild(im);
      frag.appendChild(b);
    }
    thumbs.appendChild(frag);
    thumbsBuilt = true;
  }

  function show(i) {
    current = Math.min(TOTAL, Math.max(1, i));
    img.classList.remove('is-ready');
    img.src = big(current);
    img.alt = 'Фото конкурса ' + current + ' из ' + TOTAL;
    if (img.complete) img.classList.add('is-ready');
    counter.textContent = current + ' / ' + TOTAL;
    var act = thumbs.querySelector('.is-active');
    if (act) act.classList.remove('is-active');
    var next = thumbs.querySelector('[data-lb-go="' + current + '"]');
    if (next) {
      next.classList.add('is-active');
      if (lb.classList.contains('is-open')) {
        next.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    }
  }

  img.addEventListener('load', function () { img.classList.add('is-ready'); });

  function open(i) {
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    buildThumbs();
    show(i);
  }
  function close() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-gallery-open]');
    if (opener) {
      e.preventDefault();
      open(parseInt(opener.getAttribute('data-gallery-open'), 10) || 1);
    }
  });

  lb.addEventListener('click', function (e) {
    if (e.target.closest('[data-lb-close]')) return close();
    if (e.target.closest('[data-lb-prev]')) return show(current - 1);
    if (e.target.closest('[data-lb-next]')) return show(current + 1);
    var go = e.target.closest('[data-lb-go]');
    if (go) return show(parseInt(go.getAttribute('data-lb-go'), 10));
    if (e.target === lb || e.target.classList.contains('lb__stage')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // свайпы на мобильных
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    sx = null;
  }, { passive: true });
})();
