# Astro 多語系部落格模板

這是一個可公開發布的 Astro 靜態部落格模板，支援多語系路由、Markdown/MDX 文章、SEO metadata、外部連結離站提示頁、隱私友善預設值，以及 Cloudflare Pages、VPS、Vercel 部署自動化。

<p align="center">
  <a href="https://blog.gkbb.de/">Live Demo</a>
  &middot;
  <a href="./README.md">English README</a>
</p>

## 目前架構

英文是預設語系，路徑在 `/`。繁體中文使用 `/zh-tw/`，簡體中文使用 `/zh-cn/`。

```text
src/content/blog/en/       英文文章
src/content/blog/zh-tw/    繁體中文文章
src/content/blog/zh-cn/    簡體中文文章
src/pages/                 英文路由與共用路由
src/pages/zh-tw/           繁體中文路由
src/pages/zh-cn/           簡體中文路由
src/components/            共用 Astro 元件
src/i18n/ui.ts             語系文字與導覽標籤
scripts/                   建置、部署與檢查腳本
tests/                     單元與瀏覽器測試
```

同一篇文章的三個語系版本建議使用相同 slug：

```text
src/content/blog/en/getting-started.md
src/content/blog/zh-tw/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

它們會分別產生 `/posts/getting-started`、`/zh-tw/posts/getting-started`、`/zh-cn/posts/getting-started`。

## 功能

- Markdown/MDX 文章、分類、標籤、分頁與 RSS 友善 metadata
- 使用 `pinned: true` 置頂文章
- 使用 `draft: true` 標記草稿
- 英文、繁體中文、簡體中文三語路由
- Markdown 內的外部 HTTP/HTTPS 連結會在建置時改寫到離站提示頁
- 離站提示頁路徑為 `/leaving`、`/zh-tw/leaving`、`/zh-cn/leaving`
- 響應式導覽、書籤、時鐘、Cookie 偏好設定與無障礙支援
- Sitemap、robots.txt、canonical URL、JSON-LD、Open Graph 與安全標頭
- Cloudflare Pages 部署可自動偵測專案的 production branch
- Astro check、ESLint、Stylelint、Jest、Playwright 與專案自我分析

## 指南

- [English README](./README.md)
- [英文 Markdown 撰寫指南](./MARKDOWN_GUIDE.en.md)
- [繁體中文 Markdown 撰寫指南](./MARKDOWN_GUIDE.zh-TW.md)
- [英文書籤指南](./BOOKMARKS_GUIDE.en.md)
- [繁體中文書籤指南](./BOOKMARKS_GUIDE.zh-TW.md)
- [英文部署指南](./DEPLOYMENT.en.md)
- [繁體中文部署指南](./DEPLOYMENT.zh-TW.md)
- [腳本總覽](./scripts/README.en.md)
- [繁體中文腳本總覽](./scripts/README.zh-TW.md)

## 需要設定哪些檔案

本機開發、部署與安全檢查會用到這些專案根目錄檔案：

```text
.env                         本機公開網站設定，從 .env.example 複製
.env.cloudflare              Cloudflare Pages 部署設定，從 .env.cloudflare.example 複製
.env.vps                     VPS SSH/rsync 部署設定，從 .env.vps.example 複製
.env.vercel                  Vercel 部署設定，從 .env.vercel.example 複製
.gitignore                   避免真實 env、token、私鑰、建置輸出與本機報告進入 git
```

只提交 `.example` 範例檔。真實 `.env*` 檔含有本機或部署憑證，必須留在私有環境。

部署需要的主要資料：

- Cloudflare Pages：API token、Account ID、Pages project name、`PUBLIC_SITE_URL`
- VPS：主機、port、SSH 使用者、目標目錄、SSH key 路徑、可選的 passphrase
- Vercel：token、org/user ID、project ID

每個值要去哪裡取得、怎麼填、怎麼執行部署腳本，請看 [繁體中文部署指南](./DEPLOYMENT.zh-TW.md)。

## 常見自訂

- 書籤：編輯 `src/components/BookmarkLinks.astro`；操作方式見 [繁體中文書籤指南](./BOOKMARKS_GUIDE.zh-TW.md)。
- 外部連結確認頁：Markdown 內的 HTTP/HTTPS 連結會自動改寫。文字在 `src/components/LeavingNotice.astro`，路由在 `src/pages/leaving.astro`、`src/pages/zh-tw/leaving.astro`、`src/pages/zh-cn/leaving.astro`。
- 自檢腳本：快速檢查用 `pnpm selfcheck -- --quick`，完整專案分析用 `pnpm analyze`。
- Git ignore 規則：`.env`、`.env.cloudflare`、`.env.vps`、`.env.vercel`、私鑰、套件管理器 auth 檔、`dist/`、`.astro/`、`node_modules/`、測試報告都應維持 ignore。

## 快速開始

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```

專案也支援 npm：

```bash
npm install
npm run build
```

## 設定

複製 `.env.example` 為 `.env`，並設定公開網站資訊：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=hello@example.com
PUBLIC_GA4_ID=
```

也提供不同部署平台的範例檔：

```text
.env.cloudflare.example
.env.vercel.example
.env.vps.example
```

不要提交真實憑證、部署環境檔、API token、私鑰、服務商帳號 ID、個人網域或網站驗證檔。

## 部署

使用互動式部署選單：

```bash
pnpm deploy:menu
```

或直接指定部署目標：

```bash
pnpm deploy:switch -- --mode=direct:cf
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Cloudflare 部署會自動讀取 Pages 專案設定的 production branch。只有需要明確覆蓋時才傳入 `--branch=<name>`。

## 公開安全預設

這個 repo 的目標是保持可公開發布：

- `PUBLIC_SITE_URL` 預設為 `https://example.com`。
- template 部署檔應使用 placeholder 專案名稱與帳號值。
- 真實 `.env` 檔、API token、私鑰、analytics ID、個人網域與驗證檔應留在 git 之外。
- 如果內容是從私人網站複製過來，發布前需要重新檢查。

## 驗證

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm test
pnpm analyze
pnpm selfcheck -- --quick
```

發布或部署前請先執行 `pnpm build`。
