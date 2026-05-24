---
title: 開始使用這個 Astro 部落格
description: 這是一篇安全的範例文章，讓公開版專案下載後可以立即 build、預覽與部署。
pubDate: 2026-01-01
updatedDate: 2026-01-01
category: 指南
tags:
  - Astro
  - 模板
  - 部署
author: Astro Blog Template
draft: false
---

歡迎使用這個 Astro 部落格模板。

公開版保留一篇正式範例文章，讓首頁、所有文章、分類、標籤、sitemap 與部署腳本在剛下載時就能正常運作。

## 建議先修改的地方

1. 在環境檔案設定 `PUBLIC_SITE_URL`。
2. 將這篇文章替換成你自己的內容。
3. 檢查 `src/i18n/ui.ts` 的網站文字。
4. 正式部署前檢查 `public/_headers`。

## 部署

可以使用雙語部署選單：

```bash
pnpm deploy:menu
npm run deploy:menu
```

直接部署腳本會先 build 網站，再上傳產生後的輸出資料夾。
