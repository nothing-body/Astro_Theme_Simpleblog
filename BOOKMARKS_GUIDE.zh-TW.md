# 書籤分類與連結維護指南

首頁的書籤資料集中放在 `src/components/BookmarkLinks.astro`，由 `groupLabels` 管理分類名稱，由 `bookmarkRows` 管理每一列要顯示的連結。這樣做可以讓畫面模板保持單純，也比較容易檢查安全性與多語系內容。

## 新增一個分類

第一步，在 `groupLabels` 裡加入新的分類名稱，並同時補上英文、簡體中文與繁體中文。

```ts
const groupLabels = {
  code: lang === 'en' ? 'Code' : lang === 'zh-cn' ? '代码' : '程式碼',
  community: lang === 'en' ? 'Community' : lang === 'zh-cn' ? '社区' : '社群',
  lookup: lang === 'en' ? 'IP Lookup' : lang === 'zh-cn' ? 'IP 查询' : 'IP 查詢',
  reputation: lang === 'en' ? 'Reputation' : lang === 'zh-cn' ? '风险检查' : '風險檢查',
  shopping: lang === 'en' ? 'Shopping' : lang === 'zh-cn' ? '购物网站' : '購物網站',
};
```

第二步，在 `bookmarkRows` 最下方加入新的分類資料。

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

元件會透過 `.map()` 自動渲染新增的分類，並套用既有的間距、分隔線與響應式樣式。

## 在現有分類新增連結

找到要修改的分類，在它的 `items` 陣列裡加入 `{ label, href }` 物件即可。

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

## 安全與維護注意事項

- 優先使用 `https://` 連結。
- 不要把 API key、token、帳號密碼或私人後台網址寫進書籤。
- 若新增會開新分頁的連結，必須同時使用 `rel="noopener noreferrer"`。
- 分類名稱請維持三語系同步，避免某個語系顯示空白或 fallback 文字。
- 連結新增後請執行 `pnpm check`、`pnpm lint`、`pnpm lint:css`、`pnpm build`、`pnpm selfcheck -- --quick`。
