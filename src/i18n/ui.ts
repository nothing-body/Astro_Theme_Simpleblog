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

    'welcome.title': "Welcome to Tena's Blog",
    'welcome.detecting': 'Detecting your spacetime...',
    'welcome.from': 'Welcome, visitor from',
    'welcome.visitor': ", to Tena's Blog",
    'welcome.fallback': 'Welcome to my personal notebook',
    'welcome.heroAria': 'Welcome',
    'welcome.timezone': 'Timezone:',
    'welcome.timezoneAria': 'Select timezone',
    'welcome.timezoneAuto': 'Auto detect',
    'welcome.introPrimaryLead': 'Welcome to my personal blog!',
    'welcome.introPrimaryRest': 'This is a casual digital notebook space.',
    'welcome.introSecondaryLine1':
      'I document useful software I discover, VPS configuration notes, and daily thoughts.',
    'welcome.introSecondaryLine2':
      'Hoping these notes help me avoid re-searching the same topics — and maybe help you too.',
    'welcome.actionsAria': 'Main actions',

    'posts.title': 'All Posts',
    'posts.readMore': 'Read More',
    'posts.noPost': 'No posts yet',
    'posts.latestPosts': 'Latest Posts',

    'sidebar.categories': 'Categories',
    'sidebar.tags': 'Tags',
    'sidebar.label': 'Sidebar',

    'pagination.prev': 'Prev',
    'pagination.next': 'Next',
    'pagination.page': 'Page {current} / {total}',

    'about.title': 'About This Site',

    'footer.copyright': '© {year} All Rights Reserved',
    'footer.cookieSettings': 'Cookie Settings',
    'footer.about': 'About',
    'footer.contact': 'Contact Us',
    'footer.privacy': 'Privacy Policy',
    'footer.disclaimer': 'Disclaimer',

    'cookie.title': 'Cookie Settings',
    'cookie.description':
      'This site uses cookies and local storage to enhance your browsing experience.',
    'cookie.privacyLink': 'Privacy Policy',
    'cookie.rememberTimezone': 'Allow this site to remember my selected timezone',
    'cookie.enableAnalytics': 'Allow Google Analytics (GA4) to collect browsing data',
    'cookie.save': 'Save Settings',
    'cookie.close': 'Close',
    'cookie.necessary': 'Cookie / Local Storage Settings',
    'cookie.inlineHint':
      'Settings take effect after you click "Save". Disabling GA4 will reload the page.',

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

    'a11y.skipToMain': 'Skip to main content',
    'a11y.mainNavigation': 'Main navigation',
    'a11y.selectLanguage': 'Select language',
    'a11y.languageSelector': 'Language selector',
    'a11y.openMenu': 'Open menu',
    'a11y.mobileMenu': 'Mobile menu',
    'post.pinned': 'Pinned',
    'post.uncategorized': 'Uncategorized',
    'post.updatedLabel': 'Updated: ',
    'post.tagsLabel': 'Post tags',
    'post.backNavLabel': 'Post navigation',
    'post.breadcrumbLabel': 'Breadcrumb navigation',

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
    'nav.noCategory': '沒有此分類',

    'welcome.title': "歡迎來到 Tena's Blog",
    'welcome.detecting': '正在偵測你的時區...',
    'welcome.from': '歡迎來自',
    'welcome.visitor': "的訪客來到 Tena's Blog",
    'welcome.fallback': '歡迎來到我的個人筆記',
    'welcome.heroAria': '歡迎',
    'welcome.timezone': '時區：',
    'welcome.timezoneAria': '選擇時區',
    'welcome.timezoneAuto': '自動偵測',
    'welcome.introPrimaryLead': '歡迎來到我的個人部落格！',
    'welcome.introPrimaryRest': '這是一個隨手記錄軟體、VPS 設定與日常想法的數位筆記空間。',
    'welcome.introSecondaryLine1': '',
    'welcome.introSecondaryLine2':
      '希望這些記錄能幫助我減少重複搜尋，也能幫到剛好需要的人。',
    'welcome.actionsAria': '主要動作',

    'posts.title': '所有文章',
    'posts.readMore': '閱讀更多',
    'posts.noPost': '目前沒有文章',
    'posts.latestPosts': '最新文章',

    'sidebar.categories': '分類',
    'sidebar.tags': '標籤',
    'sidebar.label': '側邊欄',

    'pagination.prev': '上一頁',
    'pagination.next': '下一頁',
    'pagination.page': '第 {current} / {total} 頁',

    'about.title': '關於本站',

    'footer.copyright': '© {year} All Rights Reserved',
    'footer.cookieSettings': 'Cookie 設定',
    'footer.about': '關於本站',
    'footer.contact': '聯絡我們',
    'footer.privacy': '隱私權政策',
    'footer.disclaimer': '免責聲明',

    'cookie.title': 'Cookie 設定',
    'cookie.description': '本站使用 Cookie 與本機儲存以提供更好的瀏覽體驗。',
    'cookie.privacyLink': '隱私權政策',
    'cookie.rememberTimezone': '允許本站記住我選擇的時區設定',
    'cookie.enableAnalytics': '允許 Google Analytics (GA4) 收集瀏覽數據進行網站分析',
    'cookie.save': '儲存設定',
    'cookie.close': '關閉',
    'cookie.necessary': 'Cookie / 本機儲存設定',
    'cookie.inlineHint':
      '您的設定會在按下「儲存設定」後生效。關閉 GA4 後將在頁面重新載入時生效。',

    'noCategory.title': '目前沒有相關內容',
    'noCategory.message': '抱歉，這個語言沒有符合此分類或標籤的文章。',
    'noCategory.redirecting': '正在導向所有文章...',
    'noCategory.manual': '點此立即前往',

    'breadcrumb.home': '首頁',
    'breadcrumb.posts': '所有文章',

    'copyright.author': '作者',
    'copyright.publishedAt': '發布時間',
    'copyright.license': '採用 CC BY-NC-SA 4.0 授權',
    'copyright.canonical': '原始連結',

    'a11y.skipToMain': '跳到主要內容',
    'a11y.mainNavigation': '主導覽',
    'a11y.selectLanguage': '選擇語言',
    'a11y.languageSelector': '語言選單',
    'a11y.openMenu': '開啟選單',
    'a11y.mobileMenu': '行動版選單',
    'post.pinned': '置頂',
    'post.uncategorized': '未分類',
    'post.updatedLabel': '更新：',
    'post.tagsLabel': '文章標籤',
    'post.backNavLabel': '文章導覽',
    'post.breadcrumbLabel': '麵包屑導覽',

    '404.title': '找不到頁面',
    '404.message': '抱歉，你要尋找的頁面不存在。',
    '404.backHome': '返回首頁',
  },

  'zh-cn': {
    'nav.home': '首页',
    'nav.posts': '所有文章',
    'nav.about': '关于本站',
    'nav.back': '返回',
    'nav.backToPosts': '返回文章列表',
    'nav.noCategory': '没有此分类',

    'welcome.title': "欢迎来到 Tena's Blog",
    'welcome.detecting': '正在检测你的时区...',
    'welcome.from': '欢迎来自',
    'welcome.visitor': "的访客来到 Tena's Blog",
    'welcome.fallback': '欢迎来到我的个人笔记',
    'welcome.heroAria': '欢迎',
    'welcome.timezone': '时区：',
    'welcome.timezoneAria': '选择时区',
    'welcome.timezoneAuto': '自动检测',
    'welcome.introPrimaryLead': '欢迎来到我的个人博客！',
    'welcome.introPrimaryRest': '这是一个随性的数字笔记本空间。',
    'welcome.introSecondaryLine1': '我在这里记录我发现的实用软件、VPS 配置备忘录以及日常感悟。',
    'welcome.introSecondaryLine2': '希望这些笔记能帮我避免重复搜索相同的主题，或许也能对您有所帮助。',
    'welcome.actionsAria': '主要操作',

    'posts.title': '所有文章',
    'posts.readMore': '阅读更多',
    'posts.noPost': '目前没有文章',
    'posts.latestPosts': '最新文章',

    'sidebar.categories': '分类',
    'sidebar.tags': '标签',
    'sidebar.label': '侧边栏',

    'pagination.prev': '上一页',
    'pagination.next': '下一页',
    'pagination.page': '第 {current} / {total} 页',

    'about.title': '关于本站',

    'footer.copyright': '© {year} All Rights Reserved',
    'footer.cookieSettings': 'Cookie 设置',
    'footer.about': '关于本站',
    'footer.contact': '联系我们',
    'footer.privacy': '隐私政策',
    'footer.disclaimer': '免责声明',

    'cookie.title': 'Cookie 设置',
    'cookie.description': '本站使用 Cookie 与本地存储以提供更好的浏览体验。',
    'cookie.privacyLink': '隐私政策',
    'cookie.rememberTimezone': '允许本站记住我选择的时区设置',
    'cookie.enableAnalytics': '允许 Google Analytics (GA4) 收集浏览数据进行网站分析',
    'cookie.save': '保存设置',
    'cookie.close': '关闭',
    'cookie.necessary': 'Cookie / 本地存储设置',
    'cookie.inlineHint': '您的设置会在点击「保存设置」后生效。关闭 GA4 后将在页面重新加载时生效。',

    'noCategory.title': '目前没有相关内容',
    'noCategory.message': '抱歉，这个语言没有符合此分类或标签的文章。',
    'noCategory.redirecting': '正在跳转到所有文章...',
    'noCategory.manual': '点击立即前往',

    'breadcrumb.home': '首页',
    'breadcrumb.posts': '所有文章',

    'copyright.author': '作者',
    'copyright.publishedAt': '发布时间',
    'copyright.license': '采用 CC BY-NC-SA 4.0 授权',
    'copyright.canonical': '原始链接',

    'a11y.skipToMain': '跳到主要内容',
    'a11y.mainNavigation': '主导航',
    'a11y.selectLanguage': '选择语言',
    'a11y.languageSelector': '语言菜单',
    'a11y.openMenu': '打开菜单',
    'a11y.mobileMenu': '移动端菜单',
    'post.pinned': '置顶',
    'post.uncategorized': '未分类',
    'post.updatedLabel': '更新：',
    'post.tagsLabel': '文章标签',
    'post.backNavLabel': '文章导航',
    'post.breadcrumbLabel': '面包屑导航',

    '404.title': '找不到页面',
    '404.message': '抱歉，你要查找的页面不存在。',
    '404.backHome': '返回首页',
  },
} as const;

export type Lang = keyof typeof ui;
export type TranslationKey = keyof (typeof ui)[typeof defaultLang];
