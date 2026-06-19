---
title: 'PurgeCSS：運作方式與安全設定方法'
pubDate: 2026-05-25
description: 'PurgeCSS 實務指南：說明它如何判斷未使用 CSS、適合哪些情境，以及如何設定 content 路徑與 safelist 來避免破版。'
category: '網站'
tags: ['PurgeCSS', 'CSS', '前端優化']
author: 'Tena'
---

PurgeCSS 是一個建置階段使用的工具，用來移除它判斷為「未使用」的 CSS 選擇器。當網站載入很大的樣式表，但實際只使用其中一小部分時，它可能有幫助。需要注意的是，PurgeCSS 並不像瀏覽器一樣理解整個應用程式；它主要是把 CSS 選擇器拿去和原始碼中出現的字串比對。

## PurgeCSS 怎麼運作

PurgeCSS 會比對兩類檔案：

1. 包含選擇器的 CSS 檔案。
2. 可能包含 class 名稱的內容檔案，例如 HTML、JavaScript、Astro 元件、Markdown、MDX、模板或產生後的標記。

如果某個選擇器沒有出現在掃描結果中，PurgeCSS 就可能把它從最終 CSS 裡移除。當選擇器真的沒用到時，這很有效；但如果選擇器是動態產生，或只會在 Markdown 渲染後出現，就可能造成樣式被誤刪。

## 什麼情況適合使用

PurgeCSS 比較適合用在引入大型 CSS 框架或舊式樣式表，但實際只使用少量樣式的專案。CSS 體積變小後，下載與解析成本可能降低，對慢速網路或低階裝置尤其有感。

如果你的 CSS 已經是按需產生、元件化切分，或樣式範圍已經很小，PurgeCSS 的收益可能有限。加入前最好先量測 CSS 體積，確認 CSS 真的造成效能瓶頸。

## 基本設定

最基本的設定通常需要兩件事：content 路徑與 CSS 路徑。content 路徑必須涵蓋所有可能出現 class 名稱的檔案。

```js
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
    './public/**/*.html',
  ],
  css: ['./dist/**/*.css'],
};
```

Astro 專案如果文章內容會透過 Markdown 或 MDX 產生 HTML，就要記得把 Markdown、MDX 一起納入掃描。若內容來自 CMS 或建置前產生，則要掃描產生後的輸出，或把必要選擇器加入 safelist。

## 動態 class 名稱

動態 class 名稱是最常見的破版來源。下面這種寫法有風險：

```js
const color = 'red';
element.className = `text-${color}-500`;
```

PurgeCSS 可能只看到 `text-`、`red`、`-500`，卻看不到完整的 `text-red-500`。比較穩妥的寫法是把完整 class 名稱寫出來：

```js
const colorClass = color === 'red' ? 'text-red-500' : 'text-blue-500';
element.className = colorClass;
```

## 為重要選擇器設定 safelist

對於執行階段才產生、第三方小工具注入，或 Markdown 渲染後才會出現的選擇器，應該使用 safelist 保留。safelist 要精準，不然會抵消 PurgeCSS 減少 CSS 體積的效果。

```js
export default {
  content: ['./src/**/*.{astro,js,ts,md,mdx}'],
  css: ['./dist/**/*.css'],
  safelist: [
    'is-active',
    'is-visible',
    /^language-/,
    /^token/,
  ],
};
```

## 部署前一定要測試

啟用 PurgeCSS 後，應該測試真正的生產建置結果，而不是只看開發伺服器。請確認文章頁、導覽狀態、分頁、程式碼區塊、彈窗、表單、深淺色模式，以及第三方嵌入內容。大型網站最好搭配視覺回歸測試。

PurgeCSS 可以是有用的最佳化工具，但它需要量測、完整的 content 清單，以及持續維護 safelist。
