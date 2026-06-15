(function () {
  function initBookmarkScrollIndicators() {
    var panels = document.querySelectorAll('.bookmark-panel');
    panels.forEach(function (panel) {
      var scrollContainer = panel.querySelector('.bookmark-rows');
      var upArrow = panel.querySelector('.scroll-arrow-up');
      var downArrow = panel.querySelector('.scroll-arrow-down');

      if (!(scrollContainer instanceof HTMLElement)) return;
      if (!(upArrow instanceof HTMLElement)) return;
      if (!(downArrow instanceof HTMLElement)) return;

      var rows = scrollContainer;
      var up = upArrow;
      var down = downArrow;

      function updateIndicators() {
        var scrollTop = rows.scrollTop;
        var scrollHeight = rows.scrollHeight;
        var clientHeight = rows.clientHeight;
        var hasScroll = scrollHeight > clientHeight;

        if (hasScroll) {
          up.classList.toggle('is-visible', scrollTop > 2);
          down.classList.toggle('is-visible', scrollTop + clientHeight < scrollHeight - 2);
        } else {
          up.classList.remove('is-visible');
          down.classList.remove('is-visible');
        }
      }

      up.addEventListener('click', function () {
        rows.scrollBy({ top: -80, behavior: 'smooth' });
      });

      down.addEventListener('click', function () {
        rows.scrollBy({ top: 80, behavior: 'smooth' });
      });

      var ticking = false;
      rows.addEventListener('scroll', function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            updateIndicators();
            ticking = false;
          });
          ticking = true;
        }
      });

      updateIndicators();
      window.addEventListener('resize', updateIndicators);
      panel.addEventListener('mouseenter', updateIndicators);
    });
  }

  document.addEventListener('DOMContentLoaded', initBookmarkScrollIndicators);
})();
