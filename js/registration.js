/* Демонстрационная регистрация. Нет приёмника, отправки данных и выставления счёта. */
(function () {
  'use strict';
  var header = document.getElementById('siteHeader');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function syncHeader() {
    document.documentElement.style.setProperty('--registration-header-h', header.offsetHeight + 'px');
  }
  syncHeader();
  window.addEventListener('resize', syncHeader);
  if ('ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);
  document.querySelectorAll('.nav a, .footer__nav a').forEach(function (link) {
    if (link.getAttribute('href') === 'registration.html') link.setAttribute('aria-current', 'page');
  });

  function focusAndScroll(target) {
    if (!target.hasAttribute('tabindex') && !target.matches('input, select, textarea, button')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 24),
      behavior: reducedMotion ? 'instant' : 'smooth'
    });
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
    focusAndScroll(target);
  }, true);

  // Прямые ссылки с других страниц: нативный скролл учитывает scroll-margin-top.
  if (window.location.hash) {
    var initialTarget = document.getElementById(window.location.hash.slice(1));
    if (initialTarget) {
      if (!initialTarget.hasAttribute('tabindex')) initialTarget.setAttribute('tabindex', '-1');
      initialTarget.focus({ preventScroll: true });
    }
  }

  var form = document.getElementById('entryForm');
  var samples = form.querySelector('[data-samples]');
  var template = document.getElementById('sample-template');
  var nextKey = 2;
  var attempted = false;
  var errorSignature = '';
  var errorBox = form.querySelector('[data-form-errors]');
  var errorsList = form.querySelector('[data-errors-list]');
  var sampleStatus = form.querySelector('[data-sample-status]');
  var success = document.querySelector('[data-registration-success]');
  var numberFormat = new Intl.NumberFormat('ru-RU');

  function updateSamples() {
    var rows = samples.querySelectorAll('[data-sample]');
    rows.forEach(function (row, index) {
      row.querySelector('[data-sample-number]').textContent = index + 1;
      var remove = row.querySelector('[data-remove-sample]');
      remove.disabled = rows.length === 1;
      remove.setAttribute('aria-label', 'Удалить образец ' + (index + 1));
    });
    document.querySelector('[data-sample-count]').textContent = rows.length;
    document.querySelector('[data-sample-total]').textContent = numberFormat.format(rows.length * 25000) + ' ₽';
  }
  form.querySelector('[data-add-sample]').addEventListener('click', function () {
    var key = nextKey++;
    var html = template.innerHTML.replace(/__KEY__/g, key);
    samples.insertAdjacentHTML('beforeend', html);
    updateSamples();
    var row = samples.lastElementChild;
    sampleStatus.textContent = 'Добавлен образец ' + samples.children.length;
    focusAndScroll(row.querySelector('input'));
  });
  samples.addEventListener('click', function (event) {
    var button = event.target.closest('[data-remove-sample]');
    if (!button || samples.children.length <= 1) return;
    var row = button.closest('[data-sample]');
    var nextRow = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    updateSamples();
    if (attempted) validateForm();
    sampleStatus.textContent = 'Образец удалён. Всего образцов: ' + samples.children.length;
    focusAndScroll(nextRow.querySelector('input'));
  });
  document.getElementById('entry-inn').addEventListener('input', function (event) {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 12);
  });

  // Локальная маска без автоподстановки на focus, чтобы вставка полного
  // номера не объединялась с префиксом. Общая форма главной не затрагивается.
  var phone = document.getElementById('entry-phone');
  phone.addEventListener('input', function () {
    var digits = phone.value.replace(/\D/g, '');
    if (!digits) { phone.value = ''; return; }
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

  function validationMessage(field) {
    var value = field.value.trim();
    if (field.required && ((field.type === 'checkbox' && !field.checked) || !value)) {
      return field.type === 'checkbox' ? 'Необходимо подтвердить согласие.' :
        field.tagName === 'SELECT' ? 'Выберите значение из списка.' : 'Заполните это поле.';
    }
    if (!value) return '';
    if (field.name === 'inn' && !/^(?:\d{10}|\d{12})$/.test(value)) return 'Введите ИНН из 10 или 12 цифр.';
    if (field.id === 'entry-phone' && !/^7\d{10}$/.test(value.replace(/\D/g, ''))) return 'Введите российский номер полностью: +7 и 10 цифр.';
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Введите корректный e-mail, например name@company.ru.';
    if (field.hasAttribute('data-alcohol') && (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value) || Number(value) > 100)) {
      return 'Введите число от 0 до 100 через точку, например 4.3.';
    }
    if (!field.checkValidity()) return 'Проверьте значение поля.';
    return '';
  }
  function setFieldError(field, message) {
    var error = document.querySelector('[data-error-for="' + field.id + '"]');
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }
  function fieldLabel(field) {
    var label = field.labels && field.labels[0];
    var text = label ? label.textContent.replace(/\s+/g, ' ').replace(/\s*\*$/, '').trim() : 'Поле';
    var row = field.closest('[data-sample]');
    return row ? 'Образец ' + row.querySelector('[data-sample-number]').textContent + ': ' + text : text;
  }
  function validateForm() {
    var invalid = [];
    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      var message = validationMessage(field);
      setFieldError(field, message);
      if (message) invalid.push({ field: field, message: message });
    });
    // Не пересоздаём ссылки при blur/change с теми же ошибками:
    // иначе переход мышью из поля к сводке теряет целевой элемент.
    var signature = JSON.stringify(invalid.map(function (item) {
      return [item.field.id, fieldLabel(item.field), item.message];
    }));
    errorBox.hidden = !invalid.length;
    if (signature === errorSignature) return invalid;
    errorSignature = signature;
    errorsList.replaceChildren();
    invalid.forEach(function (item) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + item.field.id;
      link.textContent = fieldLabel(item.field) + ' — ' + item.message;
      li.appendChild(link);
      errorsList.appendChild(li);
    });
    errorBox.hidden = !invalid.length;
    return invalid;
  }
  function onEdit(event) {
    if (attempted && event.target.matches('input, select, textarea')) validateForm();
  }
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    attempted = true;
    var invalid = validateForm();
    if (invalid.length) {
      focusAndScroll(invalid[0].field);
      return;
    }
    // Только демонстрация: нет fetch, localStorage, писем, номеров заявки или счёта.
    form.hidden = true;
    success.hidden = false;
    focusAndScroll(success);
  });
  document.querySelector('[data-edit-registration]').addEventListener('click', function () {
    success.hidden = true;
    form.hidden = false;
    focusAndScroll(document.getElementById('entry-company'));
  });
  updateSamples();
  form.querySelector('[data-submit-registration]').disabled = false;

  var dialog = document.querySelector('[data-document-dialog]');
  var previousFocus;
  var previousOverflow;
  document.querySelectorAll('[data-registration-document]').forEach(function (button) {
    button.addEventListener('click', function () {
      previousFocus = button;
      previousOverflow = document.body.style.overflow;
      document.querySelector('[data-document-title]').textContent = button.getAttribute('data-registration-document');
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
  var text = 'Регистрация на конкурс РОСГЛАВПИВО® — Главное Пиво России';
  document.querySelector('[data-share-telegram]').href = 'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(text);
  document.querySelector('[data-share-vk]').href = 'https://vk.com/share.php?url=' + encodeURIComponent(pageUrl) + '&title=' + encodeURIComponent(text);
  document.querySelector('[data-registration-copy]').addEventListener('click', function () {
    var status = document.querySelector('[data-share-status]');
    if (!navigator.clipboard || !window.isSecureContext) { status.textContent = 'Скопируйте адрес из строки браузера.'; return; }
    navigator.clipboard.writeText(pageUrl).then(function () {
      status.textContent = 'Ссылка скопирована';
    }, function () {
      status.textContent = 'Не удалось скопировать. Используйте адресную строку браузера.';
    });
  });
})();
