---
title: 開始使用這個 Astro 部落格
description: 依照目前新版架構整理的 Astro 多語部落格入門說明，涵蓋內容目錄、離站提示頁、環境設定與部署檢查。
pubDate: 2026-01-01
updatedDate: 2026-06-19
category: 指南
tags:
  - Astro
  - 模板
  - 部署
author: Astro Blog Template
draft: true
---

這是一個靜態輸出的 Astro 多語部落格模板，支援英文、繁體中文與簡體中文路由。它可以作為個人部落格、公開模板，或直接部署的靜態網站基礎。

## 專案結構

- `src/content/blog/en/` 放英文文章。
- `src/content/blog/zh-tw/` 放繁體中文文章。
- `src/content/blog/zh-cn/` 放簡體中文文章。
- `src/pages/`、`src/pages/zh-tw/`、`src/pages/zh-cn/` 對應三個語系的頁面路由。
- `src/components/` 放共用 UI，例如導覽列、分頁、文章卡片、側邊欄、Cookie 設定與離站提示頁。
- `src/i18n/ui.ts` 放三個語系共用的介面文字。

翻譯文章時，建議三個語系使用相同 slug。例如 `getting-started.md` 會產生 `/posts/getting-started`、`/zh-tw/posts/getting-started`、`/zh-cn/posts/getting-started`。

## 撰寫文章

每篇文章使用 frontmatter 設定基本資訊：

```yaml
title: 文章標題
description: 給 SEO 與文章卡片使用的簡短摘要
pubDate: 2026-01-01
updatedDate: 2026-06-19
category: 指南
tags:
  - Astro
draft: true
```

設定 `draft: true` 可以讓文章不進入產出的網站。若要置頂文章，可以加上 `pinned: true`，它會在首頁、文章列表、分類頁與標籤頁優先顯示。

## 外部連結

Markdown 與 MDX 裡的外部 `http`、`https` 連結會在 build 階段改寫到本站的離站提示頁：

- 英文：`/leaving?to=...`
- 繁體中文：`/zh-tw/leaving?to=...`
- 簡體中文：`/zh-cn/leaving?to=...`

離站提示頁不會自動跳轉，會先顯示目標網址，讓訪客手動確認是否繼續前往外部網站。

## 環境設定與隱私

`.env.example`、`.env.cloudflare.example`、`.env.vercel.example`、`.env.vps.example` 是範例檔。不要提交真實 `.env`、API token、私鑰、供應商帳號 ID 或站長驗證檔。

如果要同步到公開模板，專案名稱、網域、Analytics ID、聯絡信箱與部署目標應保持通用，除非那些資訊本來就要公開。

## Build 與部署

開發時常用指令：

```bash
pnpm install
pnpm dev
pnpm build
```

專案也提供 Cloudflare Pages、VPS 上傳與 Vercel 的部署輔助：

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf
```

發布公開版前，建議先跑 `pnpm build`，檢查產出的頁面，並掃描是否有真實網域、token、私鑰或驗證檔等不該公開的資訊。
