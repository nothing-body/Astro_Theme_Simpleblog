# 書籤區新增分類與連結說明

首頁書籤區由 [src/components/BookmarkLinks.astro](E:/Astro/Astro_Theme_Simpleblog/src/components/BookmarkLinks.astro) 管理。你的版本比原本寫在部署文件裡的說明更好，因為它直接對應目前實際使用的資料結構：`groupLabels` 管理分類名稱，`bookmarkRows` 管理分類與連結清單。

這份文件只說明如何維護首頁書籤區；部署相關設定請看 `部屬前須知.md` 或 `DEPLOYMENT.en.md`。

## 新增一個分類

例如要新增「購物網站」，並放在「風險檢查」下方，可以分成兩步。

### 1. 新增分類名稱

在 `groupLabels` 裡加入新的多語系名稱：

```ts
const groupLabels = {
  code: lang === 'en' ? 'Code' : lang === 'zh-cn' ? '\u4ee3\u7801' : '\u7a0b\u5f0f\u78bc',
  community: lang === 'en' ? 'Community' : lang === 'zh-cn' ? '\u793e\u533a' : '\u793e\u7fa4',
  lookup: lang === 'en' ? 'IP Lookup' : lang === 'zh-cn' ? 'IP \u67e5\u8be2' : 'IP \u67e5\u8a62',
  reputation: lang === 'en' ? 'Reputation' : lang === 'zh-cn' ? '\u98ce\u9669\u68c0\u67e5' : '\u98a8\u96aa\u6aa2\u67e5',
  shopping: lang === 'en' ? 'Shopping' : lang === 'zh-cn' ? '\u8d2d\u7269\u7f51\u7ad9' : '\u8cfc\u7269\u7db2\u7ad9',
};
```

### 2. 新增分類資料

在 `bookmarkRows` 最後方加入新的分類物件：

```ts
{
  group: groupLabels.shopping,
  items: [
    { label: 'PChome', href: 'https://www.pchome.com.tw/' },
    { label: 'Momo', href: 'https://www.momoshop.com.tw/' },
    { label: 'Shopee', href: 'https://shopee.tw/' },
  ],
},
```

頁面會自動用 `.map()` 產生新列，並套用既有的卡片、分類膠囊與圓點分隔樣式。

## 在現有分類新增連結

找到要修改的分類，直接在 `items` 裡追加 `{ label, href }`。

例如要在「程式碼」分類新增 Gitea：

```ts
{
  group: groupLabels.code,
  items: [
    { label: 'GitHub', href: 'https://github.com/' },
    { label: 'GitLab', href: 'https://gitlab.com/' },
    { label: 'Codeberg', href: 'https://codeberg.org/' },
    { label: 'Gitea', href: 'https://gitea.com/' },
  ],
},
```

## 維護與安全注意事項

- 優先使用 `https://` 連結。
- 外部連結保持 `target="_blank"` 與 `rel="noopener noreferrer"`，避免新開頁面反向控制原頁面。
- 不要把訪客輸入、API 回傳內容或未信任資料直接放入 `href`。
- 書籤欄位已限制高度並提供捲動，分類或連結很多時不會把首頁無限撐長。
- 若新增很多連結，先檢查手機寬度是否換行正常。
- 修改後建議執行 `pnpm check`、`pnpm lint`、`pnpm lint:css`、`pnpm build`、`pnpm selfcheck -- --quick`。
