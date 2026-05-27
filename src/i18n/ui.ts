export const languages = {
  en: 'English',
  'zh-tw': '繁體中文',
  'zh-cn': '简体中文',
} as const;

export const defaultLang = 'en' as const;

export const ui = {
  en: {
    'nav.home': 'Home',
    'nav.posts': 'All Posts',
    'nav.about': 'About',
    'nav.back': 'Back',
    'nav.backToPosts': 'Back to Posts',
    'nav.noCategory': 'No Such Category',

    'a11y.skipToMain': 'Skip to main content',
    'a11y.mainNavigation': 'Main navigation',
    'a11y.selectLanguage': 'Select language',
    'a11y.languageSelector': 'Language selector',
    'a11y.openMenu': 'Open menu',
    'a11y.mobileMenu': 'Mobile menu',
    'sidebar.label': 'Sidebar',
    'post.pinned': 'Pinned',
    'post.uncategorized': 'Uncategorized',
    'post.updatedLabel': 'Updated: ',
    'post.tagsLabel': 'Post tags',
    'post.backNavLabel': 'Post navigation',
    'post.breadcrumbLabel': 'Breadcrumb navigation',

    'welcome.title': "Welcome to Astro Blog Template",
    'welcome.detecting': 'Detecting your timezone...',
    'welcome.from': 'Welcome, visitor from',
    'welcome.visitor': ", to Astro Blog Template",
    'welcome.fallback': 'Welcome to this multilingual blog template',

    'posts.title': 'All Posts',
    'posts.readMore': 'Read More',
    'posts.noPost': 'No posts yet',
    'posts.latestPosts': 'Latest Posts',

    'sidebar.categories': 'Categories',
    'sidebar.tags': 'Tags',

    'pagination.prev': 'Prev',
    'pagination.next': 'Next',
    'pagination.page': 'Page {current} / {total}',

    'about.title': 'About This Site',

    'footer.copyright': '© {year} All Rights Reserved',
    'footer.cookieSettings': 'Cookie Settings',
    'footer.about': 'About',
    'footer.privacy': 'Privacy Policy',

    'cookie.title': 'Cookie Settings',
    'cookie.description':
      'This site uses cookies and local storage to enhance your browsing experience.',
    'cookie.privacyLink': 'Privacy Policy',
    'cookie.rememberTimezone': 'Allow this site to remember my selected timezone',
    'cookie.enableAnalytics': 'Allow Google Analytics (GA4) to collect browsing data',
    'cookie.save': 'Save Settings',
    'cookie.close': 'Close',
    'cookie.necessary': 'Cookie / Local Storage Settings',

    'noCategory.title': 'No Related Content Yet',
    'noCategory.message': 'Sorry, there are no posts for this category or tag in this language.',
    'noCategory.redirecting': 'Redirecting you to all posts...',
    'noCategory.manual': 'Click here to redirect now',

    'breadcrumb.home': 'Home',
    'breadcrumb.posts': 'All Posts',

    'copyright.author': 'Author',
    'copyright.publishedAt': 'Published at',
    'copyright.license': 'Licensed under CC BY-NC-SA 4.0',
    'copyright.canonical': 'Canonical URL',

    '404.title': 'Page Not Found',
    '404.message': 'Sorry, the page you are looking for does not exist.',
    '404.backHome': 'Back to Home',
  },

  'zh-tw': {
    'nav.home': '首頁',
    'nav.posts': '所有文章',
    'nav.about': '關於本站',
    'nav.back': '返回',
    'nav.backToPosts': '返回文章列表',
    'nav.noCategory': '沒有這個分類',

    'a11y.skipToMain': '跳到主要內容',
    'a11y.mainNavigation': '主導覽',
    'a11y.selectLanguage': '選擇語言',
    'a11y.languageSelector': '語言選擇器',
    'a11y.openMenu': '開啟選單',
    'a11y.mobileMenu': '行動選單',
    'sidebar.label': '側邊欄',
    'post.pinned': '置頂',

    'post.uncategorized': '\u672a\u5206\u985e',
    'post.updatedLabel': '\u66f4\u65b0\uff1a',
    'post.tagsLabel': '\u6587\u7ae0\u6a19\u7c64',
    'post.backNavLabel': '\u6587\u7ae0\u5c0e\u89bd',
    'post.breadcrumbLabel': '\u9eb5\u5305\u5c51\u5c0e\u89bd',

    'welcome.title': "歡迎來到 Astro Blog Template",
    'welcome.detecting': '正在偵測你的時區...',
    'welcome.from': '歡迎來自',
    'welcome.visitor': "的訪客來到 Astro Blog Template",
    'welcome.fallback': '歡迎來到這個多語系部落格模板',

    'posts.title': '所有文章',
    'posts.readMore': '閱讀更多',
    'posts.noPost': '目前沒有文章',
    'posts.latestPosts': '最新文章',

    'sidebar.categories': '分類',
    'sidebar.tags': '標籤',

    'pagination.prev': '上一頁',
    'pagination.next': '下一頁',
    'pagination.page': '第 {current} / {total} 頁',

    'about.title': '關於本站',

    'footer.copyright': '© {year} All Rights Reserved',
    'footer.cookieSettings': 'Cookie 設定',
    'footer.about': '關於本站',
    'footer.privacy': '隱私權政策',

    'cookie.title': 'Cookie 設定',
    'cookie.description': '本站使用 Cookie 與本機儲存來改善瀏覽體驗。',
    'cookie.privacyLink': '隱私權政策',
    'cookie.rememberTimezone': '允許本站記住我選擇的時區',
    'cookie.enableAnalytics': '允許 Google Analytics (GA4) 收集瀏覽資料',
    'cookie.save': '儲存設定',
    'cookie.close': '關閉',
    'cookie.necessary': 'Cookie / 本機儲存設定',

    'noCategory.title': '目前沒有相關內容',
    'noCategory.message': '抱歉，這個語系目前沒有此分類或標籤的文章。',
    'noCategory.redirecting': '正在帶你前往所有文章...',
    'noCategory.manual': '點此立即前往',

    'breadcrumb.home': '首頁',
    'breadcrumb.posts': '所有文章',

    'copyright.author': '作者',
    'copyright.publishedAt': '發布時間',
    'copyright.license': '採用 CC BY-NC-SA 4.0 授權',
    'copyright.canonical': '原始連結',

    '404.title': '找不到頁面',
    '404.message': '抱歉，你要找的頁面不存在。',
    '404.backHome': '回到首頁',
  },

  'zh-cn': {
    'nav.home': '首页',
    'nav.posts': '所有文章',
    'nav.about': '关于本站',
    'nav.back': '返回',
    'nav.backToPosts': '返回文章列表',
    'nav.noCategory': '没有这个分类',

    'a11y.skipToMain': '跳到主要内容',
    'a11y.mainNavigation': '主导航',
    'a11y.selectLanguage': '选择语言',
    'a11y.languageSelector': '语言选择器',
    'a11y.openMenu': '打开菜单',
    'a11y.mobileMenu': '移动菜单',
    'sidebar.label': '侧边栏',
    'post.pinned': '置顶',

    'post.uncategorized': '\u672a\u5206\u7c7b',
    'post.updatedLabel': '\u66f4\u65b0\uff1a',
    'post.tagsLabel': '\u6587\u7ae0\u6807\u7b7e',
    'post.backNavLabel': '\u6587\u7ae0\u5bfc\u822a',
    'post.breadcrumbLabel': '\u9762\u5305\u5c51\u5bfc\u822a',

    'welcome.title': "欢迎来到 Astro Blog Template",
    'welcome.detecting': '正在检测你的时区...',
    'welcome.from': '欢迎来自',
    'welcome.visitor': "的访客来到 Astro Blog Template",
    'welcome.fallback': '欢迎来到这个多语言博客模板',

    'posts.title': '所有文章',
    'posts.readMore': '阅读更多',
    'posts.noPost': '目前没有文章',
    'posts.latestPosts': '最新文章',

    'sidebar.categories': '分类',
    'sidebar.tags': '标签',

    'pagination.prev': '上一页',
    'pagination.next': '下一页',
    'pagination.page': '第 {current} / {total} 页',

    'about.title': '关于本站',

    'footer.copyright': '© {year} All Rights Reserved',
    'footer.cookieSettings': 'Cookie 设置',
    'footer.about': '关于本站',
    'footer.privacy': '隐私政策',

    'cookie.title': 'Cookie 设置',
    'cookie.description': '本站使用 Cookie 与本地存储来改善浏览体验。',
    'cookie.privacyLink': '隐私政策',
    'cookie.rememberTimezone': '允许本站记住我选择的时区',
    'cookie.enableAnalytics': '允许 Google Analytics (GA4) 收集浏览数据',
    'cookie.save': '保存设置',
    'cookie.close': '关闭',
    'cookie.necessary': 'Cookie / 本地存储设置',

    'noCategory.title': '目前没有相关内容',
    'noCategory.message': '抱歉，这个语系目前没有此分类或标签的文章。',
    'noCategory.redirecting': '正在带你前往所有文章...',
    'noCategory.manual': '点击这里立即前往',

    'breadcrumb.home': '首页',
    'breadcrumb.posts': '所有文章',

    'copyright.author': '作者',
    'copyright.publishedAt': '发布时间',
    'copyright.license': '采用 CC BY-NC-SA 4.0 授权',
    'copyright.canonical': '原始链接',

    '404.title': '找不到页面',
    '404.message': '抱歉，你要找的页面不存在。',
    '404.backHome': '回到首页',
  },
} as const;

export type Lang = keyof typeof ui;
export type TranslationKey = keyof (typeof ui)[typeof defaultLang];
