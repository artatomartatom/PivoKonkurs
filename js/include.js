function include(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300) {
    var script = document.currentScript;
    var target = script && script.previousElementSibling;
    if (target) {
      target.outerHTML = xhr.responseText;
    }
  }
}
