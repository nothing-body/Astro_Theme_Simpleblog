# SimpleBlog 內容與設定指南

本指南完整說明 Markdown 文章、多語系路由、文章置頂、專案設定、隱私、自檢與自動部署。

其他語言：[English](./MARKDOWN_GUIDE.en.md) | [简体中文](./MARKDOWN_GUIDE.zh-CN.md)

## 1. 第一次設定

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Windows PowerShell 可使用 `Copy-Item .env.example .env`。至少設定：

本專案主要且建議使用 pnpm，因為 `package.json` 已鎖定 pnpm 版本，儲存庫也提交 `pnpm-lock.yaml`。只有在系統無法使用 pnpm 時才改用 npm。

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的部落格
PUBLIC_SITE_AUTHOR=你的名稱
PUBLIC_SITE_DESCRIPTION=我的網站筆記、教學與文章。
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

真正的公開網址與聯絡信箱只放在 `.env`，不要提交 `.env`。

## 2. 重要檔案

| 檔案或資料夾                         | 用途                                     |
| ------------------------------------ | ---------------------------------------- |
| `src/content/blog/en/`               | 英文文章                                 |
| `src/content/blog/zh-tw/`            | 繁體中文文章                             |
| `src/content/blog/zh-cn/`            | 簡體中文文章                             |
| `src/content/blog/_assets/`          | 由 Astro 處理的三語文章共用圖片          |
| `src/content.config.ts`              | frontmatter schema 與驗證規則            |
| `src/lib/site.ts`                    | 已驗證的網站設定與 URL helper            |
| `src/i18n/ui.ts`                     | 三語系介面文字                           |
| `src/components/BookmarkLinks.astro` | 預設書籤分類與連結                       |
| `public/_headers`                    | Cloudflare 安全與快取標頭                |
| `vercel.json`                        | Vercel 安全與快取標頭                    |
| `deploy/nginx-security-headers.conf` | VPS 使用 Nginx 時的安全標頭 include 檔   |
| `public/_redirects`                  | 靜態重新導向                             |
| `astro.config.ts`                    | Astro、Markdown、sitemap、SEO 與建置整合 |
| `.env.example`                       | 公開網站設定範本                         |
| `.env.cloudflare.example`            | Cloudflare 部署範本                      |
| `.env.vercel.example`                | Vercel 部署範本                          |
| `.env.netlify.example`               | Netlify 部署範本                         |
| `.env.supabase.example`              | Supabase Edge Functions 部署範本         |
| `.env.vps.example`                   | VPS 靜態部署範本                         |
| `.env.vps-docker.example`            | VPS Docker 部署範本                      |
| `.github/workflows/deploy.yml`       | GitHub Actions 部署                      |
| `.gitlab-ci.yml`                     | GitLab CI 部署                           |
| `.woodpecker.yml`                    | Woodpecker/Codeberg 部署                 |
| `scripts/analysis.ts`                | 全專案自檢                               |

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

- `title`、`description`、`pubDate` 必填；描述需為 12 到 300 個字元。
- `categoryPath` 支援一到五層非空分類。
- `tags` 必須是 YAML 陣列。
- `pinned`、`draft` 是布林值，不可寫成有引號的字串。
- `pinOrder` 必須是 1 到 9999 的整數。
- `ogImage` 必須使用 `/images/...` 路徑或 HTTPS 網址；沒有公開圖片時直接省略。
- `draft: true` 會讓文章不進入公開建置結果。

## 5. 如何置頂文章

```yaml
pinned: true
pinOrder: 1
```

置頂文章會排在一般文章之前，`pinOrder` 越小越前面。請使用不重複的簡單整數。取消置頂時移除兩個欄位，或改為 `pinned: false`。

同一篇文章的三語翻譯應使用相同 `pinOrder`，避免不同語系排序不一致。

## 6. Markdown 安全

- 使用標準 Markdown 語法；raw HTML 會在內容檢查與正式建置時被拒絕。
- 外部 HTTP/HTTPS 連結會保留直接目的地，並自動加入 `noopener noreferrer`。
- 不要把 script、API key、token、私人 hostname、內網 IP 或個人檔案路徑貼進文章。
- 文章統一使用 `.md`，不支援可執行的 import、export、JSX 或嵌入式 script；需要共用排版功能時，應加入已審查的共用 layout 或 Markdown processor。
- 網站圖示、驗證檔及刻意不處理的公開資產放在 `public/`。文章圖片應放在 `src/content/blog/_assets/`；不要把私人照片複製到公開模板。

### 文章圖片

圖片只需放一份到 `src/content/blog/_assets/`，三語文章分別使用有意義且符合語言的替代文字引用：

```md
![安全性設定頁面已啟用雙重驗證](../_assets/security-settings.png)
```

Astro 會產生最佳化的響應式圖片、`srcset`、`sizes`、原始寬高、延遲載入與非同步解碼。若第一張圖片位於文章原始碼前 12 行，會視為可能的 LCP 圖片並優先載入；其餘圖片維持延遲載入。

