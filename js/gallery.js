/* Полная галерея: навигация и публикация страницы. */
(function () {
  'use strict';
  var header = document.getElementById('siteHeader');
  function syncHeader() {
    document.documentElement.style.setProperty('--gallery-header-h', header.offsetHeight + 'px');
  }
  syncHeader();
  window.addEventListener('resize', syncHeader);
  if ('ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);
  document.querySelectorAll('.nav a, .footer__nav a').forEach(function (link) {
    if (link.getAttribute('href') === 'gallery.html') link.setAttribute('aria-current', 'page');
  });

  function focusTarget(target) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (event) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.location.hash !== link.hash) window.history.pushState(null, '', link.hash);
    focusTarget(target);
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 20),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  }, true);
  if (window.location.hash) {
    var target = document.getElementById(window.location.hash.slice(1));
    if (target) focusTarget(target);
  }

  var pageUrl = window.location.href.split('#')[0];
  var text = 'Галерея конкурса РОСГЛАВПИВО® — Главное Пиво России';
  document.querySelector('[data-share-telegram]').href = 'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(text);
  document.querySelector('[data-share-vk]').href = 'https://vk.com/share.php?url=' + encodeURIComponent(pageUrl) + '&title=' + encodeURIComponent(text);
  document.querySelector('[data-gallery-copy]').addEventListener('click', function () {
    var status = document.querySelector('[data-share-status]');
    if (!navigator.clipboard || !window.isSecureContext) { status.textContent = 'Скопируйте адрес из строки браузера.'; return; }
    navigator.clipboard.writeText(pageUrl).then(function () {
      status.textContent = 'Ссылка скопирована';
    }, function () {
      status.textContent = 'Не удалось скопировать. Используйте адресную строку браузера.';
    });
  });
})();

/* Отдельный native dialog: удержание фокуса, Escape, стрелки и свайпы. */
(function () {
  'use strict';
  var links = Array.from(document.querySelectorAll('[data-photo]'));
  var dialog = document.querySelector('[data-photo-viewer]');
  var image = dialog.querySelector('[data-photo-image]');
  var counter = dialog.querySelector('[data-photo-counter]');
  var original = dialog.querySelector('[data-photo-original]');
  var notice = dialog.querySelector('[data-photo-notice]');
  var stage = dialog.querySelector('[data-photo-stage]');
  var current = 0;
  var opener;
  var previousOverflow;

  function show(index) {
    current = (index + links.length) % links.length;
    var link = links[current];
    image.classList.add('is-loading');
    notice.hidden = true;
    image.src = link.href;
    image.alt = 'Фотоархив конкурса РОСГЛАВПИВО® — кадр ' + (current + 1);
    counter.textContent = 'Фото ' + (current + 1);
    original.href = link.href;
    if (image.complete && image.naturalWidth) image.classList.remove('is-loading');
  }
  image.addEventListener('load', function () { image.classList.remove('is-loading'); });
  image.addEventListener('error', function () { image.classList.remove('is-loading'); notice.hidden = false; });
  links.forEach(function (link, index) {
    link.addEventListener('click', function (event) {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      previousOverflow = document.body.style.overflow;
      show(index);
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      dialog.querySelector('.photo-viewer__close').focus();
    });
  });
  dialog.querySelector('[data-photo-prev]').addEventListener('click', function () { show(current - 1); });
  dialog.querySelector('[data-photo-next]').addEventListener('click', function () { show(current + 1); });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'Tab') {
      var controls = Array.from(dialog.querySelectorAll('a[href], button:not(:disabled)'));
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', function () {
    document.body.style.overflow = previousOverflow || '';
    if (opener) opener.focus({ preventScroll: true });
  });
  var touch;
  stage.addEventListener('touchstart', function (event) {
    touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  stage.addEventListener('touchend', function (event) {
    if (!touch || event.touches.length) { touch = null; return; }
    var dx = event.changedTouches[0].clientX - touch.x;
    var dy = event.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    touch = null;
  }, { passive: true });
  stage.addEventListener('touchcancel', function () { touch = null; }, { passive: true });
})();
