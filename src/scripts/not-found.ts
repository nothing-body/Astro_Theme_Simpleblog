const path = window.location.pathname;
const normalizedPath = path.length > 1 ? path.replace(/\/+$/, '') : path;

if (normalizedPath.startsWith('/zh-tw/') && normalizedPath !== '/zh-tw/404') {
  window.location.replace('/zh-tw/404');
} else if (normalizedPath.startsWith('/zh-cn/') && normalizedPath !== '/zh-cn/404') {
  window.location.replace('/zh-cn/404');
}