文章圖片只接受 AVIF、JPEG、PNG 與 WebP。建議每張小於 512 KiB；自檢會拒絕超過 2 MiB、任一邊超過 6000 像素或總像素超過 1200 萬的圖片。遠端圖片、正文中的 `/images/...`、SVG、GIF、data URL、查詢字串及跳出 `_assets` 的路徑都會被拒絕。`ogImage` 是獨立的社群分享中繼資料，仍可依前述規則使用 `/images/...` 或 HTTPS 網址。

### 文章搜尋

正式建置會在 Astro 完成後執行 Pagefind，只索引 `src/layouts/BlogPostLayout.astro` 標記的文章標題與正文。三語搜尋頁 `/search/`、`/zh-tw/search/`、`/zh-cn/search/` 使用標題加權的 BM25 類型排名，並提供分類與標籤篩選。索引只在建置後存在，因此請用 `pnpm build` 再執行 `pnpm preview` 測試，不能只啟動開發伺服器。

瀏覽器控制器位於 `src/scripts/search.ts`，會驗證搜尋結果為同源網址，並使用 DOM API 與 `textContent` 建立內容；不要改成未經處理的 `innerHTML`。Pagefind 需要 CSP 中精準的 `'wasm-unsafe-eval'` 與 `worker-src 'self' blob:`。`dist/pagefind/` 是每次建置都會重建的產物，不要手動修改。

Pagefind 目前沒有 `zh-cn`、`zh-tw` 的 stemming 詞幹分析，因此建置時重複出現的 Note 是預期訊息。中文搜尋與分類／標籤篩選仍會正常運作，只是不會依詞根擴展查詢。若要隱藏資訊型 Note，僅在 `package.json` 的 Pagefind 指令加上 `--quiet`：

```text
pagefind --site dist --glob "**/index.html" --quiet
```

`--quiet` 仍保留警告與錯誤；`--silent` 只保留錯誤，只有確定要隱藏警告時才使用。

## 7. 網站客製設定

1. 在 `.env` 設定 `PUBLIC_SITE_NAME`、`PUBLIC_SITE_AUTHOR` 與 `PUBLIC_SITE_DESCRIPTION`，不要把個人資料寫死在 `src/lib/site.ts`。
2. 只有要修改三語系共用介面文字時，才編輯 `src/i18n/ui.ts`。
3. 逐一檢查三個語系的關於、聯絡、隱私與免責頁。
4. 修改 `src/components/BookmarkLinks.astro`，移除不想推薦的連結。
5. 真實網址與聯絡信箱放進 `.env`，不要寫進已提交的範例。
6. 公開教學中的 `example.com`、`203.0.113.10` 與 placeholder token 應保留為範例。

## 8. 自動部署腳本

先安全預覽部署命令：

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
pnpm deploy:switch --mode=direct:cf+vps+vps-docker+vercel+netlify --dry-run
```

互動式選單：

```bash
pnpm deploy:menu
```

直接部署：

```bash
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
pnpm deploy:all:static
```

部署腳本會先執行專案的 `check` 與 `build` 指令，通過後才上傳生成結果。Process/CI 注入的環境變數優先於本機 env 檔，避免過期的本機值靜默覆寫 CI secret。

機密應設定在 Git 平台，不可寫入 YAML：

- Cloudflare：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_PAGES_PROJECT_NAME`。
- Vercel：`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`。
- Netlify：`NETLIFY_AUTH_TOKEN`、`NETLIFY_SITE_ID`。
- VPS：`VPS_HOST`、`VPS_USER`、`VPS_PORT`、`VPS_TARGET_DIR`、SSH 私鑰與已核對的 known-hosts 資料。
- VPS Docker：上述 VPS 設定，以及 `VPS_DOCKER_APP_DIR`、專案名稱、綁定位址與埠號。
- Supabase：`SUPABASE_ACCESS_TOKEN`、`SUPABASE_PROJECT_REF`。此目標只部署 TypeScript Edge Functions，不會託管 Astro 靜態網站。
- 共用公開設定：`PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`，以及選用的 `PUBLIC_GA4_ID`。

公開版沒有內建私人的 OpenPhish Runtime。[OPENPHISH_GUIDE.zh-TW.md](./OPENPHISH_GUIDE.zh-TW.md) 會逐步說明如何另外建置，且不提交清單資料、儲存空間 ID 或秘密。

## 9. 發布前驗證

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm selfcheck
```

完整自檢會執行型別、lint、測試、乾淨正式建置、輸出檢查、部署 dry-run、依賴安全掃描、內容來源核對、SEO、sitemap/hreflang、瀏覽器行為與敏感檔案檢查。

正式建置會先清除 `.astro` 與 `dist`，避免已刪除或私人的文章殘留在舊快取中。

推送到公開倉庫前，再搜尋一次真實網域、信箱、token、Account ID、私鑰、驗證檔、私人文章標題與圖片檔名。
