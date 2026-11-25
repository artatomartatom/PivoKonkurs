/* Навигация и поведение страницы «Экспертное жюри». */
(function () {
  'use strict';

  var header = document.getElementById('siteHeader');
  function syncHeader() {
    // Фиксированная шапка измеряется в px независимо от адаптивного rem.
    document.documentElement.style.setProperty('--jury-header-h', header.offsetHeight + 'px');
  }
  syncHeader();
  window.addEventListener('resize', syncHeader);
  if ('ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);

  document.querySelectorAll('.nav a, .footer__nav a').forEach(function (link) {
    if (link.getAttribute('href') === 'jury.html') link.setAttribute('aria-current', 'page');
  });

  function focusTarget(target) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  // Сохраняем якорь в URL и переносим фокус вместе с переходом к биографии.
  // Capture не даёт общему скролл-обработчику повторно обработать этот клик.
  document.addEventListener('click', function (event) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute('href');
    var target = document.getElementById(hash.slice(1));
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    focusTarget(target);
    var top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 20;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'instant' : 'smooth' });
  }, true);

  // Прямые ссылки на профили работают и без промежуточного открытия страницы.
  if (window.location.hash) {
    var target = document.getElementById(window.location.hash.slice(1));
    if (target) focusTarget(target);
  }

  var pageUrl = window.location.href.split('#')[0];
  var text = 'Экспертное жюри РОСГЛАВПИВО® — Главное Пиво России';
  document.querySelector('[data-share-telegram]').href =
    'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(text);
  document.querySelector('[data-share-vk]').href =
    'https://vk.com/share.php?url=' + encodeURIComponent(pageUrl) + '&title=' + encodeURIComponent(text);

  document.querySelector('[data-jury-copy]').addEventListener('click', function () {
    var status = document.querySelector('[data-share-status]');
    if (!navigator.clipboard || !window.isSecureContext) {
      status.textContent = 'Скопируйте адрес из строки браузера.';
      return;
    }
    navigator.clipboard.writeText(pageUrl).then(function () {
      status.textContent = 'Ссылка скопирована';
    }, function () {
      status.textContent = 'Не удалось скопировать. Используйте адресную строку браузера.';
    });
  });
})();
