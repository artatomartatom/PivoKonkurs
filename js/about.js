/* Поведение только страницы «О конкурсе». */
(function () {
  'use strict';

  // Измеряем в px: масштаб rem в общей теме меняется на мобильных экранах.
  var header = document.getElementById('siteHeader');
  function syncPageHeader() {
    document.documentElement.style.setProperty('--about-header-h', header.offsetHeight + 'px');
  }
  syncPageHeader();
  window.addEventListener('resize', syncPageHeader);
  if ('ResizeObserver' in window) new ResizeObserver(syncPageHeader).observe(header);

  // Общие header/footer не дублируются; подсветка относится к текущей странице.
  document.querySelectorAll('.nav a, .footer__nav a').forEach(function (link) {
    if (link.getAttribute('href') === 'about.html') {
      link.setAttribute('aria-current', 'page');
    }
  });

  // Состояние аккордеона из общей темы синхронизируем для скринридеров.
  document.querySelector('.cats__acc').addEventListener('click', function (event) {
    var head = event.target.closest('.acc__head');
    if (!head) return;
    var body = document.getElementById(head.getAttribute('aria-controls'));
    var open = head.getAttribute('aria-expanded') === 'true';
    body.setAttribute('aria-hidden', String(!open));
    body.inert = !open;
  });

  var dialog = document.querySelector('[data-material-dialog]');
  var title = document.querySelector('[data-material-title]');
  var previousFocus;
  var previousOverflow;
  document.querySelectorAll('[data-about-material]').forEach(function (button) {
    button.addEventListener('click', function () {
      previousFocus = button;
      previousOverflow = document.body.style.overflow;
      title.textContent = button.getAttribute('data-about-material');
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    });
  });
  // Native dialog обеспечивает удержание фокуса и закрытие по Escape.
  dialog.addEventListener('click', function (event) {
    var box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right ||
        event.clientY < box.top || event.clientY > box.bottom) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', function () {
    document.body.style.overflow = previousOverflow || '';
    if (previousFocus) previousFocus.focus({ preventScroll: true });
  });

  var pageUrl = window.location.href.split('#')[0];
  var shareText = 'О конкурсе РОСГЛАВПИВО® — Главное Пиво России';
  document.querySelector('[data-share-telegram]').href =
    'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(shareText);
  document.querySelector('[data-share-vk]').href =
    'https://vk.com/share.php?url=' + encodeURIComponent(pageUrl) + '&title=' + encodeURIComponent(shareText);

  var copy = document.querySelector('[data-about-copy]');
  var status = document.querySelector('[data-share-status]');
  copy.addEventListener('click', function () {
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
