(function () {
  var btn = document.getElementById('footer-prefs-trigger');
  if (!btn) return;
  btn.addEventListener('click', function () {
    document.dispatchEvent(new CustomEvent('open-site-prefs', { detail: { triggerId: btn.id } }));
  });
})();
