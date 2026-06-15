(function () {
  var btn = document.getElementById('back-to-top-btn');
  if (!(btn instanceof HTMLButtonElement)) return;

  var showAfter = 320;
  var ticking = false;

  function updateButtonVisibility() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    btn.classList.toggle('is-visible', y > showAfter);
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateButtonVisibility);
      ticking = true;
    }
  }

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  updateButtonVisibility();
})();
