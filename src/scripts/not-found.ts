const path = window.location.pathname;
if (path.startsWith('/zh-tw/') && path !== '/zh-tw/404') window.location.replace('/zh-tw/404');
else if (path.startsWith('/zh-cn/') && path !== '/zh-cn/404') window.location.replace('/zh-cn/404');
