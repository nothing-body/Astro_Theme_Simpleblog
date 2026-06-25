# SimpleBlog

使用 Astro 建置的多語靜態部落格模板，支援 Markdown/MDX 文章、SEO metadata、外部連結提醒頁、部署輔助腳本與專案自我檢查。

<p align="center">
  <a href="https://example.com/">正式網站</a>
  &middot;
  <a href="./README.md">English README</a>
</p>

## 目前結構

英文是預設語系，路徑為 `/`。繁體中文使用 `/zh-tw/`，簡體中文使用 `/zh-cn/`。

```text
src/content/blog/en/       英文文章
src/content/blog/zh-tw/    繁體中文文章
src/content/blog/zh-cn/    簡體中文文章
src/pages/                 英文與共用路由
src/pages/zh-tw/           繁體中文路由
src/pages/zh-cn/           簡體中文路由
src/components/            共用 Astro 元件
src/i18n/ui.ts             介面翻譯文字
scripts/                   分析與部署輔助腳本
tests/                     單元與端對端測試
```

## 內容寫作

每篇文章使用 frontmatter 管理標題、摘要、日期、分類與標籤。

```yaml
title: 文章標題
description: 給搜尋引擎與文章卡片使用的摘要
pubDate: 2026-01-01
updatedDate: 2026-06-19
categoryPath:
  - 軟體
  - AI 開發工具
tags:
  - Astro
draft: true
```

建議三語文章使用相同檔名 slug，方便語系切換與相關文章對應。若文章還不應該出現在正式站，請設定 `draft: true`。

## 分類與標籤

分類支援樹狀路徑，例如：

```yaml
categoryPath:
  - 網路與安全
  - 代理服務
```

標籤建議保持精簡，優先使用能幫助讀者搜尋與聚合內容的大方向詞。

## 環境與隱私

請使用 `.env.example`、`.env.cloudflare.example`、`.env.vercel.example`、`.env.vps.example` 作為範本。

不要提交真實 `.env` 檔、API token、私鑰、帳號 ID、站點驗證檔、真實分析 ID 或私人部署目標。公開版本應保留通用範例值，例如 `https://example.com/` 與 `contact@example.com`。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm analyze
```

部署輔助腳本：

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf
```

公開發布前，建議至少執行 `pnpm analyze`，並再次確認沒有真實網域、token、私鑰、站點驗證檔或不應公開的文章內容。
