window.addEventListener('DOMContentLoaded', function () {
  try {
    var configEl = document.getElementById('bb-post-back-config');
    if (!configEl) return;

    var config = JSON.parse(configEl.textContent || '{}');
    var lang = config.lang || 'en';
    var categoryMapping = config.categoryMapping || {};
    var currentCategory = config.currentCategory || '';

    var backLink = document.getElementById('post-back-link');
    if (!(backLink instanceof HTMLAnchorElement)) return;

    var lastPath = sessionStorage.getItem('bb-last-list');
    var currentPath = window.location.pathname;

    if (!lastPath || lastPath === currentPath || !/^\/[^/]/.test(lastPath)) return;

    function getPathLang(path) {
      if (path.indexOf('/zh-tw/') === 0 || path === '/zh-tw') return 'zh-tw';
      if (path.indexOf('/zh-cn/') === 0 || path === '/zh-cn') return 'zh-cn';
      return 'en';
    }

    var lastLang = getPathLang(lastPath);

    if (lastLang !== lang) {
      var parts = lastPath.split('/').filter(Boolean);
      var hasPrefix = parts[0] === 'zh-tw' || parts[0] === 'zh-cn';

      if (lastPath.indexOf('/categories/') !== -1) {
        var catName = decodeURIComponent(parts[hasPrefix ? 2 : 1] || '');
        var targetCat = categoryMapping[catName] || currentCategory;
        var catPath = '/categories/' + encodeURIComponent(targetCat) + '/1';
        lastPath = lang === 'en' ? catPath : '/' + lang + catPath;
      } else if (lastPath.indexOf('/tags/') !== -1) {
        var tagName = decodeURIComponent(parts[hasPrefix ? 2 : 1] || '');
        var tagPath = '/tags/' + encodeURIComponent(tagName) + '/1';
        lastPath = lang === 'en' ? tagPath : '/' + lang + tagPath;
      } else {
        lastPath = lang === 'en' ? '/posts' : '/' + lang + '/posts';
      }
    }

    backLink.href = lastPath;
  } catch (_e) {}
});
