# 書籤區塊指南

首頁書籤區塊維護在：

```text
src/components/BookmarkLinks.astro
```

書籤屬於網站內容，不是部署設定。不要把 API key、token、私人管理面板網址、私人伺服器位址放進這個檔案。

## 新增群組

先在 `groupLabels` 新增三語群組名稱：

```ts
const groupLabels = {
  code: lang === 'en' ? 'Code' : lang === 'zh-cn' ? '代码' : '程式碼',
  shopping: lang === 'en' ? 'Shopping' : lang === 'zh-cn' ? '购物网站' : '購物網站',
};
```

再到 `bookmarkRows` 新增一列：

```ts
{
  group: groupLabels.shopping,
  items: [
    { label: 'PChome', href: 'https://www.pchome.com.tw/' },
    { label: 'Momo', href: 'https://www.momoshop.com.tw/' },
  ],
},
```

## 新增連結到既有群組

找到目標群組，在 `items` 裡加入 `{ label, href }`：

```ts
{
  group: groupLabels.code,
  items: [
    { label: 'GitHub', href: 'https://github.com/' },
    { label: 'Gitea', href: 'https://gitea.com/' },
  ],
},
```

## 連結行為

書籤連結會以外部連結方式開啟：

```html
target="_blank" rel="noopener noreferrer"
```

全站 Markdown 外部連結提示頁只會自動處理 Markdown 文章內的連結，不會自動改寫 Astro 元件裡直接寫的書籤連結。如果希望書籤也進入離站提示頁，可以手動設定 `href`：

```ts
{ label: 'Example', href: `/leaving?to=${encodeURIComponent('https://example.com/')}` }
```

繁體中文與簡體中文版本可使用 `/zh-tw/leaving?to=` 或 `/zh-cn/leaving?to=`。

## 安全注意事項

- 優先使用 `https://` 網址。
- 外部連結保留 `target="_blank"` 與 `rel="noopener noreferrer"`。
- 不要把訪客輸入、API 回傳或其他不可信資料直接塞進 `href`。
- 公開模板不要加入私人控制台、私人 IP、內部 hostname、API token 或個人帳號網址。
- 書籤面板有固定捲動範圍，較多群組或連結不會讓首頁無限拉長。
- 編輯後執行 `pnpm check`、`pnpm lint`、`pnpm lint:css`、`pnpm build`、`pnpm selfcheck -- --quick`。
