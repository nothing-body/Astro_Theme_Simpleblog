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

    if (!lastPath || lastPath === currentPath) return;

    try {
      var lastUrl = new URL(lastPath, window.location.origin);
      if (lastUrl.origin !== window.location.origin) return;
      lastPath = lastUrl.pathname + lastUrl.search + lastUrl.hash;
    } catch (_e) {
      return;
    }

    function getPathLang(path) {
      if (path.indexOf('/zh-tw/') === 0 || path === '/zh-tw') return 'zh-tw';
      if (path.indexOf('/zh-cn/') === 0 || path === '/zh-cn') return 'zh-cn';
      return 'en';
    }

    function getCategoryRouteSegment(segment) {
      return String(segment)
        .trim()
        .replace(/&/g, ' and ')
        .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    function postsListPath(targetLang, pageNum) {
      var prefix = targetLang === 'en' ? '' : '/' + targetLang;
      return pageNum <= 1 ? prefix + '/posts' : prefix + '/page/' + pageNum;
    }

    var lastLang = getPathLang(lastPath);

    if (lastLang !== lang) {
      var parts = lastPath.split('/').filter(Boolean);
      var hasPrefix = parts[0] === 'zh-tw' || parts[0] === 'zh-cn';

      if (lastPath.indexOf('/categories/') !== -1) {
        var categoryStart = hasPrefix ? 2 : 1;
        var categoryParts = parts.slice(categoryStart);
        if (/^\d+$/.test(categoryParts[categoryParts.length - 1] || '')) categoryParts.pop();
        var catName = categoryParts.map(decodeURIComponent).join('/');
        var mapped = categoryMapping[catName] || {};
        var targetCat = mapped[lang] || currentCategory;
        var targetParts = String(targetCat).split('/').filter(Boolean);
        var routeParts = targetParts.map(getCategoryRouteSegment).filter(Boolean);
        var catPath = '/categories/' + routeParts.map(encodeURIComponent).join('/') + '/1/';
        lastPath = lang === 'en' ? catPath : '/' + lang + catPath;
      } else if (lastPath.indexOf('/tags/') !== -1) {
        var tagName = decodeURIComponent(parts[hasPrefix ? 2 : 1] || '');
        var tagPath = '/tags/' + encodeURIComponent(tagName) + '/1/';
        lastPath = lang === 'en' ? tagPath : '/' + lang + tagPath;
      } else if (lastPath.indexOf('/page/') !== -1) {
        var pageParts = lastPath.split('/').filter(Boolean);
        var pageIndex = pageParts.indexOf('page');
        var pageNum = parseInt(pageParts[pageIndex + 1] || '1', 10);
        if (!Number.isFinite(pageNum) || pageNum < 1) pageNum = 1;
        lastPath = postsListPath(lang, pageNum);
      } else {
        lastPath = postsListPath(lang, 1);
      }
    }

    backLink.href = lastPath;
  } catch (_e) {}
});
