# SimpleBlog 內容與設定指南

本指南完整說明 Markdown/MDX 文章、多語系路由、文章置頂、專案設定、隱私、自檢與自動部署。

其他語言：[English](./MARKDOWN_GUIDE.en.md) | [简体中文](./MARKDOWN_GUIDE.zh-CN.md)

## 1. 第一次設定

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Windows PowerShell 可使用 `Copy-Item .env.example .env`。至少設定：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

真正的公開網址與聯絡信箱只放在 `.env`，不要提交 `.env`。

## 2. 重要檔案

| 檔案或資料夾 | 用途 |
| --- | --- |
| `src/content/blog/en/` | 英文文章 |
| `src/content/blog/zh-tw/` | 繁體中文文章 |
| `src/content/blog/zh-cn/` | 簡體中文文章 |
| `src/content.config.ts` | frontmatter schema 與驗證規則 |
| `src/lib/site.ts` | 網站名稱、預設作者、描述與 URL helper |
| `src/i18n/ui.ts` | 三語系介面文字 |
| `src/components/BookmarkLinks.astro` | 預設書籤分類與連結 |
| `public/_headers` | Cloudflare 安全與快取標頭 |
| `public/_redirects` | 靜態重新導向 |
| `astro.config.mjs` | Astro、Markdown、sitemap、SEO 與建置整合 |
| `.env.example` | 公開網站設定範本 |
| `.env.cloudflare.example` | Cloudflare 部署範本 |
| `.env.vps.example` | VPS 部署範本 |
| `.env.vercel.example` | Vercel 部署範本 |
| `.github/workflows/deploy.yml` | GitHub Actions 部署 |
| `.gitlab-ci.yml` | GitLab CI 部署 |
| `.woodpecker.yml` | Woodpecker/Codeberg 部署 |
| `scripts/analysis.mjs` | 全專案自檢 |

只能提交 `.example` 環境範本。不可提交真實 token、金鑰、Account ID、SSH passphrase、私人文章、個人圖片、`dist` 或 `.astro` 快取。

## 3. 建立文章

翻譯文章使用相同檔名：

```text
src/content/blog/en/my-first-post.md
src/content/blog/zh-tw/my-first-post.md
src/content/blog/zh-cn/my-first-post.md
```

產生的路由：

```text
/posts/my-first-post/
/zh-tw/posts/my-first-post/
/zh-cn/posts/my-first-post/
```

如果翻譯不存在，語言切換器不會捏造一個不存在的文章網址。

## 4. Frontmatter 完整範例

```yaml
---
title: '文章標題'
description: '用於搜尋結果與文章卡片的簡短摘要。'
pubDate: 2026-07-14
updatedDate: 2026-07-15
category: '教學'
categoryPath: ['教學', 'Astro']
tags: ['Astro', '網站設定']
author: '你的名稱'
pinned: false
pinOrder: 1
draft: false
ogImage: 'https://example.com/images/post-cover.png'
---
```

- `title`、`pubDate` 必填。
- `description` 選填，但建議為 SEO 提供。
- `categoryPath` 支援一到五層非空分類。
- `tags` 必須是 YAML 陣列。
- `pinned`、`draft` 是布林值，不可寫成有引號的字串。
- `pinOrder` 必須是 1 到 9999 的整數。
- `ogImage` 必須是絕對網址；沒有公開圖片時直接省略。
- `draft: true` 會讓文章不進入公開建置結果。

## 5. 如何置頂文章

```yaml
pinned: true
pinOrder: 1
```

置頂文章會排在一般文章之前，`pinOrder` 越小越前面。請使用不重複的簡單整數。取消置頂時移除兩個欄位，或改為 `pinned: false`。

同一篇文章的三語翻譯應使用相同 `pinOrder`，避免不同語系排序不一致。

## 6. Markdown 與 MDX 安全

- 優先使用標準 Markdown 連結，不要隨意加入 raw HTML。
- 外部 HTTP/HTTPS 連結會經過對應語系的離站提醒頁。
- 不要把 script、API key、token、私人 hostname、內網 IP 或個人檔案路徑貼進文章。
- 只有確實需要元件時才使用 MDX；匯入元件會在建置期間執行，必須視為程式碼審查。
- 公開資產放在 `public/`；不要把私人照片或私人站圖片目錄複製到公開模板。

## 7. 網站客製設定

1. 在 `src/lib/site.ts` 修改公開網站名稱、作者與預設描述。
2. 在 `src/i18n/ui.ts` 同步修改三語系歡迎文字。
3. 逐一檢查三個語系的關於、聯絡、隱私與免責頁。
4. 修改 `src/components/BookmarkLinks.astro`，移除不想推薦的連結。
5. 真實網址與聯絡信箱放進 `.env`，不要寫進已提交的範例。
6. 公開教學中的 `example.com`、`203.0.113.10` 與 placeholder token 應保留為範例。

## 8. 自動部署腳本

先安全預覽部署命令：

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
pnpm deploy:switch --mode=direct:cf+vps+vercel --dry-run
```

互動式選單：

```bash
pnpm deploy:menu
```

直接部署：

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

部署腳本會先建置，只上傳生成結果。Process/CI 注入的環境變數優先於本機 env 檔，避免過期的本機值靜默覆寫 CI secret。

機密應設定在 Git 平台，不可寫入 YAML：

- Cloudflare：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_PAGES_PROJECT_NAME`。
- VPS：`VPS_HOST`、`VPS_USER`、`VPS_PORT`、`VPS_TARGET_DIR`、SSH 私鑰 secret。
- Vercel：`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`。
- 共用公開設定：`PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`，以及選用的 `PUBLIC_GA4_ID`。

## 9. 發布前驗證

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm selfcheck
```

完整自檢會執行型別、lint、測試、乾淨正式建置、Astro dev 啟動、部署 dry-run、安全掃描、內容來源核對、SEO、sitemap/hreflang、landmark 與敏感檔案檢查。

正式建置會先清除 `.astro` 與 `dist`，避免已刪除或私人的文章殘留在舊快取中。

推送到公開倉庫前，再搜尋一次真實網域、信箱、token、Account ID、私鑰、驗證檔、私人文章標題與圖片檔名。
