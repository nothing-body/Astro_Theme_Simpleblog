---
title: '如何置頂文章'
description: '說明如何在這個 Astro 靜態部落格中使用 pinned 與 pinOrder 置頂一篇或多篇文章。'
pubDate: 2026-05-24
category: '網站'
categoryPath: ['網站', 'Astro']
tags: ['Astro', '網站設定']
author: 'Tena'
pinned: true
pinOrder: 1
---

公開版 GitHub 倉庫：[nothing-body/Astro_Theme_Simpleblog](https://github.com/nothing-body/Astro_Theme_Simpleblog)。

這篇文章本身就是一篇置頂文章範例。

在文章 frontmatter 加上 `pinned: true`，文章就會優先顯示在首頁、所有文章、分頁、分類頁與標籤頁的列表最前面。這是靜態建置時完成的排序，不需要資料庫、登入系統或前端寫入功能，因此不會增加額外攻擊面。

## 單篇文章置頂

```yaml
---
title: '文章標題'
pubDate: 2026-05-24
pinned: true
pinOrder: 1
---
```

`pinned: true` 代表這篇文章會被視為置頂文章。

`pinOrder` 用來控制多篇置頂文章之間的順序，數字越小越前面。

## 多篇文章置頂

如果有多篇文章都設定 `pinned: true`，可以用不同的 `pinOrder` 排序：

```yaml
pinned: true
pinOrder: 1
```

```yaml
pinned: true
pinOrder: 2
```

置頂文章會先依 `pinOrder` 排序；一般文章仍依發布日期由新到舊排序。

## 取消置頂

把 `pinned` 改成 `false`，或直接刪除 `pinned` 與 `pinOrder` 即可。

```yaml
pinned: false
```

## 維護注意事項

`pinOrder` 建議使用簡單整數，例如 `1`、`2`、`3`。不要把它當成日期、權重公式或複雜設定。

這個功能只讀取文章 frontmatter，不執行文章內的任意程式碼，也不接收訪客輸入。新增或修改置頂文章後，重新執行建置並部署 `dist` 即可更新網站。
