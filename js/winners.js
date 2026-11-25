/* Архив победителей: навигация и состояния неопубликованных материалов. */
(function () {
  'use strict';
  var header = document.getElementById('siteHeader');
  function syncHeader() {
    document.documentElement.style.setProperty('--winners-header-h', header.offsetHeight + 'px');
  }
  syncHeader();
  window.addEventListener('resize', syncHeader);
  if ('ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);
  document.querySelectorAll('.nav a, .footer__nav a').forEach(function (link) {
    if (link.getAttribute('href') === 'winners.html') link.setAttribute('aria-current', 'page');
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

  var dialog = document.querySelector('[data-winners-dialog]');
  var previousFocus;
  var previousOverflow;
  document.querySelectorAll('[data-winners-material]').forEach(function (button) {
    button.addEventListener('click', function () {
      previousFocus = button;
      previousOverflow = document.body.style.overflow;
      var video = button.getAttribute('data-material-kind') === 'video';
      document.querySelector('[data-material-title]').textContent = button.getAttribute('data-winners-material');
      document.querySelector('[data-material-type]').textContent = video ? 'Видеоархив конкурса' : 'Протокол итогов конкурса';
      document.querySelector('[data-material-note]').textContent = video
        ? 'Видео пока не опубликовано. В карточке использована иллюстрация из фотоархива, а не кадр видеозаписи. Уточнить доступность видео можно в оргкомитете.'
        : 'Файл протокола пока не опубликован. За официальными результатами и протоколом обратитесь в оргкомитет конкурса.';
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    });
  });
  dialog.addEventListener('click', function (event) {
    var box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', function () {
    document.body.style.overflow = previousOverflow || '';
    if (previousFocus) previousFocus.focus({ preventScroll: true });
  });

  var pageUrl = window.location.href.split('#')[0];
  var text = 'Победители конкурса РОСГЛАВПИВО® — Главное Пиво России';
  document.querySelector('[data-share-telegram]').href = 'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(text);
  document.querySelector('[data-share-vk]').href = 'https://vk.com/share.php?url=' + encodeURIComponent(pageUrl) + '&title=' + encodeURIComponent(text);
  document.querySelector('[data-winners-copy]').addEventListener('click', function () {
    var status = document.querySelector('[data-share-status]');
    if (!navigator.clipboard || !window.isSecureContext) { status.textContent = 'Скопируйте адрес из строки браузера.'; return; }
    navigator.clipboard.writeText(pageUrl).then(function () {
      status.textContent = 'Ссылка скопирована';
    }, function () {
      status.textContent = 'Не удалось скопировать. Используйте адресную строку браузера.';
    });
  });
})();
