(function () {
  var prefetched = new Set();
  var links = Array.from(document.querySelectorAll('[data-sidebar-filter-link]'));
  var toggles = Array.from(document.querySelectorAll('[data-category-tree-toggle]'));

  function isPlainLeftClick(event) {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    );
  }

  function markPending(link) {
    var kind = link.dataset.filterKind;
    var returnsToAllPosts = link.dataset.filterActive === 'true';

    for (var i = 0; i < links.length; i++) {
      var item = links[i];
      var itemKind = item.dataset.filterKind;
      if (itemKind === 'category') item.classList.remove('cat-link--active');
      if (itemKind === 'category') item.classList.remove('category-tree-link--active');
      if (itemKind === 'tag') item.classList.remove('tag-box--active');
      item.removeAttribute('aria-current');
    }

    if (!returnsToAllPosts && kind === 'category') {
      link.classList.add('cat-link--active');
      link.classList.add('category-tree-link--active');
      link.setAttribute('aria-current', 'page');
    }

    if (!returnsToAllPosts && kind === 'tag') {
      link.classList.add('tag-box--active');
      link.setAttribute('aria-current', 'page');
    }

    var main = document.querySelector('#main-content');
    if (main) main.setAttribute('aria-busy', 'true');
  }

  function prefetch(link) {
    var href = link.href;
    if (!href || prefetched.has(href)) return;

    var target = new URL(href, window.location.href);
    if (target.origin !== window.location.origin) return;

    var hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = target.href;
    document.head.appendChild(hint);
    prefetched.add(href);
  }

  for (var j = 0; j < links.length; j++) {
    (function (link) {
      link.addEventListener('click', function (event) {
        if (!isPlainLeftClick(event)) return;
        markPending(link);
      });
      link.addEventListener('pointerenter', function () {
        prefetch(link);
      }, { passive: true });
      link.addEventListener('focus', function () {
        prefetch(link);
      }, { passive: true });
    })(links[j]);
  }

  for (var k = 0; k < toggles.length; k++) {
    (function (toggle) {
      toggle.addEventListener('click', function () {
        var controls = toggle.getAttribute('aria-controls');
        if (!controls) return;

        var children = document.getElementById(controls);
        if (!children) return;

        var willOpen = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        children.hidden = !willOpen;
      });
    })(toggles[k]);
  }
})();
